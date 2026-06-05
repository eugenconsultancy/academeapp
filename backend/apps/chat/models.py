import uuid
from django.db import models
from django.conf import settings
from common.models import BaseModel

class Conversation(BaseModel):
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='conversations')
    is_active = models.BooleanField(default=True)   # always active once created
    last_message_preview = models.CharField(max_length=200, blank=True)
    last_message_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Conversation {self.id}"

class Message(BaseModel):
    MESSAGE_TYPES = (
        ('TEXT', 'Text'),
        ('FILE', 'File'),
        ('VOICE', 'Voice'),
    )
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField(blank=True, null=True)
    file_url = models.URLField(blank=True, null=True)
    msg_type = models.CharField(max_length=5, choices=MESSAGE_TYPES, default='TEXT')

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
        ]

    def __str__(self):
        return f"Msg {self.id} in conv {self.conversation_id}"