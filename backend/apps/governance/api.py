"""
Governance API Endpoints
Audit logs, role management, and platform statistics.
"""
from typing import List, Optional
from django.shortcuts import get_object_or_404
from ninja import Router, Query
from common.jwt_auth import JWTAuth
from apps.governance.models import AuditLog, RoleHistory, PlatformStats
from apps.governance.services import AuditService, RoleService, StatsService
from apps.governance.schema import (
    AuditLogOut, AuditLogFilter, RoleHistoryOut,
    ExpiringRoleOut, PlatformStatsOut,
)
from apps.governance.permissions import IsAdmin, IsAdminOrStudentLeader

router = Router(tags=['Governance'])


# ============================================
# AUDIT LOGS (Admin Only - Read Only)
# IMPORTANT: Literal paths MUST come before parameterized paths
# ============================================

@router.get("/audit-logs/", auth=JWTAuth(), response=List[AuditLogOut])
def list_audit_logs(
    request,
    action: str = Query(None, description="Filter by action type"),
    target_user_id: str = Query(None, description="Filter by target user"),
    severity: str = Query(None, description="Filter by severity"),
    date_from: str = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    List audit logs. Read-only. Admin access only.
    """
    if request.auth.role != 'admin':
        return []
    
    results, total = AuditService.get_logs(
        action=action,
        target_user=target_user_id,
        severity=severity,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )
    
    return [{
        "id": str(log.id),
        "action": log.action,
        "action_display": log.get_action_display(),
        "performed_by": log.performed_by.full_name if log.performed_by else "System",
        "target_user": log.target_user.full_name if log.target_user else None,
        "target_type": log.target_type,
        "target_id": log.target_id,
        "severity": log.severity,
        "ip_address": log.ip_address or "",
        "created_at": log.created_at.isoformat(),
        "metadata": log.metadata,
    } for log in results]


# NOTE: /audit-logs/export/ MUST come BEFORE /audit-logs/{log_id}/
# Otherwise "export" gets matched as a UUID in {log_id}
@router.get("/audit-logs/export/", auth=JWTAuth())
def export_audit_logs(
    request,
    action: str = Query(None),
    date_from: str = Query(None),
    date_to: str = Query(None),
):
    """
    Export audit logs as CSV.
    Must be defined BEFORE /audit-logs/{log_id}/ to avoid URL conflict.
    """
    if request.auth.role != 'admin':
        return {"error": "Unauthorized"}
    
    from django.http import HttpResponse
    
    csv_content = AuditService.export_logs_csv(
        action=action,
        date_from=date_from,
        date_to=date_to,
    )
    
    response = HttpResponse(csv_content, content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="audit-logs-{date_from or "all"}.csv"'
    return response


@router.get("/audit-logs/recent/", auth=JWTAuth())
def get_recent_activity(request, limit: int = Query(10, ge=1, le=50)):
    """
    Get recent audit activity for dashboard.
    Must be defined BEFORE /audit-logs/{log_id}/ to avoid URL conflict.
    """
    if request.auth.role not in ['admin', 'student_leader', 'faculty_rep']:
        return []
    
    return AuditService.get_recent_activity(limit)


# NOTE: /audit-logs/{log_id}/ MUST come AFTER all literal paths
# like /audit-logs/export/ and /audit-logs/recent/
@router.get("/audit-logs/{log_id}/", auth=JWTAuth())
def get_audit_log(request, log_id: str):
    """Get detailed audit log entry with full state snapshots."""
    if request.auth.role != 'admin':
        return {"error": "Unauthorized"}
    
    log = get_object_or_404(AuditLog, id=log_id)
    
    return {
        "id": str(log.id),
        "action": log.action,
        "action_display": log.get_action_display(),
        "performed_by": log.performed_by.full_name if log.performed_by else "System",
        "target_user": log.target_user.full_name if log.target_user else None,
        "target_type": log.target_type,
        "target_id": log.target_id,
        "before_state": log.before_state,
        "after_state": log.after_state,
        "severity": log.severity,
        "ip_address": log.ip_address or "",
        "user_agent": log.user_agent or "",
        "metadata": log.metadata,
        "created_at": log.created_at.isoformat(),
    }


# ============================================
# ROLE MANAGEMENT
# ============================================

@router.get("/roles/expiring/", auth=JWTAuth(), response=List[ExpiringRoleOut])
def list_expiring_roles(
    request,
    days: int = Query(7, ge=1, le=30, description="Days ahead to check"),
):
    """
    List roles expiring within N days.
    Accessible to admins and student leaders.
    """
    if request.auth.role not in ['admin', 'student_leader', 'faculty_rep']:
        return []
    
    return RoleService.get_expiring_roles(days)


@router.get("/roles/history/", auth=JWTAuth(), response=List[RoleHistoryOut])
def list_role_history(
    request,
    user_id: str = Query(None, description="Filter by user"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    List role assignment history.
    """
    if request.auth.role not in ['admin', 'student_leader', 'faculty_rep', 'class_rep']:
        return []
    
    results, total = RoleService.get_role_history(
        user=user_id,
        limit=limit,
        offset=offset,
    )
    
    return [{
        "id": str(r.id),
        "user_id": str(r.user.id),
        "user_name": r.user.full_name,
        "role": r.role,
        "scope_type": r.scope_type,
        "scope_name": r.scope_name,
        "action": r.action,
        "performed_by": r.performed_by.full_name if r.performed_by else "System",
        "reason": r.reason,
        "effective_from": r.effective_from.isoformat(),
        "effective_to": r.effective_to.isoformat() if r.effective_to else None,
        "created_at": r.created_at.isoformat(),
    } for r in results]


# ============================================
# PLATFORM STATISTICS
# ============================================

@router.get("/stats/", auth=JWTAuth())
def get_platform_stats(request):
    """
    Get current platform statistics.
    Accessible to admins and student leaders.
    """
    if request.auth.role not in ['admin', 'student_leader', 'faculty_rep']:
        return {"error": "Unauthorized"}
    
    return StatsService.get_current_stats()


@router.get("/stats/history/", auth=JWTAuth())
def get_stats_history(
    request,
    days: int = Query(30, ge=1, le=365, description="Number of days to fetch"),
):
    """
    Get historical platform stats for trend analysis.
    Admin only.
    """
    if request.auth.role != 'admin':
        return {"error": "Unauthorized"}
    
    from django.utils import timezone
    
    cutoff = timezone.localtime().date() - timezone.timedelta(days=days)
    stats = PlatformStats.objects.filter(date__gte=cutoff).order_by('date')
    
    return [{
        "date": s.date.isoformat(),
        "total_users": s.total_users,
        "active_users": s.active_users,
        "new_users_today": s.new_users_today,
        "active_roles": s.active_roles,
    } for s in stats]