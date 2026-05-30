from ninja import Router
from common.jwt_auth import JWTAuth
from .models import Notification
from .services import NotificationService

router = Router()

@router.get("/", auth=JWTAuth())
def list_notifications(request, limit: int = 50, unread_only: bool = False):
    """Get the authenticated user's notifications."""
    user = request.auth
    qs = Notification.objects.filter(user=user).order_by('-created_at')
    if unread_only:
        qs = qs.filter(is_read=False)
    notifications = qs[:limit]
    
    return [{
        "id": str(n.id),
        "title": n.title,
        "message": n.message,
        "type": n.notification_type,
        "is_read": n.is_read,
        "created_at": n.created_at.isoformat(),
        "link": n.link or "",
    } for n in notifications]

@router.get("/unread-count/", auth=JWTAuth())
def unread_count(request):
    """Get the number of unread notifications for the user."""
    count = Notification.objects.filter(user=request.auth, is_read=False).count()
    return {"unread_count": count}

@router.post("/{notification_id}/read/", auth=JWTAuth())
def mark_as_read(request, notification_id: str):
    """Mark a single notification as read."""
    try:
        notif = Notification.objects.get(id=notification_id, user=request.auth)
        if not notif.is_read:
            notif.is_read = True
            notif.save(update_fields=['is_read'])
        return {"message": "Marked as read"}
    except Notification.DoesNotExist:
        return {"error": "Notification not found"}

@router.post("/mark-all-read/", auth=JWTAuth())
def mark_all_read(request):
    """Mark all notifications as read for the authenticated user."""
    updated = Notification.objects.filter(user=request.auth, is_read=False).update(is_read=True)
    return {"message": f"Marked {updated} notifications as read"}

@router.post("/create-test/", auth=JWTAuth())
def create_test_notification(request):
    """Admin only: create a test notification (for debugging)."""
    if request.auth.role != 'admin':
        return {"error": "Unauthorized"}
    NotificationService.send(
        user=request.auth,
        title="Test Notification",
        message="This is a test notification from the admin panel.",
        notification_type="system",
        link="/notifications"
    )
    return {"message": "Test notification created"}