# backend/apps/notifications/api.py
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
from ninja import Router
from pydantic import BaseModel, Field
from common.jwt_auth import JWTAuth
from .models import Notification, NotificationPreference
from .services import NotificationService

router = Router()

# ── Schemas ──────────────────────────────────────────────
class NotificationOut(BaseModel):
    id: UUID
    title: str
    message: str
    type: str = Field(alias='notification_type')
    is_read: bool
    is_deleted: bool
    created_at: datetime
    link: str
    source_type: Optional[str] = None
    source_id: Optional[UUID] = None

    class Config:
        from_attributes = True


class NotificationDetailOut(BaseModel):
    id: UUID
    title: str
    message: str
    type: str = Field(alias='notification_type')
    is_read: bool
    is_deleted: bool
    created_at: datetime
    link: str
    source_type: Optional[str] = None
    source_id: Optional[UUID] = None
    user_name: Optional[str] = None

    class Config:
        from_attributes = True


class NotificationPage(BaseModel):
    results: List[NotificationOut]
    next_cursor: Optional[str] = None


class MarkReadOut(BaseModel):
    notification: NotificationOut
    message: str


class UnreadCountOut(BaseModel):
    unread_count: int


class MarkAllReadIn(BaseModel):
    before: Optional[datetime] = None


class BulkMarkReadIn(BaseModel):
    notification_ids: List[UUID]


class BulkDeleteIn(BaseModel):
    notification_ids: List[UUID]


class PreferenceOut(BaseModel):
    push_announcement: bool
    push_class: bool
    push_found_item: bool
    push_opportunity: bool
    push_support: bool
    push_governance: bool
    push_system: bool
    push_chat: bool
    push_mention: bool

    class Config:
        from_attributes = True


class PreferenceIn(BaseModel):
    push_announcement: Optional[bool] = None
    push_class: Optional[bool] = None
    push_found_item: Optional[bool] = None
    push_opportunity: Optional[bool] = None
    push_support: Optional[bool] = None
    push_governance: Optional[bool] = None
    push_system: Optional[bool] = None
    push_chat: Optional[bool] = None
    push_mention: Optional[bool] = None


# ── Helpers ─────────────────────────────────────────────
def serialize_notification(notification: Notification) -> dict:
    return {
        "id": str(notification.id),
        "title": notification.title,
        "message": notification.message,
        "type": notification.notification_type,
        "is_read": notification.is_read,
        "is_deleted": notification.is_deleted,
        "created_at": notification.created_at.isoformat(),
        "link": notification.link,
        "source_type": notification.source_type,
        "source_id": str(notification.source_id) if notification.source_id else None,
    }


# ═══════════════════════════════════════════════════════════
# LIST NOTIFICATIONS (cursor-based pagination)
# ═══════════════════════════════════════════════════════════
@router.get("/", auth=JWTAuth(), response=NotificationPage, tags=["Notifications"])
def list_notifications(
    request,
    unread_only: bool = False,
    page_size: int = 20,
    cursor: Optional[str] = None,
):
    user = request.auth
    qs = Notification.objects.filter(user=user, is_deleted=False).order_by('-created_at')
    if unread_only:
        qs = qs.filter(is_read=False)

    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
            if cursor_dt.tzinfo is None:
                cursor_dt = cursor_dt.replace(tzinfo=timezone.utc)
            qs = qs.filter(created_at__lt=cursor_dt)
        except (ValueError, TypeError):
            pass

    items = list(qs[:page_size + 1])
    has_next = len(items) > page_size
    results = items[:page_size]

    next_cursor = None
    if has_next and results:
        next_cursor = results[-1].created_at.isoformat()

    return NotificationPage(
        results=[NotificationOut.from_orm(n) for n in results],
        next_cursor=next_cursor,
    )


# ═══════════════════════════════════════════════════════════
# LIST DELETED NOTIFICATIONS (Trash)
# ═══════════════════════════════════════════════════════════
@router.get("/deleted/", auth=JWTAuth(), response=NotificationPage, tags=["Notifications"])
def list_deleted_notifications(
    request,
    page_size: int = 20,
    cursor: Optional[str] = None,
):
    """List all soft-deleted notifications (trash view)."""
    user = request.auth
    qs = Notification.objects.filter(user=user, is_deleted=True).order_by('-created_at')

    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
            if cursor_dt.tzinfo is None:
                cursor_dt = cursor_dt.replace(tzinfo=timezone.utc)
            qs = qs.filter(created_at__lt=cursor_dt)
        except (ValueError, TypeError):
            pass

    items = list(qs[:page_size + 1])
    has_next = len(items) > page_size
    results = items[:page_size]

    next_cursor = None
    if has_next and results:
        next_cursor = results[-1].created_at.isoformat()

    return NotificationPage(
        results=[NotificationOut.from_orm(n) for n in results],
        next_cursor=next_cursor,
    )


