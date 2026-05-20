from django.contrib import admin
from .models import AuditLog, AuditArchive, RoleHistory, PlatformStats


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'performed_by', 'target_user', 'target_type', 'severity', 'created_at')
    list_filter = ('action', 'severity', 'created_at')
    search_fields = ('performed_by__full_name', 'target_user__full_name', 'target_type', 'target_id')
    readonly_fields = ('action', 'performed_by', 'target_user', 'target_type', 'target_id',
                       'before_state', 'after_state', 'ip_address', 'user_agent', 'metadata', 'severity')
    date_hierarchy = 'created_at'
    
    def has_add_permission(self, request):
        return False  # Read-only in admin    
    def has_change_permission(self, request, obj=None):
        return False  # Immutable
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser  # Only superuser can delete


@admin.register(AuditArchive)
class AuditArchiveAdmin(admin.ModelAdmin):
    list_display = ('archive_key', 'date_range_start', 'date_range_end', 'record_count', 'file_size_bytes', 'is_verified')
    list_filter = ('is_verified', 'date_range_start')
    search_fields = ('archive_key',)
    readonly_fields = ('archive_key', 'date_range_start', 'date_range_end', 'record_count', 'file_size_bytes', 'checksum')


@admin.register(RoleHistory)
class RoleHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'action', 'performed_by', 'effective_from', 'created_at')
    list_filter = ('role', 'action', 'created_at')
    search_fields = ('user__full_name', 'role', 'scope_name')
    readonly_fields = ('user', 'role', 'scope_type', 'scope_name', 'action', 'performed_by',
                       'reason', 'effective_from', 'effective_to', 'metadata')
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


@admin.register(PlatformStats)
class PlatformStatsAdmin(admin.ModelAdmin):
    list_display = ('date', 'total_users', 'active_users', 'new_users_today', 'active_roles')
    list_filter = ('date',)
    readonly_fields = [f.name for f in PlatformStats._meta.fields]
    date_hierarchy = 'date'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False