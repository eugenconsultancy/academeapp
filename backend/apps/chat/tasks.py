# backend/apps/chat/tasks.py
"""
Background tasks for the chat application.
Uses Celery with Redis broker.

Tasks:
  - send_bulk_message: Admin sends message to filtered users via shared conversation
  - send_push_notification_task: Wrapper for push notification dispatch (retryable)
  - cleanup_old_attachments: Clear file fields from old messages
  - sync_block_cache: Rebuild Redis block sets from database
  - cleanup_stale_presence: Remove stale online presence keys
  - cleanup_expired_device_tokens: Deactivate invalid FCM tokens
"""

import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.db.models import F, Q
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django_redis import get_redis_connection
from django.conf import settings

from .models import (
    Conversation, ConversationParticipant, Message, BlockList,
    BulkMessageTask, DeviceToken, MessageStatus,
)
from .notifications import send_push_notification
from .schemas import MessageOut

User = get_user_model()
logger = logging.getLogger('apps.chat')


# ─── Redis Helper ─────────────────────────────────────────────────────────────

def _redis():
    """Get raw Redis connection."""
    return get_redis_connection("default")


def _is_user_online(user_id) -> bool:
    """Check if user is online via Redis presence key."""
    r = _redis()
    return r.exists(f"user_online_{user_id}")


# ─── Bulk Message Task ────────────────────────────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_bulk_message(self, filter_params: dict, content: str, sender_id: str, task_id: str = None):
    """
    Send a bulk message to users filtered by criteria.
    
    Creates a group conversation with all matching users as participants,
    sends one message, updates unread counts, broadcasts via WebSocket,
    and sends push notifications to offline recipients.
    
    Args:
        filter_params: Dict with optional keys: 'class', 'school', 'user_ids'
        content: Message content text
        sender_id: UUID string of the sending admin user
        task_id: Optional UUID string of BulkMessageTask for progress tracking
    
    Returns:
        dict with total, success, conversation_id
    """
    # Update task record if provided
    if task_id:
        try:
            task_record = BulkMessageTask.objects.get(id=task_id)
            task_record.status = 'processing'
            task_record.save(update_fields=['status', 'updated_at'])
        except BulkMessageTask.DoesNotExist:
            task_record = None
    else:
        task_record = None

    try:
        sender = User.objects.get(id=sender_id)
    except User.DoesNotExist:
        if task_record:
            task_record.mark_failed([f"Sender {sender_id} not found"])
        return {'error': 'Sender not found'}

    # Filter users
    users_qs = User.objects.filter(is_active=True)
    
    if 'class' in filter_params:
        users_qs = users_qs.filter(class_name=filter_params['class'])
    if 'school' in filter_params:
        users_qs = users_qs.filter(institution=filter_params['school'])
    if 'user_ids' in filter_params:
        users_qs = users_qs.filter(id__in=filter_params['user_ids'])

    target_user_ids = list(users_qs.values_list('id', flat=True))
    
    if not target_user_ids:
        if task_record:
            task_record.mark_completed(0, 0)
        return {'total': 0, 'success': 0, 'message': 'No matching users found'}

    total = len(target_user_ids)
    
    if task_record:
        task_record.total_recipients = total
        task_record.save(update_fields=['total_recipients', 'updated_at'])

    # Create a group conversation for this announcement
    conv = Conversation.objects.create(
        is_group=True,
        group_name=f"Announcement - {timezone.now().strftime('%Y-%m-%d %H:%M')}",
    )

    # Bulk create participants (sender + all targets)
    participants = [ConversationParticipant(conversation=conv, user=sender)]
    for uid in target_user_ids:
        if str(uid) != str(sender_id):
            participants.append(ConversationParticipant(conversation=conv, user_id=uid))

    ConversationParticipant.objects.bulk_create(
        participants,
        ignore_conflicts=True,
        batch_size=500,
    )

    # Create the announcement message
    msg = Message.objects.create(
        conversation=conv,
        sender=sender,
        content=content,
        msg_type='TEXT',
        status=MessageStatus.SENT,
    )

    # Update conversation denormalized fields
    conv.last_message_content = content[:200]
    conv.last_message_at = msg.created_at
    conv.last_message_sender = sender
    conv.save(update_fields=[
        'last_message_content', 'last_message_at', 'last_message_sender'
    ])

    # Increment unread count for all recipients (excluding sender)
    ConversationParticipant.objects.filter(
        conversation=conv
    ).exclude(user=sender).update(
        unread_count=F('unread_count') + 1
    )

    # Broadcast via WebSocket to the conversation group
    try:
        channel_layer = get_channel_layer()
        message_out = MessageOut.from_message(msg)
        async_to_sync(channel_layer.group_send)(
            f"chat_{conv.id}",
            {
                'type': 'chat_message',
                'message': message_out.model_dump(),
            }
        )
    except Exception as e:
        logger.error(f"WebSocket broadcast failed for bulk message: {e}")

    # Send push notifications to offline users
    push_success = 0
    push_failed = 0
    for uid in target_user_ids:
        if str(uid) != str(sender_id) and not _is_user_online(uid):
            try:
                result = send_push_notification(
                    user_id=uid,
                    title="New Announcement",
                    body=content[:100],
                )
                if result and result.get('success_count', 0) > 0:
                    push_success += 1
                else:
                    push_failed += 1
            except Exception as e:
                logger.warning(f"Push notification failed for user {uid}: {e}")
                push_failed += 1

    logger.info(
        f"Bulk message sent: {total} recipients, "
        f"conversation={conv.id}, "
        f"push_success={push_success}, push_failed={push_failed}"
    )

    if task_record:
        task_record.mark_completed(total, 0)

    return {
        'total': total,
        'success': total,
        'conversation_id': str(conv.id),
        'push_success': push_success,
        'push_failed': push_failed,
    }