# ═══════════════════════════════════════════════════════════
# UNREAD COUNT
# ═══════════════════════════════════════════════════════════
@router.get("/unread-count/", auth=JWTAuth(), response=UnreadCountOut, tags=["Notifications"])
def unread_count(request):
    user = request.auth
    count = Notification.objects.filter(user=user, is_read=False, is_deleted=False).count()
    return {"unread_count": count}


# ═══════════════════════════════════════════════════════════
# SINGLE NOTIFICATION DETAIL
# ═══════════════════════════════════════════════════════════
@router.get("/{notification_id}/detail/", auth=JWTAuth(), response=NotificationDetailOut, tags=["Notifications"])
def get_notification_detail(request, notification_id: UUID):
    """Get full details for a single notification."""
    user = request.auth
    try:
        notif = Notification.objects.select_related('user').get(
            id=notification_id, user=user, is_deleted=False
        )
        return NotificationDetailOut(
            id=notif.id,
            title=notif.title,
            message=notif.message,
            notification_type=notif.notification_type,
            is_read=notif.is_read,
            is_deleted=notif.is_deleted,
            created_at=notif.created_at,
            link=notif.link,
            source_type=notif.source_type,
            source_id=notif.source_id,
            user_name=notif.user.full_name if hasattr(notif.user, 'full_name') else None,
        )
    except Notification.DoesNotExist:
        return {"error": "Notification not found"}, 404


# ═══════════════════════════════════════════════════════════
# MARK SINGLE AS READ
# ═══════════════════════════════════════════════════════════
@router.post("/{notification_id}/read/", auth=JWTAuth(), response=MarkReadOut, tags=["Notifications"])
def mark_as_read(request, notification_id: UUID):
    user = request.auth
    try:
        notif = Notification.objects.get(id=notification_id, user=user, is_deleted=False)
        if not notif.is_read:
            notif.is_read = True
            notif.save(update_fields=['is_read'])
        return {
            "notification": NotificationOut.from_orm(notif),
            "message": "Marked as read" if notif.is_read else "Already read"
        }
    except Notification.DoesNotExist:
        return {"error": "Notification not found"}, 404


# ═══════════════════════════════════════════════════════════
# MARK SINGLE AS UNREAD
# ═══════════════════════════════════════════════════════════
@router.post("/{notification_id}/unread/", auth=JWTAuth(), response={200: dict}, tags=["Notifications"])
def mark_as_unread(request, notification_id: UUID):
    """Mark a notification as unread."""
    user = request.auth
    try:
        notif = Notification.objects.get(id=notification_id, user=user, is_deleted=False)
        if notif.is_read:
            notif.is_read = False
            notif.save(update_fields=['is_read'])
            return {"message": "Marked as unread"}
        return {"message": "Already unread"}
    except Notification.DoesNotExist:
        return {"error": "Notification not found"}, 404


# ═══════════════════════════════════════════════════════════
# MARK ALL AS READ
# ═══════════════════════════════════════════════════════════
@router.post("/mark-all-read/", auth=JWTAuth(), response={200: dict}, tags=["Notifications"])
def mark_all_read(request, body: MarkAllReadIn = MarkAllReadIn()):
    user = request.auth
    qs = Notification.objects.filter(user=user, is_read=False, is_deleted=False)
    if body.before:
        qs = qs.filter(created_at__lt=body.before)
    updated_count = qs.update(is_read=True)
    return {"message": f"Marked {updated_count} notifications as read"}


# ═══════════════════════════════════════════════════════════
# BULK MARK AS READ
# ═══════════════════════════════════════════════════════════
@router.post("/bulk-mark-read/", auth=JWTAuth(), response={200: dict}, tags=["Notifications"])
def bulk_mark_read(request, body: BulkMarkReadIn):
    user = request.auth
    if user.role == 'admin':
        qs = Notification.objects.filter(id__in=body.notification_ids, is_deleted=False)
    else:
        qs = Notification.objects.filter(id__in=body.notification_ids, user=user, is_deleted=False)
    count = qs.update(is_read=True)
    return {"message": f"Marked {count} notifications as read"}


