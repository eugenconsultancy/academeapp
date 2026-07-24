# backend/apps/geoservice/api.py
"""
GeoService API Endpoints - Production‑grade with validation and rate limiting.
FIXED: UUID routing conflict - /nearby/ endpoint no longer conflicts with UUID pattern.
PHASE 1 FIXES:
- Enrollment verification on check‑in (403 for non‑enrolled students)
- Coordinate range validators using Decimal on input schemas
- All error responses now use proper HTTP status codes (400/403/404/429)
- CheckInOut response includes requires_manual_review field
"""
from typing import Optional
from uuid import UUID
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from ninja import Router, Query
from common.jwt_auth import JWTAuth
from .models import CampusVenue, LocationCheckIn, StudentLocationHistory
from .services import LocationService, AttendanceLocationService
from .schema import CheckInSchema, LocationRecordSchema
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

router = Router(tags=['Location Services'])

location_service = LocationService()
attendance_service = AttendanceLocationService()


# ── Rate limiting helper (non‑blocking) ─────────────────────────────────
def check_rate_limit(key: str, max_requests: int = 5, window_seconds: int = 60) -> bool:
    """Non‑blocking rate limit check using Redis cache."""
    cache_key = f"rate_limit:{key}"
    current = cache.get(cache_key, 0)
    if current >= max_requests:
        return False
    cache.set(cache_key, current + 1, timeout=window_seconds)
    return True


# ============================================
# VENUE ENDPOINTS
# ============================================

@router.get("/venues/", auth=JWTAuth())
def list_venues(
    request,
    search: str = Query(None, description="Search by venue name"),
    venue_type: str = Query(None, description="Filter by venue type"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0, description="Pagination offset")
):
    """
    List all campus venues with pagination.
    Supports search and filtering.
    """
    venues = CampusVenue.objects.filter(is_active=True)
    if search:
        venues = venues.filter(name__icontains=search)
    if venue_type:
        venues = venues.filter(venue_type=venue_type)

    total = venues.count()
    venues = venues[offset:offset + limit]

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "results": [{
            "id": str(v.id),
            "name": v.name,
            "institution": v.institution,
            "building_code": v.building_code or "",
            "floor": v.floor,
            "room_number": v.room_number or "",
            "venue_type": v.venue_type,
            "latitude": float(v.latitude) if v.latitude else None,
            "longitude": float(v.longitude) if v.longitude else None,
        } for v in venues]
    }


@router.get("/venues/bounds/", auth=JWTAuth())
def get_venues_in_bounds(
    request,
    north: float = Query(..., description="North latitude"),
    south: float = Query(..., description="South latitude"),
    east: float = Query(..., description="East longitude"),
    west: float = Query(..., description="West longitude"),
    limit: int = Query(100, ge=1, le=500)
):
    """
    Get venues within map viewport bounds.
    Optimizes map performance by loading only visible venues.
    """
    venues = CampusVenue.objects.filter(
        is_active=True,
        latitude__isnull=False,
        longitude__isnull=False,
        latitude__gte=south,
        latitude__lte=north,
        longitude__gte=west,
        longitude__lte=east
    )[:limit]

    return [{
        "id": str(v.id),
        "name": v.name,
        "venue_type": v.venue_type,
        "latitude": float(v.latitude),
        "longitude": float(v.longitude),
        "building_code": v.building_code or "",
    } for v in venues]


# IMPORTANT: /nearby/ must come BEFORE /{venue_id}/ to avoid UUID routing conflict
@router.get("/venues/nearby/", auth=JWTAuth())
def get_nearby_venues(
    request,
    lat: float = Query(..., description="Current latitude"),
    lon: float = Query(..., description="Current longitude"),
    institution: str = Query(None, description="Filter by institution"),
    limit: int = Query(10, ge=1, le=50),
    max_distance: int = Query(1000, ge=50, le=5000, description="Max distance in meters")
):
    """
    Find nearest venues to GPS location.
    Uses backend distance calculation as source of truth.
    NOTE: This endpoint MUST be placed BEFORE /venues/{venue_id}/ to prevent "nearby" being interpreted as UUID.
    """
    venues = location_service.find_nearest_venues_spatial(
        lat, lon,
        institution=institution or getattr(request.auth, 'institution', None),
        limit=limit,
        max_distance_meters=max_distance
    )
    return venues


