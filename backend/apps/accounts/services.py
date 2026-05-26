import boto3
import json
import io
import csv
import os
import base64
from datetime import datetime, timedelta
from django.core.cache import cache
from django.utils import timezone
from common.constants import BadgeType, BADGE_THRESHOLDS
from apps.accounts.constants import BiometricSettings
from .models import User, Badge, DataExport

class AccountService:
    @staticmethod
    def update_last_activity(user):
        """Update user's last activity and online status"""
        user.last_activity = timezone.now()
        user.save(update_fields=['last_activity'])
        cache.set(f'user_online_{user.id}', True, timeout=120)

    @staticmethod
    def increment_login_count(user):
        """Increment login counter and check for badges"""
        user.login_count += 1
        user.save(update_fields=['login_count'])
        AccountService.check_login_badges(user)

    @staticmethod
    def check_login_badges(user):
        """Award login-based badges"""
        for badge_type, threshold in BADGE_THRESHOLDS.items():
            if badge_type in [BadgeType.LOGIN_BRONZE, BadgeType.LOGIN_SILVER, BadgeType.LOGIN_GOLD]:
                if user.login_count >= threshold:
                    Badge.objects.get_or_create(user=user, badge_type=badge_type.value)

    @staticmethod
    def check_engagement_badge(user):
        """Award engagement badge based on likes given"""
        if user.total_likes_given >= BADGE_THRESHOLDS[BadgeType.HIGH_ENGAGER]:
            Badge.objects.get_or_create(user=user, badge_type=BadgeType.HIGH_ENGAGER.value)

    # ============================================
    # BIOMETRIC SERVICE METHODS (CLOUD-BASED)
    # ============================================

    @staticmethod
    def enroll_face_cloud(user, image_data):
        """
        Enroll a user's face by storing the base64-encoded image.
        In production, you might extract a face ID from Rekognition IndexFaces.
        For now, we store the raw image (base64) on the user model and enable biometric login.
        """
        if not image_data:
            return False, "No image data provided."

        # Validate and clean the base64 string if it contains a data URI prefix
        if image_data.startswith('data:image'):
            # Strip the header: "data:image/jpeg;base64,..."
            image_data = image_data.split(',', 1)[1]

        # Optionally decode to verify it's valid base64
        try:
            base64.b64decode(image_data)
        except Exception:
            return False, "Invalid base64 image data."

        # Store the raw base64 string (you might compress or store in S3 later)
        user.face_data = image_data
        user.biometric_enabled = True
        user.save(update_fields=['face_data', 'biometric_enabled'])

        return True, "Face enrolled successfully."

    @staticmethod
    def verify_face_cloud(user, live_image_data):
        """
        Verify a live captured image against the enrolled face.
        - user: the User object (must have face_data stored)
        - live_image_data: base64 string of the just‑captured image
        Returns (success_bool, message).
        """
        if not user.face_data:
            return False, "No enrolled face data found."

        # Prepare both images as bytes for Rekognition
        # Strip data URI prefixes if present
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
    # DATA EXPORT METHODS
    # ============================================

    @staticmethod
    def generate_data_export(user, format='json'):
        """Generate data export for user"""
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

        return export