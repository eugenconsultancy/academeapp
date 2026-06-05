import json
from channels.generic.websocket import AsyncWebsocketConsumer
from urllib.parse import parse_qs
from common.jwt_auth import JWTAuth  # Assuming you have a way to validate JWT token asynchronously

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Authenticate via token query parameter
        query_string = self.scope['query_string'].decode()
        params = parse_qs(query_string)
        token = params.get('token', [None])[0]
        if not token:
            await self.close()
            return

        # Validate token and get user (synchronous call in async context, careful)
        try:
            from django.contrib.auth import get_user_model
            from ninja_jwt.authentication import JWTAuthentication  # Or your custom JWT auth
            # Because JWTAuth requires sync, we'll use a sync wrapper or use the existing auth backend
            # For simplicity, we assume a helper function that validates token and returns user.
            user = await self.get_user_from_token(token)
            if not user:
                await self.close()
                return
            self.user = user
            self.group_name = f"user_{user.id}_notifications"
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()
        except Exception:
            await self.close()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notification_message(self, event):
        """Receive a notification message and send it to WebSocket"""
        await self.send(text_data=json.dumps(event['message']))

    async def get_user_from_token(self, token):
        """Validate JWT token and return user object"""
        from django.contrib.auth import get_user_model
        from django.conf import settings
        from jose import jwt
        User = get_user_model()
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            if user_id:
                return await User.objects.aget(pk=user_id)
        except Exception:
            pass
        return None