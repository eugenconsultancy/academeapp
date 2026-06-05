import logging
from django.conf import settings
from django.contrib.auth import get_user_model
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import firebase_admin
from firebase_admin import credentials, messaging

from .models import Notification, NotificationPreference

logger = logging.getLogger(__name__)

User = get_user_model()


class NotificationService:
    _firebase_initialized = False

    @staticmethod
    def _init_firebase():
        """Lazy Firebase initialization"""
        if not NotificationService._firebase_initialized and not firebase_admin._apps:
            try:
                cred_path = getattr(settings, 'FIREBASE_CREDENTIALS', None)
                if cred_path:
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred)
                    NotificationService._firebase_initialized = True
                    logger.info("Firebase initialized for notifications")
            except Exception as e:
                logger.error(f"Firebase init failed: {e}")

    @staticmethod
    def _send_push(user, title, body, data_payload=None):
        """Send a push notification to a single user if token exists and preference allows"""
        if not user.fcm_token:
            return False
        # Check preference
        pref, _ = NotificationPreference.objects.get_or_create(user=user)
        notification_type = data_payload.get('type', 'system') if data_payload else 'system'
        if not pref.is_enabled(notification_type):
            return False

        NotificationService._init_firebase()
        try:
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data=data_payload or {},
                token=user.fcm_token,
            )
            messaging.send(message)
            return True
        except messaging.UnregisteredError:
            # Remove invalid token
            user.fcm_token = None
            user.save(update_fields=['fcm_token'])
            logger.info(f"Invalid FCM token removed for user {user.id}")
        except Exception as e:
            logger.error(f"Push send error to {user.id}: {e}")
        return False

    @staticmethod
    def _send_websocket(user, notification_dict):
        """Send notification via Django Channels to the user's WebSocket group"""
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"user_{user.id}_notifications",
                    {
                        "type": "notification_message",
                        "message": notification_dict,
                    },
                )
        except Exception as e:
            logger.error(f"WebSocket send error: {e}")

    @staticmethod
    def create_and_push(user, title, message, notification_type="system", link=None, data=None, source_type=None, source_id=None):
        """Create DB notification and deliver via WebSocket + push"""
        notification = Notification.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            link=link or "",
            source_type=source_type,
            source_id=source_id,
        )
        payload = {
            "id": str(notification.id),
            "title": notification.title,
            "message": notification.message,
            "type": notification.notification_type,
            "is_read": False,
            "created_at": notification.created_at.isoformat(),
            "link": notification.link,
            "source_type": notification.source_type,
            "source_id": str(notification.source_id) if notification.source_id else None,
        }
        # Push to WebSocket
        NotificationService._send_websocket(user, payload)
        # Push notification via FCM
        data_payload = {"type": notification_type, "notification_id": str(notification.id)}
        if link:
            data_payload["link"] = link
        NotificationService._send_push(user, title, message, data_payload)
        return notification

    @staticmethod
    def send_bulk(users, title, message, notification_type="system", link=None, data=None, source_type=None, source_id=None):
        """Create notifications for multiple users and push to all"""
        if not users:
            return []
        # Create DB records
        notifications = [
            Notification(
                user=user,
                title=title,
                message=message,
                notification_type=notification_type,
                link=link or "",
                source_type=source_type,
                source_id=source_id,
            )
            for user in users
        ]
        Notification.objects.bulk_create(notifications)

        # Send WebSocket + push to each user
        # Notifications created via bulk_create don't have IDs pre-assigned; we need to re-fetch?
        # To get IDs, we'll query the newly created ones.
        # But for performance, we'll re-fetch the batch for the given source if needed.
        # For simplicity, we send without ID for now, but we need ID for WS. We'll fetch after.
        # However, to avoid extra queries, we'll create individually for real-time pushes.
        # Better: after bulk_create, retrieve the notifications for these users with the given created_at range?
        # Let's just iterate and create individually for a moderate number, but for bulk efficiency we'll combine.
        # If user count is large, we might skip WebSocket/push for bulk; but according to requirement, we want real-time.
        # So we'll do individual create for each to get ID and push. Use a batch size.
        # We'll override with individual create_and_push for each user (bypass bulk).
        for user in users:
            NotificationService.create_and_push(
                user=user,
                title=title,
                message=message,
                notification_type=notification_type,
                link=link,
                data=data,
                source_type=source_type,
                source_id=source_id,
            )
        return notifications  # returned list is from bulk_create (if needed)