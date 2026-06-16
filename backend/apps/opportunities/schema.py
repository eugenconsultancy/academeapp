# apps/opportunities/schema.py
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


# ── Scholarship Review Schemas ─────────────────────────────────────────────
class ScholarshipSubmitIn(Schema):
    opportunity_id: str

class ScholarshipPayIn(Schema):
    phone_number: str

class ScholarshipReviewOut(Schema):
    id: str
    student_id: str
    student_name: Optional[str]
    opportunity_id: str
    opportunity_title: str
    document_url: str
    status: str
    invoice_id: Optional[str]
    admin_comments: str
    reviewed_at: Optional[datetime]
    created_at: datetime