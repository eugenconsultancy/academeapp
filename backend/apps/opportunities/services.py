from django.utils import timezone
from .models import Opportunity

class OpportunityService:
    @staticmethod
    def get_unread_count(user):
        if not user.last_visited_opportunities:
            return Opportunity.objects.filter(is_active=True).count()
        return Opportunity.objects.filter(
            is_active=True,
            created_at__gt=user.last_visited_opportunities
        ).count()
    
    @staticmethod
    def update_last_visited(user):
        user.last_visited_opportunities = timezone.now()
        user.save(update_fields=['last_visited_opportunities'])