# ─── Push Notification Task ───────────────────────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_push_notification_task(self, user_id: str, title: str, body: str, data: dict = None):
    """
    Retryable wrapper for push notification sending.
    Used when notifications should be queued rather than sent inline.
    """
    try:
        result = send_push_notification(
            user_id=user_id,
            title=title,
            body=body,
            data=data,
        )
        if result is None:
            return {'status': 'disabled', 'user_id': user_id}
        return {
            'status': 'sent',
            'user_id': user_id,
            'success_count': result.get('success_count', 0),
            'failure_count': result.get('failure_count', 0),
        }
    except Exception as exc:
        logger.error(f"Push notification task failed for user {user_id}: {exc}")
        try:
            self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            logger.error(f"Max retries exceeded for push notification to user {user_id}")
            return {'status': 'failed', 'user_id': user_id, 'error': str(exc)}


# ─── Cleanup Tasks ────────────────────────────────────────────────────────────

@shared_task
def cleanup_old_attachments(months: int = 6):
    """
    Clear file-related fields from messages older than specified months.
    
    Since files are stored inline on the Message model (not separate Attachment model),
    this clears file_url, file_name, file_size, file_mime_type, and thumbnail_url
    from old messages to free up storage references.
    
    Args:
        months: Age threshold in months (default: 6)
    """
    cutoff = timezone.now() - timedelta(days=30 * months)
    
    updated = Message.objects.filter(
        created_at__lt=cutoff
    ).exclude(
        Q(file_url='') & Q(file_name='')
    ).update(
        file_url='',
        file_name='',
        file_size=None,
        file_mime_type='',
        thumbnail_url='',
    )
    
    logger.info(f"Cleaned file fields on {updated} messages older than {months} months")
    return f"Cleaned file fields on {updated} messages."


@shared_task
def cleanup_expired_device_tokens():
    """
    Deactivate DeviceToken entries that have not been updated in 60 days.
    Also clear User.fcm_token for users with inactive accounts.
    """
    cutoff = timezone.now() - timedelta(days=60)
    
    # Deactivate stale device tokens
    deactivated = DeviceToken.objects.filter(
        is_active=True,
        updated_at__lt=cutoff,
    ).update(is_active=False)
    
    # Clear FCM tokens for inactive users
    cleared = User.objects.filter(
        is_active=False,
    ).exclude(fcm_token='').update(fcm_token='')
    
    logger.info(f"Deactivated {deactivated} stale device tokens, cleared {cleared} inactive user tokens")
    return f"Tokens cleaned: {deactivated} deactivated, {cleared} cleared"


# ─── Block Cache Synchronization ──────────────────────────────────────────────

