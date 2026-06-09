from celery import shared_task
from django.utils import timezone
from apps.governance.services.stats_service import StatsService
from apps.governance.services.role_service import RoleService
from apps.governance.models import AuditLog, AuditArchive
from apps.notifications.services import NotificationService
import logging

logger = logging.getLogger(__name__)


@shared_task
def generate_daily_stats():
    """
    Generate daily platform statistics snapshot.
    Runs at midnight UTC via Celery Beat.
    """
    try:
        stats = StatsService.generate_daily_stats()
        logger.info(f"Daily stats generated for {stats.date}")
        return f"Stats generated: {stats.date}"
    except Exception as e:
        logger.error(f"Failed to generate daily stats: {e}")
        raise


@shared_task
def expire_roles():
    """
    Check and expire student leadership roles whose end_date has passed.
    Runs daily at 02:00 UTC via Celery Beat.
    """
    from apps.accounts.models import StudentRole
    
    now = timezone.now()
    expired_roles = StudentRole.objects.filter(
        is_active=True,
        end_date__lt=now
    ).select_related('user', 'assigned_by')
    
    count = 0
    notifier = NotificationService()
    
    for role in expired_roles:
        # Log before expiring
        from apps.governance.services.audit_service import AuditService
        AuditService.log_action(
            action='ROLE_EXPIRED',
            performed_by=None,  # System action
            target_user=role.user,
            target_type='StudentRole',
            target_id=str(role.id),
            before_state={
                'role': role.role,
                'start_date': role.start_date.isoformat(),
                'end_date': role.end_date.isoformat(),
                'assigned_by': role.assigned_by.full_name if role.assigned_by else 'Unknown',
            },
            after_state={'is_active': False},
            severity='info',
            metadata={'reason': 'Automatic expiration - end_date passed'}
        )
        
        # Expire the role
        role.is_active = False
        role.revocation_reason = 'Role term ended'
        role.save(update_fields=['is_active', 'revocation_reason'])
        
        # Remove role from user
        role.user.role = 'student'
        role.user.save(update_fields=['role'])
        
        # Notify the officer who assigned
        if role.assigned_by:
            notifier.send_push_notification(
                role.assigned_by,
                "Role Expired",
                f"The {role.get_role_display()} role for {role.user.full_name} has expired.",
                {'type': 'role_expired', 'role_id': str(role.id)}
            )
        
        count += 1
    
    logger.info(f"Expired {count} roles")
    return f"Expired {count} roles"


@shared_task
def archive_old_audit_logs():
    """
    Archive audit logs older than 1 year to cold storage.
    Runs monthly via Celery Beat.
    
    Process:
    1. Identify logs older than 365 days
    2. Serialize to compressed Parquet format
    3. Upload to S3 Glacier Deep Archive
    4. Create AuditArchive record
    5. Delete archived logs from live database
    """
    from datetime import timedelta
    import io
    import json
    import gzip
    import hashlib
    
    cutoff = timezone.now() - timedelta(days=365)
    
    old_logs = AuditLog.objects.filter(created_at__lt=cutoff)
    count = old_logs.count()
    
    if count == 0:
        logger.info("No audit logs to archive")
        return "No logs to archive"
    
    # Serialize logs to JSON lines format
    buffer = io.BytesIO()
    
    for log in old_logs.iterator(chunk_size=1000):
        record = {
            'id': str(log.id),
            'action': log.action,
            'performed_by_id': str(log.performed_by_id) if log.performed_by_id else None,
            'target_user_id': str(log.target_user_id) if log.target_user_id else None,
            'target_type': log.target_type,
            'target_id': log.target_id,
            'before_state': log.before_state,
            'after_state': log.after_state,
            'ip_address': log.ip_address,
            'user_agent': log.user_agent,
            'metadata': log.metadata,
            'severity': log.severity,
            'created_at': log.created_at.isoformat(),
        }
        buffer.write((json.dumps(record) + '\n').encode())
    
    # Compress with gzip
    compressed = gzip.compress(buffer.getvalue())
    
    # Calculate checksum
    checksum = hashlib.sha256(compressed).hexdigest()
    
    # Determine date range
    first_log = old_logs.order_by('created_at').first()
    last_log = old_logs.order_by('-created_at').first()
    
    # Generate S3 key
    archive_key = (
        f"audit-archives/"
        f"year={first_log.created_at.year}/"
        f"audit-logs-{first_log.created_at.strftime('%Y%m%d')}"
        f"-to-{last_log.created_at.strftime('%Y%m%d')}"
        f".jsonl.gz"
    )
    
    # Upload to S3 (using project's storage)
    from common.storage import S3Storage
    storage = S3Storage()
    storage.upload_file(io.BytesIO(compressed), archive_key)
    
    # Create archive record
    archive = AuditArchive.objects.create(
        archive_key=archive_key,
        date_range_start=first_log.created_at.date(),
        date_range_end=last_log.created_at.date(),
        record_count=count,
        file_size_bytes=len(compressed),
        archive_format='jsonl.gz',
        checksum=checksum,
    )
    
    # Delete archived logs
    old_logs.delete()
    
    logger.info(f"Archived {count} audit logs to {archive_key}")
    return f"Archived {count} logs to {archive_key}"


@shared_task
def send_role_expiry_reminders():
    """
    Send reminders for roles expiring in 3 days.
    Runs daily at 08:00 UTC.
    """
    expiring = RoleService.get_expiring_roles(days=3)
    notifier = NotificationService()
    
    for role in expiring:
        notifier.send_push_notification(
            role.assigned_by,
            "Role Expiring Soon",
            f"{role.user.full_name}'s {role.role} role expires in {role.days_remaining} days.",
            {'type': 'role_expiring', 'role_id': str(role.id)}
        )
    
    logger.info(f"Sent {len(expiring)} expiry reminders")
    return f"Sent {len(expiring)} reminders"