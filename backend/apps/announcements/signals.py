from django.db.models.signals import post_save, post_delete, m2m_changed
from django.dispatch import receiver
from .models import Announcement
from .services import AnnouncementService

@receiver(post_save, sender=Announcement)
@receiver(post_delete, sender=Announcement)
def handle_announcement_crud(sender, instance, **kwargs):
    """Invalidate feeds when an announcement is created, updated, or deleted."""
    AnnouncementService.invalidate_feed_caches()

@receiver(m2m_changed, sender=Announcement.target_classes.through)
def handle_announcement_m2m(sender, instance, action, **kwargs):
    """Invalidate feeds AFTER target classes are fully attached/removed."""
    if action in ["post_add", "post_remove", "post_clear"]:
        AnnouncementService.invalidate_feed_caches()