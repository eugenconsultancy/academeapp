# C:\Users\GATARA-BJTU\academe\backend\common\middleware.py

import time
from django.utils import timezone
from django.http import JsonResponse


class RateLimitMiddleware:
    """Simple rate limiting middleware."""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.requests = {}

    def __call__(self, request):
        if request.path.startswith('/api/'):
            client_ip = self.get_client_ip(request)
            now = time.time()
            
            if client_ip in self.requests:
                timestamps = self.requests[client_ip]
                # Remove requests older than 60 seconds
                self.requests[client_ip] = [t for t in timestamps if now - t < 60]
                
                if len(self.requests[client_ip]) > 100:  # 100 requests per minute
                    return JsonResponse(
                        {'error': 'Too many requests. Please slow down.'},
                        status=429
                    )
                
                self.requests[client_ip].append(now)
            else:
                self.requests[client_ip] = [now]

        response = self.get_response(request)
        return response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class UpdateLastSeenMiddleware:
    """
    Updates the authenticated user's last_seen timestamp on every API request.
    This ensures online presence is accurate even without WebSocket activity.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Only update for authenticated API requests
        if request.path.startswith('/api/') and hasattr(request, 'auth') and request.auth:
            try:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                User.objects.filter(id=request.auth.id).update(last_seen=timezone.now())
            except Exception:
                pass  # Silently fail - presence is non-critical
        
        return response