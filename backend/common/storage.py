# backend/common/storage.py
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class DualBucketStorage:
    """
    Enforces physical separation of sensitive and public data.
    PRIVATE_BUCKET: Raw ID images, no public access policy
    PUBLIC_BUCKET: Blurred images, CDN-enabled
    
    Provides robust error handling and connection verification.
    """
    
    def __init__(self):
        # Validate bucket names
        self.private_bucket = getattr(settings, 'AWS_PRIVATE_BUCKET_NAME', None)
        self.public_bucket = getattr(settings, 'AWS_PUBLIC_BUCKET_NAME', None)
        
        if not self.private_bucket or not self.public_bucket:
            error_msg = "AWS_PRIVATE_BUCKET_NAME and AWS_PUBLIC_BUCKET_NAME must be defined in settings"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # Initialize S3 client
        try:
            self.s3 = boto3.client(
                's3',
                aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', None),
                aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', None),
                region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1')
            )
            
            # Test connection by listing buckets (simple ping)
            self.s3.list_buckets()
            logger.info(f"DualBucketStorage initialized: private={self.private_bucket}, public={self.public_bucket}")
            
        except NoCredentialsError as e:
            logger.error(f"AWS credentials not found: {e}")
            raise ValueError("AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY")
        except ClientError as e:
            logger.error(f"S3 connection error: {e}")
            raise ValueError(f"Failed to connect to S3: {e.response.get('Error', {}).get('Message', str(e))}")
        except Exception as e:
            logger.error(f"Unexpected S3 initialization error: {e}")
            raise
    
    def upload_raw_image(self, file_obj, key):
        """
        Upload to PRIVATE bucket - NEVER publicly accessible.
        Returns the S3 URL or raises an exception.
        """
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
            url = f"https://{self.private_bucket}.s3.amazonaws.com/{key}"
            logger.info(f"Raw image uploaded: {key}")
            return url
            
        except ClientError as e:
            logger.error(f"S3 upload error for {key}: {e.response.get('Error', {}).get('Message', str(e))}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error uploading raw image {key}: {e}")
            raise
    
    def upload_blurred_image(self, file_obj, key):
        """
        Upload to PUBLIC bucket - safe for student viewing.
        Returns the public URL.
        """
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
            url = f"https://{self.public_bucket}.s3.amazonaws.com/{key}"
            logger.info(f"Blurred image uploaded: {key}")
            return url
            
        except ClientError as e:
            logger.error(f"S3 upload error for {key}: {e.response.get('Error', {}).get('Message', str(e))}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error uploading blurred image {key}: {e}")
            raise
    
    def delete_raw_image(self, key):
        """
        Permanently delete raw image from private bucket.
        Returns True if successful, False otherwise.
        """
        try:
            self.s3.delete_object(Bucket=self.private_bucket, Key=key)
            logger.info(f"Raw image deleted: {key}")
            return True
        except ClientError as e:
            logger.error(f"S3 delete error for {key}: {e.response.get('Error', {}).get('Message', str(e))}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error deleting raw image {key}: {e}")
            return False
    
    def delete_blurred_image(self, key):
        """
        Permanently delete blurred image from public bucket.
        Returns True if successful, False otherwise.
        """
        try:
            self.s3.delete_object(Bucket=self.public_bucket, Key=key)
            logger.info(f"Blurred image deleted: {key}")
            return True
        except ClientError as e:
            logger.error(f"S3 delete error for {key}: {e.response.get('Error', {}).get('Message', str(e))}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error deleting blurred image {key}: {e}")
            return False
    
    def generate_presigned_url(self, key, expiration=300):
        """
        Generate temporary access URL for admin review.
        Default: 5 minutes expiration.
        Note: This URL will expire and must be refreshed.
        """
        try:
            url = self.s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.private_bucket, 'Key': key},
                ExpiresIn=expiration
            )
            logger.debug(f"Presigned URL generated for {key}, expires in {expiration}s")
            return url
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL for {key}: {e.response.get('Error', {}).get('Message', str(e))}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error generating presigned URL for {key}: {e}")
            return None
    
    def get_object_metadata(self, key, bucket_type='private'):
        """
        Get metadata for an S3 object.
        bucket_type: 'private' or 'public'
        """
        bucket = self.private_bucket if bucket_type == 'private' else self.public_bucket
        try:
            response = self.s3.head_object(Bucket=bucket, Key=key)
            return {
                'size': response.get('ContentLength', 0),
                'last_modified': response.get('LastModified'),
                'content_type': response.get('ContentType'),
                'etag': response.get('ETag', '').strip('"')
            }
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                logger.warning(f"Object not found: {key}")
            else:
                logger.error(f"Failed to get metadata for {key}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error getting metadata for {key}: {e}")
            return None
    
    def object_exists(self, key, bucket_type='private'):
        """Check if an object exists in S3."""
        return self.get_object_metadata(key, bucket_type) is not None