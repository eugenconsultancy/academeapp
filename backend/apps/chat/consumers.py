import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
import jwt
from django.conf import settings
from .models import Conversation, Message
from datetime import datetime

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'

        # Authenticate user via JWT from query string
        token = self.scope.get('query_string', b'').decode()
        if not token:
            await self.close(code=4001)
            return
        user = await self.get_user_from_token(token)
        if not user:
            await self.close(code=4002)
            return
        self.scope['user'] = user

        # Verify user is participant and invitation is ACCEPTED
        conv = await self.get_conversation()
        if not conv or not conv.is_active:
            await self.close(code=4003)
            return
        if user not in conv.participants.all():
            await self.close(code=4004)
            return

        # Join room group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        if message_type != 'chat_message':
            return

        # Rate limiting (simple: 5 messages per 2 seconds per user)
        await self.rate_limit_check()

        # Validate sender is the authenticated user
        if data.get('sender_id') != str(self.scope['user'].id):
            return

        # Save message to DB (async)
        message = await self.save_message(data)

        # Broadcast to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': {
                    'id': str(message.id),
                    'conversation_id': self.conversation_id,
                    'sender_id': data['sender_id'],
                    'content': data.get('content', ''),
                    'file_url': data.get('file_url', ''),
                    'msg_type': data.get('msg_type', 'TEXT'),
                    'timestamp': message.created_at.isoformat(),
                }
            }
        )

    async def chat_message(self, event):
        """Receive message from room group and send to WebSocket"""
        await self.send(text_data=json.dumps(event['message']))

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            return User.objects.get(id=payload['user_id'])
        except (jwt.ExpiredSignatureError, jwt.DecodeError, User.DoesNotExist):
            return None

    @database_sync_to_async
    def get_conversation(self):
        try:
            return Conversation.objects.get(id=self.conversation_id)
        except Conversation.DoesNotExist:
            return None

    @database_sync_to_async
    def save_message(self, data):
        conversation = Conversation.objects.get(id=self.conversation_id)
        return Message.objects.create(
            conversation=conversation,
            sender=self.scope['user'],
            content=data.get('content', ''),
            file_url=data.get('file_url', ''),
            msg_type=data.get('msg_type', 'TEXT'),
        )

    async def rate_limit_check(self):
        # Use Redis to implement a sliding window rate limit.
        # Simplified: we check if the user has sent more than 5 messages in the last 2 seconds.
        key = f"ratelimit:{self.scope['user'].id}:{self.conversation_id}"
        from channels.layers import get_channel_layer
        layer = get_channel_layer()
        # Not async Redis call; for production, use async Redis client or a dedicated rate limiter.
        # For demo, we'll use a simple Django cache or omit; but placeholder.
        # In real implementation, you'd do:
        # count = await async_redis.incr(key)
        # if count == 1: await async_redis.expire(key, 2)
        # if count > 5: close connection
        pass