# backend/apps/geoservice/services/geolocation.py
"""
Core GeoLocation Service - No GDAL/PostGIS required.
Uses bounding-box fallback for all spatial queries.
Database-first geocoding with Redis caching and Nominatim fallback.

Phase 3 improvements:
- Coordinate precision capped to 6 decimal places (matches DB schema)
- Source tagging enforced for all geocoding results
- Safe database engine detection using connection.vendor
- All external API responses are normalized before caching
"""
from typing import Tuple, Optional, List, Dict
from geopy.distance import geodesic
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
from django.core.cache import cache
from django.conf import settings
from django.db import connection
from django.db.models import Q
import hashlib
import logging
import time

# Conditional import for PostgreSQL trigram support (only used when DB engine is PostgreSQL)
try:
    from django.contrib.postgres.search import TrigramSimilarity
    POSTGRES_MODULE_AVAILABLE = True
except ImportError:
    POSTGRES_MODULE_AVAILABLE = False

from django.utils import timezone

logger = logging.getLogger(__name__)

# Consistent precision: 6 decimal places ~ 0.111 m at the equator
COORD_PRECISION = 6


def _is_postgresql():
    """Return True if the default database engine is PostgreSQL."""
    return connection.vendor == 'postgresql'


def _normalize_coords(lat: float, lon: float) -> Tuple[float, float]:
    """Round coordinates to match DecimalField(max_digits=9, decimal_places=6)."""
    return round(lat, COORD_PRECISION), round(lon, COORD_PRECISION)


