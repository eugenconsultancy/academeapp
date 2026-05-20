from celery import shared_task
from django.utils import timezone
from .models import Announcement
import logging

logger = logging.getLogger(__name__)

@shared_task
def delete_expired_announcements():
    """Hard delete expired announcements"""
    expired = Announcement.objects.filter(expires_at__lt=timezone.now())
    count = expired.count()
    expired.delete()
    logger.info(f"Deleted {count} expired announcements")