# backend/common/jwt_auth.py
"""
JWT authentication for Django Ninja REST API.

Provides:
- JWTAuthBearer: HTTP Bearer token authentication class
- create_token: Generate access or refresh JWT tokens
- create_token_pair: Generate both access and refresh tokens
- blacklist_token: Revoke a token (stored in Redis/cache)
- verify_token: Verify and decode a JWT token

Token blacklist uses Django cache (Redis in production) for persistence
across server restarts and multiple worker processes.

Authentication failures now raise specific HttpError codes
so the frontend can distinguish between retry‑able and non‑retry‑able errors:
  401  → token expired (retry with refresh)
  403  → PASSWORD_CHANGED, ACCOUNT_INACTIVE, TOKEN_BLACKLISTED, WRONG_TOKEN_TYPE
         (do NOT retry – redirect to login)
"""

import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

import jwt
from django.utils import timezone
from django.conf import settings
from django.core.cache import cache
from ninja.security import HttpBearer
from ninja.errors import HttpError

logger = logging.getLogger(__name__)


class JWTAuthBearer(HttpBearer):
    """
    JWT Bearer token authentication for Django Ninja endpoints.
    
    Features:
    - Validates JWT signature and expiry
    - Checks token blacklist (Redis-backed, survives restarts)
    - Validates token type (access only, not refresh)
    - Checks user is active
    - Invalidates tokens issued before password change
    - Configurable algorithm via settings.JWT_ALGORITHM
    
    Raises HttpError with specific codes so the frontend can
    stop refreshing when appropriate.
    """
    
    def authenticate(self, request, token):
        """
        Validate JWT token and return authenticated user.
        
        Args:
            request: HTTP request object
            token: JWT token string from Authorization header
            
        Returns:
            User instance if authentication succeeds
            
        Raises:
            HttpError(403, "TOKEN_BLACKLISTED"): token has been revoked
            HttpError(403, "WRONG_TOKEN_TYPE"): refresh token used as access
            HttpError(403, "PASSWORD_CHANGED"): password changed after issue
            HttpError(403, "ACCOUNT_INACTIVE"): user is deactivated
            HttpError(401, "TOKEN_EXPIRED"): token has expired (retryable)
            HttpError(401, "INVALID_TOKEN"): token is malformed
        """
        from apps.accounts.models import User
        
        # Check token blacklist
        if _is_token_blacklisted(token):
            logger.warning(f"Token rejected: blacklisted ({token[:20]}...)")
            raise HttpError(403, "TOKEN_BLACKLISTED")
        
        # Decode and validate token
        payload = self._decode_token(token)
        if not payload:
            raise HttpError(401, "INVALID_TOKEN")
        
        # Validate token type
        token_type = payload.get('type')
        if token_type and token_type != 'access':
            logger.warning(f"Token rejected: wrong type '{token_type}'")
            raise HttpError(403, "WRONG_TOKEN_TYPE")
        
        # Get user from token
        user = self._get_user_from_payload(payload)
        if not user:
            raise HttpError(403, "ACCOUNT_INACTIVE")
        
        # Check token issued before password change
        if self._token_issued_before_password_change(user, payload):
            logger.info(f"Token rejected: password changed for user {user.id}")
            raise HttpError(403, "PASSWORD_CHANGED")
        
        logger.debug(f"JWT authentication successful for user {user.id}")
        return user
    
    def _decode_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Decode and validate JWT token. Returns payload or raises HttpError."""
        try:
            algorithm = getattr(settings, 'JWT_ALGORITHM', 'HS256')
            secret = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
            
            payload = jwt.decode(
                token,
                secret,
                algorithms=[algorithm],
                options={
                    'verify_exp': True,
                    'verify_iat': True,
                    'require': ['exp', 'iat'],
                },
            )
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.debug("JWT token expired")
            raise HttpError(401, "TOKEN_EXPIRED")
        except jwt.InvalidTokenError as e:
            logger.debug(f"Invalid JWT token: {e}")
            raise HttpError(401, "INVALID_TOKEN")
        except Exception as e:
            logger.error(f"JWT decode error: {e}")
            raise HttpError(401, "INVALID_TOKEN")
    
    def _get_user_from_payload(self, payload: dict):
        """Retrieve user. Returns User or raises HttpError."""
        from apps.accounts.models import User
        
        user_id = payload.get('user_id') or payload.get('sub')
        if not user_id:
            logger.warning("Token payload missing user_id")
            raise HttpError(401, "INVALID_TOKEN")
        
        try:
            user = User.objects.get(id=user_id)
            if not user.is_active:
                logger.warning(f"Inactive user: {user_id}")
                raise HttpError(403, "ACCOUNT_INACTIVE")
            return user
        except User.DoesNotExist:
            logger.warning(f"User not found: {user_id}")
            raise HttpError(401, "INVALID_TOKEN")
        except HttpError:
            raise  # re‑raise our own errors
        except Exception as e:
            logger.error(f"User lookup error: {e}")
            raise HttpError(401, "INVALID_TOKEN")
    
    def _token_issued_before_password_change(self, user, payload: dict) -> bool:
        """Check if token was issued before password change."""
        if not hasattr(user, 'last_password_change'):
            return False
        
        last_change = user.last_password_change
        if not last_change:
            return False
        
        iat = payload.get('iat')
        if not iat:
            return False
        
        try:
            if timezone.is_naive(last_change):
                last_change = timezone.make_aware(
                    last_change,
                    timezone=timezone.get_current_timezone()
                )
            
            iat_datetime = datetime.fromtimestamp(
                iat,
                tz=timezone.get_current_timezone()
            )
            return iat_datetime < last_change
            
        except (TypeError, ValueError, OverflowError) as e:
            logger.error(f"Error comparing iat with password change: {e}")
            return True  # fail secure


# ─── Token Blacklist Functions (unchanged) ────────────────────────────────────

def _is_token_blacklisted(token: str) -> bool:
    blacklist_key = _get_blacklist_key(token)
    try:
        return cache.get(blacklist_key) is not None
    except Exception as e:
        logger.error(f"Blacklist check failed: {e}")
        return False

def _get_blacklist_key(token: str) -> str:
    token_hash = token[:32]
    return f"jwt_bl:{token_hash}"

# ─── Token Creation Functions (unchanged) ─────────────────────────────────────

def create_token(user, token_type: str = "access") -> str:
    from common.constants import PlatformDefaults
    
    if token_type == "access":
        expiry_delta = timedelta(minutes=PlatformDefaults.ACCESS_TOKEN_EXPIRY_MINUTES)
    else:
        expiry_delta = timedelta(days=PlatformDefaults.REFRESH_TOKEN_EXPIRY_DAYS)
    
    expiry = timezone.now() + expiry_delta
    algorithm = getattr(settings, 'JWT_ALGORITHM', 'HS256')
    secret = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
    
    payload = {
        "user_id": str(user.id),
        "jti": str(uuid.uuid4()),
        "exp": int(expiry.timestamp()),
        "iat": int(timezone.now().timestamp()),
        "type": token_type,
    }
    if hasattr(user, 'role'):
        payload["role"] = user.role
    
    token_str = jwt.encode(payload, secret, algorithm=algorithm)
    logger.info(f"Created {token_type} token for user {user.id} (expires: {expiry.isoformat()})")
    return token_str

def create_token_pair(user) -> Dict[str, str]:
    return {
        "access": create_token(user, "access"),
        "refresh": create_token(user, "refresh"),
    }

# ─── Token Management Functions (unchanged) ───────────────────────────────────

def blacklist_token(token: str):
    try:
        payload = verify_token(token)
        if payload:
            exp = payload.get('exp', 0)
            now = int(timezone.now().timestamp())
            remaining_ttl = max(0, exp - now)
        else:
            remaining_ttl = 86400
    except Exception:
        remaining_ttl = 86400
    
    blacklist_key = _get_blacklist_key(token)
    try:
        cache.set(blacklist_key, "1", timeout=remaining_ttl)
        logger.info(f"Token blacklisted: {token[:20]}... (TTL: {remaining_ttl}s)")
    except Exception as e:
        logger.error(f"Failed to blacklist token: {e}")

def blacklist_all_user_tokens(user_id):
    from apps.accounts.models import User
    try:
        User.objects.filter(id=user_id).update(last_password_change=timezone.now())
        logger.info(f"All tokens invalidated for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to invalidate tokens for user {user_id}: {e}")

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        algorithm = getattr(settings, 'JWT_ALGORITHM', 'HS256')
        secret = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
        return jwt.decode(token, secret, algorithms=[algorithm], options={'verify_exp': True})
    except Exception as e:
        logger.debug(f"Token verification failed: {e}")
        return None

def get_token_ttl(token: str) -> Optional[int]:
    payload = verify_token(token)
    if payload:
        exp = payload.get('exp', 0)
        now = int(timezone.now().timestamp())
        return max(0, exp - now)
    return None

# Backward compatibility alias
JWTAuth = JWTAuthBearer