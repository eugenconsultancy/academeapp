import boto3
from django.conf import settings
from botocore.exceptions import ClientError
import logging

logger = logging.getLogger(__name__)

class S3Storage:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        self.bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    
    def upload_file(self, file_obj, key, bucket=None, public=False):
        """Upload file to S3 bucket"""
        bucket = bucket or self.bucket_name
        
        try:
            extra_args = {
                'ServerSideEncryption': 'AES256'
            }
            
            if public:
                extra_args['ACL'] = 'public-read'
            
            self.s3_client.upload_fileobj(
                file_obj,
                bucket,
                key,
                ExtraArgs=extra_args
            )
            
            url = f"https://{bucket}.s3.amazonaws.com/{key}"
            return url
        except ClientError as e:
            logger.error(f"Failed to upload file: {e}")
            raise
    
    def delete_file(self, key, bucket=None):
        """Delete file from S3 bucket"""
        bucket = bucket or self.bucket_name
        
        try:
            self.s3_client.delete_object(Bucket=bucket, Key=key)
            return True
        except ClientError as e:
            logger.error(f"Failed to delete file: {e}")
            return False
    
    def generate_presigned_url(self, key, expiration=3600, bucket=None):
        """Generate presigned URL for private file access"""
        bucket = bucket or self.bucket_name
        
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket, 'Key': key},
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            return None