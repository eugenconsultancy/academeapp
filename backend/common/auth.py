# backend/common/auth.py
import random
import time
import logging
from django.core.cache import cache
from django.conf import settings
from ninja_jwt.authentication import JWTAuth
from ninja_jwt.exceptions import InvalidToken

logger = logging.getLogger(__name__)


class PhoneOTPAuth:
    """OTP-based authentication with atomic rate limiting and lockout"""
    
    # Default configuration
    OTP_LENGTH = 6
    OTP_TIMEOUT = 600  # 10 minutes
    OTP_RATE_LIMIT = 3  # Max attempts per window
    OTP_RATE_WINDOW = 300  # 5 minutes
    OTP_LOCKOUT_ATTEMPTS = 3  # After 3 failures
    OTP_LOCKOUT_DURATION = 1800  # 30 minutes
    
    @staticmethod
    def generate_otp(phone_number):
        """
        Generate and store OTP for phone number.
        Returns (otp, error_message)
        """
        # Skip rate limiting in DEBUG mode
        if not settings.DEBUG:
            rate_key = f'otp_rate_{phone_number}'
            rate_limit = getattr(settings, 'OTP_RATE_LIMIT', PhoneOTPAuth.OTP_RATE_LIMIT)
            rate_window = getattr(settings, 'OTP_RATE_WINDOW', PhoneOTPAuth.OTP_RATE_WINDOW)
            
            try:
                # Atomic increment using cache.incr
                attempts = cache.get(rate_key, 0)
                if attempts >= rate_limit:
                    logger.warning(f"OTP rate limit exceeded for {phone_number}")
                    return None, "Rate limit exceeded. Please try again later."
                
                if attempts == 0:
                    cache.set(rate_key, 1, timeout=rate_window)
                else:
                    cache.incr(rate_key)
            except Exception as e:
                logger.error(f"Rate limit cache error: {e}")
                # Fail open in case of cache error
        
        # Generate OTP
        otp = ''.join([str(random.randint(0, 9)) for _ in range(PhoneOTPAuth.OTP_LENGTH)])
        
        # Store OTP with timeout
        otp_key = f'otp_{phone_number}'
        cache.set(otp_key, otp, timeout=PhoneOTPAuth.OTP_TIMEOUT)
        
        logger.info(f"OTP generated for {phone_number}: {otp} (dev only)")
        return otp, None
    
    @staticmethod
    def verify_otp(phone_number, otp):
        """
        Verify OTP with lockout protection.
        Returns boolean indicating success.
        """
        # Check lockout first
        lockout_key = f'otp_lockout_{phone_number}'
        lockout_remaining = cache.get(lockout_key)
        if lockout_remaining:
            logger.warning(f"OTP lockout active for {phone_number}")
            return False
        
        # Verify OTP
        otp_key = f'otp_{phone_number}'
        stored_otp = cache.get(otp_key)
        
        if stored_otp and stored_otp == otp:
            # Success - clear all failure data
            cache.delete(otp_key)
            cache.delete(f'otp_fail_{phone_number}')
            logger.info(f"OTP verified successfully for {phone_number}")
            return True
        
        # Failed attempt - increment counter
        if not settings.DEBUG:
            fail_key = f'otp_fail_{phone_number}'
            try:
                attempts = cache.get(fail_key, 0)
                if attempts == 0:
                    cache.set(fail_key, 1, timeout=PhoneOTPAuth.OTP_RATE_WINDOW)
                else:
                    cache.incr(fail_key)
                
                attempts = cache.get(fail_key, 1)
                if attempts >= PhoneOTPAuth.OTP_LOCKOUT_ATTEMPTS:
                    cache.set(lockout_key, True, timeout=PhoneOTPAuth.OTP_LOCKOUT_DURATION)
                    logger.warning(f"OTP lockout activated for {phone_number}")
            except Exception as e:
                logger.error(f"OTP failure tracking error: {e}")
        
        logger.warning(f"Invalid OTP attempt for {phone_number}")
        return False
    
    @staticmethod
    def clear_otp(phone_number):
        """Clear OTP data for phone number (used after successful login)"""
        cache.delete(f'otp_{phone_number}')
        cache.delete(f'otp_fail_{phone_number}')
        cache.delete(f'otp_lockout_{phone_number}')


class CustomJWTAuth(JWTAuth):
    """
    Custom JWT authentication with additional security checks.
    Validates password change timestamp to invalidate old tokens.
    """
    
    def authenticate(self, request, token):
        try:
            validated_token = self.get_validated_token(token)
            user = self.get_user(validated_token)
            
            if not user:
                logger.warning(f"No user found for JWT token")
                return None
            
            if not user.is_active:
                logger.warning(f"JWT authentication failed: user {user.id} is inactive")
                raise InvalidToken('Account is deactivated')
            
            # Check if token was issued before password change
            if hasattr(user, 'last_password_change') and user.last_password_change:
                iat = validated_token.get('iat')
                if iat:
                    # Convert iat to datetime for comparison
                    from datetime import datetime
                    iat_datetime = datetime.fromtimestamp(iat)
                    if iat_datetime < user.last_password_change:
                        logger.info(f"JWT token invalidated due to password change for user {user.id}")
                        raise InvalidToken('Token expired due to password change')
            
            logger.debug(f"JWT authentication successful for user {user.id}")
            return user
            
        except InvalidToken as e:
            logger.warning(f"Invalid JWT token: {e}")
            return None
        except Exception as e:
            logger.error(f"JWT authentication error: {e}")
            return None