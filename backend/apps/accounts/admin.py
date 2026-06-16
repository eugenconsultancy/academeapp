# backend/apps/accounts/admin.py
"""
Django Admin configuration for accounts models.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from django.urls import reverse
from .models import User, Badge, DataExport, StudentRole, UserSession


# ─── Inline Models ────────────────────────────────────────────────────────────

class StudentRoleInline(admin.TabularInline):
    """Display student roles inline on User admin page."""
    model = StudentRole
    fk_name = "user"
    extra = 0
    show_change_link = True
    fields = ('role', 'scope_name', 'start_date', 'end_date', 'is_active')
    readonly_fields = ('start_date',)
    ordering = ('-start_date',)


class UserSessionInline(admin.TabularInline):
    """Display active sessions inline on User admin page."""
    model = UserSession
    fk_name = "user"
    extra = 0
    show_change_link = True
    fields = ('is_active', 'device_info', 'expires_at', 'last_used_at')
    readonly_fields = ('device_info', 'expires_at', 'last_used_at')
    ordering = ('-last_used_at',)
    can_delete = True
    
    def has_add_permission(self, request, obj=None):
        return False  # Sessions are created programmatically


class BadgeInline(admin.TabularInline):
    """Display badges inline on User admin page."""
    model = Badge
    fk_name = "user"
    extra = 0
    fields = ('badge_type', 'awarded_at')
    readonly_fields = ('badge_type', 'awarded_at')
    
    def has_add_permission(self, request, obj=None):
        return False


# ─── User Admin ───────────────────────────────────────────────────────────────

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = (
        'phone_number',
        'full_name',
        'admission_number',
        'institution',
        'role',
        'is_active',
        'has_biometric',
        'is_system_user',
        'last_activity_display',
    )
    list_filter = (
        'role',
        'institution',
        'is_active',
        'biometric_enabled',
        'is_system_user',
        'is_staff',
    )
    search_fields = (
        'phone_number',
        'full_name',
        'admission_number',
        'email',
        'id',  # UUID search for chat/debugging
    )
    ordering = ('-created_at',)
    
    # Fieldsets for editing existing users
    fieldsets = (
        (None, {
            'fields': ('phone_number', 'password')
        }),
        ('Personal Info', {
            'fields': (
                'full_name', 'email', 'admission_number',
                'class_name', 'institution'
            )
        }),
        ('Profile', {
            'fields': (
                'profile_pic', 'role',
                'biometric_enabled', 'face_data',
            )
        }),
        ('Notifications & Devices', {
            'fields': ('fcm_token',),
            'classes': ('collapse',),
        }),
        ('Two-Factor Authentication', {
            'fields': ('two_factor_enabled', 'totp_secret', 'backup_codes'),
            'classes': ('collapse',),
        }),
        ('Activity Tracking', {
            'fields': (
                'last_activity', 'last_visited_opportunities',
                'login_count', 'total_likes_given',
            ),
            'classes': ('collapse',),
        }),
        ('Permissions', {
            'fields': (
                'is_active', 'is_staff', 'is_superuser',
                'is_system_user', 'groups', 'user_permissions',
            ),
        }),
        ('Important Dates', {
            'fields': ('last_login', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    
    # Fieldsets for adding new users
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'phone_number',
                'password1',       # REQUIRED by Django UserAdmin
                'password2',       # REQUIRED by Django UserAdmin
                'full_name',
                'admission_number',
                'class_name',
                'institution',
                'role',
            ),
        }),
    )
    
    # Inline models displayed on User edit page
    inlines = [
        StudentRoleInline,
        UserSessionInline,
        BadgeInline,
    ]
    
    # Admin actions
    actions = [
        'deactivate_selected_users',
        'activate_selected_users',
        'enable_biometric_selected',
        'disable_biometric_selected',
    ]
    
    # Readonly fields
    readonly_fields = ('created_at', 'updated_at')
    
    # ─── Display Helpers ──────────────────────────────────────────────────
    
    @admin.display(
        boolean=True,
        ordering='biometric_enabled',
        description='Biometric',
    )
    def has_biometric(self, obj):
        """Display biometric status with icon."""
        return obj.biometric_enabled
    
    @admin.display(
        ordering='last_activity',
        description='Last Active',
    )
    def last_activity_display(self, obj):
        """Display last activity as relative time."""
        if obj.last_activity:
            from django.utils import timezone
            from django.contrib.humanize.templatetags.humanize import naturaltime
            return naturaltime(obj.last_activity)
        return "Never"
    
    # ─── Actions ─────────────────────────────────────────────────────────
    
    @admin.action(description="Deactivate selected users")
    def deactivate_selected_users(self, request, queryset):
        """Deactivate users and revoke their sessions."""
        count = 0
        for user in queryset:
            if user.is_active:
                user.is_active = False
                user.save(update_fields=['is_active', 'updated_at'])
                # Revoke active sessions
                UserSession.objects.filter(
                    user=user, is_active=True
                ).update(is_active=False)
                count += 1
        self.message_user(
            request,
            f'{count} user(s) deactivated and sessions revoked.'
        )
    
    @admin.action(description="Activate selected users")
    def activate_selected_users(self, request, queryset):
        """Activate users."""
        updated = queryset.filter(is_active=False).update(is_active=True)
        self.message_user(request, f'{updated} user(s) activated.')
    
    @admin.action(description="Enable biometric for selected users")
    def enable_biometric_selected(self, request, queryset):
        """Enable biometric authentication."""
        updated = queryset.update(biometric_enabled=True)
        self.message_user(
            request,
            f'Biometric enabled for {updated} user(s).'
        )
    
    @admin.action(description="Disable biometric for selected users")
    def disable_biometric_selected(self, request, queryset):
        """Disable biometric authentication."""
        updated = queryset.update(biometric_enabled=False)
        self.message_user(
            request,
            f'Biometric disabled for {updated} user(s).'
        )


# ─── Other Model Admins ───────────────────────────────────────────────────────

@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ('user', 'badge_type', 'awarded_at')
    list_filter = ('badge_type', 'awarded_at')
    search_fields = ('user__phone_number', 'user__full_name')
    ordering = ('-awarded_at',)
    raw_id_fields = ('user',)


@admin.register(DataExport)
class DataExportAdmin(admin.ModelAdmin):
    list_display = ('user', 'format', 'created_at', 'expires_at', 'is_expired')
    list_filter = ('format', 'created_at')
    search_fields = ('user__phone_number', 'user__full_name')
    ordering = ('-created_at',)
    raw_id_fields = ('user',)
    readonly_fields = ('created_at', 'expires_at')
    
    @admin.display(boolean=True, description='Expired')
    def is_expired(self, obj):
        from django.utils import timezone
        return timezone.now() > obj.expires_at


@admin.register(StudentRole)
class StudentRoleAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'role', 'scope_name', 'scope_type',
        'start_date', 'end_date', 'is_active', 'is_expired_display'
    )
    list_filter = (
        'role', 'is_active', 'scope_type',
        'start_date', 'end_date',
    )
    search_fields = (
        'user__full_name', 'user__phone_number',
        'scope_name', 'role',
    )
    ordering = ('-start_date',)
    raw_id_fields = ('user', 'assigned_by', 'revoked_by')
    readonly_fields = ('created_at', 'updated_at')
    
    actions = ['expire_selected_roles']
    
    @admin.display(boolean=True, description='Expired')
    def is_expired_display(self, obj):
        return obj.is_expired
    
    @admin.action(description="Expire selected roles")
    def expire_selected_roles(self, request, queryset):
        count = 0
        for role in queryset.filter(is_active=True):
            role.expire(reason="Admin expired", revoked_by=request.user)
            count += 1
        self.message_user(request, f'{count} role(s) expired.')


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'is_active', 'device_type_display',
        'created_at', 'expires_at', 'last_used_at',
    )
    list_filter = ('is_active', 'created_at')
    search_fields = ('user__phone_number', 'user__full_name')
    ordering = ('-last_used_at',)
    raw_id_fields = ('user', 'revoked_by')
    readonly_fields = (
        'refresh_token', 'device_info',
        'created_at', 'updated_at', 'last_used_at',
    )
    
    actions = ['revoke_selected_sessions']
    
    @admin.display(description='Device')
    def device_type_display(self, obj):
        """Display device type from device_info JSON."""
        if obj.device_info:
            device = obj.device_info.get('device_type', 'Unknown')
            browser = obj.device_info.get('browser', '')
            return f"{device} ({browser})" if browser else device
        return "Unknown"
    
    @admin.action(description="Revoke selected sessions")
    def revoke_selected_sessions(self, request, queryset):
        count = 0
        for session in queryset.filter(is_active=True):
            session.revoke(revoked_by=request.user)
            count += 1
        self.message_user(request, f'{count} session(s) revoked.')