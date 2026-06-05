from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User
from apps.notifications.services import NotificationService


@receiver(post_save, sender=User)
def user_created(sender, instance, created, **kwargs):
    """Handle new user creation events – send welcome notification."""
    if created:
        NotificationService.create_and_push(
            user=instance,
            title="Welcome to Academe!",
            message=f"Hi {instance.full_name}, welcome to the student community. Start by checking out today's classes and announcements.",
            notification_type="welcome",
            link="/",
            data={"type": "welcome"},
        )


@receiver(post_save, sender=User)
def check_badges(sender, instance, **kwargs):
    """Check and award badges on user updates."""
    from .services import AccountService
    AccountService.check_login_badges(instance)
    AccountService.check_engagement_badge(instance)


@receiver(post_save, sender=User)
def notify_biometric_enrollment(sender, instance, update_fields, **kwargs):
    """Notify the user when biometric authentication is enabled/updated."""
    if update_fields and 'biometric_enabled' in update_fields:
        if instance.biometric_enabled:
            NotificationService.create_and_push(
                user=instance,
                title="Biometric Security Enabled",
                message="You have successfully enabled Face Login for your Academe account.",
                notification_type="system",
                link="/profile/biometrics",
                data={"type": "security_update"},
            )