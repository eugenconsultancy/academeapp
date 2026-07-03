# backend/apps/chat/middleware.py
"""
WebSocket authentication middleware for Django Channels.

Validates JWT tokens from WebSocket connection query parameters
and attaches the authenticated user to the connection scope.

Supports:
- Token in query string: ws://host/ws/chat/{id}/?token=<jwt>
- Configurable JWT algorithm (HS256, RS256, etc.)
- Explicit token expiry validation
- Anonymous user fallback for unauthenticated connections
- Proper scope initialization for URL routing
"""

import logging
from urllib.parse import parse_qs

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async

User = get_user_model()
logger = logging.getLogger('apps.chat')


class TokenAuthMiddleware(BaseMiddleware):
    """
    Custom Channels middleware that authenticates WebSocket connections
    using JWT tokens passed as query parameters.
    
    The authenticated user is attached to scope['user'].
    Anonymous connections get scope['user'] = AnonymousUser().
    If authentication fails, scope['auth_failed'] is set to True.
    """
    
    async def __call__(self, scope, receive, send):
        """
        Process the WebSocket connection scope and authenticate the user.
        """
        # Ensure url_route exists for URL parameter extraction
        if 'url_route' not in scope:
            scope['url_route'] = {'kwargs': {}}
        
        # Extract token from query string
        token = self._extract_token_from_scope(scope)
        auth_failed = False
        
        if token:
            user = await self._authenticate_token(token)
            if user:
                scope['user'] = user
                logger.info(
                    f"✅ WebSocket authenticated: user={user.id} "
                    f"path={scope.get('path', 'unknown')}"
                )
            else:
                scope['user'] = AnonymousUser()
                auth_failed = True
                logger.warning(
                    f"❌ WebSocket authentication failed: invalid token "
                    f"path={scope.get('path', 'unknown')}"
                )
        else:
            scope['user'] = AnonymousUser()
            auth_failed = True
            logger.warning(
                f"❌ WebSocket no token provided: "
                f"path={scope.get('path', 'unknown')}"
            )
        
        # Set flag so consumer can reject if needed
        scope['auth_failed'] = auth_failed
        
        return await super().__call__(scope, receive, send)
    
    def _extract_token_from_scope(self, scope) -> str | None:
        """
        Extract JWT token from WebSocket connection scope from query string.
        """
        query_string = scope.get('query_string', b'')
        if query_string:
            try:
                query_str = query_string.decode('utf-8')
            except UnicodeDecodeError:
                query_str = query_string.decode('latin-1', errors='ignore')
            
            try:
                params = parse_qs(query_str)
                tokens = params.get('token', [])
                if tokens:
                    return tokens[0]
            except Exception as e:
                logger.warning(f"Error parsing WebSocket query string: {e}")
        return None
    
    @database_sync_to_async
    def _authenticate_token(self, token: str):
        """
        Validate JWT token and return the authenticated User.
        """
        try:
            algorithm = getattr(settings, 'JWT_ALGORITHM', 'HS256')
            
            if algorithm.startswith('HS'):
                secret = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
            else:
                secret = getattr(settings, 'JWT_PUBLIC_KEY', None)
                if not secret:
                    logger.error(
                        f"Asymmetric algorithm {algorithm} requires JWT_PUBLIC_KEY setting"
                    )
                    return None
            
            payload = jwt.decode(
                token,
                secret,
                algorithms=[algorithm],
                options={
                    'verify_exp': True,
                    'verify_iat': True,
                    'require': ['exp'],
                },
            )
            
            user_id = payload.get('user_id') or payload.get('sub')
            
            if not user_id:
                logger.warning("JWT payload missing user_id/sub claim")
                return None
            
            user = User.objects.get(id=user_id)
            
            if not user.is_active:
                logger.warning(f"Inactive user attempted WebSocket: {user_id}")
                return None
            
            return user
        
        except jwt.ExpiredSignatureError:
            logger.warning(f"JWT token has expired (first 20 chars: {token[:20]}...)")
            return None
        
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e} (first 20 chars: {token[:20]}...)")
            return None
        
        except User.DoesNotExist:
            logger.warning(f"User from JWT not found: {user_id if 'user_id' in locals() else 'unknown'}")
            return None
        
        except Exception as e:
            logger.error(f"Unexpected JWT authentication error: {e}")
            return None


class JWTAuthMiddleware(TokenAuthMiddleware):
    """Alias for backward compatibility."""
    pass