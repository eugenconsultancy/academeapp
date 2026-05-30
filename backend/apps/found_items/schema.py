from ninja import Schema, File
from ninja.files import UploadedFile
from datetime import datetime
from typing import Optional, List
from pydantic import validator
from common.constants import ItemCategory, ClaimStatus, ItemStatus

class FoundItemCreateIn(Schema):
    title: str
    category: str
    description: Optional[str] = None
    location_found: str
    found_date: datetime
    security_question: Optional[str] = None
    security_answer: Optional[str] = None
    is_fee_required: bool = False
    locator_phone: Optional[str] = None
    locator_name: Optional[str] = None
    admission_number_on_item: Optional[str] = None
    image: Optional[UploadedFile] = File(None)  # optional

class FoundItemOut(Schema):
    id: str
    title: str
    category: str
    description: Optional[str] = None
    location_found: str
    found_date: str
    original_image_url: Optional[str] = None
    blurred_image_url: Optional[str] = None
    status: str
    is_fee_required: bool
    is_claimed: bool
    security_question: Optional[str] = None
    admission_number_on_item: Optional[str] = None
    created_at: str
    posted_by: Optional[dict] = None

class TipIn(Schema):
    message: str

class ClaimOut(Schema):
    id: str
    item_id: str
    item_title: str
    item_category: str
    status: str
    payment_received: bool
    created_at: str
    confirmed_at: Optional[str] = None

class ClaimDetailOut(Schema):
    id: str
    item_id: str
    item_title: str
    item_category: str
    item_location: str
    item_description: Optional[str] = None
    item_is_fee_required: bool
    item_blurred_image_url: Optional[str] = None
    status: str
    payment_received: bool
    security_question: Optional[str] = None
    requires_security: bool
    requires_payment: bool
    created_at: str
    confirmed_at: Optional[str] = None

class ClaimStatusOut(Schema):
    claim_id: str
    status: str
    next_step: str
    requires_security: bool
    requires_payment: bool
    security_question: Optional[str] = None

class VerifyOwnershipOut(Schema):
    verified: bool
    error: Optional[str] = None
    admission_match: bool = False

class SecurityAnswerIn(Schema):
    answer: str

class EvidenceSubmitIn(Schema):
    description: Optional[str] = None

class PaymentInitiateOut(Schema):
    message: str
    invoice_id: Optional[str] = None
    status: str

class PaymentStatusOut(Schema):
    status: str

class ConfirmPaymentOut(Schema):
    status: str