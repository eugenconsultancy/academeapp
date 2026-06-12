# backend/apps/chat/api.py

import uuid
import re
from datetime import timedelta
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.utils import timezone
from django.db.models import Count, Q, OuterRef, Subquery, Exists, Value
from django.db.models.functions import Coalesce
from django.core.cache import cache
from ninja import Router, Query
from ninja.errors import HttpError

from common.jwt_auth import JWTAuth

auth = JWTAuth()

from .models import (
    Conversation, Message, BlockedUser,
    MutedConversation, PinnedConversation, UserReport
)
from .schema import (
    ConversationOut,
    MessageOut,
    MessageIn,
    MessageEditIn,
    PresignedUrlOut,
    PresignedUrlIn,
    StartConversationIn,
    BlockUserIn,
    MarkReadIn,
    ReportUserIn,
)
from django.contrib.auth import get_user_model

User = get_user_model()
router = Router()

# ─── Constants ───
MAX_PINNED_CONVERSATIONS = 5
RATE_LIMIT_MESSAGE_PER_MINUTE = 30
RATE_LIMIT_CONVERSATION_PER_HOUR = 10
RATE_LIMIT_REPORT_PER_HOUR = 5

ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg',
    'application/pdf', 'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
BLOCKED_MIME_PREFIXES = ['video/']


# ─── Helpers with Optimized Queries ───

def build_participant_info(conv, current_user):
    """Return ParticipantInfo dict for the other user in the conversation."""
    other_user = conv.participants.exclude(id=current_user.id).first()
    if not other_user:
        return None

    is_online = False
    if other_user.last_activity:
        is_online = (timezone.now() - other_user.last_activity) < timedelta(minutes=5)

    return {
        "id": str(other_user.id),
        "full_name": other_user.full_name,
        "class_name": other_user.class_name or other_user.institution or "Student",
        "is_online": is_online,
        "last_active": other_user.last_activity,
        "avatar_url": other_user.profile_pic or None,
    }


def get_unread_count_subquery(user_id):
    """Return subquery for unread count per conversation - optimized N+1 fix"""
    from django.db.models import OuterRef, Count, Q
    return Count('messages', filter=Q(
        messages__is_read=False,
        messages__sender_id=OuterRef('participant_id')
    ))


def check_rate_limit(user_id, action, limit, window_seconds):
    """Fixed-window rate limiter using Django cache."""
    key = f"ratelimit:chat:{action}:{user_id}"
    count = cache.get(key)

    if count is None:
        cache.set(key, 1, timeout=window_seconds)
        return True

    if count >= limit:
        return False

    try:
        cache.incr(key)
    except ValueError:
        cache.set(key, 1, timeout=window_seconds)

    return True


def is_user_blocked(blocker, blocked_user):
    """Check if blocker has blocked blocked_user."""
    return BlockedUser.objects.filter(
        blocker=blocker, blocked=blocked_user
    ).exists()


# ─── Conversation Endpoints ───

@router.post('/conversations/start', response=ConversationOut, auth=auth)
def start_conversation(request, payload: StartConversationIn):
    user_a = request.auth
    user_b = get_object_or_404(User, id=payload.receiver_id)

    if user_a == user_b:
        raise HttpError(400, "You cannot chat with yourself.")

    if not check_rate_limit(user_a.id, 'start_conversation', RATE_LIMIT_CONVERSATION_PER_HOUR, 3600):
        raise HttpError(429, "Too many conversation requests. Please try again later.")

    # Check both directions for blocks
    if is_user_blocked(user_b, user_a):
        raise HttpError(403, "You have been blocked by this user.")
    if is_user_blocked(user_a, user_b):
        raise HttpError(403, "You have blocked this user. Unblock to chat.")

    conv = Conversation.objects.filter(
        participants=user_a
    ).filter(
        participants=user_b
    ).annotate(
        participant_count=Count('participants')
    ).filter(
        participant_count=2
    ).first()

    if not conv:
        conv = Conversation.objects.create(is_active=True)
        conv.participants.add(user_a, user_b)
    else:
        conv.is_active = True
        conv.save(update_fields=['is_active'])

    participant_info = build_participant_info(conv, user_a)
    unread_count = Message.objects.filter(
        conversation=conv,
        is_read=False
    ).exclude(sender=user_a).count()

    return {
        "id": conv.id,
        "participant": participant_info,
        "is_active": conv.is_active,
        "is_pinned": PinnedConversation.objects.filter(user=user_a, conversation=conv).exists(),
        "is_muted": MutedConversation.objects.filter(user=user_a, conversation=conv).exists(),
        "last_message_preview": conv.last_message_preview,
        "last_message_at": conv.last_message_at,
        "unread_count": unread_count,
    }


