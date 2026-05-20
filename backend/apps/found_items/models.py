from django.db import models
from common.models import BaseModel
from common.constants import ItemCategory, ClaimStatus, ItemStatus

class FoundItem(BaseModel):
    title = models.CharField(max_length=255)
    category = models.CharField(
        max_length=20,
        choices=[(cat.value, cat.name) for cat in ItemCategory]
    )
    description = models.TextField(blank=True)
    location_found = models.CharField(max_length=255)
    found_date = models.DateTimeField()
    original_image_url = models.URLField(blank=True)
    blurred_image_url = models.URLField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=[(status.value, status.name) for status in ItemStatus],
        default=ItemStatus.PROCESSING.value
    )
    security_question = models.TextField(blank=True)
    security_answer = models.TextField(blank=True)  # Hashed
    posted_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='posted_items'
    )
    locator = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='located_items'
    )
    locator_name = models.CharField(max_length=255, blank=True)
    locator_phone = models.CharField(max_length=15, blank=True)
    is_fee_required = models.BooleanField(default=False)
    is_claimed = models.BooleanField(default=False)
    admission_number_on_item = models.CharField(max_length=50, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['status', 'category']),
            models.Index(fields=['found_date']),
        ]

class Claim(BaseModel):
    item = models.ForeignKey(FoundItem, on_delete=models.CASCADE, related_name='claims')
    claimant = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='claims'
    )
    status = models.CharField(
        max_length=20,
        choices=[(status.value, status.name) for status in ClaimStatus],
        default=ClaimStatus.PENDING.value
    )
    security_answer = models.TextField(blank=True)
    evidence_url = models.URLField(blank=True)
    admin_notes = models.TextField(blank=True)
    payment_received = models.BooleanField(default=False)
    receipt_generated_at = models.DateTimeField(null=True, blank=True)  # Added for receipt
    confirmed_at = models.DateTimeField(null=True, blank=True)
    dispute_reason = models.TextField(blank=True)
    auto_confirmed = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ['item', 'claimant']  # One claim per item per student

class PaymentTransaction(BaseModel):
    claim = models.ForeignKey(Claim, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=20)  # STK_PUSH, B2C_DISBURSEMENT
    mpesa_receipt = models.CharField(max_length=50, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    phone_number = models.CharField(max_length=15)
    status = models.CharField(max_length=20)  # PENDING, SUCCESS, FAILED
    response_data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

class Tip(BaseModel):
    """Non-claimant tip about item ownership"""
    item = models.ForeignKey(FoundItem, on_delete=models.CASCADE, related_name='tips')
    sender = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='sent_tips'
    )
    message = models.TextField()
    is_read = models.BooleanField(default=False)

class MpesaTransactionLog(BaseModel):
    """Audit log for all M-Pesa transactions"""
    request_type = models.CharField(max_length=50)
    request_data = models.JSONField()
    response_data = models.JSONField()
    status_code = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['created_at']),
        ]