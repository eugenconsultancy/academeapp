import uuid
from django.db import models
from common.models import BaseModel

class Notification(BaseModel):
    NOTIFICATION_TYPES = [
        ('welcome', 'Welcome'),
        ('announcement', 'Announcement'),
        ('announcement_urgent', 'Urgent Announcement'),
        ('attendance_reminder', 'Attendance Reminder'),
        ('class_reminder', 'Class Reminder'),
        ('item_found', 'Item Found'),
        ('claim_update', 'Claim Update'),
        ('claim_approved', 'Claim Approved'),
        ('claim_rejected', 'Claim Rejected'),
        ('tip_received', 'Tip Received'),
        ('role_assigned', 'Role Assigned'),
        ('role_expired', 'Role Expired'),
        ('role_expiring_soon', 'Role Expiring Soon'),
        ('payment_received', 'Payment Received'),
        ('payment_failed', 'Payment Failed'),
        ('ticket_updated', 'Ticket Updated'),
        ('badge_earned', 'Badge Earned'),
        ('opportunity_expiring', 'Opportunity Expiring'),
        ('system', 'System'),
    ]

    SOURCE_TYPES = [
        ('announcement', 'Announcement'),
        ('found_item', 'Found Item'),
        ('opportunity', 'Opportunity'),
        ('support', 'Support Ticket'),
        ('governance', 'Governance'),
        ('system', 'System'),
    ]

    user = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, related_name='notifications'
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=50, choices=NOTIFICATION_TYPES, default='system'
    )
    is_read = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    link = models.CharField(max_length=1024, blank=True)
    source_type = models.CharField(
        max_length=30, choices=SOURCE_TYPES, blank=True, null=True
    )
    source_id = models.UUIDField(null=True, blank=True, default=None)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_deleted']),
        ]

    def __str__(self):
        return f"{self.user.full_name} - {self.title}"


class NotificationPreference(BaseModel):
    user = models.OneToOneField(
        'accounts.User', on_delete=models.CASCADE, related_name='notification_preferences'
    )
    # Push / in-app toggle per category – True means enabled
    push_announcement = models.BooleanField(default=True)
    push_class = models.BooleanField(default=True)
    push_found_item = models.BooleanField(default=True)
    push_opportunity = models.BooleanField(default=True)
    push_support = models.BooleanField(default=True)
    push_governance = models.BooleanField(default=True)
    push_system = models.BooleanField(default=True)

    # Convenience method to check preference
    def is_enabled(self, notification_type):
        field_map = {
            'announcement': 'push_announcement',
            'announcement_urgent': 'push_announcement',
            'class': 'push_class',
            'class_reminder': 'push_class',
            'found_item': 'push_found_item',
            'item_found': 'push_found_item',
            'claim_update': 'push_found_item',
            'claim_approved': 'push_found_item',
            'claim_rejected': 'push_found_item',
            'opportunity': 'push_opportunity',
            'opportunity_expiring': 'push_opportunity',
            'support': 'push_support',
            'ticket_updated': 'push_support',
            'governance': 'push_governance',
            'role_assigned': 'push_governance',
            'role_expired': 'push_governance',
            'role_expiring_soon': 'push_governance',
            'system': 'push_system',
        }
        field = field_map.get(notification_type)
        if field:
            return getattr(self, field, True)
        return True  # default enabled

    def __str__(self):
        return f"Preferences for {self.user.full_name}"