# ═══════════════════════════════════════════════════════════
# BULK DELETE (Soft)
# ═══════════════════════════════════════════════════════════
@router.post("/bulk-delete/", auth=JWTAuth(), response={200: dict}, tags=["Notifications"])
def bulk_delete(request, body: BulkDeleteIn):
    """Soft-delete multiple notifications at once."""
    user = request.auth
    qs = Notification.objects.filter(id__in=body.notification_ids, user=user, is_deleted=False)
    count = qs.update(is_deleted=True)
    return {"message": f"{count} notifications moved to trash"}


# ═══════════════════════════════════════════════════════════
# DELETE ALL READ (Soft-delete all read)
# ═══════════════════════════════════════════════════════════
@router.delete("/read/", auth=JWTAuth(), response={200: dict}, tags=["Notifications"])
def delete_all_read(request):
    """Soft-delete all read notifications."""
    user = request.auth
    count = Notification.objects.filter(user=user, is_read=True, is_deleted=False).update(is_deleted=True)
    return {"message": f"{count} read notifications moved to trash"}


# ═══════════════════════════════════════════════════════════
# EMPTY TRASH
# ═══════════════════════════════════════════════════════════
@router.delete("/trash/empty/", auth=JWTAuth(), response={200: dict}, tags=["Notifications"])
def empty_trash(request):
    """Permanently delete all soft-deleted notifications."""
    user = request.auth
    count = Notification.objects.filter(user=user, is_deleted=True).delete()[0]
    return {"message": f"Permanently deleted {count} notifications from trash"}


# ═══════════════════════════════════════════════════════════
# RESTORE FROM TRASH
# ═══════════════════════════════════════════════════════════
@router.post("/{notification_id}/restore/", auth=JWTAuth(), response={200: dict}, tags=["Notifications"])
def restore_notification(request, notification_id: UUID):
    """Restore a soft-deleted notification from trash."""
    user = request.auth
    try:
        notif = Notification.objects.get(id=notification_id, user=user, is_deleted=True)
        notif.is_deleted = False
        notif.save(update_fields=['is_deleted'])
        return {"message": "Notification restored"}
    except Notification.DoesNotExist:
        return {"error": "Notification not found or not in trash"}, 404


# ═══════════════════════════════════════════════════════════
# DELETE (SOFT) NOTIFICATION
# ═══════════════════════════════════════════════════════════
@router.delete("/{notification_id}/", auth=JWTAuth(), response={200: dict}, tags=["Notifications"])
def delete_notification(request, notification_id: UUID):
    user = request.auth
    try:
        notif = Notification.objects.get(id=notification_id, user=user)
        notif.is_deleted = True
        notif.save(update_fields=['is_deleted'])
        return {"message": "Notification moved to trash"}
    except Notification.DoesNotExist:
        return {"error": "Notification not found"}, 404


# ═══════════════════════════════════════════════════════════
# PERMANENT DELETE (only if already soft-deleted)
# ═══════════════════════════════════════════════════════════
@router.delete("/{notification_id}/permanent/", auth=JWTAuth(), response={200: dict}, tags=["Notifications"])
def permanent_delete(request, notification_id: UUID):
    """Permanently delete a notification (only if already in trash)."""
    user = request.auth
    try:
        notif = Notification.objects.get(id=notification_id, user=user)
        if not notif.is_deleted:
            return {"error": "Notification must be in trash before permanent deletion"}, 400
        notif.delete()
        return {"message": "Notification permanently deleted"}
    except Notification.DoesNotExist:
        return {"error": "Notification not found"}, 404


# ═══════════════════════════════════════════════════════════
# NOTIFICATION PREFERENCES
# ═══════════════════════════════════════════════════════════
@router.get("/preferences/", auth=JWTAuth(), response=PreferenceOut, tags=["Notifications"])
def get_preferences(request):
    user = request.auth
    pref, _ = NotificationPreference.objects.get_or_create(user=user)
    return PreferenceOut.from_orm(pref)


@router.put("/preferences/", auth=JWTAuth(), response=PreferenceOut, tags=["Notifications"])
def update_preferences(request, payload: PreferenceIn):
    user = request.auth
    pref, _ = NotificationPreference.objects.get_or_create(user=user)
    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pref, field, value)
    pref.save()
    return PreferenceOut.from_orm(pref)


# ═══════════════════════════════════════════════════════════
# TEST NOTIFICATION (admin only)
# ═══════════════════════════════════════════════════════════
@router.post("/create-test/", auth=JWTAuth(), response={200: dict}, tags=["Notifications"])
def create_test_notification(request):
    user = request.auth
    if user.role != 'admin':
        return {"error": "Unauthorized"}, 403
    NotificationService.create_and_push(
        user=user,
        title="Test Notification",
        message="This is a test notification from the admin panel.",
        notification_type="system",
        link="/notifications",
        source_type="system",
    )
    return {"message": "Test notification created"}