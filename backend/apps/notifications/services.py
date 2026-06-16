# backend/apps/notifications/services.py
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
    _firebase_initialized = None

    @staticmethod
    def _init_firebase():
        if NotificationService._firebase_initialized is not None:
            return NotificationService._firebase_initialized

        try:
            cred_path = getattr(settings, 'FIREBASE_CREDENTIALS', None)
            if cred_path:
                if not firebase_admin._apps:
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred)
                NotificationService._firebase_initialized = True
                logger.info("Firebase initialized for notifications")
            else:
                logger.warning("No FIREBASE_CREDENTIALS configured")
                NotificationService._firebase_initialized = False
        except Exception as e:
            logger.error(f"Firebase init failed: {e}")
            NotificationService._firebase_initialized = None

        return NotificationService._firebase_initialized

    @staticmethod
    def _send_push(user, title, body, data_payload=None):
        if not user.fcm_token:
            return False
        pref, _ = NotificationPreference.objects.get_or_create(user=user)
        notification_type = data_payload.get('type', 'system') if data_payload else 'system'
        if not pref.is_enabled(notification_type):
            return False

        if not NotificationService._init_firebase():
            return False

        try:
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data=data_payload or {},
                token=user.fcm_token,
            )
            messaging.send(message)
            return True
        except messaging.UnregisteredError:
            user.fcm_token = None
            user.save(update_fields=['fcm_token'])
            logger.info(f"Invalid FCM token removed for user {user.id}")
        except Exception as e:
            logger.error(f"Push send error to {user.id}: {e}")
        return False

    @staticmethod
    def _send_websocket(user, notification_dict):
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
    def create_and_push(user, title, message, notification_type="system", link=None, data=None, source_type=None, source_id=None, client_id=None):
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
            "client_id": client_id,
            "title": notification.title,
            "message": notification.message,
            "type": notification.notification_type,
            "is_read": False,
            "is_deleted": False,
            "created_at": notification.created_at.isoformat(),
            "link": notification.link,
            "source_type": notification.source_type,
            "source_id": str(notification.source_id) if notification.source_id else None,
        }
        NotificationService._send_websocket(user, payload)
        data_payload = {"type": notification_type, "notification_id": str(notification.id)}
        if link:
            data_payload["link"] = link
        if client_id:
            data_payload["client_id"] = client_id
        NotificationService._send_push(user, title, message, data_payload)
        return notification

    @staticmethod
    def send_bulk(users, title, message, notification_type="system", link=None, data=None, source_type=None, source_id=None):
        if not users:
            return []

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
        created = Notification.objects.bulk_create(notifications, batch_size=500)

        chunk_size = 100
        for i in range(0, len(created), chunk_size):
            chunk = created[i:i + chunk_size]
            for notification in chunk:
                payload = {
                    "id": str(notification.id),
                    "client_id": None,
                    "title": notification.title,
                    "message": notification.message,
                    "type": notification.notification_type,
                    "is_read": False,
                    "is_deleted": False,
                    "created_at": notification.created_at.isoformat(),
                    "link": notification.link,
                    "source_type": notification.source_type,
                    "source_id": str(notification.source_id) if notification.source_id else None,
                }
                NotificationService._send_websocket(notification.user, payload)
                data_payload = {"type": notification_type, "notification_id": str(notification.id)}
                if link:
                    data_payload["link"] = link
                NotificationService._send_push(notification.user, title, message, data_payload)

        return created