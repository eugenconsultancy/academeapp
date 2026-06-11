# C:\Users\GATARA-BJTU\academe\backend\apps\chat\models.py

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

    class Meta:
        ordering = ['-last_message_at']
        indexes = [
            models.Index(fields=['is_active', 'last_message_at']),
        ]

    def __str__(self):
        return f"Conversation {self.id}"

    def get_other_participant(self, user):
        """Return the other participant in this conversation."""
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
    reply_to = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='replies'
    )

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
    """
    Tracks which users have been blocked.
    When user A blocks user B:
    - A cannot receive messages from B
    - Conversations between A and B are deactivated
    """
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