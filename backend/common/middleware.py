# backend/common/middleware.py
"""
Common middleware for the Academe platform.

Middleware Order (IMPORTANT):
    AuthenticationMiddleware must come before UpdateLastSeenMiddleware
    because request.user is set by AuthenticationMiddleware.
"""

import logging
from django.utils import timezone
from django.core.cache import cache
from django.contrib.auth import get_user_model

User = get_user_model()
logger = logging.getLogger('common')


class UpdateLastSeenMiddleware:
    """
    Updates the user's last_activity timestamp on each authenticated HTTP request.
    
    Throttled to once per 60 seconds per user to reduce database writes.
    Uses atomic cache.add() to prevent race conditions under concurrent requests.
    
    IMPORTANT: This middleware MUST be placed AFTER AuthenticationMiddleware:
    
        MIDDLEWARE = [
            ...
            'django.contrib.auth.middleware.AuthenticationMiddleware',
            'common.middleware.UpdateLastSeenMiddleware',  # AFTER Auth
            ...
        ]
    
    Performance:
        - Cache hit (within 60s): ~0.1ms (no DB query)
        - Cache miss: ~5ms (single UPDATE query)
        - Race condition safe via atomic cache.add()
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Only process authenticated users
        if hasattr(request, 'user') and request.user.is_authenticated:
            cache_key = f'last_seen_throttle:{request.user.id}'
            
            # Atomic add: returns True only if key didn't exist
            # Prevents race condition where multiple concurrent requests
            # all pass cache.get() check and trigger duplicate DB writes
            if cache.add(cache_key, True, timeout=60):
                try:
                    User.objects.filter(id=request.user.id).update(
                        last_activity=timezone.now()
                    )
                    logger.debug(
                        f"Updated last_activity for user {request.user.id}"
                    )
                except Exception as e:
                    # Fail silently - presence is non-critical
                    logger.warning(
                        f"Failed to update last_activity for user "
                        f"{request.user.id}: {e}"
                    )
        
        return response


class RateLimitMiddleware:
    """
    Placeholder middleware for global HTTP rate limiting.
    
    NOTE: This middleware is intentionally a no-op.
    Rate limiting is enforced at the view/endpoint level in each API module:
    
    - Chat:      apps/chat/api.py (60 messages/day via Redis)
    - OTP:       apps/accounts/api.py (3 requests/hour)
    - Auth:      apps/accounts/api.py (5 login attempts/minute)
    - API:       Common rate limit via Ninja throttling
    
    This middleware exists as a hook point for future global rate limiting
    implementation. Remove from MIDDLEWARE if not needed to save CPU cycles.
    
    To enable global rate limiting, implement logic in __call__ method.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # TODO: Implement global rate limiting if needed
        # Currently all rate limiting is done at the endpoint level
        response = self.get_response(request)
        return response