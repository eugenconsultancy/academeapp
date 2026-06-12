# backend/apps/chat/models.py

import uuid
from django.db import models
from django.conf import settings
from common.models import BaseModel


class Conversation(BaseModel):
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='conversations'
    )
    is_active = models.BooleanField(default=True)
    last_message_preview = models.CharField(max_length=200, blank=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='deleted_conversations',
        blank=True
    )

    class Meta:
        ordering = ['-last_message_at']
        indexes = [
            models.Index(fields=['is_active', 'last_message_at']),
        ]

    def __str__(self):
        return f"Conversation {self.id}"

    def get_other_participant(self, user):
        return self.participants.exclude(id=user.id).first()


class Message(BaseModel):
    MESSAGE_TYPES = (
        ('TEXT', 'Text'),
        ('FILE', 'File'),
        ('VOICE', 'Voice'),
    )
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    content = models.TextField(blank=True, null=True)
    file_url = models.URLField(blank=True, null=True)
    msg_type = models.CharField(max_length=5, choices=MESSAGE_TYPES, default='TEXT')
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    reply_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replies'
    )
    duration = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['sender', 'is_read']),
            models.Index(fields=['conversation', 'sender', 'is_read']),
        ]

    def __str__(self):
        return f"Msg {self.id} in conv {self.conversation_id}"


class BlockedUser(BaseModel):
    blocker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='blocked_users'
    )
    blocked = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='blocked_by'
    )

    class Meta:
        unique_together = ('blocker', 'blocked')
        indexes = [
            models.Index(fields=['blocker', 'blocked']),
        ]
        verbose_name = 'Blocked User'
        verbose_name_plural = 'Blocked Users'

    def __str__(self):
        return f"{self.blocker.full_name} blocked {self.blocked.full_name}"


class MutedConversation(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='muted_conversations'
    )
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='muted_by'
    )
    muted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'conversation')
        indexes = [
            models.Index(fields=['user', 'conversation']),
        ]
        verbose_name = 'Muted Conversation'
        verbose_name_plural = 'Muted Conversations'

    def __str__(self):
        return f"{self.user.full_name} muted conv {self.conversation_id}"


class PinnedConversation(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pinned_conversations'
    )
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='pinned_by'
    )
    pinned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'conversation')
        indexes = [
            models.Index(fields=['user', 'conversation']),
        ]
        verbose_name = 'Pinned Conversation'
        verbose_name_plural = 'Pinned Conversations'

    def __str__(self):
        return f"{self.user.full_name} pinned conv {self.conversation_id}"


class UserReport(BaseModel):
    REPORT_REASONS = (
        ('harassment', 'Harassment'),
        ('spam', 'Spam'),
        ('inappropriate_content', 'Inappropriate Content'),
        ('impersonation', 'Impersonation'),
        ('other', 'Other'),
    )
    REPORT_STATUSES = (
        ('pending', 'Pending'),
        ('under_review', 'Under Review'),
        ('resolved', 'Resolved'),
        ('dismissed', 'Dismissed'),
    )
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reports_filed'
    )
    reported_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reports_against'
    )
    reason = models.CharField(max_length=30, choices=REPORT_REASONS)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=REPORT_STATUSES, default='pending')
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reports'
    )
    admin_notes = models.TextField(blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=['reporter', 'reported_user']),
            models.Index(fields=['status']),
            models.Index(fields=['reason']),
        ]
        verbose_name = 'User Report'
        verbose_name_plural = 'User Reports'

    def __str__(self):
        return f"Report by {self.reporter.full_name} against {self.reported_user.full_name}"