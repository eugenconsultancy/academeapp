C:\Users\GATARA-BJTU\academe\backend\apps\accounts\api.py;;;from typing import List
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
from .schema import ResetPasswordIn
from .permissions import IsAdmin
from .schema import BiometricEnrollIn, BiometricLoginIn
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
def reset_password(request, data: ResetPasswordIn):
    """Step 2: Verify OTP and set new password with strict validation"""
    
    # 1. Verify OTP using the validated data
    if not PhoneOTPAuth.verify_otp(data.phone_number, data.otp):
        return {"error": "Invalid OTP"}
    
    # 2. Get user and set password
    user = get_object_or_404(User, phone_number=data.phone_number)
    user.set_password(data.new_password)
    user.save()
    
    # 3. Revoke all existing sessions for security
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
    import json
    try:
        body = json.loads(request.body)
        refresh_token_value = body.get('refresh')
    except (json.JSONDecodeError, AttributeError):
        refresh_token_value = None
    
    if not refresh_token_value:
        return {"error": "Refresh token required"}
    
    try:
        from rest_framework_simplejwt.tokens import RefreshToken
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        token = RefreshToken(refresh_token_value)
        user_id = token.get('user_id')
        user = User.objects.get(id=user_id)
        
        new_tokens = create_token_pair(user)
        return {
            "access": new_tokens["access"],
            "refresh": new_tokens["refresh"],
        }
    except Exception as e:
        return {"error": f"Invalid refresh token: {str(e)}"}



@router.post("/biometric/enroll/", auth=JWTAuth())
def enroll_biometric(request, data: BiometricEnrollIn):
    """
    Enroll user's face in the Cloud provider (e.g., AWS Rekognition).
    """
    user = request.auth
    
    # Pass the image data to your service which now handles the cloud SDK call
    success, message = AccountService.enroll_face_cloud(user, data.image_data)
    
    if not success:
        return {"error": message}
        
    return {"message": "Biometric data enrolled successfully."}

@router.post("/biometric/login/", auth=None)
def biometric_login(request, data: BiometricLoginIn):
    """
    Verify identity via Cloud face comparison and issue new JWT tokens.
    """
    user = User.objects.filter(phone_number=data.phone_number).first()
    
    if not user:
        return {"error": "User not found."}

    # Verify against Cloud provider
    is_match, message = AccountService.verify_face_cloud(user, data.image_data)
    
    if not is_match:
        return {"error": message}

    # If match is successful, issue tokens
    tokens = create_token_pair(user)
    AccountService.increment_login_count(user)
    
    return {
        "access": tokens["access"],
        "refresh": tokens["refresh"],
        "user": {
            "id": str(user.id),
            "full_name": user.full_name,
            "role": user.role
        }
    }


C:\Users\GATARA-BJTU\academe\backend\apps\accounts\tasks.py;;;
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging
import json

from .models import User, Badge, StudentRole, UserSession
from apps.governance.models import AuditLog
from common.constants import BadgeType, BADGE_THRESHOLDS
from common.notifications import NotificationService

logger = logging.getLogger(__name__)

# ============================================
# EXISTING TASKS
# ============================================

@shared_task
def calculate_badges():
    """Nightly task to recalculate all badges"""
    # Check all users for login badges BASED ON NO OFLOGINS, LIKES ETC
    for user in User.objects.all():
        for badge_type in [BadgeType.LOGIN_BRONZE, BadgeType.LOGIN_SILVER, BadgeType.LOGIN_GOLD]:
            threshold = BADGE_THRESHOLDS.get(badge_type, 0)
            if user.login_count >= threshold:
                Badge.objects.get_or_create(
                    user=user,
                    badge_type=badge_type.value
                )
        
        # Check engagement badge
        if user.total_likes_given >= BADGE_THRESHOLDS.get(BadgeType.HIGH_ENGAGER, 0):
            Badge.objects.get_or_create(
                user=user,
                badge_type=BadgeType.HIGH_ENGAGER.value
            )


