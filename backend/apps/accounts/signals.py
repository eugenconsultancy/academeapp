from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User
from common.notifications import NotificationService

@receiver(post_save, sender=User)
def user_created(sender, instance, created, **kwargs):
    """Handle new user creation events"""
    if created:
        # Welcome notification
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