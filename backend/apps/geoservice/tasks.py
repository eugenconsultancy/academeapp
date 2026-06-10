# backend/apps/geoservice/tasks.py
"""
Celery tasks for GeoService - production-ready async geocoding.
Replaces unreliable threading with persistent task queue.
"""
import logging
from celery import shared_task
from django.core.cache import cache
from django.utils import timezone

from .models import CampusVenue
from .services import LocationService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def geocode_venue_task(self, venue_id):
    """
    Celery task to geocode a venue asynchronously.
    
    Features:
    - Automatic retries on failure (3 retries, 60s delay)
    - Idempotent: safe to run multiple times
    - Uses database-first geocoding (CampusVenue -> Nominatim)
    - Updates via .update() to avoid recursive signals
    - Caches failure status for admin visibility
    """
    try:
        venue = CampusVenue.objects.get(pk=venue_id)
    except CampusVenue.DoesNotExist:
        logger.error(f"Venue {venue_id} does not exist - aborting geocoding")
        return
    
    # Skip if already has coordinates
    if venue.latitude and venue.longitude:
        logger.info(f"Venue {venue.name} already has coordinates - skipping")
        return
    
    address = venue.full_address or f"{venue.name}, {venue.institution}"
    
    if not address or not address.strip():
        logger.warning(f"Venue {venue.name} has no address - cannot geocode")
        cache.set(
            f"geocode_failed_{venue_id}",
            {
                'error': 'No address provided',
                'address': address,
                'failed_at': timezone.now().isoformat(),
                'attempts': self.request.retries + 1
            },
            timeout=86400  # 24 hours
        )
        return
    
    service = LocationService()
    
    try:
        # Use database-first geocoding (Redis cache -> DB cache -> Nominatim)
        coords = service.geocode_address_db_first(address)
        
        if coords:
            # Use update() to avoid triggering post_save signal recursively
            CampusVenue.objects.filter(pk=venue_id).update(
                latitude=coords[0],
                longitude=coords[1]
            )
            logger.info(f"Async geocoding succeeded for venue {venue.name}: {coords}")
            
            # Clear failure cache if exists
            cache.delete(f"geocode_failed_{venue_id}")
            cache.delete(f"geocode_pending_{venue_id}")
        else:
            # Geocoding returned None - likely rate limited or address not found
            logger.warning(f"Async geocoding returned None for venue {venue.name}")
            raise Exception(f"Geocoding failed for address: {address}")
            
    except Exception as e:
        logger.error(f"Async geocoding error for venue {venue.name}: {e}")
        
        # Store failure info in cache for admin visibility
        cache.set(
            f"geocode_failed_{venue_id}",
            {
                'error': str(e),
                'address': address,
                'failed_at': timezone.now().isoformat(),
                'attempts': self.request.retries + 1
            },
            timeout=86400  # 24 hours
        )
        
        # Retry with exponential backoff (retry delays handled by Celery)
        raise self.retry(exc=e)


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