@shared_task
def send_export_email(export_id, user_email):
    """Send export download link via email"""
    from django.core.mail import send_mail
    
    # Implementation depends on email backend setup
    pass


@shared_task
def cleanup_old_exports():
    """Delete expired data exports"""
    from .models import DataExport
    DataExport.objects.filter(expires_at__lt=timezone.now()).delete()


# ============================================
# ROLE LIFECYCLE: Daily Role Expiration Task
# ============================================

@shared_task
def expire_roles():
    """
    ============================================
    ROLE LIFECYCLE AUTOMATION
    ============================================
    
    Daily Celery Beat task (runs at 02:00 UTC).
    A
    Process:
    1. Queries all active StudentRole records where end_date < now
    2. For each expired role:
       a. Creates a detailed AuditLog entry with full state snapshot
       b. Sets is_active = False on the role
       c. Updates the user's base role if no other leadership roles exist
       d. Sends notification to the officer who assigned the role
    3. Logs summary of expired roles
    
    This ensures leadership positions automatically revert
    without manual intervention.
    """
    now = timezone.now()
    
    # ============================================
    # Find all roles that have passed their end_date
    # ============================================
    expired_roles = StudentRole.objects.filter(
        is_active=True,
        end_date__lt=now
    ).select_related('user', 'assigned_by')
    
    expired_count = expired_roles.count()
    
    if expired_count == 0:
        logger.info("expire_roles: No expired roles found")
        return f"No expired roles to process at {now.isoformat()}"
    
    logger.info(f"expire_roles: Processing {expired_count} expired roles")
    
    notifier = NotificationService()
    expired_details = []
    
    for role in expired_roles:
        try:
            # ============================================
            # Step 1: Capture BEFORE state for audit
            # ============================================
            before_state = {
                'id': str(role.id),
                'user_id': str(role.user.id),
                'user_name': role.user.full_name,
                'role': role.role,
                'scope_type': role.scope_type,
                'scope_id': str(role.scope_id),
                'scope_name': role.scope_name,
                'start_date': role.start_date.isoformat(),
                'end_date': role.end_date.isoformat(),
                'is_active': role.is_active,
                'assigned_by_id': str(role.assigned_by.id) if role.assigned_by else None,
                'assigned_by_name': role.assigned_by.full_name if role.assigned_by else None,
            }
            
            # ============================================
            # Step 2: Create AuditLog BEFORE expiring
            # ============================================
            AuditLog.objects.create(
                action='ROLE_EXPIRED',
                performed_by=None,  # System action
                target_user=role.user,
                target_type='StudentRole',
                target_id=str(role.id),
                before_state=before_state,
                after_state={
                    'is_active': False,
                    'revocation_reason': 'Role term ended (automatic expiration)',
                    'revoked_at': now.isoformat(),
                    'revoked_by': None,  # System
                },
                ip_address='system',
                user_agent='Celery/expire_roles',
                metadata={
                    'task': 'expire_roles',
                    'executed_at': now.isoformat(),
                    'trigger': 'end_date_passed',
                    'end_date': role.end_date.isoformat(),
                    'current_time': now.isoformat(),
                }
            )
            
            # ============================================
            # Step 3: Expire the role
            # ============================================
            role.expire(reason="Role term ended (automatic expiration)")
            
            # ============================================
            # Step 4: Notify the officer who assigned the role
            # ============================================
            if role.assigned_by:
                try:
                    notifier.send_push_notification(
                        role.assigned_by,
                        "Role Expired Automatically",
                        (
                            f"The {role.get_role_display()} role assigned to "
                            f"{role.user.full_name} ({role.scope_name}) has expired "
                            f"as of {role.end_date.strftime('%B %d, %Y')}."
                        ),
                        {
                            'type': 'role_expired',
                            'role_id': str(role.id),
                            'user_name': role.user.full_name,
                            'scope_name': role.scope_name,
                        }
                    )
                except Exception as notify_error:
                    logger.warning(
                        f"Failed to send expiration notification for role {role.id}: {notify_error}"
                    )
            
            # ============================================
            # Step 5: Notify the user whose role expired
            # ============================================
            try:
                notifier.send_push_notification(
                    role.user,
                    "Your Role Has Expired",
                    (
                        f"Your position as {role.get_role_display()} for "
                        f"{role.scope_name} has ended as of "
                        f"{role.end_date.strftime('%B %d, %Y')}. "
                        f"Thank you for your service!"
                    ),
                    {
                        'type': 'your_role_expired',
                        'role_id': str(role.id),
                        'role': role.role,
                        'scope_name': role.scope_name,
                    }
                )
            except Exception as notify_error:
                logger.warning(
                    f"Failed to send user notification for role {role.id}: {notify_error}"
                )
            
            expired_details.append({
                'role_id': str(role.id),
                'user': role.user.full_name,
                'role': role.get_role_display(),
                'scope': role.scope_name,
            })
            
            logger.info(
                f"Expired role: {role.user.full_name} — {role.get_role_display()} "
                f"({role.scope_name}) — Ended: {role.end_date.date()}"
            )
            
        except Exception as e:
            logger.error(f"Failed to expire role {role.id}: {e}", exc_info=True)
            # Continue processing other roles even if one fails
    
    # ============================================
    # Summary
    # ============================================
    summary = {
        'total_processed': expired_count,
        'details': expired_details,
        'executed_at': now.isoformat(),
    }
    
    logger.info(f"expire_roles completed: {json.dumps(summary, indent=2)}")
    
    return f"Expired {expired_count} roles at {now.isoformat()}"


