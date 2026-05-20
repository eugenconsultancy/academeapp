# my accounts models.py file for usermanagement etc
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
        return self.create_user(phone_number, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    phone_number = models.CharField(max_length=15, unique=True)
    admission_number = models.CharField(max_length=50)
    email = models.EmailField(blank=True)
    full_name = models.CharField(max_length=255)
    class_name = models.CharField(max_length=100)  # e.g., "3rd year Microbiology"
    institution = models.CharField(max_length=255)
    profile_pic = models.URLField(blank=True)
    role = models.CharField(
        max_length=20,
        choices=[(role.value, role.name) for role in UserRole],
        default=UserRole.STUDENT.value
    )
    # ============================================
    # ROLE LIFECYCLE: System user flag
    # Prevents accidental deletion of critical system accounts
    # (Super Admins, automated system accounts)
    # ============================================
    is_system_user = models.BooleanField(
        default=False,
        help_text="If True, this user cannot be deleted through normal admin actions"
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
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
        """Check if user is currently online"""
        from django.core.cache import cache
        return cache.get(f'user_online_{self.id}') is not None
    
    @property
    def effective_role(self):
        """
        Get the user's effective role considering active StudentRole assignments.
        StudentRole overrides the base role if it's a leadership position.
        """
        from django.utils import timezone
        
        # Check for active StudentRole that grants elevated permissions
        active_role = self.student_roles.filter(
            is_active=True,
            start_date__lte=timezone.now(),
            end_date__gte=timezone.now(),
        ).order_by('-role').first()  # Highest role first
        
        if active_role:
            return active_role.role
        
        return self.role
    
    def get_badges(self):
        return self.badges.all()
    
    def get_active_student_roles(self):
        """Get all currently active StudentRole assignments"""
        from django.utils import timezone
        return self.student_roles.filter(
            is_active=True,
            start_date__lte=timezone.now(),
            end_date__gte=timezone.now(),
        )
    
    def has_active_role(self, role_name):
        """Check if user has a specific active leadership role"""
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
    """
    Core RBAC model for time-bound leadership positions.
    
    This is the SOURCE OF TRUTH for student leadership roles.
    The User.role field acts as a fallback/default only.
    
    Roles automatically expire based on end_date via the
    expire_roles Celery task (runs daily at 02:00 UTC).
    
    Governance:
    - Class Rep: Assigned by Faculty/Dept. Officer or Institution Admin
    - Student Leader: Assigned by Institution Admin
    - Faculty Rep: Assigned by Institution Admin
    """
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
    start_date = models.DateTimeField(
        help_text="When this role assignment becomes active"
    )
    end_date = models.DateTimeField(
        help_text="When this role assignment expires. Automatically deactivated by expire_roles task."
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Set to False by expire_roles task when end_date passes, or manually by admin"
    )
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='roles_assigned',
        help_text="The admin/officer who assigned this role"
    )
    revocation_reason = models.TextField(
        blank=True,
        help_text="Reason for early revocation (if revoked before end_date)"
    )
    revoked_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this role was manually revoked (if applicable)"
    )
    revoked_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='roles_revoked',
        help_text="Who revoked this role (if applicable)"
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
        """Check if this role has passed its end_date"""
        from django.utils import timezone
        return timezone.now() >= self.end_date
    
    @property
    def days_remaining(self):
        """Calculate days remaining before expiration"""
        from django.utils import timezone
        delta = self.end_date - timezone.now()
        return max(0, delta.days)
    
    def expire(self, reason="Role term ended", revoked_by=None):
        """
        Expire this role assignment.
        
        Called by:
        - expire_roles Celery task (automatic expiration)
        - Admin API (manual revocation)
        """
        self.is_active = False
        self.revocation_reason = reason
        self.revoked_at = timezone.now()
        if revoked_by:
            self.revoked_by = revoked_by
        self.save(update_fields=[
            'is_active', 'revocation_reason', 'revoked_at', 'revoked_by'
        ])
        
        # Determine if user's base role should be updated
        self._update_user_base_role()
    
    def _update_user_base_role(self):
        """
        After expiring this role, check if the user has any other active
        leadership roles. If not, revert their base role to 'student'.
        """
        from django.utils import timezone
        
        # Check if user has any OTHER active roles of the same type
        has_other_active = StudentRole.objects.filter(
            user=self.user,
            role=self.role,
            is_active=True,
            start_date__lte=timezone.now(),
            end_date__gte=timezone.now(),
        ).exclude(id=self.id).exists()
        
        if not has_other_active:
            # Check if they have ANY active leadership role
            has_any_leadership = StudentRole.objects.filter(
                user=self.user,
                is_active=True,
                start_date__lte=timezone.now(),
                end_date__gte=timezone.now(),
            ).exclude(id=self.id).exists()
            
            if not has_any_leadership:
                # Revert to student
                self.user.role = UserRole.STUDENT.value
                self.user.save(update_fields=['role'])


# ============================================
# ROLE LIFECYCLE: UserSession Model
# ============================================
class UserSession(BaseModel):
    """
    Track active refresh tokens per device for remote session revocation.
    
    Enables:
    - "Log out everywhere" functionality
    - Admin-forced session termination
    - Security audit of active sessions
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sessions'
    )
    refresh_token = models.TextField(
        help_text="Encrypted refresh token"
    )
    device_info = models.JSONField(
        default=dict,
        help_text="Device information (type, OS, browser, IP)"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Set to False when session is revoked or expires"
    )
    expires_at = models.DateTimeField(
        help_text="When this session naturally expires"
    )
    revoked_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this session was manually revoked"
    )
    revoked_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='revoked_sessions',
        help_text="Who revoked this session (admin or user)"
    )
    last_used_at = models.DateTimeField(
        auto_now=True,
        help_text="Last time this session was used"
    )
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['expires_at']),
        ]
        ordering = ['-last_used_at']
    
    def revoke(self, revoked_by=None):
        """Revoke this session"""
        from django.utils import timezone
        self.is_active = False
        self.revoked_at = timezone.now()
        if revoked_by:
            self.revoked_by = revoked_by
        self.save()


# ============================================
# EXISTING MODELS (UNCHANGED)
# ============================================

class Badge(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='badges')
    badge_type = models.CharField(
        max_length=20,
        choices=[(badge.value, badge.name) for badge in BadgeType]
    )
    awarded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'badge_type']


class DataExport(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    export_file = models.URLField()
    format = models.CharField(max_length=10)  # json or csv FORMAT
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()