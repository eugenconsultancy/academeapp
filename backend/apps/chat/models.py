# backend/apps/chat/models.py
"""
Chat models for Academe.
Key design decisions:
  - UUID primary keys on all models
  - client_msg_id (UUID) + sender enforces idempotency at DB level
  - Soft-delete flags: deleted_for_self, deleted_for_everyone
  - Message status: PENDING -> SENT -> DELIVERED -> READ
  - Edit history stored as JSON array on the Message itself
  - forwarded_from FK enables forwarding without duplicating attachments
  - ConversationParticipant through-table holds per-user state
    (pinned, archived, muted, unread_count, draft, last_seen_at)
  - BlockList + Redis set provide sub-ms block checks
  - DeviceToken for multi-device push notifications
  - BulkMessageTask for admin bulk messaging progress tracking
"""

import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


# ─── Constants ────────────────────────────────────────────────────────────────

class MessageStatus(models.TextChoices):
    PENDING   = 'pending',   'Pending'
    SENT      = 'sent',      'Sent'
    DELIVERED = 'delivered', 'Delivered'
    READ      = 'read',      'Read'


class MessageType(models.TextChoices):
    TEXT       = 'TEXT',       'Text'
    IMAGE      = 'IMAGE',      'Image'
    FILE       = 'FILE',       'File'
    VOICE      = 'VOICE',      'Voice Note'
    VIDEO      = 'VIDEO',      'Video'
    STICKER    = 'STICKER',    'Sticker'
    SYSTEM     = 'SYSTEM',     'System Message'


class ReportReason(models.TextChoices):
    HARASSMENT           = 'harassment',            'Harassment'
    SPAM                 = 'spam',                  'Spam'
    INAPPROPRIATE        = 'inappropriate_content', 'Inappropriate Content'
    IMPERSONATION        = 'impersonation',         'Impersonation'
    VIOLENCE             = 'violence',              'Violence or Threats'
    OTHER                = 'other',                 'Other'


class ReportStatus(models.TextChoices):
    PENDING      = 'pending',     'Pending'
    UNDER_REVIEW = 'under_review','Under Review'
    RESOLVED     = 'resolved',    'Resolved'
    DISMISSED    = 'dismissed',   'Dismissed'


class BulkMessageStatus(models.TextChoices):
    PENDING    = 'pending',    'Pending'
    PROCESSING = 'processing', 'Processing'
    COMPLETED  = 'completed',  'Completed'
    FAILED     = 'failed',     'Failed'


class DeviceType(models.TextChoices):
    ANDROID = 'android', 'Android'
    IOS     = 'ios',     'iOS'
    WEB     = 'web',     'Web'


# ─── Conversation ─────────────────────────────────────────────────────────────

