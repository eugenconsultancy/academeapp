# backend/common/middleware.py

from django.utils import timezone
from django.core.cache import cache
from django.contrib.auth import get_user_model

User = get_user_model()


class UpdateLastSeenMiddleware:
    """
    Updates the user's last_activity timestamp on each authenticated HTTP request.
    Throttled to once per 60 seconds to reduce database writes.
    
    IMPORTANT: This middleware MUST be placed AFTER AuthenticationMiddleware in settings.py:
    
    MIDDLEWARE = [
        ...
        'django.contrib.auth.middleware.AuthenticationMiddleware',
        'common.middleware.UpdateLastSeenMiddleware',  # Must come AFTER AuthMiddleware
        ...
    ]
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Check if user is authenticated (request.user is set by AuthenticationMiddleware)
        if hasattr(request, 'user') and request.user.is_authenticated:
            cache_key = f'last_seen_throttle:{request.user.id}'
            if not cache.get(cache_key):
                User.objects.filter(id=request.user.id).update(
                    last_activity=timezone.now()
                )
                cache.set(cache_key, True, timeout=60)
        
        return response


class RateLimitMiddleware:
    """
    Basic rate limiting middleware placeholder for HTTP requests.
    Specific rate limits are applied at the view/endpoint level
    using the check_rate_limit helper in each API module.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response