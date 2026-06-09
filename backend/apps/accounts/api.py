from typing import List
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.utils import timezone
from ninja import Router, Query, File, Schema
from ninja.files import UploadedFile

from common.auth import PhoneOTPAuth
from common.jwt_auth import JWTAuth, create_token_pair
from .models import User, Badge, DataExport, UserSession, StudentRole
from .schema import (
    SignupIn, OTPRequestIn, OTPVerifyIn, ProfileUpdateIn
)
from .schema import ResetPasswordIn
from .permissions import IsAdmin
from .schema import BiometricEnrollIn, BiometricLoginIn
from .services import AccountService, TwoFactorService

# Import AuditLog from governance app (safe fallback)
try:
    from apps.governance.models import AuditLog
    AUDIT_LOG_AVAILABLE = True
except ImportError:
    AUDIT_LOG_AVAILABLE = False
    class AuditLog:
        objects = None

# Import NotificationService
try:
    from apps.notifications.services import NotificationService
    NOTIFICATION_AVAILABLE = True
except ImportError:
    NOTIFICATION_AVAILABLE = False
    class NotificationService:
        @staticmethod
        def create_and_push(*args, **kwargs):
            pass

router = Router()

# Inline schema for role update
class RoleUpdateIn(Schema):
    role: str

# Inline schema for 2FA verify-login
class TwoFactorVerifyLoginIn(Schema):
    temp_token: str
    code: str

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
        return {"error": "Your OTP is Invalid"}

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
            "email": user.email or "",
            "class_name": user.class_name,
            "institution": user.institution,
            "profile_pic": user.profile_pic or "",
            "role": user.role,
            "badges": [],
            "is_online": True,
            "login_count": user.login_count,
            "two_factor_enabled": user.two_factor_enabled,
            "biometric_enabled": user.biometric_enabled,
            "last_login": user.last_login.isoformat() if user.last_login else None,
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
def reset_password(request, data: ResetPasswordIn):
    """Step 2: Verify OTP and set new password with strict validation"""

    if not PhoneOTPAuth.verify_otp(data.phone_number, data.otp):
        return {"error": "Invalid OTP"}

    user = get_object_or_404(User, phone_number=data.phone_number)
    user.set_password(data.new_password)
    user.save()

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
        "is_online": user.is_online,
        "login_count": user.login_count,
        "two_factor_enabled": user.two_factor_enabled,
        "biometric_enabled": user.biometric_enabled,
        "last_login": user.last_login.isoformat() if user.last_login else None,
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
    return {
        "message": "Profile updated successfully",
        "full_name": user.full_name,
        "email": user.email,
        "class_name": user.class_name
    }

@router.post("/profile/upload-pic/", auth=JWTAuth())
def upload_profile_pic(request, file: UploadedFile = None):
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


# ============================================
# ADMIN: LIST ALL ROLES
# ============================================
@router.get("/admin/roles/", auth=JWTAuth())
def list_all_roles(request):
    """Admin only: return all active and past roles across all users."""
    if request.auth.role != 'admin':
        return {"error": "Permission denied"}, 403

    active_roles = StudentRole.objects.filter(is_active=True).select_related('user', 'assigned_by')
    past_roles = StudentRole.objects.filter(is_active=False).select_related('user', 'assigned_by')[:50]

    return {
        "active_roles": [{
            "id": str(r.id),
            "user_name": r.user.full_name,
            "user_id": str(r.user.id),
            "role": r.role,
            "role_display": r.get_role_display(),
            "scope_type": r.scope_type,
            "scope_name": r.scope_name,
            "scope_id": str(r.scope_id),
            "start_date": str(r.start_date),
            "end_date": str(r.end_date),
            "days_remaining": r.days_remaining,
            "is_expired": r.is_expired,
            "assigned_by_name": r.assigned_by.full_name if r.assigned_by else None,
        } for r in active_roles],
        "past_roles": [{
            "id": str(r.id),
            "user_name": r.user.full_name,
            "user_id": str(r.user.id),
            "role": r.role,
            "role_display": r.get_role_display(),
            "scope_name": r.scope_name,
            "end_date": str(r.end_date),
            "revocation_reason": r.revocation_reason,
        } for r in past_roles],
    }


