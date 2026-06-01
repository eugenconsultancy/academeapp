# apps/support/schema.py

from ninja import Schema
from typing import Optional, List
from datetime import datetime
import uuid

# ── Input schemas (unchanged) ────────────────────────────────
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

# ── Output schemas (FIXED) ──────────────────────────────────
class TicketResponseOut(Schema):
    id: uuid.UUID                      # automatically serialized as string
    responder_name: str
    message: str
    is_internal: bool
    created_at: datetime

    class Config:
        from_attributes = True

    @staticmethod
    def resolve_responder_name(obj):
        # obj is a TicketResponse instance
        if obj.responder:
            return obj.responder.get_full_name() or obj.responder.username
        return "Unknown"

class TicketOut(Schema):
    id: uuid.UUID
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

    @staticmethod
    def resolve_submitted_by_name(obj):
        if obj.submitted_by:
            return obj.submitted_by.get_full_name() or obj.submitted_by.username
        return "Unknown"

    @staticmethod
    def resolve_assigned_to_name(obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.username
        return None