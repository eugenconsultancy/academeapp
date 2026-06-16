# backend/apps/chat/middleware.py
"""
WebSocket authentication middleware for Django Channels.

Validates JWT tokens from WebSocket connection query parameters
and attaches the authenticated user to the connection scope.

Supports:
- Token in query string: ws://host/ws/chat/{id}/?token=<jwt>
- Token in subprotocol header (future)
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
    
    Usage:
        Add to asgi.py:
        
        from apps.chat.middleware import TokenAuthMiddleware
        
        application = ProtocolTypeRouter({
            "websocket": TokenAuthMiddleware(
                URLRouter(websocket_urlpatterns)
            ),
        })
    """
    
    async def __call__(self, scope, receive, send):
        """
        Process the WebSocket connection scope and authenticate the user.
        
        Args:
            scope: The connection scope dictionary
            receive: ASGI receive function
            send: ASGI send function
        
        Returns:
            The next middleware/consumer in the chain
        """
        # Ensure url_route exists for URL parameter extraction
        # Channels requires this for path parameter access (e.g., conversation_id)
        if 'url_route' not in scope:
            scope['url_route'] = {'kwargs': {}}
        
        # Extract token from query string
        token = self._extract_token_from_scope(scope)
        
        if token:
            user = await self._authenticate_token(token)
            if user:
                scope['user'] = user
                logger.debug(
                    f"WebSocket authenticated: user={user.id} "
                    f"path={scope.get('path', 'unknown')}"
                )
            else:
                scope['user'] = AnonymousUser()
                logger.debug(
                    f"WebSocket authentication failed: invalid token "
                    f"path={scope.get('path', 'unknown')}"
                )
        else:
            scope['user'] = AnonymousUser()
            logger.debug(
                f"WebSocket no token provided: "
                f"path={scope.get('path', 'unknown')}"
            )
        
        return await super().__call__(scope, receive, send)
    
    def _extract_token_from_scope(self, scope) -> str | None:
        """
        Extract JWT token from WebSocket connection scope.
        
        Priority:
        1. Query string parameter: ?token=<jwt>
        2. Subprotocol header (future): Sec-WebSocket-Protocol
        
        Args:
            scope: The connection scope dictionary
        
        Returns:
            JWT token string or None if not found
        """
        # Method 1: Parse query string safely
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
                    return tokens[0]  # Use first token if multiple provided
            except Exception as e:
                logger.warning(f"Error parsing WebSocket query string: {e}")
        
        # Method 2: Check subprotocol header (future implementation)
        # headers = dict(scope.get('headers', []))
        # subprotocol = headers.get(b'sec-websocket-protocol', b'').decode()
        # if subprotocol and subprotocol.startswith('Bearer '):
        #     return subprotocol[7:]
        
        return None
    
    @database_sync_to_async
    def _authenticate_token(self, token: str):
        """
        Validate JWT token and return the authenticated User.
        
        Supports both symmetric (HS256) and asymmetric (RS256) algorithms.
        
        Args:
            token: JWT token string
        
        Returns:
            User instance if authentication succeeds, None otherwise
        """
        try:
            # Get algorithm from settings (default: HS256)
            algorithm = getattr(settings, 'JWT_ALGORITHM', 'HS256')
            
            # Select appropriate secret/key based on algorithm
            if algorithm.startswith('HS'):
                # Symmetric: use SECRET_KEY
                secret = getattr(
                    settings,
                    'JWT_SECRET_KEY',
                    settings.SECRET_KEY,
                )
            else:
                # Asymmetric: use public key
                secret = getattr(settings, 'JWT_PUBLIC_KEY', None)
                if not secret:
                    logger.error(
                        f"Asymmetric algorithm {algorithm} requires JWT_PUBLIC_KEY setting"
                    )
                    return None
            
            # Decode and verify token
            payload = jwt.decode(
                token,
                secret,
                algorithms=[algorithm],
                options={
                    'verify_exp': True,    # Enforce expiration check
                    'verify_iat': True,    # Enforce issued-at check
                    'require': ['exp'],    # Require expiration claim
                },
            )
            
            # Extract user ID from payload
            # Supports both 'user_id' and 'sub' claims
            user_id = payload.get('user_id') or payload.get('sub')
            
            if not user_id:
                logger.warning("JWT payload missing user_id/sub claim")
                return None
            
            # Fetch user from database
            user = User.objects.get(id=user_id)
            
            if not user.is_active:
                logger.warning(f"Inactive user attempted WebSocket: {user_id}")
                return None
            
            return user
        
        except jwt.ExpiredSignatureError:
            logger.debug("JWT token has expired")
            return None
        
        except jwt.InvalidTokenError as e:
            logger.debug(f"Invalid JWT token: {e}")
            return None
        
        except User.DoesNotExist:
            logger.debug(f"User from JWT not found: {user_id if 'user_id' in locals() else 'unknown'}")
            return None
        
        except Exception as e:
            logger.error(f"Unexpected JWT authentication error: {e}")
            return None


class JWTAuthMiddleware(TokenAuthMiddleware):
    """
    Alias for backward compatibility.
    
    Previously referenced as JWTAuthMiddleware in asgi.py.
    Use TokenAuthMiddleware for new code.
    
    This class exists to prevent import errors if existing asgi.py files
    import JWTAuthMiddleware. New code should use TokenAuthMiddleware directly.
    """
    pass