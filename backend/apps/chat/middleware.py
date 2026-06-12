# backend/apps/chat/middleware.py
import jwt
from urllib.parse import parse_qs
from django.contrib.auth import get_user_model
from django.conf import settings
from channels.db import database_sync_to_async

User = get_user_model()


class JWTAuthMiddleware:
    """
    Custom middleware for WebSocket JWT authentication.
    Extracts token from query string and authenticates the user.
    """
    
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # Extract token from query string
        query_string = scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token = params.get('token', [None])[0]
        
        if token:
            user = await self.get_user_from_token(token)
            if user:
                scope['user'] = user
                scope['jwt_token'] = token
            else:
                # Set anonymous user if token invalid
                scope['user'] = None
        
        return await self.app(scope, receive, send)
    
    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            if user_id:
                return User.objects.get(id=user_id, is_active=True)
        except Exception:
            pass
        return None