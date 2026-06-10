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

# Conditional import for PostgreSQL trigram support (optional - only for fuzzy matching)
try:
    from django.contrib.postgres.search import TrigramSimilarity
    HAS_POSTGRES = True
except ImportError:
    HAS_POSTGRES = False

logger = logging.getLogger(__name__)


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
        
        # Step 4: Trigram similarity search (PostgreSQL only - optional)
        if HAS_POSTGRES:
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
            # Fallback for SQLite: simple icontains (less accurate but works)
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
        
        Args:
            address: Address to geocode
            cache_key: Redis cache key for storing result
            
        Returns:
            Tuple of (latitude, longitude) or None
        """
        from apps.geoservice.models import GeocodingCache
        
        # Non-blocking rate limit check using Redis
        rate_key = "nominatim_rate_limit_global"
        last_call = cache.get(rate_key)
        now = time.time()
        
        if last_call and (now - last_call) < self._nominatim_min_interval:
            logger.warning(f"Nominatim rate limit hit for address: {address} - rejecting request")
            return None  # Caller should return 429
        
        # Update rate limit counter (non-blocking)
        cache.set(rate_key, now, timeout=1)
        
        try:
            location = self.geolocator.geocode(address, timeout=10)
            if location:
                coords = (location.latitude, location.longitude)
                logger.info(f"Geocoding via Nominatim succeeded: {address} -> ({location.latitude}, {location.longitude})")
                
                # Store in Redis cache
                cache.set(cache_key, coords, self.cache_timeout)
                
                # Store in DB for audit trail
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
        """
        Cache geocoding result in both Redis and DB.
        
        Args:
            address: Original address string
            lat: Latitude
            lon: Longitude
            source: Source of the geocoding ('venue_db', 'venue_db_fuzzy', etc.)
            cache_key: Redis cache key
        """
        from apps.geoservice.models import GeocodingCache
        
        # Store in Redis (fast cache)
        cache.set(cache_key, (lat, lon), self.cache_timeout)
        
        # Store in DB for audit trail (idempotent)
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
        """
        Legacy method - now uses database-first approach.
        Kept for backward compatibility with existing code.
        """
        return self.geocode_address_db_first(address)
    
    def reverse_geocode(self, lat: float, lon: float) -> Optional[str]:
        """
        Convert GPS coordinates to a human-readable address.
        Uses Nominatim with rate limiting.
        
        Args:
            lat: Latitude
            lon: Longitude
            
        Returns:
            Address string or None if reverse geocoding fails
        """
        cache_key = f"revgeo:{hashlib.md5(f'{lat:.4f}:{lon:.4f}'.encode()).hexdigest()}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        # Non-blocking rate limit check
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
                logger.debug(f"Reverse geocoding succeeded: ({lat}, {lon}) -> {address[:50]}...")
                return address
            else:
                logger.warning(f"Reverse geocoding returned no results for ({lat}, {lon})")
                return None
        except GeocoderTimedOut as e:
            logger.error(f"Reverse geocoding timeout for ({lat}, {lon}): {e}")
            return None
        except GeocoderServiceError as e:
            logger.error(f"Reverse geocoding service error for ({lat}, {lon}): {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error during reverse geocoding for ({lat}, {lon}): {e}")
            return None
    
    # ============================================
    # DISTANCE CALCULATIONS - BACKEND ONLY
    # ============================================
    
    @staticmethod
    def calculate_distance(
        lat1: float, lon1: float,
        lat2: float, lon2: float
    ) -> float:
        """
        Calculate geodesic distance in meters using WGS-84 ellipsoid.
        This is the SOURCE OF TRUTH for attendance verification.
        
        Args:
            lat1, lon1: First point coordinates
            lat2, lon2: Second point coordinates
            
        Returns:
            Distance in meters (float)
        """
        point1 = (float(lat1), float(lon1))
        point2 = (float(lat2), float(lon2))
        return geodesic(point1, point2).meters
    
    @staticmethod
    def is_within_radius(
        student_lat: float, student_lon: float,
        venue_lat: float, venue_lon: float,
        radius_meters: int = 100
    ) -> Tuple[bool, float]:
        """
        Check if a student's location is within the allowed attendance radius.
        
        Args:
            student_lat, student_lon: Student's GPS coordinates
            venue_lat, venue_lon: Venue coordinates
            radius_meters: Allowed radius in meters
            
        Returns:
            Tuple of (is_within: bool, distance_meters: float)
        """
        distance = LocationService.calculate_distance(
            student_lat, student_lon,
            venue_lat, venue_lon
        )
        return distance <= radius_meters, distance
    
    @staticmethod
    def format_distance(distance_meters: float) -> str:
        """
        Convert distance in meters to a human-readable string.
        
        Args:
            distance_meters: Distance in meters
            
        Returns:
            Formatted string (e.g., "50 meters", "1.2 km")
        """
        if distance_meters < 1:
            return "Less than 1 meter"
        elif distance_meters < 1000:
            return f"{distance_meters:.0f} meters"
        else:
            return f"{distance_meters / 1000:.1f} km"
    
    @staticmethod
    def get_walking_time_minutes(distance_meters: float) -> int:
        """
        Estimate walking time assuming average walking speed of 80 m/min (4.8 km/h).
        
        Args:
            distance_meters: Distance in meters
            
        Returns:
            Estimated walking time in minutes (minimum 1 minute)
        """
        if distance_meters <= 0:
            return 1
        return max(1, round(distance_meters / 80))
    
    # ============================================
    # SPATIAL VENUE SEARCH (Bounding box - No PostGIS required)
    # ============================================
    
    def find_nearest_venues_spatial(
        self, lat: float, lon: float,
        institution: str = None,
        limit: int = 10,
        max_distance_meters: float = 1000
    ) -> List[Dict]:
        """
        Find nearest venues using bounding-box pre-filter (no PostGIS required).
        
        This method:
        1. Filters venues by a bounding box based on max_distance
        2. Calculates exact distances in Python (on reduced candidate set)
        3. Returns venues sorted by distance
        
        Performance: O(N) where N is venues in bounding box (not all venues)
        
        Args:
            lat: Current latitude
            lon: Current longitude
            institution: Optional institution filter
            limit: Maximum number of venues to return
            max_distance_meters: Maximum search radius in meters
            
        Returns:
            List of venue dicts with distance information
        """
        from apps.geoservice.models import CampusVenue
        
        # Convert meters to approximate degrees
        # 1 degree latitude ≈ 111 km
        lat_range = max_distance_meters / 111000
        # Longitude range depends on latitude (converges at poles)
        lon_range = max_distance_meters / (111000 * max(abs(lat), 0.01))
        
        # Build initial query with bounding box filter
        qs = CampusVenue.objects.filter(
            is_active=True,
            latitude__isnull=False,
            longitude__isnull=False,
            latitude__gte=lat - lat_range,
            latitude__lte=lat + lat_range,
            longitude__gte=lon - lon_range,
            longitude__lte=lon + lon_range
        )
        
        # Apply institution filter if provided
        if institution:
            qs = qs.filter(institution=institution)
        
        # Calculate exact distances in Python (on reduced candidate set)
        venues_with_distance = []
        for venue in qs:
            distance = self.calculate_distance(
                lat, lon,
                float(venue.latitude), float(venue.longitude)
            )
            
            # Only include venues within max distance
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
        
        # Sort by distance and limit results
        venues_with_distance.sort(key=lambda x: x['distance_meters'])
        return venues_with_distance[:limit]
    
    def find_nearest_venues(
        self, lat: float, lon: float, 
        institution: str = None, 
        limit: int = 5
    ) -> List[Dict]:
        """
        Legacy method wrapper for find_nearest_venues_spatial.
        Kept for backward compatibility.
        
        Args:
            lat: Current latitude
            lon: Current longitude
            institution: Optional institution filter
            limit: Maximum number of venues to return
            
        Returns:
            List of venue dicts with distance information
        """
        return self.find_nearest_venues_spatial(lat, lon, institution, limit)
    
    # ============================================
    # VENUE COORDINATES LOOKUP
    # ============================================
    
    def get_venue_coordinates(self, timetable_entry) -> Optional[Tuple[float, float]]:
        """
        Get GPS coordinates for a timetable entry's venue.
        Uses DB-first geocoding with fallback.
        
        Priority:
        1. Direct coordinates on the timetable entry
        2. CampusVenue database lookup
        3. Geocoding (DB-first with Nominatim fallback)
        
        Args:
            timetable_entry: TimetableEntry model instance
            
        Returns:
            Tuple of (latitude, longitude) or None
        """
        from apps.geoservice.models import CampusVenue
        
        # Priority 1: Direct coordinates on the entry
        if hasattr(timetable_entry, 'latitude') and timetable_entry.latitude:
            if timetable_entry.longitude:
                logger.debug(f"Using direct coordinates for venue: {timetable_entry.venue}")
                return (float(timetable_entry.latitude), float(timetable_entry.longitude))
        
        # Priority 2: CampusVenue database lookup
        venue = CampusVenue.objects.filter(
            name__iexact=timetable_entry.venue,
            is_active=True
        ).first()
        
        if venue and venue.coordinates:
            logger.debug(f"Found venue in CampusVenue DB: {timetable_entry.venue}")
            return venue.coordinates
        
        # Priority 3: Geocode (DB-first with Nominatim fallback)
        if hasattr(timetable_entry, 'class_group') and timetable_entry.class_group:
            address = f"{timetable_entry.venue}, {timetable_entry.class_group.institution}"
        else:
            address = timetable_entry.venue
        
        logger.debug(f"Geocoding venue address: {address}")
        return self.geocode_address_db_first(address)
    
    # ============================================
    # DIRECTIONS URL GENERATION
    # ============================================
    
    def get_directions_url(
        self,
        origin_lat: float, origin_lon: float,
        dest_lat: float, dest_lon: float,
        travel_mode: str = 'walking'
    ) -> str:
        """
        Generate a Google Maps directions URL.
        
        Args:
            origin_lat: Origin latitude
            origin_lon: Origin longitude
            dest_lat: Destination latitude
            dest_lon: Destination longitude
            travel_mode: Travel mode (walking, driving, bicycling, transit)
            
        Returns:
            Google Maps directions URL
        """
        return (
            f"https://www.google.com/maps/dir/?api=1"
            f"&origin={origin_lat},{origin_lon}"
            f"&destination={dest_lat},{dest_lon}"
            f"&travelmode={travel_mode}"
        )


# Import timezone for cache updates
from django.utils import timezone