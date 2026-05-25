import firebase_admin
from firebase_admin import credentials, messaging
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.initialize()
        return cls._instance
    
    def initialize(self):
        """Initialize Firebase app safely"""
        if not firebase_admin._apps:
            try:
                if hasattr(settings, 'FIREBASE_CREDENTIALS') and settings.FIREBASE_CREDENTIALS:
                    cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS)
                    firebase_admin.initialize_app(cred)
                    logger.info("Firebase initialized successfully")
            except Exception as e:
                logger.error(f"Firebase initialization failed: {e}")

    def _cleanup_token(self, user, token):
        """Remove invalid tokens from database"""
        if user.fcm_token == token:
            user.fcm_token = None
            user.save(update_fields=['fcm_token'])
            logger.info(f"Invalid FCM token removed for user {user.id}")

    def send_push_notification(self, user, title, body, data=None):
        """Send push notification to a single user"""
        if not user.fcm_token:
            return False
        
        try:
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data=data or {},
                token=user.fcm_token,
            )
            messaging.send(message)
            return True
        except messaging.UnregisteredError:
            self._cleanup_token(user, user.fcm_token)
        except Exception as e:
            logger.error(f"Failed to send notification to {user.id}: {e}")
        return False
    
    def send_bulk_notification(self, users, title, body, data=None):
        """Send push notification to multiple users (Chunked to 500)"""
        # Filter users with tokens
        valid_users = [u for u in users if u.fcm_token]
        if not valid_users:
            return False
        
        tokens = [u.fcm_token for u in valid_users]
        
        # Firebase limits multicast to 500 tokens per request
        for i in range(0, len(tokens), 500):
            chunk = tokens[i:i + 500]
            try:
                message = messaging.MulticastMessage(
                    notification=messaging.Notification(title=title, body=body),
                    data=data or {},
                    tokens=chunk,
                )
                response = messaging.send_multicast(message)
                
                # Check for failed tokens in this chunk
                if response.failure_count > 0:
                    for idx, resp in enumerate(response.responses):
                        if not resp.success and isinstance(resp.exception, messaging.UnregisteredError):
                            # In a bulk scenario, you may need to map index back to user
                            logger.info("Found unregistered token in bulk send.")
                            
            except Exception as e:
                logger.error(f"Bulk notification chunk failed: {e}")
        
        return True