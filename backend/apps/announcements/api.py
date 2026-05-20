from typing import List
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from ninja import Router, Query
from common.jwt_auth import JWTAuth
from .models import Announcement, AnnouncementRequest, Report
from .services import AnnouncementService

router = Router()

# ============================================
# ANNOUNCEMENTS CRUD
# IMPORTANT: Literal paths MUST come before parameterized paths
# ============================================

@router.get("/", auth=JWTAuth())
def list_announcements(request, limit: int = 20):
    """List visible announcements"""
    announcements = AnnouncementService.get_visible_announcements(request.auth)[:limit]
    return [{
        "id": str(a.id), "title": a.title, "content": a.content,
        "posted_by": a.posted_by.full_name if a.posted_by else "Admin",
        "created_at": str(a.created_at),
        "expires_at": str(a.expires_at) if a.expires_at else None,
        "is_urgent": a.is_urgent, "target": a.target,
    } for a in announcements]


@router.post("/", auth=JWTAuth())
def create_announcement(request, data: dict):
    """Create a new announcement"""
    if request.auth.role not in ['admin', 'student_leader', 'faculty_rep', 'class_rep']:
        return {"error": "Unauthorized"}
    announcement = AnnouncementService.create_announcement(request.auth, data)
    return {"id": str(announcement.id), "message": "Announcement created"}


# NOTE: /feed/ MUST come BEFORE /{announcement_id}/ to avoid URL conflict
@router.get("/feed/", auth=JWTAuth())
def get_announcement_feed(request):
    """Get cached announcement feed"""
    announcements = AnnouncementService.get_visible_announcements(request.auth)[:20]
    return [{
        "id": str(a.id), "title": a.title,
        "content": a.content[:200] + "..." if len(a.content) > 200 else a.content,
        "posted_by": a.posted_by.full_name if a.posted_by else "Admin",
        "target": a.target, "is_urgent": a.is_urgent,
        "created_at": str(a.created_at),
        "expires_at": str(a.expires_at) if a.expires_at else None,
    } for a in announcements]


# ============================================
# ANNOUNCEMENT REQUESTS
# NOTE: /requests/ paths MUST come BEFORE /{announcement_id}/
# ============================================

@router.post("/requests/", auth=JWTAuth())
def create_request(request, data: dict):
    """Create announcement request"""
    req = AnnouncementRequest.objects.create(
        requester=request.auth,
        title=data.get('title', ''),
        content=data.get('content', ''),
        target=data.get('target', 'class_rep'),
        status='pending'
    )
    return {"id": str(req.id), "message": "Request submitted"}


@router.get("/requests/", auth=JWTAuth())
def list_requests(request, status: str = None):
    """List announcement requests"""
    requests = AnnouncementRequest.objects.all()
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
    """Approve announcement request"""
    if request.auth.role not in ['admin', 'student_leader', 'faculty_rep', 'class_rep']:
        return {"error": "Unauthorized"}
    
    req = get_object_or_404(AnnouncementRequest, id=request_id)
    req.status = 'approved'
    req.handled_by = request.auth
    req.response_note = (data or {}).get('response_note', 'Approved')
    req.save()
    
    announcement = Announcement.objects.create(
        title=req.title, content=req.content, posted_by=request.auth,
        target=req.target, is_urgent=False,
        expires_at=timezone.now() + timedelta(days=21),
    )
    return {"message": "Approved", "announcement_id": str(announcement.id)}


@router.post("/requests/{request_id}/reject/", auth=JWTAuth())
def reject_request(request, request_id: str, data: dict = None):
    """Reject announcement request"""
    if request.auth.role not in ['admin', 'student_leader', 'faculty_rep', 'class_rep']:
        return {"error": "Unauthorized"}
    
    req = get_object_or_404(AnnouncementRequest, id=request_id)
    req.status = 'rejected'
    req.handled_by = request.auth
    req.response_note = (data or {}).get('response_note', 'Rejected')
    req.save()
    return {"message": "Rejected"}


# ============================================
# REPORTS
# NOTE: /reports/ MUST come BEFORE /{announcement_id}/
# ============================================

@router.get("/reports/", auth=JWTAuth())
def list_reports(request):
    """List all reports (admin only)"""
    if request.auth.role != 'admin':
        return {"error": "Unauthorized"}
    
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
    """Resolve a report (admin only)"""
    if request.auth.role != 'admin':
        return {"error": "Unauthorized"}
    
    report = get_object_or_404(Report, id=report_id)
    report.is_resolved = True
    report.resolved_by = request.auth
    report.resolution_note = (data or {}).get('resolution_note', 'Resolved')
    report.save()
    
    return {"message": "Report resolved"}


# ============================================
# ANNOUNCEMENT BY ID
# NOTE: /{announcement_id}/ MUST come AFTER all literal paths
# (feed/, requests/, reports/, etc.)
# ============================================

@router.get("/{announcement_id}/", auth=JWTAuth())
def get_announcement(request, announcement_id: str):
    """Get single announcement detail"""
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
def update_announcement(request, announcement_id: str, data: dict):
    """Update an announcement"""
    announcement = get_object_or_404(Announcement, id=announcement_id)
    if request.auth.role != 'admin' and request.auth.id != announcement.posted_by_id:
        return {"error": "Unauthorized"}
    
    for field in ['title', 'content', 'is_urgent', 'target', 'is_active']:
        if field in data:
            setattr(announcement, field, data[field])
    announcement.save()
    return {"message": "Announcement updated", "id": str(announcement.id)}


@router.delete("/{announcement_id}/", auth=JWTAuth())
def delete_announcement(request, announcement_id: str):
    """Delete an announcement"""
    announcement = get_object_or_404(Announcement, id=announcement_id)
    if request.auth.role != 'admin' and request.auth.id != announcement.posted_by_id:
        return {"error": "Unauthorized"}
    announcement.delete()
    return {"message": "Announcement deleted"}


@router.post("/{announcement_id}/report/", auth=JWTAuth())
def report_announcement(request, announcement_id: str, data: dict = None):
    """Report an announcement"""
    announcement = get_object_or_404(Announcement, id=announcement_id)
    reason = (data or {}).get('reason', 'spam')
    description = (data or {}).get('description', '')
    
    report, created = Report.objects.get_or_create(
        reported_by=request.auth, announcement=announcement,
        defaults={'reason': reason, 'description': description}
    )
    if not created:
        return {"error": "Already reported"}
    return {"message": "Report submitted"}