"""
Core GeoLocation Service using Geopy.
Handles geocoding, reverse geocoding, distance calculations,
and venue proximity searches.
"""
from geopy.distance import geodesic
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
from typing import Tuple, Optional, List, Dict
from django.core.cache import cache
import hashlib
import logging

logger = logging.getLogger(__name__)


class LocationService:
    """
    Core location service for all geospatial operations.
    
    Features:
    - Forward geocoding (address -> coordinates)
    - Reverse geocoding (coordinates -> address)
    - Distance calculation between two points
    - Proximity checking (is student within attendance radius?)
    - Nearest venue finder
    - Walking time estimation
    """
    
    def __init__(self):
        self.geolocator = Nominatim(user_agent="academe_location_service_v1")
        self.cache_timeout = 86400 * 30  # 30 days for geocoding cache
    
    # ============================================
    # GEOCODING
    # ============================================
    
    def geocode_address(self, address: str) -> Optional[Tuple[float, float]]:
        """
        Convert a human-readable address to GPS coordinates.
        
        Args:
            address: Full address string, e.g., "Lecture Hall 3, Kenyatta University"
        
        Returns:
            (latitude, longitude) tuple or None if geocoding fails
        """
        # Check database cache first
        from apps.geoservice.models import GeocodingCache
        cached = GeocodingCache.objects.filter(address__iexact=address.strip()).first()
        if cached:
            cached.hit_count += 1
            cached.save(update_fields=['hit_count', 'last_accessed'])
            return (float(cached.latitude), float(cached.longitude))
        
        # Check in-memory cache with sanitized key
        cache_key = f"geocode:{hashlib.md5(address.lower().strip().encode()).hexdigest()}"
        in_memory = cache.get(cache_key)
        if in_memory:
            return in_memory
        
        # Call external geocoder
        try:
            location = self.geolocator.geocode(address, timeout=10)
            if location:
                coords = (location.latitude, location.longitude)
                
                # Store in both caches
                cache.set(cache_key, coords, self.cache_timeout)
                GeocodingCache.objects.get_or_create(
                    address=address.strip(),
                    defaults={
                        'latitude': location.latitude,
                        'longitude': location.longitude,
                        'source': 'nominatim'
                    }
                )
                
                return coords
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            logger.error(f"Geocoding failed for '{address}': {e}")
        
        return None
    
    def reverse_geocode(self, lat: float, lon: float) -> Optional[str]:
        """
        Convert GPS coordinates to a human-readable address.
        
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
        
        try:
            location = self.geolocator.reverse((lat, lon), timeout=10)
            if location:
                cache.set(cache_key, location.address, self.cache_timeout)
                return location.address
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            logger.error(f"Reverse geocoding failed for ({lat}, {lon}): {e}")
        
        return None
    
    # ============================================
    # DISTANCE CALCULATIONS
    # ============================================
    
    @staticmethod
    def calculate_distance(
        lat1: float, lon1: float,
        lat2: float, lon2: float
    ) -> float:
        """
        Calculate the geodesic distance in meters between two GPS coordinates.
        Uses the WGS-84 ellipsoid for maximum accuracy.
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
        Returns (is_within: bool, distance_meters: float)
        """
        distance = LocationService.calculate_distance(
            student_lat, student_lon,
            venue_lat, venue_lon
        )
        return distance <= radius_meters, distance
    
    @staticmethod
    def format_distance(distance_meters: float) -> str:
        """Convert distance in meters to a human-readable string."""
        if distance_meters < 1:
            return "Less than 1 meter"
        elif distance_meters < 1000:
            return f"{distance_meters:.0f} meters"
        else:
            return f"{distance_meters / 1000:.1f} km"
    
    @staticmethod
    def get_walking_time_minutes(distance_meters: float) -> int:
        """Estimate walking time assuming 80 m/min (5 km/h)."""
        return max(1, round(distance_meters / 80))
    
    # ============================================
    # VENUE OPERATIONS
    # ============================================
    
    def get_venue_coordinates(self, timetable_entry) -> Optional[Tuple[float, float]]:
        """
        Get GPS coordinates for a timetable entry's venue.
        Priority: 1) Direct coords 2) CampusVenue DB 3) Geocoding
        """
        # Priority 1: Direct coordinates on the entry
        if hasattr(timetable_entry, 'latitude') and timetable_entry.latitude:
            if timetable_entry.longitude:
                return (float(timetable_entry.latitude), float(timetable_entry.longitude))
        
        # Priority 2: CampusVenue database lookup
        from apps.geoservice.models import CampusVenue
        
        venue = CampusVenue.objects.filter(
            name__iexact=timetable_entry.venue,
            is_active=True
        ).first()
        
        if venue and venue.coordinates:
            return venue.coordinates
        
        # Priority 3: Geocode
        if hasattr(timetable_entry, 'class_group'):
            address = f"{timetable_entry.venue}, {timetable_entry.class_group.institution}"
        else:
            address = timetable_entry.venue
        
        return self.geocode_address(address)
    
    def find_nearest_venues(
        self, lat: float, lon: float,
        institution: str = None,
        limit: int = 5
    ) -> List[Dict]:
        """Find the nearest campus venues to a given GPS location."""
        from apps.geoservice.models import CampusVenue
        
        venues = CampusVenue.objects.filter(
            is_active=True,
            latitude__isnull=False,
            longitude__isnull=False
        )
        
        if institution:
            venues = venues.filter(institution=institution)
        
        venues_with_distance = []
        for venue in venues:
            distance = self.calculate_distance(
                lat, lon,
                float(venue.latitude), float(venue.longitude)
            )
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
    
    def get_directions_url(
        self,
        origin_lat: float, origin_lon: float,
        dest_lat: float, dest_lon: float,
        travel_mode: str = 'walking'
    ) -> str:
        """Generate a Google Maps directions URL."""
        return (
            f"https://www.google.com/maps/dir/?api=1"
            f"&origin={origin_lat},{origin_lon}"
            f"&destination={dest_lat},{dest_lon}"
            f"&travelmode={travel_mode}"
        )