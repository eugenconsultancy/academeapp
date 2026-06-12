# backend/apps/chat/schema.py

from ninja import Schema
from datetime import datetime
from typing import Optional, List
import uuid


class StartConversationIn(Schema):
    receiver_id: uuid.UUID


class ParticipantInfo(Schema):
    """Information about the other participant in a conversation."""
    id: uuid.UUID
    full_name: str
    class_name: Optional[str] = None
    is_online: bool = False
    last_active: Optional[datetime] = None
    avatar_url: Optional[str] = None


class ConversationOut(Schema):
    id: uuid.UUID
    participant: Optional[ParticipantInfo] = None
    is_active: bool
    is_pinned: bool = False
    is_muted: bool = False
    last_message_preview: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0


class MessageIn(Schema):
    content: Optional[str] = None
    file_url: Optional[str] = None
    msg_type: str = 'TEXT'
    reply_to_id: Optional[uuid.UUID] = None
    duration: Optional[float] = None


class MessageEditIn(Schema):
    """Schema for editing an existing message"""
    content: str


class MessageOut(Schema):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    content: Optional[str] = None
    file_url: Optional[str] = None
    msg_type: str
    created_at: datetime
    is_read: bool = False
    is_delivered: bool = False
    reply_to_id: Optional[uuid.UUID] = None
    reply_preview: Optional[str] = None
    duration: Optional[float] = None
    edited_at: Optional[datetime] = None


class PresignedUrlIn(Schema):
    file_name: str
    content_type: str
    max_file_size: int = 10 * 1024 * 1024


class PresignedUrlOut(Schema):
    presigned_url: str
    file_url: str


class BlockUserIn(Schema):
    blocked_user_id: uuid.UUID


class MarkReadIn(Schema):
    message_ids: List[uuid.UUID] = []


class ReportUserIn(Schema):
    reported_user_id: uuid.UUID
    reason: str
    description: Optional[str] = None
    conversation_id: Optional[uuid.UUID] = None