import json
import io
from django.core.cache import cache
from django.http import JsonResponse
from django.conf import settings


class RateLimitMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Only process OTP-related POST endpoints
        if request.path in ['/api/accounts/request-otp/', '/api/accounts/forgot-password/'] \
           and request.method == 'POST':

            phone = None
            raw_body = b''

            try:
                # 1. Safely read and store the body
                if request.body:
                    raw_body = request.body
                    body = json.loads(raw_body.decode('utf-8'))
                    phone = body.get('phone_number')

                # 2. Re-attach the body for Django Ninja
                request._body = raw_body
            except Exception as e:
                # If JSON parsing fails, log it and let the request proceed
                print(f"RateLimitMiddleware: unable to parse body – {e}")

            # Fallback to POST data
            if not phone:
                phone = request.POST.get('phone_number') or request.GET.get('phone_number')

            # 3. Rate limiting
            if phone:
                # ✅ Bypass rate limiting entirely when in DEBUG mode
                if settings.DEBUG:
                    return self.get_response(request)

                rate_limit = getattr(settings, 'OTP_RATE_LIMIT', 5)
                rate_window = getattr(settings, 'OTP_RATE_WINDOW', 300)

                cache_key = f'otp_rate_{phone}'
                attempts = cache.get(cache_key, 0)

                if attempts >= rate_limit:
                    return JsonResponse(
                        {'error': f'Rate limit exceeded. Try again in {rate_window // 60} minutes.'},
                        status=429,
                    )

                cache.set(cache_key, attempts + 1, timeout=rate_window)

        return self.get_response(request)