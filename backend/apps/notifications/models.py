from django.db import models
from common.models import BaseModel

class Notification(BaseModel):
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=30,
        choices=[
            ('announcement', 'Announcement'),
            ('class', 'Class Update'),
            ('found_item', 'Found Item'),
            ('opportunity', 'Opportunity'),
            ('governance', 'Governance'),
            ('system', 'System'),
        ],
        default='system'
    )
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"{self.user.full_name} - {self.title}"