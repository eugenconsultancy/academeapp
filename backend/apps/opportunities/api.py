from typing import List
from django.shortcuts import get_object_or_404
from ninja import Router, Schema
from common.jwt_auth import JWTAuth
from .models import Opportunity, Like, OpportunityReport
from .services import OpportunityService

router = Router()

class ReportIn(Schema):
    reason: str = "spam"
    description: str = ""

@router.get("/", auth=JWTAuth())
def list_opportunities(request, category: str = None):
    OpportunityService.update_last_visited(request.auth)
    opportunities = Opportunity.objects.filter(is_active=True)
    if category:
        opportunities = opportunities.filter(category=category)
    opportunities = opportunities.order_by('-created_at')
    
    user_likes = set(Like.objects.filter(
        user=request.auth, opportunity__in=opportunities
    ).values_list('opportunity_id', flat=True))
    
    return [{
        "id": str(o.id),
        "title": o.title,
        "description": o.description,
        "category": o.category,
        "link": o.link or "",
        "likes_count": o.likes.count(),
        "is_liked": o.id in user_likes,
        "posted_by": {"full_name": o.posted_by.full_name} if o.posted_by else None,
        "created_at": str(o.created_at),
        "expires_at": str(o.expires_at)
    } for o in opportunities]

@router.get("/unread-count/", auth=JWTAuth())
def get_unread_count(request):
    count = OpportunityService.get_unread_count(request.auth)
    return {"count": count}

@router.post("/{opportunity_id}/like/", auth=JWTAuth())
def toggle_like(request, opportunity_id: str):
    opportunity = get_object_or_404(Opportunity, id=opportunity_id)
    like, created = Like.objects.get_or_create(opportunity=opportunity, user=request.auth)
    if not created:
        like.delete()
        liked = False
    else:
        liked = True
    return {"liked": liked, "count": opportunity.likes.count()}

@router.post("/{opportunity_id}/report/", auth=JWTAuth())
def report_opportunity(request, opportunity_id: str, data: ReportIn):
    """Report an opportunity"""
    opportunity = get_object_or_404(Opportunity, id=opportunity_id)
    
    existing = OpportunityReport.objects.filter(
        opportunity=opportunity,
        reported_by=request.auth
    ).first()
    
    if existing:
        return {"error": "Already reported"}
    
    OpportunityReport.objects.create(
        opportunity=opportunity,
        reported_by=request.auth,
        reason=data.reason,
        description=data.description
    )
    
    return {"message": "Report submitted successfully"}
