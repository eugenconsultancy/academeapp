from ninja import Router
from common.jwt_auth import JWTAuth
from .models import Notification

router = Router()

@router.get("/", auth=JWTAuth())
def list_notifications(request):
    """Get the authenticated user's notifications (most recent 50)."""
    notifications = Notification.objects.filter(
        user=request.auth
    ).order_by('-created_at')[:50]

    return [{
        "id": str(n.id),
        "title": n.title,
        "message": n.message,
        "type": n.notification_type,
        "is_read": n.is_read,
        "created_at": str(n.created_at),
        "link": n.link or "",
    } for n in notifications]

@router.post("/mark-read/", auth=JWTAuth())
def mark_all_read(request):
    """Mark all notifications as read for the authenticated user."""
    Notification.objects.filter(user=request.auth, is_read=False).update(is_read=True)
    return {"message": "All notifications marked as read"}