@router.post("/roles/assign/", auth=JWTAuth())
def assign_role(request, data: dict):
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

    if AUDIT_LOG_AVAILABLE:
        AuditLog.objects.create(
            action='ROLE_ASSIGNED',
            performed_by=user,
            target_user=target_user,
            target_type='StudentRole',
            target_id=str(student_role.id),
            after_state={'role': role_type, 'scope_name': scope_name, 'start_date': str(start_date), 'end_date': str(end_date)},
            ip_address=request.META.get('REMOTE_ADDR'),
        )

    if NOTIFICATION_AVAILABLE:
        NotificationService.create_and_push(
            user=target_user,
            title="New Leadership Role",
            message=f"You have been assigned as {student_role.get_role_display()} for {scope_name}.",
            notification_type="governance",
            link="/governance"
        )

    return {"id": str(student_role.id), "message": f"{target_user.full_name} assigned as {student_role.get_role_display()}"}


@router.post("/roles/{role_id}/revoke/", auth=JWTAuth())
def revoke_role(request, role_id: str, data: dict = None):
    user = request.auth

    if user.role not in ['admin', 'faculty_officer']:
        return {"error": "You do not have permission to revoke roles"}

    role = get_object_or_404(StudentRole, id=role_id)
    reason = (data or {}).get('reason', 'Manually revoked by administrator')
    role.expire(reason=reason, revoked_by=user)

    if AUDIT_LOG_AVAILABLE:
        AuditLog.objects.create(
            action='ROLE_REVOKED',
            performed_by=user,
            target_user=role.user,
            target_type='StudentRole',
            target_id=str(role.id),
            before_state={'is_active': True},
            after_state={'is_active': False, 'revocation_reason': reason},
            ip_address=request.META.get('REMOTE_ADDR'),
        )

    if NOTIFICATION_AVAILABLE:
        NotificationService.create_and_push(
            user=role.user,
            title="Role Revoked",
            message=f"Your role as {role.get_role_display()} for {role.scope_name} has been revoked.",
            notification_type="governance",
            link="/governance"
        )

    return {"message": f"Role revoked: {role.get_role_display()} for {role.user.full_name}"}


# ============================================
# SESSION MANAGEMENT
# ============================================

@router.get("/sessions/", auth=JWTAuth())
def list_sessions(request):
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
    session = get_object_or_404(UserSession, id=session_id, user=request.auth)

    if session.is_active:
        session.is_active = False
        session.revoked_at = timezone.now()
        session.revoked_by = request.auth
        session.save()
        return {"message": "Session revoked successfully"}

    return {"error": "Session already revoked"}


@router.post("/sessions/revoke-all/", auth=JWTAuth())
def revoke_all_sessions(request):
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
    import json
    import jwt
    from django.conf import settings
    from common.jwt_auth import decode_token

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, AttributeError):
        return {"error": "Invalid JSON body"}, 400

    refresh_token_value = body.get('refresh')
    if not refresh_token_value:
        return {"error": "Refresh token required"}, 400

    try:
        secret = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
        payload = jwt.decode(refresh_token_value, secret, algorithms=["HS256"])

        if payload.get("type") != "refresh":
            return {"error": "Invalid token type"}, 403

        user_id = payload.get("user_id")
        if not user_id:
            return {"error": "Invalid token"}, 403

        user = User.objects.get(id=user_id, is_active=True)

        new_tokens = create_token_pair(user)
        return new_tokens

    except jwt.ExpiredSignatureError:
        return {"error": "Refresh token expired"}, 401
    except jwt.InvalidTokenError:
        return {"error": "Invalid refresh token"}, 403
    except User.DoesNotExist:
        return {"error": "User not found or inactive"}, 403
    except Exception as e:
        return {"error": f"Token refresh failed: {str(e)}"}, 500


