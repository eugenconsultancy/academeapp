import random
import hashlib
from datetime import datetime, timedelta
from django.core.cache import cache
from django.conf import settings
from ninja_jwt.authentication import JWTAuth
from ninja_jwt.exceptions import InvalidToken

class PhoneOTPAuth:
    @staticmethod
    def generate_otp(phone_number):
        """Generate and store OTP for a phone number"""
        # Check rate limit
        cache_key = f'otp_attempts_{phone_number}'
        attempts = cache.get(cache_key, 0)
        
        if attempts >= settings.OTP_RATE_LIMIT:
            return None, "Rate limit exceeded. Try again later."
        
        # Generate 6-digit OTP
        otp = str(random.randint(100000, 999999))
        
        # Store OTP with expiry (10 minutes)
        otp_key = f'otp_{phone_number}'
        cache.set(otp_key, otp, timeout=600)
        
        # Increment attempts counter
        cache.set(cache_key, attempts + 1, timeout=settings.OTP_RATE_WINDOW)
        
        return otp, None
    
    @staticmethod
    def verify_otp(phone_number, otp):
        """Verify OTP for a phone number"""
        otp_key = f'otp_{phone_number}'
        stored_otp = cache.get(otp_key)
        
        if stored_otp and stored_otp == otp:
            cache.delete(otp_key)  # One-time use
            return True
        return False

class CustomJWTAuth(JWTAuth):
    def authenticate(self, request, token):
        try:
            validated_token = self.get_validated_token(token)
            user = self.get_user(validated_token)
            
            # Check if account is active
            if not user.is_active:
                raise InvalidToken('Account is deactivated')
            
            return user
        except Exception:
            return None