@router.get('/conversations', response=list[ConversationOut], auth=auth)
def list_conversations(request, archived: bool = False):
    user = request.auth

    # Optimized query with prefetching and subqueries to eliminate N+1
    convs = Conversation.objects.filter(
        participants=user,
        is_active=not archived
    ).exclude(
        deleted_by=user
    ).prefetch_related('participants').order_by('-last_message_at')

    # Get pinned IDs in a single query
    pinned_ids = set(
        PinnedConversation.objects.filter(user=user).values_list('conversation_id', flat=True)
    )
    
    # Get muted IDs in a single query
    muted_ids = set(
        MutedConversation.objects.filter(user=user).values_list('conversation_id', flat=True)
    )
    
    # Get unread counts in a single query per conversation (optimized)
    unread_counts = {}
    for conv in convs:
        unread_counts[conv.id] = Message.objects.filter(
            conversation=conv,
            is_read=False
        ).exclude(sender=user).count()

    pinned_convs = []
    unpinned_convs = []

    for conv in convs:
        participant_info = build_participant_info(conv, user)

        conv_data = {
            "id": conv.id,
            "participant": participant_info,
            "is_active": conv.is_active,
            "is_pinned": conv.id in pinned_ids,
            "is_muted": conv.id in muted_ids,
            "last_message_preview": conv.last_message_preview,
            "last_message_at": conv.last_message_at,
            "unread_count": unread_counts.get(conv.id, 0),
        }

        if conv.id in pinned_ids:
            pinned_convs.append(conv_data)
        else:
            unpinned_convs.append(conv_data)

    # Sort pinned by pinned_at descending (most recent pin first)
    pinned_sorted = sorted(
        pinned_convs,
        key=lambda c: PinnedConversation.objects.get(
            user=user, conversation_id=c['id']
        ).pinned_at,
        reverse=True
    )

    # Sort unpinned by last_message_at descending
    unpinned_sorted = sorted(
        unpinned_convs,
        key=lambda c: c['last_message_at'] or timezone.datetime.min.replace(tzinfo=timezone.utc),
        reverse=True
    )

    return pinned_sorted + unpinned_sorted


@router.get('/conversations/{conv_id}/messages', response=list[MessageOut], auth=auth)
def get_messages(request, conv_id: uuid.UUID, before: str = None, limit: int = 50):
    conv = get_object_or_404(
        Conversation, id=conv_id, participants=request.auth, is_active=True
    )
    qs = Message.objects.filter(conversation=conv, is_deleted=False).select_related('sender', 'reply_to')

    if before:
        try:
            before_dt = timezone.datetime.fromisoformat(before)
            if timezone.is_naive(before_dt):
                before_dt = timezone.make_aware(before_dt, timezone.utc)
            qs = qs.filter(created_at__lt=before_dt)
        except (ValueError, TypeError):
            raise HttpError(400, "Invalid 'before' parameter format. Use ISO 8601 datetime.")

    messages = qs.order_by('-created_at')[:limit]

    return [{
        "id": m.id,
        "conversation_id": m.conversation_id,
        "sender_id": m.sender_id,
        "content": m.content if not m.is_deleted else "[Message deleted]",
        "file_url": m.file_url if not m.is_deleted else None,
        "msg_type": m.msg_type,
        "created_at": m.created_at,
        "is_read": m.is_read,
        "is_delivered": m.is_delivered,
        "reply_to_id": m.reply_to_id,
        "reply_preview": (m.reply_to.content[:100] if m.reply_to and m.reply_to.content and not m.reply_to.is_deleted else None),
        "duration": m.duration,
        "edited_at": m.edited_at,
    } for m in messages]


