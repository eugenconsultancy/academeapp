from ninja import Schema
from datetime import datetime
from typing import Optional

class FoundItemIn(Schema):
    title: str
    category: str
    description: Optional[str] = None
    location_found: str
    found_date: datetime
    security_question: Optional[str] = None
    security_answer: Optional[str] = None
    is_fee_required: bool = False

class TipIn(Schema):
    message: str
