from typing import List
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from ninja import Router, Query
from ninja.errors import HttpError
from common.jwt_auth import JWTAuth
from .models import Announcement, AnnouncementRequest, Report
from .services import AnnouncementService
from .schema import (
    AnnouncementIn,
    AnnouncementOut,
    AnnouncementRequestIn,
    AnnouncementUpdate,
    UserOut,
)

router = Router()

def require_roles(request, roles):
    if request.auth.role not in roles:
        raise HttpError(403, "You do not have permission to perform this action.")

# ═══════════════════════════════════════════════════════════════
# ANNOUNCEMENTS
# ═══════════════════════════════════════════════════════════════

@router.get("/", auth=JWTAuth(), response=List[AnnouncementOut])
def list_announcements(request, limit: int = 20, search: str = None):
    """List visible announcements, optionally filtered by a search term."""
    announcements = AnnouncementService.get_visible_announcements(request.auth)[:limit]
    if search:
        search_lower = search.lower()
        announcements = [
            a for a in announcements
            if search_lower in a.title.lower() or search_lower in a.content.lower()
        ]
    return [{
        "id": str(a.id),
        "title": a.title,
        "content": a.content,
        "posted_by": {
            "id": str(a.posted_by.id),
            "full_name": a.posted_by.full_name,
        } if a.posted_by else None,
        "target": a.target,
        "is_urgent": a.is_urgent,
        "created_at": a.created_at,
        "expires_at": a.expires_at,
        "report_count": getattr(a, 'report_count', 0),
    } for a in announcements]

@router.post("/", auth=JWTAuth())
def create_announcement(request, data: AnnouncementIn):
    require_roles(request, ['admin', 'student_leader', 'faculty_rep', 'class_rep'])
    announcement = AnnouncementService.create_announcement(request.auth, data.dict())
    return {"id": str(announcement.id), "message": "Announcement created"}

@router.get("/feed/", auth=JWTAuth(), response=List[AnnouncementOut])
def get_announcement_feed(request):
    announcements = AnnouncementService.get_visible_announcements(request.auth)[:20]
    return [{
        "id": str(a.id),
        "title": a.title,
        "content": a.content[:200] + "..." if len(a.content) > 200 else a.content,
        "posted_by": {
            "id": str(a.posted_by.id),
            "full_name": a.posted_by.full_name,
        } if a.posted_by else None,
        "target": a.target,
        "is_urgent": a.is_urgent,
        "created_at": a.created_at,
        "expires_at": a.expires_at,
        "report_count": getattr(a, 'report_count', 0),
    } for a in announcements]

# ═══════════════════════════════════════════════════════════════
# ANNOUNCEMENT REQUESTS
# ═══════════════════════════════════════════════════════════════

@router.post("/requests/", auth=JWTAuth())
def create_request(request, data: AnnouncementRequestIn):
    req = AnnouncementRequest.objects.create(
        requester=request.auth,
        title=data.title,
        content=data.content,
        target=data.target,
        status='pending'
    )
    return {"id": str(req.id), "message": "Request submitted"}

@router.get("/requests/", auth=JWTAuth())
def list_requests(request, status: str = None):
    require_roles(request, ['admin', 'student_leader', 'faculty_rep', 'class_rep'])
    requests = AnnouncementRequest.objects.select_related('requester').all()
    if status:
        requests = requests.filter(status=status)
    requests = requests.order_by('-created_at')[:50]
    return [{
        "id": str(r.id), "title": r.title, "content": r.content,
        "target": r.target, "status": r.status,
        "requester_name": r.requester.full_name,
        "created_at": str(r.created_at),
        "response_note": r.response_note or "",
    } for r in requests]

@router.post("/requests/{request_id}/approve/", auth=JWTAuth())
def approve_request(request, request_id: str, data: dict = None):
    require_roles(request, ['admin', 'student_leader', 'faculty_rep', 'class_rep'])
    req = get_object_or_404(AnnouncementRequest, id=request_id)
    req.status = 'approved'
    req.handled_by = request.auth
    req.response_note = (data or {}).get('response_note', 'Approved')
    req.save()

    announcement_data = {
        "title": req.title,
        "content": req.content,
        "target": req.target,
        "is_urgent": False,
        "expires_in_days": 21
    }
    announcement = AnnouncementService.create_announcement(request.auth, announcement_data)
    return {"message": "Approved", "announcement_id": str(announcement.id)}

