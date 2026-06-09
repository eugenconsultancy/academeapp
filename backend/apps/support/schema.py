# apps/support/schema.py

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
    id: UUID                          # ✅ UUID – matches BaseModel primary key
    responder_name: str
    message: str
    is_internal: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TicketOut(Schema):
    id: UUID                          # ✅ UUID – matches BaseModel primary key
    title: str
    description: str
    category: str
    status: str
    submitted_by_name: str
    assigned_to_name: Optional[str] = None
    resolution: str = ""
    created_at: datetime
    responses: List[TicketResponseOut] = []

    class Config:
        from_attributes = True