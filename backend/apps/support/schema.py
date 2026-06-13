# backend/apps/support/schema.py

from ninja import Schema
from typing import Optional, List
from datetime import datetime
from uuid import UUID


# ── Input schemas ──────────────────────────────────────────
class TicketIn(Schema):
    title: str
    description: str
    category: str = "technical"


class TicketResponseIn(Schema):
    message: str
    is_internal: bool = False


class TicketUpdateIn(Schema):
    status: Optional[str] = None
    assigned_to_id: Optional[str] = None
    resolution: Optional[str] = None


# ── Output schemas ────────────────────────────────────────
class TicketResponseOut(Schema):
    id: UUID
    responder_name: str
    message: str
    is_internal: bool
    created_at: datetime
    responder_id: Optional[UUID] = None  # ADDED for better tracking

    class Config:
        from_attributes = True
        populate_by_name = True


class TicketOut(Schema):
    id: UUID
    title: str
    description: str
    category: str
    status: str
    submitted_by_name: str
    submitted_by_id: Optional[UUID] = None  # ADDED
    assigned_to_name: Optional[str] = None
    assigned_to_id: Optional[UUID] = None  # ADDED
    resolution: str = ""
    created_at: datetime
    updated_at: Optional[datetime] = None  # ADDED
    responses: List[TicketResponseOut] = []

    class Config:
        from_attributes = True
        populate_by_name = True