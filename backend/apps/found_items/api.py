import json
import hashlib
import logging
from typing import List
from uuid import UUID

from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.conf import settings
from django.db import transaction
from ninja import Router, File, Form, Body
from ninja.files import UploadedFile
from ninja.errors import HttpError
from common.jwt_auth import JWTAuth
from common.constants import ClaimStatus, ItemStatus
from .models import FoundItem, Claim, PaymentTransaction, MpesaTransactionLog, Tip
from .services import EscrowService, ClaimService
from .schema import (
    FoundItemCreateIn, FoundItemOut, ClaimOut, ClaimDetailOut,
    ClaimStatusOut, VerifyOwnershipOut, SecurityAnswerIn,
    EvidenceSubmitIn, PaymentInitiateOut, PaymentStatusOut,
    TipIn,
)

router = Router()
logger = logging.getLogger(__name__)

def _hash_security_answer(answer: str) -> str:
    return hashlib.sha256(answer.encode()).hexdigest()

def _item_to_out(item: FoundItem) -> FoundItemOut:
    return {
        "id": str(item.id),
        "title": item.title,
        "category": item.category,
        "description": item.description or "",
        "location_found": item.location_found,
        "found_date": str(item.found_date),
        "original_image_url": item.original_image_url or "",
        "blurred_image_url": item.blurred_image_url or "",
        "status": item.status,
        "is_fee_required": item.is_fee_required,
        "is_claimed": item.is_claimed,
        "security_question": item.security_question or "",
        "admission_number_on_item": item.admission_number_on_item or "",
        "created_at": str(item.created_at),
        "posted_by": {
            "id": str(item.posted_by.id),
            "full_name": item.posted_by.full_name,
        } if item.posted_by else None,
    }

# ══════════════════════════════════════════════════════════════════
# ITEMS
# ══════════════════════════════════════════════════════════════════

@router.get("/items/", auth=JWTAuth(), response=List[FoundItemOut])
def list_items(request, category: str = None, search: str = None):
    items = FoundItem.objects.filter(status=ItemStatus.ACTIVE.value)
    if category:
        items = items.filter(category=category)
    if search:
        from django.db.models import Q
        items = items.filter(Q(title__icontains=search) | Q(description__icontains=search))
    items = items.order_by('-created_at')
    return [_item_to_out(i) for i in items]

@router.post("/items/", auth=JWTAuth(), response={201: FoundItemOut})
def create_item(request, data: FoundItemCreateIn = Form(...)):
    """Create a found item. If no image, set status='active' immediately."""
    security_answer_hashed = _hash_security_answer(data.security_answer) if data.security_answer else ""

    # Determine initial status
    if data.image:
        status = ItemStatus.PROCESSING.value
    else:
        status = ItemStatus.ACTIVE.value

    item = FoundItem.objects.create(
        title=data.title,
        category=data.category,
        description=data.description or "",
        location_found=data.location_found,
        found_date=data.found_date,
        security_question=data.security_question or "",
        security_answer=security_answer_hashed,
        is_fee_required=data.is_fee_required,
        admission_number_on_item=data.admission_number_on_item or "",
        posted_by=request.auth,
        locator_name=data.locator_name or "",
        locator_phone=data.locator_phone or request.auth.phone_number,
        locator=request.auth,
        status=status
    )

    if data.image:
        from django.core.files.storage import default_storage
        import os
        ext = os.path.splitext(data.image.name)[1] if '.' in data.image.name else '.jpg'
        filename = f"items/{item.id}/original{ext}"
        saved_path = default_storage.save(filename, data.image)
        item.original_image_url = default_storage.url(saved_path)
        item.save(update_fields=['original_image_url'])

        from .tasks import blur_sensitive_regions
        blur_sensitive_regions.delay(str(item.id))

    return 201, _item_to_out(item)

@router.get("/items/{item_id}/", auth=JWTAuth(), response=FoundItemOut)
def get_item(request, item_id: UUID):
    item = get_object_or_404(FoundItem, id=item_id)
    return _item_to_out(item)

