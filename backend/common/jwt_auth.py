import jwt
import uuid
from datetime import datetime, timedelta
from django.conf import settings
from ninja.security import HttpBearer

class JWTAuth(HttpBearer):
    def authenticate(self, request, token):
        from apps.accounts.models import User
        
        try:
            payload = jwt.decode(
                token, 
                settings.SECRET_KEY, 
                algorithms=["HS256"]
            )
            user_id = payload.get("user_id")
            if not user_id:
                return None
            
            user = User.objects.get(id=user_id, is_active=True)
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
    # Use a specific secret for JWTs
    secret = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
    
    expiry = datetime.utcnow() + (timedelta(hours=24) if token_type == "access" else timedelta(days=30))
    
    payload = {
        "user_id": str(user.id),
        "jti": str(uuid.uuid4()), # Unique ID for blacklisting
        "exp": expiry,
        "type": token_type,
        "iat": datetime.utcnow(),
    }
    
    return jwt.encode(payload, secret, algorithm="HS256")

def create_token_pair(user):
    """Create access and refresh token pair"""
    return {
        "access": create_token(user, "access"),
        "refresh": create_token(user, "refresh"),
    }
