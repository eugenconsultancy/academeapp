# backend/apps/geoservice/admin.py
"""
Admin configuration for GeoService app.
Production-grade admin with batch operations, cache cleanup, and read-only audit trails.
"""
from django.contrib import admin
from django.contrib import messages
from django.utils.html import format_html
from .models import CampusVenue, LocationCheckIn, GeocodingCache, StudentLocationHistory
from .tasks import batch_geocode_venues
import logging

logger = logging.getLogger(__name__)


# ============================================
# CUSTOM ACTIONS
# ============================================

def geocode_missing_coordinates(modeladmin, request, queryset):
    """Batch geocode selected venues that are missing coordinates."""
    venues_to_geocode = queryset.filter(
        latitude__isnull=True,
        longitude__isnull=True,
        is_active=True
    )
    
    count = venues_to_geocode.count()
    
    if count == 0:
        messages.info(request, "No selected venues are missing coordinates.")
        return
    
    # Queue Celery task for batch geocoding
    venue_ids = list(venues_to_geocode.values_list('id', flat=True))
    batch_geocode_venues.delay(venue_ids)
    
    messages.success(
        request, 
        f"Queued {count} venue(s) for background geocoding via Celery. "
        f"Coordinates will appear shortly."
    )


geocode_missing_coordinates.short_description = "🌍 Geocode selected venues (async via Celery)"


def clear_low_hits(modeladmin, request, queryset):
    """Delete cache entries with fewer than 2 hits."""
    deleted = queryset.filter(hit_count__lt=2).delete()[0]
    messages.success(request, f'Deleted {deleted} low‑hit cache entries.')


clear_low_hits.short_description = '🗑️ Delete cache entries with < 2 hits'


def clear_all_cache(modeladmin, request, queryset):
    """Emergency purge of ALL geocoding cache with confirmation."""
    # Require confirmation for destructive action
    if request.POST.get('post') != 'yes':
        messages.warning(
            request,
            '⚠️ This will delete ALL geocoding cache entries. '
            'Click again to confirm.'
        )
        return
    
    count = queryset.count()
    queryset.delete()
    
    # Also clear Redis cache if available
    try:
        from django.core.cache import cache
        # Note: For production, implement proper cache invalidation pattern
        messages.info(request, 'Redis cache may require manual clearing if used.')
    except Exception as e:
        logger.warning(f"Failed to clear Redis cache: {e}")
    
    messages.warning(request, f'Deleted all {count} cache entries.')


clear_all_cache.short_description = '⚠️ Emergency: Delete ALL cache entries'


# ============================================
# CUSTOM LIST DISPLAY METHODS
# ============================================

def has_coordinates(obj):
    """Check if venue has valid coordinates."""
    return obj.latitude is not None and obj.longitude is not None


has_coordinates.boolean = True
has_coordinates.short_description = 'Has Coordinates'


def within_radius_icon(obj):
    """Return icon for within_radius status."""
    return "✅" if obj.within_radius else "❌"


within_radius_icon.short_description = 'Valid'


def is_suspicious(obj):
    """
    Flag check-ins with poor GPS accuracy (>50m) even if within radius.
    Helps identify potential fraud or poor GPS conditions.
    """
    return obj.gps_accuracy and obj.gps_accuracy > 50 and obj.within_radius


is_suspicious.boolean = True
is_suspicious.short_description = 'Suspicious (low acc)'


# ============================================
# MODEL ADMINS
# ============================================

