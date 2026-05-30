import firebase_admin
from firebase_admin import credentials, messaging
from django.conf import settings
from django.core.mail import send_mail
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
        if not users:
            return False
        
        # Build a mapping from token to user for cleanup
        token_user_map = {u.fcm_token: u for u in users if u.fcm_token}
        tokens = list(token_user_map.keys())
        
        if not tokens:
            return False
        
        for i in range(0, len(tokens), 500):
            chunk = tokens[i:i+500]
            try:
                message = messaging.MulticastMessage(
                    notification=messaging.Notification(title=title, body=body),
                    data=data or {},
                    tokens=chunk,
                )
                response = messaging.send_multicast(message)
                
                # Clean up failed tokens
                if response.failure_count > 0:
                    for idx, resp in enumerate(response.responses):
                        if not resp.success and isinstance(resp.exception, messaging.UnregisteredError):
                            token = chunk[idx]
                            user = token_user_map.get(token)
                            if user:
                                self._cleanup_token(user, token)
                            else:
                                logger.warning(f"Unregistered token {token} but no user found")
            except Exception as e:
                logger.error(f"Bulk notification chunk failed: {e}")
        return True
    
    # Email service stub (for password reset, data export, etc.)
    def send_email(self, to_email, subject, html_content, text_content=None):
        """Send an email using Django's send_mail. Requires EMAIL_BACKEND configured."""
        try:
            send_mail(
                subject=subject,
                message=text_content or html_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to_email],
                html_message=html_content,
                fail_silently=False,
            )
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False