@router.get("/venues/{venue_id}/", auth=JWTAuth())
def get_venue(request, venue_id: UUID):
    """
    Get details for a specific venue by UUID.
    """
    venue = get_object_or_404(CampusVenue, id=venue_id, is_active=True)
    return {
        "id": str(venue.id),
        "name": venue.name,
        "institution": venue.institution,
        "building_code": venue.building_code or "",
        "floor": venue.floor,
        "room_number": venue.room_number or "",
        "venue_type": venue.venue_type,
        "latitude": float(venue.latitude) if venue.latitude else None,
        "longitude": float(venue.longitude) if venue.longitude else None,
        "full_address": venue.full_address or "",
    }


# ============================================
# GEOCODING ENDPOINTS (RATE LIMITED)
# ============================================

@router.get("/geocode/", auth=JWTAuth())
def geocode_address(
    request,
    address: str = Query(..., description="Address to geocode")
):
    """
    Convert address to GPS coordinates.
    Returns 429 if rate limit exceeded for external API.
    """
    # Validate input
    if not address or not address.strip():
        return 400, {"detail": "Address parameter is required."}

    # Apply rate limiting for external API calls
    user_id = request.auth.id
    rate_key = f"geocode_user_{user_id}"
    if not check_rate_limit(rate_key, max_requests=5, window_seconds=60):
        return 429, {"detail": "Rate limit exceeded (5 requests per minute). Please try again later."}

    coords = location_service.geocode_address_db_first(address)
    if coords:
        return {
            "address": address,
            "latitude": coords[0],
            "longitude": coords[1],
        }
    return 404, {"detail": "Could not geocode address. The address may be invalid or not found."}