@router.post('/conversations/{conv_id}/messages', response=MessageOut, auth=auth)
def post_message(request, conv_id: uuid.UUID, payload: MessageIn):
    if not check_rate_limit(request.auth.id, 'send_message', RATE_LIMIT_MESSAGE_PER_MINUTE, 60):
        raise HttpError(429, "Too many messages. Please slow down.")

    # Check idempotency
    idempotency_key = request.headers.get('Idempotency-Key')
    if idempotency_key:
        cache_key = f"idempotent:{idempotency_key}"
        if cache.get(cache_key):
            raise HttpError(409, "Duplicate message detected")
        cache.set(cache_key, True, timeout=300)  # 5 minutes

    conv = get_object_or_404(
        Conversation, id=conv_id, participants=request.auth, is_active=True
    )

    other_user = conv.participants.exclude(id=request.auth.id).first()
    if other_user:
        # Check both directions for blocks
        if is_user_blocked(other_user, request.auth):
            raise HttpError(403, "You have been blocked by this user.")
        if is_user_blocked(request.auth, other_user):
            raise HttpError(403, "You have blocked this user.")

    reply_to = None
    if payload.reply_to_id:
        reply_to = get_object_or_404(Message, id=payload.reply_to_id, conversation=conv, is_deleted=False)

    if payload.msg_type not in ['TEXT', 'FILE', 'VOICE']:
        raise HttpError(400, "Invalid message type.")

    message = Message.objects.create(
        conversation=conv,
        sender=request.auth,
        content=payload.content,
        file_url=payload.file_url,
        msg_type=payload.msg_type,
        reply_to=reply_to,
        duration=payload.duration,
        is_delivered=True,
    )

    preview_text = payload.content or ''
    if payload.msg_type == 'VOICE':
        preview_text = '🎤 Voice message'
    elif payload.msg_type == 'FILE' and not preview_text:
        preview_text = '📎 File attachment'

    conv.last_message_preview = preview_text[:200]
    conv.last_message_at = message.created_at
    conv.save(update_fields=['last_message_preview', 'last_message_at'])

    User.objects.filter(id=request.auth.id).update(last_activity=timezone.now())

    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "sender_id": message.sender_id,
        "content": message.content,
        "file_url": message.file_url,
        "msg_type": message.msg_type,
        "created_at": message.created_at,
        "is_read": message.is_read,
        "is_delivered": message.is_delivered,
        "reply_to_id": message.reply_to_id,
        "reply_preview": (reply_to.content[:100] if reply_to and reply_to.content else None),
        "duration": message.duration,
    }


# ─── Message Edit/Delete Endpoints ───

@router.put('/conversations/{conv_id}/messages/{msg_id}', response=MessageOut, auth=auth)
def edit_message(request, conv_id: uuid.UUID, msg_id: uuid.UUID, payload: MessageEditIn):
    message = get_object_or_404(
        Message, id=msg_id, conversation_id=conv_id, sender=request.auth, is_deleted=False
    )
    
    # Check edit window (5 minutes)
    now = timezone.now()
    time_diff = now - message.created_at
    if time_diff.total_seconds() > 300:
        raise HttpError(403, "Messages can only be edited within 5 minutes of sending")
    
    # Store edit history
    edit_history = message.edit_history or []
    edit_history.append({
        'old_content': message.content,
        'edited_at': now.isoformat(),
        'edited_by': str(request.auth.id)
    })
    
    message.content = payload.content
    message.edited_at = now
    message.edit_history = edit_history
    message.save(update_fields=['content', 'edited_at', 'edit_history'])
    
    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "sender_id": message.sender_id,
        "content": message.content,
        "file_url": message.file_url,
        "msg_type": message.msg_type,
        "created_at": message.created_at,
        "is_read": message.is_read,
        "is_delivered": message.is_delivered,
        "reply_to_id": message.reply_to_id,
        "reply_preview": None,
        "duration": message.duration,
        "edited_at": message.edited_at,
    }


@router.delete('/conversations/{conv_id}/messages/{msg_id}', auth=auth)
def delete_message(request, conv_id: uuid.UUID, msg_id: uuid.UUID, delete_for_everyone: bool = True):
    message = get_object_or_404(
        Message, id=msg_id, conversation_id=conv_id, sender=request.auth
    )
    
    message.is_deleted = True
    message.deleted_at = timezone.now()
    message.deleted_by = request.auth
    
    if delete_for_everyone:
        message.content = '[Message deleted]'
    
    message.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by', 'content'])
    
    return {"success": True, "message_id": str(msg_id)}


