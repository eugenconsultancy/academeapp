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
    id: uuid.UUID  # ✅ UUID - matches User model (BaseModel provides UUID PK)
    full_name: str
    class_name: Optional[str] = None
    avatar_url: Optional[str] = None
    avatar_color: Optional[str] = None  # For initial-based avatars
    is_online: bool = False
    last_active: Optional[datetime] = None


# ─── Conversation ────────────────────────────────────────────────────────────

class ConversationOut(BaseModel):
    """Conversation data returned to clients."""
    id: uuid.UUID
    is_group: bool = False
    group_name: Optional[str] = None
    group_avatar: Optional[str] = None
    participants: List[uuid.UUID] = []  # ✅ UUID list
    # ── NEW: other participant info (only for 1‑on‑1 chats) ────────────
    other_participant: Optional[ParticipantInfo] = None
    # Per‑user state (populated from ConversationParticipant)
    unread_count: int = 0
    is_pinned: bool = False
    is_muted: bool = False
    is_archived: bool = False
    # Denormalized last‑message info
    last_message_content: Optional[str] = None
    last_message_at: Optional[datetime] = None
    last_message_sender_id: Optional[uuid.UUID] = None  # ✅ UUID
    # Draft content
    draft: Optional[str] = None

    class Config:
        from_attributes = True


class PaginatedConversations(BaseModel):
    """Cursor-paginated conversation list."""
    items: List[ConversationOut]
    next_cursor: Optional[str] = None


# ─── Message ─────────────────────────────────────────────────────────────────

class MessageIn(BaseModel):
    """Incoming message from client (REST or WebSocket)."""
    content: str = ""
    msg_type: MessageType = MessageType.TEXT
    client_msg_id: uuid.UUID  # Required for idempotency
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    file_mime_type: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration: Optional[float] = None
    reply_to_id: Optional[uuid.UUID] = None
    # Optional temp id for optimistic UI reconciliation (echoed back)
    _tempId: Optional[str] = None

    @field_validator('content')
    @classmethod
    def content_not_empty_for_text(cls, v, info):
        """Ensure text messages have content or attachment."""
        msg_type = info.data.get('msg_type', MessageType.TEXT)
        file_url = info.data.get('file_url')
        if msg_type == MessageType.TEXT and not v.strip() and not file_url:
            raise ValueError('Text messages must have content or an attachment')
        return v

    @field_validator('msg_type')
    @classmethod
    def validate_msg_type(cls, v):
        """Validate message type against allowed choices."""
        allowed = {choice.value for choice in MessageType}
        if v.value not in allowed:
            raise ValueError(f'Invalid message type: {v}')
        return v

    @field_validator('file_size')
    @classmethod
    def validate_file_size(cls, v):
        """Validate file size against configured maximum."""
        if v is not None:
            from django.conf import settings
            max_size = getattr(settings, 'CHAT_MAX_ATTACHMENT_SIZE', 10 * 1024 * 1024)
            if v > max_size:
                raise ValueError(f'File size exceeds maximum of {max_size} bytes')
        return v

    @field_validator('file_mime_type')
    @classmethod
    def validate_file_type(cls, v, info):
        """Validate file MIME type against allowed types."""
        if v:
            from django.conf import settings
            allowed = getattr(settings, 'CHAT_ALLOWED_ATTACHMENT_TYPES', [])
            if allowed and v not in allowed:
                raise ValueError(f'File type "{v}" is not allowed')
        return v


