from ninja import Schema
from typing import Optional, List
from datetime import datetime

class TicketIn(Schema):
    title: str
    description: str
    category: str = "technical"

class TicketResponseIn(Schema):
    message: str
    is_internal: bool = False   # admin internal notes

class TicketUpdateIn(Schema):
    status: Optional[str] = None
    assigned_to_id: Optional[str] = None
    resolution: Optional[str] = None

class TicketResponseOut(Schema):
    id: str
    responder_name: str
    message: str
    is_internal: bool
    created_at: datetime

class TicketOut(Schema):
    id: str
    title: str
    description: str
    category: str
    status: str
    submitted_by_name: str
    assigned_to_name: Optional[str] = None
    resolution: str = ""
    created_at: datetime
    responses: List[TicketResponseOut] = []   # only for admin or ticket owner