@shared_task
def sync_block_cache():
    """
    Rebuild Redis block sets from the database.
    
    Should be run:
    - After Redis cache flush/restart
    - Periodically (daily) to ensure consistency
    - On application startup
    
    Uses Redis pipeline for efficient batch operations.
    """
    r = _redis()
    blocks = BlockList.objects.all()
    block_count = blocks.count()
    
    if block_count == 0:
        # Clear all existing block keys
        deleted = 0
        for key in r.scan_iter("blocked:*"):
            r.delete(key)
            deleted += 1
        logger.info(f"Block cache cleared: {deleted} keys removed (0 blocks in DB)")
        return f"Cache cleared. No blocks in database."
    
    # Use pipeline for batch operations
    pipe = r.pipeline()
    
    # Delete existing block keys
    keys_to_delete = []
    for key in r.scan_iter("blocked:*"):
        keys_to_delete.append(key)
    
    if keys_to_delete:
        pipe.delete(*keys_to_delete)
    
    # Rebuild all block sets
    blocker_sets = {}
    for block in blocks:
        blocker_id = str(block.blocker_id)
        blocked_id = str(block.blocked_user_id)
        if blocker_id not in blocker_sets:
            blocker_sets[blocker_id] = []
        blocker_sets[blocker_id].append(blocked_id)
    
    for blocker_id, blocked_ids in blocker_sets.items():
        pipe.sadd(f"blocked:{blocker_id}", *blocked_ids)
    
    pipe.execute()
    
    logger.info(f"Block cache synced: {len(blocker_sets)} blocker sets, {block_count} total blocks")
    return f"Synced {block_count} blocks across {len(blocker_sets)} blocker sets."


@shared_task
def sync_block_cache_for_user(user_id: str):
    """
    Rebuild Redis block set for a specific user.
    Useful after block/unblock operations or cache inconsistencies.
    
    Args:
        user_id: UUID string of the blocker user
    """
    r = _redis()
    key = f"blocked:{user_id}"
    
    # Clear existing set
    r.delete(key)
    
    # Rebuild from database
    blocked_ids = BlockList.objects.filter(
        blocker_id=user_id
    ).values_list('blocked_user_id', flat=True)
    
    blocked_list = list(blocked_ids)
    if blocked_list:
        r.sadd(key, *[str(bid) for bid in blocked_list])
    
    logger.info(f"Block cache synced for user {user_id}: {len(blocked_list)} blocked users")
    return f"Synced {len(blocked_list)} blocks for user {user_id}."


# ─── Presence Cleanup ─────────────────────────────────────────────────────────

@shared_task
def cleanup_stale_presence():
    """
    Remove stale online presence keys from Redis.
    
    Normally Redis TTL handles this automatically, but this task
    provides a safety net for keys that may have lost their TTL
    due to Redis configuration issues or manual operations.
    
    Checks user_online_* keys and removes any that don't have
    a corresponding active WebSocket connection.
    """
    r = _redis()
    cleaned = 0
    
    for key in r.scan_iter("user_online_*"):
        # Check if key has TTL (Redis automatically expires these)
        ttl = r.ttl(key)
        if ttl == -1:  # No TTL set - stale key
            r.delete(key)
            cleaned += 1
            logger.debug(f"Removed stale presence key: {key}")
    
    if cleaned > 0:
        logger.info(f"Cleaned {cleaned} stale presence keys")
    
    return f"Cleaned {cleaned} stale presence keys."


# ─── Conversation Cleanup ─────────────────────────────────────────────────────

@shared_task
def cleanup_empty_conversations():
    """
    Delete conversations that have no messages and only one participant
    (orphaned conversations from abandoned chat creation).
    """
    from django.db.models import Count
    
    cutoff = timezone.now() - timedelta(days=7)
    
    empty_convs = Conversation.objects.annotate(
        msg_count=Count('messages'),
        participant_count=Count('participants'),
    ).filter(
        msg_count=0,
        participant_count__lte=1,
        created_at__lt=cutoff,
    )
    
    count = empty_convs.count()
    empty_convs.delete()
    
    logger.info(f"Cleaned up {count} empty conversations")
    return f"Deleted {count} empty conversations."


# ─── Message Read Receipt Cleanup ─────────────────────────────────────────────

@shared_task
def cleanup_old_read_receipts(days: int = 90):
    """
    Remove MessageReadReceipt entries older than specified days.
    Read receipts are only needed for recent group chat activity.
    
    Args:
        days: Age threshold in days (default: 90)
    """
    from .models import MessageReadReceipt
    
    cutoff = timezone.now() - timedelta(days=days)
    deleted, _ = MessageReadReceipt.objects.filter(
        read_at__lt=cutoff
    ).delete()
    
    logger.info(f"Cleaned {deleted} old read receipts (older than {days} days)")
    return f"Deleted {deleted} read receipts."