# backend/apps/support/api.py
from typing import List
from uuid import UUID
from django.shortcuts import get_object_or_404
from ninja import Router, Query
from common.jwt_auth import JWTAuth
from common.constants import TicketStatus
from .models import SupportTicket, TicketResponse
from .schema import TicketIn, TicketResponseIn, TicketUpdateIn, TicketOut
from .permissions import IsAdmin
from apps.notifications.services import NotificationService
from apps.accounts.models import User
import logging

logger = logging.getLogger(__name__)
router = Router()

# ─────────────────────────────────────────────────────────────────
# USER ENDPOINTS
# ─────────────────────────────────────────────────────────────────

@router.get("/", auth=JWTAuth(), response=List[TicketOut])
def list_user_tickets(request, status: str = None):
    """List tickets submitted by the authenticated user. Optionally filter by status."""
    tickets = SupportTicket.objects.filter(submitted_by=request.auth)\
        .select_related('submitted_by', 'assigned_to')\
        .prefetch_related('responses__responder')
    if status and status in [s.value for s in TicketStatus]:
        tickets = tickets.filter(status=status)
    tickets = tickets.order_by('-created_at')
    return tickets


@router.post("/", auth=JWTAuth())
def create_ticket(request, data: TicketIn):
    ticket = SupportTicket.objects.create(
        title=data.title,
        description=data.description,
        category=data.category,
        submitted_by=request.auth,
        status=TicketStatus.OPEN.value
    )
    
    # Send confirmation to user
    NotificationService.create_and_push(
        user=request.auth,
        title=f"Support Ticket #{str(ticket.id)[:8]} Created",
        message=f"Your ticket '{data.title}' has been created. Reference ID: {str(ticket.id)[:8]}. We'll respond within 24 hours.",
        notification_type="support",
        link=f"/my-tickets/{ticket.id}",
        source_type="support",
        source_id=ticket.id,
    )
    
    # Notify admins about new ticket
    admins = User.objects.filter(role='admin', is_active=True)
    for admin in admins:
        NotificationService.create_and_push(
            user=admin,
            title=f"New Support Ticket #{str(ticket.id)[:8]}",
            message=f"New ticket from {request.auth.full_name}: {data.title[:100]}",
            notification_type="support",
            link=f"/admin/tickets/{ticket.id}",
            source_type="support",
            source_id=ticket.id,
        )
    
    return {"id": str(ticket.id), "message": "Ticket created successfully"}


@router.get("/{ticket_id}/", auth=JWTAuth(), response=TicketOut)
def get_ticket(request, ticket_id: UUID):
    """Get a single ticket by ID - user must be the submitter"""
    ticket = get_object_or_404(
        SupportTicket.objects.select_related('submitted_by', 'assigned_to')
        .prefetch_related('responses__responder'),
        id=ticket_id, submitted_by=request.auth
    )
    return ticket


# CRITICAL: This endpoint was missing - it's the one causing 404
@router.post("/{ticket_id}/respond/", auth=JWTAuth())
def user_respond_to_ticket(request, ticket_id: UUID, data: TicketResponseIn):
    """
    Allow users to add responses to their own tickets.
    Endpoint: POST /api/support/{ticket_id}/respond/
    """
    logger.info(f"📝 User respond endpoint called: ticket_id={ticket_id}, user={request.auth.id}")
    
    # Get ticket - user must be the submitter
    ticket = get_object_or_404(SupportTicket, id=ticket_id, submitted_by=request.auth)
    
    # Prevent responses on closed or resolved tickets
    if ticket.status in [TicketStatus.CLOSED.value, TicketStatus.RESOLVED.value]:
        return {"error": "Cannot respond to closed or resolved tickets"}, 400
    
    # Create the response
    response = TicketResponse.objects.create(
        ticket=ticket,
        responder=request.auth,
        message=data.message,
        is_internal=False
    )
    
    # Notify admins when user responds
    admins = User.objects.filter(role='admin', is_active=True)
    for admin in admins:
        NotificationService.create_and_push(
            user=admin,
            title=f"User Response on Ticket #{str(ticket.id)[:8]}",
            message=f"{request.auth.full_name} responded to ticket '{ticket.title}': {data.message[:150]}",
            notification_type="support",
            link=f"/admin/tickets/{ticket.id}",
            source_type="support",
            source_id=ticket.id,
        )
    
    logger.info(f"✅ User {request.auth.id} responded to ticket {ticket_id}")
    
    return {"message": "Response added", "response_id": str(response.id)}


# ─────────────────────────────────────────────────────────────────
# ADMIN ENDPOINTS
# ─────────────────────────────────────────────────────────────────

@router.get("/admin/all/", auth=IsAdmin(), response=List[TicketOut])
def admin_list_tickets(
    request,
    status: str = Query(None, description="Filter by status"),
    assigned_to: str = Query(None, description="Filter by assigned user ID")
):
    tickets = SupportTicket.objects.select_related('submitted_by', 'assigned_to')\
        .prefetch_related('responses__responder')
    if status:
        tickets = tickets.filter(status=status)
    if assigned_to:
        tickets = tickets.filter(assigned_to_id=assigned_to)
    return tickets.order_by('-created_at')


@router.get("/admin/{ticket_id}/", auth=IsAdmin(), response=TicketOut)
def admin_get_ticket(request, ticket_id: UUID):
    ticket = get_object_or_404(
        SupportTicket.objects.select_related('submitted_by', 'assigned_to')
        .prefetch_related('responses__responder'),
        id=ticket_id
    )
    return ticket


