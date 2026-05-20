import jwt
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
    """Create JWT token"""
    from datetime import timedelta
    
    if token_type == "access":
        expiry = datetime.utcnow() + timedelta(hours=24)  # 24 hours
    else:
        expiry = datetime.utcnow() + timedelta(days=30)   # 30 days
    
    payload = {
        "user_id": str(user.id),
        "phone": user.phone_number,
        "exp": expiry,
        "type": token_type,
        "iat": datetime.utcnow(),
    }
    
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

def create_token_pair(user):
    """Create access and refresh token pair"""
    return {
        "access": create_token(user, "access"),
        "refresh": create_token(user, "refresh"),
    }