class LocationService:
    """
    Core location service with database-first geocoding strategy.
    No PostGIS required - uses bounding-box filtering for spatial queries.
    """

    def __init__(self):
        user_agent = getattr(
            settings,
            'NOMINATIM_USER_AGENT',
            "AcademeApp (support@academe.edu, https://academe.edu)"
        )
        self.geolocator = Nominatim(user_agent=user_agent)
        self.cache_timeout = 86400 * 30  # 30 days
        self._nominatim_min_interval = 1.0  # seconds between calls (Nominatim ToS)

    # ============================================
    # DATABASE-FIRST GEOCODING
    # ============================================

    def geocode_address_db_first(self, address: str) -> Optional[Tuple[float, float]]:
        """
        Convert address to coordinates - Redis first, DB second, Nominatim fallback.
        Priority:
        1. Redis cache
        2. GeocodingCache DB
        3. Exact match in CampusVenue DB
        4. Trigram similarity (PostgreSQL) or icontains (SQLite)
        5. Nominatim external API (rate-limited)
        6. Return None if all fail
        All coordinates are normalized to 6 decimal places.
        """
        from apps.geoservice.models import CampusVenue, GeocodingCache

        if not address or not address.strip():
            logger.debug("Empty address provided to geocoder")
            return None

        address_clean = address.strip()
        cache_key = f"geocode:{hashlib.md5(address_clean.lower().encode()).hexdigest()}"

        # Step 1: Redis cache
        cached_coords = cache.get(cache_key)
        if cached_coords:
            logger.debug(f"Geocoding cache hit (Redis): {address_clean}")
            return _normalize_coords(*cached_coords)

        # Step 2: GeocodingCache DB
        cached = GeocodingCache.objects.filter(address__iexact=address_clean).first()
        if cached:
            logger.debug(f"Geocoding cache hit (DB): {address_clean}")
            cached.hit_count += 1
            cached.last_accessed = timezone.now()
            cached.save(update_fields=['hit_count', 'last_accessed'])
            coords = _normalize_coords(float(cached.latitude), float(cached.longitude))
            cache.set(cache_key, coords, self.cache_timeout)
            return coords

        # Step 3: CampusVenue DB exact match
        venue = CampusVenue.objects.filter(
            Q(name__iexact=address_clean) |
            Q(full_address__iexact=address_clean) |
            Q(building_code__iexact=address_clean),
            is_active=True,
            latitude__isnull=False,
            longitude__isnull=False
        ).first()

        if venue:
            logger.debug(f"Geocoding hit (CampusVenue exact): {address_clean} -> {venue.name}")
            coords = _normalize_coords(float(venue.latitude), float(venue.longitude))
            self._cache_geocoding_result(address_clean, *coords, 'venue_db', cache_key)
            return coords

        # Step 4: Fuzzy search
        use_postgres = _is_postgresql() and POSTGRES_MODULE_AVAILABLE
        if use_postgres:
            venues = CampusVenue.objects.filter(
                is_active=True,
                latitude__isnull=False,
                longitude__isnull=False
            ).annotate(
                similarity=TrigramSimilarity('name', address_clean)
            ).filter(similarity__gt=0.3).order_by('-similarity')[:3]

            if venues.exists():
                venue = venues.first()
                logger.debug(f"Geocoding hit (CampusVenue trigram): {address_clean} (similarity: {venue.similarity:.2f})")
                coords = _normalize_coords(float(venue.latitude), float(venue.longitude))
                self._cache_geocoding_result(address_clean, *coords, 'venue_db_fuzzy', cache_key)
                return coords
        else:
            # SQLite fallback
            venues = CampusVenue.objects.filter(
                name__icontains=address_clean,
                is_active=True,
                latitude__isnull=False,
                longitude__isnull=False
            )[:5]
            if venues.exists():
                venue = venues.first()
                logger.debug(f"Geocoding hit (CampusVenue icontains): {address_clean} -> {venue.name}")
                coords = _normalize_coords(float(venue.latitude), float(venue.longitude))
                self._cache_geocoding_result(address_clean, *coords, 'venue_db_fuzzy', cache_key)
                return coords

        # Step 5: Nominatim fallback
        logger.info(f"No local match found for '{address_clean}', trying Nominatim")
        return self._geocode_nominatim_fallback(address_clean, cache_key)

    def _geocode_nominatim_fallback(self, address: str, cache_key: str) -> Optional[Tuple[float, float]]:
        """Nominatim with rate limiting, precision normalization, and source tagging."""
        from apps.geoservice.models import GeocodingCache

        rate_key = "nominatim_rate_limit_global"
        last_call = cache.get(rate_key)
        now = time.time()
        if last_call and (now - last_call) < self._nominatim_min_interval:
            logger.warning(f"Nominatim rate limit hit for address: {address} - rejecting request")
            return None
        cache.set(rate_key, now, timeout=1)

        try:
            location = self.geolocator.geocode(address, timeout=10)
            if location:
                # Normalize before storing
                lat, lon = _normalize_coords(location.latitude, location.longitude)
                logger.info(f"Geocoding via Nominatim succeeded: {address} -> ({lat}, {lon})")

                cache.set(cache_key, (lat, lon), self.cache_timeout)

                GeocodingCache.objects.get_or_create(
                    address=address,
                    defaults={
                        'latitude': lat,
                        'longitude': lon,
                        'source': 'nominatim'
                    }
                )
                return (lat, lon)
            else:
                logger.warning(f"Nominatim returned no results for address: {address}")
                return None
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            logger.error(f"Transient geocoding error for '{address}': {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error during geocoding for '{address}': {e}")
            return None

    def _cache_geocoding_result(self, address: str, lat: float, lon: float,
                                 source: str, cache_key: str):
        """Cache normalized result in Redis and DB with source tag."""
        from apps.geoservice.models import GeocodingCache

        cache.set(cache_key, (lat, lon), self.cache_timeout)
        GeocodingCache.objects.get_or_create(
            address=address,
            defaults={
                'latitude': lat,
                'longitude': lon,
                'source': source
            }
        )

    # ============================================
    # LEGACY WRAPPER
    # ============================================
    def geocode_address(self, address: str) -> Optional[Tuple[float, float]]:
        return self.geocode_address_db_first(address)

    # ============================================
    # REVERSE GEOCODING (unchanged except normalization)
    # ============================================
    def reverse_geocode(self, lat: float, lon: float) -> Optional[str]:
        """Convert coordinates to address (rate-limited)."""
        cache_key = f"revgeo:{hashlib.md5(f'{lat:.4f}:{lon:.4f}'.encode()).hexdigest()}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        rate_key = "nominatim_reverse_rate_limit"
        last_call = cache.get(rate_key)
        now = time.time()
        if last_call and (now - last_call) < self._nominatim_min_interval:
            logger.warning("Nominatim reverse geocoding rate limit hit")
            return None
        cache.set(rate_key, now, timeout=1)

        try:
            location = self.geolocator.reverse((lat, lon), timeout=10)
            if location:
                address = location.address
                cache.set(cache_key, address, self.cache_timeout)
                return address
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            logger.error(f"Reverse geocoding error: {e}")
        except Exception as e:
            logger.error(f"Unexpected reverse geocoding error: {e}")
        return None

    # ============================================
    # DISTANCE CALCULATIONS (uses WGS‑84 geodesic)
    # ============================================
    @staticmethod
    def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Geodesic distance in meters (WGS-84 ellipsoid, far more accurate than Haversine)."""
        return geodesic((float(lat1), float(lon1)), (float(lat2), float(lon2))).meters

    @staticmethod
    def is_within_radius(student_lat, student_lon, venue_lat, venue_lon, radius_meters=100):
        distance = LocationService.calculate_distance(student_lat, student_lon, venue_lat, venue_lon)
        return distance <= radius_meters, distance

    @staticmethod
    def format_distance(distance_meters: float) -> str:
        if distance_meters < 1:
            return "Less than 1 meter"
        elif distance_meters < 1000:
            return f"{distance_meters:.0f} meters"
        return f"{distance_meters / 1000:.1f} km"

    @staticmethod
    def get_walking_time_minutes(distance_meters: float) -> int:
        return max(1, round(distance_meters / 80)) if distance_meters > 0 else 1

    # ============================================
    # SPATIAL VENUE SEARCH (bounding box, no PostGIS)
    # ============================================
    def find_nearest_venues_spatial(self, lat: float, lon: float,
                                    institution: str = None,
                                    limit: int = 10,
                                    max_distance_meters: float = 1000) -> List[Dict]:
        from apps.geoservice.models import CampusVenue

        lat_range = max_distance_meters / 111000
        lon_range = max_distance_meters / (111000 * max(abs(lat), 0.01))

        qs = CampusVenue.objects.filter(
            is_active=True,
            latitude__isnull=False,
            longitude__isnull=False,
            latitude__gte=lat - lat_range,
            latitude__lte=lat + lat_range,
            longitude__gte=lon - lon_range,
            longitude__lte=lon + lon_range
        )
        if institution:
            qs = qs.filter(institution=institution)

        venues_with_distance = []
        for venue in qs:
            distance = self.calculate_distance(lat, lon, float(venue.latitude), float(venue.longitude))
            if distance <= max_distance_meters:
                venues_with_distance.append({
                    'id': str(venue.id),
                    'name': venue.name,
                    'building_code': venue.building_code or '',
                    'floor': venue.floor,
                    'room_number': venue.room_number or '',
                    'venue_type': venue.venue_type,
                    'latitude': float(venue.latitude),
                    'longitude': float(venue.longitude),
                    'distance_meters': round(distance, 1),
                    'distance_display': self.format_distance(distance),
                    'walking_time_minutes': self.get_walking_time_minutes(distance),
                })

        venues_with_distance.sort(key=lambda x: x['distance_meters'])
        return venues_with_distance[:limit]

    def find_nearest_venues(self, lat: float, lon: float, institution: str = None, limit: int = 5) -> List[Dict]:
        return self.find_nearest_venues_spatial(lat, lon, institution, limit)

    # ============================================
    # VENUE COORDINATES LOOKUP (uses TimetableEntry's own coords if present)
    # ============================================
    def get_venue_coordinates(self, timetable_entry) -> Optional[Tuple[float, float]]:
        from apps.geoservice.models import CampusVenue

        # 1. Direct coordinates on the timetable entry (source of truth if set)
        if hasattr(timetable_entry, 'latitude') and timetable_entry.latitude and timetable_entry.longitude:
            return _normalize_coords(float(timetable_entry.latitude), float(timetable_entry.longitude))

        # 2. CampusVenue lookup by name
        venue = CampusVenue.objects.filter(name__iexact=timetable_entry.venue, is_active=True).first()
        if venue and venue.latitude and venue.longitude:
            return _normalize_coords(float(venue.latitude), float(venue.longitude))

        # 3. Fallback geocoding
        address = timetable_entry.venue
        if hasattr(timetable_entry, 'class_group') and timetable_entry.class_group:
            address = f"{timetable_entry.venue}, {timetable_entry.class_group.institution}"
        return self.geocode_address_db_first(address)

    # ============================================
    # DIRECTIONS URL GENERATION
    # ============================================
    def get_directions_url(self, origin_lat, origin_lon, dest_lat, dest_lon, travel_mode='walking') -> str:
        return (
            f"https://www.google.com/maps/dir/?api=1"
            f"&origin={origin_lat},{origin_lon}"
            f"&destination={dest_lat},{dest_lon}"
            f"&travelmode={travel_mode}"
        )