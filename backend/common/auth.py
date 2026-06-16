# backend/common/auth.py
"""
Authentication utilities for the Academe platform.
Provides:
- PhoneOTPAuth: OTP generation, verification, rate limiting, lockout
- CustomJWTAuth: JWT authentication with password change validation
"""
import random
import hashlib
import time
import logging
from datetime import datetime
from typing import Optional, Tuple

from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from ninja_jwt.authentication import JWTAuth
from ninja_jwt.exceptions import InvalidToken

logger = logging.getLogger(__name__)


class PhoneOTPAuth:
    """
    OTP-based authentication with atomic rate limiting and lockout protection.
    Features:
    - Atomic rate limiting using Redis INCR (prevents race conditions)
    - Progressive lockout after repeated failures
    - Fails closed on cache errors (secure by default)
    - Configurable via Django settings
    
    Settings overrides:
        OTP_LENGTH: int (default: 6)
        OTP_TIMEOUT: int seconds (default: 600)
        OTP_RATE_LIMIT: int max attempts per window (default: 3)
        OTP_RATE_WINDOW: int window seconds (default: 300)
        OTP_LOCKOUT_ATTEMPTS: int failures before lockout (default: 3)
        OTP_LOCKOUT_DURATION: int lockout seconds (default: 1800)
    """
    
    @staticmethod
    def _get_setting(name: str, default):
        """Get setting with fallback to class default."""
        return getattr(settings, name, default)
    
    @staticmethod
    def generate_otp(phone_number: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Generate and store OTP for phone number.
        
        Args:
            phone_number: Normalized phone number
            
        Returns:
            Tuple of (otp, error_message). OTP is None on error.
        """
        # Rate limit check with atomic increment
        rate_key = f'otp_rate_{phone_number}'
        rate_limit = PhoneOTPAuth._get_setting('OTP_RATE_LIMIT', 3)
        rate_window = PhoneOTPAuth._get_setting('OTP_RATE_WINDOW', 300)
        
        if not settings.DEBUG:
            try:
                # Atomic increment - prevents race conditions
                try:
                    attempts = cache.incr(rate_key)
                except ValueError:
                    # Key doesn't exist, create with TTL
                    cache.set(rate_key, 1, timeout=rate_window)
                    attempts = 1
                
                if attempts > rate_limit:
                    logger.warning(
                        f"OTP rate limit has been exceeded for {phone_number}"
                        f"({attempts} attempts in {rate_window}s)"
                    )
                    return None, "Rate limit exceeded. Kindly try again later."
        
                    
            except Exception as e:
                logger.error(f"Rate limit cache error for {phone_number}: {e}")
                # Fail closed in production - security over availability
                if not settings.DEBUG:
                    return None, "Service temporarily unavailable. Please try again later."
        
        # Generate cryptographically random OTP
        otp_length = PhoneOTPAuth._get_setting('OTP_LENGTH', 6)
        otp = ''.join([str(random.SystemRandom().randint(0, 9)) for _ in range(otp_length)])
        
        # Store hashed OTP with timeout
        otp_key = f'otp_{phone_number}'
        otp_timeout = PhoneOTPAuth._get_setting('OTP_TIMEOUT', 600)
        hashed_otp = PhoneOTPAuth._hash_otp(otp, phone_number)
        cache.set(otp_key, hashed_otp, timeout=otp_timeout)
        
        if settings.DEBUG:
            logger.info(f"OTP generated for {phone_number}: {otp}")
        else:
            logger.info(f"OTP generated for {phone_number} (masked in production)")
        
        return otp, None
    
    @staticmethod
    def verify_otp(phone_number: str, otp: str) -> bool:
        """
        Verify OTP with lockout protection.
        
        Args:
            phone_number: Normalized phone number
            otp: OTP code to verify
            
        Returns:
            True if OTP is valid, False otherwise
        """
        # Check lockout first
        lockout_key = f'otp_lockout_{phone_number}'
        if cache.get(lockout_key):
            logger.warning(f"OTP verification blocked: lockout active for {phone_number}")
            return False
        
        # Verify OTP against stored hash
        otp_key = f'otp_{phone_number}'
        stored_hash = cache.get(otp_key)
        
        if stored_hash and stored_hash == PhoneOTPAuth._hash_otp(otp, phone_number):
            # Success - clear all failure data
            cache.delete(otp_key)
            cache.delete(f'otp_fail_{phone_number}')
            cache.delete(lockout_key)
            logger.info(f"OTP verified successfully for {phone_number}")
            return True
        
        # Failed attempt - increment counter with lockout check
        if not settings.DEBUG:
            PhoneOTPAuth._record_failure(phone_number)
        
        logger.warning(f"Invalid OTP attempt for {phone_number}")
        return False
    
    @staticmethod
    def _record_failure(phone_number: str):
        """
        Record failed OTP attempt and check for lockout threshold.
        Uses atomic cache operations to prevent race conditions.
        """
        fail_key = f'otp_fail_{phone_number}'
        lockout_key = f'otp_lockout_{phone_number}'
        lockout_attempts = PhoneOTPAuth._get_setting('OTP_LOCKOUT_ATTEMPTS', 3)
        lockout_duration = PhoneOTPAuth._get_setting('OTP_LOCKOUT_DURATION', 1800)
        fail_window = PhoneOTPAuth._get_setting('OTP_RATE_WINDOW', 300)
        
        try:
            # Atomic increment
            try:
                attempts = cache.incr(fail_key)
            except ValueError:
                cache.set(fail_key, 1, timeout=fail_window)
                attempts = 1
            
            # Check lockout threshold
            if attempts >= lockout_attempts:
                cache.set(lockout_key, True, timeout=lockout_duration)
                logger.warning(
                    f"OTP lockout activated for {phone_number} "
                    f"after {attempts} failures ({lockout_duration}s)"
                )
        except Exception as e:
            logger.error(f"OTP failure tracking error for {phone_number}: {e}")
    
    @staticmethod
    def _hash_otp(otp: str, phone_number: str) -> str:
        """
        Hash OTP with phone number and secret key for secure storage.
        Prevents plaintext OTP storage in cache.
        """
        secret = getattr(settings, 'SECRET_KEY', 'default-secret')
        raw = f"{otp}:{phone_number}:{secret}"
        return hashlib.sha256(raw.encode()).hexdigest()
    
    @staticmethod
    def clear_otp(phone_number: str):
        """
        Clear all OTP data for phone number.
        Called after successful authentication.
        """
        cache.delete(f'otp_{phone_number}')
        cache.delete(f'otp_fail_{phone_number}')
        cache.delete(f'otp_lockout_{phone_number}')
        cache.delete(f'otp_rate_{phone_number}')
        logger.debug(f"OTP data cleared for {phone_number}")
    
    @staticmethod
    def is_locked_out(phone_number: str) -> bool:
        """Check if a phone number is currently locked out."""
        return cache.get(f'otp_lockout_{phone_number}') is not None
    
    @staticmethod
    def get_remaining_attempts(phone_number: str) -> int:
        """Get remaining OTP attempts before lockout."""
        attempts = cache.get(f'otp_fail_{phone_number}', 0)
        lockout_attempts = PhoneOTPAuth._get_setting('OTP_LOCKOUT_ATTEMPTS', 3)
        return max(0, lockout_attempts - attempts)


class CustomJWTAuth(JWTAuth):
    """
    Custom JWT authentication with additional security checks.
    
    Features:
    - Validates user is active
    - Invalidates tokens issued before password change
    - Timezone-aware timestamp comparison
    - Comprehensive error logging
    
    Usage:
        Add to Django Ninja API:
        
        from common.auth import CustomJWTAuth
        api = NinjaAPI(auth=CustomJWTAuth())
    """
    
    def authenticate(self, request, token):
        """
        Authenticate user from JWT token with security checks.
        
        Args:
            request: HTTP request object
            token: JWT token string
            
        Returns:
            Authenticated User instance or None
        """
        try:
            validated_token = self.get_validated_token(token)
            user = self.get_user(validated_token)
            
            if not user:
                logger.warning("JWT authentication failed: no user found for token")
                return None
            
            # Check user is active
            if not user.is_active:
                logger.warning(
                    f"JWT authentication rejected: user {user.id} is inactive"
                )
                raise InvalidToken('Account is deactivated')
            
            # Check token issued before password change
            if self._token_invalidated_by_password_change(user, validated_token):
                logger.info(
                    f"JWT token invalidated: password changed for user {user.id}"
                )
                raise InvalidToken('Token expired due to password change')
            
            logger.debug(f"JWT authentication successful for user {user.id}")
            return user
            
        except InvalidToken as e:
            logger.warning(f"Invalid JWT token: {e}")
            return None
        except Exception as e:
            logger.error(f"JWT authentication error: {e}")
            return None
    
    def _token_invalidated_by_password_change(self, user, validated_token) -> bool:
        """
        Check if token was issued before the user's last password change.
        
        Uses timezone-aware datetime comparison to prevent TypeErrors
        when comparing naive and aware datetimes.
        """
        if not hasattr(user, 'last_password_change'):
            return False
        
        last_change = user.last_password_change
        if not last_change:
            return False
        
        iat = validated_token.get('iat')
        if not iat:
            return False
        
        try:
            # Convert iat to timezone-aware datetime
            iat_datetime = datetime.fromtimestamp(iat, tz=timezone.get_current_timezone())
            
            # Ensure last_password_change is timezone-aware
            if timezone.is_naive(last_change):
                last_change = timezone.make_aware(
                    last_change,
                    timezone=timezone.get_current_timezone()
                )
            
            return iat_datetime < last_change
            
        except (TypeError, ValueError, OverflowError) as e:
            logger.error(f"Error comparing token iat with password change: {e}")
            # Fail secure: invalidate token if we can't verify
            return True