@router.post('/conversations/{conv_id}/mark-read', auth=auth)
def mark_messages_read(request, conv_id: uuid.UUID, payload: MarkReadIn = None):
    conv = get_object_or_404(
        Conversation, id=conv_id, participants=request.auth, is_active=True
    )

    qs = Message.objects.filter(
        conversation=conv,
        is_read=False,
    ).exclude(sender=request.auth)

    if payload and payload.message_ids:
        qs = qs.filter(id__in=payload.message_ids)

    now = timezone.now()
    count = qs.update(is_read=True, read_at=now)
    return {"success": True, "marked_read": count}


# ─── Presigned URL ───

@router.post('/presigned-url', response=PresignedUrlOut, auth=auth)
def generate_presigned_url(request, payload: PresignedUrlIn):
    import boto3
    from botocore.exceptions import NoCredentialsError

    if any(payload.content_type.startswith(p) for p in BLOCKED_MIME_PREFIXES):
        raise HttpError(400, "Video files are not allowed.")

    if payload.content_type not in ALLOWED_MIME_TYPES:
        raise HttpError(
            400,
            f"File type '{payload.content_type}' is not allowed. "
            f"Allowed types: {', '.join(ALLOWED_MIME_TYPES)}"
        )

    if payload.max_file_size > 50 * 1024 * 1024:
        raise HttpError(400, "File size exceeds maximum allowed (50MB).")

    safe_filename = re.sub(r'[^\w\.\-]', '_', payload.file_name)[:200]

    bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)
    region = getattr(settings, 'AWS_S3_REGION_NAME', None)
    access_key = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
    secret_key = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)

    if not all([bucket_name, region, access_key, secret_key]):
        raise HttpError(500, "File uploads are not configured. Please set AWS_* settings.")

    s3_client = boto3.client(
        's3',
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region,
    )
    key = f"chat_media/{uuid.uuid4()}/{safe_filename}"

    try:
        presigned = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket_name,
                'Key': key,
                'ContentType': payload.content_type,
                'ContentLength': payload.max_file_size,
            },
            ExpiresIn=300
        )
        file_url = f"https://{bucket_name}.s3.{region}.amazonaws.com/{key}"
        return PresignedUrlOut(presigned_url=presigned, file_url=file_url)
    except NoCredentialsError:
        raise HttpError(500, "AWS credentials not configured.")


# ─── Block / Unblock ───

@router.post('/block', auth=auth)
def block_user(request, payload: BlockUserIn):
    if request.auth.id == payload.blocked_user_id:
        raise HttpError(400, "You cannot block yourself.")

    blocked_user = get_object_or_404(User, id=payload.blocked_user_id)

    existing = BlockedUser.objects.filter(
        blocker=request.auth,
        blocked=blocked_user,
    ).first()

    if existing:
        return {"success": True, "blocked": False, "message": "User was already blocked."}

    BlockedUser.objects.create(blocker=request.auth, blocked=blocked_user)

    # Deactivate conversations in both directions
    Conversation.objects.filter(
        participants=request.auth
    ).filter(
        participants=blocked_user
    ).distinct().update(is_active=False)

    return {"success": True, "blocked": True}


@router.delete('/block/{user_id}', auth=auth)
def unblock_user(request, user_id: uuid.UUID):
    deleted, _ = BlockedUser.objects.filter(
        blocker=request.auth,
        blocked_id=user_id,
    ).delete()
    return {"success": True, "unblocked": deleted > 0}


@router.get('/blocked', auth=auth)
def list_blocked_users(request):
    blocked = BlockedUser.objects.filter(
        blocker=request.auth
    ).select_related('blocked')
    return [{
        "id": b.blocked.id,
        "full_name": b.blocked.full_name,
        "class_name": b.blocked.class_name or b.blocked.institution or "Student",
        "blocked_at": b.created_at,
    } for b in blocked]


# ─── Mute / Unmute ───

