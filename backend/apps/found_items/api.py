from typing import List
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Router
from common.jwt_auth import JWTAuth
from .models import FoundItem, Claim, Tip
from .schema import FoundItemIn

router = Router()

# ============================================
# ITEMS ENDPOINTS
# ============================================

@router.get("/items/", auth=JWTAuth())
def list_items(request, category: str = None, search: str = None):
    """List all active found items"""
    items = FoundItem.objects.filter(status='active')
    
    if category:
        items = items.filter(category=category)
    if search:
        from django.db.models import Q
        items = items.filter(Q(title__icontains=search) | Q(description__icontains=search))
    
    items = items.order_by('-created_at')
    
    return [{
        "id": str(item.id),
        "title": item.title,
        "category": item.category,
        "description": item.description or "",
        "location_found": item.location_found,
        "found_date": str(item.found_date) if item.found_date else "",
        "status": item.status,
        "is_fee_required": item.is_fee_required,
        "is_claimed": item.is_claimed,
        "blurred_image_url": item.blurred_image_url or "",
        "created_at": str(item.created_at),
        "posted_by": {
            "id": str(item.posted_by.id),
            "full_name": item.posted_by.full_name,
        } if item.posted_by else None,
    } for item in items]

@router.post("/items/", auth=JWTAuth())
def create_item(request, data: FoundItemIn):
    """Post a new found item"""
    import hashlib
    
    security_answer = ""
    if data.security_answer:
        security_answer = hashlib.sha256(data.security_answer.encode()).hexdigest()
    
    item = FoundItem.objects.create(
        title=data.title,
        category=data.category,
        description=data.description or "",
        location_found=data.location_found,
        found_date=data.found_date,
        security_question=data.security_question or "",
        security_answer=security_answer,
        is_fee_required=data.is_fee_required,
        admission_number_on_item=getattr(data, 'admission_number_on_item', ''),
        posted_by=request.auth,
        status='active'
    )
    
    return {"id": str(item.id), "message": "Item posted successfully"}

@router.get("/items/{item_id}/", auth=JWTAuth())
def get_item(request, item_id: str):
    """Get single item details"""
    item = get_object_or_404(FoundItem, id=item_id)
    return {
        "id": str(item.id),
        "title": item.title,
        "category": item.category,
        "description": item.description or "",
        "location_found": item.location_found,
        "found_date": str(item.found_date) if item.found_date else "",
        "blurred_image_url": item.blurred_image_url or "",
        "status": item.status,
        "is_fee_required": item.is_fee_required,
        "is_claimed": item.is_claimed,
        "security_question": item.security_question or "",
        "posted_by": {
            "id": str(item.posted_by.id),
            "full_name": item.posted_by.full_name,
        } if item.posted_by else None,
    }

# ============================================
# HARD GATE: Verify Ownership by Admission Number
# ============================================

@router.post("/items/{item_id}/verify-ownership/", auth=JWTAuth())
def verify_ownership(request, item_id: str):
    """HARD GATE: Verify admission number match"""
    item = get_object_or_404(FoundItem, id=item_id)
    
    if not item.admission_number_on_item:
        return {"verified": False, "error": "This item has no admission number recorded"}
    
    if request.auth.admission_number.lower() != item.admission_number_on_item.lower():
        return {"verified": False, "error": "Admission number does not match."}
    
    claim, created = Claim.objects.get_or_create(
        item=item,
        claimant=request.auth,
        defaults={'status': 'verified'}
    )
    
    if not created and claim.status == 'pending':
        claim.status = 'verified'
        claim.save()
    
    return {
        "verified": True,
        "message": "Ownership verified. Proceed with claim.",
        "claim_id": str(claim.id),
        "requires_security": bool(item.security_question),
        "security_question": item.security_question or "",
        "requires_payment": item.is_fee_required,
    }

# ============================================
# REPORT ITEM
# ============================================

@router.post("/items/{item_id}/report/", auth=JWTAuth())
def report_item(request, item_id: str, reason: str = "", data: dict = None):
    """Report an inappropriate or fake found item."""
    item = get_object_or_404(FoundItem, id=item_id)
    
    if data and data.get("reason"):
        reason = data.get("reason")
    
    if not reason:
        return {"error": "Reason is required"}
    
    # Log the report using AuditLog
    from apps.governance.models import AuditLog
    AuditLog.objects.create(
        action='ITEM_REPORTED',
        performed_by=request.auth,
        target_type='FoundItem',
        target_id=str(item.id),
        metadata={
            'reason': reason,
            'item_title': item.title,
        }
    )
    
    return {"message": "Report submitted successfully. Admin will review."}

# ============================================
# CLAIM ENDPOINTS
# ============================================

