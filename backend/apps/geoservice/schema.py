# backend/apps/geoservice/schema.py
from ninja import Schema
from datetime import datetime
from typing import Optional, List
from decimal import Decimal
from pydantic import validator


# ── Input schemas (used in API endpoints) ──────────────────────────────

class CheckInSchema(Schema):
    """Validation schema for location check‑in requests."""
    timetable_entry_id: str
    latitude: Decimal
    longitude: Decimal
    accuracy: Optional[float] = None
    device_info: dict = {}

    @validator('latitude')
    def validate_latitude(cls, v):
        if v < -90 or v > 90:
            raise ValueError('Latitude must be between -90 and 90 degrees.')
        return v

    @validator('longitude')
    def validate_longitude(cls, v):
        if v < -180 or v > 180:
            raise ValueError('Longitude must be between -180 and 180 degrees.')
        return v


class LocationRecordSchema(Schema):
    """Validation schema for location recording."""
    latitude: Decimal
    longitude: Decimal
    accuracy: Optional[float] = None
    event_type: str = 'background'
    timestamp: Optional[str] = None
    metadata: dict = {}

    @validator('latitude')
    def validate_latitude(cls, v):
        if v < -90 or v > 90:
            raise ValueError('Latitude must be between -90 and 90 degrees.')
        return v

    @validator('longitude')
    def validate_longitude(cls, v):
        if v < -180 or v > 180:
            raise ValueError('Longitude must be between -180 and 180 degrees.')
        return v


# ── Output schemas (documentation & response typing) ───────────────────

class CoordinatesIn(Schema):
    """GPS coordinates input (unused here, kept for reference)"""
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
    """Location check‑in result"""
    verified: bool
    distance_meters: float
    distance_display: str
    check_in_id: str
    message: str
    requires_manual_review: bool = False


class CheckInHistoryOut(Schema):
    """Check‑in history entry"""
    id: str
    unit_name: str
    venue: str
    distance_meters: Optional[float]
    within_radius: bool
    gps_accuracy: Optional[float]
    created_at: str


class CheckInSummaryOut(Schema):
    """Daily check‑in summary"""
    date: str
    total_checkins: int
    verified_checkins: int
    flagged_checkins: int
    rejected_checkins: int = 0
    average_distance_meters: float
    average_gps_accuracy_meters: float = 0.0