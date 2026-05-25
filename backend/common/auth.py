import random
import time
from django.core.cache import cache
from django.conf import settings
from ninja_jwt.authentication import JWTAuth
from ninja_jwt.exceptions import InvalidToken

class PhoneOTPAuth:
    @staticmethod
    def generate_otp(phone_number):
        # 1. Global Rate Limit (Requests per window)
        rate_key = f'otp_rate_{phone_number}'
        if cache.get(rate_key, 0) >= settings.OTP_RATE_LIMIT:
            return None, "Rate limit exceeded. Please try again later."
        
        # 2. Generate 6-digit OTP
        otp = str(random.randint(100000, 999999))
        
        # 3. Store OTP (10 min expiry)
        cache.set(f'otp_{phone_number}', otp, timeout=600)
        
        # 4. Increment rate limiter
        cache.set(rate_key, cache.get(rate_key, 0) + 1, timeout=settings.OTP_RATE_WINDOW)
        
        return otp, None
    
    @staticmethod
    def verify_otp(phone_number, otp):
        # 1. Check for Brute-force Lockout
        lockout_key = f'otp_lockout_{phone_number}'
        if cache.get(lockout_key):
            return False, "Too many failed attempts. Account temporarily locked."
            
        # 2. Verify OTP
        otp_key = f'otp_{phone_number}'
        stored_otp = cache.get(otp_key)
        
        if stored_otp and stored_otp == otp:
            cache.delete(otp_key)
            return True, None
            
        # 3. Handle Failure: Increment attempt count for lockout
        fail_key = f'otp_fail_{phone_number}'
        attempts = cache.get(fail_key, 0) + 1
        if attempts >= 3:
            cache.set(lockout_key, True, timeout=1800) # 30 min lockout
        else:
            cache.set(fail_key, attempts, timeout=600)
            
        return False, "Invalid OTP."

class CustomJWTAuth(JWTAuth):
    def authenticate(self, request, token):
        try:
            validated_token = self.get_validated_token(token)
            user = self.get_user(validated_token)
            
            # Security: Account status check
            if not user.is_active:
                raise InvalidToken('Account is deactivated')
            
            # Security: Invalidate tokens issued before last password change
            # Assumes user model has last_password_change (datetime)
            if hasattr(user, 'last_password_change') and user.last_password_change:
                iat = validated_token.get('iat')
                if iat and user.last_password_change.timestamp() > iat:
                    raise InvalidToken('Token expired due to password change')
            
            return user
        except Exception:
            return None