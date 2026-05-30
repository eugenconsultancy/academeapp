from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from common.models import BaseModel
from common.constants import UserRole, BadgeType
from django.utils import timezone 

class UserManager(BaseUserManager):
    def create_user(self, phone_number, password=None, **extra_fields):
        if not phone_number:
            raise ValueError('Phone number is required')
        user = self.model(phone_number=phone_number, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, phone_number, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', UserRole.ADMIN)
        extra_fields.setdefault('is_system_user', True)   # superuser is system user
        return self.create_user(phone_number, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    # Core Identity
    phone_number = models.CharField(max_length=15, unique=True)
    admission_number = models.CharField(max_length=50)
    email = models.EmailField(blank=True)
    full_name = models.CharField(max_length=255)
    class_name = models.CharField(max_length=100)
    institution = models.CharField(max_length=255)
    profile_pic = models.URLField(blank=True)
    
    # Biometric Authentication (Cloud-Ready)
    biometric_enabled = models.BooleanField(default=False)
    face_data = models.TextField(blank=True)   # base64 image, size ~200KB, acceptable for demo
    
    # Role & Permissions
    role = models.CharField(
        max_length=20,
        choices=[(role.value, role.name) for role in UserRole],
        default=UserRole.STUDENT.value
    )
    is_system_user = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    # Two-Factor Authentication (TOTP)
    two_factor_enabled = models.BooleanField(default=False)
    totp_secret = models.CharField(max_length=32, blank=True, null=True)  # TOTP secret key
    backup_codes = models.JSONField(default=list, blank=True)  # list of hashed backup codes
    
    # Tracking & Notifications
    fcm_token = models.CharField(max_length=255, blank=True)
    last_activity = models.DateTimeField(null=True, blank=True)
    last_visited_opportunities = models.DateTimeField(null=True, blank=True)
    login_count = models.IntegerField(default=0)
    total_likes_given = models.IntegerField(default=0)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = ['full_name', 'admission_number', 'institution']
    
    class Meta:
        indexes = [
            models.Index(fields=['phone_number']),
            models.Index(fields=['admission_number', 'institution']),
            models.Index(fields=['role', 'is_active']),
        ]
    
    @property
    def is_online(self):
        from django.core.cache import cache
        return cache.get(f'user_online_{self.id}') is not None
    
    @property
    def effective_role(self):
        active_role = self.student_roles.filter(
            is_active=True,
            start_date__lte=timezone.now(),
            end_date__gte=timezone.now(),
        ).order_by('-role').first()
        return active_role.role if active_role else self.role
    
    def get_badges(self):
        return self.badges.all()

    def get_active_student_roles(self):
        return self.student_roles.filter(
            is_active=True,
            start_date__lte=timezone.now(),
            end_date__gte=timezone.now(),
        )
    
    def has_active_role(self, role_name):
        return self.student_roles.filter(
            role=role_name,
            is_active=True,
            start_date__lte=timezone.now(),
            end_date__gte=timezone.now(),
        ).exists()


# ============================================
# ROLE LIFECYCLE: StudentRole Model
# ============================================
class StudentRole(BaseModel):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='student_roles'
    )
    role = models.CharField(
        max_length=20,
        choices=[
            ('class_rep', 'Class Representative'),
            ('student_leader', 'Student Leader'),
            ('faculty_rep', 'Faculty Representative'),
        ],
        help_text="The leadership role being assigned"
    )
    scope_type = models.CharField(
        max_length=20,
        choices=[
            ('class', 'Class'),
            ('department', 'Department'),
            ('faculty', 'Faculty'),
            ('institution', 'Institution'),
        ],
        help_text="The scope of authority for this role"
    )
    scope_id = models.UUIDField(
        help_text="ID of the ClassGroup, Department, Faculty, or Institution this role governs"
    )
    scope_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Human-readable name of the scope (e.g., '3rd Year Microbiology')"
    )
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='roles_assigned',
    )
    revocation_reason = models.TextField(blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='roles_revoked',
    )
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['end_date', 'is_active']),
            models.Index(fields=['role', 'is_active']),
            models.Index(fields=['scope_type', 'scope_id']),
        ]
        ordering = ['-start_date']
        verbose_name = 'Student Role Assignment'
        verbose_name_plural = 'Student Role Assignments'
    
    def __str__(self):
        return f"{self.user.full_name} — {self.get_role_display()} ({self.scope_name})"
    
    @property
    def is_expired(self):
        from django.utils import timezone
        return timezone.now() >= self.end_date
    
    @property
    def days_remaining(self):
        from django.utils import timezone
        delta = self.end_date - timezone.now()
        return max(0, delta.days)
    
    def expire(self, reason="Role term ended", revoked_by=None):
        self.is_active = False
        self.revocation_reason = reason
        self.revoked_at = timezone.now()
        if revoked_by:
            self.revoked_by = revoked_by
        self.save(update_fields=['is_active', 'revocation_reason', 'revoked_at', 'revoked_by'])
        self._update_user_base_role()
    
    def _update_user_base_role(self):
        from django.utils import timezone
        has_other_active = StudentRole.objects.filter(
            user=self.user,
            role=self.role,
            is_active=True,
            start_date__lte=timezone.now(),
            end_date__gte=timezone.now(),
        ).exclude(id=self.id).exists()
        
        if not has_other_active:
            has_any_leadership = StudentRole.objects.filter(
                user=self.user,
                is_active=True,
                start_date__lte=timezone.now(),
                end_date__gte=timezone.now(),
            ).exclude(id=self.id).exists()
            
            if not has_any_leadership:
                self.user.role = UserRole.STUDENT.value
                self.user.save(update_fields=['role'])


# ============================================
# UserSession Model
# ============================================
class UserSession(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    refresh_token = models.TextField(help_text="Encrypted refresh token")
    device_info = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='revoked_sessions')
    last_used_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['expires_at']),
        ]
        ordering = ['-last_used_at']
    
    def revoke(self, revoked_by=None):
        from django.utils import timezone
        self.is_active = False
        self.revoked_at = timezone.now()
        if revoked_by:
            self.revoked_by = revoked_by
        self.save()


# ============================================
# Badge & DataExport (unchanged)
# ============================================
class Badge(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='badges')
    badge_type = models.CharField(max_length=20, choices=[(badge.value, badge.name) for badge in BadgeType])
    awarded_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = ['user', 'badge_type']

class DataExport(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    export_file = models.URLField()
    format = models.CharField(max_length=10)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()