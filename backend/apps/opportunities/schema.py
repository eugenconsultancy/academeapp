from ninja import Schema
from datetime import datetime
from typing import Optional, List

class OpportunityIn(Schema):
    title: str
    description: str
    link: Optional[str] = None
    category: str
    expires_in_days: int = 120  # Default 4 months

class OpportunityOut(Schema):
    id: str
    title: str
    description: str
    link: Optional[str]
    category: str
    posted_by: dict
    likes_count: int
    is_liked: bool = False
    created_at: datetime
    expires_at: datetime

class OpportunityFilter(Schema):
    category: Optional[str] = None
    search: Optional[str] = None
    unread_only: bool = False

class OpportunityReportIn(Schema):
    opportunity_id: str
    reason: str
    description: Optional[str] = None