class Conversation(models.Model):
    """
    Represents a 1-on-1 or group chat.
    Participants are linked via ConversationParticipant (through model).
    last_message_* fields are denormalized for O(1) inbox loading.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Participants via through-table
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through='ConversationParticipant',
        through_fields=('conversation', 'user'),
        related_name='chat_conversations',
    )

    # Group support
    is_group      = models.BooleanField(default=False)
    group_name    = models.CharField(max_length=255, blank=True)
    group_avatar  = models.URLField(blank=True)
    group_admin   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='administered_conversations',
    )

    # Denormalized last-message fields (updated on every new message)
    last_message_content = models.TextField(blank=True)
    last_message_at      = models.DateTimeField(null=True, blank=True, db_index=True)
    last_message_sender  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='last_sent_conversations',
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_message_at']
        indexes = [
            models.Index(fields=['last_message_at']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        if self.is_group:
            return f"Group: {self.group_name} ({self.id})"
        return f"Conversation {self.id}"

    def get_other_participant(self, user):
        """Return the other participant in a 1-on-1 conversation."""
        return self.participants.exclude(id=user.id).first()


# ─── ConversationParticipant ──────────────────────────────────────────────────

class ConversationParticipant(models.Model):
    """
    Through-model that holds per-user state for a conversation.
    Unique constraint on (user, conversation) prevents duplicates.
    """
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='participations',
        db_index=True,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_participations',
        db_index=True,
    )

    # Per-user conversation state
    is_pinned    = models.BooleanField(default=False)
    is_archived  = models.BooleanField(default=False)
    is_muted     = models.BooleanField(default=False)
    is_deleted   = models.BooleanField(default=False)  # "deleted for self"
    unread_count = models.PositiveIntegerField(default=0)
    draft        = models.TextField(blank=True)         # draft message content

    # When this user joined (for group chats – only show messages after this time)
    joined_at    = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(null=True, blank=True)

    # Last time user was seen in this conversation (for presence tracking)
    last_seen_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('user', 'conversation')]
        indexes = [
            models.Index(fields=['user', 'is_archived']),
            models.Index(fields=['user', 'is_pinned']),
            models.Index(fields=['conversation', 'user']),
        ]

    def __str__(self):
        return f"{self.user} in {self.conversation}"


# ─── Message ──────────────────────────────────────────────────────────────────
class Message(models.Model):
    """
    Core message model.

    Idempotency: unique_together(sender, client_msg_id) ensures a
    message re-sent (e.g., after network failure) is not duplicated.

    Status lifecycle:
      PENDING  → message queued client-side, not yet ACKed by server
      SENT     → server stored; single grey tick
      DELIVERED→ recipient device fetched; double grey ticks
      READ     → recipient read; double blue ticks

    Soft-delete:
      deleted_for_self     → hidden only for the deleting user
      deleted_for_everyone → replaced with "[Message deleted]" placeholder
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
        db_index=True,
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages',
        db_index=True,
    )

    # Content
    content  = models.TextField(blank=True)
    msg_type = models.CharField(
        max_length=10,
        choices=MessageType.choices,
        default=MessageType.TEXT,
    )

    # Attachment (populated for IMAGE/FILE/VOICE/VIDEO)
    file_url       = models.URLField(blank=True)
    file_name      = models.CharField(max_length=255, blank=True)
    file_size      = models.PositiveIntegerField(null=True, blank=True)  # bytes
    file_mime_type = models.CharField(max_length=100, blank=True)
    thumbnail_url  = models.URLField(blank=True)  # for images / video previews
    duration       = models.FloatField(null=True, blank=True)  # seconds (voice/video)

    # Delivery status
    status = models.CharField(
        max_length=10,
        choices=MessageStatus.choices,
        default=MessageStatus.SENT,
        db_index=True,
    )

    # Idempotency key sent by the client
    client_msg_id = models.UUIDField(null=True, blank=True)

    # Threading / replies
    reply_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='replies',
    )

    # Forwarding
    forwarded_from = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='forwards',
    )
    is_forwarded = models.BooleanField(default=False)

    # Editing
    is_edited  = models.BooleanField(default=False, db_index=True)
    edited_at  = models.DateTimeField(null=True, blank=True)
    # JSON array of {"content": str, "edited_at": ISO-str}
    edit_history = models.JSONField(default=list, blank=True)

    # Soft delete
    deleted_for_self     = models.BooleanField(default=False)
    deleted_for_everyone = models.BooleanField(default=False, db_index=True)
    deleted_at           = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        # Idempotency: same sender cannot submit the same client_msg_id twice
        unique_together = [('sender', 'client_msg_id')]
        indexes = [
            # Cursor-based pagination (most common query)
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['conversation', '-created_at']),
            models.Index(fields=['conversation', 'status']),
            # Full-text search (GIN index created via migration)
            models.Index(fields=['sender', 'created_at']),
            models.Index(fields=['deleted_for_everyone', 'created_at']),
        ]

    def __str__(self):
        snippet = (self.content or self.file_name or self.msg_type)[:40]
        return f"[{self.status}] {self.sender} → {self.conversation_id}: {snippet}"

    def soft_delete_for_everyone(self):
        """Replace content and mark globally deleted."""
        self.content              = ''
        self.file_url             = ''
        self.deleted_for_everyone = True
        self.deleted_at           = timezone.now()
        self.save(update_fields=[
            'content', 'file_url', 'deleted_for_everyone', 'deleted_at', 'updated_at'
        ])

    def edit(self, new_content: str):
        """Save old content to edit_history, update content."""
        history = self.edit_history or []
        history.append({
            'content':   self.content,
            'edited_at': self.edited_at.isoformat() if self.edited_at else self.created_at.isoformat(),
        })
        self.edit_history = history
        self.content      = new_content
        self.is_edited    = True
        self.edited_at    = timezone.now()
        self.save(update_fields=['content', 'is_edited', 'edited_at', 'edit_history', 'updated_at'])


