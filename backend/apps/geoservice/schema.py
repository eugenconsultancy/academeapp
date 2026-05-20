from ninja import Schema
from datetime import datetime
from typing import Optional, List


class CoordinatesIn(Schema):
    """GPS coordinates input"""
    latitude: float
    longitude: float
    accuracy: Optional[float] = None


class VenueOut(Schema):
    """Venue output schema"""
    id: str
    name: str
    institution: str
    building_code: str = ''
    floor: Optional[int] = None
    room_number: str = ''
    venue_type: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class VenueDetailOut(VenueOut):
    """Detailed venue output"""
    full_address: str = ''


class NearbyVenueOut(Schema):
    """Nearby venue with distance info"""
    id: str
    name: str
    building_code: str = ''
    floor: Optional[int] = None
    room_number: str = ''
    venue_type: str
    latitude: float
    longitude: float
    distance_meters: float
    distance_display: str
    walking_time_minutes: int


class GeocodeOut(Schema):
    """Geocoding result"""
    address: str
    latitude: float
    longitude: float


class DirectionsOut(Schema):
    """Directions between two points"""
    distance_meters: float
    distance_display: str
    walking_time_minutes: int
    maps_url: str
    origin: dict
    destination: dict


class NearbyClassOut(Schema):
    """Nearby class with distance info"""
    entry_id: str
    unit_name: str
    venue: str
    start_time: str
    end_time: str
    distance_meters: float
    distance_display: str
    walking_time_minutes: int
    lecturer: str = ''
    venue_latitude: float
    venue_longitude: float


class ClassDirectionsOut(Schema):
    """Directions to a specific class"""
    unit_name: str
    venue: str
    distance_meters: float
    distance_display: str
    walking_time_minutes: int
    venue_latitude: float
    venue_longitude: float
    student_latitude: float
    student_longitude: float
    maps_url: str
    start_time: Optional[str] = None


class CheckInOut(Schema):
    """Location check-in result"""
    verified: bool
    distance_meters: float
    distance_display: str
    check_in_id: str
    message: str


class CheckInHistoryOut(Schema):
    """Check-in history entry"""
    id: str
    unit_name: str
    venue: str
    distance_meters: Optional[float]
    within_radius: bool
    gps_accuracy: Optional[float]
    created_at: str


class CheckInSummaryOut(Schema):
    """Daily check-in summary"""
    date: str
    total_checkins: int
    verified_checkins: int
    flagged_checkins: int
    average_distance_meters: float
