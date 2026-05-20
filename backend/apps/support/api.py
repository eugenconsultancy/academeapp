from typing import List
from django.shortcuts import get_object_or_404
from ninja import Router
from common.jwt_auth import JWTAuth
from .models import SupportTicket, TicketResponse
from .schema import TicketIn, TicketResponseIn

router = Router()

@router.get("/", auth=JWTAuth())
def list_tickets(request):
    tickets = SupportTicket.objects.filter(submitted_by=request.auth)
    return [{
        "id": str(t.id),
        "title": t.title,
        "description": t.description,
        "category": t.category,
        "status": t.status,
        "created_at": str(t.created_at)
    } for t in tickets]

@router.post("/", auth=JWTAuth())
def create_ticket(request, data: TicketIn):
    ticket = SupportTicket.objects.create(
        title=data.title,
        description=data.description,
        category=data.category,
        submitted_by=request.auth
    )
    return {"id": str(ticket.id), "message": "Ticket created successfully"}

@router.get("/{ticket_id}/", auth=JWTAuth())
def get_ticket(request, ticket_id: str):
    ticket = get_object_or_404(SupportTicket, id=ticket_id, submitted_by=request.auth)
    return {
        "id": str(ticket.id),
        "title": ticket.title,
        "description": ticket.description,
        "category": ticket.category,
        "status": ticket.status,
        "created_at": str(ticket.created_at)
    }

@router.post("/{ticket_id}/respond/", auth=JWTAuth())
def respond_to_ticket(request, ticket_id: str, data: TicketResponseIn):
    ticket = get_object_or_404(SupportTicket, id=ticket_id)
    TicketResponse.objects.create(
        ticket=ticket,
        responder=request.auth,
        message=data.message
    )
    return {"message": "Response added"}
