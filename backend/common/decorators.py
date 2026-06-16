# backend/common/decorators.py
"""
Rate limiting decorators for Django views.

Provides:
- rate_limit: Generic decorator with configurable key function
- public_rate_limit: IP-based rate limiting for public endpoints
- user_rate_limit: User-based rate limiting for authenticated endpoints

All decorators use atomic Redis INCR operations to prevent race conditions
under concurrent load. Fail closed in production for security.
"""

from functools import wraps
import time
from typing import Callable, Optional

from django.core.cache import cache
from django.http import JsonResponse, HttpResponse
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def _get_client_ip(request) -> str:
    """
    Extract client IP address from request.
    
    Trusts X-Forwarded-For only when proxy is configured.
    Falls back to REMOTE_ADDR.
    
    Args:
        request: Django HTTP request
        
    Returns:
        IP address string
    """
    # Check if we're behind a trusted proxy
    use_x_forwarded = getattr(settings, 'USE_X_FORWARDED_HOST', False)
    
    if use_x_forwarded:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR', '')
        if x_forwarded_for:
            # Take the first IP (client's original IP)
            # In a chain: client, proxy1, proxy2
            # The first IP is the original client
            return x_forwarded_for.split(',')[0].strip()
    
    return request.META.get('REMOTE_ADDR', 'unknown')


def _build_rate_limit_response(
    limit: int,
    remaining: int,
    retry_after: int,
    message: str = "Rate limit exceeded. Please try again later.",
) -> JsonResponse:
    """
    Build a standardized 429 Too Many Requests response.
    
    Includes:
    - X-RateLimit-* headers for client information
    - Retry-After header for automatic retry scheduling
    - JSON body with error details
    
    Args:
        limit: Maximum requests allowed in the window
        remaining: Requests remaining (usually 0)
        retry_after: Seconds until the window resets
        message: Human-readable error message
        
    Returns:
        JsonResponse with status 429
    """
    response = JsonResponse(
        {
            'error': message,
            'retry_after': retry_after,
            'limit': limit,
            'remaining': remaining,
        },
        status=429,
    )
    
    # Standard rate limit headers
    response['X-RateLimit-Limit'] = str(limit)
    response['X-RateLimit-Remaining'] = str(remaining)
    response['X-RateLimit-Reset'] = str(int(time.time()) + retry_after)
    response['Retry-After'] = str(retry_after)
    
    return response


def _atomic_increment(key: str, timeout: int, maximum: int) -> tuple:
    """
    Atomically increment a rate limit counter.
    
    Uses Redis INCR with fallback to ADD for new keys.
    Prevents race conditions where concurrent requests all see count=0.
    
    Args:
        key: Cache key for the counter
        timeout: TTL for the key in seconds
        maximum: Maximum allowed count before rate limiting
        
    Returns:
        Tuple of (allowed: bool, current_count: int)
        
    Raises:
        Exception: If cache operations fail (caught by caller)
    """
    try:
        # Atomic increment - works if key exists
        count = cache.incr(key)
    except ValueError:
        # Key doesn't exist, create with TTL (atomic add)
        created = cache.add(key, 1, timeout=timeout)
        if created:
            count = 1
        else:
            # Another request created the key between our incr and add
            try:
                count = cache.incr(key)
            except ValueError:
                # Fallback: key somehow disappeared
                cache.add(key, 1, timeout=timeout)
                count = 1
    
    allowed = count <= maximum
    return allowed, count


