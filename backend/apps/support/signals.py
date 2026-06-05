from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import SupportTicket, TicketResponse
from apps.notifications.services import NotificationService

@receiver(post_save, sender=SupportTicket)
def ticket_created_notify(sender, instance, created, **kwargs):
    if created:
        # Notify the user who created the ticket
        NotificationService.create_and_push(
            user=instance.submitted_by,
            title="Ticket Created",
            message=f"Your support ticket #{instance.ticket_id} has been created.",
            link=f"/my-tickets/{instance.id}",
            notification_type="system",
            source_type="support",
            source_id=instance.id,
        )

@receiver(post_save, sender=TicketResponse)
def ticket_response_notify(sender, instance, created, **kwargs):
    if created and not instance.is_internal:
        # Notify ticket owner of a new public response
        NotificationService.create_and_push(
            user=instance.ticket.submitted_by,
            title="Ticket Response",
            message=f"New response on ticket #{instance.ticket.ticket_id}",
            link=f"/my-tickets/{instance.ticket.id}",
            notification_type="ticket_updated",
            source_type="support",
            source_id=instance.ticket.id,
        )