@router.post("/items/{item_id}/claim/", auth=JWTAuth())
def claim_item(request, item_id: str):
    """Claim a found item"""
    item = get_object_or_404(FoundItem, id=item_id)
    
    if item.is_claimed:
        return {"error": "Item already claimed"}
    
    claim, created = Claim.objects.get_or_create(
        item=item,
        claimant=request.auth,
        defaults={'status': 'pending'}
    )
    
    if not created:
        return {"error": "You already claimed this item"}
    
    return {
        "id": str(claim.id), 
        "message": "Claim submitted successfully",
        "status": claim.status,
        "requires_security": bool(item.security_question),
        "security_question": item.security_question or ""
    }

# ============================================
# USER CLAIMS LIST
# ============================================

@router.get("/claims/", auth=JWTAuth())
def list_user_claims(request):
    """List all claims made by the authenticated user."""
    claims = Claim.objects.filter(
        claimant=request.auth
    ).select_related('item').order_by('-created_at')
    
    return [{
        "id": str(c.id),
        "item_id": str(c.item.id),
        "item_title": c.item.title,
        "item_category": c.item.category,
        "status": c.status,
        "payment_received": c.payment_received,
        "created_at": str(c.created_at),
        "confirmed_at": str(c.confirmed_at) if c.confirmed_at else None,
    } for c in claims]


@router.get("/claims/{claim_id}/", auth=JWTAuth())
def get_claim_detail(request, claim_id: str):
    """Get detailed claim information."""
    try:
        claim = Claim.objects.select_related('item', 'claimant').get(
            id=claim_id,
            claimant=request.auth
        )
    except Claim.DoesNotExist:
        return {"error": "Claim not found"}
    
    return {
        "id": str(claim.id),
        "item_id": str(claim.item.id),
        "item_title": claim.item.title,
        "item_category": claim.item.category,
        "item_location": claim.item.location_found,
        "item_description": claim.item.description or "",
        "item_is_fee_required": claim.item.is_fee_required,
        "item_blurred_image_url": claim.item.blurred_image_url or "",
        "status": claim.status,
        "payment_received": claim.payment_received,
        "security_question": claim.item.security_question or "",
        "requires_security": bool(claim.item.security_question),
        "requires_payment": claim.item.is_fee_required,
        "created_at": str(claim.created_at),
        "confirmed_at": str(claim.confirmed_at) if claim.confirmed_at else None,
    }

@router.post("/claims/{claim_id}/submit-evidence/", auth=JWTAuth())
def submit_evidence(request, claim_id: str):
    """Submit evidence for a claim"""
    claim = get_object_or_404(Claim, id=claim_id, claimant=request.auth)
    
    # Can submit from pending or verified status
    if claim.status not in ['pending', 'verified']:
        return {"error": f"Cannot submit evidence. Current status: {claim.status}"}
    
    claim.status = 'verified'
    claim.save()
    
    return {
        "message": "Evidence submitted successfully",
        "status": claim.status,
        "requires_payment": claim.item.is_fee_required
    }


@router.post("/claims/{claim_id}/answer-security/", auth=JWTAuth())
def answer_security(request, claim_id: str, answer: str = "", data: dict = None):
    """Answer security question for a claim"""
    import hashlib
    claim = get_object_or_404(Claim, id=claim_id, claimant=request.auth)
    
    if data and data.get("answer"):
        answer = data.get("answer")
    
    if not claim.item.security_answer:
        claim.status = 'verified'
        claim.save()
        return {"correct": True, "message": "No security question set", "status": claim.status}
    
    answer_hash = hashlib.sha256(answer.encode()).hexdigest()
    
    if answer_hash == claim.item.security_answer:
        claim.status = 'verified'
        claim.save()
        return {"correct": True, "message": "Security answer correct", "status": claim.status}
    
    return {"correct": False, "error": "Incorrect answer"}

@router.post("/claims/{claim_id}/initiate-payment/", auth=JWTAuth())
def initiate_payment(request, claim_id: str):
    """Initiate M-Pesa payment for claim (demo mode)"""
    claim = get_object_or_404(Claim, id=claim_id, claimant=request.auth)
    
    if not claim.item.is_fee_required:
        return {"error": "Payment not required for this item"}
    
    claim.status = 'awaiting_payment'
    claim.save()
    
    return {
        "message": "Payment initiated. Check your phone for M-Pesa prompt.",
        "status": claim.status,
        "amount": "KES 100.00"
    }

@router.post("/claims/{claim_id}/confirm-payment/", auth=JWTAuth())
def confirm_payment(request, claim_id: str):
    """Confirm payment received (demo mode)"""
    claim = get_object_or_404(Claim, id=claim_id, claimant=request.auth)
    claim.status = 'payment_received'
    claim.payment_received = True
    claim.save()
    
    return {"message": "Payment confirmed", "status": claim.status}


