import logging
import requests  # <-- ADD THIS MISSING IMPORT
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from PIL import Image, ImageFilter
import cv2
import numpy as np
from io import BytesIO
import boto3

from common.storage import S3Storage
from .models import FoundItem, Claim, MpesaTransactionLog
from .services import EscrowService
from apps.accounts.models import User

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def blur_sensitive_regions(self, item_id):
    """
    Blur sensitive information in found item images using OpenCV.
    No face_recognition or dlib required.
    """
    try:
        item = FoundItem.objects.get(id=item_id)
        
        if not item.original_image_url:
            logger.warning(f"No image URL for item {item_id}")
            return
        
        # Download original image
        response = requests.get(item.original_image_url, timeout=30)
        image = Image.open(BytesIO(response.content))
        
        # Convert RGBA to RGB if needed
        if image.mode == 'RGBA':
            image = image.convert('RGB')
        
        # Convert PIL to OpenCV format
        cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        
        # Detect faces using OpenCV cascade classifier
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )
        
        # Blur detected faces
        for (x, y, w, h) in faces:
            # Add some padding around faces
            x = max(0, x - 20)
            y = max(0, y - 20)
            w = min(cv_image.shape[1] - x, w + 40)
            h = min(cv_image.shape[0] - y, h + 40)
            
            # Apply strong Gaussian blur
            cv_image[y:y+h, x:x+w] = cv2.GaussianBlur(
                cv_image[y:y+h, x:x+w], (99, 99), 30
            )
        
        # Additional: Blur bottom portion where addresses usually appear
        height, width = cv_image.shape[:2]
        bottom_start = int(height * 0.7)
        cv_image[bottom_start:height, 0:width] = cv2.GaussianBlur(
            cv_image[bottom_start:height, 0:width], (99, 99), 30
        )
        
        # Convert back to PIL
        blurred_pil = Image.fromarray(cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB))
        
        # Save blurred image to bytes
        blurred_bytes = BytesIO()
        blurred_pil.save(blurred_bytes, format='JPEG', quality=85)
        blurred_bytes.seek(0)
        
        # Upload to S3
        storage = S3Storage()
        key = f"blurred/{item.id}/blurred_{item.id}.jpg"
        blurred_url = storage.upload_file(blurred_bytes, key)
        
        # Update item
        item.blurred_image_url = blurred_url
        item.status = 'active'
        item.save()
        
        logger.info(f"Successfully blurred image for item {item_id}")
        
    except requests.RequestException as e:
        logger.error(f"Failed to download image for item {item_id}: {e}")
        self.handle_failure(item_id)
    except cv2.error as e:
        logger.error(f"OpenCV processing failed for item {item_id}: {e}")
        self.handle_failure(item_id)
    except Exception as e:
        logger.error(f"Unexpected error blurring image for item {item_id}: {e}")
        try:
            raise self.retry(countdown=2 ** self.request.retries * 60)
        except self.MaxRetriesExceededError:
            self.handle_failure(item_id)
    
    def handle_failure(self, item_id):
        """Mark item as failed and notify admin"""
        try:
            item = FoundItem.objects.get(id=item_id)
            item.status = 'blur_failed'
            item.save()
            
            # Notify admin
            from common.notifications import NotificationService
            notifier = NotificationService()
            admin_user = User.objects.filter(role='admin').first()
            if admin_user:
                notifier.send_push_notification(
                    admin_user,
                    "Image Processing Failed",
                    f"Failed to blur image for item: {item.title}. Manual review needed.",
                    {'item_id': str(item.id)}
                )
        except Exception as inner_e:
            logger.error(f"Failed to update item status: {inner_e}")

@shared_task
def auto_confirm_escrow():
    """Auto-confirm escrow transactions after grace period"""
    EscrowService.auto_confirm_claims()

@shared_task
def cleanup_transaction_logs():
    """Delete transaction logs older than 6 months"""
    six_months_ago = timezone.now() - timedelta(days=180)
    MpesaTransactionLog.objects.filter(created_at__lt=six_months_ago).delete()

@shared_task(bind=True, max_retries=7)
def cleanup_after_handover(self, item_id):
    """
    PRIVACY LIFECYCLE: After item is handed over:
    1. Wait 7 days (dispute window)
    2. Permanently delete raw image from private bucket
    3. Scrub PII fields from database
    """
    try:
        item = FoundItem.objects.get(id=item_id)
        
        # Check if 7 days have passed since handover
        claim = Claim.objects.filter(item=item, status='completed').first()
        if not claim or not claim.confirmed_at:
            logger.warning(f"No completed claim found for item {item_id}")
            return
        
        days_since_handover = (timezone.now() - claim.confirmed_at).days
        if days_since_handover < 7:
            # Retry later - wait until 7 days have passed
            remaining_seconds = (7 - days_since_handover) * 86400
            raise self.retry(countdown=min(remaining_seconds, 86400))
        
        # DELETE RAW IMAGE from private bucket
        if item.original_image_url:
            # Use S3Storage directly since DualBucketStorage may not exist yet
            storage = S3Storage()
            
            # Extract key from URL
            key = item.original_image_url.split('/')[-1]
            storage.delete_file(key)
        
        # SCRUB PII FIELDS
        item.admission_number_on_item = '[REDACTED]'
        item.security_answer = '[REDACTED]'
        item.original_image_url = ''
        item.status = 'archived'
        item.save(update_fields=['admission_number_on_item', 'security_answer', 'original_image_url', 'status'])
        
        logger.info(f"PII scrubbed for item {item_id}")
        
    except FoundItem.DoesNotExist:
        logger.error(f"Item {item_id} not found for cleanup")
    except Exception as e:
        logger.error(f"Cleanup failed for item {item_id}: {e}")
        raise self.retry(countdown=86400)