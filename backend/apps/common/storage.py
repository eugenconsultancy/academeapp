import boto3
from django.conf import settings

class DualBucketStorage:
    """
    Enforces physical separation of sensitive and public data.
    PRIVATE_BUCKET: Raw ID images, no public access policy
    PUBLIC_BUCKET: Blurred images, CDN-enabled
    """
    
    def __init__(self):
        self.s3 = boto3.client('s3')
        self.private_bucket = settings.AWS_PRIVATE_BUCKET_NAME
        self.public_bucket = settings.AWS_PUBLIC_BUCKET_NAME
    
    def upload_raw_image(self, file_obj, key):
        """Upload to PRIVATE bucket - NEVER publicly accessible"""
        self.s3.upload_fileobj(
            file_obj,
            self.private_bucket,
            key,
            ExtraArgs={
                'ACL': 'private',  # EXPLICIT: No public access
                'ServerSideEncryption': 'AES256'
            }
        )
        return f"https://{self.private_bucket}.s3.amazonaws.com/{key}"
    
    def upload_blurred_image(self, file_obj, key):
        """Upload to PUBLIC bucket - safe for student viewing"""
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
    
    def delete_raw_image(self, key):
        """Permanently delete raw image from private bucket"""
        self.s3.delete_object(Bucket=self.private_bucket, Key=key)
    
    def generate_presigned_url(self, key, expiration=300):
        """Generate temporary access URL for admin review (5 min default)"""
        return self.s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.private_bucket, 'Key': key},
            ExpiresIn=expiration
        )