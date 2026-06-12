# backend/apps/chat/consumers.py

import json
import uuid
from urllib.parse import parse_qs

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
import jwt

from .models import Conversation, Message, BlockedUser, MutedConversation

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    TYPING_TIMEOUT_SECONDS = 10
    RATE_LIMIT_MAX_MESSAGES = 20
    RATE_LIMIT_WINDOW = 1

    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'

        qs = self.scope.get('query_string', b'').decode()
        params = parse_qs(qs)
        token = params.get('token', [None])[0]

        if not token:
            await self.close(code=4001)
            return

        user = await self.get_user_from_token(token)
        if not user:
            await self.close(code=4002)
            return

        self.user_id = user.id
        self.user_name = user.full_name
        self.scope['user'] = user

        valid = await self.validate_participation()
        if not valid:
            await self.close(code=4003)
            return

        await self.update_last_activity()
        await self.mark_messages_as_read()

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'presence_update',
                'user_id': str(self.user_id),
                'is_online': True,
            }
        )

    async def disconnect(self, close_code):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'presence_update',
                'user_id': str(self.user_id),
                'is_online': False,
            }
        )
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)

        if data.get('type') == 'typing':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_indicator',
                    'user_id': str(self.user_id),
                    'user_name': self.user_name,
                    'is_typing': data.get('is_typing', True),
                }
            )
            return

        if data.get('type') == 'mark_read':
            await self.mark_messages_as_read()
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'messages_read',
                    'read_by': str(self.user_id),
                    'conversation_id': self.conversation_id,
                }
            )
            return

        if data.get('type') != 'chat_message':
            return

        passed = await self.rate_limit_check()
        if not passed:
            return

        if data.get('sender_id') != str(self.user_id):
            return

        is_blocked = await self.check_if_blocked()
        if is_blocked:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'You have been blocked by this user.',
            }))
            return

        message = await self.save_message(data)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': {
                    'id': str(message.id),
                    'conversation_id': self.conversation_id,
                    'sender_id': str(self.user_id),
                    'sender_name': self.user_name,
                    'content': data.get('content', ''),
                    'file_url': data.get('file_url', ''),
                    'msg_type': data.get('msg_type', 'TEXT'),
                    'timestamp': message.created_at.isoformat(),
                    'is_read': message.is_read,
                    'reply_to_id': str(message.reply_to_id) if message.reply_to_id else None,
                    'reply_preview': (
                        message.reply_to.content[:100]
                        if message.reply_to and message.reply_to.content
                        else None
                    ),
                    'duration': message.duration,
                }
            }
        )

        await self.send_notification_if_needed(message)

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event['message']))

    async def typing_indicator(self, event):
        if event['user_id'] != str(self.user_id):
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'user_name': event.get('user_name', ''),
                'is_typing': event['is_typing'],
            }))

    async def presence_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'presence',
            'user_id': event['user_id'],
            'is_online': event['is_online'],
        }))

    async def messages_read(self, event):
        await self.send(text_data=json.dumps({
            'type': 'messages_read',
            'read_by': event['read_by'],
            'conversation_id': event['conversation_id'],
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
        conv = Conversation.objects.filter(
            id=self.conversation_id, is_active=True
        ).first()
        if not conv:
            return False
        return conv.participants.filter(id=self.user_id).exists()

    @database_sync_to_async
    def save_message(self, data):
        conversation = Conversation.objects.get(id=self.conversation_id)
        sender = User.objects.get(id=self.user_id)

        reply_to = None
        if data.get('reply_to_id'):
            try:
                reply_to = Message.objects.get(
                    id=data['reply_to_id'],
                    conversation=conversation
                )
            except Message.DoesNotExist:
                pass

        message = Message.objects.create(
            conversation=conversation,
            sender=sender,
            content=data.get('content', ''),
            file_url=data.get('file_url', ''),
            msg_type=data.get('msg_type', 'TEXT'),
            reply_to=reply_to,
            duration=data.get('duration'),
        )

        preview_text = data.get('content', '') or ''
        if data.get('msg_type') == 'VOICE':
            preview_text = '🎤 Voice message'
        elif data.get('msg_type') == 'FILE' and not preview_text:
            preview_text = '📎 File attachment'

        conversation.last_message_preview = preview_text[:200]
        conversation.last_message_at = message.created_at
        conversation.is_active = True
        conversation.save(
            update_fields=['last_message_preview', 'last_message_at', 'is_active']
        )
        return message

    @database_sync_to_async
    def check_if_blocked(self):
        conv = Conversation.objects.get(id=self.conversation_id)
        receiver = conv.participants.exclude(id=self.user_id).first()
        if receiver:
            return BlockedUser.objects.filter(
                blocker=receiver, blocked_id=self.user_id
            ).exists()
        return False

    @database_sync_to_async
    def update_last_activity(self):
        User.objects.filter(id=self.user_id).update(last_activity=timezone.now())

    @database_sync_to_async
    def mark_messages_as_read(self):
        now = timezone.now()
        Message.objects.filter(
            conversation_id=self.conversation_id,
            is_read=False,
        ).exclude(sender_id=self.user_id).update(is_read=True, read_at=now)

    @database_sync_to_async
    def send_notification_if_needed(self, message):
        conv = Conversation.objects.get(id=self.conversation_id)
        receiver = conv.participants.exclude(id=self.user_id).first()
        if not receiver:
            return

        if MutedConversation.objects.filter(
            user=receiver, conversation=conv
        ).exists():
            return

        try:
            from apps.notifications.models import Notification
            Notification.objects.create(
                recipient=receiver,
                notification_type='new_message',
                title=f'New message from {self.user_name}',
                body=message.content[:200] if message.content else '📎 File attachment',
                data={
                    'conversation_id': str(conv.id),
                    'message_id': str(message.id),
                    'sender_id': str(self.user_id),
                }
            )
        except Exception:
            pass

    async def rate_limit_check(self):
        """
        Fixed-window rate limiter using Django cache.
        Uses cache.add for initial set and cache.incr for increments
        to preserve the original TTL.
        """
        key = f"chat_rate:{self.user_id}"
        count = await database_sync_to_async(cache.get)(key)

        if count is None:
            await database_sync_to_async(cache.set)(
                key, 1, timeout=self.RATE_LIMIT_WINDOW
            )
            return True

        if count >= self.RATE_LIMIT_MAX_MESSAGES:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Rate limit exceeded. Please slow down.',
            }))
            return False

        try:
            await database_sync_to_async(cache.incr)(key)
        except ValueError:
            await database_sync_to_async(cache.set)(
                key, 1, timeout=self.RATE_LIMIT_WINDOW
            )

        return True