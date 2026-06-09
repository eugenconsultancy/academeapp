import random
import time
from django.core.cache import cache
from django.conf import settings
from ninja_jwt.authentication import JWTAuth
from ninja_jwt.exceptions import InvalidToken

class PhoneOTPAuth:
    @staticmethod
    def generate_otp(phone_number):
        # ✅ Bypass rate limiting in DEBUG mode
        if not settings.DEBUG:
            rate_key = f'otp_rate_{phone_number}'
            rate_limit = getattr(settings, 'OTP_RATE_LIMIT', 5)
            rate_window = getattr(settings, 'OTP_RATE_WINDOW', 300)
            
            attempts = cache.get(rate_key, 0)
            if attempts >= rate_limit:
                return None, "Rate limit exceeded. Please try again later."
            
            cache.set(rate_key, attempts + 1, timeout=rate_window)
        
        otp = str(random.randint(100000, 999999))
        cache.set(f'otp_{phone_number}', otp, timeout=600)  # 10 min
        
        return otp, None
    
    @staticmethod
    def verify_otp(phone_number, otp):
        # Check lockout
        lockout_key = f'otp_lockout_{phone_number}'
        if cache.get(lockout_key):
            return False
            
        otp_key = f'otp_{phone_number}'
        stored_otp = cache.get(otp_key)
        
        if stored_otp and stored_otp == otp:
            cache.delete(otp_key)
            return True
        
        # ✅ Bypass failure counting in DEBUG mode
        if not settings.DEBUG:
            fail_key = f'otp_fail_{phone_number}'
            attempts = cache.get(fail_key, 0) + 1
            if attempts >= 3:
                cache.set(lockout_key, True, timeout=1800)  # 30 min lockout
            else:
                cache.set(fail_key, attempts, timeout=600)
        
        return False

class CustomJWTAuth(JWTAuth):
    def authenticate(self, request, token):
        try:
            validated_token = self.get_validated_token(token)
            user = self.get_user(validated_token)
            
            if not user.is_active:
                raise InvalidToken('Account is deactivated')
            
            if hasattr(user, 'last_password_change') and user.last_password_change:
                iat = validated_token.get('iat')
                if iat and user.last_password_change.timestamp() > iat:
                    raise InvalidToken('Token expired due to password change')
            
            return user
        except Exception:
            return None