from ninja import Schema
from datetime import datetime
from typing import Optional, List
from pydantic import validator
import re

class SignupIn(Schema):
    phone_number: str
    admission_number: str
    full_name: str
    email: Optional[str] = None
    class_name: str
    institution: str
    
    @validator('phone_number')
    def validate_phone(cls, v):
        if not re.match(r'^\+?254\d{9}$', v):
            raise ValueError('Invalid phone number format. Use +254XXXXXXXXX')
        return v

class OTPRequestIn(Schema):
    phone_number: str

class OTPVerifyIn(Schema):
    phone_number: str
    otp: str

class ProfileOut(Schema):
    id: str
    phone_number: str  # This will be masked
    admission_number: str  # This will be masked for other users
    full_name: str
    email: Optional[str]
    class_name: str
    institution: str
    profile_pic: Optional[str]
    role: str
    badges: List[str]
    is_online: bool
    login_count: int
    
# THE VALIDATOR FUCNTION IS DEPRCIATED SO CONSIDER OTHER OPTIONS    
    @validator('admission_number', pre=True)
    def mask_admission(cls, v):
        # Mask admission number for privacy
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