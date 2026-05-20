from typing import List
from django.shortcuts import get_object_or_404
from django.conf import settings
from ninja import Router, Query, File
from ninja.files import UploadedFile

from common.auth import PhoneOTPAuth
from common.jwt_auth import JWTAuth, create_token_pair
from .models import User, Badge, DataExport
from .schema import (
    SignupIn, OTPRequestIn, OTPVerifyIn, ProfileUpdateIn
)
from .permissions import IsAdmin
from .services import AccountService

router = Router()

# ============================================
# AUTHENTICATION
# ============================================

@router.post("/signup/")
def signup(request, data: SignupIn):
    if User.objects.filter(phone_number=data.phone_number).exists():
        return {"error": "The phone number is already registered"}
    
    user = User.objects.create_user(
        phone_number=data.phone_number,
        admission_number=data.admission_number,
        full_name=data.full_name,
        email=data.email or "",
        class_name=data.class_name,
        institution=data.institution
    )
    return {"message": "Registration successful"}

@router.post("/request-otp/")
def request_otp(request, data: OTPRequestIn):
    print(f"DEBUG: request_otp called with phone {data.phone_number}")
    otp, error = PhoneOTPAuth.generate_otp(data.phone_number)
    if error:
        return {"error": error}
    
    print("\n" + "="*50)
    print(f"🔑 OTP for {data.phone_number}: {otp}")
    print("="*50 + "\n")
    
    return {"otp": otp, "message": "OTP generated successfully"}

@router.post("/verify-otp/")
def verify_otp(request, data: OTPVerifyIn):
    if not PhoneOTPAuth.verify_otp(data.phone_number, data.otp):
        return {"error": "Invalid OTP"}
    
    user = get_object_or_404(User, phone_number=data.phone_number)
    tokens = create_token_pair(user)
    AccountService.increment_login_count(user)
    
    return {
        "access": tokens["access"],
        "refresh": tokens["refresh"],
        "user": {
            "id": str(user.id),
            "phone_number": user.phone_number,
            "admission_number": user.admission_number,
            "full_name": user.full_name,
            "email": user.email,
            "class_name": user.class_name,
            "institution": user.institution,
            "profile_pic": user.profile_pic or "",
            "role": user.role,
            "badges": [],
            "is_online": True,
            "login_count": user.login_count,
        }
    }

# ============================================
# PASSWORD RESET (Self-Serve)
# ============================================

@router.post("/forgot-password/")
def forgot_password(request, data: OTPRequestIn):
    """Step 1: Request password reset OTP"""
    user = get_object_or_404(User, phone_number=data.phone_number)
    
    otp, error = PhoneOTPAuth.generate_otp(data.phone_number)
    if error:
        return {"error": error}
    
    print("\n" + "="*50)
    print(f"🔑 Password Reset OTP for {data.phone_number}: {otp}")
    print("="*50 + "\n")
    
    return {"otp": otp, "message": "OTP sent to your phone"}


@router.post("/reset-password/")
def reset_password(request, data: dict):
    """Step 2: Verify OTP and set new password"""
    phone_number = data.get('phone_number')
    otp = data.get('otp')
    new_password = data.get('new_password')
    
    if not all([phone_number, otp, new_password]):
        return {"error": "phone_number, otp, and new_password are required"}
    
    if not PhoneOTPAuth.verify_otp(phone_number, otp):
        return {"error": "Invalid OTP"}
    
    user = get_object_or_404(User, phone_number=phone_number)
    user.set_password(new_password)
    user.save()
    
    # Revoke all existing sessions for security
    from .models import UserSession
    from django.utils import timezone
    UserSession.objects.filter(user=user, is_active=True).update(
        is_active=False,
        revoked_at=timezone.now()
    )
    
    return {"message": "Password reset successful. Please log in with your new password."}


# ============================================
# PROFILE
# ============================================

@router.get("/profile/", auth=JWTAuth())
def get_profile(request):
    user = request.auth
    return {
        "id": str(user.id),
        "phone_number": user.phone_number,
        "admission_number": user.admission_number,
        "full_name": user.full_name,
        "email": user.email or "",
        "class_name": user.class_name,
        "institution": user.institution,
        "profile_pic": user.profile_pic or "",
        "role": user.role,
        "badges": [b.badge_type for b in user.badges.all()],
        "is_online": True,
        "login_count": user.login_count,
    }

