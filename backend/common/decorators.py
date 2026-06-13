# backend/common/decorators.py
from functools import wraps
from django.core.cache import cache
from django.http import JsonResponse
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def rate_limit(key_func, limit=None, window=None):
    """
    Generic rate limiting decorator with atomic operations.
    
    Usage:
        @rate_limit(lambda request: request.user.id, limit=5, window=60)
        def my_view(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            rate_limit_val = limit or getattr(settings, 'RATE_LIMIT_DEFAULT', 10)
            rate_window = window or getattr(settings, 'RATE_WINDOW_DEFAULT', 60)
            
            # Get identifier - handle anonymous users gracefully
            try:
                identifier = key_func(request)
                if identifier is None:
                    return view_func(request, *args, **kwargs)
            except Exception as e:
                logger.warning(f"Rate limit key function failed: {e}")
                return view_func(request, *args, **kwargs)
            
            cache_key = f'rate_limit_{identifier}'
            
            try:
                # Use atomic increment for better concurrency handling
                count = cache.get(cache_key, 0)
                
                if count >= rate_limit_val:
                    logger.warning(f"Rate limit exceeded for {identifier}")
                    return JsonResponse({
                        'error': 'Rate limit exceeded. Please try again later.',
                        'retry_after': rate_window
                    }, status=429)
                
                # Atomic increment - set only if not exists
                if count == 0:
                    cache.set(cache_key, 1, timeout=rate_window)
                else:
                    cache.incr(cache_key)
                    
            except Exception as e:
                logger.error(f"Rate limit cache error: {e}")
                # Fail open - allow request if cache fails
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def public_rate_limit(limit=None, window=None):
    """Rate limit decorator for public endpoints (uses IP address)"""
    def key_func(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return f"ip_{x_forwarded_for.split(',')[0].strip()}"
        return f"ip_{request.META.get('REMOTE_ADDR', 'unknown')}"
    return rate_limit(key_func, limit=limit, window=window)


def user_rate_limit(limit=None, window=None):
    """Rate limit decorator for authenticated endpoints (uses user ID)"""
    def key_func(request):
        if request.user.is_authenticated:
            return f"user_{request.user.id}"
        # Fallback to IP for unauthenticated
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return f"ip_{x_forwarded_for.split(',')[0].strip()}"
        return f"ip_{request.META.get('REMOTE_ADDR', 'unknown')}"
    return rate_limit(key_func, limit=limit, window=window)