"""
Stats Service - Generates and caches platform statistics.
"""
from django.utils import timezone
from django.db.models import Count, Q, Sum
from apps.governance.models import PlatformStats
import logging

logger = logging.getLogger(__name__)


class StatsService:
    """Service for platform statistics and dashboard metrics."""

    @staticmethod
    def generate_daily_stats() -> PlatformStats:
        """
        Generate a daily snapshot of platform statistics.
        Called by Celery beat daily at midnight.
        """
        from apps.accounts.models import User, StudentRole
        from apps.announcements.models import Announcement
        from apps.found_items.models import FoundItem, Claim
        from apps.opportunities.models import Opportunity
        from apps.governance.models import AuditLog
        
        today = timezone.localtime().date()
        yesterday = today - timezone.timedelta(days=1)
        
        # User stats
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        new_users_today = User.objects.filter(created_at__date=today).count()
        total_login_count = User.objects.aggregate(total=Sum('login_count'))['total'] or 0
        
        # Announcement stats
        total_announcements = Announcement.objects.count()
        active_announcements = Announcement.objects.filter(is_active=True, expires_at__gt=timezone.now()).count()
        
        # Found items stats
        total_found_items = FoundItem.objects.count()
        claimed_items = FoundItem.objects.filter(is_claimed=True).count()
        
        # Opportunity stats
        total_opportunities = Opportunity.objects.count()
        active_opportunities = Opportunity.objects.filter(is_active=True).count()
        
        # Claim stats
        total_claims = Claim.objects.count()
        resolved_claims = Claim.objects.filter(status__in=['completed', 'approved']).count()
        
        # Report stats
        total_reports = AuditLog.objects.filter(
            action__in=['ANNOUNCEMENT_REPORTED', 'ITEM_REPORTED', 'OPPORTUNITY_REPORTED']
        ).count()
        resolved_reports = AuditLog.objects.filter(
            action__in=['ANNOUNCEMENT_REPORTED', 'ITEM_REPORTED', 'OPPORTUNITY_REPORTED'],
            metadata__resolved=True
        ).count()
        
        # Role stats
        active_roles = StudentRole.objects.filter(is_active=True).count()
        seven_days = today + timezone.timedelta(days=7)
        expiring_roles_7d = StudentRole.objects.filter(
            is_active=True,
            end_date__lte=seven_days,
            end_date__gt=timezone.now()
        ).count()
        
        stats, created = PlatformStats.objects.update_or_create(
            date=today,
            defaults={
                'total_users': total_users,
                'active_users': active_users,
                'new_users_today': new_users_today,
                'total_announcements': total_announcements,
                'active_announcements': active_announcements,
                'total_found_items': total_found_items,
                'claimed_items': claimed_items,
                'total_opportunities': total_opportunities,
                'active_opportunities': active_opportunities,
                'total_claims': total_claims,
                'resolved_claims': resolved_claims,
                'total_reports': total_reports,
                'resolved_reports': resolved_reports,
                'active_roles': active_roles,
                'expiring_roles_7d': expiring_roles_7d,
                'total_login_count': total_login_count,
                'raw_data': {
                    'generated_at': timezone.now().isoformat(),
                }
            }
        )
        
        logger.info(f"Daily stats generated for {today}")
        return stats

    @staticmethod
    def get_current_stats() -> dict:
        """
        Get the most recent platform stats snapshot.
        Falls back to generating fresh stats if none exist for today.
        """
        today = timezone.localtime().date()
        
        stats = PlatformStats.objects.filter(date=today).first()
        
        if not stats:
            stats = StatsService.generate_daily_stats()
        
        return {
            'date': stats.date.isoformat(),
            'students_count': stats.total_users,
            'active_users': stats.active_users,
            'new_users_today': stats.new_users_today,
            'announcements_count': stats.total_announcements,
            'active_announcements': stats.active_announcements,
            'found_items_count': stats.total_found_items,
            'claimed_items': stats.claimed_items,
            'opportunities_count': stats.total_opportunities,
            'active_opportunities': stats.active_opportunities,
            'total_claims': stats.total_claims,
            'resolved_claims': stats.resolved_claims,
            'total_reports': stats.total_reports,
            'resolved_reports': stats.resolved_reports,
            'active_roles': stats.active_roles,
            'expiring_roles_7d': stats.expiring_roles_7d,
            'total_login_count': stats.total_login_count,
            'role_breakdown': StatsService._get_role_breakdown(),
        }

    @staticmethod
    def _get_role_breakdown() -> dict:
        """Get count of users by role."""
        from apps.accounts.models import User
        
        breakdown = {}
        for role_choice in ['student', 'class_rep', 'student_leader', 'faculty_rep', 'admin']:
            breakdown[role_choice] = User.objects.filter(role=role_choice, is_active=True).count()
        
        return breakdown