@router.post("/requests/{request_id}/reject/", auth=JWTAuth())
def reject_request(request, request_id: str, data: dict = None):
    require_roles(request, ['admin', 'student_leader', 'faculty_rep', 'class_rep'])
    req = get_object_or_404(AnnouncementRequest, id=request_id)
    req.status = 'rejected'
    req.handled_by = request.auth
    req.response_note = (data or {}).get('response_note', 'Rejected')
    req.save()
    return {"message": "Rejected"}

# ═══════════════════════════════════════════════════════════════
# REPORTS
# ═══════════════════════════════════════════════════════════════

@router.get("/reports/", auth=JWTAuth())
def list_reports(request):
    require_roles(request, ['admin'])
    reports = Report.objects.select_related('announcement', 'reported_by').order_by('-created_at')[:50]
    return [{
        "id": str(r.id),
        "announcement_title": r.announcement.title,
        "announcement_id": str(r.announcement.id),
        "reported_by_name": r.reported_by.full_name,
        "reason": r.reason,
        "description": r.description,
        "is_resolved": r.is_resolved,
        "created_at": str(r.created_at),
    } for r in reports]

@router.put("/reports/{report_id}/resolve/", auth=JWTAuth())
def resolve_report(request, report_id: str, data: dict = None):
    require_roles(request, ['admin'])
    report = get_object_or_404(Report, id=report_id)
    report.is_resolved = True
    report.resolved_by = request.auth
    report.resolution_note = (data or {}).get('resolution_note', 'Resolved')
    report.save()
    return {"message": "Report resolved"}

# ═══════════════════════════════════════════════════════════════
# ANNOUNCEMENT BY ID
# ═══════════════════════════════════════════════════════════════

@router.get("/{announcement_id}/", auth=JWTAuth())
def get_announcement(request, announcement_id: str):
    announcement = get_object_or_404(Announcement, id=announcement_id)
    return {
        "id": str(announcement.id),
        "title": announcement.title,
        "content": announcement.content,
        "posted_by": {
            "id": str(announcement.posted_by.id),
            "full_name": announcement.posted_by.full_name,
        } if announcement.posted_by else None,
        "target": announcement.target,
        "is_urgent": announcement.is_urgent,
        "created_at": str(announcement.created_at),
        "expires_at": str(announcement.expires_at) if announcement.expires_at else None,
        "is_active": announcement.is_active,
    }

@router.put("/{announcement_id}/", auth=JWTAuth())
def update_announcement(request, announcement_id: str, data: AnnouncementUpdate):
    announcement = get_object_or_404(Announcement, id=announcement_id)
    if request.auth.role != 'admin' and request.auth.id != announcement.posted_by_id:
        raise HttpError(403, "Unauthorized")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(announcement, field, value)
    announcement.save()
    return {"message": "Announcement updated", "id": str(announcement.id)}

@router.delete("/{announcement_id}/", auth=JWTAuth())
def delete_announcement(request, announcement_id: str):
    announcement = get_object_or_404(Announcement, id=announcement_id)
    if request.auth.role != 'admin' and request.auth.id != announcement.posted_by_id:
        raise HttpError(403, "Unauthorized")
    announcement.delete()
    return {"message": "Announcement deleted"}

@router.post("/{announcement_id}/report/", auth=JWTAuth())
def report_announcement(request, announcement_id: str, data: dict = None):
    announcement = get_object_or_404(Announcement, id=announcement_id)
    reason = (data or {}).get('reason', 'spam')
    description = (data or {}).get('description', '')
    report, created = Report.objects.get_or_create(
        reported_by=request.auth,
        announcement=announcement,
        defaults={'reason': reason, 'description': description}
    )
    if not created:
        return {"error": "Already reported"}
    return {"message": "Report submitted"}