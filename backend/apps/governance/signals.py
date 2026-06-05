from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from apps.accounts.models import User, StudentRole
from apps.announcements.models import Announcement
from apps.governance.services.audit_service import AuditService
from apps.notifications.services import NotificationService


@receiver(post_save, sender=User)
def log_user_creation(sender, instance, created, **kwargs):
    """Log new user registration."""
    if created:
        AuditService.log_action(
            action='USER_CREATED',
            performed_by=None,
            target_user=instance,
            target_type='User',
            target_id=str(instance.id),
            after_state={
                'phone_number': instance.phone_number,
                'full_name': instance.full_name,
                'admission_number': instance.admission_number,
                'institution': instance.institution,
            },
            severity='info',
        )


@receiver(post_save, sender=Announcement)
def log_announcement_creation(sender, instance, created, **kwargs):
    """Log new announcement creation."""
    if created:
        AuditService.log_action(
            action='ANNOUNCEMENT_CREATED',
            performed_by=instance.posted_by,
            target_type='Announcement',
            target_id=str(instance.id),
            after_state={
                'title': instance.title,
                'target': instance.target,
                'is_urgent': instance.is_urgent,
            },
            severity='info',
        )


@receiver(post_delete, sender=Announcement)
def log_announcement_deletion(sender, instance, **kwargs):
    """Log announcement deletion."""
    AuditService.log_action(
        action='ANNOUNCEMENT_DELETED',
        performed_by=None,
        target_type='Announcement',
        target_id=str(instance.id),
        before_state={
            'title': instance.title,
            'target': instance.target,
        },
        severity='warning',
    )


# ── Notification signals for governance role changes ──────────
@receiver(post_save, sender=StudentRole)
def role_assigned_notify(sender, instance, created, **kwargs):
    """Notify user when a governance role is assigned."""
    if created:
        NotificationService.create_and_push(
            user=instance.user,
            title="Role Assigned",
            message=f"You have been assigned the role of {instance.get_role_display()}.",
            notification_type="role_assigned",
            link="/governance",
            source_type="governance",
            source_id=instance.id,
        )


@receiver(post_delete, sender=StudentRole)
def role_revoked_notify(sender, instance, **kwargs):
    """Notify user when a governance role is revoked."""
    NotificationService.create_and_push(
        user=instance.user,
        title="Role Revoked",
        message=f"Your role {instance.get_role_display()} has been revoked.",
        notification_type="system",
        link="/governance",
        source_type="governance",
        source_id=None,
    )