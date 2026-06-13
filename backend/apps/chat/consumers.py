# backend/apps/chat/consumers.py
import json
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.cache import cache
import jwt
from django.conf import settings

from .models import Conversation, Message, BlockedUser

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for chat with JWT authentication.
    Token is passed via query string: ?token=xxx
    """
    
    async def connect(self):
        # Initialize attributes
        self.user_id = None
        self.user_name = None
        self.conversation_id = None
        self.room_group_name = None
        
        # Get conversation ID from URL
        self.conversation_id = str(self.scope['url_route']['kwargs']['conversation_id'])
        self.room_group_name = f'chat_{self.conversation_id}'
        
        # Extract token from query string
        query_string = self.scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token = params.get('token', [None])[0]
        
        # Authenticate user
        if not token:
            print(f"No token provided for conversation {self.conversation_id}")
            await self.close(code=4001)
            return
        
        self.user = await self.get_user_from_token(token)
        if not self.user:
            print(f"Invalid token for conversation {self.conversation_id}")
            await self.close(code=4002)
            return
        
        self.user_id = str(self.user.id)
        self.user_name = self.user.full_name
        
        # Validate conversation participation
        if not await self.is_participant():
            print(f"User {self.user_id} not a participant in conversation {self.conversation_id}")
            await self.close(code=4003)
            return
        
        # Check if blocked
        if await self.is_blocked():
            print(f"User {self.user_id} is blocked in conversation {self.conversation_id}")
            await self.close(code=4004)
            return
        
        # Connection accepted
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        
        # Update user activity
        await self.update_last_activity()
        
        # Broadcast user online status
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_status',
                'user_id': self.user_id,
                'user_name': self.user_name,
                'is_online': True
            }
        )
        
        print(f"✅ WebSocket connected: user={self.user_id}, conv={self.conversation_id}")
    
    async def disconnect(self, close_code):
        """Handle disconnection"""
        if hasattr(self, 'user_id') and self.user_id and hasattr(self, 'room_group_name') and self.room_group_name:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_status',
                    'user_id': self.user_id,
                    'user_name': self.user_name,
                    'is_online': False
                }
            )
        
        if hasattr(self, 'room_group_name') and self.room_group_name:
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        
        print(f"❌ WebSocket disconnected: user={getattr(self, 'user_id', 'unknown')}, code={close_code}")
    
    async def receive(self, text_data):
        """Receive message from WebSocket"""
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON")
            return
        
        message_type = data.get('type')
        
        if message_type == 'ping':
            await self.send(text_data=json.dumps({'type': 'pong'}))
        
        elif message_type == 'chat_message':
            await self.handle_chat_message(data)
        
        elif message_type == 'typing':
            await self.handle_typing(data)
        
        elif message_type == 'mark_read':
            await self.handle_mark_read()
        
        elif message_type == 'edit_message':
            await self.handle_edit_message(data)
        
        elif message_type == 'delete_message':
            await self.handle_delete_message(data)
    
    async def chat_message(self, event):
        """Send message to WebSocket client"""
        try:
            # Ensure all UUIDs are converted to strings
            serialized_event = {}
            for key, value in event.items():
                if hasattr(value, '__class__') and 'UUID' in str(value.__class__):
                    serialized_event[key] = str(value)
                elif isinstance(value, dict):
                    serialized_event[key] = {
                        k: str(v) if hasattr(v, '__class__') and 'UUID' in str(v.__class__) else v
                        for k, v in value.items()
                    }
                else:
                    serialized_event[key] = value
            await self.send(text_data=json.dumps(serialized_event))
        except Exception as e:
            print(f"Error sending message: {e}")
            # Fallback - send minimal message
            fallback = {
                'type': 'chat_message',
                'id': str(event.get('id', '')),
                'conversation_id': str(event.get('conversation_id', '')),
                'sender_id': str(event.get('sender_id', '')),
                'content': event.get('content', ''),
                'msg_type': event.get('msg_type', 'TEXT'),
                'created_at': event.get('created_at', ''),
            }
            await self.send(text_data=json.dumps(fallback))
    
    async def user_status(self, event):
        """Send user status to WebSocket client"""
        await self.send(text_data=json.dumps({
            'type': 'presence',
            'user_id': event['user_id'],
            'user_name': event.get('user_name', ''),
            'is_online': event['is_online']
        }))
    
    async def typing_indicator(self, event):
        """Send typing indicator to WebSocket client"""
        if event['user_id'] != self.user_id:
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'user_name': event.get('user_name', ''),
                'is_typing': event.get('is_typing', True)
            }))
    
    async def messages_read(self, event):
        """Send read receipt to WebSocket client"""
        await self.send(text_data=json.dumps({
            'type': 'messages_read',
            'read_by': event['read_by'],
            'conversation_id': str(event['conversation_id'])
        }))
    
    async def message_edited(self, event):
        """Send edit notification to WebSocket client"""
        await self.send(text_data=json.dumps({
            'type': 'message_edited',
            'message_id': event['message_id'],
            'new_content': event['new_content'],
            'edited_at': event['edited_at'],
            'conversation_id': str(event['conversation_id'])
        }))
    
    async def message_deleted(self, event):
        """Send delete notification to WebSocket client"""
        await self.send(text_data=json.dumps({
            'type': 'message_deleted',
            'message_id': event['message_id'],
            'deleted_by': event['deleted_by'],
            'conversation_id': str(event['conversation_id'])
        }))
    
    # ==================== Handler Methods ====================
    
    async def handle_chat_message(self, data):
        """Process and broadcast chat message"""
        if not self.user_id:
            await self.send_error("Not authenticated")
            return
        
        # Rate limiting
        if not await self.rate_limit_check():
            await self.send_error("Rate limit exceeded. Please slow down.")
            return
        
        # Verify sender
        if data.get('sender_id') != self.user_id:
            await self.send_error("Invalid sender")
            return
        
        # Check if still blocked
        if await self.is_blocked():
            await self.send_error("You are blocked from sending messages in this conversation")
            return
        
        # Save message to database
        message = await self.save_message(data)
        
        # Prepare broadcast message with all UUIDs as strings
        broadcast_data = {
            'type': 'chat_message',
            'id': str(message.id),
            'conversation_id': str(self.conversation_id),
            'sender_id': self.user_id,
            'sender_name': self.user_name,
            'content': data.get('content', ''),
            'file_url': data.get('file_url', ''),
            'msg_type': data.get('msg_type', 'TEXT'),
            'created_at': message.created_at.isoformat(),
            'timestamp': message.created_at.isoformat(),
            'is_read': message.is_read,
            'is_delivered': True,
            'reply_to_id': data.get('reply_to_id'),
            'duration': data.get('duration'),
        }
        
        # Broadcast to group
        await self.channel_layer.group_send(
            self.room_group_name,
            broadcast_data
        )
        
        print(f"📨 Message sent: {message.id} in conversation {self.conversation_id}")
    
    async def handle_typing(self, data):
        """Broadcast typing indicator"""
        if not self.user_id:
            return
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_indicator',
                'user_id': self.user_id,
                'user_name': self.user_name,
                'is_typing': data.get('is_typing', True)
            }
        )
    
    async def handle_mark_read(self):
        """Mark messages as read"""
        if not self.user_id:
            return
        
        updated = await self.mark_messages_read()
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'messages_read',
                'read_by': self.user_id,
                'conversation_id': str(self.conversation_id)
            }
        )
        if updated > 0:
            print(f"📖 {updated} messages marked as read by {self.user_id}")
    
    async def handle_edit_message(self, data):
        """Edit an existing message"""
        if not self.user_id:
            await self.send_error("Not authenticated")
            return
        
        message_id = data.get('message_id')
        new_content = data.get('content', '')
        
        if not message_id or not new_content:
            await self.send_error("Message ID and content required")
            return
        
        success = await self.edit_message(message_id, new_content)
        if success:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'message_edited',
                    'message_id': message_id,
                    'new_content': new_content,
                    'edited_at': timezone.now().isoformat(),
                    'conversation_id': str(self.conversation_id)
                }
            )
            print(f"✏️ Message {message_id} edited by {self.user_id}")
        else:
            await self.send_error("Cannot edit message - either not found, not yours, or edit window expired")
    
    async def handle_delete_message(self, data):
        """Delete a message"""
        if not self.user_id:
            await self.send_error("Not authenticated")
            return
        
        message_id = data.get('message_id')
        if not message_id:
            await self.send_error("Message ID required")
            return
        
        success = await self.delete_message(message_id)
        if success:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'message_deleted',
                    'message_id': message_id,
                    'deleted_by': self.user_id,
                    'conversation_id': str(self.conversation_id)
                }
            )
            print(f"🗑️ Message {message_id} deleted by {self.user_id}")
        else:
            await self.send_error("Cannot delete message - not found or not yours")
    
    async def send_error(self, message):
        """Send error message to client"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': message
        }))
    
    # ==================== Database Operations ====================
    
    @database_sync_to_async
    def get_user_from_token(self, token):
        """Extract user from JWT token"""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            if user_id:
                return User.objects.get(id=user_id, is_active=True)
        except jwt.ExpiredSignatureError:
            print(f"JWT token expired")
        except jwt.InvalidTokenError:
            print(f"Invalid JWT token")
        except Exception as e:
            print(f"Token authentication error: {e}")
        return None
    
    @database_sync_to_async
    def is_participant(self):
        """Check if user is a participant in the conversation"""
        try:
            conv = Conversation.objects.filter(id=self.conversation_id).first()
            if not conv:
                return False
            return conv.participants.filter(id=self.user_id).exists()
        except Exception as e:
            print(f"Participant check error: {e}")
            return False
    
    @database_sync_to_async
    def is_blocked(self):
        """Check if user is blocked in this conversation"""
        try:
            conv = Conversation.objects.get(id=self.conversation_id)
            other = conv.participants.exclude(id=self.user_id).first()
            if other:
                return BlockedUser.objects.filter(blocker=other, blocked_id=self.user_id).exists()
            return False
        except Exception as e:
            print(f"Block check error: {e}")
            return False
    
    @database_sync_to_async
    def save_message(self, data):
        """Save message to database"""
        conversation = Conversation.objects.get(id=self.conversation_id)
        sender = User.objects.get(id=self.user_id)
        
        message = Message.objects.create(
            conversation=conversation,
            sender=sender,
            content=data.get('content', ''),
            file_url=data.get('file_url', ''),
            msg_type=data.get('msg_type', 'TEXT'),
            duration=data.get('duration'),
            is_delivered=True,
        )
        
        # Update conversation preview
        preview = data.get('content', '') or ''
        if data.get('msg_type') == 'VOICE':
            preview = '🎤 Voice message'
        elif data.get('msg_type') == 'FILE' and not preview:
            preview = '📎 File attachment'
        
        conversation.last_message_preview = preview[:200]
        conversation.last_message_at = message.created_at
        conversation.save(update_fields=['last_message_preview', 'last_message_at'])
        
        return message
    
    @database_sync_to_async
    def update_last_activity(self):
        """Update user's last activity timestamp"""
        User.objects.filter(id=self.user_id).update(last_activity=timezone.now())
    
    @database_sync_to_async
    def mark_messages_read(self):
        """Mark all unread messages as read"""
        return Message.objects.filter(
            conversation_id=self.conversation_id,
            is_read=False
        ).exclude(sender_id=self.user_id).update(
            is_read=True, 
            read_at=timezone.now()
        )
    
    @database_sync_to_async
    def edit_message(self, message_id, new_content):
        """Edit a message"""
        try:
            message = Message.objects.get(
                id=message_id,
                conversation_id=self.conversation_id,
                sender_id=self.user_id,
                is_deleted=False
            )
            # Check edit window (5 minutes)
            time_diff = timezone.now() - message.created_at
            if time_diff.total_seconds() > 300:
                print(f"Edit window expired for message {message_id}")
                return False
            
            message.content = new_content
            message.edited_at = timezone.now()
            message.save(update_fields=['content', 'edited_at'])
            return True
        except Message.DoesNotExist:
            print(f"Message {message_id} not found for editing")
            return False
    
    @database_sync_to_async
    def delete_message(self, message_id):
        """Soft delete a message"""
        try:
            message = Message.objects.get(
                id=message_id,
                conversation_id=self.conversation_id,
                sender_id=self.user_id
            )
            message.is_deleted = True
            message.deleted_at = timezone.now()
            message.deleted_by_id = self.user_id
            message.content = '[Message deleted]'
            message.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by', 'content'])
            return True
        except Message.DoesNotExist:
            print(f"Message {message_id} not found for deletion")
            return False
    
    async def rate_limit_check(self):
        """Rate limiting for messages - 20 messages per minute"""
        key = f"chat_rate:{self.user_id}"
        count = await database_sync_to_async(cache.get)(key)
        
        if count is None:
            await database_sync_to_async(cache.set)(key, 1, timeout=60)
            return True
        
        if count >= 20:
            print(f"Rate limit exceeded for user {self.user_id}")
            return False
        
        await database_sync_to_async(cache.incr)(key)
        return True