# ============================================
# ROLE LIFECYCLE: Upcoming Expiration Warning
# ============================================

@shared_task
def notify_upcoming_role_expirations():
    """
    Weekly task: Notify officers about roles expiring in the next 7 days.
    
    This gives officers time to:
    - Renew roles that should continue
    - Find replacements for outgoing leaders
    - Plan smooth transitions
    """
    now = timezone.now()
    week_from_now = now + timedelta(days=7)
    
    # Find roles expiring in the next 7 days
    expiring_soon = StudentRole.objects.filter(
        is_active=True,
        end_date__gte=now,
        end_date__lte=week_from_now,
    ).select_related('user', 'assigned_by')
    
    if expiring_soon.count() == 0:
        return "No roles expiring in the next 7 days"
    
    notifier = NotificationService()
    
    for role in expiring_soon:
        if role.assigned_by:
            days_left = role.days_remaining
            
            notifier.send_push_notification(
                role.assigned_by,
                "Role Expiring Soon",
                (
                    f"The {role.get_role_display()} role for {role.user.full_name} "
                    f"({role.scope_name}) will expire in {days_left} day(s) on "
                    f"{role.end_date.strftime('%B %d, %Y')}. "
                    f"Renew if needed."
                ),
                {
                    'type': 'role_expiring_soon',
                    'role_id': str(role.id),
                    'days_remaining': days_left,
                    'user_name': role.user.full_name,
                    'scope_name': role.scope_name,
                }
            )
    
    return f"Sent {expiring_soon.count()} upcoming expiration notifications"


# ============================================
# ROLE LIFECYCLE: Session Cleanup
# ============================================

@shared_task
def cleanup_expired_sessions():
    """
    Daily task: Clean up expired user sessions.
    """
    now = timezone.now()
    
    expired_sessions = UserSession.objects.filter(
        is_active=True,
        expires_at__lt=now,
    )
    
    count = expired_sessions.count()
    expired_sessions.update(is_active=False)
    
    logger.info(f"Cleaned up {count} expired sessions")
    return f"Cleaned up {count} expired sessions"


# ============================================
# ROLE LIFECYCLE: Audit Log Cleanup
# ============================================