@router.delete("/items/{item_id}/", auth=JWTAuth())
def delete_item(request, item_id: UUID):
    item = get_object_or_404(FoundItem, id=item_id)
    if request.auth != item.posted_by and request.auth.role != 'admin':
        raise HttpError(403, "Not allowed")
    # Delete associated images from storage
    from common.storage import DualBucketStorage
    storage = DualBucketStorage()
    if item.original_image_url:
        storage.delete_raw_image(item.original_image_url.split('/')[-1])
    if item.blurred_image_url:
        # blurred image is in public bucket, but we can also delete it
        try:
            storage.s3.delete_object(Bucket=storage.public_bucket, Key=item.blurred_image_url.split('/')[-1])
        except:
            pass
    item.delete()
    return {"message": "Deleted"}

@router.get("/my-items/", auth=JWTAuth(), response=List[FoundItemOut])
def my_items(request):
    items = FoundItem.objects.filter(posted_by=request.auth).order_by('-created_at')
    return [_item_to_out(i) for i in items]

# ══════════════════════════════════════════════════════════════════
# OWNERSHIP VERIFICATION (now enforced in claim creation)
# ══════════════════════════════════════════════════════════════════

@router.post("/items/{item_id}/verify-ownership/", auth=JWTAuth(), response=VerifyOwnershipOut)
def verify_ownership(request, item_id: UUID):
    item = get_object_or_404(FoundItem, id=item_id)
    if not item.admission_number_on_item:
        return {"verified": False, "error": "No admission number recorded on this item", "admission_match": False}
    if request.auth.admission_number.lower() != item.admission_number_on_item.lower():
        return {"verified": False, "error": "Admission number does not match.", "admission_match": False}
    return {"verified": True, "admission_match": True, "error": None}

# ══════════════════════════════════════════════════════════════════
# CLAIM LIFECYCLE (with proper enum and ownership enforcement)
# ══════════════════════════════════════════════════════════════════

@router.get("/items/{item_id}/claim-status/", auth=JWTAuth(), response=ClaimStatusOut)
def get_item_claim_status(request, item_id: UUID):
    claim = Claim.objects.filter(item_id=item_id, claimant=request.auth).first()
    if claim:
        return ClaimService.get_claim_status(claim)
    item = get_object_or_404(FoundItem, id=item_id)
    # If item requires admission number match, the next step is ownership_verify
    if item.admission_number_on_item:
        return {
            "claim_id": "",
            "status": "none",
            "next_step": "ownership_verify",
            "requires_security": False,
            "requires_payment": False,
            "security_question": None,
        }
    else:
        return {
            "claim_id": "",
            "status": "none",
            "next_step": "claim",
            "requires_security": False,
            "requires_payment": False,
            "security_question": None,
        }

@router.post("/items/{item_id}/claim/", auth=JWTAuth(), response={201: ClaimDetailOut})
def claim_item(request, item_id: UUID):
    item = get_object_or_404(FoundItem, id=item_id)
    if item.is_claimed:
        raise HttpError(400, "Item already claimed")
    # Enforce ownership verification if admission number on item
    if item.admission_number_on_item:
        if request.auth.admission_number.lower() != item.admission_number_on_item.lower():
            raise HttpError(403, "Ownership not verified. Your admission number does not match.")
    existing = Claim.objects.filter(item=item, claimant=request.auth).first()
    if existing and existing.status not in (ClaimStatus.CANCELLED.value, ClaimStatus.REJECTED.value):
        # Resume existing claim
        return ClaimService.get_claim_detail(existing)
    if existing:
        existing.delete()  # allow re-claim after cancellation/rejection
    claim = Claim.objects.create(item=item, claimant=request.auth, status=ClaimStatus.PENDING.value)
    # If ownership verification already passed, we can immediately move to security or evidence
    # But the frontend will handle next steps via claim-status.
    return ClaimService.get_claim_detail(claim)

@router.get("/claims/{claim_id}/", auth=JWTAuth(), response=ClaimDetailOut)
def get_claim_detail(request, claim_id: UUID):
    claim = get_object_or_404(Claim, id=claim_id, claimant=request.auth)
    return ClaimService.get_claim_detail(claim)

