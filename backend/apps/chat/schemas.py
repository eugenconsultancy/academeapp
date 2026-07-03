# backend/apps/chat/schemas.py
"""
Shared Pydantic schemas for the chat application.
Used by both the REST API (api.py) and the WebSocket consumer (consumers.py).
Alignment with chat/models.py and all required endpoints.

NOTE: User IDs are UUIDs (from BaseModel in accounts app).
All ForeignKey references to User use UUID primary keys.
"""

import uuid
from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator

from .models import Message, MessageType, MessageStatus, ReportReason, ReportStatus


# ─── User / Participant (read‑only info) ────────────────────────────────────

class ParticipantInfo(BaseModel):
    """Minimal participant info for conversation display."""
    id: uuid.UUID
    full_name: str
    class_name: Optional[str] = None
    avatar_url: Optional[str] = None
    avatar_color: Optional[str] = None
    is_online: bool = False
    last_active: Optional[datetime] = None


# ─── Conversation ────────────────────────────────────────────────────────────

class ConversationOut(BaseModel):
    """Conversation data returned to clients."""
    id: uuid.UUID
    is_group: bool = False
    group_name: Optional[str] = None
    group_avatar: Optional[str] = None
    participants: List[uuid.UUID] = []
    other_participant: Optional[ParticipantInfo] = None
    unread_count: int = 0
    is_pinned: bool = False
    is_muted: bool = False
    is_archived: bool = False
    is_blocked: bool = False          # NEW: whether current user has blocked the other participant
    last_message_content: Optional[str] = None
    last_message_at: Optional[datetime] = None
    last_message_sender_id: Optional[uuid.UUID] = None
    draft: Optional[str] = None

    class Config:
        from_attributes = True


class PaginatedConversations(BaseModel):
    items: List[ConversationOut]
    next_cursor: Optional[str] = None


# ─── Message ─────────────────────────────────────────────────────────────────

class MessageIn(BaseModel):
    content: str = ""
    msg_type: MessageType = MessageType.TEXT
    client_msg_id: uuid.UUID
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    file_mime_type: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration: Optional[float] = None
    reply_to_id: Optional[uuid.UUID] = None
    _tempId: Optional[str] = None

    @field_validator('content')
    @classmethod
    def content_not_empty_for_text(cls, v, info):
        msg_type = info.data.get('msg_type', MessageType.TEXT)
        file_url = info.data.get('file_url')
        if msg_type == MessageType.TEXT and not v.strip() and not file_url:
            raise ValueError('Text messages must have content or an attachment')
        return v

    @field_validator('msg_type')
    @classmethod
    def validate_msg_type(cls, v):
        allowed = {choice.value for choice in MessageType}
        if v.value not in allowed:
            raise ValueError(f'Invalid message type: {v}')
        return v

    @field_validator('file_size')
    @classmethod
    def validate_file_size(cls, v):
        if v is not None:
            from django.conf import settings
            max_size = getattr(settings, 'CHAT_MAX_ATTACHMENT_SIZE', 10 * 1024 * 1024)
            if v > max_size:
                raise ValueError(f'File size exceeds maximum of {max_size} bytes')
        return v

    @field_validator('file_mime_type')
    @classmethod
    def validate_file_type(cls, v, info):
        if v:
            from django.conf import settings
            allowed = getattr(settings, 'CHAT_ALLOWED_ATTACHMENT_TYPES', [])
            if allowed and v not in allowed:
                raise ValueError(f'File type "{v}" is not allowed')
        return v


class MessageOut(BaseModel):
    """Full message data returned to clients."""
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: str = ""
    sender_avatar: Optional[str] = None
    content: str
    msg_type: str
    status: str
    is_edited: bool = False
    edited_at: Optional[datetime] = None
    created_at: datetime
    client_msg_id: Optional[uuid.UUID] = None
    forwarded_from: Optional[uuid.UUID] = None
    is_forwarded: bool = False
    reply_to_id: Optional[uuid.UUID] = None
    file_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    file_mime_type: Optional[str] = None
    duration: Optional[float] = None
    deleted_for_everyone: bool = False
    deleted_for_self: bool = False
    reply_preview: Optional[str] = None
    edit_history: List[dict] = []
    _tempId: Optional[str] = None

    @staticmethod
    def from_message(msg: Message, reply_preview: Optional[str] = None) -> "MessageOut":
        sender = msg.sender
        return MessageOut(
            id=msg.id,
            conversation_id=msg.conversation_id,
            sender_id=msg.sender_id,
            sender_name=sender.full_name or sender.phone_number or "Unknown",
            sender_avatar=getattr(sender, 'profile_pic', None),
            content=msg.content if not msg.deleted_for_everyone else "",
            msg_type=msg.msg_type,
            status=msg.status,
            is_edited=msg.is_edited,
            edited_at=msg.edited_at,
            created_at=msg.created_at,
            client_msg_id=msg.client_msg_id,
            forwarded_from=msg.forwarded_from_id,
            is_forwarded=msg.is_forwarded,
            reply_to_id=msg.reply_to_id,
            file_url=msg.file_url if not msg.deleted_for_everyone else "",
            thumbnail_url=msg.thumbnail_url if not msg.deleted_for_everyone else "",
            file_name=msg.file_name if not msg.deleted_for_everyone else "",
            file_size=msg.file_size,
            file_mime_type=msg.file_mime_type,
            duration=msg.duration,
            deleted_for_everyone=msg.deleted_for_everyone,
            deleted_for_self=msg.deleted_for_self,
            reply_preview=reply_preview,
            edit_history=msg.edit_history or [],
        )

    class Config:
        from_attributes = True
        json_encoders = {
            uuid.UUID: str,
            datetime: lambda v: v.isoformat(),
        }


