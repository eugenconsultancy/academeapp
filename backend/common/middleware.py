import json
from django.core.cache import cache
from django.http import JsonResponse
from django.conf import settings

class RateLimitMiddleware:
    """
    Rate limiting middleware for OTP endpoints.
    Works with Django Ninja which sends JSON in request.body.
    """
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Only apply to OTP request endpoints
        if request.path.startswith('/api/accounts/request-otp') or \
           request.path.startswith('/api/accounts/forgot-password'):
            
            # Extract phone number from JSON body (Ninja)
            phone = None
            try:
                if request.body:
                    body = json.loads(request.body)
                    phone = body.get('phone_number')
            except:
                pass
            
            # Fallback to GET/POST if JSON fails (for form data)
            if not phone:
                phone = request.POST.get('phone_number') or request.GET.get('phone_number')
            
            if phone:
                # Use settings with fallback defaults
                rate_limit = getattr(settings, 'OTP_RATE_LIMIT', 5)
                rate_window = getattr(settings, 'OTP_RATE_WINDOW', 300)  # 5 minutes
                
                cache_key = f'otp_rate_{phone}'
                attempts = cache.get(cache_key, 0)
                
                if attempts >= rate_limit:
                    return JsonResponse({'error': f'Rate limit exceeded. Try again in {rate_window//60} minutes.'}, status=429)
                
                # Increment attempts
                cache.set(cache_key, attempts + 1, timeout=rate_window)
        
        return self.get_response(request)