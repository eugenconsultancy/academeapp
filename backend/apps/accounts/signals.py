from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User
from common.notifications import NotificationService

@receiver(post_save, sender=User)
def user_created(sender, instance, created, **kwargs):
    """Handle new user creation events"""
    if created:
        notifier = NotificationService()
        notifier.send_push_notification(
            instance,
            "Welcome to Academe!",
            f"Hi {instance.full_name}, welcome to the student community. "
            "Start by checking out today's classes and announcements.",
            {'type': 'welcome'}
        )

@receiver(post_save, sender=User)
def check_badges(sender, instance, **kwargs):
    """Check and award badges on user updates"""
    from .services import AccountService
    AccountService.check_login_badges(instance)
    AccountService.check_engagement_badge(instance)

@receiver(post_save, sender=User)
def notify_biometric_enrollment(sender, instance, update_fields, **kwargs):
    """Notify the user when biometric authentication is enabled/updated"""
    # Assuming you now have a boolean field 'biometric_enabled' in your User model
    if update_fields and 'biometric_enabled' in update_fields:
        if instance.biometric_enabled:
            notifier = NotificationService()
            notifier.send_push_notification(
                instance,
                "Biometric Security Enabled",
                "You have successfully enabled Face Login for your Academe account.",
                {'type': 'security_update'}
            )