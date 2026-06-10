# C:\Users\GATARA-BJTU\academe\backend\apps\geoservice\services\attendance_location.py
"""
Attendance-specific location verification service.
Backend is the ONLY source of truth for distance verification.
Includes GPS accuracy validation and time tampering detection.
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
    
    Features:
    - Backend-only distance verification (source of truth)
    - GPS accuracy validation (poor accuracy = manual verification required)
    - Device time tampering detection
    - N+1 query optimized batch venue fetching
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
        
        IMPORTANT: Distance calculation is done HERE on the backend.
        Frontend distances are for display ONLY and never used for verification.
        
        Accuracy threshold: if GPS accuracy > 50m, check-in requires manual approval.
        Time tampering: if device time differs from server by >5 minutes, flag as suspicious.
        """
        # Get venue coordinates (DB-first)
        venue_coords = self.location_service.get_venue_coordinates(timetable_entry)
        
        if not venue_coords:
            logger.warning(f"No coordinates available for venue: {timetable_entry.venue}")
            return False, 0, None
        
        venue_lat, venue_lon = venue_coords
        
        # Determine attendance radius
        if radius_meters is None:
            radius_meters = getattr(timetable_entry, 'attendance_radius_meters', 100)
        
        # BACKEND-ONLY distance calculation - SOURCE OF TRUTH
        is_within, distance = LocationService.is_within_radius(
            student_lat, student_lon,
            venue_lat, venue_lon,
            radius_meters
        )
        
        # GPS accuracy validation
        ACCURACY_THRESHOLD_GOOD = 30  # meters
        ACCURACY_THRESHOLD_FAIR = 50  # meters
        accuracy_ok = gps_accuracy is not None and gps_accuracy <= ACCURACY_THRESHOLD_GOOD
        accuracy_fair = gps_accuracy is not None and gps_accuracy <= ACCURACY_THRESHOLD_FAIR
        
        # Time tampering detection
        server_time = timezone.now()
        metadata = {}
        
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
        
        # Determine verification status
        # If distance OK but accuracy is poor, still mark as verified but flag for review
        if is_within:
            if accuracy_ok:
                is_verified = True
                verification_method = 'gps'
            elif accuracy_fair:
                is_verified = True
                verification_method = 'gps_fair_accuracy'
                metadata['accuracy_warning'] = f"GPS accuracy {gps_accuracy:.0f}m exceeds recommended 30m"
            else:
                # Within radius but very poor accuracy - require manual verification
                is_verified = False
                verification_method = 'gps_poor_accuracy_pending'
                metadata['accuracy_warning'] = f"GPS accuracy {gps_accuracy:.0f}m too high - awaiting manual verification"
        else:
            is_verified = False
            verification_method = 'gps'
        
        # Create check-in record
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
        
        # Log to location history with throttling check
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
        """
        Record location with throttling - only if user moved >5m and >30s passed.
        Prevents flooding the database with unnecessary updates.
        """
        # Check last recorded location
        last_record = StudentLocationHistory.objects.filter(
            student=student,
            event_type=event_type
        ).order_by('-created_at').first()
        
        # Throttling conditions
        if last_record:
            # Time threshold: 30 seconds
            time_diff = (timezone.now() - last_record.created_at).total_seconds()
            if time_diff < 30:
                logger.debug(f"Throttled location update for {student.email}: {time_diff:.1f}s since last")
                return
            
            # Distance threshold: 5 meters
            last_lat = float(last_record.latitude)
            last_lon = float(last_record.longitude)
            distance_moved = LocationService.calculate_distance(
                last_lat, last_lon,
                latitude, longitude
            )
            if distance_moved < 5:
                logger.debug(f"Throttled location update for {student.email}: moved only {distance_moved:.1f}m")
                return
        
        # Create history record
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
        """
        Find upcoming classes near the student's current location.
        
        OPTIMIZED: Batch fetch venue coordinates to avoid N+1 queries.
        Distance is calculated BACKEND-ONLY.
        """
        from apps.classes.models import TimetableEntry
        
        today = timezone.localtime()
        day_of_week = today.weekday()
        
        # Fetch all entries for the student
        entries = list(TimetableEntry.objects.filter(
            class_group__students=student,
            day_of_week=day_of_week,
            is_active=True
        ).select_related('class_group'))
        
        if not entries:
            return []
        
        # Batch fetch all venue coordinates in one query
        venue_names = list({entry.venue for entry in entries})
        venues_map = {}
        
        for venue in CampusVenue.objects.filter(
            name__in=venue_names,
            is_active=True,
            latitude__isnull=False,
            longitude__isnull=False
        ):
            venues_map[venue.name] = (float(venue.latitude), float(venue.longitude))
        
        # Also try geocoding for venues not found in CampusVenue
        # But do it once per unique missing venue
        missing_venues = [name for name in venue_names if name not in venues_map]
        for venue_name in missing_venues:
            # Create a dummy entry to get coordinates via geocoding
            class DummyEntry:
                venue = venue_name
                class_group = None
            
            dummy = DummyEntry()
            dummy.class_group = entries[0].class_group if entries else None
            coords = self.location_service.get_venue_coordinates(dummy)
            if coords:
                venues_map[venue_name] = coords
        
        # Now process each entry with pre-fetched coordinates
        nearby_classes = []
        for entry in entries:
            venue_coords = venues_map.get(entry.venue)
            
            if venue_coords:
                venue_lat, venue_lon = venue_coords
                distance = LocationService.calculate_distance(
                    lat, lon, venue_lat, venue_lon
                )
                
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
        
        checkins = LocationCheckIn.objects.filter(
            student=student,
            created_at__date=today
        )
        
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