@router.put("/profile/", auth=JWTAuth())
def update_profile(request, data: ProfileUpdateIn):
    user = request.auth
    if data.full_name:
        user.full_name = data.full_name
    if data.email is not None:
        user.email = data.email
    if data.class_name:
        user.class_name = data.class_name
    user.save()
    return {"message": "Profile updated successfully", "full_name": user.full_name, "email": user.email, "class_name": user.class_name}

@router.post("/profile/upload-pic/", auth=JWTAuth())
def upload_profile_pic(request, file: UploadedFile = None):
    """Upload profile picture - accepts multipart form data with 'file' field"""
    user = request.auth
    
    if file:
        import os
        from django.core.files.storage import default_storage
        from django.core.files.base import ContentFile
        
        ext = os.path.splitext(file.name)[1] if '.' in file.name else '.jpg'
        filename = f"profile_pics/user_{user.id}{ext}"
        saved_path = default_storage.save(filename, ContentFile(file.read()))
        profile_pic_url = f"/media/{saved_path}"
        user.profile_pic = profile_pic_url
        user.save()
        
        return {
            "message": "Profile picture uploaded successfully",
            "profile_pic": profile_pic_url
        }
    
    import json
    try:
        body = json.loads(request.body.decode('utf-8'))
        image_data = body.get('image')
        if image_data:
            user.profile_pic = image_data
            user.save()
            return {"message": "Profile picture updated", "profile_pic": image_data}
    except:
        pass
    
    return {"error": "No file provided"}

@router.get("/students/search/", auth=JWTAuth())
def search_students(request, q: str = Query(...)):
    students = User.objects.filter(full_name__icontains=q, is_active=True)[:10]
    return [{"id": str(s.id), "full_name": s.full_name, "class_name": s.class_name} for s in students]

@router.post("/export-data/", auth=JWTAuth())
def export_data(request):
    return {"message": "Data export started", "export_id": "pending"}

@router.post("/delete-account/", auth=JWTAuth())
def delete_account(request):
    user = request.auth
    user.is_active = False
    user.save()
    return {"message": "Account deactivated"}


# ============================================
# ROLE MANAGEMENT
# ============================================

@router.get("/roles/", auth=JWTAuth())
def list_my_roles(request):
    """Get the authenticated user's active and past roles"""
    user = request.auth
    
    active_roles = user.student_roles.filter(is_active=True)
    past_roles = user.student_roles.filter(is_active=False)[:10]
    
    return {
        "active_roles": [{
            "id": str(r.id),
            "role": r.role,
            "role_display": r.get_role_display(),
            "scope_type": r.scope_type,
            "scope_name": r.scope_name,
            "start_date": str(r.start_date),
            "end_date": str(r.end_date),
            "days_remaining": r.days_remaining,
            "is_expired": r.is_expired,
            "assigned_by_name": r.assigned_by.full_name if r.assigned_by else None,
        } for r in active_roles],
        "past_roles": [{
            "id": str(r.id),
            "role": r.role,
            "role_display": r.get_role_display(),
            "scope_name": r.scope_name,
            "end_date": str(r.end_date),
            "revocation_reason": r.revocation_reason,
        } for r in past_roles],
    }


@router.post("/roles/assign/", auth=JWTAuth())
def assign_role(request, data: dict):
    """Assign a leadership role to a student."""
    from .models import StudentRole, AuditLog
    
    user = request.auth
    
    if user.role not in ['admin', 'faculty_officer']:
        return {"error": "You do not have permission to assign roles"}
    
    target_user = get_object_or_404(User, id=data.get('user_id'))
    role_type = data.get('role')
    scope_id = data.get('scope_id')
    scope_name = data.get('scope_name', '')
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    
    if not all([role_type, scope_id, start_date, end_date]):
        return {"error": "Missing required fields: role, scope_id, start_date, end_date"}
    
    existing = StudentRole.objects.filter(
        user=target_user, role=role_type, scope_id=scope_id, is_active=True
    ).first()
    
    if existing:
        return {"error": f"User already has an active {role_type} role for this scope"}
    
    student_role = StudentRole.objects.create(
        user=target_user, role=role_type,
        scope_type=data.get('scope_type', 'class'),
        scope_id=scope_id, scope_name=scope_name,
        start_date=start_date, end_date=end_date,
        assigned_by=user, is_active=True,
    )
    
    if target_user.role == 'student':
        target_user.role = role_type
        target_user.save(update_fields=['role'])
    
    AuditLog.objects.create(
        action='ROLE_ASSIGNED', performed_by=user, target_user=target_user,
        target_type='StudentRole', target_id=str(student_role.id),
        after_state={'role': role_type, 'scope_name': scope_name, 'start_date': str(start_date), 'end_date': str(end_date)},
        ip_address=request.META.get('REMOTE_ADDR'),
    )
    
    return {"id": str(student_role.id), "message": f"{target_user.full_name} assigned as {student_role.get_role_display()}"}


