# C:\Users\GATARA-BJTU\academe\backend\apps\chat\api.py

import uuid
from datetime import timedelta
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.utils import timezone
from django.db.models import Q
from ninja import Router
from ninja.errors import HttpError

from common.jwt_auth import JWTAuth

auth = JWTAuth()

from .models import Conversation, Message, BlockedUser
from .schema import (
    ConversationOut,
    MessageOut,
    MessageIn,
    PresignedUrlOut,
    PresignedUrlIn,
    StartConversationIn,
    BlockUserIn,
    MarkReadIn,
)
from django.contrib.auth import get_user_model

User = get_user_model()
router = Router()


# ─── Helper: build participant info for the other user ───
def build_participant_info(conv, current_user):
    """Return ParticipantInfo dict for the other user in the conversation."""
    other_user = conv.participants.exclude(id=current_user.id).first()
    if not other_user:
        return None

    # Use existing fields from your User model
    is_online = False
    if other_user.last_activity:
        is_online = (timezone.now() - other_user.last_activity) < timedelta(minutes=5)

    return {
        "id": other_user.id,
        "full_name": other_user.full_name,
        "class_name": other_user.class_name or other_user.institution or "Student",
        "is_online": is_online,
        "last_active": other_user.last_activity,
        "avatar_url": other_user.profile_pic or None,
    }


# ─── Helper: calculate unread count ───
def get_unread_count(conv, user):
    """Count messages from the other participant that are still unread."""
    other_user = conv.participants.exclude(id=user.id).first()
    if not other_user:
        return 0
    return Message.objects.filter(
        conversation=conv,
        sender=other_user,
        is_read=False,
    ).count()


# ─── Helper: check if a user is blocked ───
def is_user_blocked(blocker, blocked_user):
    """Check if blocker has blocked blocked_user."""
    return BlockedUser.objects.filter(
        blocker=blocker, blocked=blocked_user
    ).exists()


# ---------- Start a new conversation (or get existing) ----------
@router.post('/conversations/start', response=ConversationOut, auth=auth)
def start_conversation(request, payload: StartConversationIn):
    user_a = request.auth
    user_b = get_object_or_404(User, id=payload.receiver_id)

    if user_a == user_b:
        raise HttpError(400, "You cannot chat with yourself.")

    # Check if either user has blocked the other
    if is_user_blocked(user_b, user_a):
        raise HttpError(403, "You have been blocked by this user.")
    if is_user_blocked(user_a, user_b):
        raise HttpError(403, "You have blocked this user. Unblock to chat.")

    # Find existing conversation with exactly these two participants
    conv = Conversation.objects.filter(
        participants=user_a
    ).filter(
        participants=user_b
    ).distinct().first()

    if not conv:
        conv = Conversation.objects.create(is_active=True)
        conv.participants.add(user_a, user_b)
    else:
        conv.is_active = True
        conv.save(update_fields=['is_active'])

    participant_info = build_participant_info(conv, user_a)
    unread_count = get_unread_count(conv, user_a)

    return {
        "id": conv.id,
        "participant": participant_info,
        "is_active": conv.is_active,
        "last_message_preview": conv.last_message_preview,
        "last_message_at": conv.last_message_at,
        "unread_count": unread_count,
    }


# ---------- List user's conversations ----------
@router.get('/conversations', response=list[ConversationOut], auth=auth)
def list_conversations(request, archived: bool = False):
    user = request.auth
    convs = Conversation.objects.filter(
        participants=user,
        is_active=not archived
    ).order_by('-last_message_at')

    result = []
    for conv in convs:
        participant_info = build_participant_info(conv, user)
        unread_count = get_unread_count(conv, user)

        result.append({
            "id": conv.id,
            "participant": participant_info,
            "is_active": conv.is_active,
            "last_message_preview": conv.last_message_preview,
            "last_message_at": conv.last_message_at,
            "unread_count": unread_count,
        })
    return result


# ---------- Get messages (cursor-based pagination) ----------
@router.get('/conversations/{conv_id}/messages', response=list[MessageOut], auth=auth)
def get_messages(request, conv_id: uuid.UUID, before: uuid.UUID = None, limit: int = 50):
    conv = get_object_or_404(
        Conversation, id=conv_id, participants=request.auth, is_active=True
    )
    qs = Message.objects.filter(conversation=conv).select_related('sender')
    if before:
        qs = qs.filter(id__lt=before)
    messages = qs.order_by('-created_at')[:limit]

    return [{
        "id": m.id,
        "conversation_id": m.conversation_id,
        "sender_id": m.sender_id,
        "content": m.content,
        "file_url": m.file_url,
        "msg_type": m.msg_type,
        "created_at": m.created_at,
        "is_read": m.is_read,
    } for m in messages]


