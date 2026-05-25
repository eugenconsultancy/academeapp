from ninja import Schema
from datetime import date, time, datetime
from typing import Optional, List
from pydantic import validator

class TimetableEntryIn(Schema):
    day_of_week: int
    start_time: time
    end_time: time
    unit_name: str
    venue: str
    lecturer: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @validator('day_of_week')
    def validate_day(cls, v):
        if v < 0 or v > 6:
            raise ValueError('Day must be between 0 (Monday) and 6 (Sunday)')
        return v

    @validator('end_time')
    def validate_time(cls, v, values):
        if 'start_time' in values and v <= values['start_time']:
            raise ValueError('End time must be after start time')
        return v

class TimetableEntryOut(Schema):
    id: str
    day_of_week: int
    start_time: str
    end_time: str
    unit_name: str
    venue: str
    lecturer: Optional[str] = None
    is_active: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class TimetableBulkIn(Schema):
    entries: List[TimetableEntryIn]

class AttendanceMarkIn(Schema):
    timetable_entry_id: str
    attempted_at: Optional[datetime] = None
    student_lat: Optional[float] = None
    student_lon: Optional[float] = None

class AttendanceOut(Schema):
    id: str
    timetable_entry_id: str
    unit_name: str
    date: str
    marked_at: str
    sync_method: str

class WeeklySummaryOut(Schema):
    week_start: str
    week_end: str
    total_classes: int
    marked_count: int
    percentage: float
    daily_breakdown: dict

class TodayClassOut(Schema):
    id: str
    unit_name: str
    start_time: str
    end_time: str
    venue: str
    lecturer: Optional[str] = None
    is_marked: bool
    can_mark: bool
    remaining_time: Optional[int] = None
    latitude: Optional[float] = None      # <-- NEW
    longitude: Optional[float] = None     # <-- NEW

# Additional schemas for CRUD operations
class TimetableEntryCreate(Schema):
    """For creating a new timetable entry"""
    class_group_id: str
    day_of_week: int
    start_time: time
    end_time: time
    unit_name: str
    venue: str
    lecturer: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class TimetableEntryUpdate(Schema):
    """For updating an existing entry (all fields optional)"""
    day_of_week: Optional[int] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    unit_name: Optional[str] = None
    venue: Optional[str] = None
    lecturer: Optional[str] = None
    is_active: Optional[bool] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class TimetableEntryOutDetail(Schema):
    """Full entry detail (for edit forms)"""
    id: str
    class_group_id: str
    day_of_week: int
    start_time: str
    end_time: str
    unit_name: str
    venue: str
    lecturer: Optional[str]
    is_active: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None