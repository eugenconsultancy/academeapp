"""
Audit Service - Creates and queries audit logs.
All governance actions should pass through this service.
"""
from django.utils import timezone
from django.db import transaction
from apps.governance.models import AuditLog, AuditArchive
import logging

logger = logging.getLogger(__name__)


class AuditService:
    """Centralized audit logging for all governance actions."""

    @staticmethod
    def log_action(
        action: str,
        performed_by=None,
        target_user=None,
        target_type: str = '',
        target_id: str = '',
        before_state: dict = None,
        after_state: dict = None,
        ip_address: str = None,
        user_agent: str = None,
        metadata: dict = None,
        severity: str = 'info',
    ) -> AuditLog:
        """
        Create an audit log entry.
        
        Args:
            action: One of AuditLog.ACTION_CHOICES keys
            performed_by: User who performed the action
            target_user: User affected by the action
            target_type: Type of object affected (e.g., 'Announcement', 'Claim')
            target_id: UUID of the affected object
            before_state: State before the action
            after_state: State after the action
            ip_address: IP address of the requester
            user_agent: Browser/device info
            metadata: Additional context
            severity: 'info', 'warning', or 'critical'
        
        Returns:
            The created AuditLog instance
        """
        log = AuditLog.objects.create(
            action=action,
            performed_by=performed_by,
            target_user=target_user,
            target_type=target_type,
            target_id=target_id,
            before_state=before_state or {},
            after_state=after_state or {},
            ip_address=ip_address or '',
            user_agent=user_agent or '',
            metadata=metadata or {},
            severity=severity,
        )
        
        logger.info(
            f"Audit: [{action}] by {performed_by} | "
            f"Target: {target_type}#{target_id} | "
            f"Severity: {severity}"
        )
        
        return log

    @staticmethod
    def get_logs(
        action: str = None,
        performed_by=None,
        target_user=None,
        target_type: str = None,
        severity: str = None,
        date_from=None,
        date_to=None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple:
        """
        Query audit logs with filters.
        Returns (results, total_count).
        """
        queryset = AuditLog.objects.select_related('performed_by', 'target_user').all()
        
        if action:
            queryset = queryset.filter(action=action)
        if performed_by:
            queryset = queryset.filter(performed_by=performed_by)
        if target_user:
            queryset = queryset.filter(target_user=target_user)
        if target_type:
            queryset = queryset.filter(target_type=target_type)
        if severity:
            queryset = queryset.filter(severity=severity)
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        
        total = queryset.count()
        results = queryset[offset:offset + limit]
        
        return results, total

    @staticmethod
    def export_logs_csv(
        action: str = None,
        date_from=None,
        date_to=None,
    ) -> str:
        """
        Export audit logs as CSV string.
        """
        import csv
        import io
        
        logs, _ = AuditService.get_logs(
            action=action,
            date_from=date_from,
            date_to=date_to,
            limit=10000,
        )
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Timestamp', 'Action', 'Performed By', 'Target User', 'Target Type', 'Target ID', 'Severity', 'IP Address'])
        
        for log in logs:
            writer.writerow([
                log.created_at.isoformat(),
                log.get_action_display(),
                log.performed_by.full_name if log.performed_by else 'System',
                log.target_user.full_name if log.target_user else '',
                log.target_type,
                log.target_id,
                log.severity,
                log.ip_address,
            ])
        
        return output.getvalue()

    @staticmethod
    def get_recent_activity(limit: int = 10) -> list:
        """Get recent audit activity for dashboard display."""
        logs = AuditLog.objects.select_related('performed_by', 'target_user').order_by('-created_at')[:limit]
        
        return [
            {
                'id': str(log.id),
                'action': log.get_action_display(),
                'performed_by': log.performed_by.full_name if log.performed_by else 'System',
                'target_user': log.target_user.full_name if log.target_user else None,
                'created_at': log.created_at.isoformat(),
                'severity': log.severity,
            }
            for log in logs
        ]