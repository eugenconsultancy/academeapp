from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from django.conf import settings
from django.db import transaction
import hashlib

from .models import FoundItem, Claim, PaymentTransaction, MpesaTransactionLog
from .payment import MpesaClient

class EscrowService:
    @staticmethod
    def initiate_payment(claim):
        """Initiate M-Pesa STK Push for claim payment through IntaSend"""
        if not claim.item.is_fee_required:
            return None, "Payment not required for this item"
        
        if claim.payment_received:
            return None, "Payment already received"
        
        # Get claimant phone number
        phone = claim.claimant.phone_number
        
        # Initialize M-Pesa client
        mpesa = MpesaClient()
        
        # Initiate STK Push
        response = mpesa.stk_push(
            phone_number=phone,
            amount=100,  # KES 100
            account_reference=f"CLAIM_{claim.id[:8]}",
            transaction_desc="Found Item Recovery Fee"
        )
        
        # Log transaction into database logs using structured response mapping
        MpesaTransactionLog.objects.create(
            request_type='STK_PUSH',
            request_data={'phone': phone, 'amount': 100},
            response_data=response,
            status_code=200 if response.get('ResponseCode') == '0' else 400
        )
        
        # Create payment transaction record
        PaymentTransaction.objects.create(
            claim=claim,
            transaction_type='STK_PUSH',
            amount=Decimal('100.00'),
            phone_number=phone,
            status='SUCCESS' if response.get('ResponseCode') == '0' else 'PENDING',
            response_data=response
        )
        
        return response, None
    
    @staticmethod
    def disburse_funds(claim):
        """
        Split and disburse funds after confirmation.
        50% to locator, 50% to platform.
        """
        if not claim.confirmed_at:
            return None, "Claim not yet confirmed"
        
        if claim.item.payment_transactions.filter(
            transaction_type='B2C_DISBURSEMENT',
            status='SUCCESS'
        ).exists():
            return None, "Funds already disbursed"
        
        mpesa = MpesaClient()
        total_amount = Decimal('100.00')
        locator_share = total_amount * Decimal(str(settings.ESCROW_FEE_PERCENTAGE / 100))
        
        # Get locator phone
        if claim.item.locator:
            locator_phone = claim.item.locator.phone_number
        else:
            locator_phone = claim.item.locator_phone
        
        # Disburse to locator
        if locator_phone:
            locator_response = mpesa.b2c_disbursement(
                phone_number=locator_phone,
                amount=locator_share,
                occasion=f"Item Recovery - {claim.item.title[:15]}"
            )
            
            is_successful = locator_response.get('status') == 'SUCCESS'
            
            MpesaTransactionLog.objects.create(
                request_type='B2C_DISBURSEMENT_LOCATOR',
                request_data={'phone': locator_phone, 'amount': locator_share},
                response_data=locator_response,
                status_code=200 if is_successful else 400
            )
            
            PaymentTransaction.objects.create(
                claim=claim,
                transaction_type='B2C_DISBURSEMENT',
                amount=locator_share,
                phone_number=locator_phone,
                status='SUCCESS' if is_successful else 'FAILED',
                response_data=locator_response
            )
        
        return {"message": "Disbursement completed"}
    
    @staticmethod
    def auto_confirm_claims():
        """
        Auto-confirm claims that have been awaiting confirmation
        for more than ESCROW_AUTO_CONFIRM_DAYS
        """
        threshold_date = timezone.now() - timedelta(
            days=settings.ESCROW_AUTO_CONFIRM_DAYS
        )
        
        claims = Claim.objects.filter(
            status='payment_received',
            confirmed_at__isnull=True,
            created_at__lte=threshold_date
        )
        
        for claim in claims:
            claim.confirmed_at = timezone.now()
            claim.auto_confirmed = True
            claim.save()
            
            # Trigger disbursement
            EscrowService.disburse_funds(claim)

class ClaimService:
    @staticmethod
    def verify_security_answer(claim, answer):
        """Verify security answer for a claim"""
        # Hash the answer for comparison
        answer_hash = hashlib.sha256(answer.encode()).hexdigest()
        return answer_hash == claim.item.security_answer
    
    @staticmethod
    def generate_receipt(claim):
        """Generate receipt for a claim"""
        from io import BytesIO
        from reportlab.pdfgen import canvas
        
        claim.receipt_generated_at = timezone.now()
        claim.save()
        
        # Generate receipt data
        receipt_data = {
            'receipt_number': f"ACD-{claim.id[:8].upper()}",
            'date': claim.receipt_generated_at.isoformat(),
            'item': claim.item.title,
            'category': claim.item.category,
            'claimant': claim.claimant.full_name,
            'amount': 'KES 100.00',
            'status': 'PAID',
            'claim_id': str(claim.id)
        }
        
        # In production, generate PDF and upload to S3
        return receipt_data