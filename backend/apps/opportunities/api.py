from typing import List, Optional
from django.shortcuts import get_object_or_404
from ninja import Router, Schema
from ninja.errors import HttpError
from common.jwt_auth import JWTAuth
from .models import Opportunity, Like, OpportunityReport
from .services import OpportunityService
from datetime import timedelta
from django.utils import timezone
from .schema import OpportunityIn

router = Router()

class ReportIn(Schema):
    reason: str = "spam"
    description: str = ""

class OpportunityUpdate(Schema):
    """Schema for updating an opportunity (all fields optional)"""
    title: Optional[str] = None
    description: Optional[str] = None
    link: Optional[str] = None
    category: Optional[str] = None
    expires_in_days: Optional[int] = None   # days from now, or keep existing

# ------------------------------------------------------------
# EXISTING ENDPOINTS   unchanged except date format)
# ------------------------------------------------------------
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
        "created_at": o.created_at.isoformat(),
        "expires_at": o.expires_at.isoformat()
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

# ------------------------------------------------------------
# NEW ENDPOINTS (all four CRUD operations for a single opportunity)
# ------------------------------------------------------------
@router.post("/", auth=JWTAuth())
def create_opportunity(request, data: OpportunityIn):
    """Create a new opportunity"""
    opportunity = Opportunity.objects.create(
        title=data.title,
        description=data.description,
        link=data.link or '',
        category=data.category,
        posted_by=request.auth,
        expires_at=timezone.now() + timedelta(days=data.expires_in_days),
        is_active=True,
    )
    return {"id": str(opportunity.id), "message": "Opportunity created successfully"}

@router.get("/{opportunity_id}/", auth=JWTAuth())
def get_opportunity(request, opportunity_id: str):
    """Get a single opportunity's details"""
    opportunity = get_object_or_404(Opportunity, id=opportunity_id)

    user_likes = set(
        Like.objects.filter(user=request.auth, opportunity=opportunity)
        .values_list('opportunity_id', flat=True)
    )

    return {
        "id": str(opportunity.id),
        "title": opportunity.title,
        "description": opportunity.description,
        "category": opportunity.category,
        "link": opportunity.link or "",
        "likes_count": opportunity.likes.count(),
        "is_liked": opportunity.id in user_likes,
        "posted_by": {"full_name": opportunity.posted_by.full_name} if opportunity.posted_by else None,
        "created_at": opportunity.created_at.isoformat(),
        "expires_at": opportunity.expires_at.isoformat(),
    }

@router.put("/{opportunity_id}/", auth=JWTAuth())
def update_opportunity(request, opportunity_id: str, data: OpportunityUpdate):
    """Update an opportunity (owner or admin only)"""
    opportunity = get_object_or_404(Opportunity, id=opportunity_id)

    # Permission: only the poster or a staff member can update
    if request.auth != opportunity.posted_by and not request.auth.is_staff:
        raise HttpError(403, "You do not have permission to edit this opportunity.")

    # Update fields if they are provided
    if data.title is not None:
        opportunity.title = data.title
    if data.description is not None:
        opportunity.description = data.description
    if data.link is not None:
        opportunity.link = data.link
    if data.category is not None:
        opportunity.category = data.category
    if data.expires_in_days is not None:
        opportunity.expires_at = timezone.now() + timedelta(days=data.expires_in_days)

    opportunity.save()
    return {"id": str(opportunity.id), "message": "Opportunity updated successfully"}

@router.delete("/{opportunity_id}/", auth=JWTAuth())
def delete_opportunity(request, opportunity_id: str):
    """Delete an opportunity (owner or admin only)"""
    opportunity = get_object_or_404(Opportunity, id=opportunity_id)

    # Permission: only the poster or a staff member can delete
    if request.auth != opportunity.posted_by and not request.auth.is_staff:
        raise HttpError(403, "You do not have permission to delete this opportunity.")

    opportunity.delete()
    return {"message": "Opportunity deleted successfully"}