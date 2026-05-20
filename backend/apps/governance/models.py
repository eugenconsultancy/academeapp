from django.db import models
from common.models import BaseModel


class AuditLog(BaseModel):
    """
    High-fidelity audit trail for all governance actions.
    Uses JSONField for flexible state snapshots.
    
    Stores:
    - Who performed the action
    - What action was taken
    - What changed (before/after states)
    - When and from where
    """
    ACTION_CHOICES = [
        ('USER_CREATED', 'User Created'),
        ('USER_UPDATED', 'User Updated'),
        ('USER_DEACTIVATED', 'User Deactivated'),
        ('ROLE_ASSIGNED', 'Role Assigned'),
        ('ROLE_REVOKED', 'Role Revoked'),
        ('ROLE_EXPIRED', 'Role Expired'),
        ('ANNOUNCEMENT_CREATED', 'Announcement Created'),
        ('ANNOUNCEMENT_DELETED', 'Announcement Deleted'),
        ('ANNOUNCEMENT_REPORTED', 'Announcement Reported'),
        ('CLAIM_APPROVED', 'Claim Approved'),
        ('CLAIM_REJECTED', 'Claim Rejected'),
        ('ITEM_REPORTED', 'Item Reported'),
        ('OPPORTUNITY_REPORTED', 'Opportunity Reported'),
        ('SESSION_REVOKED', 'Session Revoked'),
        ('SETTINGS_CHANGED', 'Settings Changed'),
        ('DATA_EXPORTED', 'Data Exported'),
        ('SYSTEM_ACTION', 'System Action'),
    ]

    action = models.CharField(max_length=50, choices=ACTION_CHOICES, db_index=True)
    performed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='governance_audit_actions',
        help_text="User who performed the action (null for system actions)"
    )
    target_user = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='governance_audit_targeted',
        help_text="User affected by this action"
    )
    target_type = models.CharField(max_length=100, blank=True)
    target_id = models.CharField(max_length=100, blank=True)
    before_state = models.JSONField(default=dict, blank=True)
    after_state = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    severity = models.CharField(
        max_length=20,
        choices=[
            ('info', 'Info'),
            ('warning', 'Warning'),
            ('critical', 'Critical'),
        ],
        default='info'
    )

    class Meta:
        indexes = [
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['target_type', 'target_id']),
            models.Index(fields=['performed_by', 'created_at']),
            models.Index(fields=['severity']),
        ]
        ordering = ['-created_at']
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'

    def __str__(self):
        user_name = self.performed_by.full_name if self.performed_by else 'System'
        return f"[{self.get_action_display()}] by {user_name} at {self.created_at.strftime('%Y-%m-%d %H:%M')}"
class AuditArchive(BaseModel):
    """
    Reference to archived audit logs stored in cold storage (S3 Glacier).
    Logs older than 1 year are compressed to Parquet format and archived.
    """
    archive_key = models.CharField(max_length=500, help_text="S3 object key")
    date_range_start = models.DateField()
    date_range_end = models.DateField()
    record_count = models.IntegerField()
    file_size_bytes = models.BigIntegerField()
    archive_format = models.CharField(max_length=20, default='parquet')
    checksum = models.CharField(max_length=64, blank=True, help_text="SHA-256 checksum for integrity verification")
    is_verified = models.BooleanField(default=False)
    verification_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-date_range_start']
        verbose_name = 'Audit Archive'
        verbose_name_plural = 'Audit Archives'

    def __str__(self):
        return f"Audit Archive: {self.date_range_start} to {self.date_range_end} ({self.record_count} records)"


class RoleHistory(BaseModel):
    """
    Immutable record of all role assignments and revocations.
    Maintains a complete history of student leadership.
    """
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='role_history'
    )
    role = models.CharField(max_length=50)
    scope_type = models.CharField(max_length=50, blank=True)
    scope_name = models.CharField(max_length=255, blank=True)
    action = models.CharField(
        max_length=20,
        choices=[
            ('assigned', 'Assigned'),
            ('revoked', 'Revoked'),
            ('expired', 'Expired'),
            ('modified', 'Modified'),
        ]
    )
    performed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='role_actions_performed'
    )
    reason = models.TextField(blank=True)
    effective_from = models.DateTimeField()
    effective_to = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['role', 'action']),
        ]
        ordering = ['-created_at']
        verbose_name_plural = 'Role Histories'

    def __str__(self):
        return f"{self.user.full_name} - {self.role} ({self.action})"


class PlatformStats(BaseModel):
    """
    Daily snapshot of platform statistics for dashboard metrics.
    Generated by a daily Celery task.
    """
    date = models.DateField(unique=True)
    total_users = models.IntegerField(default=0)
    active_users = models.IntegerField(default=0)
    new_users_today = models.IntegerField(default=0)
    total_announcements = models.IntegerField(default=0)
    active_announcements = models.IntegerField(default=0)
    total_found_items = models.IntegerField(default=0)
    claimed_items = models.IntegerField(default=0)
    total_opportunities = models.IntegerField(default=0)
    active_opportunities = models.IntegerField(default=0)
    total_claims = models.IntegerField(default=0)
    resolved_claims = models.IntegerField(default=0)
    total_reports = models.IntegerField(default=0)
    resolved_reports = models.IntegerField(default=0)
    active_roles = models.IntegerField(default=0)
    expiring_roles_7d = models.IntegerField(default=0)
    total_login_count = models.IntegerField(default=0)
    raw_data = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-date']
        verbose_name_plural = 'Platform Stats'

    def __str__(self):
        return f"Stats for {self.date}"