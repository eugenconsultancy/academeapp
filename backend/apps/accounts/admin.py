from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Badge, DataExport

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    # Added 'has_biometric' to display
    list_display = ('phone_number', 'full_name', 'admission_number', 'institution', 'role', 'is_active', 'has_biometric')
    list_filter = ('role', 'institution', 'is_active')
    search_fields = ('phone_number', 'full_name', 'admission_number')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {'fields': ('phone_number', 'password')}),
        ('Personal info', {'fields': ('full_name', 'email', 'admission_number', 'class_name', 'institution')}),
        ('Profile', {'fields': ('profile_pic', 'role', 'fcm_token', 'face_embedding')}), # Added face_embedding
        ('Activity', {'fields': ('last_activity', 'last_visited_opportunities', 'login_count', 'total_likes_given')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('phone_number', 'full_name', 'admission_number', 'class_name', 'institution'),
        }),
    )

    # Helper method to show status in list view
    @admin.display(boolean=True, description='Biometric Enabled')
    def has_biometric(self, obj):
        return obj.face_embedding is not None

@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ('user', 'badge_type', 'awarded_at')
    list_filter = ('badge_type',)

@admin.register(DataExport)
class DataExportAdmin(admin.ModelAdmin):
    list_display = ('user', 'format', 'created_at', 'expires_at')