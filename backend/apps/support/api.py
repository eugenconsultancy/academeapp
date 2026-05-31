from typing import List
from django.shortcuts import get_object_or_404
from ninja import Router, Query
from common.jwt_auth import JWTAuth
from common.constants import TicketStatus
from .models import SupportTicket, TicketResponse
from .schema import TicketIn, TicketResponseIn, TicketUpdateIn, TicketOut
from .permissions import IsAdmin

router = Router()

# ─────────────────────────────────────────────────────────────────
# USER ENDPOINTS
# ─────────────────────────────────────────────────────────────────

@router.get("/", auth=JWTAuth(), response=List[TicketOut])
def list_user_tickets(request, status: str = None):
    """List tickets submitted by the authenticated user. Optionally filter by status."""
    tickets = SupportTicket.objects.filter(submitted_by=request.auth)
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
    return {"id": str(ticket.id), "message": "Ticket created successfully"}

@router.get("/{ticket_id}/", auth=JWTAuth(), response=TicketOut)
def get_ticket(request, ticket_id: str):
    ticket = get_object_or_404(SupportTicket, id=ticket_id, submitted_by=request.auth)
    return ticket

# ─────────────────────────────────────────────────────────────────
# ADMIN ENDPOINTS
# ─────────────────────────────────────────────────────────────────

@router.get("/admin/all/", auth=IsAdmin(), response=List[TicketOut])
def admin_list_tickets(
    request,
    status: str = Query(None, description="Filter by status"),
    assigned_to: str = Query(None, description="Filter by assigned user ID")
):
    tickets = SupportTicket.objects.all()
    if status:
        tickets = tickets.filter(status=status)
    if assigned_to:
        tickets = tickets.filter(assigned_to_id=assigned_to)
    return tickets.order_by('-created_at')

@router.get("/admin/{ticket_id}/", auth=IsAdmin(), response=TicketOut)
def admin_get_ticket(request, ticket_id: str):
    ticket = get_object_or_404(SupportTicket, id=ticket_id)
    return ticket

@router.put("/admin/{ticket_id}/", auth=IsAdmin())
def admin_update_ticket(request, ticket_id: str, data: TicketUpdateIn):
    ticket = get_object_or_404(SupportTicket, id=ticket_id)
    if data.status is not None:
        ticket.status = data.status
    if data.assigned_to_id is not None:
        from apps.accounts.models import User
        assigned_to = get_object_or_404(User, id=data.assigned_to_id) if data.assigned_to_id else None
        ticket.assigned_to = assigned_to
    if data.resolution is not None:
        ticket.resolution = data.resolution
    ticket.save()
    return {"message": "Ticket updated"}

@router.post("/admin/{ticket_id}/respond/", auth=IsAdmin())
def admin_respond_to_ticket(request, ticket_id: str, data: TicketResponseIn):
    ticket = get_object_or_404(SupportTicket, id=ticket_id)
    response = TicketResponse.objects.create(
        ticket=ticket,
        responder=request.auth,
        message=data.message,
        is_internal=data.is_internal
    )
    # Optionally send notification to ticket submitter (if not internal)
    # if not data.is_internal:
    #     from apps.notifications.services import NotificationService
    #     NotificationService.send(
    #         user=ticket.submitted_by,
    #         title=f"Support Ticket Update: {ticket.title}",
    #         message=f"New response from {request.auth.full_name}",
    #         notification_type="support",
    #         link=f"/my-tickets/{ticket.id}"
    #     )
    return {"message": "Response added", "response_id": str(response.id)}