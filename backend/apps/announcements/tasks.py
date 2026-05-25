from celery import shared_task
from django.utils import timezone
from .models import Announcement
from .services import AnnouncementService
import logging

logger = logging.getLogger(__name__)

@shared_task
def delete_expired_announcements():
    """Hard delete expired announcements and clear stale caches."""
    now = timezone.now()
    expired = Announcement.objects.filter(expires_at__lt=now)
    count = expired.count()

    if count > 0:
        expired.delete()
        # Invalidate caches to prevent ghost announcements appearing in feeds
        AnnouncementService.invalidate_feed_caches()
        logger.info(f"Deleted {count} expired announcements and invalidated feed caches.")
    else:
        logger.info("No expired announcements found to delete.")