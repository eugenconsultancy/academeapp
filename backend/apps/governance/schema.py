from ninja import Schema
from datetime import datetime
from typing import Optional, Dict, List


class AuditLogOut(Schema):
    id: str
    action: str
    action_display: str
    performed_by: str
    target_user: Optional[str] = None
    target_type: str = ''
    target_id: str = ''
    severity: str = 'info'
    ip_address: str = ''
    created_at: str
    metadata: Dict = {}


class AuditLogDetailOut(AuditLogOut):
    before_state: Dict = {}
    after_state: Dict = {}
    user_agent: str = ''


class AuditLogFilter(Schema):
    action: Optional[str] = None
    target_user_id: Optional[str] = None
    severity: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    limit: int = 50
    offset: int = 0


class RoleHistoryOut(Schema):
    id: str
    user_id: str
    user_name: str
    role: str
    scope_type: str = ''
    scope_name: str = ''
    action: str
    performed_by: str
    reason: str = ''
    effective_from: str
    effective_to: Optional[str] = None
    created_at: str


class ExpiringRoleOut(Schema):
    id: str
    user_id: str
    user_name: str
    role: str
    end_date: str
    days_remaining: int


class PlatformStatsOut(Schema):
    date: str
    students_count: int
    active_users: int
    new_users_today: int
    announcements_count: int
    active_announcements: int
    found_items_count: int
    claimed_items: int
    opportunities_count: int
    active_opportunities: int
    total_claims: int
    resolved_claims: int
    total_reports: int
    resolved_reports: int
    active_roles: int
    expiring_roles_7d: int
    total_login_count: int
    role_breakdown: Dict = {}