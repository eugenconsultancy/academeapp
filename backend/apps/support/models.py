from django.db import models
from common.models import BaseModel
from common.constants import TicketStatus


class SupportTicket(BaseModel):
    title = models.CharField(max_length=255)
    description = models.TextField()
    submitted_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='support_tickets'
    )
    category = models.CharField(max_length=50, choices=[
        ('technical', 'Technical Issue'),
        ('account', 'Account Issue'),
        ('feature', 'Feature Request'),
        ('report', 'Report Bug'),
        ('other', 'Other')
    ])
    status = models.CharField(
        max_length=20,
        choices=[(status.value, status.name) for status in TicketStatus],
        default=TicketStatus.OPEN.value
    )
    assigned_to = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tickets'
    )
    resolution = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['submitted_by']),
        ]

    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"

    @property
    def submitted_by_name(self):
        if self.submitted_by:
            return self.submitted_by.full_name
        return "Unknown"

    @property
    def assigned_to_name(self):
        if self.assigned_to:
            return self.assigned_to.full_name
        return None


class TicketResponse(BaseModel):
    ticket = models.ForeignKey(
        SupportTicket,
        on_delete=models.CASCADE,
        related_name='responses'
    )
    responder = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE
    )
    message = models.TextField()
    is_internal = models.BooleanField(default=False)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Response by {self.responder.full_name} on {self.ticket.title}"

    @property
    def responder_name(self):
        if self.responder:
            return self.responder.full_name
        return "Unknown"