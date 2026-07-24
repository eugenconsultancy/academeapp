# backend/apps/chat/notifications.py
"""
Push notification integration using Firebase Cloud Mesging (FCM).
Supports multi-device via DeviceToken model with fallback to User.fcm_token.

Usage:
    from apps.chat.notifications import send_push_notification
    send_push_notification(user_id, "Title", "Body", data={})
"""

import logging
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()
logger = logging.getLogger('apps.chat')

# ─── Module-level state ──────────────────────────────────────────────────────
_firebase_initialized = False
FCM_ENABLED = getattr(settings, 'FCM_ENABLED', False)


def _init_firebase() -> bool:
    """
    Initialize Firebase Admin SDK if credentials are configured.
    Returns True if initialization succeeded, False otherwise.
    Thread-safe: only initializes once.
    """
    global _firebase_initialized

    if _firebase_initialized:
        return True

    if not FCM_ENABLED:
        logger.debug("FCM is disabled (FCM_ENABLED=False). Push notifications skipped.")
        return False

    try:
        import firebase_admin
        from firebase_admin import credentials

        cred_path = getattr(settings, 'FIREBASE_CREDENTIALS', None)
        if not cred_path:
            logger.warning("FCM_ENABLED=True but FIREBASE_CREDENTIALS not set.")
            return False

        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        logger.info("Firebase Admin SDK initialized successfully.")
        return True

    except ImportError:
        logger.error(
            "firebase-admin package not installed. "
            "Install with: pip install firebase-admin"
        )
        return False
    except FileNotFoundError:
        logger.error(
            f"Firebase credentials file not found at: {cred_path}"
        )
        return False
    except Exception as e:
        logger.error(f"Firebase initialization failed: {e}")
        return False


def send_push_notification(user_id, title: str, body: str, data: dict = None):
    """
    Send a push notification to all devices of a user.

    Priority:
        1. DeviceToken model entries (multi-device support)
        2. User.fcm_token fallback (single device, legacy)

    Args:
        user_id: User ID (UUID or int, depending on User model)
        title: Notification title
        body: Notification body text
        data: Optional dict of custom key-value pairs for the notification payload

    Returns:
        dict with success_count and failure_count, or None if FCM is disabled
    """
    if not _init_firebase():
        logger.debug(
            f"Push notification skipped for user {user_id}: "
            f"{title} - {body[:50]}"
        )
        return None

    from firebase_admin import messaging

    tokens = []

    # ── Priority 1: DeviceToken model (multi-device) ─────────────────────────
    try:
        from .models import DeviceToken

        device_tokens = DeviceToken.objects.filter(
            user_id=user_id,
            is_active=True,
        ).values_list('token', flat=True)

        tokens.extend(device_tokens)
        if tokens:
            logger.debug(
                f"Found {len(tokens)} DeviceToken(s) for user {user_id}"
            )
    except ImportError:
        logger.debug("DeviceToken model not available, falling back to User.fcm_token")
    except Exception as e:
        logger.warning(f"DeviceToken query failed: {e}")

    # ── Priority 2: User.fcm_token (legacy single-device) ────────────────────
    if not tokens:
        try:
            user = User.objects.filter(id=user_id).first()
            if user and user.fcm_token:
                tokens.append(user.fcm_token)
                logger.debug(f"Using User.fcm_token for user {user_id}")
        except Exception as e:
            logger.warning(f"User.fcm_token query failed: {e}")

    if not tokens:
        logger.debug(f"No FCM tokens found for user {user_id}")
        return {'success_count': 0, 'failure_count': 0}

    # Remove duplicates while preserving order
    tokens = list(dict.fromkeys(tokens))

    # ── Send multicast message ────────────────────────────────────────────────
    try:
        message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=data or {},
            tokens=tokens,
        )

        response = messaging.send_multicast(message)

        # ── Handle failed tokens ─────────────────────────────────────────────
        invalid_tokens = []
        for idx, resp in enumerate(response.responses):
            if not resp.success:
                token = tokens[idx]
                exception_str = str(resp.exception).lower() if resp.exception else ''

                if any(err in exception_str for err in [
                    'not-registered', 'invalid-argument', 'mismatched-credential',
                    'invalid-registration', 'unregistered',
                ]):
                    invalid_tokens.append(token)
                    logger.info(f"Marking token as invalid: {token[:20]}... ({exception_str[:100]})")

        # Deactivate invalid tokens
        if invalid_tokens:
            _deactivate_tokens(invalid_tokens)

        logger.info(
            f"Push notification sent to user {user_id}: "
            f"{response.success_count} success, {response.failure_count} failure "
            f"(title: {title})"
        )

        return {
            'success_count': response.success_count,
            'failure_count': response.failure_count,
        }

    except Exception as e:
        logger.error(f"Push notification send failed: {e}")
        return {'success_count': 0, 'failure_count': len(tokens), 'error': str(e)}


