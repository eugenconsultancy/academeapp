# backend/apps/chat/consumers.py
"""
WebSocket consumer for real‑time chat.
Refined version:
- Block checks with database (Redis optional)
- Group read receipts (MessageReadReceipt)
- Push notification trigger when recipient offline
- All sync operations via sync_to_async (no Redis dependency)
- Presence with last_seen (DB‑based when Redis unavailable)
- Missed message sync on reconnect (message.sync action)
- Heartbeat ping/pong
- message.delete and message.edit broadcasts
- All JSON serialization uses DjangoJSONEncoder to handle UUID/datetime natively
"""

import json
import uuid
import logging
from datetime import datetime
from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.db.models import F
from django.utils import timezone
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder

# Redis may not be available in development
try:
    from django_redis import get_redis_connection
except ImportError:
    get_redis_connection = None

from .models import (
    Conversation, ConversationParticipant, Message, MessageStatus,
    MessageType, BlockList, MessageReadReceipt,
)
from .schemas import MessageOut
from .notifications import send_push_notification

logger = logging.getLogger('apps.chat')


# ─── Sync helpers (Redis when available, DB fallback otherwise) ─────────────

def _redis():
    """Return raw Redis connection, or None if Redis is not available."""
    if not get_redis_connection:
        return None
    try:
        return get_redis_connection("default")
    except NotImplementedError:
        return None


def _get_presence_key(user_id) -> str:
    return f"user_online_{user_id}"


def _get_block_key(blocker_id) -> str:
    return f"blocked:{blocker_id}"


def _get_daily_key(user_id) -> str:
    return f"daily_msg:{user_id}:{timezone.now().date().isoformat()}"


def _check_daily_limit_sync(user_id) -> tuple:
    r = _redis()
    if r:
        key = _get_daily_key(user_id)
        count = r.get(key)
        count = int(count) if count else 0
    else:
        today = timezone.now().date()
        count = Message.objects.filter(sender_id=user_id, created_at__date=today).count()
    limit = getattr(settings, 'CHAT_RATE_LIMIT_MESSAGES_PER_DAY', 60)
    blocked = count >= limit
    return blocked, count, limit