@router.post("/claims/{claim_id}/answer-security/", auth=JWTAuth())
def answer_security(request, claim_id: UUID, data: SecurityAnswerIn):
    claim = get_object_or_404(Claim, id=claim_id, claimant=request.auth)
    if claim.status != ClaimStatus.PENDING.value:
        raise HttpError(400, "Security question already answered or not applicable")
    is_correct, error = ClaimService.verify_security_answer(claim, data.answer)
    if is_correct:
        claim.status = ClaimStatus.SECURITY_VERIFIED.value
        claim.save()
        return {"correct": True, "message": "Correct", "status": claim.status}
    else:
        return {"correct": False, "error": error, "attempts_left": 3 - claim.failed_security_attempts}

@router.post("/claims/{claim_id}/submit-evidence/", auth=JWTAuth())
def submit_evidence(request, claim_id: UUID,
                    file: UploadedFile = File(None),
                    description: str = Form("")):
    claim = get_object_or_404(Claim, id=claim_id, claimant=request.auth)
    if claim.status not in (ClaimStatus.PENDING.value, ClaimStatus.SECURITY_VERIFIED.value):
        raise HttpError(400, f"Cannot submit evidence in current status ({claim.status})")
    if file:
        from django.core.files.storage import default_storage
        import os
        ext = os.path.splitext(file.name)[1] if '.' in file.name else '.jpg'
        filename = f"evidence/claim_{claim.id}{ext}"
        saved_path = default_storage.save(filename, file)
        claim.evidence_url = default_storage.url(saved_path)
    if description:
        claim.admin_notes = (claim.admin_notes or '') + f"[Evidence note] {description}\n"
    claim.status = ClaimStatus.EVIDENCE_SUBMITTED.value
    claim.save()
    return {"message": "Evidence submitted", "status": claim.status}

@router.post("/claims/{claim_id}/initiate-payment/", auth=JWTAuth())
def initiate_payment(request, claim_id: UUID):
    claim = get_object_or_404(Claim, id=claim_id, claimant=request.auth)
    if not claim.item.is_fee_required:
        return {"error": "Payment not required"}
    if claim.payment_received:
        return {"error": "Payment already received"}
    # Strict state check
    if claim.status not in (ClaimStatus.EVIDENCE_SUBMITTED.value, ClaimStatus.SECURITY_VERIFIED.value):
        raise HttpError(400, f"Cannot initiate payment from status {claim.status}")
    response, error = EscrowService.initiate_payment(claim)
    if error:
        return {"error": error}
    claim.status = ClaimStatus.PAYMENT_PENDING.value
    claim.save()
    return {"message": "STK push sent", "invoice_id": response.get("invoice"), "status": claim.status}

@router.get("/claims/{claim_id}/payment-status/", auth=JWTAuth())
def check_payment_status(request, claim_id: UUID):
    claim = get_object_or_404(Claim, id=claim_id, claimant=request.auth)
    if claim.payment_received:
        return {"status": "completed"}
    # Check if any successful transaction exists
    success = claim.transactions.filter(transaction_type='STK_PUSH', status='SUCCESS').exists()
    if success:
        claim.payment_received = True
        claim.status = ClaimStatus.PAYMENT_RECEIVED.value
        claim.save()
        return {"status": "completed"}
    return {"status": "pending"}

@router.post("/claims/{claim_id}/confirm-receipt/", auth=JWTAuth())
def confirm_receipt(request, claim_id: UUID):
    claim = get_object_or_404(Claim, id=claim_id, claimant=request.auth)
    if claim.status != ClaimStatus.PAYMENT_RECEIVED.value:
        raise HttpError(400, "Payment not confirmed yet")
    claim.status = ClaimStatus.COMPLETED.value
    claim.confirmed_at = timezone.now()
    claim.save()
    claim.item.is_claimed = True
    claim.item.status = ItemStatus.CLAIMED.value
    claim.item.save()
    EscrowService.disburse_funds(claim)
    return {"message": "Receipt confirmed", "status": claim.status}

@router.post("/claims/{claim_id}/cancel/", auth=JWTAuth())
def cancel_claim(request, claim_id: UUID):
    claim = get_object_or_404(Claim, id=claim_id, claimant=request.auth)
    if claim.status in (ClaimStatus.COMPLETED.value, ClaimStatus.CANCELLED.value):
        raise HttpError(400, "Cannot cancel this claim")
    claim.status = ClaimStatus.CANCELLED.value
    claim.save()
    return {"message": "Claim cancelled", "status": claim.status}

# ══════════════════════════════════════════════════════════════════
# TIPS & REPORT
# ══════════════════════════════════════════════════════════════════

