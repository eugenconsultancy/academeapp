# backend/apps/geoservice/signals.py
"""
Signals for GeoService with Celery-based async geocoding.
NO threading - uses persistent task queue for reliability.

PHASE 3 FIXES:
- transaction.on_commit() ensures tasks fire only after DB commit.
- Task concurrency lock prevents duplicate geocoding jobs.
- Pre-save signal invalidates Redis geocoding cache when venue coordinates change.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.core.cache import cache
from django.db import transaction
import hashlib
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
    - No active lock for this venue (concurrency guard)

    The Celery task is delayed until the database transaction commits,
    preventing the worker from seeing a stale/uncommitted record.
    """
    # Skip if coordinates already exist
    if instance.latitude and instance.longitude:
        return

    # Check if venue has an address to geocode
    address = instance.full_address or f"{instance.name}, {instance.institution}"
    if not address or not address.strip():
        logger.debug(f"Venue {instance.name} has no address - skipping geocoding")
        return

    # Rate limiting: prevent duplicate triggers for the same venue (60s window)
    rate_limit_key = f"geocode_triggered_{instance.pk}"
    if cache.get(rate_limit_key):
        logger.debug(f"Geocoding for venue {instance.name} already triggered recently - skipping")
        return

    # Concurrency lock: only one active geocoding task per venue
    lock_key = f"geocode_lock_{instance.pk}"
    if not cache.add(lock_key, True, timeout=300):  # 5-minute lock
        logger.debug(f"Geocoding lock already held for venue {instance.name} - skipping")
        return

    # Set rate limit and pending status
    cache.set(rate_limit_key, True, timeout=60)
    cache.set(
        f"geocode_pending_{instance.pk}",
        {
            'triggered_at': timezone.now().isoformat(),
            'address': address,
            'triggered_by': 'post_save'
        },
        timeout=3600
    )

    # Schedule Celery task AFTER the database transaction commits
    transaction.on_commit(lambda: geocode_venue_task.delay(instance.pk))
    logger.info(f"Queued (post-commit) Celery geocoding for venue: {instance.name}")


@receiver(pre_save, sender=CampusVenue)
def invalidate_geocode_cache_on_coord_change(sender, instance, **kwargs):
    """
    If a venue's coordinates are about to change, delete all related
    geocoding cache entries to prevent stale data being served.
    """
    if not instance.pk:
        return  # New instance – nothing to invalidate

    try:
        old = CampusVenue.objects.get(pk=instance.pk)
    except CampusVenue.DoesNotExist:
        return

    if old.latitude != instance.latitude or old.longitude != instance.longitude:
        # Build all possible address variants that might be cached
        candidates = set()
        for addr in [old.name, old.full_address, old.building_code,
                     f"{old.name}, {old.institution}"]:
            if addr and addr.strip():
                candidates.add(addr.strip().lower())

        for addr in candidates:
            key = f"geocode:{hashlib.md5(addr.encode()).hexdigest()}"
            cache.delete(key)

        logger.info(
            f"Invalidated {len(candidates)} geocoding cache entries for venue "
            f"'{instance.name}' (coordinates changed)"
        )