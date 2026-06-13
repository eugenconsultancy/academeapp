# backend/apps/chat/middleware.py
import jwt
from urllib.parse import parse_qs
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.conf import settings
from channels.db import database_sync_to_async

User = get_user_model()


class JWTAuthMiddleware:
    """
    Custom middleware for WebSocket JWT authentication.
    Extracts token from query string and authenticates the user.
    
    CRITICAL: This middleware is for WebSocket connections only (asgi.py).
    Do NOT add this to settings.py MIDDLEWARE list - it will break HTTP requests!
    
    Always provides a user object (either authenticated User or AnonymousUser)
    to prevent AttributeError in downstream consumers.
    """
    
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # IMPORTANT: Initialize to AnonymousUser first to avoid "undefined" errors
        # This ensures scope['user'] always exists, even if authentication fails
        from django.contrib.auth.models import AnonymousUser
        scope['user'] = AnonymousUser()
        
        # Extract token from query string
        query_string = scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token = params.get('token', [None])[0]
        
        if token:
            user = await self.get_user_from_token(token)
            if user:
                scope['user'] = user
                scope['jwt_token'] = token
                print(f"🔐 WebSocket authenticated: user_id={user.id}, name={user.full_name}")
            else:
                print(f"⚠️ WebSocket authentication failed: invalid token for {query_string[:50]}...")
        else:
            # Only log if this is a chat WebSocket (not notification)
            if 'chat' in str(scope.get('path', '')):
                print(f"⚠️ WebSocket authentication failed: no token provided for {scope.get('path', 'unknown')}")
        
        return await self.app(scope, receive, send)
    
    @database_sync_to_async
    def get_user_from_token(self, token):
        """Extract user from JWT token with detailed error logging"""
        try:
            # Use JWT_SECRET_KEY if available, otherwise SECRET_KEY
            secret = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
            payload = jwt.decode(token, secret, algorithms=['HS256'])
            
            user_id = payload.get('user_id')
            if not user_id:
                print(f"❌ No user_id in JWT payload")
                return None
            
            user = User.objects.get(id=user_id, is_active=True)
            return user
            
        except jwt.ExpiredSignatureError:
            print(f"❌ JWT token expired for token: {token[:20]}...")
        except jwt.InvalidTokenError as e:
            print(f"❌ Invalid JWT token: {e}")
        except User.DoesNotExist:
            print(f"❌ User not found for user_id in token")
        except Exception as e:
            print(f"❌ JWT authentication error: {e}")
        
        return None