class PaginatedMessages(BaseModel):
    items: List[MessageOut]
    next_cursor: Optional[str] = None


# ─── Conversation Creation ───────────────────────────────────────────────────

class StartConversationIn(BaseModel):
    participant_ids: List[uuid.UUID] = Field(..., min_length=1, max_length=50)

    @field_validator('participant_ids')
    @classmethod
    def no_duplicates(cls, v):
        if len(v) != len(set(v)):
            raise ValueError('Duplicate participant IDs are not allowed')
        return v


# ─── Blocking ────────────────────────────────────────────────────────────────

class BlockUserIn(BaseModel):
    blocked_user_id: uuid.UUID


class BlockedUserOut(BaseModel):
    id: uuid.UUID
    blocked_user_id: uuid.UUID
    blocked_username: Optional[str] = None
    created_at: datetime


class MarkReadIn(BaseModel):
    message_ids: List[uuid.UUID] = Field(..., min_length=1)


class ReportIn(BaseModel):
    reported_user_id: uuid.UUID
    message_id: Optional[uuid.UUID] = None
    conversation_id: Optional[uuid.UUID] = None
    reason: ReportReason
    description: str = ""

    @field_validator('reason')
    @classmethod
    def valid_reason(cls, v):
        allowed = {choice.value for choice in ReportReason}
        if v.value not in allowed:
            raise ValueError(f'Invalid report reason: {v}')
        return v


class ReportOut(BaseModel):
    id: uuid.UUID
    reporter_id: uuid.UUID
    reported_user_id: uuid.UUID
    message_id: Optional[uuid.UUID] = None
    conversation_id: Optional[uuid.UUID] = None
    reason: str
    description: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by_id: Optional[uuid.UUID] = None
    admin_notes: str = ""

    class Config:
        from_attributes = True


class BulkMessageIn(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    filter_params: dict = Field(...)


class BulkMessageTaskOut(BaseModel):
    task_id: uuid.UUID
    status: str
    total_recipients: int = 0
    success_count: int = 0
    failed_count: int = 0
    created_at: datetime
    completed_at: Optional[datetime] = None


class ForwardMessageIn(BaseModel):
    target_conversation_ids: List[uuid.UUID] = Field(..., min_length=1, max_length=10)


class PresignedUrlIn(BaseModel):
    file_name: str = Field(..., min_length=1, max_length=255)
    content_type: str = Field(..., min_length=1)
    max_file_size: int = Field(default=10 * 1024 * 1024, ge=1)


class PresignedUrlOut(BaseModel):
    url: str
    fields: dict
    file_url: str


class RateLimitOut(BaseModel):
    used: int
    limit: int
    remaining: int
    reset_at: str


class UserSearchOut(BaseModel):
    id: uuid.UUID
    username: str
    display_name: str
    class_name: Optional[str] = None
    avatar_url: Optional[str] = None
    avatar_color: Optional[str] = None


class MessageSearchOut(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    content: str
    msg_type: str
    created_at: datetime
    conversation_name: Optional[str] = None


class DraftIn(BaseModel):
    draft: str = Field(..., max_length=10000)


class BulkMessageItem(BaseModel):
    content: str = ""
    msg_type: MessageType = MessageType.TEXT
    client_msg_id: uuid.UUID
    file_url: Optional[str] = None
    _tempId: Optional[str] = None


class BulkSendIn(BaseModel):
    messages: List[BulkMessageItem] = Field(..., min_length=1, max_length=100)


# ─── Rate‑limit wrapper schemas ─────────────────────────────────────────────

class SendMessageResponse(BaseModel):
    message: MessageOut
    rate_limit: RateLimitOut


class BulkSendResponse(BaseModel):
    messages: List[MessageOut]
    rate_limit: RateLimitOut


# ─── WebSocket‑specific schemas ─────────────────────────────────────────────

class MessageStatusUpdateIn(BaseModel):
    message_id: uuid.UUID
    status: Literal['delivered', 'read']


class MessageEditIn(BaseModel):
    message_id: uuid.UUID
    content: str = Field(..., min_length=1)


class MessageDeleteIn(BaseModel):
    message_id: uuid.UUID
    mode: Literal['self', 'everyone'] = 'self'


class SyncHistoryIn(BaseModel):
    last_message_at: str


class TypingIn(BaseModel):
    conversation_id: uuid.UUID
    typing: bool