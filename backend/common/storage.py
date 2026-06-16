# backend/common/storage.py
"""
Dual-bucket S3 storage backend for Academe.

Enforces physical separation of sensitive and public data:
- PRIVATE_BUCKET: Raw ID images, no public access policy
- PUBLIC_BUCKET: Blurred images, chat attachments, CDN-enabled

Supports:
- Presigned POST URLs for direct uploads (chat attachments, ID uploads)
- Presigned GET URLs for temporary admin access
- Region-aware URL construction
- Proper error handling with least-privilege IAM compatibility
- Singleton pattern for connection reuse
"""

import uuid
import logging
from typing import Optional, Dict, Any, BinaryIO

import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from django.conf import settings

logger = logging.getLogger(__name__)

# Module-level singleton instance
_storage_instance: Optional['DualBucketStorage'] = None


def get_storage() -> 'DualBucketStorage':
    """
    Get or create the singleton DualBucketStorage instance.
    Use this instead of creating new instances to avoid
    redundant S3 connection verification.
    """
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = DualBucketStorage()
    return _storage_instance


class DualBucketStorage:
    """
    Enforces physical separation of sensitive and public data.
    
    Private Bucket: Raw ID images, no public access policy
    Public Bucket: Blurred images, chat attachments, CDN-enabled
    
    Provides robust error handling, connection verification,
    and support for both presigned GET and POST operations.
    """
    
    def __init__(self):
        """Initialize S3 client and verify bucket access."""
        # Validate bucket names
        self.private_bucket = getattr(settings, 'AWS_PRIVATE_BUCKET_NAME', None)
        self.public_bucket = getattr(settings, 'AWS_PUBLIC_BUCKET_NAME', None)
        
        if not self.private_bucket or not self.public_bucket:
            error_msg = (
                "AWS_PRIVATE_BUCKET_NAME and AWS_PUBLIC_BUCKET_NAME "
                "must be defined in settings"
            )
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # Get AWS configuration
        aws_access_key = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
        aws_secret_key = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)
        self.region = getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1')
        
        if not aws_access_key or not aws_secret_key:
            error_msg = (
                "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY "
                "must be configured in settings"
            )
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # Initialize S3 client
        try:
            self.s3 = boto3.client(
                's3',
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                region_name=self.region,
                config=boto3.session.Config(
                    signature_version='s3v4',
                    retries={'max_attempts': 3, 'mode': 'standard'},
                ),
            )
            
            # Verify bucket access using least-privilege operations
            # head_bucket requires s3:ListBucket permission (minimal)
            # unlike list_buckets() which requires s3:ListAllMyBuckets
            self._verify_bucket_access()
            
            logger.info(
                f"DualBucketStorage initialized: "
                f"private={self.private_bucket}, "
                f"public={self.public_bucket}, "
                f"region={self.region}"
            )
            
        except NoCredentialsError as e:
            logger.error(f"AWS credentials not found: {e}")
            raise ValueError(
                "AWS credentials not configured. "
                "Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
            )
        except ClientError as e:
            error_msg = e.response.get('Error', {}).get('Message', str(e))
            logger.error(f"S3 connection error: {error_msg}")
            raise ValueError(f"Failed to connect to S3: {error_msg}")
        except Exception as e:
            logger.error(f"Unexpected S3 initialization error: {e}")
            raise
    
    def _verify_bucket_access(self):
        """
        Verify access to both buckets using head_bucket (least privilege).
        
        Raises ValueError if buckets are not accessible.
        Uses head_bucket instead of list_buckets to avoid requiring
        s3:ListAllMyBuckets IAM permission.
        """
        for bucket_name, bucket_label in [
            (self.private_bucket, 'private'),
            (self.public_bucket, 'public'),
        ]:
            try:
                self.s3.head_bucket(Bucket=bucket_name)
                logger.debug(f"Verified access to {bucket_label} bucket: {bucket_name}")
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                error_msg = e.response.get('Error', {}).get('Message', str(e))
                
                if error_code == '404':
                    logger.error(
                        f"{bucket_label.capitalize()} bucket not found: {bucket_name}"
                    )
                    raise ValueError(
                        f"{bucket_label.capitalize()} bucket '{bucket_name}' does not exist"
                    )
                elif error_code == '403':
                    logger.error(
                        f"Access denied to {bucket_label} bucket: {bucket_name}"
                    )
                    raise ValueError(
                        f"Access denied to {bucket_label} bucket '{bucket_name}'. "
                        f"Check IAM permissions."
                    )
                else:
                    logger.error(
                        f"Cannot access {bucket_label} bucket: {error_msg}"
                    )
                    raise ValueError(
                        f"Failed to access {bucket_label} bucket '{bucket_name}': {error_msg}"
                    )
    
    def _build_url(self, bucket: str, key: str) -> str:
        """
        Build region-aware S3 object URL.
        
        Uses virtual hosted-style: https://{bucket}.s3.{region}.amazonaws.com/{key}
        This is the modern recommended format and works with CDN configurations.
        """
        return f"https://{bucket}.s3.{self.region}.amazonaws.com/{key}"
    
    def _sanitize_key(self, key: str) -> str:
        """
        Sanitize S3 object key to prevent path traversal and injection.
        
        - Removes leading slashes (absolute paths)
        - Removes double slashes
        - Prevents '../' path traversal
        - Strips null bytes
        """
        # Remove null bytes
        key = key.replace('\x00', '')
        
        # Remove leading slash (prevents absolute paths)
        key = key.lstrip('/')
        
        # Prevent path traversal
        while '../' in key:
            key = key.replace('../', '')
        
        # Remove double slashes
        while '//' in key:
            key = key.replace('//', '/')
        
        # Ensure key is not empty after sanitization
        if not key:
            raise ValueError("S3 key cannot be empty after sanitization")
        
        return key
    
    # ─── Upload Methods ───────────────────────────────────────────────────────
    
    def upload_raw_image(self, file_obj: BinaryIO, key: str) -> str:
        """
        Upload to PRIVATE bucket - NEVER publicly accessible.
        
        Args:
            file_obj: File-like object to upload
            key: S3 object key (will be sanitized)
        
        Returns:
            S3 URL of the uploaded object
        
        Raises:
            ClientError: On S3 upload failure
            ValueError: On invalid key
        """
        key = self._sanitize_key(key)
        
        try:
            self.s3.upload_fileobj(
                file_obj,
                self.private_bucket,
                key,
                ExtraArgs={
                    'ACL': 'private',
                    'ServerSideEncryption': 'AES256',
                }
            )
            url = self._build_url(self.private_bucket, key)
            logger.info(f"Raw image uploaded to private bucket: {key}")
            return url
            
        except ClientError as e:
            error_msg = e.response.get('Error', {}).get('Message', str(e))
            logger.error(f"S3 upload error for {key}: {error_msg}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error uploading raw image {key}: {e}")
            raise
    
    def upload_blurred_image(self, file_obj: BinaryIO, key: str) -> str:
        """
        Upload to PUBLIC bucket - safe for student viewing.
        
        Args:
            file_obj: File-like object to upload
            key: S3 object key (will be sanitized)
        
        Returns:
            Public S3 URL of the uploaded object
        
        Raises:
            ClientError: On S3 upload failure
            ValueError: On invalid key
        """
        key = self._sanitize_key(key)
        
        try:
            self.s3.upload_fileobj(
                file_obj,
                self.public_bucket,
                key,
                ExtraArgs={
                    'ACL': 'public-read',
                    'CacheControl': 'max-age=86400',
                }
            )
            url = self._build_url(self.public_bucket, key)
            logger.info(f"Blurred image uploaded to public bucket: {key}")
            return url
            
        except ClientError as e:
            error_msg = e.response.get('Error', {}).get('Message', str(e))
            logger.error(f"S3 upload error for {key}: {error_msg}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error uploading blurred image {key}: {e}")
            raise
    
    def upload_chat_attachment(
        self,
        file_obj: BinaryIO,
        user_id: str,
        filename: str,
        content_type: str = 'application/octet-stream',
    ) -> str:
        """
        Upload chat attachment to public bucket with organized path structure.
        
        Args:
            file_obj: File-like object to upload
            user_id: UUID of the uploading user
            filename: Original filename
            content_type: MIME type of the file
        
        Returns:
            Public S3 URL of the uploaded attachment
        
        Raises:
            ClientError: On S3 upload failure
        """
        key = f"chat_uploads/{user_id}/{uuid.uuid4()}-{filename}"
        key = self._sanitize_key(key)
        
        try:
            self.s3.upload_fileobj(
                file_obj,
                self.public_bucket,
                key,
                ExtraArgs={
                    'ACL': 'public-read',
                    'ContentType': content_type,
                    'CacheControl': 'max-age=31536000',  # 1 year for chat attachments
                }
            )
            url = self._build_url(self.public_bucket, key)
            logger.info(f"Chat attachment uploaded: {key}")
            return url
            
        except ClientError as e:
            error_msg = e.response.get('Error', {}).get('Message', str(e))
            logger.error(f"Chat attachment upload error for {key}: {error_msg}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error uploading chat attachment {key}: {e}")
            raise
    
    # ─── Delete Methods ───────────────────────────────────────────────────────
    
    def delete_raw_image(self, key: str) -> bool:
        """
        Permanently delete raw image from private bucket.
        
        Args:
            key: S3 object key
        
        Returns:
            True if successful, False otherwise
        """
        key = self._sanitize_key(key)
        
        try:
            self.s3.delete_object(Bucket=self.private_bucket, Key=key)
            logger.info(f"Raw image deleted from private bucket: {key}")
            return True
        except ClientError as e:
            error_msg = e.response.get('Error', {}).get('Message', str(e))
            logger.error(f"S3 delete error for {key}: {error_msg}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error deleting raw image {key}: {e}")
            return False
    
    def delete_blurred_image(self, key: str) -> bool:
        """
        Permanently delete blurred image from public bucket.
        
        Args:
            key: S3 object key
        
        Returns:
            True if successful, False otherwise
        """
        key = self._sanitize_key(key)
        
        try:
            self.s3.delete_object(Bucket=self.public_bucket, Key=key)
            logger.info(f"Blurred image deleted from public bucket: {key}")
            return True
        except ClientError as e:
            error_msg = e.response.get('Error', {}).get('Message', str(e))
            logger.error(f"S3 delete error for {key}: {error_msg}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error deleting blurred image {key}: {e}")
            return False
    
    def delete_chat_attachment(self, key: str) -> bool:
        """
        Delete chat attachment from public bucket.
        
        Args:
            key: S3 object key
        
        Returns:
            True if successful, False otherwise
        """
        return self.delete_blurred_image(key)
    
    # ─── Presigned URL Methods ────────────────────────────────────────────────
    
    def generate_presigned_get_url(
        self,
        key: str,
        expiration: int = 300,
        bucket_type: str = 'private',
    ) -> Optional[str]:
        """
        Generate temporary presigned GET URL for downloading objects.
        Used for admin review of private bucket contents.
        
        Args:
            key: S3 object key
            expiration: URL expiration in seconds (default: 5 minutes)
            bucket_type: 'private' or 'public'
        
        Returns:
            Presigned URL string or None on failure
        
        Note:
            This URL provides temporary access and must be refreshed after expiry.
        """
        key = self._sanitize_key(key)
        bucket = self.private_bucket if bucket_type == 'private' else self.public_bucket
        
        try:
            url = self.s3.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': bucket,
                    'Key': key,
                },
                ExpiresIn=expiration,
            )
            logger.debug(
                f"Presigned GET URL generated for {key} "
                f"(bucket={bucket_type}, expires={expiration}s)"
            )
            return url
            
        except ClientError as e:
            error_msg = e.response.get('Error', {}).get('Message', str(e))
            logger.error(f"Failed to generate presigned GET URL for {key}: {error_msg}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error generating presigned GET URL for {key}: {e}")
            return None
    
    def generate_presigned_post_url(
        self,
        key: str,
        content_type: str,
        max_size: int = 10 * 1024 * 1024,  # 10 MB
        expiration: int = 3600,              # 1 hour
        bucket_type: str = 'public',
    ) -> Dict[str, Any]:
        """
        Generate presigned POST URL and form fields for direct S3 uploads.
        
        Used by:
        - Chat attachment upload flow (chat/api.py)
        - ID image upload flow (accounts)
        - Any client-side direct S3 upload
        
        Args:
            key: S3 object key (path where file will be stored)
            content_type: MIME type of the file to be uploaded
            max_size: Maximum file size in bytes (default: 10 MB)
            expiration: URL expiration in seconds (default: 1 hour)
            bucket_type: 'public' or 'private'
        
        Returns:
            dict with:
                - 'url': S3 bucket URL for POST request
                - 'fields': Form fields required for S3 POST
                - 'file_url': Final public URL after successful upload
        
        Raises:
            ClientError: On S3 API failure
            ValueError: On invalid parameters
        
        Example usage (frontend):
            const formData = new FormData();
            Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
            formData.append('file', file);
            await fetch(url, { method: 'POST', body: formData });
        """
        key = self._sanitize_key(key)
        bucket = self.public_bucket if bucket_type == 'public' else self.private_bucket
        
        # Build conditions for the presigned POST
        conditions = [
            {"Content-Type": content_type},
            ["content-length-range", 1, max_size],
        ]
        
        # For public uploads, set the ACL condition
        if bucket_type == 'public':
            conditions.append({"acl": "public-read"})
        
        try:
            presigned = self.s3.generate_presigned_post(
                Bucket=bucket,
                Key=key,
                Fields={
                    "Content-Type": content_type,
                },
                Conditions=conditions,
                ExpiresIn=expiration,
            )
            
            file_url = self._build_url(bucket, key)
            
            logger.debug(
                f"Presigned POST URL generated for {key} "
                f"(bucket={bucket_type}, content_type={content_type}, "
                f"max_size={max_size}, expires={expiration}s)"
            )
            
            return {
                'url': presigned['url'],
                'fields': presigned['fields'],
                'file_url': file_url,
            }
            
        except ClientError as e:
            error_msg = e.response.get('Error', {}).get('Message', str(e))
            logger.error(f"Failed to generate presigned POST URL for {key}: {error_msg}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error generating presigned POST URL for {key}: {e}")
            raise
    
    def generate_presigned_url(self, key: str, expiration: int = 300) -> Optional[str]:
        """
        Legacy method for backward compatibility.
        Generates presigned GET URL for private bucket.
        
        Args:
            key: S3 object key
            expiration: URL expiration in seconds (default: 5 minutes)
        
        Returns:
            Presigned URL string or None on failure
        
        Note:
            Prefer generate_presigned_get_url() for new code.
            This method always uses the private bucket.
        """
        return self.generate_presigned_get_url(
            key=key,
            expiration=expiration,
            bucket_type='private',
        )
    
    # ─── Metadata Methods ─────────────────────────────────────────────────────
    
    def get_object_metadata(
        self,
        key: str,
        bucket_type: str = 'private',
    ) -> Optional[Dict[str, Any]]:
        """
        Get metadata for an S3 object.
        
        Args:
            key: S3 object key
            bucket_type: 'private' or 'public'
        
        Returns:
            dict with 'size', 'last_modified', 'content_type', 'etag'
            or None if object not found or on error
        """
        key = self._sanitize_key(key)
        bucket = self.private_bucket if bucket_type == 'private' else self.public_bucket
        
        try:
            response = self.s3.head_object(Bucket=bucket, Key=key)
            return {
                'size': response.get('ContentLength', 0),
                'last_modified': response.get('LastModified'),
                'content_type': response.get('ContentType', 'application/octet-stream'),
                'etag': response.get('ETag', '').strip('"'),
                'storage_class': response.get('StorageClass', 'STANDARD'),
            }
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            if error_code == '404':
                logger.debug(f"Object not found: {key} (bucket={bucket_type})")
            else:
                error_msg = e.response.get('Error', {}).get('Message', str(e))
                logger.error(f"Failed to get metadata for {key}: {error_msg}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error getting metadata for {key}: {e}")
            return None
    
    def object_exists(self, key: str, bucket_type: str = 'private') -> bool:
        """
        Check if an object exists in S3.
        
        Args:
            key: S3 object key
            bucket_type: 'private' or 'public'
        
        Returns:
            True if object exists and is accessible, False otherwise
        """
        return self.get_object_metadata(key, bucket_type) is not None
    
    def get_object_size(self, key: str, bucket_type: str = 'private') -> Optional[int]:
        """
        Get the size of an S3 object in bytes.
        
        Args:
            key: S3 object key
            bucket_type: 'private' or 'public'
        
        Returns:
            Object size in bytes or None if not found
        """
        metadata = self.get_object_metadata(key, bucket_type)
        return metadata['size'] if metadata else None
    
    # ─── Bulk Operations ──────────────────────────────────────────────────────
    
    def delete_multiple_objects(
        self,
        keys: list,
        bucket_type: str = 'public',
    ) -> Dict[str, Any]:
        """
        Delete multiple objects in a single request (up to 1000).
        
        Args:
            keys: List of S3 object keys to delete
            bucket_type: 'private' or 'public'
        
        Returns:
            dict with 'deleted' count and 'errors' list
        """
        if not keys:
            return {'deleted': 0, 'errors': []}
        
        if len(keys) > 1000:
            logger.warning(
                f"Batch delete limited to 1000 keys, received {len(keys)}"
            )
            keys = keys[:1000]
        
        bucket = self.private_bucket if bucket_type == 'private' else self.public_bucket
        sanitized_keys = [self._sanitize_key(k) for k in keys]
        
        try:
            objects = [{'Key': k} for k in sanitized_keys]
            response = self.s3.delete_objects(
                Bucket=bucket,
                Delete={'Objects': objects, 'Quiet': True},
            )
            
            deleted = len(sanitized_keys)
            errors = response.get('Errors', [])
            
            if errors:
                logger.warning(
                    f"Batch delete: {deleted - len(errors)} succeeded, "
                    f"{len(errors)} failed (bucket={bucket_type})"
                )
            else:
                logger.info(f"Batch delete: {deleted} objects deleted (bucket={bucket_type})")
            
            return {
                'deleted': deleted - len(errors),
                'errors': [
                    {'key': e['Key'], 'code': e['Code'], 'message': e['Message']}
                    for e in errors
                ],
            }
            
        except ClientError as e:
            error_msg = e.response.get('Error', {}).get('Message', str(e))
            logger.error(f"Batch delete failed: {error_msg}")
            return {'deleted': 0, 'errors': [{'key': 'batch', 'message': error_msg}]}
        except Exception as e:
            logger.error(f"Unexpected batch delete error: {e}")
            return {'deleted': 0, 'errors': [{'key': 'batch', 'message': str(e)}]}