# ─── MessageReadReceipt ───────────────────────────────────────────────────────

class MessageReadReceipt(models.Model):
    """
    Tracks per-user read status for group messages.
    For 1-on-1 chats the Message.status field is sufficient.
    """
    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='read_receipts',
        db_index=True,
    )
    user    = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='message_read_receipts',
        db_index=True,
    )
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('message', 'user')]
        indexes = [
            models.Index(fields=['message', 'user']),
        ]

    def __str__(self):
        return f"{self.user} read {self.message_id} at {self.read_at}"


# ─── BlockList ────────────────────────────────────────────────────────────────

class BlockList(models.Model):
    """
    Records a block. Unique on (blocker, blocked).
    Mirrored in Redis (set blocked:{blocker_id}) for sub-ms lookups.
    """
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    blocker      = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='blocks_initiated',
        db_index=True,
    )
    blocked_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='blocks_received',
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('blocker', 'blocked_user')]
        indexes = [
            models.Index(fields=['blocker', 'blocked_user']),
            models.Index(fields=['blocked_user', 'blocker']),
        ]

    def __str__(self):
        return f"{self.blocker} blocked {self.blocked_user}"


# ─── Report ───────────────────────────────────────────────────────────────────

class Report(models.Model):
    """
    User can report a message or an entire conversation.
    Admin can resolve/dismiss via Django admin or admin API.
    """
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reports_filed',
        db_index=True,
    )
    reported_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reports_against',
    )

    # Optional: link to a specific message or conversation
    message      = models.ForeignKey(
        Message,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reports',
    )
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reports',
    )

    reason      = models.CharField(max_length=30, choices=ReportReason.choices)
    description = models.TextField(blank=True)
    status      = models.CharField(
        max_length=15,
        choices=ReportStatus.choices,
        default=ReportStatus.PENDING,
        db_index=True,
    )
    admin_notes = models.TextField(blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='chat_resolved_reports',
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    created_at  = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['reporter', 'created_at']),
        ]

    def __str__(self):
        return f"Report by {self.reporter} [{self.reason}] – {self.status}"


# ─── DeviceToken ──────────────────────────────────────────────────────────────

class DeviceToken(models.Model):
    """
    FCM device tokens for push notifications.
    Separate from User.fcm_token to support multiple devices per user.
    """
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user        = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_device_tokens',
        db_index=True,
    )
    token       = models.CharField(max_length=255, unique=True, db_index=True)
    device_type = models.CharField(
        max_length=20,
        choices=DeviceType.choices,
        default=DeviceType.WEB,
    )
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('user', 'token')]
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['token']),
        ]

    def __str__(self):
        return f"DeviceToken({self.user_id}, {self.device_type})"


# ─── BulkMessageTask ──────────────────────────────────────────────────────────

class BulkMessageTask(models.Model):
    """
    Tracks admin bulk messaging progress.
    Referenced by tasks.py for async processing.
    """
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender           = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bulk_tasks',
        db_index=True,
    )
    filter_params    = models.JSONField(default=dict)
    content          = models.TextField()
    status           = models.CharField(
        max_length=20,
        choices=BulkMessageStatus.choices,
        default=BulkMessageStatus.PENDING,
        db_index=True,
    )
    total_recipients = models.PositiveIntegerField(default=0)
    success_count    = models.PositiveIntegerField(default=0)
    failed_count     = models.PositiveIntegerField(default=0)
    error_log        = models.JSONField(default=list, blank=True)
    created_at       = models.DateTimeField(auto_now_add=True, db_index=True)
    completed_at     = models.DateTimeField(null=True, blank=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['sender', 'created_at']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"BulkMessage #{self.id} - {self.status}"

    def mark_completed(self, success: int, failed: int):
        """Mark task as completed with counts."""
        self.status = BulkMessageStatus.COMPLETED
        self.success_count = success
        self.failed_count = failed
        self.completed_at = timezone.now()
        self.save(update_fields=[
            'status', 'success_count', 'failed_count', 'completed_at', 'updated_at'
        ])

    def mark_failed(self, errors: list):
        """Mark task as failed with error details."""
        self.status = BulkMessageStatus.FAILED
        self.error_log = errors
        self.completed_at = timezone.now()
        self.save(update_fields=[
            'status', 'error_log', 'completed_at', 'updated_at'
        ])