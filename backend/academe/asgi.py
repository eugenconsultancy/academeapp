# backend/academe/asgi.py
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'academe.settings')

# Get ASGI application first
django_asgi_app = get_asgi_application()

# Now import Django-dependent modules
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from channels.auth import AuthMiddlewareStack
from django.urls import path
from apps.chat.consumers import ChatConsumer
from apps.notifications.consumers import NotificationConsumer

# Import the custom JWT middleware for WebSockets
from apps.chat.middleware import JWTAuthMiddleware

websocket_urlpatterns = [
    path('ws/chat/<uuid:conversation_id>/', ChatConsumer.as_asgi()),
    path('ws/notifications/', NotificationConsumer.as_asgi()),
]

# For WebSocket connections, we use JWTAuthMiddleware (NOT AuthMiddlewareStack)
# For HTTP connections, we use the default Django ASGI application
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        JWTAuthMiddleware(  # Custom JWT auth for WebSockets
            URLRouter(websocket_urlpatterns)
        )
    ),
})