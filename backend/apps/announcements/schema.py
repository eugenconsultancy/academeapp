from ninja import Schema
from datetime import datetime
from typing import Optional, List
from pydantic import validator

class AnnouncementIn(Schema):
    title: str
    content: str
    target: str
    target_classes: Optional[List[str]] = None
    is_urgent: bool = False
    expires_in_days: int = 21  # Default 3 weeks
    

# depreciated function consider updating
    @validator('title')
    def validate_title(cls, v):
        if len(v.strip()) < 5:
            raise ValueError('Title must be at least 5 characters')
        return v
    
    @validator('expires_in_days')
    def validate_expiry(cls, v):
        if v < 1 or v > 60:  # Max 2 months for admin
            raise ValueError('Expiry must be between 1 and 60 days')
        return v

class AnnouncementOut(Schema):
    id: str
    title: str
    content: str
    posted_by: dict  # {id, full_name, profile_pic}
    target: str
    is_urgent: bool
    created_at: datetime
    expires_at: datetime
    report_count: int = 0

class AnnouncementRequestIn(Schema):
    title: str
    content: str
    target: str  # class_rep, student_leaders, both

class AnnouncementRequestOut(Schema):
    id: str
    title: str
    content: str
    target: str
    status: str
    created_at: datetime
    response_note: Optional[str] = None

class ReportIn(Schema):
    announcement_id: str
    reason: str
    description: Optional[str] = None

class ReportOut(Schema):
    id: str
    announcement_title: str
    reason: str
    description: Optional[str]
    is_resolved: bool
    created_at: datetime

class AnnouncementFilter(Schema):
    target: Optional[str] = None
    class_id: Optional[str] = None
    is_urgent: Optional[bool] = None
    search: Optional[str] = None