from functools import wraps
from django.core.cache import cache
from django.http import JsonResponse
from django.conf import settings

def rate_limit(key_func, limit=None, window=None):
    """
    Generic rate limiting decorator.
    
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
            
            identifier = key_func(request)
            if identifier:
                cache_key = f'rate_limit_{identifier}'
                count = cache.get(cache_key, 0)
                if count >= rate_limit_val:
                    return JsonResponse({'error': 'Rate limit exceeded'}, status=429)
                cache.set(cache_key, count + 1, timeout=rate_window)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator