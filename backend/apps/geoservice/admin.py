from django.contrib import admin
from .models import CampusVenue, LocationCheckIn, GeocodingCache, StudentLocationHistory


@admin.register(CampusVenue)
class CampusVenueAdmin(admin.ModelAdmin):
    list_display = ('name', 'institution', 'building_code', 'venue_type', 'is_active', 'has_coordinates')
    list_filter = ('institution', 'venue_type', 'is_active')
    search_fields = ('name', 'building_code', 'institution')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Venue Information', {
            'fields': ('name', 'institution', 'building_code', 'floor', 'room_number', 'venue_type')
        }),
        ('Location', {
            'fields': ('latitude', 'longitude', 'full_address'),
            'description': 'Coordinates are auto-geocoded on save if address is provided and coordinates are empty.'
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )
    
    def has_coordinates(self, obj):
        return obj.latitude is not None and obj.longitude is not None
    has_coordinates.boolean = True
    has_coordinates.short_description = 'Has Coordinates'
    
    def save_model(self, request, obj, form, change):
        """Auto-geocode when saving if address is provided but coordinates are empty"""
        if (obj.full_address or obj.name) and (not obj.latitude or not obj.longitude):
            from .services import LocationService
            service = LocationService()
            address = obj.full_address or f"{obj.name}, {obj.institution}"
            coords = service.geocode_address(address)
            if coords:
                obj.latitude = coords[0]
                obj.longitude = coords[1]
        super().save_model(request, obj, form, change)


@admin.register(LocationCheckIn)
class LocationCheckInAdmin(admin.ModelAdmin):
    list_display = ('student', 'timetable_entry', 'distance_meters', 'within_radius', 'created_at')
    list_filter = ('within_radius', 'verification_method', 'created_at')
    search_fields = ('student__full_name', 'timetable_entry__unit_name')
    readonly_fields = ('student_latitude', 'student_longitude', 'venue_latitude', 'venue_longitude', 'distance_meters')


@admin.register(GeocodingCache)
class GeocodingCacheAdmin(admin.ModelAdmin):
    list_display = ('address', 'latitude', 'longitude', 'hit_count', 'source', 'last_accessed')
    search_fields = ('address',)
    readonly_fields = ('hit_count', 'last_accessed')


@admin.register(StudentLocationHistory)
class StudentLocationHistoryAdmin(admin.ModelAdmin):
    list_display = ('student', 'event_type', 'accuracy', 'created_at')
    list_filter = ('event_type', 'created_at')
    search_fields = ('student__full_name',)
    readonly_fields = ('latitude', 'longitude', 'accuracy')
