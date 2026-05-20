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
        """Initialize Firebase app"""
        try:
            if settings.FIREBASE_CREDENTIALS:
                cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS)
                firebase_admin.initialize_app(cred)
                logger.info("Firebase initialized successfully")
        except Exception as e:
            logger.error(f"Firebase initialization failed: {e}")
    
    def send_push_notification(self, user, title, body, data=None):
        """Send push notification to a user"""
        if not user.fcm_token:
            logger.warning(f"No FCM token for user {user.id}")
            return False
        
        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data=data or {},
                token=user.fcm_token,
            )
            
            response = messaging.send(message)
            logger.info(f"Notification sent: {response}")
            return True
        except Exception as e:
            logger.error(f"Failed to send notification: {e}")
            return False
    
    def send_bulk_notification(self, users, title, body, data=None):
        """Send push notification to multiple users"""
        tokens = [user.fcm_token for user in users if user.fcm_token]
        
        if not tokens:
            return False
        
        try:
            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data=data or {},
                tokens=tokens,
            )
            
            response = messaging.send_multicast(message)
            logger.info(f"Bulk notification sent: {response.success_count} successful")
            return True
        except Exception as e:
            logger.error(f"Failed to send bulk notification: {e}")
            return False