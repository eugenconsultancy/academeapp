from geopy.distance import geodesic
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
from decimal import Decimal
from typing import Tuple, Optional
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)


class LocationService:
    """Core location service using Geopy."""

    def __init__(self):
        self.geolocator = Nominatim(user_agent="academe_location_service")
        self.cache_timeout = 86400 * 30

    def geocode_address(self, address: str) -> Optional[Tuple[float, float]]:
        cache_key = f"geocode:{address.lower().strip()}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        try:
            location = self.geolocator.geocode(address, timeout=10)
            if location:
                coords = (location.latitude, location.longitude)
                cache.set(cache_key, coords, self.cache_timeout)
                return coords
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            logger.error(f"Geocoding failed for '{address}': {e}")
        return None

    def reverse_geocode(self, lat: float, lon: float) -> Optional[str]:
        cache_key = f"reverse_geocode:{lat:.4f}:{lon:.4f}"
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

    @staticmethod
    def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        point1 = (float(lat1), float(lon1))
        point2 = (float(lat2), float(lon2))
        return geodesic(point1, point2).meters

    @staticmethod
    def is_within_radius(student_lat: float, student_lon: float, venue_lat: float, venue_lon: float, radius_meters: int = 100) -> Tuple[bool, float]:
        distance = LocationService.calculate_distance(student_lat, student_lon, venue_lat, venue_lon)
        return distance <= radius_meters, distance

    @staticmethod
    def format_distance(distance_meters: float) -> str:
        if distance_meters < 1:
            return "Less than 1 meter"
        elif distance_meters < 1000:
            return f"{distance_meters:.0f} meters"
        else:
            return f"{distance_meters / 1000:.1f} km"

    def get_venue_coordinates(self, timetable_entry) -> Optional[Tuple[float, float]]:
        if timetable_entry.latitude and timetable_entry.longitude:
            return (float(timetable_entry.latitude), float(timetable_entry.longitude))
        from apps.classes.models import CampusVenue
        venue = CampusVenue.objects.filter(name__iexact=timetable_entry.venue, is_active=True).first()
        if venue:
            return (float(venue.latitude), float(venue.longitude))
        address = f"{timetable_entry.venue}, {timetable_entry.class_group.institution}"
        return self.geocode_address(address)

    def find_nearest_venues(self, lat: float, lon: float, institution: str, limit: int = 5) -> list:
        from apps.classes.models import CampusVenue
        venues = CampusVenue.objects.filter(institution=institution, is_active=True, latitude__isnull=False, longitude__isnull=False)
        venues_with_distance = []
        for venue in venues:
            distance = self.calculate_distance(lat, lon, float(venue.latitude), float(venue.longitude))
            venues_with_distance.append({'venue': venue, 'distance_meters': distance, 'distance_display': self.format_distance(distance)})
        venues_with_distance.sort(key=lambda x: x['distance_meters'])
        return venues_with_distance[:limit]

    def get_walking_time_minutes(self, distance_meters: float) -> int:
        return max(1, round(distance_meters / 80))