def rate_limit(
    key_func: Callable,
    limit: Optional[int] = None,
    window: Optional[int] = None,
    fail_open: Optional[bool] = None,
):
    """
    Generic rate limiting decorator with atomic operations.
    
    Args:
        key_func: Function that takes request and returns a unique identifier string.
                 Return None to skip rate limiting for this request.
        limit: Maximum requests allowed in the window (default from settings)
        window: Time window in seconds (default from settings)
        fail_open: If True, allow requests when cache is unavailable.
                   If False/None, fails closed in production, open in DEBUG.
    
    Usage:
        @rate_limit(lambda request: f"user_{request.user.id}", limit=5, window=60)
        def my_view(request):
            ...
    
        @rate_limit(lambda request: request.META.get('REMOTE_ADDR'), limit=10, window=60)
        def public_view(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Get configuration
            rate_limit_val = limit or getattr(settings, 'RATE_LIMIT_DEFAULT', 10)
            rate_window = window or getattr(settings, 'RATE_WINDOW_DEFAULT', 60)
            
            # Determine fail_open behavior
            _fail_open = fail_open
            if _fail_open is None:
                _fail_open = getattr(settings, 'DEBUG', False)
            
            # Get identifier for rate limiting
            try:
                identifier = key_func(request)
                if identifier is None:
                    # Key function opted out of rate limiting
                    return view_func(request, *args, **kwargs)
            except Exception as e:
                logger.warning(f"Rate limit key function failed: {e}")
                # Fall back to IP-based limiting instead of bypassing
                identifier = f"ip_fallback_{_get_client_ip(request)}"
            
            cache_key = f'rl:{identifier}'
            
            try:
                allowed, count = _atomic_increment(
                    cache_key, rate_window, rate_limit_val
                )
                
                if not allowed:
                    logger.warning(
                        f"Rate limit exceeded for {identifier}: "
                        f"{count}/{rate_limit_val} in {rate_window}s"
                    )
                    
                    # Get TTL for accurate Retry-After
                    try:
                        ttl = cache.ttl(cache_key)
                        if ttl is None or ttl <= 0:
                            ttl = rate_window
                    except (AttributeError, Exception):
                        ttl = rate_window
                    
                    return _build_rate_limit_response(
                        limit=rate_limit_val,
                        remaining=max(0, rate_limit_val - count),
                        retry_after=ttl,
                    )
                    
            except Exception as e:
                logger.error(f"Rate limit cache error for {identifier}: {e}")
                
                if not _fail_open:
                    # Fail closed - reject request for safety
                    logger.critical(
                        f"Rate limiting cache unavailable, failing closed"
                    )
                    return JsonResponse(
                        {
                            'error': 'Service temporarily unavailable. '
                                     'Please try again later.',
                            'retry_after': 60,
                        },
                        status=503,
                    )
                # Fail open in DEBUG mode - allow request
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def public_rate_limit(limit: Optional[int] = None, window: Optional[int] = None):
    """
    Rate limit decorator for public endpoints (uses client IP address).
    
    Args:
        limit: Maximum requests allowed in the window
        window: Time window in seconds
    
    Usage:
        @public_rate_limit(limit=10, window=60)
        def public_endpoint(request):
            ...
    """
    def key_func(request):
        return f"ip_{_get_client_ip(request)}"
    
    return rate_limit(key_func, limit=limit, window=window)


def user_rate_limit(limit: Optional[int] = None, window: Optional[int] = None):
    """
    Rate limit decorator for authenticated endpoints (uses user ID).
    Falls back to IP-based limiting for unauthenticated users.
    
    Args:
        limit: Maximum requests allowed in the window
        window: Time window in seconds
    
    Usage:
        @user_rate_limit(limit=5, window=60)
        def user_endpoint(request):
            ...
    """
    def key_func(request):
        if hasattr(request, 'user') and request.user.is_authenticated:
            return f"user_{request.user.id}"
        # Fallback to IP for unauthenticated users
        return f"ip_{_get_client_ip(request)}"
    
    return rate_limit(key_func, limit=limit, window=window)


def otp_rate_limit(limit: Optional[int] = None, window: Optional[int] = None):
    """
    Rate limit decorator specifically for OTP endpoints.
    Uses phone number from request body if available.
    
    Args:
        limit: Maximum OTP requests allowed in the window
        window: Time window in seconds
    
    Usage:
        @otp_rate_limit(limit=3, window=300)
        def request_otp(request):
            ...
    """
    def key_func(request):
        # Try to extract phone number from request data
        phone = None
        if request.method == 'POST':
            try:
                import json
                body = json.loads(request.body)
                phone = body.get('phone_number') or body.get('phone')
            except (json.JSONDecodeError, AttributeError):
                pass
        
        if phone:
            return f"otp_{phone}"
        
        # Fallback to IP
        return f"otp_ip_{_get_client_ip(request)}"
    
    return rate_limit(key_func, limit=limit, window=window)