def _deactivate_tokens(tokens: list):
    """
    Deactivate invalid FCM tokens to prevent future send failures.
    Attempts DeviceToken model first, then clears User.fcm_token.
    """
    try:
        from .models import DeviceToken

        updated = DeviceToken.objects.filter(token__in=tokens).update(
            is_active=False
        )
        logger.info(f"Deactivated {updated} invalid DeviceToken(s)")
    except (ImportError, Exception) as e:
        logger.debug(f"DeviceToken deactivation skipped: {e}")

    # Also clear matching User.fcm_token entries
    try:
        User.objects.filter(fcm_token__in=tokens).update(fcm_token='')
        logger.info(f"Cleared {len(tokens)} matching User.fcm_token(s)")
    except Exception as e:
        logger.debug(f"User.fcm_token cleanup skipped: {e}")


def send_bulk_push_notification(user_ids: list, title: str, body: str, data: dict = None):
    """
    Send push notification to multiple users.
    Useful for admin announcements.

    Args:
        user_ids: List of user IDs
        title: Notification title
        body: Notification body text
        data: Optional dict of custom key-value pairs

    Returns:
        dict with total_users, success_count, failure_count
    """
    if not _init_firebase():
        return None

    from firebase_admin import messaging

    all_tokens = []

    # Collect tokens from DeviceToken model
    try:
        from .models import DeviceToken
        device_tokens = DeviceToken.objects.filter(
            user_id__in=user_ids,
            is_active=True,
        ).values_list('token', flat=True)
        all_tokens.extend(device_tokens)
    except (ImportError, Exception):
        pass

    # Collect tokens from User.fcm_token
    try:
        user_tokens = User.objects.filter(
            id__in=user_ids,
        ).exclude(fcm_token='').values_list('fcm_token', flat=True)
        all_tokens.extend(user_tokens)
    except Exception:
        pass

    # Deduplicate
    all_tokens = list(dict.fromkeys(all_tokens))

    if not all_tokens:
        logger.debug(f"No tokens found for bulk notification to {len(user_ids)} users")
        return {'total_users': len(user_ids), 'success_count': 0, 'failure_count': 0}

    # Firebase limits multicast to 500 tokens per message
    batch_size = 500
    total_success = 0
    total_failure = 0

    for i in range(0, len(all_tokens), batch_size):
        batch = all_tokens[i:i + batch_size]
        try:
            message = messaging.MulticastMessage(
                notification=messaging.Notification(title=title, body=body),
                data=data or {},
                tokens=batch,
            )
            response = messaging.send_multicast(message)
            total_success += response.success_count
            total_failure += response.failure_count
        except Exception as e:
            logger.error(f"Bulk push batch failed: {e}")
            total_failure += len(batch)

    logger.info(
        f"Bulk push sent to {len(user_ids)} users: "
        f"{total_success} success, {total_failure} failure"
    )

    return {
        'total_users': len(user_ids),
        'success_count': total_success,
        'failure_count': total_failure,
    }