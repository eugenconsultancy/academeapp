# backend/apps/geoservice/services/geolocation.py
"""
Core GeoLocation Service - No GDAL/PostGIS required.
Uses bounding-box fallback for all spatial queries.
Database-first geocoding with Redis caching and Nominatim fallback.
"""
from typing import Tuple, Optional, List, Dict
from geopy.distance import geodesic
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
from django.core.cache import cache
from django.conf import settings
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


def _is_postgresql():
    """Return True if the default database engine is PostgreSQL."""
    engine = settings.DATABASES['default']['ENGINE']
    return 'postgresql' in engine or 'postgis' in engine


class LocationService:
    """
    Core location service with database-first geocoding strategy.
    No PostGIS required - uses bounding-box filtering for spatial queries.
    
    Features:
    - Database-first geocoding (Redis cache -> DB cache -> CampusVenue -> Nominatim)
    - Non-blocking rate limiting for Nominatim
    - Bounding-box spatial queries (no PostGIS dependency)
    - Walking time estimation
    - Google Maps directions URL generation
    """
    
    def __init__(self):
        # Nominatim requires a valid User-Agent with contact info
        user_agent = getattr(
            settings, 
            'NOMINATIM_USER_AGENT', 
            "AcademeApp (support@academe.edu, https://academe.edu)"
        )
        self.geolocator = Nominatim(user_agent=user_agent)
        self.cache_timeout = 86400 * 30  # 30 days for geocoding cache
        self._nominatim_min_interval = 1.0  # seconds between calls (Nominatim ToS)
    
    # ============================================
    # DATABASE-FIRST GEOCODING
    # ============================================
    
    def geocode_address_db_first(self, address: str) -> Optional[Tuple[float, float]]:
        """
        Convert address to coordinates - Redis first, DB second, Nominatim fallback.
        
        Priority:
        1. Redis cache (fastest, TTL-based)
        2. GeocodingCache DB (audit/history)
        3. Exact match in CampusVenue DB
        4. Trigram similarity search (PostgreSQL only, optional)
        5. Nominatim external API (non-blocking rate-limited)
        6. Return None if all fail
        
        Args:
            address: Human-readable address string
            
        Returns:
            Tuple of (latitude, longitude) or None if geocoding fails
        """
        from apps.geoservice.models import CampusVenue, GeocodingCache
        
        if not address or not address.strip():
            logger.debug("Empty address provided to geocoder")
            return None
        
        address_clean = address.strip()
        cache_key = f"geocode:{hashlib.md5(address_clean.lower().encode()).hexdigest()}"
        
        # Step 1: Check Redis cache (primary, fastest)
        cached_coords = cache.get(cache_key)
        if cached_coords:
            logger.debug(f"Geocoding cache hit (Redis): {address_clean}")
            return cached_coords
        
        # Step 2: Check GeocodingCache DB (audit trail)
        cached = GeocodingCache.objects.filter(address__iexact=address_clean).first()
        if cached:
            logger.debug(f"Geocoding cache hit (DB): {address_clean}")
            cached.hit_count += 1
            cached.last_accessed = timezone.now()
            cached.save(update_fields=['hit_count', 'last_accessed'])
            coords = (float(cached.latitude), float(cached.longitude))
            # Store back to Redis for faster future access
            cache.set(cache_key, coords, self.cache_timeout)
            return coords
        
        # Step 3: Search CampusVenue DB (exact match)
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
            coords = (float(venue.latitude), float(venue.longitude))
            self._cache_geocoding_result(address_clean, coords[0], coords[1], 'venue_db', cache_key)
            return coords
        
        # Step 4: Fuzzy search - PostgreSQL trigram if available, otherwise SQLite icontains
        use_postgres = _is_postgresql() and POSTGRES_MODULE_AVAILABLE
        
        if use_postgres:
            # PostgreSQL trigram similarity (best fuzzy match)
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
                coords = (float(venue.latitude), float(venue.longitude))
                self._cache_geocoding_result(address_clean, coords[0], coords[1], 'venue_db_fuzzy', cache_key)
                return coords
        else:
            # SQLite (or any non-PostgreSQL) fallback: simple icontains
            venues = CampusVenue.objects.filter(
                name__icontains=address_clean,
                is_active=True,
                latitude__isnull=False,
                longitude__isnull=False
            )[:5]
            if venues.exists():
                venue = venues.first()
                logger.debug(f"Geocoding hit (CampusVenue icontains): {address_clean} -> {venue.name}")
                coords = (float(venue.latitude), float(venue.longitude))
                self._cache_geocoding_result(address_clean, coords[0], coords[1], 'venue_db_fuzzy', cache_key)
                return coords
        
        # Step 5: Nominatim fallback (external API with rate limiting)
        logger.info(f"No local match found for '{address_clean}', trying Nominatim")
        return self._geocode_nominatim_fallback(address_clean, cache_key)
    
    def _geocode_nominatim_fallback(self, address: str, cache_key: str) -> Optional[Tuple[float, float]]:
        """
        Call Nominatim with non-blocking rate limiting.
        Returns None if rate limit exceeded or geocoding fails.
        """
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
                coords = (location.latitude, location.longitude)
                logger.info(f"Geocoding via Nominatim succeeded: {address} -> ({location.latitude}, {location.longitude})")
                
                cache.set(cache_key, coords, self.cache_timeout)
                
                GeocodingCache.objects.get_or_create(
                    address=address,
                    defaults={
                        'latitude': location.latitude,
                        'longitude': location.longitude,
                        'source': 'nominatim'
                    }
                )
                return coords
            else:
                logger.warning(f"Nominatim returned no results for address: {address}")
                return None
                
        except GeocoderTimedOut as e:
            logger.error(f"Geocoding timeout for '{address}': {e}")
            return None
        except GeocoderServiceError as e:
            logger.error(f"Geocoding service error for '{address}': {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error during geocoding for '{address}': {e}")
            return None
    
    def _cache_geocoding_result(self, address: str, lat: float, lon: float, 
                                 source: str, cache_key: str):
        """Cache geocoding result in both Redis and DB."""
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
    # LEGACY METHOD (kept for backward compatibility)
    # ============================================
    
    def geocode_address(self, address: str) -> Optional[Tuple[float, float]]:
        """Legacy method - now uses database-first approach."""
        return self.geocode_address_db_first(address)
    
    def reverse_geocode(self, lat: float, lon: float) -> Optional[str]:
        """Convert GPS coordinates to a human-readable address."""
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
            else:
                return None
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            logger.error(f"Reverse geocoding error for ({lat}, {lon}): {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected reverse geocoding error: {e}")
            return None
    
    # ============================================
    # DISTANCE CALCULATIONS - BACKEND ONLY
    # ============================================
    
    @staticmethod
    def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate geodesic distance in meters using WGS-84 ellipsoid."""
        return geodesic((float(lat1), float(lon1)), (float(lat2), float(lon2))).meters
    
    @staticmethod
    def is_within_radius(student_lat, student_lon, venue_lat, venue_lon, radius_meters=100):
        """Check if a student's location is within the allowed radius."""
        distance = LocationService.calculate_distance(student_lat, student_lon, venue_lat, venue_lon)
        return distance <= radius_meters, distance
    
    @staticmethod
    def format_distance(distance_meters: float) -> str:
        """Human-readable distance."""
        if distance_meters < 1:
            return "Less than 1 meter"
        elif distance_meters < 1000:
            return f"{distance_meters:.0f} meters"
        return f"{distance_meters / 1000:.1f} km"
    
    @staticmethod
    def get_walking_time_minutes(distance_meters: float) -> int:
        """Estimate walking time (80 m/min)."""
        return max(1, round(distance_meters / 80)) if distance_meters > 0 else 1
    
    # ============================================
    # SPATIAL VENUE SEARCH (Bounding box - No PostGIS required)
    # ============================================
    
    def find_nearest_venues_spatial(self, lat: float, lon: float,
                                    institution: str = None,
                                    limit: int = 10,
                                    max_distance_meters: float = 1000) -> List[Dict]:
        """Find nearest venues using bounding-box pre-filter."""
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
        """Legacy wrapper for find_nearest_venues_spatial."""
        return self.find_nearest_venues_spatial(lat, lon, institution, limit)
    
    # ============================================
    # VENUE COORDINATES LOOKUP
    # ============================================
    
    def get_venue_coordinates(self, timetable_entry) -> Optional[Tuple[float, float]]:
        """Get GPS coordinates for a timetable entry's venue."""
        from apps.geoservice.models import CampusVenue
        
        if hasattr(timetable_entry, 'latitude') and timetable_entry.latitude and timetable_entry.longitude:
            return (float(timetable_entry.latitude), float(timetable_entry.longitude))
        
        venue = CampusVenue.objects.filter(name__iexact=timetable_entry.venue, is_active=True).first()
        if venue and venue.latitude and venue.longitude:
            return (float(venue.latitude), float(venue.longitude))
        
        address = timetable_entry.venue
        if hasattr(timetable_entry, 'class_group') and timetable_entry.class_group:
            address = f"{timetable_entry.venue}, {timetable_entry.class_group.institution}"
        return self.geocode_address_db_first(address)
    
    # ============================================
    # DIRECTIONS URL GENERATION
    # ============================================
    
    def get_directions_url(self, origin_lat, origin_lon, dest_lat, dest_lon, travel_mode='walking') -> str:
        """Generate a Google Maps directions URL."""
        return (
            f"https://www.google.com/maps/dir/?api=1"
            f"&origin={origin_lat},{origin_lon}"
            f"&destination={dest_lat},{dest_lon}"
            f"&travelmode={travel_mode}"
        )