@router.post("/roles/{role_id}/revoke/", auth=JWTAuth())
def revoke_role(request, role_id: str, data: dict = None):
    """Manually revoke a role before its end_date"""
    from .models import StudentRole, AuditLog
    
    user = request.auth
    
    if user.role not in ['admin', 'faculty_officer']:
        return {"error": "You do not have permission to revoke roles"}
    
    role = get_object_or_404(StudentRole, id=role_id)
    reason = (data or {}).get('reason', 'Manually revoked by administrator')
    role.expire(reason=reason, revoked_by=user)
    
    AuditLog.objects.create(
        action='ROLE_REVOKED', performed_by=user, target_user=role.user,
        target_type='StudentRole', target_id=str(role.id),
        before_state={'is_active': True}, after_state={'is_active': False, 'revocation_reason': reason},
        ip_address=request.META.get('REMOTE_ADDR'),
    )
    
    return {"message": f"Role revoked: {role.get_role_display()} for {role.user.full_name}"}


# ============================================
# SESSION MANAGEMENT (ONLY ONCE - NO DUPLICATES)
# ============================================

@router.get("/sessions/", auth=JWTAuth())
def list_sessions(request):
    """List all active sessions for the authenticated user."""
    from .models import UserSession
    from django.utils import timezone
    
    sessions = UserSession.objects.filter(
        user=request.auth,
        is_active=True,
        expires_at__gt=timezone.now()
    ).order_by('-last_used_at')
    
    current_token = request.headers.get('Authorization', '').replace('Bearer ', '')
    
    return [{
        "id": str(s.id),
        "device_info": s.device_info,
        "is_current": s.refresh_token == current_token,
        "last_used_at": str(s.last_used_at),
        "created_at": str(s.created_at),
        "expires_at": str(s.expires_at),
        "ip_address": s.device_info.get('ip', ''),
        "browser": str(s.device_info.get('user_agent', ''))[:100] if s.device_info.get('user_agent') else 'Unknown',
        "os": s.device_info.get('platform', 'Unknown'),
    } for s in sessions]


@router.post("/sessions/{session_id}/revoke/", auth=JWTAuth())
def revoke_session(request, session_id: str):
    """Revoke a specific session."""
    from .models import UserSession
    
    session = get_object_or_404(UserSession, id=session_id, user=request.auth)
    
    if session.is_active:
        from django.utils import timezone
        session.is_active = False
        session.revoked_at = timezone.now()
        session.revoked_by = request.auth
        session.save()
        return {"message": "Session revoked successfully"}
    
    return {"error": "Session already revoked"}


@router.post("/sessions/revoke-all/", auth=JWTAuth())
def revoke_all_sessions(request):
    """Revoke all active sessions except the current one."""
    from .models import UserSession
    from django.utils import timezone
    
    current_token = request.headers.get('Authorization', '').replace('Bearer ', '')
    
    revoked_count = UserSession.objects.filter(
        user=request.auth,
        is_active=True,
    ).exclude(
        refresh_token=current_token
    ).update(
        is_active=False,
        revoked_at=timezone.now(),
        revoked_by=request.auth
    )
    
    return {
        "message": f"Revoked {revoked_count} session(s)",
        "revoked_count": revoked_count
    }


@router.post("/refresh-token/", auth=None)
def refresh_token(request):
    """Refresh the JWT access token using a valid refresh token."""
    refresh_token_value = request.data.get('refresh')
    if not refresh_token_value:
        return {"error": "Refresh token required"}
    
    try:
        tokens = create_token_pair(request.auth)
        return {
            "access": tokens["access"],
            "refresh": tokens["refresh"],
        }
    except Exception as e:
        return {"error": str(e)}