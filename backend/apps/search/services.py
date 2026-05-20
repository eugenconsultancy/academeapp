from django.db.models import Q
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
from apps.announcements.models import Announcement
from apps.found_items.models import FoundItem
from apps.opportunities.models import Opportunity

class SearchService:
    @staticmethod
    def unified_search(query, search_type=None, user=None):
        """Unified search across multiple models"""
        results = {
            'announcements': [],
            'found_items': [],
            'opportunities': []
        }
        
        if not search_type or search_type == 'announcement':
            announcements = Announcement.objects.annotate(
                search=SearchVector('title', 'content'),
                rank=SearchRank(SearchVector('title', 'content'), SearchQuery(query))
            ).filter(
                Q(search=SearchQuery(query)) |
                Q(title__icontains=query) |
                Q(content__icontains=query),
                is_active=True
            ).order_by('-rank')[:10]
            
            results['announcements'] = [
                {
                    'id': str(a.id),
                    'title': a.title,
                    'excerpt': a.content[:200],
                    'posted_by': a.posted_by.full_name,
                    'created_at': a.created_at.isoformat()
                }
                for a in announcements
            ]
        
        if not search_type or search_type == 'found_item':
            items = FoundItem.objects.annotate(
                search=SearchVector('title', 'description'),
                rank=SearchRank(SearchVector('title', 'description'), SearchQuery(query))
            ).filter(
                Q(search=SearchQuery(query)) |
                Q(title__icontains=query) |
                Q(description__icontains=query),
                status='active'
            ).order_by('-rank')[:10]
            
            results['found_items'] = [
                {
                    'id': str(i.id),
                    'title': i.title,
                    'category': i.category,
                    'location_found': i.location_found,
                    'found_date': i.found_date.isoformat()
                }
                for i in items
            ]
        
        if not search_type or search_type == 'opportunity':
            opportunities = Opportunity.objects.annotate(
                search=SearchVector('title', 'description'),
                rank=SearchRank(SearchVector('title', 'description'), SearchQuery(query))
            ).filter(
                Q(search=SearchQuery(query)) |
                Q(title__icontains=query) |
                Q(description__icontains=query),
                is_active=True
            ).order_by('-rank')[:10]
            
            results['opportunities'] = [
                {
                    'id': str(o.id),
                    'title': o.title,
                    'category': o.category,
                    'excerpt': o.description[:200],
                    'created_at': o.created_at.isoformat()
                }
                for o in opportunities
            ]
        
        return results