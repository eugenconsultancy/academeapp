# C:\Users\GATARA-BJTU\academe\backend\apps\chat\consumers.py

import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
import jwt
from django.conf import settings
from .models import Conversation, Message, BlockedUser

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'

        # Authenticate via JWT from query string
        token = self.scope.get('query_string', b'').decode()
        if not token:
            await self.close(code=4001)
            return

        user = await self.get_user_from_token(token)
        if not user:
            await self.close(code=4002)
            return

        self.user_id = user.id
        self.scope['user'] = user

        # Validate conversation and participation
        valid = await self.validate_participation()
        if not valid:
            await self.close(code=4003)
            return

        # Update last_seen on connect
        await self.update_last_seen()

        # Mark messages as read when user opens the conversation
        await self.mark_messages_as_read()

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)

        # Handle typing indicators
        if data.get('type') == 'typing':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_indicator',
                    'user_id': str(self.user_id),
                    'is_typing': data.get('is_typing', True),
                }
            )
            return

        # Handle mark-read events
        if data.get('type') == 'mark_read':
            await self.mark_messages_as_read()
            return

        if data.get('type') != 'chat_message':
            return

        # Rate limit (placeholder)
        await self.rate_limit_check()

        # Validate sender
        if data.get('sender_id') != str(self.user_id):
            return

        # Check if sender is blocked by the receiver
        is_blocked = await self.check_if_blocked()
        if is_blocked:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'You have been blocked by this user.',
            }))
            return

        # Save message
        message = await self.save_message(data)

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
                    'is_read': message.is_read,
                }
            }
        )

    async def chat_message(self, event):
        """Send message to WebSocket."""
        await self.send(text_data=json.dumps(event['message']))

    async def typing_indicator(self, event):
        """Broadcast typing indicator to the group."""
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'user_id': event['user_id'],
            'is_typing': event['is_typing'],
        }))

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            return User.objects.get(id=payload['user_id'])
        except (jwt.ExpiredSignatureError, jwt.DecodeError, User.DoesNotExist):
            return None

    @database_sync_to_async
    def validate_participation(self):
        """Check if the user is a participant of the conversation."""
        conv = Conversation.objects.filter(
            id=self.conversation_id, is_active=True
        ).first()
        if not conv:
            return False
        return conv.participants.filter(id=self.user_id).exists()

    @database_sync_to_async
    def save_message(self, data):
        """Create a message in the database."""
        conversation = Conversation.objects.get(id=self.conversation_id)
        sender = User.objects.get(id=self.user_id)
        message = Message.objects.create(
            conversation=conversation,
            sender=sender,
            content=data.get('content', ''),
            file_url=data.get('file_url', ''),
            msg_type=data.get('msg_type', 'TEXT'),
        )
        # Update conversation preview
        conversation.last_message_preview = (data.get('content', '') or '')[:200]
        conversation.last_message_at = message.created_at
        conversation.save(update_fields=['last_message_preview', 'last_message_at'])
        return message

    @database_sync_to_async
    def check_if_blocked(self):
        """Check if the receiver has blocked the sender."""
        conv = Conversation.objects.get(id=self.conversation_id)
        receiver = conv.participants.exclude(id=self.user_id).first()
        if receiver:
            return BlockedUser.objects.filter(
                blocker=receiver, blocked_id=self.user_id
            ).exists()
        return False

    @database_sync_to_async
    def update_last_seen(self):
        """Update the user's last_seen timestamp."""
        User.objects.filter(id=self.user_id).update(last_seen=timezone.now())

    @database_sync_to_async
    def mark_messages_as_read(self):
        """Mark all messages from the other participant as read."""
        Message.objects.filter(
            conversation_id=self.conversation_id,
            is_read=False,
        ).exclude(sender_id=self.user_id).update(is_read=True)

    async def rate_limit_check(self):
        # Placeholder for real rate limiting
        pass