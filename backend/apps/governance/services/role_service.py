"""
Role Service - Manages student leadership role lifecycle.
Handles assignment, revocation, expiration, and history tracking.
"""
from django.utils import timezone
from datetime import timedelta
from apps.governance.models import RoleHistory, AuditLog
from apps.governance.services.audit_service import AuditService
import logging

logger = logging.getLogger(__name__)


class RoleService:
    """Service for managing student leadership roles."""

    @staticmethod
    def assign_role(
        user,
        role: str,
        scope_type: str,
        scope_name: str,
        start_date,
        end_date,
        assigned_by,
        reason: str = '',
    ) -> RoleHistory:
        """
        Assign a leadership role to a user.
        
        Args:
            user: User receiving the role
            role: Role type (class_rep, student_leader, faculty_rep)
            scope_type: Scope type (class, department, faculty, institution)
            scope_name: Human-readable scope name
            start_date: When the role becomes effective
            end_date: When the role expires
            assigned_by: User assigning the role
            reason: Reason for assignment
        
        Returns:
            RoleHistory record
        """
        # Update user's role
        user.role = role
        user.save(update_fields=['role'])
        
        # Create role history record
        history = RoleHistory.objects.create(
            user=user,
            role=role,
            scope_type=scope_type,
            scope_name=scope_name,
            action='assigned',
            performed_by=assigned_by,
            reason=reason,
            effective_from=start_date,
            effective_to=end_date,
            metadata={
                'assigned_by_name': assigned_by.full_name if assigned_by else 'Unknown',
                'assigned_at': timezone.now().isoformat(),
            }
        )
        
        # Audit log
        AuditService.log_action(
            action='ROLE_ASSIGNED',
            performed_by=assigned_by,
            target_user=user,
            target_type='RoleAssignment',
            target_id=str(history.id),
            after_state={
                'role': role,
                'scope_type': scope_type,
                'scope_name': scope_name,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
            },
            severity='info',
        )
        
        logger.info(f"Role '{role}' assigned to {user.full_name} by {assigned_by}")
        return history

    @staticmethod
    def revoke_role(
        user,
        revoked_by,
        reason: str = '',
    ) -> RoleHistory:
        """
        Revoke a user's leadership role.
        """
        previous_role = user.role
        
        # Revert to student
        user.role = 'student'
        user.save(update_fields=['role'])
        
        # Find and expire active role assignments
        from apps.accounts.models import StudentRole
        StudentRole.objects.filter(
            user=user,
            is_active=True,
            role=previous_role
        ).update(
            is_active=False,
            revocation_reason=reason
        )
        
        # Create history record
        history = RoleHistory.objects.create(
            user=user,
            role=previous_role,
            scope_type='',
            scope_name='',
            action='revoked',
            performed_by=revoked_by,
            reason=reason,
            effective_from=timezone.now(),
            metadata={
                'revoked_by_name': revoked_by.full_name if revoked_by else 'Unknown',
                'revoked_at': timezone.now().isoformat(),
                'previous_role': previous_role,
            }
        )
        
        # Audit log
        AuditService.log_action(
            action='ROLE_REVOKED',
            performed_by=revoked_by,
            target_user=user,
            target_type='RoleRevocation',
            target_id=str(history.id),
            before_state={'role': previous_role},
            after_state={'role': 'student', 'reason': reason},
            severity='warning',
        )
        
        logger.info(f"Role '{previous_role}' revoked from {user.full_name}")
        return history

    @staticmethod
    def get_expiring_roles(days: int = 7) -> list:
        """
        Get roles expiring within the next N days.
        """
        from apps.accounts.models import StudentRole
        
        cutoff = timezone.now() + timedelta(days=days)
        
        expiring = StudentRole.objects.filter(
            is_active=True,
            end_date__lte=cutoff,
            end_date__gt=timezone.now(),
        ).select_related('user', 'assigned_by')
        
        return [
            {
                'id': str(role.id),
                'user_id': str(role.user.id),
                'user_name': role.user.full_name,
                'role': role.role,
                'end_date': role.end_date.isoformat(),
                'days_remaining': (role.end_date - timezone.now()).days,
            }
            for role in expiring
        ]

    @staticmethod
    def get_role_history(user=None, limit: int = 50, offset: int = 0) -> tuple:
        """
        Get role assignment history.
        """
        queryset = RoleHistory.objects.select_related('user', 'performed_by').all()
        
        if user:
            queryset = queryset.filter(user=user)
        
        total = queryset.count()
        results = queryset[offset:offset + limit]
        
        return results, total