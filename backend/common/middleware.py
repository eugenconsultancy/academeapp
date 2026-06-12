# backend/common/middleware.py

from django.utils import timezone
from django.core.cache import cache
from django.contrib.auth import get_user_model

User = get_user_model()


class UpdateLastSeenMiddleware:
    """
    Updates the user's last_activity timestamp on each authenticated request.
    Throttled to once per 60 seconds to reduce database writes.
    Uses the confirmed `last_activity` field on the User model.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if request.user.is_authenticated:
            cache_key = f'last_seen_throttle:{request.user.id}'
            if not cache.get(cache_key):
                User.objects.filter(id=request.user.id).update(
                    last_activity=timezone.now()
                )
                cache.set(cache_key, True, timeout=60)

        return response


class RateLimitMiddleware:
    """
    Basic rate limiting middleware placeholder.
    Specific rate limits are applied at the view/endpoint level
    using the check_rate_limit helper in each API module.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response