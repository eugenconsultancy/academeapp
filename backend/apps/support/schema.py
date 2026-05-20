from ninja import Schema
from typing import Optional

class TicketIn(Schema):
    title: str
    description: str
    category: str = "technical"

class TicketResponseIn(Schema):
    message: str