@router.post("/claims/{claim_id}/confirm-receipt/", auth=JWTAuth())
def confirm_receipt(request, claim_id: str):
    """Confirm receipt of item"""
    claim = get_object_or_404(Claim, id=claim_id, claimant=request.auth)
    claim.status = 'claimed'
    claim.confirmed_at = timezone.now()
    claim.save()
    
    claim.item.is_claimed = True
    claim.item.save()
    
    return {"message": "Receipt confirmed. Thank you!", "status": claim.status}
# ============================================
# TIP ENDPOINTS
# ============================================

@router.post("/items/{item_id}/tip/", auth=JWTAuth())
def send_tip(request, item_id: str, message: str = "", data: dict = None):
    """Send a tip about who owns the item. Accepts message via query param or body."""
    item = get_object_or_404(FoundItem, id=item_id)
    
    # Get message from body if provided
    if data and data.get("message"):
        message = data.get("message")
    
    if not message or not message.strip():
        return {"error": "Message required"}
    
    Tip.objects.create(item=item, sender=request.auth, message=message.strip())
    return {"message": "Tip sent successfully"}

# ============================================
# RECEIPT ENDPOINT
# ============================================

@router.get("/items/{item_id}/receipt/", auth=JWTAuth())
def get_receipt(request, item_id: str):
    """Get receipt for a claim"""
    item = get_object_or_404(FoundItem, id=item_id)
    claim = Claim.objects.filter(item=item, claimant=request.auth).first()
    
    return {
        "receipt_number": f"ACD-{item_id[:8].upper()}",
        "date": str(timezone.now().date()),
        "item_title": item.title,
        "category": item.category,
        "claimant_name": request.auth.full_name,
        "amount": "KES 100.00" if item.is_fee_required else "N/A",
        "status": claim.status if claim else "N/A",
        "claim_id": str(claim.id) if claim else ""
    }

# ============================================
# M-PESA CALLBACK
# ============================================

@router.post("/mpesa/callback/", auth=None)
def mpesa_callback(request):
    """
    M-Pesa payment callback webhook.
    Called by Safaricom when payment is made.
    """
    import json
    from decimal import Decimal
    
    try:
        body = json.loads(request.body)
    except:
        return {"ResultCode": 1, "ResultDesc": "Invalid payload"}
    
    result_code = body.get('Body', {}).get('stkCallback', {}).get('ResultCode')
    
    if result_code == 0:
        callback_metadata = body['Body']['stkCallback'].get('CallbackMetadata', {}).get('Item', [])
        amount = next((item['Value'] for item in callback_metadata if item['Name'] == 'Amount'), 0)
        mpesa_receipt = next((item['Value'] for item in callback_metadata if item['Name'] == 'MpesaReceiptNumber'), '')
        
        # Log transaction (simplified - in production, link to claim)
        print(f"M-Pesa payment received: {mpesa_receipt} - KES {amount}")
    
    return {"ResultCode": 0, "ResultDesc": "Accepted"}

# ============================================
# ADMIN ENDPOINTS
# ============================================

@router.get("/admin/items/", auth=JWTAuth())
def admin_items(request):
    """Admin: View all items"""
    if request.auth.role != 'admin':
        return {"error": "Unauthorized"}
    
    items = FoundItem.objects.all().order_by('-created_at')
    return [{
        "id": str(i.id),
        "title": i.title,
        "category": i.category,
        "status": i.status,
        "is_claimed": i.is_claimed,
        "found_date": str(i.found_date) if i.found_date else "",
        "location_found": i.location_found
    } for i in items]

@router.get("/admin/claims/", auth=JWTAuth())
def admin_claims(request):
    """Admin: View all claims"""
    if request.auth.role != 'admin':
        return {"error": "Unauthorized"}
    
    claims = Claim.objects.all().select_related('item', 'claimant')
    return [{
        "id": str(c.id),
        "item_title": c.item.title,
        "claimant_name": c.claimant.full_name,
        "claimant_phone": c.claimant.phone_number,
        "status": c.status,
        "created_at": str(c.created_at),
        "payment_received": c.payment_received
    } for c in claims]

@router.post("/admin/claims/{claim_id}/approve/", auth=JWTAuth())
def admin_approve_claim(request, claim_id: str):
    """Admin: Approve a claim"""
    if request.auth.role != 'admin':
        return {"error": "Unauthorized"}
    
    claim = get_object_or_404(Claim, id=claim_id)
    claim.status = 'approved'
    claim.save()
    return {"message": "Claim approved", "status": claim.status}

@router.post("/admin/claims/{claim_id}/reject/", auth=JWTAuth())
def admin_reject_claim(request, claim_id: str):
    """Admin: Reject a claim"""
    if request.auth.role != 'admin':
        return {"error": "Unauthorized"}
    
    claim = get_object_or_404(Claim, id=claim_id)
    claim.status = 'rejected'
    claim.save()
    return {"message": "Claim rejected", "status": claim.status}