@admin.register(CampusVenue)
class CampusVenueAdmin(admin.ModelAdmin):
    """
    Admin for CampusVenue with bulk operations and async geocoding.
    """
    list_display = (
        'name', 
        'institution', 
        'building_code', 
        'venue_type', 
        'is_active', 
        has_coordinates
    )
    list_editable = ('is_active',)  # ✅ Bulk toggle activation
    list_filter = ('institution', 'venue_type', 'is_active')
    search_fields = ('name', 'building_code', 'institution', 'full_address')
    readonly_fields = ('created_at', 'updated_at')
    actions = [geocode_missing_coordinates]
    
    fieldsets = (
        ('Venue Information', {
            'fields': ('name', 'institution', 'building_code', 'floor', 'room_number', 'venue_type')
        }),
        ('Location', {
            'fields': ('latitude', 'longitude', 'full_address'),
            'description': (
                'Coordinates can be entered manually or will be auto-geocoded via Celery task. '
                'Provide either coordinates OR an address for geocoding.'
            )
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Audit', {
            'fields': ('created_at', 'updated_at', 'created_by', 'updated_by'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        """Save venue - geocoding handled by post_save signal."""
        # Set audit fields
        if not change:
            obj.created_by = request.user
        obj.updated_by = request.user
        
        # Save immediately (geocoding happens via signal)
        super().save_model(request, obj, form, change)
        
        if not (obj.latitude and obj.longitude):
            messages.info(
                request,
                f"Venue saved. Geocoding queued via Celery. Coordinates will appear shortly."
            )


@admin.register(LocationCheckIn)
class LocationCheckInAdmin(admin.ModelAdmin):
    """
    Admin for LocationCheckIn with visual auditing and fraud detection.
    """
    list_display = (
        'student', 
        'timetable_entry', 
        'distance_meters', 
        within_radius_icon, 
        'gps_accuracy', 
        is_suspicious,
        'created_at'
    )
    list_filter = ('within_radius', 'verification_method', 'is_verified', 'created_at')
    search_fields = ('student__full_name', 'student__email', 'timetable_entry__unit_name')
    readonly_fields = (
        'student_latitude', 'student_longitude', 
        'venue_latitude', 'venue_longitude', 
        'distance_meters', 'device_info', 'metadata'
    )
    date_hierarchy = 'created_at'
    list_per_page = 50
    
    fieldsets = (
        ('Student & Class', {
            'fields': ('student', 'timetable_entry')
        }),
        ('Location Data', {
            'fields': (
                'student_latitude', 'student_longitude', 
                'venue_latitude', 'venue_longitude', 
                'distance_meters', 'gps_accuracy'
            )
        }),
        ('Verification', {
            'fields': ('within_radius', 'is_verified', 'verification_method', 'attendance_radius_meters')
        }),
        ('Metadata', {
            'fields': ('device_info', 'metadata'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queryset with select_related to reduce queries."""
        return super().get_queryset(request).select_related(
            'student', 'timetable_entry'
        )
    
    def has_add_permission(self, request, obj=None):
        """Prevent manual addition - check-ins are system-generated."""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion for audit trail integrity."""
        return False


@admin.register(GeocodingCache)
class GeocodingCacheAdmin(admin.ModelAdmin):
    """
    Admin for GeocodingCache with cache maintenance actions.
    """
    list_display = ('address', 'latitude', 'longitude', 'hit_count', 'source', 'last_accessed')
    list_filter = ('source',)
    search_fields = ('address',)
    readonly_fields = ('hit_count', 'last_accessed', 'created_at')
    actions = [clear_low_hits, clear_all_cache]
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Address', {
            'fields': ('address',)
        }),
        ('Coordinates', {
            'fields': ('latitude', 'longitude')
        }),
        ('Metadata', {
            'fields': ('hit_count', 'source', 'last_accessed', 'created_at')
        }),
    )
    
    def has_add_permission(self, request, obj=None):
        """Prevent manual addition - cache is system-generated."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Prevent manual editing - cache entries are immutable."""
        return False
    
    def delete_queryset(self, request, queryset):
        """Override delete to require confirmation for destructive actions."""
        if request.POST.get('post') != 'yes':
            messages.warning(
                request, 
                '⚠️ Deleting cache entries may increase API costs. Click again to confirm.'
            )
            return
        super().delete_queryset(request, queryset)
        messages.success(request, f'Deleted {queryset.count()} cache entries.')


@admin.register(StudentLocationHistory)
class StudentLocationHistoryAdmin(admin.ModelAdmin):
    """
    Admin for StudentLocationHistory - READ ONLY for audit trail integrity.
    Optimized for performance with date hierarchy and pagination.
    """
    list_display = ('student', 'event_type', 'accuracy', 'created_at')
    list_filter = ('event_type',)
    search_fields = ('student__full_name', 'student__email')
    readonly_fields = ('student', 'latitude', 'longitude', 'accuracy', 'metadata', 'event_type', 'created_at')
    date_hierarchy = 'created_at'
    list_per_page = 50
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('student')
    
    # Read-only permissions for audit trail
    def has_add_permission(self, request, obj=None):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False
    
    def has_view_permission(self, request, obj=None):
        """Allow view permission for staff only."""
        return request.user.is_staff


# Set up admin site headers
admin.site.site_header = "Academe GeoService Administration"
admin.site.site_title = "Academe GeoService Admin"
admin.site.index_title = "Welcome to GeoService Administration"