@shared_task
def archive_old_audit_logs():
    """
    Monthly task: Archive audit logs older than 1 year.
    
    In production:
    1. Query AuditLog entries older than 1 year
    2. Serialize to compressed Parquet format
    3. Upload to S3 Glacier Deep Archive
    4. Delete from live PostgreSQL database
    
    For now: Log count of archivable entries.
    """
    one_year_ago = timezone.now() - timedelta(days=365)
    
    old_logs = AuditLog.objects.filter(created_at__lt=one_year_ago)
    count = old_logs.count()
    
    if count == 0:
        return "No audit logs to archive"
    
    # In production, this would:
    # 1. Serialize to Parquet
    # 2. Upload to cold storage
    # 3. Delete from DB
    
    logger.info(
        f"Audit log archive: {count} entries older than {one_year_ago.date()} "
        f"ready for archival"
    )
    
    # For development: Just log, don't delete
    # In production: Uncomment the deletion after successful archive
    # old_logs.delete()
    
    return f"Identified {count} audit logs for archival (older than {one_year_ago.date()})"


@shared_task
def audit_biometric_data():
    """
    Weekly task to ensure biometric data integrity.
    Checks statistics on how many users have enabled Cloud Face Login.
    """
    total_users = User.objects.count()
    # Updated: Now checking the boolean flag instead of the legacy JSON field
    biometric_enabled = User.objects.filter(biometric_enabled=True).count()
    
    logger.info(
        f"Biometric Audit: {biometric_enabled}/{total_users} users "
        f"({(biometric_enabled/total_users)*100 if total_users > 0 else 0:.2f}%) "
        "have cloud-based biometric authentication enabled."
    )

@shared_task
def clear_expired_biometric_tokens():
    """
    If you implement a 'biometric_verify_token' in cache, 
    this cleans it up to prevent memory bloating.
    """
    # This task remains as a safe practice for cache management
    pass


    C:\Users\GATARA-BJTU\academe\frontend\src\api\accountsApi.js;;;
    import apiClient from './client';

export const accountsApi = {
  // ==========================================
  // AUTHENTICATION
  // ==========================================
  signup: (data) => apiClient.post('/accounts/signup/', data),

  requestOTP: (phone) => apiClient.post('/accounts/request-otp/', { phone_number: phone }),

  verifyOTP: (phone, otp) => apiClient.post('/accounts/verify-otp/', { phone_number: phone, otp: otp }),

  // ==========================================
  // PASSWORD RESET
  // ==========================================
  forgotPassword: (phone) => apiClient.post('/accounts/forgot-password/', { phone_number: phone }),

  resetPassword: (phone, otp, newPassword) =>
    apiClient.post('/accounts/reset-password/', {
      phone_number: phone,
      otp: otp,
      new_password: newPassword,
    }),

  // ==========================================
  // BIOMETRIC AUTHENTICATION
  // ==========================================
  // Now sends 'image_data' (Base64 string) instead of 'face_embedding'; this is light weight for backend
  enrollBiometric: (imageData) =>
    apiClient.post('/accounts/biometric/enroll/', { image_data: imageData }),

  biometricLogin: (phone, imageData) =>
    apiClient.post('/accounts/biometric/login/', {
      phone_number: phone,
      image_data: imageData
    }),

  // ==========================================
  // PROFILE
  // ==========================================
  getProfile: () => apiClient.get('/accounts/profile/'),

  updateProfile: (data) => apiClient.put('/accounts/profile/', data),

  uploadProfilePic: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/accounts/profile/upload-pic/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  searchStudents: (query) => apiClient.get('/accounts/students/search/', { params: { q: query } }),

  exportData: () => apiClient.post('/accounts/export-data/'),

  deleteAccount: () => apiClient.post('/accounts/delete-account/'),

  // ==========================================
  // SESSION MANAGEMENT
  // ==========================================
  listSessions: () => apiClient.get('/accounts/sessions/'),

  revokeSession: (sessionId) => apiClient.post(`/accounts/sessions/${sessionId}/revoke/`),

  revokeAllSessions: () => apiClient.post('/accounts/sessions/revoke-all/'),

  refreshToken: (refreshToken) =>
    apiClient.post('/accounts/refresh-token/', { refresh: refreshToken }),
};



