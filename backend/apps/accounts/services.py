import boto3
import json
import io
import csv
import os
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
    def verify_face_cloud(source_image_bytes, target_image_bytes):
        """
        Verify faces using AWS Rekognition.
        Removes the need for local dlib/face_recognition installation.
        """
        try:
            # Assumes AWS credentials are set in environment variables
            client = boto3.client('rekognition', region_name='us-east-1')
            
            response = client.compare_faces(
                SourceImage={'Bytes': source_image_bytes},
                TargetImage={'Bytes': target_image_bytes},
                SimilarityThreshold=BiometricSettings.MATCH_TOLERANCE
            )
            
            match = len(response['FaceMatches']) > 0
            return match, ("Match successful." if match else "Face did not match.")
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
                        for key, value in item.items(): writer.writerow([section, key, value])
                else:
                    for key, value in items.items(): writer.writerow([section, key, value])
            output = output.getvalue()
        
        return export