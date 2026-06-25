# backend/apps/chat/services.py
"""
Presence Service for Chat.
Uses Redis (cache) for real‑time online status, with a DB fallback
for historical accuracy and reporting.
"""

import logging
from datetime import timedelta
from django.core.cache import cache
from django.utils import timezone
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()
logger = logging.getLogger(__name__)

# ── Configurable timeout ─────────────────────────────────────────────────
ONLINE_CACHE_TIMEOUT = getattr(settings, 'PRESENCE_ONLINE_TIMEOUT_SECONDS', 120)   # 2 min
LAST_SEEN_CACHE_TIMEOUT = getattr(settings, 'PRESENCE_LAST_SEEN_TIMEOUT_SECONDS', 3600)  # 1 hour


class PresenceService:
    """
    Service‑level wrapper for user presence.
    All online status checks should go through this, never raw Redis/DB.
    """

    # ═══════════════════════════════════════════════════════════════
    # ONLINE STATUS
    # ═══════════════════════════════════════════════════════════════
    @staticmethod
    def mark_online(user_id):
        """
        Set user as online in Redis (and optionally update DB eventually).
        Called on any authenticated activity (WebSocket connect, page load, etc.)
        """
        try:
            cache.set(f'user_online_{user_id}', True, timeout=ONLINE_CACHE_TIMEOUT)
        except Exception as e:
            logger.warning(f"Redis set for online failed: {e}")

        # Update the DB field asynchronously (for fallback & reporting)
        # Use update instead of save to avoid race conditions; we only set True.
        User.objects.filter(id=user_id).update(is_online=True, last_activity=timezone.now())

    @staticmethod
    def mark_offline(user_id):
        """
        Clear online status from Redis and update DB.
        Called on WebSocket disconnect, logout, etc.
        """
        try:
            cache.delete(f'user_online_{user_id}')
        except Exception:
            pass
        User.objects.filter(id=user_id).update(is_online=False)

    @staticmethod
    def is_online(user_id) -> bool:
        """
        Check if a user is currently online.
        1. Try Redis first (fast).
        2. Fallback to DB field.
        """
        try:
            if cache.get(f'user_online_{user_id}'):
                return True
        except Exception:
            pass   # Redis unavailable, continue to DB
        user = User.objects.filter(id=user_id).first()
        return getattr(user, 'is_online', False)

    # ═══════════════════════════════════════════════════════════════
    # LAST SEEN (per conversation)
    # ═══════════════════════════════════════════════════════════════
    @staticmethod
    def update_last_seen(user_id, conversation_id):
        """
        Record the user's last seen timestamp for a specific conversation.
        Stored in Redis (volatile) for low‑latency access.
        """
        now = timezone.now()
        try:
            cache.set(
                f'last_seen:{user_id}:{conversation_id}',
                now,
                timeout=LAST_SEEN_CACHE_TIMEOUT
            )
        except Exception:
            pass
        # Optionally schedule a DB update task here if required

    @staticmethod
    def get_last_seen(user_id, conversation_id):
        """
        Retrieve the last seen timestamp for a conversation.
        Returns a datetime or None.
        """
        try:
            ts = cache.get(f'last_seen:{user_id}:{conversation_id}')
            return ts
        except Exception:
            return None

    # ═══════════════════════════════════════════════════════════════
    # BULK ONLINE STATUS
    # ═══════════════════════════════════════════════════════════════
    @staticmethod
    def get_online_users(user_ids):
        """
        Efficiently check online status for a list of user IDs.
        Returns a dictionary {user_id: bool}.
        """
        online_map = {}
        # Batch fetch from cache if possible
        for uid in user_ids:
            online_map[uid] = PresenceService.is_online(uid)
        return online_map