# backend/academe/asgi.py
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'academe.settings')

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import OriginValidator
from apps.chat.middleware import TokenAuthMiddleware  # FIXED import name
from academe.routing import websocket_urlpatterns      # single source of truth

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": OriginValidator(
        TokenAuthMiddleware(          # FIXED class name
            URLRouter(websocket_urlpatterns)
        ),
        allowed_origins=[
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://10.5.50.15:5173",
            "https://granitic-imbricately-dede.ngrok-free.dev",
        ],
    ),
})