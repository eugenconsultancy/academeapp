from ninja import Schema
from datetime import datetime
from typing import Optional, List
import uuid

class StartConversationIn(Schema):
    receiver_id: uuid.UUID

class ConversationOut(Schema):
    id: uuid.UUID
    participants: List[uuid.UUID]
    is_active: bool
    last_message_preview: Optional[str] = None
    last_message_at: Optional[datetime] = None
    # unread count omitted for now

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

class PresignedUrlIn(Schema):
    file_name: str
    content_type: str

class PresignedUrlOut(Schema):
    presigned_url: str
    file_url: str