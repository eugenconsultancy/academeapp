import uuid
from django.shortcuts import get_object_or_404
from django.conf import settings
from ninja import Router
from ninja.errors import HttpError
from common.jwt_auth import JWTAuth
from .models import Conversation, Message
from .schema import (
    ConversationOut,
    MessageOut,
    MessageIn,
    PresignedUrlOut,
    PresignedUrlIn,
    StartConversationIn,
)
from django.contrib.auth import get_user_model

User = get_user_model()
router = Router()
auth = JWTAuth()

# ---------- Start a new conversation (or get existing) ----------
@router.post('/conversations/start', response=ConversationOut, auth=auth)
def start_conversation(request, payload: StartConversationIn):
    user_a = request.auth
    user_b = get_object_or_404(User, id=payload.receiver_id)
    if user_a == user_b:
        raise HttpError(400, "Cannot chat with yourself.")

    # Find existing conversation with exactly these two participants
    conv = Conversation.objects.filter(participants=user_a).filter(participants=user_b).distinct().first()
    if not conv:
        conv = Conversation.objects.create(is_active=True)
        conv.participants.add(user_a, user_b)
    else:
        # Reactivate if needed (should always be active)
        conv.is_active = True
        conv.save()

    # Return conversation with participants IDs
    return {
        "id": conv.id,
        "participants": [p.id for p in conv.participants.all()],
        "is_active": conv.is_active,
        "last_message_preview": conv.last_message_preview,
        "last_message_at": conv.last_message_at,
    }

# ---------- List user's conversations ----------
@router.get('/conversations', response=list[ConversationOut], auth=auth)
def list_conversations(request):
    user = request.auth
    convs = Conversation.objects.filter(participants=user, is_active=True).order_by('-last_message_at')
    result = []
    for conv in convs:
        result.append({
            "id": conv.id,
            "participants": [p.id for p in conv.participants.all()],
            "is_active": conv.is_active,
            "last_message_preview": conv.last_message_preview,
            "last_message_at": conv.last_message_at,
        })
    return result

# ---------- Get messages (cursor-based pagination) ----------
@router.get('/conversations/{conv_id}/messages', response=list[MessageOut], auth=auth)
def get_messages(request, conv_id: uuid.UUID, before: uuid.UUID = None, limit: int = 50):
    conv = get_object_or_404(Conversation, id=conv_id, participants=request.auth, is_active=True)
    qs = Message.objects.filter(conversation=conv)
    if before:
        qs = qs.filter(id__lt=before)
    return qs.order_by('-created_at')[:limit]

# ---------- Send a message ----------
@router.post('/conversations/{conv_id}/messages', response=MessageOut, auth=auth)
def post_message(request, conv_id: uuid.UUID, payload: MessageIn):
    conv = get_object_or_404(Conversation, id=conv_id, participants=request.auth, is_active=True)
    message = Message.objects.create(
        conversation=conv,
        sender=request.auth,
        content=payload.content,
        file_url=payload.file_url,
        msg_type=payload.msg_type
    )
    # Update denormalized preview
    conv.last_message_preview = (payload.content or '')[:200]
    conv.last_message_at = message.created_at
    conv.save(update_fields=['last_message_preview', 'last_message_at'])
    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "sender_id": message.sender_id,
        "content": message.content,
        "file_url": message.file_url,
        "msg_type": message.msg_type,
        "created_at": message.created_at,
    }

# ---------- Presigned URL for file upload (restricted) ----------
@router.post('/presigned-url', response=PresignedUrlOut, auth=auth)
def generate_presigned_url(request, payload: PresignedUrlIn):
    import boto3
    from botocore.exceptions import NoCredentialsError

    # Block video files
    BLOCKED_MIME_PREFIXES = ['video/']
    if any(payload.content_type.startswith(p) for p in BLOCKED_MIME_PREFIXES):
        raise HttpError(400, "Video files are not allowed.")

    s3_client = boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
    )
    key = f"chat_media/{uuid.uuid4()}/{payload.file_name}"
    try:
        presigned = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                'Key': key,
                'ContentType': payload.content_type,
            },
            ExpiresIn=300
        )
        file_url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{key}"
        return PresignedUrlOut(presigned_url=presigned, file_url=file_url)
    except NoCredentialsError:
        raise HttpError(500, "AWS credentials not configured.")