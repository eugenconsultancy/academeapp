from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging
import json

from .models import User, Badge, StudentRole, UserSession
from apps.governance.models import AuditLog
from common.constants import BadgeType, BADGE_THRESHOLDS
from common.notifications import NotificationService

logger = logging.getLogger(__name__)

# ============================================
# EXISTING TASKS
# ============================================

@shared_task
def calculate_badges():
    """Nightly task to recalculate all badges"""
    # Check all users for login badges BASED ON NO OFLOGINS, LIKES ETC
    for user in User.objects.all():
        for badge_type in [BadgeType.LOGIN_BRONZE, BadgeType.LOGIN_SILVER, BadgeType.LOGIN_GOLD]:
            threshold = BADGE_THRESHOLDS.get(badge_type, 0)
            if user.login_count >= threshold:
                Badge.objects.get_or_create(
                    user=user,
                    badge_type=badge_type.value
                )
        
        # Check engagement badge
        if user.total_likes_given >= BADGE_THRESHOLDS.get(BadgeType.HIGH_ENGAGER, 0):
            Badge.objects.get_or_create(
                user=user,
                badge_type=BadgeType.HIGH_ENGAGER.value
            )


@shared_task
def send_export_email(export_id, user_email):
    """Send export download link via email"""
    from django.core.mail import send_mail
    
    # Implementation depends on email backend setup
    pass


@shared_task
def cleanup_old_exports():
    """Delete expired data exports"""
    from .models import DataExport
    DataExport.objects.filter(expires_at__lt=timezone.now()).delete()


# ============================================
# ROLE LIFECYCLE: Daily Role Expiration Task
# ============================================

@shared_task
def expire_roles():
    """
    ============================================
    ROLE LIFECYCLE AUTOMATION
    ============================================
    
    Daily Celery Beat task (runs at 02:00 UTC).
    
    Process:
    1. Queries all active StudentRole records where end_date < now
    2. For each expired role:
       a. Creates a detailed AuditLog entry with full state snapshot
       b. Sets is_active = False on the role
       c. Updates the user's base role if no other leadership roles exist
       d. Sends notification to the officer who assigned the role
    3. Logs summary of expired roles
    
    This ensures leadership positions automatically revert
    without manual intervention.
    """
    now = timezone.now()
    
    # ============================================
    # Find all roles that have passed their end_date
    # ============================================
    expired_roles = StudentRole.objects.filter(
        is_active=True,
        end_date__lt=now
    ).select_related('user', 'assigned_by')
    
    expired_count = expired_roles.count()
    
    if expired_count == 0:
        logger.info("expire_roles: No expired roles found")
        return f"No expired roles to process at {now.isoformat()}"
    
    logger.info(f"expire_roles: Processing {expired_count} expired roles")
    
    notifier = NotificationService()
    expired_details = []
    
    for role in expired_roles:
        try:
            # ============================================
            # Step 1: Capture BEFORE state for audit
            # ============================================
            before_state = {
                'id': str(role.id),
                'user_id': str(role.user.id),
                'user_name': role.user.full_name,
                'role': role.role,
                'scope_type': role.scope_type,
                'scope_id': str(role.scope_id),
                'scope_name': role.scope_name,
                'start_date': role.start_date.isoformat(),
                'end_date': role.end_date.isoformat(),
                'is_active': role.is_active,
                'assigned_by_id': str(role.assigned_by.id) if role.assigned_by else None,
                'assigned_by_name': role.assigned_by.full_name if role.assigned_by else None,
            }
            
            # ============================================
            # Step 2: Create AuditLog BEFORE expiring
            # ============================================
            AuditLog.objects.create(
                action='ROLE_EXPIRED',
                performed_by=None,  # System action
                target_user=role.user,
                target_type='StudentRole',
                target_id=str(role.id),
                before_state=before_state,
                after_state={
                    'is_active': False,
                    'revocation_reason': 'Role term ended (automatic expiration)',
                    'revoked_at': now.isoformat(),
                    'revoked_by': None,  # System
                },
                ip_address='system',
                user_agent='Celery/expire_roles',
                metadata={
                    'task': 'expire_roles',
                    'executed_at': now.isoformat(),
                    'trigger': 'end_date_passed',
                    'end_date': role.end_date.isoformat(),
                    'current_time': now.isoformat(),
                }
            )
            
            # ============================================
            # Step 3: Expire the role
            # ============================================
            role.expire(reason="Role term ended (automatic expiration)")
            
            # ============================================
            # Step 4: Notify the officer who assigned the role
            # ============================================
            if role.assigned_by:
                try:
                    notifier.send_push_notification(
                        role.assigned_by,
                        "Role Expired Automatically",
                        (
                            f"The {role.get_role_display()} role assigned to "
                            f"{role.user.full_name} ({role.scope_name}) has expired "
                            f"as of {role.end_date.strftime('%B %d, %Y')}."
                        ),
                        {
                            'type': 'role_expired',
                            'role_id': str(role.id),
                            'user_name': role.user.full_name,
                            'scope_name': role.scope_name,
                        }
                    )
                except Exception as notify_error:
                    logger.warning(
                        f"Failed to send expiration notification for role {role.id}: {notify_error}"
                    )
            
            # ============================================
            # Step 5: Notify the user whose role expired
            # ============================================
            try:
                notifier.send_push_notification(
                    role.user,
                    "Your Role Has Expired",
                    (
                        f"Your position as {role.get_role_display()} for "
                        f"{role.scope_name} has ended as of "
                        f"{role.end_date.strftime('%B %d, %Y')}. "
                        f"Thank you for your service!"
                    ),
                    {
                        'type': 'your_role_expired',
                        'role_id': str(role.id),
                        'role': role.role,
                        'scope_name': role.scope_name,
                    }
                )
            except Exception as notify_error:
                logger.warning(
                    f"Failed to send user notification for role {role.id}: {notify_error}"
                )
            
            expired_details.append({
                'role_id': str(role.id),
                'user': role.user.full_name,
                'role': role.get_role_display(),
                'scope': role.scope_name,
            })
            
            logger.info(
                f"Expired role: {role.user.full_name} — {role.get_role_display()} "
                f"({role.scope_name}) — Ended: {role.end_date.date()}"
            )
            
        except Exception as e:
            logger.error(f"Failed to expire role {role.id}: {e}", exc_info=True)
            # Continue processing other roles even if one fails
    
    # ============================================
    # Summary
    # ============================================
    summary = {
        'total_processed': expired_count,
        'details': expired_details,
        'executed_at': now.isoformat(),
    }
    
    logger.info(f"expire_roles completed: {json.dumps(summary, indent=2)}")
    
    return f"Expired {expired_count} roles at {now.isoformat()}"