# ---------- Send a message ----------
@router.post('/conversations/{conv_id}/messages', response=MessageOut, auth=auth)
def post_message(request, conv_id: uuid.UUID, payload: MessageIn):
    conv = get_object_or_404(
        Conversation, id=conv_id, participants=request.auth, is_active=True
    )

    # Check if blocked
    other_user = conv.participants.exclude(id=request.auth.id).first()
    if other_user and is_user_blocked(other_user, request.auth):
        raise HttpError(403, "You have been blocked by this user.")

    message = Message.objects.create(
        conversation=conv,
        sender=request.auth,
        content=payload.content,
        file_url=payload.file_url,
        msg_type=payload.msg_type,
    )

    # Update conversation preview
    conv.last_message_preview = (payload.content or '')[:200]
    conv.last_message_at = message.created_at
    conv.save(update_fields=['last_message_preview', 'last_message_at'])

    # Update last_activity
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
    }


# ---------- Mark messages as read ----------
@router.post('/conversations/{conv_id}/mark-read', auth=auth)
def mark_messages_read(request, conv_id: uuid.UUID, payload: MarkReadIn = None):
    """Mark messages from the other participant as read."""
    conv = get_object_or_404(
        Conversation, id=conv_id, participants=request.auth, is_active=True
    )

    qs = Message.objects.filter(
        conversation=conv,
        is_read=False,
    ).exclude(sender=request.auth)

    if payload and payload.message_ids:
        qs = qs.filter(id__in=payload.message_ids)

    count = qs.update(is_read=True)
    return {"success": True, "marked_read": count}


# ---------- Presigned URL for file upload ----------
@router.post('/presigned-url', response=PresignedUrlOut, auth=auth)
def generate_presigned_url(request, payload: PresignedUrlIn):
    import boto3
    from botocore.exceptions import NoCredentialsError

    # Block video files
    BLOCKED_MIME_PREFIXES = ['video/']
    if any(payload.content_type.startswith(p) for p in BLOCKED_MIME_PREFIXES):
        raise HttpError(400, "Video files are not allowed.")

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
    key = f"chat_media/{uuid.uuid4()}/{payload.file_name}"
    try:
        presigned = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket_name,
                'Key': key,
                'ContentType': payload.content_type,
            },
            ExpiresIn=300
        )
        file_url = f"https://{bucket_name}.s3.{region}.amazonaws.com/{key}"
        return PresignedUrlOut(presigned_url=presigned, file_url=file_url)
    except NoCredentialsError:
        raise HttpError(500, "AWS credentials not configured.")


# ---------- Block / Unblock users ----------
@router.post('/block', auth=auth)
def block_user(request, payload: BlockUserIn):
    """Block a user - prevents them from messaging you."""
    if request.auth.id == payload.blocked_user_id:
        raise HttpError(400, "You cannot block yourself.")

    blocked_user = get_object_or_404(User, id=payload.blocked_user_id)

    _, created = BlockedUser.objects.get_or_create(
        blocker=request.auth,
        blocked=blocked_user,
    )

    # Deactivate conversations between these two users
    Conversation.objects.filter(
        participants=request.auth
    ).filter(
        participants=blocked_user
    ).distinct().update(is_active=False)

    return {"success": True, "blocked": created}


@router.delete('/block/{user_id}', auth=auth)
def unblock_user(request, user_id: uuid.UUID):
    """Unblock a previously blocked user."""
    deleted, _ = BlockedUser.objects.filter(
        blocker=request.auth,
        blocked_id=user_id,
    ).delete()
    return {"success": True, "unblocked": deleted > 0}


@router.get('/blocked', auth=auth)
def list_blocked_users(request):
    """List all users blocked by the current user."""
    blocked = BlockedUser.objects.filter(
        blocker=request.auth
    ).select_related('blocked')
    return [{
        "id": b.blocked.id,
        "full_name": b.blocked.full_name,
        "class_name": b.blocked.class_name or b.blocked.institution or "Student",
        "blocked_at": b.created_at,
    } for b in blocked]


# ---------- Archive / Unarchive / Delete conversations ----------
@router.patch('/conversations/{conv_id}/archive', auth=auth)
def archive_conversation(request, conv_id: uuid.UUID):
    """Archive (soft-delete) a conversation."""
    conv = get_object_or_404(
        Conversation, id=conv_id, participants=request.auth
    )
    conv.is_active = False
    conv.save(update_fields=['is_active'])
    return {"success": True}


@router.patch('/conversations/{conv_id}/unarchive', auth=auth)
def unarchive_conversation(request, conv_id: uuid.UUID):
    """Restore an archived conversation."""
    conv = get_object_or_404(
        Conversation, id=conv_id, participants=request.auth
    )
    conv.is_active = True
    conv.save(update_fields=['is_active'])
    return {"success": True}


@router.delete('/conversations/{conv_id}', auth=auth)
def delete_conversation(request, conv_id: uuid.UUID):
    """Permanently delete a conversation and all its messages."""
    conv = get_object_or_404(
        Conversation, id=conv_id, participants=request.auth
    )
    conv.delete()
    return {"success": True}