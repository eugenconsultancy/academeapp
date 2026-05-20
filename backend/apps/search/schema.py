from ninja import Schema
from typing import Optional, List

class SearchResult(Schema):
    id: str
    title: str
    type: str  # announcement, found_item, opportunity
    excerpt: Optional[str] = None
    category: Optional[str] = None
    created_at: Optional[str] = None

class UnifiedSearchOut(Schema):
    announcements: List[dict] = []
    found_items: List[dict] = []
    opportunities: List[dict] = []