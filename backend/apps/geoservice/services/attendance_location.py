# backend/apps/geoservice/services/attendance_location.py
"""
Attendance-specific location verification service.
Backend is the ONLY source of truth for distance verification.
Includes GPS accuracy validation relative to attendance radius and time tampering detection.

Phase 3 improvements:
- Verification logic now considers GPS accuracy *relative* to the attendance radius.
  If accuracy > 50% of the radius, manual review is forced.
- Time tampering metadata properly flags suspicious time drift > 5 minutes.
- All coordinate comparisons use WGS-84 geodesic distance (via geopy).
"""
from typing import Tuple, Optional, Dict, List
from datetime import datetime
from django.utils import timezone
from django.db import models
from django.db.models import Prefetch
from apps.geoservice.services.geolocation import LocationService
from apps.geoservice.models import LocationCheckIn, StudentLocationHistory, CampusVenue
import logging

logger = logging.getLogger(__name__)


class AttendanceLocationService:
    """
    Service for location-verified attendance operations.
    All distance calculations are performed BACKEND-ONLY.
    """

    def __init__(self):
        self.location_service = LocationService()

    def verify_and_record_attendance(
        self,
        student,
        timetable_entry,
        student_lat: float,
        student_lon: float,
        gps_accuracy: float = None,
        device_info: Dict = None,
        radius_meters: int = None
    ) -> Tuple[bool, float, Optional[LocationCheckIn]]:
        """
        Verify location and record check-in.
        Returns (is_within_radius, distance_meters, check_in_object).
        """
        # 1. Get venue coordinates
        venue_coords = self.location_service.get_venue_coordinates(timetable_entry)
        if not venue_coords:
            logger.warning(f"No coordinates available for venue: {timetable_entry.venue}")
            return False, 0, None

        venue_lat, venue_lon = venue_coords

        # 2. Determine effective attendance radius
        if radius_meters is None:
            radius_meters = getattr(timetable_entry, 'attendance_radius_meters', 100)

        # 3. BACKEND-ONLY distance calculation (WGS-84 geodesic)
        is_within, distance = LocationService.is_within_radius(
            student_lat, student_lon,
            venue_lat, venue_lon,
            radius_meters
        )

        # 4. GPS accuracy validation – now relative to radius
        verification_method = 'gps'
        is_verified = False
        metadata = {}

        if gps_accuracy is not None:
            # Rule: if accuracy > half the radius, location is too unreliable -> manual review
            ACCURACY_THRESHOLD_RATIO = 0.5  # accuracy must be ≤ 50% of radius
            accuracy_threshold_meters = radius_meters * ACCURACY_THRESHOLD_RATIO

            if gps_accuracy <= accuracy_threshold_meters:
                # Good accuracy relative to radius
                if gps_accuracy <= 30:
                    verification_method = 'gps'
                    is_verified = True
                else:
                    # Between 30m and 50% of radius – acceptable but flagged
                    verification_method = 'gps_fair_accuracy'
                    is_verified = True
                    metadata['accuracy_warning'] = (
                        f"GPS accuracy {gps_accuracy:.0f}m exceeds recommended 30m"
                    )
            else:
                # Accuracy too poor – require manual verification regardless of distance
                is_verified = False
                verification_method = 'gps_poor_accuracy_pending'
                metadata['accuracy_warning'] = (
                    f"GPS accuracy {gps_accuracy:.0f}m is > {accuracy_threshold_meters:.0f}m "
                    f"(50% of radius {radius_meters}m). Manual verification required."
                )
        else:
            # No accuracy info – default to manual verification if within radius
            is_verified = False
            metadata['accuracy_warning'] = "No GPS accuracy provided."

        # 5. Time tampering detection
        server_time = timezone.now()
        if device_info and device_info.get('timestamp'):
            try:
                client_time_str = device_info['timestamp'].replace('Z', '+00:00')
                client_time = datetime.fromisoformat(client_time_str)
                time_diff = abs((server_time - client_time).total_seconds())
                if time_diff > 300:  # 5 minutes
                    metadata['time_tamper_suspected'] = True
                    logger.warning(f"Time tampering suspected for {student.email}: diff={time_diff:.0f}s")
            except (ValueError, TypeError) as e:
                logger.debug(f"Could not parse client timestamp: {e}")

        # 6. Override verification if outside radius
        if not is_within:
            is_verified = False
            verification_method = 'gps'

        # 7. Create check-in record
        check_in = LocationCheckIn.objects.create(
            student=student,
            timetable_entry=timetable_entry,
            student_latitude=student_lat,
            student_longitude=student_lon,
            venue_latitude=venue_lat,
            venue_longitude=venue_lon,
            distance_meters=round(distance, 1),
            within_radius=is_within,
            gps_accuracy=gps_accuracy,
            attendance_radius_meters=radius_meters,
            device_info=device_info or {},
            verification_method=verification_method,
            is_verified=is_verified,
            metadata=metadata
        )

        # 8. Record location history (throttled)
        self._record_location_history_throttled(
            student=student,
            latitude=student_lat,
            longitude=student_lon,
            accuracy=gps_accuracy,
            event_type='check_in',
            metadata={
                'timetable_entry_id': str(timetable_entry.id),
                'unit_name': timetable_entry.unit_name,
                'venue': timetable_entry.venue,
                'distance_meters': round(distance, 1),
                'within_radius': is_within,
                'verified': is_verified,
            }
        )

        return is_within, distance, check_in

    def _record_location_history_throttled(
        self,
        student,
        latitude: float,
        longitude: float,
        accuracy: float,
        event_type: str,
        metadata: Dict
    ):
        """Record with throttling: >5m movement and >30s since last record."""
        last_record = StudentLocationHistory.objects.filter(
            student=student,
            event_type=event_type
        ).order_by('-created_at').first()

        if last_record:
            time_diff = (timezone.now() - last_record.created_at).total_seconds()
            if time_diff < 30:
                return

            last_lat = float(last_record.latitude)
            last_lon = float(last_record.longitude)
            distance_moved = LocationService.calculate_distance(
                last_lat, last_lon, latitude, longitude
            )
            if distance_moved < 5:
                return

        StudentLocationHistory.objects.create(
            student=student,
            latitude=latitude,
            longitude=longitude,
            accuracy=accuracy,
            event_type=event_type,
            metadata=metadata
        )

    def get_nearby_classes(
        self,
        student,
        lat: float,
        lon: float,
        max_distance_meters: float = 500
    ) -> List[Dict]:
        """Find upcoming classes near the student's location (N+1 optimized)."""
        from apps.classes.models import TimetableEntry

        today = timezone.localtime()
        day_of_week = today.weekday()

        entries = list(TimetableEntry.objects.filter(
            class_group__students=student,
            day_of_week=day_of_week,
            is_active=True
        ).select_related('class_group'))

        if not entries:
            return []

        # Batch fetch venue coordinates
        venue_names = list({entry.venue for entry in entries})
        venues_map = {}
        for venue in CampusVenue.objects.filter(
            name__in=venue_names,
            is_active=True,
            latitude__isnull=False,
            longitude__isnull=False
        ):
            venues_map[venue.name] = (float(venue.latitude), float(venue.longitude))

        # Geocode missing ones once per name
        missing_venues = [name for name in venue_names if name not in venues_map]
        for venue_name in missing_venues:
            class DummyEntry:
                venue = venue_name
                class_group = None
            dummy = DummyEntry()
            dummy.class_group = entries[0].class_group if entries else None
            coords = self.location_service.get_venue_coordinates(dummy)
            if coords:
                venues_map[venue_name] = coords

        nearby_classes = []
        for entry in entries:
            venue_coords = venues_map.get(entry.venue)
            if venue_coords:
                venue_lat, venue_lon = venue_coords
                distance = LocationService.calculate_distance(lat, lon, venue_lat, venue_lon)
                if distance <= max_distance_meters:
                    nearby_classes.append({
                        "entry_id": str(entry.id),
                        "unit_name": entry.unit_name,
                        "venue": entry.venue,
                        "start_time": str(entry.start_time),
                        "end_time": str(entry.end_time),
                        "distance_meters": round(distance, 1),
                        "distance_display": LocationService.format_distance(distance),
                        "walking_time_minutes": LocationService.get_walking_time_minutes(distance),
                        "lecturer": entry.lecturer or "",
                        "venue_latitude": venue_lat,
                        "venue_longitude": venue_lon,
                    })

        nearby_classes.sort(key=lambda x: x['distance_meters'])
        return nearby_classes

    def get_daily_checkin_summary(self, student) -> Dict:
        """Get today's location check-in summary."""
        today = timezone.localtime().date()
        checkins = LocationCheckIn.objects.filter(student=student, created_at__date=today)

        total = checkins.count()
        verified = checkins.filter(is_verified=True).count()
        flagged = checkins.filter(within_radius=True, is_verified=False).count()
        rejected = checkins.filter(within_radius=False).count()

        avg_distance = checkins.aggregate(
            models.Avg('distance_meters')
        )['distance_meters__avg'] if total > 0 else 0

        avg_accuracy = checkins.aggregate(
            models.Avg('gps_accuracy')
        )['gps_accuracy__avg'] if total > 0 else 0

        return {
            "date": str(today),
            "total_checkins": total,
            "verified_checkins": verified,
            "flagged_checkins": flagged,
            "rejected_checkins": rejected,
            "average_distance_meters": round(avg_distance, 1) if avg_distance else 0,
            "average_gps_accuracy_meters": round(avg_accuracy, 1) if avg_accuracy else 0,
        }