class MessageOut(BaseModel):
    """Outgoing message sent to clients."""
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID  # ✅ UUID
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
    # Soft‑delete flags
    deleted_for_everyone: bool = False
    deleted_for_self: bool = False
    # Reply preview (populated by serializer)
    reply_preview: Optional[str] = None
    # Edit history (for audit/admin)
    edit_history: List[dict] = []
    # For frontend optimistic update reconciliation
    _tempId: Optional[str] = None

    @staticmethod
    def from_message(msg: Message, reply_preview: Optional[str] = None) -> "MessageOut":
        """
        Convert a Message model instance to MessageOut schema.
        
        Args:
            msg: Message model instance
            reply_preview: Optional preview text of the replied-to message
            
        Returns:
            MessageOut instance with all fields populated
        """
        return MessageOut(
            id=msg.id,
            conversation_id=msg.conversation_id,
            sender_id=msg.sender_id,
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


# ─── Pagination ──────────────────────────────────────────────────────────────

class PaginatedMessages(BaseModel):
    """Cursor-paginated message list with next cursor."""
    items: List[MessageOut]
    next_cursor: Optional[str] = None  # ISO datetime string of oldest message in batch


# ─── Conversation Creation ───────────────────────────────────────────────────

class StartConversationIn(BaseModel):
    """Request to create a new conversation."""
    participant_ids: List[uuid.UUID] = Field(..., min_length=1, max_length=50)  # ✅ UUID

    @field_validator('participant_ids')
    @classmethod
    def no_duplicates(cls, v):
        """Ensure no duplicate participant IDs."""
        if len(v) != len(set(v)):
            raise ValueError('Duplicate participant IDs are not allowed')
        return v


# ─── Blocking ────────────────────────────────────────────────────────────────

class BlockUserIn(BaseModel):
    """Request to block a user."""
    blocked_user_id: uuid.UUID  # ✅ UUID


class BlockedUserOut(BaseModel):
    """Blocked user info returned to client."""
    id: uuid.UUID
    blocked_user_id: uuid.UUID
    blocked_username: Optional[str] = None
    created_at: datetime


# ─── Mark Read ──────────────────────────────────────────────────────────────

class MarkReadIn(BaseModel):
    """Request to mark messages as read."""
    message_ids: List[uuid.UUID] = Field(..., min_length=1)


# ─── Reporting ───────────────────────────────────────────────────────────────

class ReportIn(BaseModel):
    """Request to submit a report."""
    reported_user_id: uuid.UUID  # ✅ UUID
    message_id: Optional[uuid.UUID] = None
    conversation_id: Optional[uuid.UUID] = None
    reason: ReportReason
    description: str = ""

    @field_validator('reason')
    @classmethod
    def valid_reason(cls, v):
        """Validate report reason against allowed choices."""
        allowed = {choice.value for choice in ReportReason}
        if v.value not in allowed:
            raise ValueError(f'Invalid report reason: {v}')
        return v

    @field_validator('message_id', 'conversation_id')
    @classmethod
    def at_least_one_target(cls, v, info):
        """Ensure at least one of message_id or conversation_id is provided."""
        # This is checked in a model_validator instead
        return v

    @staticmethod
    def validate_targets(data):
        """Validate that at least one report target is specified."""
        if not data.get('message_id') and not data.get('conversation_id'):
            raise ValueError('Must specify either message_id or conversation_id')
        return data


class ReportOut(BaseModel):
    """Report data returned to clients/admins."""
    id: uuid.UUID
    reporter_id: uuid.UUID  # ✅ UUID
    reported_user_id: uuid.UUID  # ✅ UUID
    message_id: Optional[uuid.UUID] = None
    conversation_id: Optional[uuid.UUID] = None
    reason: str
    description: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by_id: Optional[uuid.UUID] = None  # ✅ UUID
    admin_notes: str = ""

    class Config:
        from_attributes = True


# ─── Admin Bulk Messaging ────────────────────────────────────────────────────

class BulkMessageIn(BaseModel):
    """Request for admin bulk messaging."""
    content: str = Field(..., min_length=1, max_length=5000)
    filter_params: dict = Field(
        ...,
        description="Filter criteria: {'class': '10', 'school': 'xyz', 'user_ids': [...]}"
    )


class BulkMessageTaskOut(BaseModel):
    """Bulk message task status returned to admin."""
    task_id: uuid.UUID
    status: str
    total_recipients: int = 0
    success_count: int = 0
    failed_count: int = 0
    created_at: datetime
    completed_at: Optional[datetime] = None


# ─── Forwarding ──────────────────────────────────────────────────────────────

class ForwardMessageIn(BaseModel):
    """Request to forward a message to other conversations."""
    target_conversation_ids: List[uuid.UUID] = Field(..., min_length=1, max_length=10)


# ─── Presigned URL (S3 Upload) ───────────────────────────────────────────────

class PresignedUrlIn(BaseModel):
    """Request for a presigned S3 upload URL."""
    file_name: str = Field(..., min_length=1, max_length=255)
    content_type: str = Field(..., min_length=1)
    max_file_size: int = Field(default=10 * 1024 * 1024, ge=1)  # 10 MB default


class PresignedUrlOut(BaseModel):
    """Presigned URL response with form fields for direct S3 upload."""
    url: str  # S3 bucket URL for POST
    fields: dict  # Form fields for S3 POST
    file_url: str  # Final public URL after upload


# ─── Rate Limit Status ───────────────────────────────────────────────────────

class RateLimitOut(BaseModel):
    """Daily message rate limit status."""
    used: int
    limit: int
    remaining: int
    reset_at: str  # ISO datetime string


# ─── User Search ─────────────────────────────────────────────────────────────

class UserSearchOut(BaseModel):
    """User search result for autocomplete."""
    id: uuid.UUID  # ✅ UUID
    username: str
    display_name: str
    class_name: Optional[str] = None
    avatar_url: Optional[str] = None
    avatar_color: Optional[str] = None


# ─── Message Search ──────────────────────────────────────────────────────────

class MessageSearchOut(BaseModel):
    """Message search result."""
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID  # ✅ UUID
    content: str
    msg_type: str
    created_at: datetime
    conversation_name: Optional[str] = None


# ─── Draft ───────────────────────────────────────────────────────────────────

class DraftIn(BaseModel):
    """Request to save a draft message."""
    draft: str = Field(..., max_length=10000)


# ─── Bulk Offline Sync ───────────────────────────────────────────────────────

class BulkMessageItem(BaseModel):
    """Single message in a bulk offline sync request."""
    content: str = ""
    msg_type: MessageType = MessageType.TEXT
    client_msg_id: uuid.UUID  # Required for idempotency
    file_url: Optional[str] = None
    _tempId: Optional[str] = None


class BulkSendIn(BaseModel):
    """Request for bulk offline message sync."""
    messages: List[BulkMessageItem] = Field(..., min_length=1, max_length=100)


# ─── WebSocket‑specific Schemas ──────────────────────────────────────────────

class MessageStatusUpdateIn(BaseModel):
    """WebSocket message status update (delivered/read)."""
    message_id: uuid.UUID
    status: Literal['delivered', 'read']


class MessageEditIn(BaseModel):
    """WebSocket message edit request."""
    message_id: uuid.UUID
    content: str = Field(..., min_length=1)


class MessageDeleteIn(BaseModel):
    """WebSocket message delete request."""
    message_id: uuid.UUID
    mode: Literal['self', 'everyone'] = 'self'


class SyncHistoryIn(BaseModel):
    """WebSocket sync history request after reconnect."""
    last_message_at: str  # ISO datetime string


class TypingIn(BaseModel):
    """WebSocket typing indicator."""
    conversation_id: uuid.UUID
    typing: bool