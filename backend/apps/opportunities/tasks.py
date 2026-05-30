from celery import shared_task
from django.utils import timezone
from .models import Opportunity
import logging

logger = logging.getLogger(__name__)

@shared_task
def delete_expired_opportunities():
    """Delete expired opportunities"""
    expired = Opportunity.objects.filter(
        expires_at__lt=timezone.now(),
        is_active=True
    )
    
    # Maurk as inactive instead of deleting
    count = expired.update(is_active=False)
    logger.info(f"Deactivated {count} expired opportunities")