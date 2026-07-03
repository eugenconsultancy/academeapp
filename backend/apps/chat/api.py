# backend/apps/chat/api.py
"""
REST API endpoints for the chat application.
Uses Django Ninja with:
- JWT authentication (Bearer)
- Daily rate limit (60 msgs/user/day) via Redis (DB fallback)
- Block checks with database (and Redis cache when available)
- Cursor‑based pagination for messages (oldest → newest)
- Full‑text search on messages (PostgreSQL GIN)
- Presigned POST URL for direct S3 uploads
- Bulk offline queue sync, user search, admin endpoints
- Draft sync, leave conversation, read receipts
- Attachment size & type validation, edit time window enforcement
- WebSocket broadcast integration via Django Channels
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional, List

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import F, Q, Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
from ninja import Router, Query
from ninja.errors import HttpError
from ninja.security import HttpBearer
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

try:
    from django_redis import get_redis_connection
except ImportError:
    get_redis_connection = None

from .models import (
    Conversation, ConversationParticipant, Message, MessageStatus,
    MessageType, BlockList, Report, ReportStatus, ReportReason,
    MessageReadReceipt, DeviceToken, BulkMessageTask,
)
from .schemas import (
    MessageIn, MessageOut, PaginatedMessages, ConversationOut,
    StartConversationIn, BlockUserIn, MarkReadIn, ReportIn,
    BulkMessageIn, ForwardMessageIn, PresignedUrlIn, PresignedUrlOut,
    DraftIn, BulkSendIn, BulkMessageItem, RateLimitOut,
    UserSearchOut, MessageSearchOut, ParticipantInfo,
    SendMessageResponse, BulkSendResponse,
)
from .notifications import send_push_notification
from .services import PresenceService

router = Router(tags=["chat"])
User = get_user_model()


# ─── Authentication ───────────────────────────────────────────────────────────

class AuthBearer(HttpBearer):
    def authenticate(self, request, token):
        try:
            import jwt as pyjwt
            algorithm = getattr(settings, 'JWT_ALGORITHM', 'HS256')
            payload = pyjwt.decode(
                token,
                settings.SECRET_KEY if algorithm == 'HS256' else settings.JWT_PUBLIC_KEY,
                algorithms=[algorithm],
                options={'verify_exp': True},
            )
            user_id = payload.get('user_id') or payload.get('sub')
            if not user_id:
                return None
            return User.objects.get(id=user_id)
        except Exception:
            return None


auth = AuthBearer()


# ─── Redis helpers ────────────────────────────────────────────────────────────

def _redis():
    if not get_redis_connection:
        return None
    try:
        return get_redis_connection("default")
    except NotImplementedError:
        return None


# ─── Rate‑limit helpers ─────────────────────────────────────────────────────

def _daily_key(user_id) -> str:
    today = timezone.now().date().isoformat()
    return f"daily_msg:{user_id}:{today}"


def _get_midnight_utc() -> datetime:
    now = timezone.now()
    return (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)


def check_daily_limit(user_id) -> tuple:
    r = _redis()
    if r:
        key = _daily_key(user_id)
        count = r.get(key)
        count = int(count) if count else 0
    else:
        today = timezone.now().date()
        count = Message.objects.filter(
            sender_id=user_id, created_at__date=today
        ).count()
    limit = getattr(settings, 'CHAT_RATE_LIMIT_MESSAGES_PER_DAY', 60)
    reset_at = _get_midnight_utc()
    return count >= limit, count, limit, reset_at


def increment_daily_limit(user_id) -> int:
    r = _redis()
    if r:
        key = _daily_key(user_id)
        if not r.exists(key):
            midnight = _get_midnight_utc()
            ttl = int((midnight - timezone.now()).total_seconds())
            r.setex(key, max(ttl, 1), 1)
            return 1
        return r.incr(key)
    else:
        today = timezone.now().date()
        return Message.objects.filter(
            sender_id=user_id, created_at__date=today
        ).count() + 1


# ─── Block helpers ──────────────────────────────────────────────────────────

def _block_key(blocker_id) -> str:
    return f"blocked:{blocker_id}"


def user_blocks(blocker_id, blocked_id) -> bool:
    r = _redis()
    if r and r.sismember(_block_key(blocker_id), str(blocked_id)):
        return True
    return BlockList.objects.filter(
        blocker_id=blocker_id, blocked_user_id=blocked_id
    ).exists()


def add_block_to_cache(blocker_id, blocked_id):
    r = _redis()
    if r:
        r.sadd(_block_key(blocker_id), str(blocked_id))


def remove_block_from_cache(blocker_id, blocked_id):
    r = _redis()
    if r:
        r.srem(_block_key(blocker_id), str(blocked_id))


# ─── Online status via PresenceService ──────────────────────────────────────

# Direct Redis check removed – use PresenceService.is_online() everywhere


# ─── WebSocket broadcast ─────────────────────────────────────────────────────

def _broadcast_to_conversation(conversation_id, event: dict):
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"chat_{conversation_id}", event
        )
    except Exception:
        pass


# ─── Helper: get conversation for user ────────────────────────────────────────

def _get_user_conversation(conversation_id: uuid.UUID, user) -> Conversation:
    conv = get_object_or_404(Conversation, id=conversation_id)
    if not conv.participants.filter(id=user.id).exists():
        raise HttpError(403, "Not a participant of this conversation.")
    return conv


# ─── Helper: Build ParticipantInfo for other user ────────────────────────────

def _build_other_participant(conv, current_user) -> Optional[ParticipantInfo]:
    """Return ParticipantInfo for the other user in a 1‑on‑1 chat, or None."""
    if conv.is_group:
        return None
    other = conv.get_other_participant(current_user)
    if not other:
        return None
    # Fetch only needed fields
    other = User.objects.filter(id=other.id).only(
        'id', 'full_name', 'profile_pic', 'avatar_color'
    ).first()
    if not other:
        return None
    return ParticipantInfo(
        id=other.id,
        full_name=other.full_name or other.phone_number or "Unknown",
        avatar_url=other.profile_pic or None,
        avatar_color=getattr(other, 'avatar_color', None),
        is_online=PresenceService.is_online(other.id),
    )


# ─── Conversation Endpoints ───────────────────────────────────────────────────

@router.get("/conversations", response=List[ConversationOut], auth=auth)
def list_conversations(
    request,
    filter: str = Query("all"),
    cursor: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
):
    user = request.auth
    participations = ConversationParticipant.objects.filter(
        user=user, is_deleted=False
    ).select_related('conversation')

    if filter == "unread":
        participations = participations.filter(unread_count__gt=0)
    elif filter == "read":
        participations = participations.filter(unread_count=0)
    elif filter == "archived":
        participations = participations.filter(is_archived=True)
    elif filter == "blocked":
        blocked_ids = set(
            BlockList.objects.filter(blocker=user).values_list('blocked_user_id', flat=True)
        )
        blocked_ids |= set(
            BlockList.objects.filter(blocked_user=user).values_list('blocker_id', flat=True)
        )
        if blocked_ids:
            participations = participations.filter(
                conversation__participants__id__in=blocked_ids
            ).distinct()
        else:
            return []
    else:
        participations = participations.filter(is_archived=False)

    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
            participations = participations.filter(
                conversation__last_message_at__lt=cursor_dt
            )
        except (ValueError, TypeError):
            pass

    participations = participations.order_by(
        '-conversation__last_message_at'
    )[:limit]

    result = []
    for p in participations:
        conv = p.conversation
        participant_ids = list(
            conv.participants.values_list('id', flat=True)
        )
        other_info = _build_other_participant(conv, user)
        # Determine if current user has blocked the other participant (1-on-1 only)
        is_blocked = False
        if other_info and not conv.is_group:
            is_blocked = user_blocks(user.id, other_info.id)
        result.append(ConversationOut(
            id=conv.id,
            participants=participant_ids,
            is_group=conv.is_group,
            group_name=conv.group_name,
            group_avatar=conv.group_avatar,
            other_participant=other_info,
            is_blocked=is_blocked,
            last_message_content=conv.last_message_content,
            last_message_at=conv.last_message_at,
            last_message_sender_id=conv.last_message_sender_id,
            unread_count=p.unread_count,
            is_pinned=p.is_pinned,
            is_muted=p.is_muted,
            is_archived=p.is_archived,
            draft=p.draft,
        ))
    return result


@router.post("/conversations", response=ConversationOut, auth=auth)
def create_conversation(request, payload: StartConversationIn):
    user = request.auth
    participant_ids = payload.participant_ids

    if len(participant_ids) != 1:
        raise HttpError(400, "Only 1-on-1 conversations supported. Provide exactly one participant ID.")
    
    other_id = participant_ids[0]
    if str(other_id) == str(user.id):
        raise HttpError(400, "Cannot create a conversation with yourself.")

    if not User.objects.filter(id=other_id).exists():
        raise HttpError(404, "Participant not found.")

    if user_blocks(other_id, user.id):
        raise HttpError(403, "You have been blocked by this user.")
    if user_blocks(user.id, other_id):
        raise HttpError(403, "You have blocked this user. Unblock to start a conversation.")

    existing = Conversation.objects.filter(
        is_group=False,
        participants__id__in=[user.id, other_id]
    ).annotate(
        participant_count=Count('participants')
    ).filter(participant_count=2).first()

    if existing:
        p = get_object_or_404(ConversationParticipant, conversation=existing, user=user)
        if p.is_archived:
            p.is_archived = False
            p.save(update_fields=['is_archived'])
        if p.is_deleted:
            p.is_deleted = False
            p.save(update_fields=['is_deleted'])
        
        other_info = _build_other_participant(existing, user)
        is_blocked = False
        if other_info:
            is_blocked = user_blocks(user.id, other_info.id)
        return ConversationOut(
            id=existing.id,
            participants=[user.id, other_id],
            is_group=False,
            other_participant=other_info,
            is_blocked=is_blocked,
            last_message_content=existing.last_message_content,
            last_message_at=existing.last_message_at,
            last_message_sender_id=existing.last_message_sender_id,
            unread_count=p.unread_count,
            is_pinned=p.is_pinned,
            is_muted=p.is_muted,
            is_archived=p.is_archived,
            draft=p.draft,
        )

    with transaction.atomic():
        conv = Conversation.objects.create(is_group=False)
        ConversationParticipant.objects.create(conversation=conv, user=user)
        ConversationParticipant.objects.create(conversation=conv, user_id=other_id)
        p = ConversationParticipant.objects.get(conversation=conv, user=user)

    other_info = _build_other_participant(conv, user)
    is_blocked = False
    if other_info:
        is_blocked = user_blocks(user.id, other_info.id)
    return ConversationOut(
        id=conv.id,
        participants=[user.id, other_id],
        is_group=False,
        other_participant=other_info,
        is_blocked=is_blocked,
        last_message_content=None,
        last_message_at=None,
        last_message_sender_id=None,
        unread_count=0,
        is_pinned=False,
        is_muted=False,
        is_archived=False,
        draft="",
    )


# ─── Toggle pin / archive / mute ─────────────────────────────────────────────

@router.post("/conversations/{conversation_id}/pin", auth=auth)
def toggle_pin(request, conversation_id: uuid.UUID):
    user = request.auth
    cp = get_object_or_404(ConversationParticipant, conversation_id=conversation_id, user=user)
    cp.is_pinned = not cp.is_pinned
    cp.save(update_fields=['is_pinned', 'updated_at'])
    return {"pinned": cp.is_pinned}


@router.post("/conversations/{conversation_id}/archive", auth=auth)
def toggle_archive(request, conversation_id: uuid.UUID):
    user = request.auth
    cp = get_object_or_404(ConversationParticipant, conversation_id=conversation_id, user=user)
    cp.is_archived = not cp.is_archived
    cp.save(update_fields=['is_archived', 'updated_at'])
    return {"archived": cp.is_archived}


@router.post("/conversations/{conversation_id}/mute", auth=auth)
def toggle_mute(request, conversation_id: uuid.UUID):
    user = request.auth
    cp = get_object_or_404(ConversationParticipant, conversation_id=conversation_id, user=user)
    cp.is_muted = not cp.is_muted
    cp.save(update_fields=['is_muted', 'updated_at'])
    return {"muted": cp.is_muted}


@router.post("/conversations/{conversation_id}/leave", auth=auth)
def leave_conversation(request, conversation_id: uuid.UUID):
    user = request.auth
    conv = _get_user_conversation(conversation_id, user)
    ConversationParticipant.objects.filter(conversation=conv, user=user).delete()
    if conv.participants.count() == 0:
        conv.delete()
    return {"success": True}


@router.patch("/conversations/{conversation_id}/draft", auth=auth)
def save_draft(request, conversation_id: uuid.UUID, payload: DraftIn):
    user = request.auth
    cp = get_object_or_404(ConversationParticipant, conversation_id=conversation_id, user=user)
    cp.draft = payload.draft
    cp.save(update_fields=['draft', 'updated_at'])
    return {"success": True}


# ─── Messaging Endpoints ─────────────────────────────────────────────────────

@router.post("/conversations/{conversation_id}/messages", response=SendMessageResponse, auth=auth)
def send_message(request, conversation_id: uuid.UUID, payload: MessageIn):
    user = request.auth
    conv = _get_user_conversation(conversation_id, user)

    if not conv.is_group:
        other = conv.participants.exclude(id=user.id).first()
        if other:
            if user_blocks(user.id, other.id):
                raise HttpError(403, "Cannot send message: you have blocked this user.")
            if user_blocks(other.id, user.id):
                raise HttpError(403, "Cannot send message: you have been blocked.")

    blocked, count, limit, reset_at = check_daily_limit(user.id)
    if blocked:
        raise HttpError(429, f"Daily message limit of {limit} reached. Resets at {reset_at.isoformat()}.")

    if payload.client_msg_id:
        existing = Message.objects.filter(sender=user, client_msg_id=payload.client_msg_id).first()
        if existing:
            rate_limit = RateLimitOut(
                used=count,
                limit=limit,
                remaining=max(0, limit - count),
                reset_at=reset_at.isoformat(),
            )
            return SendMessageResponse(message=MessageOut.from_message(existing), rate_limit=rate_limit)

    if payload.file_url and payload.file_size:
        max_size = getattr(settings, 'CHAT_MAX_ATTACHMENT_SIZE', 10 * 1024 * 1024)
        if payload.file_size > max_size:
            raise HttpError(400, f"File size exceeds maximum of {max_size} bytes.")
        allowed_types = getattr(settings, 'CHAT_ALLOWED_ATTACHMENT_TYPES', [])
        if allowed_types and payload.file_mime_type and payload.file_mime_type not in allowed_types:
            raise HttpError(400, f"File type '{payload.file_mime_type}' is not allowed.")

    msg = Message(
        conversation=conv,
        sender=user,
        content=payload.content,
        msg_type=payload.msg_type,
        status=MessageStatus.SENT,
        client_msg_id=payload.client_msg_id,
        file_url=payload.file_url or '',
        file_name=payload.file_name or '',
        file_size=payload.file_size,
        file_mime_type=payload.file_mime_type or '',
        thumbnail_url=payload.thumbnail_url or '',
        duration=payload.duration,
        reply_to_id=payload.reply_to_id,
    )
    try:
        msg.save()
    except IntegrityError:
        msg = Message.objects.get(sender=user, client_msg_id=payload.client_msg_id)
        rate_limit = RateLimitOut(used=count, limit=limit, remaining=max(0, limit - count), reset_at=reset_at.isoformat())
        return SendMessageResponse(message=MessageOut.from_message(msg), rate_limit=rate_limit)

    conv.last_message_content = msg.content or msg.file_name or msg.msg_type
    conv.last_message_at = msg.created_at
    conv.last_message_sender = user
    conv.save(update_fields=['last_message_content', 'last_message_at', 'last_message_sender'])

    ConversationParticipant.objects.filter(
        conversation=conv
    ).exclude(user=user).update(unread_count=F('unread_count') + 1)

    new_count = increment_daily_limit(user.id)
    rate_limit_out = RateLimitOut(
        used=new_count,
        limit=limit,
        remaining=max(0, limit - new_count),
        reset_at=_get_midnight_utc().isoformat(),
    )

    message_out = MessageOut.from_message(msg)
    _broadcast_to_conversation(conversation_id, {"type": "chat_message", "message": message_out.model_dump()})

    # Send push notifications to offline participants using PresenceService
    for participant in conv.participants.exclude(id=user.id):
        if not PresenceService.is_online(participant.id):
            try:
                send_push_notification(
                    user_id=str(participant.id),
                    title=f"New message from {user.full_name or user.phone_number}",
                    body=(msg.content or "Sent an attachment")[:100],
                )
            except Exception:
                pass

    return SendMessageResponse(message=message_out, rate_limit=rate_limit_out)


@router.get("/conversations/{conversation_id}/messages", response=PaginatedMessages, auth=auth)
def get_messages(
    request,
    conversation_id: uuid.UUID,
    cursor: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
):
    user = request.auth
    conv = _get_user_conversation(conversation_id, user)
    ConversationParticipant.objects.filter(conversation=conv, user=user).update(unread_count=0)

    qs = Message.objects.filter(conversation=conv).select_related('sender')
    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
            qs = qs.filter(created_at__lt=cursor_dt)
        except (ValueError, TypeError):
            pass

    messages = list(qs.order_by('-created_at')[:limit])
    next_cursor = None
    if len(messages) == limit:
        next_cursor = messages[-1].created_at.isoformat()
    messages.reverse()

    serialized = []
    for m in messages:
        preview = None
        if m.reply_to_id:
            try:
                reply_msg = Message.objects.get(id=m.reply_to_id)
                preview = (reply_msg.content or reply_msg.file_name or "")[:100]
            except Message.DoesNotExist:
                pass
        serialized.append(MessageOut.from_message(m, reply_preview=preview))

    return PaginatedMessages(items=serialized, next_cursor=next_cursor)


@router.patch("/messages/{message_id}", response=MessageOut, auth=auth)
def edit_message(request, message_id: uuid.UUID, content: str = Query(..., min_length=1)):
    user = request.auth
    msg = get_object_or_404(Message, id=message_id)
    if msg.sender_id != user.id:
        raise HttpError(403, "You can only edit your own messages.")
    if msg.deleted_for_everyone:
        raise HttpError(400, "Cannot edit a deleted message.")

    edit_window = getattr(settings, 'CHAT_MESSAGE_EDIT_WINDOW_SECONDS', 300)
    elapsed = (timezone.now() - msg.created_at).total_seconds()
    if elapsed > edit_window:
        raise HttpError(400, f"Messages can only be edited within {edit_window} seconds of sending.")

    msg.edit(content)
    _broadcast_to_conversation(
        msg.conversation_id,
        {"type": "message_edited", "message_id": str(msg.id), "content": msg.content, "edited_at": msg.edited_at.isoformat()}
    )
    return MessageOut.from_message(msg)


@router.delete("/messages/{message_id}", auth=auth)
def delete_message(request, message_id: uuid.UUID, mode: str = Query("self")):
    user = request.auth
    msg = get_object_or_404(Message, id=message_id)

    if mode == "everyone":
        if msg.sender_id != user.id:
            raise HttpError(403, "Only the sender can delete a message for everyone.")
        delete_window = getattr(settings, 'CHAT_MESSAGE_DELETE_FOR_EVERYONE_WINDOW_SECONDS', 3600)
        elapsed = (timezone.now() - msg.created_at).total_seconds()
        if elapsed > delete_window:
            raise HttpError(400, f"Messages can only be deleted for everyone within {delete_window} seconds.")
        msg.soft_delete_for_everyone()
        _broadcast_to_conversation(msg.conversation_id, {"type": "message_deleted", "message_id": str(msg.id), "mode": "everyone"})
    elif mode == "self":
        msg.deleted_for_self = True
        msg.save(update_fields=['deleted_for_self', 'updated_at'])
    else:
        raise HttpError(400, "Invalid delete mode. Use 'self' or 'everyone'.")
    return {"success": True}


@router.post("/messages/{message_id}/forward", response=MessageOut, auth=auth)
def forward_message(request, message_id: uuid.UUID, payload: ForwardMessageIn):
    user = request.auth
    original = get_object_or_404(Message, id=message_id)
    forwarded_msgs = []
    for cid in payload.target_conversation_ids:
        conv = get_object_or_404(Conversation, id=cid)
        if not conv.participants.filter(id=user.id).exists():
            continue
        new_msg = Message(
            conversation=conv, sender=user,
            content=original.content if not original.deleted_for_everyone else "",
            msg_type=original.msg_type, status=MessageStatus.SENT,
            forwarded_from=original, is_forwarded=True,
            file_url=original.file_url if not original.deleted_for_everyone else "",
            file_name=original.file_name, file_size=original.file_size,
            file_mime_type=original.file_mime_type, thumbnail_url=original.thumbnail_url,
            duration=original.duration,
        )
        new_msg.save()
        forwarded_msgs.append(new_msg)
        conv.last_message_content = new_msg.content or new_msg.file_name or "Forwarded message"
        conv.last_message_at = new_msg.created_at
        conv.last_message_sender = user
        conv.save(update_fields=['last_message_content', 'last_message_at', 'last_message_sender'])
        _broadcast_to_conversation(cid, {"type": "chat_message", "message": MessageOut.from_message(new_msg).model_dump()})

    if not forwarded_msgs:
        raise HttpError(400, "No valid target conversations to forward to.")
    return MessageOut.from_message(forwarded_msgs[0])


# ─── Bulk Offline Sync ────────────────────────────────────────────────────────

@router.post("/conversations/{conversation_id}/bulk-send", response=BulkSendResponse, auth=auth)
def bulk_send_messages(request, conversation_id: uuid.UUID, payload: BulkSendIn):
    user = request.auth
    conv = _get_user_conversation(conversation_id, user)
    results = []
    for item in payload.messages:
        blocked, count, limit, reset_at = check_daily_limit(user.id)
        if blocked:
            raise HttpError(429, f"Daily limit ({limit}) reached during bulk send. {len(results)} messages sent before limit.")

        existing = Message.objects.filter(sender=user, client_msg_id=item.client_msg_id).first()
        if existing:
            result = MessageOut.from_message(existing)
            if item._tempId:
                result._tempId = item._tempId
            results.append(result)
            continue

        msg = Message(
            conversation=conv, sender=user, content=item.content, msg_type=item.msg_type,
            status=MessageStatus.SENT, client_msg_id=item.client_msg_id, file_url=item.file_url or '',
        )
        try:
            msg.save()
        except IntegrityError:
            msg = Message.objects.get(sender=user, client_msg_id=item.client_msg_id)
            result = MessageOut.from_message(msg)
            if item._tempId:
                result._tempId = item._tempId
            results.append(result)
            continue

        increment_daily_limit(user.id)
        result = MessageOut.from_message(msg)
        if item._tempId:
            result._tempId = item._tempId
        results.append(result)

    if results:
        last_msg = Message.objects.filter(sender=user, conversation=conv).order_by('-created_at').first()
        if last_msg:
            conv.last_message_content = last_msg.content or last_msg.file_name or last_msg.msg_type
            conv.last_message_at = last_msg.created_at
            conv.last_message_sender = user
            conv.save(update_fields=['last_message_content', 'last_message_at', 'last_message_sender'])

        ConversationParticipant.objects.filter(conversation=conv).exclude(user=user).update(unread_count=F('unread_count') + len(results))

    for msg_out in results:
        _broadcast_to_conversation(conversation_id, {"type": "chat_message", "message": msg_out.model_dump()})

    # Compute final rate‑limit state after all increments
    _, final_count, limit, reset_at = check_daily_limit(user.id)
    rate_limit_out = RateLimitOut(
        used=final_count,
        limit=limit,
        remaining=max(0, limit - final_count),
        reset_at=reset_at.isoformat(),
    )
    return BulkSendResponse(messages=results, rate_limit=rate_limit_out)


# ─── Search Endpoints ─────────────────────────────────────────────────────────

@router.get("/messages/search", response=List[MessageSearchOut], auth=auth)
def search_messages(request, q: str = Query(..., min_length=1), conversation_id: Optional[uuid.UUID] = Query(None), limit: int = Query(20, ge=1, le=50)):
    user = request.auth
    user_conv_ids = ConversationParticipant.objects.filter(user=user).values_list('conversation_id', flat=True)
    search_query = SearchQuery(q, config='english')
    search_vector = SearchVector('content', config='english')
    qs = Message.objects.filter(conversation_id__in=user_conv_ids).annotate(rank=SearchRank(search_vector, search_query)).filter(rank__gt=0.0)
    if conversation_id:
        qs = qs.filter(conversation_id=conversation_id)
    qs = qs.order_by('-rank', '-created_at')[:limit].select_related('sender', 'conversation')
    return [MessageSearchOut(id=m.id, conversation_id=m.conversation_id, sender_id=m.sender_id, content=m.content[:200], msg_type=m.msg_type, created_at=m.created_at, conversation_name=(m.conversation.group_name or f"Chat {m.conversation_id}")) for m in qs]


@router.get("/users/search/", response=List[UserSearchOut], auth=auth)
def search_users(request, q: str = Query(..., min_length=1), limit: int = Query(10, ge=1, le=50)):
    user = request.auth
    if not q.strip():
        return []
    users = User.objects.filter(Q(full_name__icontains=q) | Q(phone_number__icontains=q)).exclude(id=user.id).exclude(is_active=False)[:limit]
    return [UserSearchOut(id=u.id, username=u.phone_number, display_name=u.full_name or u.phone_number, class_name=getattr(u, 'class_name', None), avatar_url=getattr(u, 'profile_pic', None), avatar_color=getattr(u, 'avatar_color', None)) for u in users]


# ─── Block / Unblock ─────────────────────────────────────────────────────────

@router.post("/users/{user_id}/block", auth=auth)
def block_user(request, user_id: uuid.UUID):
    user = request.auth
    if str(user_id) == str(user.id):
        raise HttpError(400, "Cannot block yourself.")
    if not User.objects.filter(id=user_id).exists():
        raise HttpError(404, "User not found.")
    if BlockList.objects.filter(blocker=user, blocked_user_id=user_id).exists():
        return {"detail": "User is already blocked."}
    BlockList.objects.create(blocker=user, blocked_user_id=user_id)
    add_block_to_cache(user.id, user_id)
    common_convs = Conversation.objects.filter(participants__id__in=[user.id, user_id]).distinct()
    for conv in common_convs:
        _broadcast_to_conversation(conv.id, {"type": "block_notification", "blocked_by": str(user.id), "blocked": str(user_id)})
    return {"detail": "User blocked."}


@router.delete("/users/{user_id}/unblock", auth=auth)
def unblock_user(request, user_id: uuid.UUID):
    user = request.auth
    deleted, _ = BlockList.objects.filter(blocker=user, blocked_user_id=user_id).delete()
    if deleted:
        remove_block_from_cache(user.id, user_id)
        return {"detail": "User unblocked."}
    return {"detail": "User was not blocked."}


@router.get("/blocked", response=List[uuid.UUID], auth=auth)
def list_blocked(request):
    return list(BlockList.objects.filter(blocker=request.auth).values_list('blocked_user_id', flat=True))


# ─── Reporting ────────────────────────────────────────────────────────────────

@router.post("/reports", auth=auth)
def submit_report(request, payload: ReportIn):
    user = request.auth
    if not payload.message_id and not payload.conversation_id:
        raise HttpError(400, "Must specify either message_id or conversation_id.")
    if payload.reported_user_id == user.id:
        raise HttpError(400, "Cannot report yourself.")
    if not User.objects.filter(id=payload.reported_user_id).exists():
        raise HttpError(404, "Reported user not found.")
    if payload.message_id and payload.conversation_id:
        msg = get_object_or_404(Message, id=payload.message_id)
        if msg.conversation_id != payload.conversation_id:
            raise HttpError(400, "Message does not belong to the specified conversation.")
    report = Report.objects.create(reporter=user, reported_user_id=payload.reported_user_id, message_id=payload.message_id, conversation_id=payload.conversation_id, reason=payload.reason, description=payload.description)
    return {"id": report.id, "status": report.status}


# ─── Admin Endpoints ──────────────────────────────────────────────────────────

@router.delete("/admin/conversations/{conversation_id}", auth=auth)
def admin_delete_conversation(request, conversation_id: uuid.UUID):
    if not request.auth.is_staff:
        raise HttpError(403)
    conv = get_object_or_404(Conversation, id=conversation_id)
    ConversationParticipant.objects.filter(conversation=conv).update(is_deleted=True)
    return {"detail": "Conversation marked as deleted."}


@router.delete("/admin/attachments/{message_id}", auth=auth)
def admin_delete_attachment(request, message_id: uuid.UUID):
    if not request.auth.is_staff:
        raise HttpError(403)
    msg = get_object_or_404(Message, id=message_id)
    msg.file_url = ''; msg.file_name = ''; msg.file_size = None; msg.file_mime_type = ''; msg.thumbnail_url = ''
    msg.save()
    return {"detail": "Attachment removed."}


@router.patch("/admin/reports/{report_id}/resolve", auth=auth)
def resolve_report(request, report_id: uuid.UUID):
    if not request.auth.is_staff:
        raise HttpError(403)
    report = get_object_or_404(Report, id=report_id)
    report.status = ReportStatus.RESOLVED
    report.resolved_by = request.auth
    report.resolved_at = timezone.now()
    report.save()
    return {"detail": "Report resolved."}


@router.post("/admin/bulk-message", auth=auth)
def admin_bulk_message(request, payload: BulkMessageIn):
    if not request.auth.is_staff:
        raise HttpError(403)
    from .tasks import send_bulk_message
    task_record = BulkMessageTask.objects.create(sender=request.auth, filter_params=payload.filter_params, content=payload.content, status='pending')
    send_bulk_message.delay(filter_params=payload.filter_params, content=payload.content, sender_id=str(request.auth.id), task_id=str(task_record.id))
    return {"task_id": task_record.id, "status": "pending"}


@router.get("/admin/bulk-tasks/{task_id}", auth=auth)
def get_bulk_task_status(request, task_id: uuid.UUID):
    if not request.auth.is_staff:
        raise HttpError(403)
    task = get_object_or_404(BulkMessageTask, id=task_id)
    return {"task_id": task.id, "status": task.status, "total_recipients": task.total_recipients, "success_count": task.success_count, "failed_count": task.failed_count, "created_at": task.created_at.isoformat(), "completed_at": task.completed_at.isoformat() if task.completed_at else None}


# ─── Presigned URL ────────────────────────────────────────────────────────────

@router.post("/upload/presigned-url", response=PresignedUrlOut, auth=auth)
def get_presigned_url(request, payload: PresignedUrlIn):
    try:
        import boto3
        from botocore.exceptions import ClientError
        from botocore.config import Config
    except ImportError:
        raise HttpError(500, "S3 storage is not configured.")
    s3_client = boto3.client('s3', region_name=settings.AWS_S3_REGION_NAME, aws_access_key_id=settings.AWS_ACCESS_KEY_ID, aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY)
    bucket = settings.AWS_STORAGE_BUCKET_NAME
    key = f"chat_uploads/{request.auth.id}/{uuid.uuid4()}-{payload.file_name}"
    try:
        presigned = s3_client.generate_presigned_post(Bucket=bucket, Key=key, Fields={"Content-Type": payload.content_type}, Conditions=[{"Content-Type": payload.content_type}, ["content-length-range", 1, payload.max_file_size]], ExpiresIn=3600)
    except ClientError as e:
        raise HttpError(500, f"Failed to generate presigned URL: {e}")
    return PresignedUrlOut(url=presigned['url'], fields=presigned['fields'], file_url=f"https://{bucket}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{key}")


# ─── Rate Limit Status ────────────────────────────────────────────────────────

@router.get("/rate-limit", response=RateLimitOut, auth=auth)
def get_rate_limit(request):
    _, count, limit, reset_at = check_daily_limit(request.auth.id)
    return RateLimitOut(used=count, limit=limit, remaining=max(0, limit - count), reset_at=reset_at.isoformat())


# ─── Health Check ─────────────────────────────────────────────────────────────

@router.get("/health", auth=auth)
def chat_health(request):
    return {"status": "ok", "conversations_count": ConversationParticipant.objects.filter(user=request.auth).count()}