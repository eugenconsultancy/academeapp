from ninja import Router, Query
from common.jwt_auth import JWTAuth
from apps.announcements.models import Announcement
from apps.found_items.models import FoundItem
from apps.opportunities.models import Opportunity

router = Router()

@router.get("/", auth=JWTAuth())
def unified_search(request, q: str = Query(...)):
    announcements = Announcement.objects.filter(title__icontains=q, is_active=True)[:5]
    found_items = FoundItem.objects.filter(title__icontains=q, status='active')[:5]
    opportunities = Opportunity.objects.filter(title__icontains=q, is_active=True)[:5]
    
    return {
        "announcements": [{"id": str(a.id), "title": a.title} for a in announcements],
        "found_items": [{"id": str(i.id), "title": i.title, "category": i.category} for i in found_items],
        "opportunities": [{"id": str(o.id), "title": o.title, "category": o.category} for o in opportunities]
    }