so based on the above files, i want you to create accurately the content for the below files accurates in the pages folder: missing file content to create: C:\Users\GATARA-BJTU\academe\frontend\src\pages\TwoFactorSetupPage.jsx ,, and C:\Users\GATARA-BJTU\academe\frontend\src\pages\BiometricEnrollmentPage.jsx



also the likebutton has like and dislike fucntionality with an inverted thumb, but on the pages only the like appears. also include the label on the like and dislike buttons
so update the below file to include the above and provide the full complete fixed updated file accurete: C:\Users\GATARA-BJTU\academe\frontend\src\components\ui\LikeButton.jsx
import { useState, useCallback, useEffect } from 'react'; // Added useEffect
import { FiThumbsUp, FiThumbsDown, FiHeart, FiStar } from 'react-icons/fi';

const REACTION_ICONS = {
    like: FiThumbsUp,
    dislike: FiThumbsDown,
    heart: FiHeart,
    star: FiStar,
};

const REACTION_COLORS = {
    like: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-600 dark:text-blue-400', hover: 'hover:bg-blue-50 dark:hover:bg-blue-900/20' },
    dislike: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-600 dark:text-red-400', hover: 'hover:bg-red-50 dark:hover:bg-red-900/20' },
    heart: { bg: 'bg-pink-100 dark:bg-pink-900/40', text: 'text-pink-600 dark:text-pink-400', hover: 'hover:bg-pink-50 dark:hover:bg-pink-900/20' },
    star: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-600 dark:text-amber-400', hover: 'hover:bg-amber-50 dark:hover:bg-amber-900/20' },
};

const sizes = {
    sm: 'px-2 py-1 text-xs gap-1 rounded-lg',
    md: 'px-3 py-1.5 text-sm gap-1.5 rounded-lg',
    lg: 'px-4 py-2 text-sm gap-2 rounded-xl',
};

