# backend/academe/routing.py
from django.urls import path
from apps.chat.routing import websocket_urlpatterns as chat_ws_patterns
from apps.notifications.consumers import NotificationConsumer

# Combine all app-level WebSocket patterns
websocket_urlpatterns = chat_ws_patterns + [
    path('ws/notifications/', NotificationConsumer.as_asgi()),
]