@router.put("/admin/{ticket_id}/", auth=IsAdmin())
def admin_update_ticket(request, ticket_id: UUID, data: TicketUpdateIn):
    ticket = get_object_or_404(SupportTicket, id=ticket_id)
    status_changed = False
    old_status = ticket.status
    
    if data.status is not None:
        ticket.status = data.status
        status_changed = True
    if data.assigned_to_id is not None:
        assigned_to = get_object_or_404(User, id=data.assigned_to_id) if data.assigned_to_id else None
        ticket.assigned_to = assigned_to
    if data.resolution is not None:
        ticket.resolution = data.resolution
    ticket.save()
    
    # Send notification when ticket status changes
    if status_changed and old_status != ticket.status:
        status_messages = {
            TicketStatus.OPEN.value: "Your ticket is now open and being reviewed by our support team.",
            TicketStatus.IN_PROGRESS.value: "Your ticket is now in progress. A support agent is actively working on it.",
            TicketStatus.RESOLVED.value: f"Your ticket has been resolved. {ticket.resolution or 'Thank you for your patience. Please let us know if you need further assistance.'}",
            TicketStatus.CLOSED.value: "Your ticket has been closed. If you need further assistance, please open a new ticket.",
        }
        
        NotificationService.create_and_push(
            user=ticket.submitted_by,
            title=f"Support Ticket #{str(ticket.id)[:8]} Status Update",
            message=status_messages.get(ticket.status, f"Your ticket status has been updated to {ticket.status.replace('_', ' ').title()}"),
            notification_type="support",
            link=f"/my-tickets/{ticket.id}",
            source_type="support",
            source_id=ticket.id,
        )
    
    # Send notification when ticket is assigned
    if data.assigned_to_id and ticket.assigned_to:
        NotificationService.create_and_push(
            user=ticket.submitted_by,
            title=f"Support Ticket #{str(ticket.id)[:8]} Assigned",
            message=f"Your ticket has been assigned to {ticket.assigned_to.full_name}. They will be handling your request.",
            notification_type="support",
            link=f"/my-tickets/{ticket.id}",
            source_type="support",
            source_id=ticket.id,
        )
    
    return {"message": "Ticket updated"}


@router.post("/admin/{ticket_id}/respond/", auth=IsAdmin())
def admin_respond_to_ticket(request, ticket_id: UUID, data: TicketResponseIn):
    ticket = get_object_or_404(SupportTicket, id=ticket_id)
    
    response = TicketResponse.objects.create(
        ticket=ticket,
        responder=request.auth,
        message=data.message,
        is_internal=data.is_internal
    )
    
    # Send notification to user for non-internal responses
    if not data.is_internal:
        responder_name = request.auth.full_name if hasattr(request.auth, 'full_name') else "Support Team"
        
        # Also update ticket status to in_progress if it was open
        if ticket.status == TicketStatus.OPEN.value:
            ticket.status = TicketStatus.IN_PROGRESS.value
            ticket.save(update_fields=['status'])
        
        NotificationService.create_and_push(
            user=ticket.submitted_by,
            title=f"New Response on Ticket #{str(ticket.id)[:8]}",
            message=f"{responder_name} responded to your ticket: {data.message[:150]}",
            notification_type="support",
            link=f"/my-tickets/{ticket.id}",
            source_type="support",
            source_id=ticket.id,
        )
    
    return {"message": "Response added", "response_id": str(response.id)}


# ─────────────────────────────────────────────────────────────────
# TICKET STATISTICS (Admin only)
# ─────────────────────────────────────────────────────────────────

@router.get("/admin/stats/", auth=IsAdmin())
def admin_ticket_stats(request):
    """Get ticket statistics for admin dashboard"""
    total = SupportTicket.objects.count()
    open_tickets = SupportTicket.objects.filter(status=TicketStatus.OPEN.value).count()
    in_progress = SupportTicket.objects.filter(status=TicketStatus.IN_PROGRESS.value).count()
    resolved = SupportTicket.objects.filter(status=TicketStatus.RESOLVED.value).count()
    closed = SupportTicket.objects.filter(status=TicketStatus.CLOSED.value).count()
    
    return {
        "total": total,
        "open": open_tickets,
        "in_progress": in_progress,
        "resolved": resolved,
        "closed": closed,
    }


# ─────────────────────────────────────────────────────────────────
# BULK OPERATIONS (Admin only)
# ─────────────────────────────────────────────────────────────────

@router.post("/admin/bulk/status/", auth=IsAdmin())
def admin_bulk_update_status(request, ticket_ids: List[str], status: str):
    """Bulk update status for multiple tickets"""
    if status not in [s.value for s in TicketStatus]:
        return {"error": "Invalid status"}, 400
    
    tickets = SupportTicket.objects.filter(id__in=ticket_ids)
    updated_count = tickets.update(status=status)
    
    # Send notifications for each updated ticket
    for ticket in tickets:
        if ticket.submitted_by:
            NotificationService.create_and_push(
                user=ticket.submitted_by,
                title=f"Support Ticket #{str(ticket.id)[:8]} Bulk Update",
                message=f"Your ticket has been updated to {status.replace('_', ' ').title()} as part of a bulk operation.",
                notification_type="support",
                link=f"/my-tickets/{ticket.id}",
                source_type="support",
                source_id=ticket.id,
            )
    
    return {"message": f"Updated {updated_count} tickets", "updated_count": updated_count}