@router.post("/items/{item_id}/tip/", auth=JWTAuth())
def send_tip(request, item_id: UUID, data: TipIn):
    item = get_object_or_404(FoundItem, id=item_id)
    Tip.objects.create(item=item, sender=request.auth, message=data.message)
    return {"message": "Tip sent"}

@router.post("/items/{item_id}/report/", auth=JWTAuth())
def report_item(request, item_id: UUID, data: dict = Body(...)):
    """Accept JSON payload: {'reason': str}"""
    item = get_object_or_404(FoundItem, id=item_id)
    reason = data.get('reason', '')
    from apps.governance.models import AuditLog
    AuditLog.objects.create(
        action='ITEM_REPORTED',
        performed_by=request.auth,
        target_type='FoundItem',
        target_id=str(item.id),
        metadata={'reason': reason}
    )
    return {"message": "Reported"}

# ══════════════════════════════════════════════════════════════════
# USER CLAIMS LIST
# ══════════════════════════════════════════════════════════════════

@router.get("/claims/", auth=JWTAuth(), response=List[ClaimOut])
def list_user_claims(request):
    claims = Claim.objects.filter(claimant=request.auth).select_related('item').order_by('-created_at')
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

# ══════════════════════════════════════════════════════════════════
# ADMIN ENDPOINTS (added approve/reject)
# ══════════════════════════════════════════════════════════════════

@router.get("/admin/items/", auth=JWTAuth())
def admin_items(request):
    if request.auth.role != 'admin':
        raise HttpError(403, "")
    return [_item_to_out(i) for i in FoundItem.objects.all()]

@router.get("/admin/claims/", auth=JWTAuth())
def admin_claims(request):
    if request.auth.role != 'admin':
        raise HttpError(403, "")
    claims = Claim.objects.select_related('item', 'claimant').all()
    return [{"id": str(c.id), "item_title": c.item.title, "claimant_name": c.claimant.full_name,
             "status": c.status, "payment_received": c.payment_received} for c in claims]

@router.post("/admin/claims/{claim_id}/approve/", auth=JWTAuth())
def admin_approve_claim(request, claim_id: UUID):
    if request.auth.role != 'admin':
        raise HttpError(403, "")
    claim = get_object_or_404(Claim, id=claim_id)
    if claim.status != ClaimStatus.PENDING.value:
        raise HttpError(400, "Claim already processed")
    claim.status = ClaimStatus.APPROVED.value
    claim.save()
    # Optionally trigger payment or next step
    return {"message": "Claim approved"}

@router.post("/admin/claims/{claim_id}/reject/", auth=JWTAuth())
def admin_reject_claim(request, claim_id: UUID):
    if request.auth.role != 'admin':
        raise HttpError(403, "")
    claim = get_object_or_404(Claim, id=claim_id)
    claim.status = ClaimStatus.REJECTED.value
    claim.save()
    return {"message": "Claim rejected"}

# ══════════════════════════════════════════════════════════════════
# PAYMENT WEBHOOK (improved matching)
# ══════════════════════════════════════════════════════════════════

@router.post("/payment-callback/", auth=None)
def intasend_webhook_callback(request):
    try:
        import intasend
        webhook = intasend.Webhook()
        payload = webhook.verify(request.body, request.headers)
    except Exception as e:
        logger.error(f"Webhook verification failed: {e}")
        return {"status": "ignored", "reject": True}

    state = payload.get('state')
    invoice_id = payload.get('invoice_id')
    api_ref = payload.get('api_ref', '')

    MpesaTransactionLog.objects.create(
        request_type='INTASEND_CALLBACK',
        request_data={'invoice_id': invoice_id, 'state': state, 'api_ref': api_ref},
        response_data=payload,
        status_code=200
    )

    if state == 'COMPLETE':
        # Find transaction by invoice_id (stored during payment initiation)
        transaction = PaymentTransaction.objects.filter(invoice_id=invoice_id).first()
        if transaction:
            claim = transaction.claim
            claim.status = ClaimStatus.PAYMENT_RECEIVED.value
            claim.payment_received = True
            claim.save()
            transaction.status = 'SUCCESS'
            transaction.response_data = payload
            transaction.save()
    return {"status": "processed"}