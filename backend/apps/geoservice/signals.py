# backend/apps/geoservice/signals.py
"""
Signals for GeoService with Celery-based async geocoding.
NO threading - uses persistent task queue for reliability.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.cache import cache
import logging
from django.utils import timezone

from .models import CampusVenue
from .tasks import geocode_venue_task

logger = logging.getLogger(__name__)


@receiver(post_save, sender=CampusVenue)
def auto_geocode_venue_signal(sender, instance, created, **kwargs):
    """
    Post-save signal that triggers async geocoding via Celery.
    
    Conditions:
    - Venue has an address (full_address OR name + institution)
    - Coordinates are missing (latitude or longitude is None)
    - Not already queued recently (rate limited via cache)
    
    Uses Celery task for reliable, retryable async processing.
    """
    # Skip if coordinates already exist
    if instance.latitude and instance.longitude:
        return
    
    # Check if venue has an address to geocode
    address = instance.full_address or f"{instance.name}, {instance.institution}"
    if not address or not address.strip():
        logger.debug(f"Venue {instance.name} has no address - skipping geocoding")
        return
    
    # Rate limiting: prevent duplicate triggers for the same venue
    rate_limit_key = f"geocode_triggered_{instance.pk}"
    if cache.get(rate_limit_key):
        logger.debug(f"Geocoding for venue {instance.name} already triggered recently - skipping")
        return
    
    # Set rate limit for 60 seconds
    cache.set(rate_limit_key, True, timeout=60)
    
    # Store pending status for admin visibility
    cache.set(
        f"geocode_pending_{instance.pk}",
        {
            'triggered_at': timezone.now().isoformat(),
            'address': address,
            'triggered_by': 'post_save'
        },
        timeout=3600  # 1 hour
    )
    
    # Queue Celery task (non-blocking, survives worker restarts)
    geocode_venue_task.delay(instance.pk)
    logger.info(f"Queued Celery geocoding for venue: {instance.name}")


# Note: No pre_save validation signal - moved to model.clean()