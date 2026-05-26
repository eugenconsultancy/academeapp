"""
GeoService API Endpoints
Location-based services for venues, geocoding, and attendance verification.
"""
from typing import List, Optional
from django.shortcuts import get_object_or_404
from ninja import Router, Query
from common.jwt_auth import JWTAuth
from .models import CampusVenue, LocationCheckIn
from .services import LocationService, AttendanceLocationService
from django.utils import timezone

router = Router(tags=['Location Services'])

location_service = LocationService()
attendance_service = AttendanceLocationService()


# ============================================
# VENUE ENDPOINTS
# ============================================

@router.get("/venues/", auth=JWTAuth())
def list_venues(
    request,
    search: str = Query(None, description="Search by venue name"),
    venue_type: str = Query(None, description="Filter by venue type"),
    limit: int = Query(20, ge=1, le=100)
):
    """
    List all campus venues with coordinates.
    Optionally filter by search term and venue type.
    """
    venues = CampusVenue.objects.filter(is_active=True)
    
    if search:
        venues = venues.filter(name__icontains=search)
    
    if venue_type:
        venues = venues.filter(venue_type=venue_type)
    
    venues = venues[:limit]
    
    return [{
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


@router.get("/venues/{venue_id}/", auth=JWTAuth())
def get_venue(request, venue_id: str):
    """Get details for a specific venue"""
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


@router.get("/venues/nearby/", auth=JWTAuth())
def get_nearby_venues(
    request,
    lat: float = Query(..., description="Current latitude"),
    lon: float = Query(..., description="Current longitude"),
    institution: str = Query(None, description="Filter by institution"),
    limit: int = Query(5, ge=1, le=20)
):
    """
    Find the nearest campus venues to a given GPS location.
    Returns distance and walking time for each venue.
    """
    venues = location_service.find_nearest_venues(
        lat, lon,
        institution=institution or request.auth.institution,
        limit=limit
    )
    
    return venues


# ============================================
# VENUE OCCUPANCY (NEW)
# ============================================
@router.get("/venues/{venue_id}/occupancy/", auth=JWTAuth())
def get_venue_occupancy(request, venue_id: str):
    """
    Check if a venue is currently occupied.
    Returns the currently active class if any.
    """
    from apps.classes.models import TimetableEntry
    from django.utils import timezone

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


# ============================================
# VENUE SCHEDULE (NEW)
# ============================================
@router.get("/venues/{venue_id}/schedule/", auth=JWTAuth())
def get_venue_schedule(request, venue_id: str, date: str = None):
    """
    Get today's (or a specific date's) timetable for a venue.
    """
    from apps.classes.models import TimetableEntry
    from datetime import datetime

    venue = get_object_or_404(CampusVenue, id=venue_id, is_active=True)

    if date:
        try:
            dt = datetime.strptime(date, '%Y-%m-%d')
            day_of_week = dt.weekday()
        except ValueError:
            return {"error": "Invalid date format. Use YYYY-MM-DD"}
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


# ============================================
# GEOCODING ENDPOINTS
# ============================================

@router.get("/geocode/", auth=JWTAuth())
def geocode_address(
    request,
    address: str = Query(..., description="Address to geocode")
):
    """
    Convert a human-readable address to GPS coordinates.
    Results are cached for 30 days.
    """
    coords = location_service.geocode_address(address)
    
    if coords:
        return {
            "address": address,
            "latitude": coords[0],
            "longitude": coords[1],
        }
    
    return {"error": "Could not geocode address", "address": address}


@router.get("/reverse-geocode/", auth=JWTAuth())
def reverse_geocode(
    request,
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    """
    Convert GPS coordinates to a human-readable address.
    """
    address = location_service.reverse_geocode(lat, lon)
    
    if address:
        return {
            "address": address,
            "latitude": lat,
            "longitude": lon,
        }
    
    return {"error": "Could not reverse geocode", "latitude": lat, "longitude": lon}


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
    Generate a Google Maps directions URL between two points.
    Also returns distance and estimated walking time.
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
    Find today's classes near the student's current location.
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
    """
    Get walking directions to a specific class venue.
    """
    from apps.classes.models import TimetableEntry
    
    entry = get_object_or_404(TimetableEntry, id=entry_id)
    venue_coords = location_service.get_venue_coordinates(entry)
    
    if not venue_coords:
        return {"error": "No coordinates available for this venue"}
    
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
# LOCATION CHECK-IN ENDPOINTS
# ============================================

@router.post("/check-in/", auth=JWTAuth())
def location_check_in(request, data: dict):
    """
    Record a location check-in for attendance verification.
    """
    from apps.classes.models import TimetableEntry
    
    entry_id = data.get('timetable_entry_id')
    entry = get_object_or_404(TimetableEntry, id=entry_id)
    
    is_within, distance, check_in = attendance_service.verify_and_record_attendance(
        student=request.auth,
        timetable_entry=entry,
        student_lat=data.get('latitude'),
        student_lon=data.get('longitude'),
        gps_accuracy=data.get('accuracy'),
        device_info=data.get('device_info', {}),
    )
    
    if check_in is None:
        return {"error": "Could not verify location - no venue coordinates available"}
    
    return {
        "verified": is_within,
        "distance_meters": round(distance, 1),
        "distance_display": LocationService.format_distance(distance),
        "check_in_id": str(check_in.id),
        "message": "Within attendance zone" if is_within else f"Too far from venue ({LocationService.format_distance(distance)})",
    }


@router.get("/check-in/history/", auth=JWTAuth())
def get_checkin_history(
    request,
    limit: int = Query(20, ge=1, le=100)
):
    """Get the authenticated user's location check-in history"""
    checkins = LocationCheckIn.objects.filter(
        student=request.auth
    ).select_related('timetable_entry')[:limit]
    
    return [{
        "id": str(c.id),
        "unit_name": c.timetable_entry.unit_name,
        "venue": c.timetable_entry.venue,
        "distance_meters": c.distance_meters,
        "within_radius": c.within_radius,
        "gps_accuracy": c.gps_accuracy,
        "created_at": str(c.created_at),
    } for c in checkins]


@router.get("/check-in/summary/", auth=JWTAuth())
def get_checkin_summary(request):
    """Get today's location check-in summary"""
    summary = attendance_service.get_daily_checkin_summary(request.auth)
    return summary


# ============================================
# LOCATION RECORD (NEW)
# ============================================
@router.post("/location/record/", auth=JWTAuth())
def record_location(request, data: dict):
    """
    Record a location update for analytics (non-critical).
    Body: { latitude, longitude, accuracy, timestamp, event_type, metadata }
    """
    from .models import StudentLocationHistory

    StudentLocationHistory.objects.create(
        student=request.auth,
        latitude=data['latitude'],
        longitude=data['longitude'],
        accuracy=data.get('accuracy'),
        event_type=data.get('event_type', 'background'),
        metadata=data.get('metadata', {})
    )
    return {"status": "recorded"}