@router.post("/biometric/enroll/", auth=JWTAuth())
def enroll_biometric(request, data: BiometricEnrollIn):
    user = request.auth

    success, message = AccountService.enroll_face_cloud(user, data.image_data)

    if not success:
        return {"error": message}

    return {"message": "Biometric data enrolled successfully."}

@router.post("/biometric/login/", auth=None)
def biometric_login(request, data: BiometricLoginIn):
    user = User.objects.filter(phone_number=data.phone_number).first()

    if not user:
        return {"error": "User not found."}

    is_match, message = AccountService.verify_face_cloud(user, data.image_data)

    if not is_match:
        return {"error": message}

    tokens = create_token_pair(user)
    AccountService.increment_login_count(user)

    return {
        "access": tokens["access"],
        "refresh": tokens["refresh"],
        "user": {
            "id": str(user.id),
            "full_name": user.full_name,
            "role": user.role,
            "two_factor_enabled": user.two_factor_enabled,
            "biometric_enabled": user.biometric_enabled,
        }
    }

# ============================================
# TWO-FACTOR AUTHENTICATION (FULL TOTP)
# ============================================

@router.get("/2fa/setup/", auth=JWTAuth())
def two_factor_setup(request):
    """Generate QR code and secret for TOTP setup."""
    user = request.auth
    secret, qr_code = TwoFactorService.generate_qr_code(user)
    from django.core.cache import cache
    cache.set(f"2fa_secret_{user.id}", secret, timeout=300)
    return {"qr_code": qr_code, "secret": secret}

@router.post("/2fa/verify-setup/", auth=JWTAuth())
def verify_two_factor_setup(request, data: Schema):
    from ninja import Schema as NinjaSchema
    class VerifySetupIn(NinjaSchema):
        code: str
    verify_data = VerifySetupIn(**data.dict())
    user = request.auth
    from django.core.cache import cache
    secret = cache.get(f"2fa_secret_{user.id}")
    if not secret:
        return {"error": "Setup session expired, please restart"}
    if not TwoFactorService.verify_totp_code(secret, verify_data.code):
        return {"error": "Invalid verification code"}
    user.two_factor_enabled = True
    user.save(update_fields=['two_factor_enabled'])
    backup_codes = TwoFactorService.generate_backup_codes(user)
    cache.delete(f"2fa_secret_{user.id}")
    return {"message": "2FA enabled", "backup_codes": backup_codes}

@router.post("/2fa/disable/", auth=JWTAuth())
def disable_two_factor(request, data: Schema):
    from ninja import Schema as NinjaSchema
    class DisableIn(NinjaSchema):
        code: str
    disable_data = DisableIn(**data.dict())
    user = request.auth
    if not TwoFactorService.verify_totp(user, disable_data.code):
        return {"error": "Invalid 2FA code"}
    user.two_factor_enabled = False
    user.save(update_fields=['two_factor_enabled'])
    from django.core.cache import cache
    cache.delete(f"backup_codes_{user.id}")
    return {"message": "2FA disabled"}

@router.get("/2fa/status/", auth=JWTAuth())
def two_factor_status(request):
    user = request.auth
    return {"two_factor_enabled": user.two_factor_enabled}

@router.post("/2fa/verify-login/", auth=None)
def verify_2fa_login(request, data: TwoFactorVerifyLoginIn):
    temp_token = data.temp_token
    code = data.code
    user = AccountService.get_user_from_temp_token(temp_token)
    if not user:
        return {"error": "Invalid or expired 2FA session"}
    if not TwoFactorService.verify_totp(user, code):
        return {"error": "Invalid 2FA code"}
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
            "email": user.email or "",
            "class_name": user.class_name,
            "institution": user.institution,
            "profile_pic": user.profile_pic or "",
            "role": user.role,
            "badges": [b.badge_type for b in user.badges.all()],
            "is_online": user.is_online,
            "login_count": user.login_count,
            "two_factor_enabled": user.two_factor_enabled,
            "biometric_enabled": user.biometric_enabled,
            "last_login": user.last_login.isoformat() if user.last_login else None,
        }
    }


