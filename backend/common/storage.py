import boto3
import logging
from django.conf import settings
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

s3_client = boto3.client(
    's3',
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_S3_REGION_NAME
)

class S3Storage:
    def __init__(self):
        self.bucket_name = settings.AWS_STORAGE_BUCKET_NAME

    def get_presigned_post(self, key, expiration=3600):
        try:
            return s3_client.generate_presigned_post(
                Bucket=self.bucket_name,
                Key=key,
                ExpiresIn=expiration
            )
        except ClientError as e:
            logger.error(f"Failed to generate presigned post: {e}")
            return None

    def upload_file(self, file_obj, key, public=False):
        try:
            extra_args = {'ServerSideEncryption': 'AES256'}
            if public:
                extra_args['ACL'] = 'public-read'
            s3_client.upload_fileobj(file_obj, self.bucket_name, key, ExtraArgs=extra_args)
            return f"https://{self.bucket_name}.s3.amazonaws.com/{key}"
        except ClientError as e:
            logger.error(f"Failed to upload file: {e}")
            raise

    def generate_presigned_url(self, key, expiration=3600):
        return s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket_name, 'Key': key},
            ExpiresIn=expiration
        )