def _increment_daily_limit_sync(user_id) -> int:
    r = _redis()
    if r:
        key = _get_daily_key(user_id)
        if not r.exists(key):
            now = timezone.now()
            midnight = (now + timezone.timedelta(days=1)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            ttl = int((midnight - now).total_seconds())
            r.setex(key, max(ttl, 1), 1)
            return 1
        return r.incr(key)
    else:
        today = timezone.now().date()
        return Message.objects.filter(sender_id=user_id, created_at__date=today).count() + 1


def _user_blocks_sync(blocker_id, blocked_id) -> bool:
    r = _redis()
    if r and r.sismember(_get_block_key(blocker_id), str(blocked_id)):
        return True
    return BlockList.objects.filter(blocker_id=blocker_id, blocked_user_id=blocked_id).exists()


def _add_block_to_cache_sync(blocker_id, blocked_id):
    r = _redis()
    if r:
        r.sadd(_get_block_key(blocker_id), str(blocked_id))


def _remove_block_from_cache_sync(blocker_id, blocked_id):
    r = _redis()
    if r:
        r.srem(_get_block_key(blocker_id), str(blocked_id))


def _set_presence_sync(user_id, online: bool):
    r = _redis()
    if r:
        key = _get_presence_key(user_id)
        if online:
            ttl = getattr(settings, 'CHAT_PRESENCE_TTL_SECONDS', 300)
            r.setex(key, ttl, '1')
        else:
            r.delete(key)


def _is_user_online_sync(user_id) -> bool:
    r = _redis()
    if r:
        return r.exists(_get_presence_key(user_id))
    return False


def _update_last_seen_sync(user_id):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    User.objects.filter(id=user_id).update(last_activity=timezone.now())


# ─── Consumer ─────────────────────────────────────────────────────────────────

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or self.user.is_anonymous:
            await self.close(code=4001)
            return

        if 'url_route' not in self.scope:
            logger.warning("WebSocket connect missing url_route in scope")
            await self.close(code=4002)
            return

        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f"chat_{self.conversation_id}"

        is_participant = await database_sync_to_async(
            ConversationParticipant.objects.filter(
                conversation_id=self.conversation_id, user=self.user
            ).exists
        )()
        if not is_participant:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        await sync_to_async(_set_presence_sync)(self.user.id, True)
        await sync_to_async(_update_last_seen_sync)(self.user.id)

        await database_sync_to_async(
            ConversationParticipant.objects.filter(
                conversation_id=self.conversation_id, user=self.user
            ).update
        )(last_seen_at=timezone.now())

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'presence_update',
                'user_id': str(self.user.id),
                'online': True,
                'last_seen': timezone.now().isoformat(),
            }
        )

        logger.info(f"User {self.user.id} connected to conversation {self.conversation_id}")

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name, self.channel_name
            )

        if self.user and not self.user.is_anonymous:
            await sync_to_async(_set_presence_sync)(self.user.id, False)
            await sync_to_async(_update_last_seen_sync)(self.user.id)

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'presence_update',
                    'user_id': str(self.user.id),
                    'online': False,
                    'last_seen': timezone.now().isoformat(),
                }
            )

            logger.info(
                f"User {self.user.id} disconnected from {self.conversation_id} (code: {close_code})"
            )

    # ── Receive handler ───────────────────────────────────────────────────────

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error', 'code': 'invalid_json',
                'detail': 'Invalid JSON payload'
            }, cls=DjangoJSONEncoder))
            return

        action = data.get('action')

        if action == 'ping':
            await self.send(text_data=json.dumps({'type': 'pong'}, cls=DjangoJSONEncoder))
        elif action == 'message.send':
            await self.handle_message_send(data)
        elif action == 'message.status':
            await self.handle_message_status(data)
        elif action == 'message.edit':
            await self.handle_message_edit(data)
        elif action == 'message.delete':
            await self.handle_message_delete(data)
        elif action == 'typing.start':
            await self.broadcast_typing(True)
        elif action == 'typing.stop':
            await self.broadcast_typing(False)
        elif action == 'message.sync':
            await self.handle_sync_history(data)
        else:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'code': 'unknown_action',
                'detail': f'Unknown action: {action}'
            }, cls=DjangoJSONEncoder))

    # ── Message send handler ──────────────────────────────────────────────────

    async def handle_message_send(self, data):
        payload = data.get('payload', {})
        client_msg_id = payload.get('client_msg_id')

        try:
            conv = await database_sync_to_async(Conversation.objects.get)(id=self.conversation_id)
        except Conversation.DoesNotExist:
            await self.send(text_data=json.dumps({
                'type': 'error', 'code': 'not_found',
                'detail': 'Conversation not found'
            }, cls=DjangoJSONEncoder))
            return

        if not conv.is_group:
            other = await database_sync_to_async(conv.get_other_participant)(self.user)
            if other:
                blocked = await sync_to_async(_user_blocks_sync)(self.user.id, other.id) or \
                          await sync_to_async(_user_blocks_sync)(other.id, self.user.id)
                if blocked:
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'code': 'blocked',
                        'detail': 'You cannot send messages to this user.'
                    }, cls=DjangoJSONEncoder))
                    return

        blocked, count, limit = await sync_to_async(_check_daily_limit_sync)(self.user.id)
        if blocked:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'code': 'rate_limit',
                'detail': f'Daily message limit ({limit}) reached.',
                'remaining': 0,
                'limit': limit,
            }, cls=DjangoJSONEncoder))
            return

        if client_msg_id:
            existing = await database_sync_to_async(
                lambda: Message.objects.filter(
                    sender=self.user, client_msg_id=client_msg_id
                ).first()
            )()
            if existing:
                serialized = await self.serialize_message(existing)
                await self.send(text_data=json.dumps({
                    'type': 'message.sent',
                    'message': serialized,
                }, cls=DjangoJSONEncoder))
                return

        try:
            msg = await database_sync_to_async(self._create_message)(payload)
        except Exception as e:
            logger.error(f"Message creation failed: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error', 'code': 'create_failed',
                'detail': 'Failed to create message'
            }, cls=DjangoJSONEncoder))
            return

        new_count = await sync_to_async(_increment_daily_limit_sync)(self.user.id)

        await database_sync_to_async(
            ConversationParticipant.objects.filter(
                conversation_id=self.conversation_id
            ).exclude(user=self.user).update
        )(unread_count=F('unread_count') + 1)

        serialized = await self.serialize_message(msg)
        await self.channel_layer.group_send(
            self.room_group_name,
            {'type': 'chat_message', 'message': serialized}
        )

        await self.send(text_data=json.dumps({
            'type': 'message.sent',
            'message': serialized,
            'rate_limit': {
                'used': new_count,
                'limit': limit,
                'remaining': max(0, limit - new_count),
            }
        }, cls=DjangoJSONEncoder))

        await self._notify_offline_participants(conv, msg)

    def _create_message(self, payload):
        msg = Message(
            conversation_id=self.conversation_id,
            sender=self.user,
            content=payload.get('content', ''),
            msg_type=payload.get('msg_type', MessageType.TEXT),
            status=MessageStatus.SENT,
            client_msg_id=payload.get('client_msg_id'),
            file_url=payload.get('file_url', ''),
            file_name=payload.get('file_name', ''),
            file_size=payload.get('file_size'),
            file_mime_type=payload.get('file_mime_type', ''),
            duration=payload.get('duration'),
            reply_to_id=payload.get('reply_to'),
        )
        msg.save()
        conv = msg.conversation
        conv.last_message_content = msg.content or msg.file_name or msg.msg_type
        conv.last_message_at = msg.created_at
        conv.last_message_sender = self.user
        conv.save(update_fields=[
            'last_message_content', 'last_message_at', 'last_message_sender'
        ])
        return msg

    async def _notify_offline_participants(self, conv, msg):
        try:
            participants = await database_sync_to_async(list)(
                conv.participants.exclude(id=self.user.id)
            )
            for participant in participants:
                is_online = await sync_to_async(_is_user_online_sync)(participant.id)
                if not is_online:
                    try:
                        sender_name = self.user.full_name or str(self.user)
                        notification_body = msg.content[:100] if msg.content else "Sent an attachment"
                        await sync_to_async(send_push_notification)(
                            participant.id,
                            f"New message from {sender_name}",
                            notification_body,
                        )
                    except Exception as e:
                        logger.warning(f"Push notification failed for user {participant.id}: {e}")
        except Exception as e:
            logger.error(f"Failed to notify offline participants: {e}")

    # ── Message status handler ────────────────────────────────────────────────

    async def handle_message_status(self, data):
        message_id = data.get('message_id')
        status_str = data.get('status')

        if status_str not in ('delivered', 'read'):
            return

        try:
            conv = await database_sync_to_async(Conversation.objects.get)(
                id=self.conversation_id
            )
        except Conversation.DoesNotExist:
            return

        if status_str == 'read' and conv.is_group:
            await database_sync_to_async(
                MessageReadReceipt.objects.update_or_create
            )(
                message_id=message_id,
                user=self.user,
                defaults={'read_at': timezone.now()},
            )

        await database_sync_to_async(
            Message.objects.filter(id=message_id).update
        )(status=status_str)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'message_status_update',
                'message_id': message_id,
                'status': status_str,
                'user_id': str(self.user.id),
            }
        )

    # ── Message edit handler ──────────────────────────────────────────────────

    async def handle_message_edit(self, data):
        message_id = data.get('message_id')
        new_content = data.get('content', '')

        if not new_content.strip():
            await self.send(text_data=json.dumps({
                'type': 'error', 'code': 'empty_content',
                'detail': 'Content cannot be empty'
            }, cls=DjangoJSONEncoder))
            return

        msg = await database_sync_to_async(
            lambda: Message.objects.filter(id=message_id).first()
        )()

        if not msg:
            await self.send(text_data=json.dumps({
                'type': 'error', 'code': 'not_found',
                'detail': 'Message not found'
            }, cls=DjangoJSONEncoder))
            return

        if msg.sender_id != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'error', 'code': 'forbidden',
                'detail': 'You can only edit your own messages'
            }, cls=DjangoJSONEncoder))
            return

        if msg.deleted_for_everyone:
            await self.send(text_data=json.dumps({
                'type': 'error', 'code': 'deleted',
                'detail': 'Cannot edit a deleted message'
            }, cls=DjangoJSONEncoder))
            return

        edit_window = getattr(settings, 'CHAT_MESSAGE_EDIT_WINDOW_SECONDS', 300)
        elapsed = (timezone.now() - msg.created_at).total_seconds()
        if elapsed > edit_window:
            await self.send(text_data=json.dumps({
                'type': 'error', 'code': 'edit_window_expired',
                'detail': f'Messages can only be edited within {edit_window} seconds'
            }, cls=DjangoJSONEncoder))
            return

        await database_sync_to_async(msg.edit)(new_content)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'message_edited',
                'message_id': message_id,
                'content': new_content,
                'edited_at': msg.edited_at.isoformat(),
            }
        )

    # ── Message delete handler ────────────────────────────────────────────────

    async def handle_message_delete(self, data):
        message_id = data.get('message_id')
        mode = data.get('mode', 'self')

        msg = await database_sync_to_async(
            lambda: Message.objects.filter(id=message_id).first()
        )()

        if not msg:
            await self.send(text_data=json.dumps({
                'type': 'error', 'code': 'not_found',
                'detail': 'Message not found'
            }, cls=DjangoJSONEncoder))
            return

        if mode == 'everyone':
            if msg.sender_id != self.user.id:
                await self.send(text_data=json.dumps({
                    'type': 'error', 'code': 'forbidden',
                    'detail': 'Only sender can delete for everyone'
                }, cls=DjangoJSONEncoder))
                return

            delete_window = getattr(
                settings, 'CHAT_MESSAGE_DELETE_FOR_EVERYONE_WINDOW_SECONDS', 3600
            )
            elapsed = (timezone.now() - msg.created_at).total_seconds()
            if elapsed > delete_window:
                await self.send(text_data=json.dumps({
                    'type': 'error', 'code': 'delete_window_expired',
                    'detail': f'Messages can only be deleted for everyone within {delete_window} seconds'
                }, cls=DjangoJSONEncoder))
                return

            await database_sync_to_async(msg.soft_delete_for_everyone)()

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'message_deleted',
                    'message_id': message_id,
                    'mode': 'everyone',
                }
            )
        else:
            msg.deleted_for_self = True
            await database_sync_to_async(msg.save)(update_fields=['deleted_for_self', 'updated_at'])

            await self.send(text_data=json.dumps({
                'type': 'message.deleted',
                'message_id': message_id,
                'mode': 'self',
            }, cls=DjangoJSONEncoder))

    # ── Sync history (for missed messages during disconnect) ──────────────────

    async def handle_sync_history(self, data):
        last_message_at = data.get('last_message_at')
        if not last_message_at:
            return

        try:
            dt = datetime.fromisoformat(last_message_at)
        except (ValueError, TypeError):
            await self.send(text_data=json.dumps({
                'type': 'error', 'code': 'invalid_date',
                'detail': 'Invalid last_message_at format'
            }, cls=DjangoJSONEncoder))
            return

        messages = await database_sync_to_async(
            lambda: list(
                Message.objects.filter(
                    conversation_id=self.conversation_id,
                    created_at__gt=dt,
                )
                .exclude(deleted_for_everyone=True)
                .order_by('created_at')
                .select_related('sender')
            )
        )()

        if messages:
            serialized = []
            for m in messages:
                serialized.append(await self.serialize_message(m))

            await self.send(text_data=json.dumps({
                'type': 'message.sync',
                'messages': serialized,
            }, cls=DjangoJSONEncoder))

    # ── Typing broadcast ─────────────────────────────────────────────────────

    async def broadcast_typing(self, typing: bool):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_event',
                'user_id': str(self.user.id),
                'typing': typing,
            }
        )

    # ── Event dispatchers (called by channel layer) ───────────────────────────

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message.new',
            'message': event['message'],
        }, cls=DjangoJSONEncoder))

    async def message_status_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message.status',
            'message_id': event['message_id'],
            'status': event['status'],
            'user_id': event['user_id'],
        }, cls=DjangoJSONEncoder))

    async def message_deleted(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message.deleted',
            'message_id': event['message_id'],
            'mode': event.get('mode', 'everyone'),
        }, cls=DjangoJSONEncoder))

    async def message_edited(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message.edited',
            'message_id': event['message_id'],
            'content': event['content'],
            'edited_at': event['edited_at'],
        }, cls=DjangoJSONEncoder))

    async def block_notification(self, event):
        await self.send(text_data=json.dumps({
            'type': 'block.notification',
            'blocked_by': event['blocked_by'],
            'blocked': event['blocked'],
        }, cls=DjangoJSONEncoder))

    async def typing_event(self, event):
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'user_id': event['user_id'],
            'typing': event['typing'],
        }, cls=DjangoJSONEncoder))

    async def presence_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'presence',
            'user_id': event['user_id'],
            'online': event['online'],
            'last_seen': event.get('last_seen', timezone.now().isoformat()),
        }, cls=DjangoJSONEncoder))

    # ── Serialization helper ─────────────────────────────────────────────────

    @database_sync_to_async
    def serialize_message(self, msg: Message) -> dict:
        """Return a plain dict that is JSON‑safe (all UUIDs converted to strings)."""
        # model_dump returns a dict; with mode='json' it would auto‑convert,
        # but to be safe we use DjangoJSONEncoder and convert manually if needed.
        raw = MessageOut.from_message(msg).model_dump()
        # Ensure any remaining UUIDs are strings (belt and braces)
        return json.loads(json.dumps(raw, cls=DjangoJSONEncoder))