@router.post('/conversations/{conv_id}/mute', auth=auth)
def mute_conversation(request, conv_id: uuid.UUID):
    conv = get_object_or_404(
        Conversation, id=conv_id, participants=request.auth
    )
    _, created = MutedConversation.objects.get_or_create(
        user=request.auth,
        conversation=conv,
    )
    return {"success": True, "muted": created}


@router.delete('/conversations/{conv_id}/mute', auth=auth)
def unmute_conversation(request, conv_id: uuid.UUID):
    conv = get_object_or_404(
        Conversation, id=conv_id, participants=request.auth
    )
    deleted, _ = MutedConversation.objects.filter(
        user=request.auth,
        conversation=conv,
    ).delete()
    return {"success": True, "unmuted": deleted > 0}


# ─── Pin / Unpin (fixed sorting) ───

@router.post('/conversations/{conv_id}/pin', auth=auth)
def pin_conversation(request, conv_id: uuid.UUID):
    conv = get_object_or_404(
        Conversation, id=conv_id, participants=request.auth
    )

    current_pins = PinnedConversation.objects.filter(user=request.auth).count()
    if current_pins >= MAX_PINNED_CONVERSATIONS:
        raise HttpError(400, f"You can only pin up to {MAX_PINNED_CONVERSATIONS} conversations.")

    _, created = PinnedConversation.objects.get_or_create(
        user=request.auth,
        conversation=conv,
    )
    return {"success": True, "pinned": created}


@router.delete('/conversations/{conv_id}/pin', auth=auth)
def unpin_conversation(request, conv_id: uuid.UUID):
    conv = get_object_or_404(
        Conversation, id=conv_id, participants=request.auth
    )
    deleted, _ = PinnedConversation.objects.filter(
        user=request.auth,
        conversation=conv,
    ).delete()
    return {"success": True, "unpinned": deleted > 0}


# ─── Report ───

@router.post('/report', auth=auth)
def report_user(request, payload: ReportUserIn):
    if request.auth.id == payload.reported_user_id:
        raise HttpError(400, "You cannot report yourself.")

    if not check_rate_limit(request.auth.id, 'report_user', RATE_LIMIT_REPORT_PER_HOUR, 3600):
        raise HttpError(429, "Too many reports. Please try again later.")

    reported_user = get_object_or_404(User, id=payload.reported_user_id)

    if payload.reason not in dict(UserReport.REPORT_REASONS):
        raise HttpError(400, "Invalid report reason.")

    conv = None
    if payload.conversation_id:
        conv = get_object_or_404(
            Conversation, id=payload.conversation_id, participants=request.auth
        )
        if not conv.participants.filter(id=payload.reported_user_id).exists():
            raise HttpError(400, "Reported user is not in the specified conversation.")

    report = UserReport.objects.create(
        reporter=request.auth,
        reported_user=reported_user,
        reason=payload.reason,
        description=payload.description,
        conversation=conv,
    )

    return {
        "success": True,
        "report_id": report.id,
        "message": "Report submitted. Our team will review it."
    }


# ─── Archive / Unarchive / Delete ───

@router.patch('/conversations/{conv_id}/archive', auth=auth)
def archive_conversation(request, conv_id: uuid.UUID):
    conv = get_object_or_404(
        Conversation, id=conv_id, participants=request.auth
    )
    conv.is_active = False
    conv.save(update_fields=['is_active'])
    return {"success": True}


@router.patch('/conversations/{conv_id}/unarchive', auth=auth)
def unarchive_conversation(request, conv_id: uuid.UUID):
    conv = get_object_or_404(
        Conversation, id=conv_id, participants=request.auth
    )
    conv.is_active = True
    conv.save(update_fields=['is_active'])
    return {"success": True}


@router.delete('/conversations/{conv_id}', auth=auth)
def delete_conversation(request, conv_id: uuid.UUID):
    conv = get_object_or_404(
        Conversation, id=conv_id, participants=request.auth
    )

    conv.deleted_by.add(request.auth)

    all_participants = conv.participants.all()
    all_deleted = all(
        conv.deleted_by.filter(id=p.id).exists() for p in all_participants
    )

    if all_deleted:
        conv.delete()
    else:
        conv.is_active = False
        conv.save(update_fields=['is_active'])

    return {"success": True}