import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
import jwt
from django.conf import settings
from .models import Conversation, Message

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

        # Store only the user ID and basic identity – never an ORM object
        self.user_id = user.id
        self.scope['user'] = user          # still needed for save_message? We'll avoid lazy loading

        # Validate conversation and participation using primitive IDs only
        valid = await self.validate_participation()
        if not valid:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get('type') != 'chat_message':
            return

        # Rate limit (placeholder)
        await self.rate_limit_check()

        # Validate sender
        if data.get('sender_id') != str(self.user_id):
            return

        # Save message without touching any ORM object outside sync_to_async
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
                }
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event['message']))

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            return User.objects.get(id=payload['user_id'])
        except (jwt.ExpiredSignatureError, jwt.DecodeError, User.DoesNotExist):
            return None

    @database_sync_to_async
    def validate_participation(self):
        """
        Synchronously check if the user is a participant of the conversation.
        Returns True/False.  No ORM objects are returned or stored as instance attributes.
        """
        conv = Conversation.objects.filter(id=self.conversation_id, is_active=True).first()
        if not conv:
            return False
        # Use the user_id we stored earlier, which is a primitive
        return conv.participants.filter(id=self.user_id).exists()

    @database_sync_to_async
    def save_message(self, data):
        """
        Creates a message. All database access is inside this sync wrapper.
        The user is fetched fresh each time (or we could pass user_id) to avoid
        any reference to a potentially stale ORM object.
        """
        conversation = Conversation.objects.get(id=self.conversation_id)
        sender = User.objects.get(id=self.user_id)
        return Message.objects.create(
            conversation=conversation,
            sender=sender,
            content=data.get('content', ''),
            file_url=data.get('file_url', ''),
            msg_type=data.get('msg_type', 'TEXT'),
        )

    async def rate_limit_check(self):
        # Placeholder for real rate limiting (not implemented)
        pass