export default function LikeButton({
    type = 'like',
    active = false,
    count = 0,
    onToggle,
    disabled = false,
    loading = false,
    size = 'md',
    label = '',
    tooltip = '',
    className = '',
}) {
    const [animating, setAnimating] = useState(false);
    const [optimisticCount, setOptimisticCount] = useState(count);
    const [optimisticActive, setOptimisticActive] = useState(active);

    // ✅ FIXED: Properly sync with external state changes using useEffect
    useEffect(() => {
        setOptimisticCount(count);
        setOptimisticActive(active);
    }, [count, active]);

    const Icon = REACTION_ICONS[type] || FiThumbsUp;
    const colors = REACTION_COLORS[type] || REACTION_COLORS.like;
    const displayCount = optimisticCount;
    const isActive = optimisticActive;

    const handleClick = useCallback(async () => {
        if (disabled || loading) return;

        // Optimistic update. increamental addtional of like numbers using math.max(0, prev -1)
        setAnimating(true);
        const newActive = !isActive;
        setOptimisticActive(newActive);
        setOptimisticCount((prev) => (newActive ? prev + 1 : Math.max(0, prev - 1)));

        try {
            if (onToggle) {
                await onToggle(!isActive);
            }
        } catch (error) {
            // Rollback on failure
            setOptimisticActive(isActive);
            setOptimisticCount(count);
        } finally {
            setTimeout(() => setAnimating(false), 300);
        }
    }, [disabled, loading, isActive, count, onToggle]);

    return (
        <button
            onClick={handleClick}
            disabled={disabled || loading}
            title={tooltip || `${isActive ? 'Unlike' : 'Like'}${label ? ` ${label}` : ''}`}
            aria-label={`${isActive ? 'Unlike' : 'Like'}${label ? ` ${label}` : ''}. ${displayCount} ${type}s`}
            aria-pressed={isActive}
            className={`
                inline-flex items-center font-medium transition-all duration-200
                ${isActive ? `${colors.bg} ${colors.text}` : `text-gray-500 dark:text-gray-400 ${colors.hover}`}
                ${animating ? 'scale-110' : 'scale-100'} 
                ${loading ? 'opacity-70' : ''}
                disabled:opacity-50 disabled:cursor-not-allowed
                ${sizes[size] || sizes.md}
                ${className}
            `.trim()}
        >
            {loading ? (
                <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            ) : (
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'fill-current' : ''}`} />
            )}
            <span>{displayCount > 0 ? displayCount : label || ''}</span>
        </button>
    );
}


also ALSO THE biometric login fucntonaility is not being used check appropriate files
so check the below login page for accurayc in relation to biometrics:C:\Users\GATARA-BJTU\academe\frontend\src\pages\LoginPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import {
  FiZap, FiPhone, FiArrowRight, FiArrowLeft,
  FiWifiOff, FiCamera, FiBookOpen, FiUsers,
  FiTrendingUp, FiShield, FiMapPin,
} from 'react-icons/fi';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const { login, biometricLogin } = useAuth();
  const navigate = useNavigate();
  const otpRef = useRef(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => setResendTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const requestOTP = async (e) => {
    e.preventDefault();
    if (!phone.trim() || phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/accounts/request-otp/', { phone_number: phone });
      setStep('otp');
      setResendTimer(30);
      toast.success('OTP sent to your phone, please check');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(phone, otp);
      toast.success('Welcome back! 🎉');
      navigate('/');
    } catch (error) {
      toast.error(error.message || 'Invalid OTP');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    // Note: ensure captureImageFromCamera is imported or defined
    const base64Image = await captureImageFromCamera();

    if (!base64Image) {
      toast.error('Failed to capture image');
      return;
    }

    setLoading(true);
    try {
      await biometricLogin(phone, base64Image);
      toast.success('Biometric login successful! ✨');
      navigate('/');
    } catch (error) {
      toast.error(error.message || 'Biometric authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&display=swap');

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-15px) rotate(1deg); }
          66% { transform: translateY(-8px) rotate(-1deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.3), 0 0 60px rgba(99,102,241,0.1); }
          50% { box-shadow: 0 0 35px rgba(99,102,241,0.5), 0 0 80px rgba(139,92,246,0.2); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        .login-page-wrapper {
          font-family: 'Outfit', sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 25%, #312e81 50%, #1e1b4b 75%, #0f172a 100%);
          background-size: 400% 400%;
          animation: gradient-shift 15s ease infinite;
        }

        /* Animated background orbs */
        .login-bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.3;
          pointer-events: none;
        }
        .login-bg-orb-1 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #6366f1 0%, transparent 70%);
          top: -100px; left: -100px;
          animation: float 8s ease-in-out infinite;
        }
        .login-bg-orb-2 {
          width: 350px; height: 350px;
          background: radial-gradient(circle, #8b5cf6 0%, transparent 70%);
          bottom: -80px; right: -80px;
          animation: float 10s ease-in-out infinite reverse;
        }
        .login-bg-orb-3 {
          width: 250px; height: 250px;
          background: radial-gradient(circle, #ec4899 0%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          animation: float 12s ease-in-out infinite;
          opacity: 0.15;
        }

        /* Grid pattern overlay */
        .login-bg-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }

        .login-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 440px;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 28px;
          padding: 2.5rem 2rem;
          box-shadow: 0 25px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1);
          animation: slideUp 0.6s cubic-bezier(0.16,1,0.3,1) both;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .dark .login-card {
          background: rgba(15,15,30,0.92);
          border-color: rgba(255,255,255,0.08);
        }

        /* Logo & Branding */
        .login-brand {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .login-logo-mark {
          width: 64px; height: 64px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
          animation: pulse-glow 3s ease-in-out infinite;
          box-shadow: 0 8px 32px rgba(99,102,241,0.4);
        }
        .login-logo-mark svg {
          color: white;
          width: 28px;
          height: 28px;
        }
        .login-brand-name {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 1.8rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          background: linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 0.25rem;
        }
        .login-tagline {
          font-size: 0.85rem;
          color: #6b7280;
          font-weight: 500;
          letter-spacing: 0.01em;
          line-height: 1.5;
        }
        .login-tagline-highlight {
          color: #6366f1;
          font-weight: 600;
        }

        .dark .login-tagline {
          color: #9ca3af;
        }
        .dark .login-tagline-highlight {
          color: #818cf8;
        }

        /* Feature pills */
        .login-features {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-top: 0.75rem;
          flex-wrap: wrap;
        }
        .login-feature-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 99px;
          font-size: 0.68rem;
          font-weight: 600;
          background: rgba(99,102,241,0.08);
          color: #6366f1;
          border: 1px solid rgba(99,102,241,0.15);
        }
        .dark .login-feature-pill {
          background: rgba(99,102,241,0.12);
          border-color: rgba(99,102,241,0.2);
          color: #a5b4fc;
        }

        /* Form styles */
        .login-form-group {
          margin-bottom: 1rem;
        }
        .login-label {
          display: block;
          font-size: 0.78rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
          letter-spacing: 0.01em;
        }
        .dark .login-label {
          color: #d1d5db;
        }
        .login-input {
          width: 100%;
          padding: 0.8rem 1rem;
          border-radius: 14px;
          border: 1.5px solid #e5e7eb;
          background: #f9fafb;
          font-family: 'Outfit', sans-serif;
          font-size: 0.95rem;
          font-weight: 500;
          color: #111827;
          outline: none;
          transition: all 0.2s ease;
        }
        .login-input:focus {
          border-color: #3e40b3;
          box-shadow: 0 0 0 4px rgba(99,102,241,0.1);
          background: white;
        }
        .login-input::placeholder {
          color: #576d92;
        }
        .login-input-icon {
          position: relative;
        }
        .login-input-icon svg {
          position: absolute;
          left: 0.85rem;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          z-index: 1;
        }
        .login-input-icon input {
          padding-left: 2.6rem;
        }
        .dark .login-input {
          background: rgba(30,30,50,0.8);
          border-color: rgba(255,255,255,0.1);
          color: #f3f4f6;
        }
        .dark .login-input:focus {
          background: rgba(40,40,60,0.9);
          border-color: #818cf8;
          box-shadow: 0 0 0 4px rgba(129,140,248,0.15);
        }

        .login-otp-input {
          text-align: center;
          font-size: 1.5rem;
          letter-spacing: 0.6em;
          font-weight: 700;
          padding: 0.9rem 0.5rem;
        }

        .login-btn-primary {
          width: 100%;
          padding: 0.85rem;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          font-family: 'Outfit', sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s ease;
          box-shadow: 0 6px 20px rgba(99,102,241,0.35);
          margin-bottom: 0.75rem;
        }
        .login-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(99,102,241,0.45);
        }
        .login-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-btn-secondary {
          width: 100%;
          padding: 0.75rem;
          border-radius: 14px;
          border: 1.5px solid rgba(99,102,241,0.3);
          background: rgba(99,102,241,0.04);
          color: #6366f1;
          font-family: 'Outfit', sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s ease;
        }
        .login-btn-secondary:hover {
          background: rgba(99,102,241,0.08);
          border-color: rgba(99,102,241,0.5);
        }
        .dark .login-btn-secondary {
          color: #a5b4fc;
          border-color: rgba(129,140,248,0.3);
          background: rgba(129,140,248,0.06);
        }

        .login-divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 1rem 0;
          color: #9ca3af;
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .login-divider::before,
        .login-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }
        .dark .login-divider::before,
        .dark .login-divider::after {
          background: rgba(255,255,255,0.1);
        }

        .login-footer {
          text-align: center;
          margin-top: 1.25rem;
          font-size: 0.82rem;
          color: #6b7280;
        }
        .login-footer a {
          color: #6366f1;
          font-weight: 700;
          text-decoration: none;
          transition: color 0.15s;
        }
        .login-footer a:hover {
          color: #4f46e5;
          text-decoration: underline;
        }
        .dark .login-footer {
          color: #9ca3af;
        }
        .dark .login-footer a {
          color: #818cf8;
        }

        .login-offline-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          background: rgba(245,158,11,0.1);
          border: 1px solid rgba(245,158,11,0.25);
          color: #d97706;
          font-size: 0.78rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .login-resend-btn {
          background: none;
          border: none;
          color: #6366f1;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          transition: color 0.15s;
        }
        .login-resend-btn:hover:not(:disabled) {
          color: #4f46e5;
          text-decoration: underline;
        }
        .login-resend-btn:disabled {
          color: #9ca3af;
          cursor: not-allowed;
        }

        .login-back-btn {
          width: 100%;
          padding: 0.6rem;
          border: none;
          background: transparent;
          color: #6b7280;
          font-family: 'Outfit', sans-serif;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          transition: color 0.15s;
          margin-top: 0.25rem;
        }
        .login-back-btn:hover {
          color: #6366f1;
        }
        .dark .login-back-btn {
          color: #9ca3af;
        }
      `}</style>

      <div className="login-page-wrapper">
        {/* Animated background orbs */}
        <div className="login-bg-orb login-bg-orb-1" />
        <div className="login-bg-orb login-bg-orb-2" />
        <div className="login-bg-orb login-bg-orb-3" />
        <div className="login-bg-grid" />

        {/* Login Card */}
        <div className="login-card">
          {/* Branding */}
          <div className="login-brand">
            <div className="login-logo-mark">
              <FiZap size={28} />
            </div>
            <h1 className="login-brand-name">Academe</h1>
            <p className="login-tagline">
              Where <span className="login-tagline-highlight">education</span> meets{' '}
              <span className="login-tagline-highlight">innovation</span>
            </p>
            <p className="login-tagline" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
              Your all-in-one campus companion — announcements, classes, opportunities & more.
            </p>
            <div className="login-features">
              <span className="login-feature-pill"><FiBookOpen size={11} /> Academics</span>
              <span className="login-feature-pill"><FiUsers size={11} /> Community</span>
              <span className="login-feature-pill"><FiTrendingUp size={11} /> Growth</span>
            </div>
          </div>

          {/* Offline Banner */}
          {!isOnline && (
            <div className="login-offline-banner">
              <FiWifiOff size={16} /> You're offline — limited functionality
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={requestOTP}>
              <div className="login-form-group">
                <label className="login-label">Phone Number</label>
                <div className="login-input-icon">
                  <FiPhone size={16} />
                  <input
                    type="tel"
                    className="login-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+254 700 000 000"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="login-btn-primary"
                disabled={loading}
              >
                {loading ? 'Sending OTP...' : (
                  <>Get OTP <FiArrowRight size={18} /></>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOTP}>
              <div className="login-form-group">
                <label className="login-label">
                  Enter OTP Code
                  {resendTimer > 0 && (
                    <span style={{ color: '#9ca3af', marginLeft: '0.5rem', fontWeight: 400 }}>
                      ({resendTimer}s)
                    </span>
                  )}
                </label>
                <input
                  ref={otpRef}
                  className="login-input login-otp-input"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="••••••"
                  maxLength={6}
                  required
                />
                <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="login-resend-btn"
                    disabled={resendTimer > 0}
                    onClick={requestOTP}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="login-btn-primary"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>

              <div className="login-divider">or continue with</div>

              <button
                type="button"
                className="login-btn-secondary"
                onClick={handleBiometricLogin}
                disabled={loading}
              >
                <FiCamera size={18} /> Face ID
              </button>

              <button
                type="button"
                className="login-back-btn"
                onClick={() => setStep('phone')}
              >
                <FiArrowLeft size={14} /> Change phone number
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="login-footer">
            Don't have an account?{' '}
            <Link to="/signup">Create one</Link>
          </div>
        </div>
      </div>
    </>
  );
}