from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from django.urls import reverse
from .models import User, Badge, DataExport, StudentRole, UserSession

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('phone_number', 'full_name', 'admission_number', 'institution', 'role', 'is_active', 'has_biometric', 'is_system_user')
    list_filter = ('role', 'institution', 'is_active', 'biometric_enabled', 'is_system_user')
    search_fields = ('phone_number', 'full_name', 'admission_number', 'email')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {'fields': ('phone_number', 'password')}),
        ('Personal info', {'fields': ('full_name', 'email', 'admission_number', 'class_name', 'institution')}),
        ('Profile', {'fields': ('profile_pic', 'role', 'fcm_token', 'biometric_enabled', 'face_data')}),
        ('Activity', {'fields': ('last_activity', 'last_visited_opportunities', 'login_count', 'total_likes_given')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions', 'is_system_user')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('phone_number', 'full_name', 'admission_number', 'class_name', 'institution'),
        }),
    )

    actions = ['deactivate_selected_users', 'activate_selected_users']

    @admin.display(boolean=True, description='Biometric Enabled')
    def has_biometric(self, obj):
        return obj.biometric_enabled

    def deactivate_selected_users(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} user(s) deactivated.')
    deactivate_selected_users.short_description = "Deactivate selected users"

    def activate_selected_users(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} user(s) activated.')
    activate_selected_users.short_description = "Activate selected users"

@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ('user', 'badge_type', 'awarded_at')
    list_filter = ('badge_type',)

@admin.register(DataExport)
class DataExportAdmin(admin.ModelAdmin):
    list_display = ('user', 'format', 'created_at', 'expires_at')

@admin.register(StudentRole)
class StudentRoleAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'scope_name', 'start_date', 'end_date', 'is_active')
    list_filter = ('role', 'is_active', 'scope_type')
    search_fields = ('user__full_name', 'scope_name')

@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_active', 'created_at', 'expires_at', 'last_used_at')
    list_filter = ('is_active',)