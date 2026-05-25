from django.contrib import admin
from .models import Announcement, AnnouncementRequest, Report

@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('title', 'posted_by', 'target', 'is_urgent', 'expires_at', 'is_active')
    list_filter = ('target', 'is_urgent', 'is_active')
    search_fields = ('title', 'content')
    list_select_related = ('posted_by',)

@admin.register(AnnouncementRequest)
class AnnouncementRequestAdmin(admin.ModelAdmin):
    list_display = ('title', 'requester', 'target', 'status', 'created_at')
    list_filter = ('status', 'target')
    search_fields = ('title', 'requester__full_name')
    list_select_related = ('requester',)

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('announcement', 'reported_by', 'reason', 'is_resolved')
    list_filter = ('reason', 'is_resolved')
    search_fields = ('announcement__title', 'reported_by__full_name', 'reason')
    list_select_related = ('announcement', 'reported_by')
    autocomplete_fields = ('announcement', 'reported_by')
    actions = ['mark_as_resolved']

    @admin.action(description='Mark selected reports as resolved')
    def mark_as_resolved(self, request, queryset):
        queryset.update(is_resolved=True)