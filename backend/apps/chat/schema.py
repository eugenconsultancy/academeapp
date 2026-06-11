# C:\Users\GATARA-BJTU\academe\backend\apps\chat\schema.py

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
    participant: Optional[ParticipantInfo] = None  # The OTHER user
    is_active: bool
    last_message_preview: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0


class MessageIn(Schema):
    content: Optional[str] = None
    file_url: Optional[str] = None
    msg_type: str = 'TEXT'


class MessageOut(Schema):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    content: Optional[str] = None
    file_url: Optional[str] = None
    msg_type: str
    created_at: datetime
    is_read: bool = False


class PresignedUrlIn(Schema):
    file_name: str
    content_type: str


class PresignedUrlOut(Schema):
    presigned_url: str
    file_url: str


class BlockUserIn(Schema):
    blocked_user_id: uuid.UUID


class MarkReadIn(Schema):
    message_ids: List[uuid.UUID] = []