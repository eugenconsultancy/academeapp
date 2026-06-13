# backend/apps/notifications/consumers.py
import json
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.conf import settings
import jwt
import asyncio
import logging


logger = logging.getLogger(__name__)

User = get_user_model()


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time notifications.
    Authenticates via JWT token in query string.
    """
    
    # Heartbeat configuration
    HEARTBEAT_INTERVAL = 30  # seconds
    HEARTBEAT_TIMEOUT = 10   # seconds
    
    async def connect(self):
        """Handle WebSocket connection"""
        try:
            # Initialize attributes
            self.user = None
            self.group_name = None
            self.heartbeat_task = None
            self.pong_timeout = None
            
            # Authenticate via token query parameter
            query_string = self.scope['query_string'].decode()
            params = parse_qs(query_string)
            token = params.get('token', [None])[0]
            
            if not token:
                logger.warning("Notification WebSocket: No token provided")
                await self.close(code=4001)
                return

            # Validate token and get user
            user = await self.get_user_from_token(token)
            if not user:
                logger.warning(f"Notification WebSocket: Invalid token")
                await self.close(code=4002)
                return
            
            self.user = user
            self.group_name = f"user_{user.id}_notifications"
            
            # Add to channel layer group
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            
            # Accept the connection
            await self.accept()
            
            # Start heartbeat
            self.heartbeat_task = self.channel_layer.send(
                self.channel_name,
                {
                    'type': 'heartbeat.check',
                }
            )
            # Start heartbeat loop as background task
            import asyncio
            asyncio.create_task(self.heartbeat_loop())
            
            logger.info(f"✅ Notification WebSocket connected: user={user.id}")
            
        except Exception as e:
            logger.error(f"Notification WebSocket connection error: {e}")
            await self.close(code=4000)
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        try:
            if hasattr(self, 'group_name') and self.group_name:
                await self.channel_layer.group_discard(self.group_name, self.channel_name)
                logger.info(f"❌ Notification WebSocket disconnected: user={getattr(self.user, 'id', 'unknown')}, code={close_code}")
        except Exception as e:
            logger.error(f"Notification WebSocket disconnect error: {e}")
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages (ping/pong)"""
        try:
            data = json.loads(text_data)
            
            # Handle ping - respond with pong
            if data.get('type') == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
                logger.debug(f"Ping received from user {getattr(self.user, 'id', 'unknown')}")
                
            # Handle client pong response
            elif data.get('type') == 'pong':
                # Clear the timeout if we have one
                if hasattr(self, 'pong_timeout') and self.pong_timeout:
                    self.pong_timeout.cancel()
                    self.pong_timeout = None
                logger.debug(f"Pong received from user {getattr(self.user, 'id', 'unknown')}")
                
        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON received: {text_data[:100]}")
        except Exception as e:
            logger.error(f"Error processing message: {e}")
    
    async def notification_message(self, event):
        """Receive a notification message and send it to WebSocket client"""
        try:
            message = event['message']
            
            # Add the message type if not present
            if 'type' not in message:
                message['type'] = 'new_notification'
            
            # Send to WebSocket
            await self.send(text_data=json.dumps(message))
            logger.debug(f"Notification sent to user {getattr(self.user, 'id', 'unknown')}: {message.get('title', '')}")
            
        except Exception as e:
            logger.error(f"Error sending notification to WebSocket: {e}")
    
    async def heartbeat_check(self, event):
        """Handle heartbeat check (can be used for server-side health checks)"""
        # This method can be called from the channel layer
        await self.send(text_data=json.dumps({'type': 'heartbeat'}))
    
    async def heartbeat_loop(self):
        """Periodic heartbeat to keep connection alive"""
        import asyncio
        
        while True:
            try:
                await asyncio.sleep(self.HEARTBEAT_INTERVAL)
                
                # Send ping to client
                await self.send(text_data=json.dumps({'type': 'ping'}))
                
                # Wait for pong response
                try:
                    await asyncio.wait_for(self.wait_for_pong(), timeout=self.HEARTBEAT_TIMEOUT)
                except asyncio.TimeoutError:
                    logger.warning(f"No pong from user {getattr(self.user, 'id', 'unknown')}, closing connection")
                    await self.close(code=4000)
                    break
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Heartbeat error: {e}")
                break
    
    async def wait_for_pong(self):
        """Wait for a pong response from the client"""
        future = asyncio.Future()
        self.pong_future = future
        await future
    
    @database_sync_to_async
    def get_user_from_token(self, token):
        """Validate JWT token and return user object"""
        try:
            # Decode JWT token
            secret = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
            payload = jwt.decode(token, secret, algorithms=['HS256'])
            user_id = payload.get('user_id')
            
            if not user_id:
                logger.warning("No user_id in JWT payload")
                return None
            
            # Get user from database
            user = User.objects.get(pk=user_id, is_active=True)
            return user
            
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token expired for notification WebSocket")
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
        except User.DoesNotExist:
            logger.warning(f"User not found for user_id: {user_id if 'user_id' in locals() else 'unknown'}")
        except Exception as e:
            logger.error(f"Unexpected error in get_user_from_token: {e}")
        
        return None