# ============================================
# ADMIN: LIST ALL USERS
# ============================================
@router.get("/users/", auth=JWTAuth())
def list_all_users(request):
    if request.auth.role != 'admin':
        return []

    users = User.objects.prefetch_related('student_roles').all()
    result = []
    for u in users:
        active_roles = u.student_roles.filter(is_active=True)
        past_roles_count = u.student_roles.filter(is_active=False).count()

        result.append({
            'id': str(u.id),
            'full_name': u.full_name,
            'email': u.email or '',
            'phone_number': u.phone_number,
            'institution': u.institution,
            'class_name': u.class_name,
            'role': u.role,
            'is_active': u.is_active,
            'active_roles': [{
                'id': str(r.id),
                'role': r.role,
                'scope_type': r.scope_type,
                'scope_name': r.scope_name,
                'scope_id': str(r.scope_id),
            } for r in active_roles],
            'past_roles_count': past_roles_count,
        })
    return result


# ============================================
# ADMIN: UPDATE USER ROLE
# ============================================
@router.put("/users/{user_id}/role/", auth=JWTAuth())
def admin_update_user_role(request, user_id: str, data: RoleUpdateIn):
    admin_user = request.auth
    if admin_user.role != 'admin':
        return {"error": "Permission denied. Admin access required."}
    
    new_role = data.role
    if new_role not in ['student', 'class_rep', 'student_leader', 'faculty_rep', 'faculty_officer', 'admin']:
        return {"error": "Invalid role"}
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return {"error": "User not found"}
    
    if user.is_system_user and new_role != 'admin':
        return {"error": "Cannot change system user role"}
    
    old_role = user.role
    user.role = new_role
    user.save(update_fields=['role'])
    
    if AUDIT_LOG_AVAILABLE:
        AuditLog.objects.create(
            action='USER_ROLE_CHANGED',
            performed_by=admin_user,
            target_user=user,
            target_type='User',
            target_id=str(user.id),
            before_state={'role': old_role},
            after_state={'role': new_role},
            ip_address=request.META.get('REMOTE_ADDR'),
        )
    
    if NOTIFICATION_AVAILABLE and old_role != new_role:
        NotificationService.create_and_push(
            user=user,
            title="Your Role Has Been Updated",
            message=f"Your account role has been changed from {old_role} to {new_role} by an administrator.",
            notification_type="governance",
            link="/profile"
        )
    
    return {"message": f"User role updated from {old_role} to {new_role}"}


# ============================================
# ADMIN: USER DEACTIVATION
# ============================================
@router.post("/users/{user_id}/deactivate/", auth=JWTAuth())
def admin_deactivate_user(request, user_id: str):
    admin_user = request.auth
    if admin_user.role != 'admin':
        return {"error": "Permission denied. Admin access required."}
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return {"error": "User not found"}
    
    if user.is_system_user:
        return {"error": "Cannot deactivate system user"}
    
    if not user.is_active:
        return {"error": "User is already deactivated"}
    
    user.is_active = False
    user.save(update_fields=['is_active'])
    
    UserSession.objects.filter(user=user, is_active=True).update(
        is_active=False,
        revoked_at=timezone.now(),
        revoked_by=admin_user
    )
    
    if AUDIT_LOG_AVAILABLE:
        AuditLog.objects.create(
            action='USER_DEACTIVATED',
            performed_by=admin_user,
            target_user=user,
            target_type='User',
            target_id=str(user.id),
            after_state={'is_active': False},
            ip_address=request.META.get('REMOTE_ADDR'),
        )
    
    if NOTIFICATION_AVAILABLE:
        NotificationService.create_and_push(
            user=user,
            title="Account Deactivated",
            message="Your account has been deactivated by an administrator. Please contact support if you believe this is an error.",
            notification_type="governance",
            link="/contact"
        )
    
    return {"message": f"User {user.full_name} has been deactivated."}