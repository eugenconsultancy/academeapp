import logging
import requests
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from PIL import Image, ImageFilter
import cv2
import numpy as np
from io import BytesIO

from common.storage import DualBucketStorage  # correct class name
from .models import FoundItem, Claim, MpesaTransactionLog
from .services import EscrowService
from apps.accounts.models import User

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def blur_sensitive_regions(self, item_id):
    try:
        item = FoundItem.objects.get(id=item_id)
        if not item.original_image_url:
            logger.warning(f"No image URL for item {item_id}")
            # If no image but still processing, set to active
            if item.status == 'processing':
                item.status = 'active'
                item.save()
            return
        response = requests.get(item.original_image_url, timeout=30)
        image = Image.open(BytesIO(response.content))
        if image.mode == 'RGBA':
            image = image.convert('RGB')
        cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30,30))
        for (x,y,w,h) in faces:
            x = max(0, x-20); y = max(0, y-20)
            w = min(cv_image.shape[1]-x, w+40); h = min(cv_image.shape[0]-y, h+40)
            cv_image[y:y+h, x:x+w] = cv2.GaussianBlur(cv_image[y:y+h, x:x+w], (99,99), 30)
        height, width = cv_image.shape[:2]
        bottom_start = int(height*0.7)
        cv_image[bottom_start:height, 0:width] = cv2.GaussianBlur(cv_image[bottom_start:height, 0:width], (99,99), 30)
        blurred_pil = Image.fromarray(cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB))
        blurred_bytes = BytesIO()
        blurred_pil.save(blurred_bytes, format='JPEG', quality=85)
        blurred_bytes.seek(0)
        storage = DualBucketStorage()  # correct class
        key = f"blurred/{item.id}/blurred_{item.id}.jpg"
        blurred_url = storage.upload_blurred_image(blurred_bytes, key)
        item.blurred_image_url = blurred_url
        item.status = 'active'
        item.save()
    except Exception as e:
        logger.error(f"Blur failed for {item_id}: {e}")
        try:
            raise self.retry(countdown=2 ** self.request.retries * 60)
        except self.MaxRetriesExceededError:
            # On final failure, set item to 'active' but with a flag? We simply set to active.
            # The item will be visible without blur – not ideal but better than invisible.
            FoundItem.objects.filter(id=item_id).update(status='active', blurred_image_url='')
            logger.error(f"Blur permanently failed for item {item_id}, item set to active without blur.")

@shared_task
def auto_confirm_escrow():
    EscrowService.auto_confirm_claims()

@shared_task
def cleanup_transaction_logs():
    MpesaTransactionLog.objects.filter(created_at__lt=timezone.now() - timedelta(days=180)).delete()

@shared_task(bind=True, max_retries=7)
def cleanup_after_handover(self, item_id):
    try:
        item = FoundItem.objects.get(id=item_id)
        claim = Claim.objects.filter(item=item, status='completed').order_by('-confirmed_at').first()
        if not claim or not claim.confirmed_at:
            return
        if (timezone.now() - claim.confirmed_at).days < 7:
            raise self.retry(countdown=86400)
        storage = DualBucketStorage()
        if item.original_image_url:
            key = item.original_image_url.split('/')[-1]
            storage.delete_raw_image(key)
        item.admission_number_on_item = '[REDACTED]'
        item.security_answer = '[REDACTED]'
        item.original_image_url = ''
        item.blurred_image_url = ''
        item.status = 'archived'
        item.save()
    except FoundItem.DoesNotExist:
        pass
    except Exception as e:
        logger.error(f"Cleanup failed {item_id}: {e}")
        raise self.retry(countdown=86400)