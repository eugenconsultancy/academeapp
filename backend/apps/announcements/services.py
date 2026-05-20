from django.core.cache import cache
from django.db.models import Q
from django.utils import timezone
from .models import Announcement
from datetime import timedelta  # <-- ADD THIS LINE
import hashlib 

class AnnouncementService:
    
    CACHE_TIMEOUT = 3600  # 1 hour
    
    @staticmethod
    def _get_feed_cache_key(user):
        """Generate cache key based on user's scope membership"""
        scopes = [f"institution:{user.institution}"]
        
        # Add class-specific scopes
        from apps.classes.models import ClassGroup
        class_groups = ClassGroup.objects.filter(students=user)
        for cg in class_groups:
            scopes.append(f"class:{cg.id}")
        
        # Sort for consistent key
        scopes.sort()
        scope_hash = hashlib.md5('|'.join(scopes).encode()).hexdigest()
        return f"feed:user:{scope_hash}"
    
    @staticmethod
    def get_visible_announcements(user):
        """
        Cache-first strategy for announcement feeds.
        Cache is invalidated when a new announcement is published.
        """
        cache_key = AnnouncementService._get_feed_cache_key(user)
        
        # Try cache first
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        
        # Cache miss - build from DB
        now = timezone.now()
        announcements = Announcement.objects.filter(
            is_active=True,
            expires_at__gt=now
        ).filter(
            # Scope filtering
            Q(target='entire_institution') |
            Q(target_classes__students=user) |
            Q(target_classes__class_rep=user)
        ).distinct().order_by('-is_urgent', '-created_at').select_related('posted_by')
        
        # Cache the result
        cache.set(cache_key, list(announcements), AnnouncementService.CACHE_TIMEOUT)
        
        return announcements
    
    @staticmethod
    def create_announcement(user, data):
        """Create announcement AND invalidate relevant feed caches"""
        expires_at = timezone.now() + timedelta(days=data.get("expires_in_days", 21))
        announcement = Announcement.objects.create(
            title=data.get("title", ""),
            content=data.get("content", ""),
            posted_by=user,
            target=data.get("target", "entire_institution"),
            is_urgent=data.get("is_urgent", False),
            expires_at=expires_at
        )
        
        # INVALIDATE CACHES
        # Pattern deletion - remove all feed caches
        # In production, use Redis SCAN + DELETE pattern
        cache.delete_pattern("feed:*")
        
        return announcement
    
    @staticmethod
    def invalidate_feed_caches():
        """Called by signals when announcements are modified/deleted"""
        cache.delete_pattern("feed:*")