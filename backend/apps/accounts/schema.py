# backend/apps/accounts/schema.py
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
    image_data: Optional[str] = None   # base64 for biometric enrollment during signup

    @field_validator('phone_number')
    @classmethod
    def validate_phone(cls, v):
        # Accept +254..., 07..., 01... – we'll normalise later
        if not re.match(r'^(\+?254|0)[1-9]\d{8}$', v):
            raise ValueError('Invalid phone number format')
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

class ProfileUpdateIn(Schema):
    full_name: Optional[str] = None
    email: Optional[str] = None
    class_name: Optional[str] = None

class BiometricEnrollIn(Schema):
    image_data: str

class BiometricLoginIn(Schema):
    phone_number: str
    image_data: str

class ChangePasswordIn(Schema):
    old_password: str
    new_password: str

class TOTPVerifyIn(Schema):
    temp_token: Optional[str] = None   # for login flow
    code: str

class TOTPDisableIn(Schema):
    code: str

class TwoFactorStatusOut(Schema):
    two_factor_enabled: bool

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
    two_factor_enabled: bool

    @field_validator('admission_number', mode='before')
    @classmethod
    def mask_admission(cls, v):
        if v and len(v) > 6:
            return v[:3] + '****' + v[-3:]
        return v

# ✅ NEW: Token response schema for refresh endpoint
class TokenOut(Schema):
    access: str
    refresh: str