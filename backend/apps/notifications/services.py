from .models import Notification

class NotificationService:
    @staticmethod
    def send(user, title, message, notification_type="system", link=None):
        """Create a notification for a single user."""
        return Notification.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            link=link or ""
        )
    
    @staticmethod
    def send_bulk(users, title, message, notification_type="system", link=None):
        """Create notifications for multiple users (efficient bulk insert)."""
        notifications = [
            Notification(
                user=user,
                title=title,
                message=message,
                notification_type=notification_type,
                link=link or ""
            )
            for user in users
        ]
        return Notification.objects.bulk_create(notifications)