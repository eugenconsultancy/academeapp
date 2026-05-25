from django.core.cache import cache
from django.http import JsonResponse
from django.conf import settings

class RateLimitMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        if request.path.startswith('/api/accounts/request-otp'):
            phone = request.POST.get('phone') or request.GET.get('phone')
            if phone:
                cache_key = f'otp_attempts_{phone}'
                attempts = cache.get(cache_key, 0)
                
                if attempts >= settings.OTP_RATE_LIMIT:
                    return JsonResponse({'error': 'Rate limit exceeded'}, status=429)
                
                # IMPORTANT: Increment the count here!
                cache.set(cache_key, attempts + 1, timeout=settings.OTP_RATE_WINDOW)
        
        return self.get_response(request)