@router.get("/reverse-geocode/", auth=JWTAuth())
def reverse_geocode(
    request,
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    """Convert GPS coordinates to address (rate‑limited)."""
    user_id = request.auth.id
    rate_key = f"reverse_geocode_user_{user_id}"
    if not check_rate_limit(rate_key, max_requests=5, window_seconds=60):
        return 429, {"detail": "Rate limit exceeded. Please try again later."}

    address = location_service.reverse_geocode(lat, lon)
    if address:
        return {
            "address": address,
            "latitude": lat,
            "longitude": lon,
        }
    return 404, {"detail": "Could not reverse geocode the given coordinates."}


# ============================================
# DIRECTIONS ENDPOINT
# ============================================

@router.get("/directions/", auth=JWTAuth())
def get_directions(
    request,
    origin_lat: float = Query(..., description="Origin latitude"),
    origin_lon: float = Query(..., description="Origin longitude"),
    dest_lat: float = Query(..., description="Destination latitude"),
    dest_lon: float = Query(..., description="Destination longitude"),
    travel_mode: str = Query('walking', description="walking, driving, bicycling, transit")
):
    """
    Generate directions between two points.
    Distance is calculated backend‑only (source of truth).
    """
    distance = LocationService.calculate_distance(
        origin_lat, origin_lon,
        dest_lat, dest_lon
    )
    maps_url = location_service.get_directions_url(
        origin_lat, origin_lon,
        dest_lat, dest_lon,
        travel_mode
    )
    return {
        "distance_meters": round(distance, 1),
        "distance_display": LocationService.format_distance(distance),
        "walking_time_minutes": LocationService.get_walking_time_minutes(distance),
        "maps_url": maps_url,
        "origin": {"latitude": origin_lat, "longitude": origin_lon},
        "destination": {"latitude": dest_lat, "longitude": dest_lon},
    }


# ============================================
# CLASS LOCATION ENDPOINTS
# ============================================

@router.get("/classes/nearby/", auth=JWTAuth())
def get_nearby_classes(
    request,
    lat: float = Query(..., description="Current latitude"),
    lon: float = Query(..., description="Current longitude"),
    max_distance: int = Query(500, description="Maximum distance in meters")
):
    """
    Find today's classes near student's location.
    Distance calculated BACKEND‑ONLY (source of truth).
    """
    classes = attendance_service.get_nearby_classes(
        request.auth, lat, lon, max_distance
    )
    return classes


@router.get("/classes/{entry_id}/directions/", auth=JWTAuth())
def get_class_directions(
    request,
    entry_id: str,
    lat: float = Query(..., description="Current latitude"),
    lon: float = Query(..., description="Current longitude")
):
    """Get walking directions to a specific class venue."""
    from apps.classes.models import TimetableEntry

    entry = get_object_or_404(TimetableEntry, id=entry_id)
    venue_coords = location_service.get_venue_coordinates(entry)
    if not venue_coords:
        return 404, {"detail": "No coordinates available for this venue."}

    venue_lat, venue_lon = venue_coords
    distance = LocationService.calculate_distance(lat, lon, venue_lat, venue_lon)
    maps_url = location_service.get_directions_url(lat, lon, venue_lat, venue_lon)

    return {
        "unit_name": entry.unit_name,
        "venue": entry.venue,
        "distance_meters": round(distance, 1),
        "distance_display": LocationService.format_distance(distance),
        "walking_time_minutes": LocationService.get_walking_time_minutes(distance),
        "venue_latitude": venue_lat,
        "venue_longitude": venue_lon,
        "student_latitude": lat,
        "student_longitude": lon,
        "maps_url": maps_url,
        "start_time": str(entry.start_time) if entry.start_time else None,
    }


# ============================================
# LOCATION CHECK‑IN (BACKEND VERIFICATION)
# ============================================

@router.post("/check-in/", auth=JWTAuth())
def location_check_in(request, data: CheckInSchema):
    """
    Record location check‑in for attendance.
    IMPORTANT: Distance verification happens BACKEND‑ONLY.
    Frontend‑provided distances are ignored completely.
    Validates GPS accuracy and detects time tampering.
    """
    from apps.classes.models import TimetableEntry

    entry = get_object_or_404(TimetableEntry, id=data.timetable_entry_id)

    # ---- Enrollment verification (Phase 1.1) ----
    if not entry.class_group.students.filter(pk=request.auth.pk).exists():
        return 403, {"detail": "You are not enrolled in this class."}

    # Convert Decimal coordinates to float for the geolocation service
    lat = float(data.latitude)
    lon = float(data.longitude)

    is_within, distance, check_in = attendance_service.verify_and_record_attendance(
        student=request.auth,
        timetable_entry=entry,
        student_lat=lat,
        student_lon=lon,
        gps_accuracy=data.accuracy,
        device_info=data.device_info,
    )

    if check_in is None:
        return 422, {"detail": "Could not verify location – no venue coordinates available."}

    # Build human‑readable message
    if is_within and check_in.is_verified:
        message = "✓ Attendance verified! You are within the attendance zone."
    elif is_within and not check_in.is_verified:
        message = f"⚠️ Within range but GPS accuracy ({data.accuracy:.0f}m) is poor. Check‑in recorded for manual verification."
    else:
        message = f"❌ Too far from venue ({LocationService.format_distance(distance)}). Max allowed: {check_in.attendance_radius_meters}m."

    return 200, {
        "verified": check_in.is_verified,
        "distance_meters": round(distance, 1),
        "distance_display": LocationService.format_distance(distance),
        "check_in_id": str(check_in.id),
        "message": message,
        "requires_manual_review": (check_in.is_verified is False and is_within is True),
    }


@router.get("/check-in/history/", auth=JWTAuth())
def get_checkin_history(
    request,
    limit: int = Query(20, ge=1, le=100)
):
    """Get the authenticated user's location check‑in history."""
    checkins = LocationCheckIn.objects.filter(
        student=request.auth
    ).select_related('timetable_entry')[:limit]

    return [{
        "id": str(c.id),
        "unit_name": c.timetable_entry.unit_name,
        "venue": c.timetable_entry.venue,
        "distance_meters": c.distance_meters,
        "within_radius": c.within_radius,
        "verified": c.is_verified,
        "gps_accuracy": c.gps_accuracy,
        "created_at": str(c.created_at),
    } for c in checkins]


@router.get("/check-in/summary/", auth=JWTAuth())
def get_checkin_summary(request):
    """Get today's location check‑in summary."""
    summary = attendance_service.get_daily_checkin_summary(request.auth)
    return summary


# ============================================
# LOCATION RECORD (THROTTLED)
# ============================================

@router.post("/location/record/", auth=JWTAuth())
def record_location(request, data: LocationRecordSchema):
    """
    Record a location update with throttling.
    Throttling conditions:
    - Minimum 30 seconds between updates for same user
    - Minimum 5 meters movement to record
    - Prevents database flooding from watchPosition
    """
    student = request.auth
    new_lat = float(data.latitude)
    new_lon = float(data.longitude)

    last_location = StudentLocationHistory.objects.filter(
        student=student
    ).order_by('-created_at').first()

    if last_location:
        # Time throttle: 30 seconds minimum
        time_diff = (timezone.now() - last_location.created_at).total_seconds()
        if time_diff < 30:
            return 200, {"status": "throttled", "detail": "Too frequent (minimum 30s between updates)"}

        # Distance throttle: 5 meters minimum movement
        distance_moved = LocationService.calculate_distance(
            float(last_location.latitude),
            float(last_location.longitude),
            new_lat,
            new_lon
        )
        if distance_moved < 5:
            return 200, {"status": "throttled", "detail": f"Insufficient movement (only {distance_moved:.1f}m, need 5m)"}

    # Create record if throttling conditions passed
    StudentLocationHistory.objects.create(
        student=student,
        latitude=new_lat,
        longitude=new_lon,
        accuracy=data.accuracy,
        event_type=data.event_type,
        metadata=data.metadata or {}
    )
    return 201, {"status": "recorded"}


# ============================================
# VENUE OCCUPANCY & SCHEDULE
# ============================================

@router.get("/venues/{venue_id}/occupancy/", auth=JWTAuth())
def get_venue_occupancy(request, venue_id: UUID):
    """Check if a venue is currently occupied."""
    from apps.classes.models import TimetableEntry

    venue = get_object_or_404(CampusVenue, id=venue_id, is_active=True)
    now = timezone.localtime()
    current_time = now.time()

    entry = TimetableEntry.objects.filter(
        venue__iexact=venue.name,
        day_of_week=now.weekday(),
        is_active=True,
        start_time__lte=current_time,
        end_time__gte=current_time,
    ).first()

    if entry:
        return {
            "occupied": True,
            "current_class": {
                "unit_name": entry.unit_name,
                "start_time": str(entry.start_time),
                "end_time": str(entry.end_time),
                "lecturer": entry.lecturer or "",
            }
        }
    return {"occupied": False, "current_class": None}


@router.get("/venues/{venue_id}/schedule/", auth=JWTAuth())
def get_venue_schedule(request, venue_id: UUID, date: str = None):
    """Get today's (or specific date's) timetable for a venue."""
    from apps.classes.models import TimetableEntry
    from datetime import datetime

    venue = get_object_or_404(CampusVenue, id=venue_id, is_active=True)

    if date:
        try:
            dt = datetime.strptime(date, '%Y-%m-%d')
            day_of_week = dt.weekday()
        except ValueError:
            return 400, {"detail": "Invalid date format. Use YYYY-MM-DD."}
    else:
        day_of_week = timezone.localtime().weekday()

    entries = TimetableEntry.objects.filter(
        venue__iexact=venue.name,
        day_of_week=day_of_week,
        is_active=True
    ).order_by('start_time')

    return [{
        "id": str(e.id),
        "unit_name": e.unit_name,
        "start_time": str(e.start_time),
        "end_time": str(e.end_time),
        "lecturer": e.lecturer or "",
    } for e in entries]