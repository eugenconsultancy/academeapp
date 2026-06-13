# backend/apps/support/signals.py
import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import SupportTicket, TicketResponse
from apps.notifications.services import NotificationService
from apps.accounts.models import User

logger = logging.getLogger(__name__)


@receiver(post_save, sender=SupportTicket)
def ticket_created_notify(sender, instance, created, **kwargs):
    """Send notification when a new support ticket is created"""
    if created:
        try:
            # Ticket detail link
            ticket_link = f"/my-tickets?ticket={instance.id}"
            
            # Notify the user who created the ticket
            NotificationService.create_and_push(
                user=instance.submitted_by,
                title=f"Support Ticket #{str(instance.id)[:8]} Created",
                message=f"Your ticket '{instance.title}' has been created. We'll respond within 24 hours.",
                notification_type="support",
                link=ticket_link,
                source_type="support",
                source_id=instance.id,
            )
            logger.info(f"Ticket creation notification sent to {instance.submitted_by.id}")
            
            # Notify all admins about new ticket
            admins = User.objects.filter(role='admin', is_active=True)
            for admin in admins:
                NotificationService.create_and_push(
                    user=admin,
                    title=f"New Support Ticket #{str(instance.id)[:8]}",
                    message=f"New ticket from {instance.submitted_by.full_name}: {instance.title[:100]}",
                    notification_type="support",
                    link=f"/admin/tickets/{instance.id}",
                    source_type="support",
                    source_id=instance.id,
                )
            logger.info(f"Admin notifications sent for ticket {instance.id}")
            
        except Exception as e:
            logger.error(f"Failed to send ticket creation notification: {e}")


@receiver(pre_save, sender=SupportTicket)
def track_ticket_status_change(sender, instance, **kwargs):
    """Track status changes before saving"""
    if instance.pk:
        try:
            original = SupportTicket.objects.get(pk=instance.pk)
            instance._previous_status = original.status
        except SupportTicket.DoesNotExist:
            pass


@receiver(post_save, sender=SupportTicket)
def ticket_status_changed_notify(sender, instance, created, **kwargs):
    """Send notification when ticket status changes (not on creation)"""
    if not created and hasattr(instance, '_previous_status'):
        try:
            old_status = instance._previous_status
            new_status = instance.status
            
            if old_status != new_status:
                ticket_link = f"/my-tickets?ticket={instance.id}"
                
                status_messages = {
                    'open': "Your ticket is now open and being reviewed by our support team.",
                    'in_progress': "Your ticket is now in progress. A support agent is actively working on it.",
                    'resolved': f"Your ticket has been resolved. {instance.resolution or 'Thank you for your patience. Please let us know if you need further assistance.'}",
                    'closed': "Your ticket has been closed. If you need further assistance, please open a new ticket.",
                }
                
                NotificationService.create_and_push(
                    user=instance.submitted_by,
                    title=f"Support Ticket #{str(instance.id)[:8]} Status Update",
                    message=status_messages.get(new_status, f"Your ticket status has been updated to {new_status.replace('_', ' ').title()}"),
                    notification_type="support",
                    link=ticket_link,
                    source_type="support",
                    source_id=instance.id,
                )
                logger.info(f"Ticket status change notification sent to {instance.submitted_by.id}")
                
        except Exception as e:
            logger.error(f"Failed to send ticket status change notification: {e}")


@receiver(post_save, sender=SupportTicket)
def ticket_assigned_notify(sender, instance, created, **kwargs):
    """Send notification when ticket is assigned to an agent (not on creation)"""
    if not created and hasattr(instance, '_previous_assigned_to'):
        try:
            old_assigned = instance._previous_assigned_to
            new_assigned = instance.assigned_to
            
            if old_assigned != new_assigned and new_assigned:
                ticket_link = f"/my-tickets?ticket={instance.id}"
                
                NotificationService.create_and_push(
                    user=instance.submitted_by,
                    title=f"Support Ticket #{str(instance.id)[:8]} Assigned",
                    message=f"Your ticket has been assigned to {instance.assigned_to.full_name}. They will be handling your request.",
                    notification_type="support",
                    link=ticket_link,
                    source_type="support",
                    source_id=instance.id,
                )
                logger.info(f"Ticket assignment notification sent to {instance.submitted_by.id}")
                
        except Exception as e:
            logger.error(f"Failed to send ticket assignment notification: {e}")


@receiver(post_save, sender=TicketResponse)
def ticket_response_notify(sender, instance, created, **kwargs):
    """Send notification when a new response is added to a ticket"""
    if created and not instance.is_internal:
        try:
            ticket_link = f"/my-tickets?ticket={instance.ticket.id}"
            
            # Get responder name
            responder_name = instance.responder.full_name if instance.responder else "Support Team"
            
            # If response is from support/admin to user
            if instance.responder != instance.ticket.submitted_by:
                NotificationService.create_and_push(
                    user=instance.ticket.submitted_by,
                    title=f"New Response on Ticket #{str(instance.ticket.id)[:8]}",
                    message=f"{responder_name} responded to your ticket: {instance.message[:150]}",
                    notification_type="support",
                    link=ticket_link,
                    source_type="support",
                    source_id=instance.ticket.id,
                )
                logger.info(f"Ticket response notification sent to {instance.ticket.submitted_by.id}")
            
            # If response is from user to support, notify all admins
            else:
                admins = User.objects.filter(role='admin', is_active=True)
                for admin in admins:
                    NotificationService.create_and_push(
                        user=admin,
                        title=f"User Response on Ticket #{str(instance.ticket.id)[:8]}",
                        message=f"{instance.responder.full_name} responded to ticket '{instance.ticket.title}': {instance.message[:150]}",
                        notification_type="support",
                        link=f"/admin/tickets/{instance.ticket.id}",
                        source_type="support",
                        source_id=instance.ticket.id,
                    )
                logger.info(f"Admin notifications sent for user response on ticket {instance.ticket.id}")
                
        except Exception as e:
            logger.error(f"Failed to send ticket response notification: {e}")


# Helper function to track assignment changes
@receiver(pre_save, sender=SupportTicket)
def track_assignment_change(sender, instance, **kwargs):
    """Track assignment changes before saving"""
    if instance.pk:
        try:
            original = SupportTicket.objects.get(pk=instance.pk)
            instance._previous_assigned_to = original.assigned_to
        except SupportTicket.DoesNotExist:
            pass