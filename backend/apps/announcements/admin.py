from django.contrib import admin
from .models import Announcement, AnnouncementRequest, Report

@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('title', 'posted_by', 'target', 'is_urgent', 'expires_at', 'is_active')
    list_filter = ('target', 'is_urgent', 'is_active')
    search_fields = ('title', 'content')

@admin.register(AnnouncementRequest)
class AnnouncementRequestAdmin(admin.ModelAdmin):
    list_display = ('title', 'requester', 'target', 'status', 'created_at')
    list_filter = ('status', 'target')

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('announcement', 'reported_by', 'reason', 'is_resolved')
    list_filter = ('reason', 'is_resolved')