# ============================================
# ROLE LIFECYCLE: Upcoming Expiration Warning
# ============================================

@shared_task
def notify_upcoming_role_expirations():
    """
    Weekly task: Notify officers about roles expiring in the next 7 days.
    
    This gives officers time to:
    - Renew roles that should continue
    - Find replacements for outgoing leaders
    - Plan smooth transitions
    """
    now = timezone.now()
    week_from_now = now + timedelta(days=7)
    
    # Find roles expiring in the next 7 days
    expiring_soon = StudentRole.objects.filter(
        is_active=True,
        end_date__gte=now,
        end_date__lte=week_from_now,
    ).select_related('user', 'assigned_by')
    
    if expiring_soon.count() == 0:
        return "No roles expiring in the next 7 days"
    
    notifier = NotificationService()
    
    for role in expiring_soon:
        if role.assigned_by:
            days_left = role.days_remaining
            
            notifier.send_push_notification(
                role.assigned_by,
                "Role Expiring Soon",
                (
                    f"The {role.get_role_display()} role for {role.user.full_name} "
                    f"({role.scope_name}) will expire in {days_left} day(s) on "
                    f"{role.end_date.strftime('%B %d, %Y')}. "
                    f"Renew if needed."
                ),
                {
                    'type': 'role_expiring_soon',
                    'role_id': str(role.id),
                    'days_remaining': days_left,
                    'user_name': role.user.full_name,
                    'scope_name': role.scope_name,
                }
            )
    
    return f"Sent {expiring_soon.count()} upcoming expiration notifications"


# ============================================
# ROLE LIFECYCLE: Session Cleanup
# ============================================

@shared_task
def cleanup_expired_sessions():
    """
    Daily task: Clean up expired user sessions.
    """
    now = timezone.now()
    
    expired_sessions = UserSession.objects.filter(
        is_active=True,
        expires_at__lt=now,
    )
    
    count = expired_sessions.count()
    expired_sessions.update(is_active=False)
    
    logger.info(f"Cleaned up {count} expired sessions")
    return f"Cleaned up {count} expired sessions"


# ============================================
# ROLE LIFECYCLE: Audit Log Cleanup
# ============================================

@shared_task
def archive_old_audit_logs():
    """
    Monthly task: Archive audit logs older than 1 year.
    
    In production:
    1. Query AuditLog entries older than 1 year
    2. Serialize to compressed Parquet format
    3. Upload to S3 Glacier Deep Archive
    4. Delete from live PostgreSQL database
    
    For now: Log count of archivable entries.
    """
    one_year_ago = timezone.now() - timedelta(days=365)
    
    old_logs = AuditLog.objects.filter(created_at__lt=one_year_ago)
    count = old_logs.count()
    
    if count == 0:
        return "No audit logs to archive"
    
    # In production, this would:
    # 1. Serialize to Parquet
    # 2. Upload to cold storage
    # 3. Delete from DB
    
    logger.info(
        f"Audit log archive: {count} entries older than {one_year_ago.date()} "
        f"ready for archival"
    )
    
    # For development: Just log, don't delete
    # In production: Uncomment the deletion after successful archive
    # old_logs.delete()
    
    return f"Identified {count} audit logs for archival (older than {one_year_ago.date()})"