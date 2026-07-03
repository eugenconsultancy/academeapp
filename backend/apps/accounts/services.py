# backend/apps/accounts/services.py
import boto3
import json
import io
import csv
import os
import base64
import pyotp
import qrcode
from io import BytesIO
from datetime import datetime, timedelta
from django.core.cache import cache
from django.utils import timezone
from django.contrib.auth import get_user_model
from common.constants import BadgeType, BADGE_THRESHOLDS
from apps.accounts.constants import BiometricSettings
from .models import User, Badge, DataExport, UserSession
import secrets

User = get_user_model()

class AccountService:
    @staticmethod
    def update_last_activity(user):
        user.last_activity = timezone.now()
        user.save(update_fields=['last_activity'])
        cache.set(f'user_online_{user.id}', True, timeout=120)

    @staticmethod
    def increment_login_count(user):
        user.login_count += 1
        user.save(update_fields=['login_count'])
        AccountService.check_login_badges(user)

    @staticmethod
    def check_login_badges(user):
        for badge_type, threshold in BADGE_THRESHOLDS.items():
            if badge_type in [BadgeType.LOGIN_BRONZE, BadgeType.LOGIN_SILVER, BadgeType.LOGIN_GOLD]:
                if user.login_count >= threshold:
                    Badge.objects.get_or_create(user=user, badge_type=badge_type.value)

    @staticmethod
    def check_engagement_badge(user):
        if user.total_likes_given >= BADGE_THRESHOLDS[BadgeType.HIGH_ENGAGER]:
            Badge.objects.get_or_create(user=user, badge_type=BadgeType.HIGH_ENGAGER.value)

    # ============================================
    # BIOMETRIC
    # ============================================
    @staticmethod
    def enroll_face_cloud(user, image_data):
        if not image_data:
            return False, "No image data provided."
        if image_data.startswith('data:image'):
            image_data = image_data.split(',', 1)[1]
        try:
            base64.b64decode(image_data)
        except Exception:
            return False, "Invalid base64 image data."
        user.face_data = image_data
        user.biometric_enabled = True
        user.save(update_fields=['face_data', 'biometric_enabled'])
        return True, "Face enrolled successfully."

    @staticmethod
    def verify_face_cloud(user, live_image_data):
        if not user.face_data:
            return False, "No enrolled face data found."
        stored_img = user.face_data
        if stored_img.startswith('data:image'):
            stored_img = stored_img.split(',', 1)[1]
        live_img = live_image_data
        if live_img.startswith('data:image'):
            live_img = live_img.split(',', 1)[1]
        try:
            stored_bytes = base64.b64decode(stored_img)
            live_bytes = base64.b64decode(live_img)
        except Exception as e:
            return False, f"Image decoding error: {str(e)}"
        try:
            client = boto3.client('rekognition', region_name='us-east-1')
            response = client.compare_faces(
                SourceImage={'Bytes': stored_bytes},
                TargetImage={'Bytes': live_bytes},
                SimilarityThreshold=BiometricSettings.MATCH_TOLERANCE
            )
            if response.get('FaceMatches'):
                return True, "Face matched successfully."
            else:
                return False, "Face did not match."
        except Exception as e:
            return False, f"Cloud verification error: {str(e)}"

    # ============================================
    # DATA EXPORT
    # ============================================
    @staticmethod
    def generate_data_export(user, format='json'):
        from apps.classes.models import AttendanceRecord
        from apps.found_items.models import Claim

        data = {
            'profile': {
                'full_name': user.full_name,
                'admission_number': user.admission_number,
                'class': user.class_name,
                'institution': user.institution,
                'email': user.email,
                'joined': user.created_at.isoformat(),
            },
            'attendance': list(
                AttendanceRecord.objects.filter(student=user).values(
                    'timetable_entry__unit_name', 'timetable_entry__day_of_week', 'date', 'marked_at'
                )
            ),
            'claims': list(
                Claim.objects.filter(claimant=user).values(
                    'item__title', 'status', 'created_at'
                )
            ),
        }

        export = DataExport.objects.create(
            user=user, format=format, expires_at=timezone.now() + timedelta(days=7)
        )

        if format == 'json':
            output = json.dumps(data, indent=2)
        else:
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(['Section', 'Field', 'Value'])
            for section, items in data.items():
                if isinstance(items, list):
                    for item in items:
                        for key, value in item.items():
                            writer.writerow([section, key, value])
                else:
                    for key, value in items.items():
                        writer.writerow([section, key, value])
            output = output.getvalue()
        # In production, save file to S3/Media and set export.export_file
        return export

    # ============================================
    # 2FA helpers
    # ============================================
    @staticmethod
    def create_2fa_temp_token(user):
        token = secrets.token_urlsafe(32)
        cache.set(f"2fa_temp_{token}", user.id, timeout=300)
        return token

    @staticmethod
    def get_user_from_temp_token(token):
        user_id = cache.get(f"2fa_temp_{token}")
        if user_id:
            return User.objects.get(id=user_id)
        return None

    @staticmethod
    def serialize_user(user):
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
            "is_superuser": user.is_superuser,   # <-- ADDED
            "is_staff": user.is_staff,           # <-- ADDED
        }


class TwoFactorService:
    @staticmethod
    def generate_qr_code(user):
        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(name=user.phone_number, issuer_name="Academe")
        qr = qrcode.make(provisioning_uri)
        buffered = BytesIO()
        qr.save(buffered, format="PNG")
        qr_base64 = base64.b64encode(buffered.getvalue()).decode()
        return secret, f"data:image/png;base64,{qr_base64}"

    @staticmethod
    def verify_totp_code(secret, code):
        totp = pyotp.TOTP(secret)
        return totp.verify(code)

    @staticmethod
    def verify_totp(user, code):
        # For a real implementation, store the secret per user (e.g., in User model).
        # Since we don't have that field, we'll store in cache temporarily during setup.
        # For production, add `totp_secret` field to User model.
        secret = cache.get(f"user_totp_secret_{user.id}")
        if not secret:
            return False
        return TwoFactorService.verify_totp_code(secret, code)

    @staticmethod
    def generate_backup_codes(user):
        codes = [secrets.token_hex(3) for _ in range(8)]
        # Store hashed codes in cache or DB
        cache.set(f"backup_codes_{user.id}", [{"code": c, "used": False} for c in codes], timeout=None)
        return codes

    @staticmethod
    def clear_backup_codes(user):
        cache.delete(f"backup_codes_{user.id}")