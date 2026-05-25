from django.contrib import admin
from .models import ClassGroup, TimetableEntry, AttendanceRecord, CampusVenue

@admin.register(ClassGroup)
class ClassGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'institution', 'class_rep')
    search_fields = ('name', 'institution')

@admin.register(CampusVenue)
class CampusVenueAdmin(admin.ModelAdmin):
    list_display = ('name', 'institution', 'latitude', 'longitude', 'is_active')
    search_fields = ('name', 'institution')

@admin.register(TimetableEntry)
class TimetableEntryAdmin(admin.ModelAdmin):
    list_display = ('unit_name', 'class_group', 'day_of_week', 'start_time', 'end_time', 'venue', 'lecturer', 'is_active', 'latitude', 'longitude')
    list_filter = ('day_of_week', 'is_active', 'class_group')
    search_fields = ('unit_name', 'venue', 'lecturer')

@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ('student', 'timetable_entry', 'date', 'marked_at', 'sync_method')
    list_filter = ('sync_method', 'date')
    search_fields = ('student__full_name',)