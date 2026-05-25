from django.core.cache import cache
from django.db.models import Q
from django.utils import timezone
from .models import Announcement
from datetime import timedelta
import hashlib


class AnnouncementService:
    CACHE_TIMEOUT = 3600  # 1 hour

    @staticmethod
    def _get_feed_cache_key(user):
        version = cache.get("announcements_cache_version", 1)
        # Use getattr to avoid AttributeError if User model lacks 'institution'
        institution = getattr(user, 'institution', 'unknown')
        scopes = [f"institution:{institution}"]

        from apps.classes.models import ClassGroup
        class_groups = ClassGroup.objects.filter(students=user)
        for cg in class_groups:
            scopes.append(f"class:{cg.id}")

        scopes.sort()
        scope_hash = hashlib.md5('|'.join(scopes).encode()).hexdigest()
        return f"feed:v{version}:user:{scope_hash}"

    @staticmethod
    def get_visible_announcements(user):
        cache_key = AnnouncementService._get_feed_cache_key(user)
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        now = timezone.now()
        announcements = Announcement.objects.filter(
            is_active=True,
            expires_at__gt=now
        ).filter(
            Q(target='entire_institution') |
            Q(target_classes__students=user) |
            Q(target_classes__class_rep=user)
        ).distinct().order_by('-is_urgent', '-created_at').select_related('posted_by')

        cache.set(cache_key, list(announcements), AnnouncementService.CACHE_TIMEOUT)
        return announcements

    @staticmethod
    def create_announcement(user, data, class_ids=None):
        expires_at = timezone.now() + timedelta(days=data.get("expires_in_days", 21))
        announcement = Announcement.objects.create(
            title=data.get("title", ""),
            content=data.get("content", ""),
            posted_by=user,
            target=data.get("target", "entire_institution"),
            is_urgent=data.get("is_urgent", False),
            expires_at=expires_at
        )
        if class_ids:
            announcement.target_classes.add(*class_ids)
        return announcement

    @staticmethod
    def invalidate_feed_caches():
        try:
            cache.incr("announcements_cache_version")
        except ValueError:
            cache.set("announcements_cache_version", 2)