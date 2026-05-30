from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from django.conf import settings
from django.db import transaction
import hashlib

from .models import Claim, PaymentTransaction, MpesaTransactionLog, FoundItem
from .payment import MpesaClient
from common.constants import ClaimStatus

class EscrowService:
    @staticmethod
    def initiate_payment(claim):
        if not claim.item.is_fee_required:
            return None, "Payment not required"
        if claim.payment_received:
            return None, "Already paid"
        phone = claim.claimant.phone_number
        mpesa = MpesaClient()
        amount = Decimal('100.00')  # fixed fee – could be moved to settings
        response = mpesa.stk_push(
            phone_number=phone,
            amount=100,
            account_reference=f"CLAIM_{claim.id[:8]}",
            transaction_desc="Item Recovery Fee"
        )
        invoice_id = response.get('invoice') if isinstance(response, dict) else getattr(response, 'invoice', {}).get('invoice_id')
        MpesaTransactionLog.objects.create(
            request_type='STK_PUSH',
            request_data={'phone': phone, 'amount': 100},
            response_data=response,
            status_code=200 if response.get('ResponseCode') == '0' else 400
        )
        PaymentTransaction.objects.create(
            claim=claim,
            transaction_type='STK_PUSH',
            amount=amount,
            phone_number=phone,
            status='PENDING',
            response_data=response,
            invoice_id=invoice_id  # store for webhook matching
        )
        return response, None

    @staticmethod
    def disburse_funds(claim):
        # Correct relation: claim.transactions (not claim.item.payment_transactions)
        if claim.transactions.filter(transaction_type='B2C_DISBURSEMENT', status='SUCCESS').exists():
            return None, "Already disbursed"
        locator_phone = claim.item.locator_phone or (claim.item.locator.phone_number if claim.item.locator else None)
        if not locator_phone:
            return None, "Locator phone missing"
        mpesa = MpesaClient()
        total = Decimal('100.00')
        # Use renamed setting: FINDER_PAYOUT_PERCENTAGE (default 50)
        finder_percentage = getattr(settings, 'FINDER_PAYOUT_PERCENTAGE', 50)
        locator_share = total * Decimal(str(finder_percentage / 100))
        response = mpesa.b2c_disbursement(
            phone_number=locator_phone,
            amount=locator_share,
            occasion=f"Item Recovery - {claim.item.title[:15]}"
        )
        is_ok = response.get('status') == 'SUCCESS'
        MpesaTransactionLog.objects.create(
            request_type='B2C_DISBURSEMENT_LOCATOR',
            request_data={'phone': locator_phone, 'amount': locator_share},
            response_data=response,
            status_code=200 if is_ok else 400
        )
        PaymentTransaction.objects.create(
            claim=claim,
            transaction_type='B2C_DISBURSEMENT',
            amount=locator_share,
            phone_number=locator_phone,
            status='SUCCESS' if is_ok else 'FAILED',
            response_data=response
        )
        return response

    @staticmethod
    def auto_confirm_claims():
        threshold = timezone.now() - timedelta(days=getattr(settings, 'AUTO_CONFIRM_CLAIM_DAYS', 7))
        claims = Claim.objects.filter(status=ClaimStatus.PAYMENT_RECEIVED.value, confirmed_at__isnull=True, created_at__lte=threshold)
        for claim in claims:
            claim.confirmed_at = timezone.now()
            claim.auto_confirmed = True
            claim.status = ClaimStatus.COMPLETED.value
            claim.save()
            EscrowService.disburse_funds(claim)


class ClaimService:
    MAX_SECURITY_ATTEMPTS = 3

    @staticmethod
    def verify_security_answer(claim, answer):
        if claim.failed_security_attempts >= ClaimService.MAX_SECURITY_ATTEMPTS:
            claim.status = ClaimStatus.REJECTED.value
            claim.save()
            return False, "Too many attempts. Claim rejected."
        answer_hash = hashlib.sha256(answer.encode()).hexdigest()
        if answer_hash == claim.item.security_answer:
            claim.failed_security_attempts = 0
            claim.save()
            return True, None
        else:
            claim.failed_security_attempts += 1
            claim.save()
            remaining = ClaimService.MAX_SECURITY_ATTEMPTS - claim.failed_security_attempts
            if remaining <= 0:
                claim.status = ClaimStatus.REJECTED.value
                claim.save()
                return False, "Claim rejected due to too many failed attempts."
            return False, f"Incorrect answer. {remaining} attempts left."

    @staticmethod
    def get_claim_status(claim):
        """Return the current step for the claim."""
        if claim.status == ClaimStatus.PENDING.value:
            next_step = 'security' if claim.item.security_question else 'evidence'
        elif claim.status == ClaimStatus.SECURITY_VERIFIED.value:
            next_step = 'evidence'
        elif claim.status == ClaimStatus.EVIDENCE_SUBMITTED.value:
            next_step = 'payment' if claim.item.is_fee_required else 'confirm'
        elif claim.status == ClaimStatus.PAYMENT_PENDING.value:
            next_step = 'payment'
        elif claim.status == ClaimStatus.PAYMENT_RECEIVED.value:
            next_step = 'confirm'
        elif claim.status == ClaimStatus.COMPLETED.value:
            next_step = 'done'
        else:
            next_step = 'claim'
        return {
            "claim_id": str(claim.id),
            "status": claim.status,
            "next_step": next_step,
            "requires_security": bool(claim.item.security_question and claim.status == ClaimStatus.PENDING.value),
            "requires_payment": claim.item.is_fee_required and not claim.payment_received,
            "security_question": claim.item.security_question if claim.status == ClaimStatus.PENDING.value else None,
        }

    @staticmethod
    def get_claim_detail(claim):
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
            "requires_security": bool(claim.item.security_question and claim.status == ClaimStatus.PENDING.value),
            "requires_payment": claim.item.is_fee_required,
            "created_at": str(claim.created_at),
            "confirmed_at": str(claim.confirmed_at) if claim.confirmed_at else None,
        }