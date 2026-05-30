import jwt
import uuid
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings
from ninja.security import HttpBearer

# Simple in-memory blacklist (replace with Redis/DB in production)
BLACKLISTED_TOKENS = set()

class JWTAuth(HttpBearer):
    def authenticate(self, request, token):
        from apps.accounts.models import User
        
        # Check blacklist
        if token in BLACKLISTED_TOKENS:
            return None
        
        try:
            # Use JWT_SECRET_KEY if defined, otherwise SECRET_KEY
            secret = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
            payload = jwt.decode(token, secret, algorithms=["HS256"])
            user_id = payload.get("user_id")
            if not user_id:
                return None
            
            user = User.objects.get(id=user_id, is_active=True)
            
            # Optional: check token issued before password change
            if hasattr(user, 'last_password_change') and user.last_password_change:
                iat = payload.get('iat')
                if iat and user.last_password_change.timestamp() > iat:
                    return None
            
            return user
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
        except User.DoesNotExist:
            return None
        except Exception:
            return None

def create_token(user, token_type="access"):
    secret = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
    
    # Use PlatformDefaults for expiry
    from common.constants import PlatformDefaults
    if token_type == "access":
        expiry_delta = timedelta(minutes=PlatformDefaults.ACCESS_TOKEN_EXPIRY_MINUTES)
    else:
        expiry_delta = timedelta(days=PlatformDefaults.REFRESH_TOKEN_EXPIRY_DAYS)
    
    expiry = timezone.now() + expiry_delta
    
    payload = {
        "user_id": str(user.id),
        "jti": str(uuid.uuid4()),
        "exp": expiry,
        "type": token_type,
        "iat": timezone.now().timestamp(),
    }
    
    return jwt.encode(payload, secret, algorithm="HS256")

def create_token_pair(user):
    """Create access and refresh token pair"""
    return {
        "access": create_token(user, "access"),
        "refresh": create_token(user, "refresh"),
    }

def blacklist_token(token):
    """Add a token to the blacklist (call on logout, password change)"""
    BLACKLISTED_TOKENS.add(token)
    # Optional: schedule cleanup after expiry