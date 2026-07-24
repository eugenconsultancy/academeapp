# backend/apps/geoservice/tasks.py
"""
Celery tasks for GeoService - production-ready async geocoding.
Replaces unreliable threading with persistent task queue.

PHASE 3 FIXES:
- Retries only on transient errors (timeout, service error).
- Permanent failures (address not found, missing address) are logged and stop.
- Concurrency lock released on completion/failure.
- Periodic cleanup task for StudentLocationHistory (privacy compliance).
"""
import logging
from celery import shared_task
from django.core.cache import cache
from django.utils import timezone
from geopy.exc import GeocoderTimedOut, GeocoderServiceError

from .models import CampusVenue
from .services import LocationService

logger = logging.getLogger(__name__)


def _release_geocode_lock(venue_id: int):
    """Release the concurrency lock for a venue."""
    cache.delete(f"geocode_lock_{venue_id}")


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def geocode_venue_task(self, venue_id):
    """
    Celery task to geocode a venue asynchronously.

    Features:
    - Idempotent – safe to run multiple times.
    - Uses database-first geocoding (Redis cache -> DB cache -> Nominatim).
    - Updates via .update() to avoid recursive signals.
    - Retries only on transient failures (timeout, service error).
    - Permanent failures (address not found, missing address) are logged and stop.
    - Releases concurrency lock on exit.
    """
    lock_key = f"geocode_lock_{venue_id}"

    try:
        venue = CampusVenue.objects.get(pk=venue_id)
    except CampusVenue.DoesNotExist:
        logger.error(f"Venue {venue_id} does not exist – aborting geocoding")
        _release_geocode_lock(venue_id)
        return

    # Already has coordinates – nothing to do
    if venue.latitude and venue.longitude:
        logger.info(f"Venue {venue.name} already has coordinates – skipping")
        _release_geocode_lock(venue_id)
        return

    address = venue.full_address or f"{venue.name}, {venue.institution}"
    if not address or not address.strip():
        logger.warning(f"Venue {venue.name} has no address – cannot geocode")
        cache.set(
            f"geocode_failed_{venue_id}",
            {
                'error': 'No address provided',
                'address': address,
                'failed_at': timezone.now().isoformat(),
                'attempts': self.request.retries + 1
            },
            timeout=86400
        )
        _release_geocode_lock(venue_id)
        return

    service = LocationService()

    try:
        coords = service.geocode_address_db_first(address)

        if coords:
            # Use update() to avoid triggering the post_save signal recursively
            CampusVenue.objects.filter(pk=venue_id).update(
                latitude=coords[0],
                longitude=coords[1]
            )
            logger.info(f"Async geocoding succeeded for venue {venue.name}: {coords}")

            # Clear failure/pending caches
            cache.delete(f"geocode_failed_{venue_id}")
            cache.delete(f"geocode_pending_{venue_id}")
            _release_geocode_lock(venue_id)
            return

        # Address not found – permanent failure, do NOT retry
        logger.warning(f"Geocoding returned no results for '{address}' – not retrying")
        cache.set(
            f"geocode_failed_{venue_id}",
            {
                'error': 'Address not found',
                'address': address,
                'failed_at': timezone.now().isoformat(),
                'attempts': self.request.retries + 1
            },
            timeout=86400
        )
        _release_geocode_lock(venue_id)
        return

    except (GeocoderTimedOut, GeocoderServiceError) as e:
        # Transient failure – retry
        logger.warning(f"Transient geocoding error for {venue.name}: {e}. Retrying...")
        # Store failure info for admin visibility
        cache.set(
            f"geocode_failed_{venue_id}",
            {
                'error': str(e),
                'address': address,
                'failed_at': timezone.now().isoformat(),
                'attempts': self.request.retries + 1
            },
            timeout=86400
        )
        _release_geocode_lock(venue_id)  # Release lock before retry, so it can be re-acquired
        raise self.retry(exc=e)

    except Exception as e:
        # Unexpected permanent failure – log and stop
        logger.error(f"Permanent geocoding failure for {venue.name}: {e}")
        cache.set(
            f"geocode_failed_{venue_id}",
            {
                'error': str(e),
                'address': address,
                'failed_at': timezone.now().isoformat(),
                'attempts': self.request.retries + 1
            },
            timeout=86400
        )
        _release_geocode_lock(venue_id)
        return  # Do not retry


@shared_task
def batch_geocode_venues(venue_ids):
    """
    Batch geocode multiple venues.
    Useful for admin bulk operations.
    """
    results = {'success': 0, 'failed': 0, 'skipped': 0}

    for venue_id in venue_ids:
        try:
            venue = CampusVenue.objects.get(pk=venue_id)
            if venue.latitude and venue.longitude:
                results['skipped'] += 1
            else:
                geocode_venue_task.delay(venue_id)
                results['success'] += 1
        except CampusVenue.DoesNotExist:
            results['failed'] += 1
            logger.warning(f"Venue {venue_id} not found in batch geocoding")

    logger.info(f"Batch geocoding complete: {results}")
    return results


# ── Privacy Compliance: Periodic Cleanup ────────────────────────────────
@shared_task
def cleanup_old_location_history(days: int = 30):
    """
    Delete StudentLocationHistory records older than `days` days.
    Scheduled via Celery Beat (see celery.py) for GDPR/Data Protection compliance.
    """
    from .models import StudentLocationHistory
    from datetime import timedelta

    cutoff = timezone.now() - timedelta(days=days)
    deleted, _ = StudentLocationHistory.objects.filter(created_at__lt=cutoff).delete()
    logger.info(f"Cleaned up {deleted} StudentLocationHistory records older than {days} days.")
    return f"Deleted {deleted} records"