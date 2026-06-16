# apps/opportunities/tasks.py
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Opportunity, ScholarshipReview
from common.constants import ScholarshipReviewStatus
import logging

logger = logging.getLogger(__name__)


@shared_task
def delete_expired_opportunities():
    """Deactivate expired opportunities"""
    expired = Opportunity.objects.filter(
        expires_at__lt=timezone.now(),
        is_active=True
    )
    count = expired.update(is_active=False)
    logger.info(f"Deactivated {count} expired opportunities")


@shared_task
def check_scholarship_review_slas():
    """
    Flag reviews that have been paid but not reviewed within 48 hours.
    """
    cutoff = timezone.now() - timedelta(hours=48)
    overdue = ScholarshipReview.objects.filter(
        status=ScholarshipReviewStatus.PAID.value,
        reviewed_at__isnull=True,
        created_at__lt=cutoff
    )
    count = overdue.count()
    if count > 0:
        logger.warning(
            f"{count} scholarship review(s) have been paid for more than 48 hours without review."
        )
    else:
        logger.info("All paid scholarship reviews are within SLA.")