from django.contrib import admin
from .models import Notification, NotificationPreference

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'notification_type', 'is_read', 'is_deleted', 'source_type', 'source_id', 'created_at')
    list_filter = ('notification_type', 'is_read', 'is_deleted', 'source_type')
    search_fields = ('title', 'message', 'user__full_name')
    actions = ['mark_as_read', 'soft_delete']

    def mark_as_read(self, request, queryset):
        updated = queryset.update(is_read=True)
        self.message_user(request, f"Marked {updated} notifications as read.")
    mark_as_read.short_description = "Mark selected as read"

    def soft_delete(self, request, queryset):
        updated = queryset.update(is_deleted=True)
        self.message_user(request, f"Soft deleted {updated} notifications.")
    soft_delete.short_description = "Soft delete selected notifications"


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'push_announcement', 'push_class', 'push_found_item', 'push_opportunity', 'push_support', 'push_governance', 'push_system')
    list_filter = ('push_announcement', 'push_class')
    search_fields = ('user__full_name',)