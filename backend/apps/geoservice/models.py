from django.db import models
from common.models import BaseModel


class CampusVenue(BaseModel):
    """
    Pre-defined campus locations with GPS coordinates.
    Used for geocoding, distance calculations, and navigation.
    """
    name = models.CharField(max_length=255, help_text="Full venue name, e.g., 'Lecture Hall 3'")
    institution = models.CharField(max_length=255, help_text="Institution name, e.g., 'Kenyatta University'")
    building_code = models.CharField(max_length=50, blank=True, help_text="Short code, e.g., 'LH3'")
    floor = models.IntegerField(null=True, blank=True)
    room_number = models.CharField(max_length=50, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    full_address = models.TextField(blank=True, help_text="Complete address for geocoding fallback")
    is_active = models.BooleanField(default=True)
    venue_type = models.CharField(
        max_length=30,
        choices=[
            ('lecture_hall', 'Lecture Hall'),
            ('laboratory', 'Laboratory'),
            ('seminar_room', 'Seminar Room'),
            ('office', 'Office'),
            ('library', 'Library'),
            ('cafeteria', 'Cafeteria'),
            ('sports', 'Sports Facility'),
            ('other', 'Other'),
        ],
        default='lecture_hall'
    )
    
    class Meta:
        unique_together = ['name', 'institution']
        indexes = [
            models.Index(fields=['institution', 'is_active']),
            models.Index(fields=['latitude', 'longitude']),
        ]
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.institution})"
    
    @property
    def coordinates(self):
        """Return (lat, lon) tuple if both coordinates exist"""
        if self.latitude and self.longitude:
            return (float(self.latitude), float(self.longitude))
        return None


class LocationCheckIn(BaseModel):
    """
    Records the student's actual GPS location when marking attendance.
    Used for audit trails and attendance dispute resolution.
    """
    student = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='location_checkins'
    )
    timetable_entry = models.ForeignKey(
        'classes.TimetableEntry',
        on_delete=models.CASCADE,
        related_name='location_checkins'
    )
    student_latitude = models.DecimalField(max_digits=9, decimal_places=6)
    student_longitude = models.DecimalField(max_digits=9, decimal_places=6)
    venue_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    venue_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    distance_meters = models.FloatField(null=True, blank=True, help_text="Calculated distance from venue")
    within_radius = models.BooleanField(default=False)
    gps_accuracy = models.FloatField(null=True, blank=True, help_text="GPS accuracy in meters")
    attendance_radius_meters = models.IntegerField(default=100)
    device_info = models.JSONField(default=dict, blank=True)
    is_verified = models.BooleanField(default=False)
    verification_method = models.CharField(
        max_length=30,
        choices=[
            ('gps', 'GPS Only'),
            ('gps_wifi', 'GPS + WiFi'),
            ('manual', 'Manual Override'),
        ],
        default='gps'
    )
    
    class Meta:
        indexes = [
            models.Index(fields=['student', 'created_at']),
            models.Index(fields=['timetable_entry', 'created_at']),
            models.Index(fields=['within_radius']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Check-in: {self.student.full_name} at {self.timetable_entry.unit_name}"


class GeocodingCache(BaseModel):
    """
    Cache geocoding results to minimize external API calls.
    Nominatim allows caching as per their usage policy.
    """
    address = models.CharField(max_length=500)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    hit_count = models.IntegerField(default=1)
    last_accessed = models.DateTimeField(auto_now=True)
    source = models.CharField(
        max_length=30,
        choices=[
            ('nominatim', 'OpenStreetMap Nominatim'),
            ('manual', 'Manual Entry'),
            ('google', 'Google Maps'),
        ],
        default='nominatim'
    )
    
    class Meta:
        unique_together = ['address']
        indexes = [
            models.Index(fields=['address']),
        ]
    
    def __str__(self):
        return f"{self.address} -> ({self.latitude}, {self.longitude})"


class StudentLocationHistory(BaseModel):
    """
    Optional: Track student location over time for campus analytics.
    Only stored if student opts in via privacy settings.
    """
    student = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='location_history'
    )
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    accuracy = models.FloatField(null=True, blank=True)
    event_type = models.CharField(
        max_length=30,
        choices=[
            ('check_in', 'Class Check-in'),
            ('manual', 'Manual Location Share'),
            ('background', 'Background Update'),
        ],
        default='check_in'
    )
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['student', 'created_at']),
            models.Index(fields=['event_type']),
        ]
        ordering = ['-created_at']
