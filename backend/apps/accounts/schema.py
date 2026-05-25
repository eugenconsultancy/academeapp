from ninja import Schema
from typing import Optional, List
from pydantic import field_validator
import re

class SignupIn(Schema):
    phone_number: str
    admission_number: str
    full_name: str
    email: Optional[str] = None
    class_name: str
    institution: str
    
    @field_validator('phone_number')
    @classmethod
    def validate_phone(cls, v):
        if not re.match(r'^\+?254\d{9}$', v):
            raise ValueError('Invalid phone number format. Use +254XXXXXXXXX')
        return v

class OTPRequestIn(Schema):
    phone_number: str

class ResetPasswordIn(Schema):
    phone_number: str
    otp: str
    new_password: str

class OTPVerifyIn(Schema):
    phone_number: str
    otp: str

class ProfileOut(Schema):
    id: str
    phone_number: str
    admission_number: str
    full_name: str
    email: Optional[str]
    class_name: str
    institution: str
    profile_pic: Optional[str]
    role: str
    badges: List[str]
    is_online: bool
    login_count: int
    biometric_enabled: bool 

    @field_validator('admission_number', mode='before')
    @classmethod
    def mask_admission(cls, v):
        if v and len(v) > 6:
            return v[:3] + '****' + v[-3:]
        return v

class ProfileUpdateIn(Schema):
    full_name: Optional[str] = None
    email: Optional[str] = None
    class_name: Optional[str] = None

class StudentSearchOut(Schema):
    id: str
    full_name: str
    profile_pic: Optional[str]
    class_name: str

class RoleAssignIn(Schema):
    user_id: str
    role: str

class DataExportOut(Schema):
    export_id: str
    status: str
    download_url: Optional[str] = None

class DeleteAccountIn(Schema):
    reason: Optional[str] = None

# ============================================
# CLOUD BIOMETRIC SCHEMAS
# ============================================

class BiometricEnrollIn(Schema):
    """Expects image data (e.g., base64 string or file reference) for cloud verification"""
    image_data: str 

class BiometricLoginIn(Schema):
    """Expects phone number and image data for cloud-based verification"""
    phone_number: str
    image_data: str