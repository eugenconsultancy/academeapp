from django.core.cache import cache
from django.http import JsonResponse
from django.conf import settings
import time

class RateLimitMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Only rate limit OTP endpoints
        if '/api/accounts/request-otp' in request.path:
            phone_number = request.GET.get('phone') or request.POST.get('phone')
            
            if phone_number:
                cache_key = f'otp_attempts_{phone_number}'
                attempts = cache.get(cache_key, 0)
                
                if attempts >= settings.OTP_RATE_LIMIT:
                    return JsonResponse({
                        'error': 'Too many OTP requests. Please try again later.'
                    }, status=429)
        
        response = self.get_response(request)
        return response