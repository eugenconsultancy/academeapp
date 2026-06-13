# backend/common/jwt_auth.py
import jwt
import uuid
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings
from ninja.security import HttpBearer

# Simple in-memory blacklist (replace with Redis/DB in production)
BLACKLISTED_TOKENS = set()


class JWTAuth(HttpBearer):
    """JWT Authentication class for Django Ninja REST API"""
    
    def authenticate(self, request, token):
        from apps.accounts.models import User
        
        # Check blacklist
        if token in BLACKLISTED_TOKENS:
            print(f"❌ Token blacklisted: {token[:20]}...")
            return None
        
        try:
            secret = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
            payload = jwt.decode(token, secret, algorithms=["HS256"])
            user_id = payload.get("user_id")
            
            if not user_id:
                print(f"❌ No user_id in token payload")
                return None
            
            user = User.objects.get(id=user_id, is_active=True)
            
            # Optional: check token issued before password change
            if hasattr(user, 'last_password_change') and user.last_password_change:
                iat = payload.get('iat')
                if iat and user.last_password_change.timestamp() > iat:
                    print(f"❌ Token issued before password change for user {user_id}")
                    return None
            
            return user
            
        except jwt.ExpiredSignatureError:
            print(f"❌ JWT token expired")
        except jwt.InvalidTokenError as e:
            print(f"❌ Invalid JWT token: {e}")
        except User.DoesNotExist:
            print(f"❌ User not found for token")
        except Exception as e:
            print(f"❌ JWT authentication error: {e}")
        
        return None


def create_token(user, token_type="access"):
    """Create a JWT token for a user"""
    secret = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
    
    from common.constants import PlatformDefaults
    
    if token_type == "access":
        expiry_delta = timedelta(minutes=PlatformDefaults.ACCESS_TOKEN_EXPIRY_MINUTES)
    else:
        expiry_delta = timedelta(days=PlatformDefaults.REFRESH_TOKEN_EXPIRY_DAYS)
    
    expiry = timezone.now() + expiry_delta
    
    # FIX: Convert iat to integer for JWT compliance
    payload = {
        "user_id": str(user.id),
        "jti": str(uuid.uuid4()),
        "exp": int(expiry.timestamp()),  # Convert to integer
        "type": token_type,
        "iat": int(timezone.now().timestamp()),  # FIX: Convert to integer
    }
    
    token_str = jwt.encode(payload, secret, algorithm="HS256")
    print(f"✅ Created {token_type} token for user {user.id} (expires at {expiry})")
    return token_str


def create_token_pair(user):
    """Create access and refresh token pair"""
    return {
        "access": create_token(user, "access"),
        "refresh": create_token(user, "refresh"),
    }


def blacklist_token(token):
    """Add a token to the blacklist (call on logout, password change)"""
    BLACKLISTED_TOKENS.add(token)
    print(f"🚫 Token blacklisted: {token[:20]}...")
    # Optional: schedule cleanup after expiry


def verify_token(token):
    """Verify a token and return the payload (for debugging)"""
    try:
        secret = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload
    except Exception as e:
        print(f"❌ Token verification failed: {e}")
        return None