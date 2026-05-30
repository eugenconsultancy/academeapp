import boto3
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class DualBucketStorage:
    """
    Enforces physical separation of sensitive and public data.
    PRIVATE_BUCKET: Raw ID images, no public access policy
    PUBLIC_BUCKET: Blurred images, CDN-enabled
    """
    
    def __init__(self):
        if not settings.AWS_PRIVATE_BUCKET_NAME or not settings.AWS_PUBLIC_BUCKET_NAME:
            raise ValueError("AWS bucket names must be defined in settings")
        self.s3 = boto3.client('s3')
        self.private_bucket = settings.AWS_PRIVATE_BUCKET_NAME
        self.public_bucket = settings.AWS_PUBLIC_BUCKET_NAME
    
    def upload_raw_image(self, file_obj, key):
        """Upload to PRIVATE bucket - NEVER publicly accessible"""
        try:
            self.s3.upload_fileobj(
                file_obj,
                self.private_bucket,
                key,
                ExtraArgs={
                    'ACL': 'private',
                    'ServerSideEncryption': 'AES256'
                }
            )
            return f"https://{self.private_bucket}.s3.amazonaws.com/{key}"
        except Exception as e:
            logger.error(f"Failed to upload raw image {key}: {e}")
            raise
    
    def upload_blurred_image(self, file_obj, key):
        """Upload to PUBLIC bucket - safe for student viewing"""
        try:
            self.s3.upload_fileobj(
                file_obj,
                self.public_bucket,
                key,
                ExtraArgs={
                    'ACL': 'public-read',
                    'CacheControl': 'max-age=86400'
                }
            )
            return f"https://{self.public_bucket}.s3.amazonaws.com/{key}"
        except Exception as e:
            logger.error(f"Failed to upload blurred image {key}: {e}")
            raise
    
    def delete_raw_image(self, key):
        """Permanently delete raw image from private bucket"""
        try:
            self.s3.delete_object(Bucket=self.private_bucket, Key=key)
        except Exception as e:
            logger.error(f"Failed to delete raw image {key}: {e}")
    
    def generate_presigned_url(self, key, expiration=300):
        """Generate temporary access URL for admin review (5 min default)"""
        try:
            return self.s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.private_bucket, 'Key': key},
                ExpiresIn=expiration
            )
        except Exception as e:
            logger.error(f"Failed to generate presigned URL for {key}: {e}")
            return None