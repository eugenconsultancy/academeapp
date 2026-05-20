"""
Attendance-specific location verification service.
Handles the logic for GPS-based attendance marking.
"""
from typing import Tuple, Optional, Dict
from django.utils import timezone
from django.db import models
from apps.geoservice.services.geolocation import LocationService
from apps.geoservice.models import LocationCheckIn, StudentLocationHistory
import logging

logger = logging.getLogger(__name__)


class AttendanceLocationService:
    """
    Service for location-verified attendance operations.
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
        Verify a student's location and record the check-in.
        
        Args:
            student: User model instance
            timetable_entry: TimetableEntry model instance
            student_lat: Student's GPS latitude
            student_lon: Student's GPS longitude
            gps_accuracy: GPS accuracy in meters (optional)
            device_info: Device information dict (optional)
            radius_meters: Override default radius (optional)
        
        Returns:
            (is_within_radius: bool, distance_meters: float, check_in: LocationCheckIn or None)
        """
        # Get venue coordinates
        venue_coords = self.location_service.get_venue_coordinates(timetable_entry)
        
        if not venue_coords:
            logger.warning(f"No coordinates available for venue: {timetable_entry.venue}")
            return False, 0, None
        
        venue_lat, venue_lon = venue_coords
        
        # Determine attendance radius
        if radius_meters is None:
            radius_meters = getattr(timetable_entry, 'attendance_radius_meters', 100)
        
        # Check if within radius
        is_within, distance = LocationService.is_within_radius(
            student_lat, student_lon,
            venue_lat, venue_lon,
            radius_meters
        )
        
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
            verification_method='gps',
            is_verified=is_within
        )
        
        # Optionally log to location history
        StudentLocationHistory.objects.create(
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
            }
        )
        
        return is_within, distance, check_in
    
    def get_nearby_classes(
        self,
        student,
        lat: float,
        lon: float,
        max_distance_meters: float = 500
    ) -> list:
        """
        Find upcoming classes near the student's current location.
        
        Args:
            student: User model instance
            lat, lon: Student's GPS coordinates
            max_distance_meters: Maximum distance to consider (default 500m)
        
        Returns:
            List of nearby class dicts sorted by distance
        """
        from apps.classes.models import ClassGroup, TimetableEntry
        
        today = timezone.localtime()
        day_of_week = today.weekday()
        
        class_groups = ClassGroup.objects.filter(students=student)
        entries = TimetableEntry.objects.filter(
            class_group__in=class_groups,
            day_of_week=day_of_week,
            is_active=True
        ).select_related('class_group')
        
        nearby_classes = []
        for entry in entries:
            venue_coords = self.location_service.get_venue_coordinates(entry)
            
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
        """
        Get today's location check-in summary for a student.
        
        Args:
            student: User model instance
        
        Returns:
            Dict with check-in statistics
        """
        today = timezone.localtime().date()
        
        checkins = LocationCheckIn.objects.filter(
            student=student,
            created_at__date=today
        )
        
        total = checkins.count()
        verified = checkins.filter(within_radius=True).count()
        flagged = checkins.filter(within_radius=False).count()
        
        avg_distance = checkins.aggregate(
            models.Avg('distance_meters')
        )['distance_meters__avg'] if total > 0 else 0
        
        return {
            "date": str(today),
            "total_checkins": total,
            "verified_checkins": verified,
            "flagged_checkins": flagged,
            "average_distance_meters": round(avg_distance, 1) if avg_distance else 0,
        }
