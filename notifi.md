C:\Users\GATARA-BJTU\academe\backend\apps\notifications\api.py;;;from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
from ninja import Router
from pydantic import BaseModel, Field
from common.jwt_auth import JWTAuth
from .models import Notification, NotificationPreference
from .services import NotificationService

router = Router()

# ── Schemas ──────────────────────────────────────────────
class NotificationOut(BaseModel):
    id: UUID
    title: str
    message: str
    type: str = Field(alias='notification_type')
    is_read: bool
    is_deleted: bool
    created_at: datetime
    link: str
    source_type: Optional[str] = None
    source_id: Optional[UUID] = None

    class Config:
        from_attributes = True


class NotificationPage(BaseModel):
    results: List[NotificationOut]
    next_cursor: Optional[str] = None


class MarkReadOut(BaseModel):
    notification: NotificationOut
    message: str


class UnreadCountOut(BaseModel):
    unread_count: int


class MarkAllReadIn(BaseModel):
    before: Optional[datetime] = None


class BulkMarkReadIn(BaseModel):
    notification_ids: List[UUID]


class PreferenceOut(BaseModel):
    push_announcement: bool
    push_class: bool
    push_found_item: bool
    push_opportunity: bool
    push_support: bool
    push_governance: bool
    push_system: bool

    class Config:
        from_attributes = True


class PreferenceIn(BaseModel):
    push_announcement: Optional[bool] = None
    push_class: Optional[bool] = None
    push_found_item: Optional[bool] = None
    push_opportunity: Optional[bool] = None
    push_support: Optional[bool] = None
    push_governance: Optional[bool] = None
    push_system: Optional[bool] = None


# ── Helpers ─────────────────────────────────────────────
def serialize_notification(notification: Notification) -> dict:
    return {
        "id": str(notification.id),
        "title": notification.title,
        "message": notification.message,
        "type": notification.notification_type,
        "is_read": notification.is_read,
        "is_deleted": notification.is_deleted,
        "created_at": notification.created_at.isoformat(),
        "link": notification.link,
        "source_type": notification.source_type,
        "source_id": str(notification.source_id) if notification.source_id else None,
    }


# ═══════════════════════════════════════════════════════════
# LIST NOTIFICATIONS (cursor-based pagination)
# ═══════════════════════════════════════════════════════════
@router.get("/", auth=JWTAuth(), response=NotificationPage, tags=["Notifications"])
def list_notifications(
    request,
    unread_only: bool = False,
    page_size: int = 20,
    cursor: Optional[str] = None,
):
    user = request.auth
    qs = Notification.objects.filter(user=user, is_deleted=False).order_by('-created_at')
    if unread_only:
        qs = qs.filter(is_read=False)

    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
            if cursor_dt.tzinfo is None:
                cursor_dt = cursor_dt.replace(tzinfo=timezone.utc)
            qs = qs.filter(created_at__lt=cursor_dt)
        except (ValueError, TypeError):
            pass

    items = list(qs[:page_size + 1])
    has_next = len(items) > page_size
    results = items[:page_size]

    next_cursor = None
    if has_next and results:
        next_cursor = results[-1].created_at.isoformat()

    return NotificationPage(
        results=[NotificationOut.from_orm(n) for n in results],
        next_cursor=next_cursor,
    )


# ═══════════════════════════════════════════════════════════
# UNREAD COUNT
# ═══════════════════════════════════════════════════════════
@router.get("/unread-count/", auth=JWTAuth(), response=UnreadCountOut, tags=["Notifications"])
def unread_count(request):
    user = request.auth
    count = Notification.objects.filter(user=user, is_read=False, is_deleted=False).count()
    return {"unread_count": count}


# ═══════════════════════════════════════════════════════════
# MARK SINGLE AS READ
# ═══════════════════════════════════════════════════════════
@router.post("/{notification_id}/read/", auth=JWTAuth(), response=MarkReadOut, tags=["Notifications"])
def mark_as_read(request, notification_id: UUID):
    user = request.auth
    try:
        notif = Notification.objects.get(id=notification_id, user=user, is_deleted=False)
        if not notif.is_read:
            notif.is_read = True
            notif.save(update_fields=['is_read'])
        return {
            "notification": NotificationOut.from_orm(notif),
            "message": "Marked as read" if notif.is_read else "Already read"
        }
    except Notification.DoesNotExist:
        return {"error": "Notification not found"}, 404


# ═══════════════════════════════════════════════════════════
# MARK ALL AS READ
# ═══════════════════════════════════════════════════════════
@router.post("/mark-all-read/", auth=JWTAuth(), response={200: dict}, tags=["Notifications"])
def mark_all_read(request, body: MarkAllReadIn = MarkAllReadIn()):
    user = request.auth
    qs = Notification.objects.filter(user=user, is_read=False, is_deleted=False)
    if body.before:
        qs = qs.filter(created_at__lt=body.before)
    updated_count = qs.update(is_read=True)
    return {"message": f"Marked {updated_count} notifications as read"}


# ═══════════════════════════════════════════════════════════
# BULK MARK AS READ
# ═══════════════════════════════════════════════════════════
@router.post("/bulk-mark-read/", auth=JWTAuth(), response={200: dict}, tags=["Notifications"])
def bulk_mark_read(request, body: BulkMarkReadIn):
    user = request.auth
    if user.role == 'admin':
        qs = Notification.objects.filter(id__in=body.notification_ids, is_deleted=False)
    else:
        qs = Notification.objects.filter(id__in=body.notification_ids, user=user, is_deleted=False)
    count = qs.update(is_read=True)
    return {"message": f"Marked {count} notifications as read"}


# ═══════════════════════════════════════════════════════════
# DELETE (SOFT) NOTIFICATION
# ═══════════════════════════════════════════════════════════
@router.delete("/{notification_id}/", auth=JWTAuth(), response={200: dict}, tags=["Notifications"])
def delete_notification(request, notification_id: UUID):
    user = request.auth
    try:
        notif = Notification.objects.get(id=notification_id, user=user)
        notif.is_deleted = True
        notif.save(update_fields=['is_deleted'])
        return {"message": "Notification deleted"}
    except Notification.DoesNotExist:
        return {"error": "Notification not found"}, 404


# ═══════════════════════════════════════════════════════════
# NOTIFICATION PREFERENCES
# ═══════════════════════════════════════════════════════════
@router.get("/preferences/", auth=JWTAuth(), response=PreferenceOut, tags=["Notifications"])
def get_preferences(request):
    user = request.auth
    pref, _ = NotificationPreference.objects.get_or_create(user=user)
    return PreferenceOut.from_orm(pref)


@router.put("/preferences/", auth=JWTAuth(), response=PreferenceOut, tags=["Notifications"])
def update_preferences(request, payload: PreferenceIn):
    user = request.auth
    pref, _ = NotificationPreference.objects.get_or_create(user=user)
    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pref, field, value)
    pref.save()
    return PreferenceOut.from_orm(pref)


# ═══════════════════════════════════════════════════════════
# TEST NOTIFICATION (admin only)
# ═══════════════════════════════════════════════════════════
@router.post("/create-test/", auth=JWTAuth(), response={200: dict}, tags=["Notifications"])
def create_test_notification(request):
    user = request.auth
    if user.role != 'admin':
        return {"error": "Unauthorized"}, 403
    NotificationService.create_and_push(
        user=user,
        title="Test Notification",
        message="This is a test notification from the admin panel.",
        notification_type="system",
        link="/notifications",
        source_type="system",
    )
    return {"message": "Test notification created"}......C:\Users\GATARA-BJTU\academe\backend\apps\notifications\consumers.py;;;import json
from channels.generic.websocket import AsyncWebsocketConsumer
from urllib.parse import parse_qs
from common.jwt_auth import JWTAuth  # Assuming you have a way to validate JWT token asynchronously

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Authenticate via token query parameter
        query_string = self.scope['query_string'].decode()
        params = parse_qs(query_string)
        token = params.get('token', [None])[0]
        if not token:
            await self.close()
            return

        # Validate token and get user (synchronous call in async context, careful)
        try:
            from django.contrib.auth import get_user_model
            from ninja_jwt.authentication import JWTAuthentication  # Or your custom JWT auth
            # Because JWTAuth requires sync, we'll use a sync wrapper or use the existing auth backend
            # For simplicity, we assume a helper function that validates token and returns user.
            user = await self.get_user_from_token(token)
            if not user:
                await self.close()
                return
            self.user = user
            self.group_name = f"user_{user.id}_notifications"
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()
        except Exception:
            await self.close()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notification_message(self, event):
        """Receive a notification message and send it to WebSocket"""
        await self.send(text_data=json.dumps(event['message']))

    async def get_user_from_token(self, token):
        """Validate JWT token and return user object"""
        from django.contrib.auth import get_user_model
        from django.conf import settings
        from jose import jwt
        User = get_user_model()
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            if user_id:
                return await User.objects.aget(pk=user_id)
        except Exception:
            pass
        return None....C:\Users\GATARA-BJTU\academe\backend\apps\notifications\models.py;;;import uuid
from django.db import models
from common.models import BaseModel

class Notification(BaseModel):
    NOTIFICATION_TYPES = [
        ('welcome', 'Welcome'),
        ('announcement', 'Announcement'),
        ('announcement_urgent', 'Urgent Announcement'),
        ('attendance_reminder', 'Attendance Reminder'),
        ('class_reminder', 'Class Reminder'),
        ('item_found', 'Item Found'),
        ('claim_update', 'Claim Update'),
        ('claim_approved', 'Claim Approved'),
        ('claim_rejected', 'Claim Rejected'),
        ('tip_received', 'Tip Received'),
        ('role_assigned', 'Role Assigned'),
        ('role_expired', 'Role Expired'),
        ('role_expiring_soon', 'Role Expiring Soon'),
        ('payment_received', 'Payment Received'),
        ('payment_failed', 'Payment Failed'),
        ('ticket_updated', 'Ticket Updated'),
        ('badge_earned', 'Badge Earned'),
        ('opportunity_expiring', 'Opportunity Expiring'),
        ('system', 'System'),
    ]

    SOURCE_TYPES = [
        ('announcement', 'Announcement'),
        ('found_item', 'Found Item'),
        ('opportunity', 'Opportunity'),
        ('support', 'Support Ticket'),
        ('governance', 'Governance'),
        ('system', 'System'),
    ]

    user = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, related_name='notifications'
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=50, choices=NOTIFICATION_TYPES, default='system'
    )
    is_read = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    link = models.CharField(max_length=1024, blank=True)
    source_type = models.CharField(
        max_length=30, choices=SOURCE_TYPES, blank=True, null=True
    )
    source_id = models.UUIDField(null=True, blank=True, default=None)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_deleted']),
        ]

    def __str__(self):
        return f"{self.user.full_name} - {self.title}"


class NotificationPreference(BaseModel):
    user = models.OneToOneField(
        'accounts.User', on_delete=models.CASCADE, related_name='notification_preferences'
    )
    # Push / in-app toggle per category – True means enabled
    push_announcement = models.BooleanField(default=True)
    push_class = models.BooleanField(default=True)
    push_found_item = models.BooleanField(default=True)
    push_opportunity = models.BooleanField(default=True)
    push_support = models.BooleanField(default=True)
    push_governance = models.BooleanField(default=True)
    push_system = models.BooleanField(default=True)

    # Convenience method to check preference
    def is_enabled(self, notification_type):
        field_map = {
            'announcement': 'push_announcement',
            'announcement_urgent': 'push_announcement',
            'class': 'push_class',
            'class_reminder': 'push_class',
            'found_item': 'push_found_item',
            'item_found': 'push_found_item',
            'claim_update': 'push_found_item',
            'claim_approved': 'push_found_item',
            'claim_rejected': 'push_found_item',
            'opportunity': 'push_opportunity',
            'opportunity_expiring': 'push_opportunity',
            'support': 'push_support',
            'ticket_updated': 'push_support',
            'governance': 'push_governance',
            'role_assigned': 'push_governance',
            'role_expired': 'push_governance',
            'role_expiring_soon': 'push_governance',
            'system': 'push_system',
        }
        field = field_map.get(notification_type)
        if field:
            return getattr(self, field, True)
        return True  # default enabled

    def __str__(self):
        return f"Preferences for {self.user.full_name}"........C:\Users\GATARA-BJTU\academe\backend\apps\notifications\routing.py;;;from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/notifications/$', consumers.NotificationConsumer.as_asgi()),
]....C:\Users\GATARA-BJTU\academe\backend\apps\notifications\services.py;;;import logging
from django.conf import settings
from django.contrib.auth import get_user_model
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import firebase_admin
from firebase_admin import credentials, messaging

from .models import Notification, NotificationPreference

logger = logging.getLogger(__name__)

User = get_user_model()


class NotificationService:
    _firebase_initialized = False

    @staticmethod
    def _init_firebase():
        """Lazy Firebase initialization"""
        if not NotificationService._firebase_initialized and not firebase_admin._apps:
            try:
                cred_path = getattr(settings, 'FIREBASE_CREDENTIALS', None)
                if cred_path:
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred)
                    NotificationService._firebase_initialized = True
                    logger.info("Firebase initialized for notifications")
            except Exception as e:
                logger.error(f"Firebase init failed: {e}")

    @staticmethod
    def _send_push(user, title, body, data_payload=None):
        """Send a push notification to a single user if token exists and preference allows"""
        if not user.fcm_token:
            return False
        # Check preference
        pref, _ = NotificationPreference.objects.get_or_create(user=user)
        notification_type = data_payload.get('type', 'system') if data_payload else 'system'
        if not pref.is_enabled(notification_type):
            return False

        NotificationService._init_firebase()
        try:
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data=data_payload or {},
                token=user.fcm_token,
            )
            messaging.send(message)
            return True
        except messaging.UnregisteredError:
            # Remove invalid token
            user.fcm_token = None
            user.save(update_fields=['fcm_token'])
            logger.info(f"Invalid FCM token removed for user {user.id}")
        except Exception as e:
            logger.error(f"Push send error to {user.id}: {e}")
        return False

    @staticmethod
    def _send_websocket(user, notification_dict):
        """Send notification via Django Channels to the user's WebSocket group"""
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"user_{user.id}_notifications",
                    {
                        "type": "notification_message",
                        "message": notification_dict,
                    },
                )
        except Exception as e:
            logger.error(f"WebSocket send error: {e}")

    @staticmethod
    def create_and_push(user, title, message, notification_type="system", link=None, data=None, source_type=None, source_id=None):
        """Create DB notification and deliver via WebSocket + push"""
        notification = Notification.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            link=link or "",
            source_type=source_type,
            source_id=source_id,
        )
        payload = {
            "id": str(notification.id),
            "title": notification.title,
            "message": notification.message,
            "type": notification.notification_type,
            "is_read": False,
            "created_at": notification.created_at.isoformat(),
            "link": notification.link,
            "source_type": notification.source_type,
            "source_id": str(notification.source_id) if notification.source_id else None,
        }
        # Push to WebSocket
        NotificationService._send_websocket(user, payload)
        # Push notification via FCM
        data_payload = {"type": notification_type, "notification_id": str(notification.id)}
        if link:
            data_payload["link"] = link
        NotificationService._send_push(user, title, message, data_payload)
        return notification

    @staticmethod
    def send_bulk(users, title, message, notification_type="system", link=None, data=None, source_type=None, source_id=None):
        """Create notifications for multiple users and push to all"""
        if not users:
            return []
        # Create DB records
        notifications = [
            Notification(
                user=user,
                title=title,
                message=message,
                notification_type=notification_type,
                link=link or "",
                source_type=source_type,
                source_id=source_id,
            )
            for user in users
        ]
        Notification.objects.bulk_create(notifications)

        # Send WebSocket + push to each user
        # Notifications created via bulk_create don't have IDs pre-assigned; we need to re-fetch?
        # To get IDs, we'll query the newly created ones.
        # But for performance, we'll re-fetch the batch for the given source if needed.
        # For simplicity, we send without ID for now, but we need ID for WS. We'll fetch after.
        # However, to avoid extra queries, we'll create individually for real-time pushes.
        # Better: after bulk_create, retrieve the notifications for these users with the given created_at range?
        # Let's just iterate and create individually for a moderate number, but for bulk efficiency we'll combine.
        # If user count is large, we might skip WebSocket/push for bulk; but according to requirement, we want real-time.
        # So we'll do individual create for each to get ID and push. Use a batch size.
        # We'll override with individual create_and_push for each user (bypass bulk).
        for user in users:
            NotificationService.create_and_push(
                user=user,
                title=title,
                message=message,
                notification_type=notification_type,
                link=link,
                data=data,
                source_type=source_type,
                source_id=source_id,
            )
        return notifications  # returned list is from bulk_create (if needed)C:\Users\GATARA-BJTU\academe\frontend\src\api\client.js;;import axios from 'axios';
import { setTimeOffset } from '../utils/time';

const BASE_URL = import.meta.env.VITE_API_URL || '';
export const BACKEND_BASE_URL = BASE_URL;

// ✅ All API requests now automatically get the /api prefix
const API_BASE = `${BASE_URL}/api`;

const refreshApi = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  timeout: 30000,
});

// Request interceptor – attach token from localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    const serverDate = response.headers['date'];
    if (serverDate) {
      setTimeOffset(serverDate);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // ✅ Match the short paths – baseURL already adds /api
    const authEndpoints = [
      '/accounts/login/', '/accounts/verify-otp/', '/accounts/refresh-token/',
      '/accounts/request-otp/', '/accounts/register/', '/accounts/signup/'
    ];
    if (authEndpoints.some(ep => originalRequest.url?.includes(ep))) {
      return Promise.reject(error);
    }

    if (originalRequest._syncRequest && error.response?.status === 401) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await refreshApi.post('/accounts/refresh-token/', {
          refresh: refreshToken,
        });

        if (!response.data || !response.data.access) {
          throw new Error('No access token in refresh response');
        }

        const { access } = response.data;
        localStorage.setItem('access_token', access);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${access}`;
        processQueue(null, access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 403) console.warn('Access denied:', error.response?.data);
    return Promise.reject(error);
  }
);

export { refreshApi };
export default apiClient;....C:\Users\GATARA-BJTU\academe\frontend\src\hooks\useNotificationWebSocket.js;;;import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function useNotificationWebSocket(onNewNotification) {
    const { user } = useAuth();
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const onNewNotificationRef = useRef(onNewNotification);
    onNewNotificationRef.current = onNewNotification;

    const connect = useCallback(() => {
        if (!user || !user.access_token) return;

        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const host = window.location.host;
        const url = `${protocol}://${host}/ws/notifications/?token=${user.access_token}`;

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('Notification WebSocket connected');
        };

        ws.onmessage = (event) => {
            try {
                const notification = JSON.parse(event.data);
                if (onNewNotificationRef.current) {
                    onNewNotificationRef.current(notification);
                }
            } catch (e) {
                console.error('Failed to parse notification', e);
            }
        };

        ws.onclose = (e) => {
            console.log('Notification WebSocket disconnected, attempting reconnect...');
            wsRef.current = null;
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = setTimeout(() => {
                if (user) connect();
            }, 5000);
        };

        ws.onerror = (err) => {
            console.error('WebSocket error', err);
            ws.close();
        };
    }, [user]);

    useEffect(() => {
        connect();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        };
    }, [connect]);

    return {
        disconnect: () => {
            if (wsRef.current) wsRef.current.close();
        },
    };
}...C:\Users\GATARA-BJTU\academe\frontend\src\hooks\useWebSocket.js;;;import { useEffect } from 'react';
import { useChatStore } from '../stores/useChatStore';

export const useWebSocket = (conversationId) => {
    const connectWebSocket = useChatStore((s) => s.connectWebSocket);
    const disconnectWebSocket = useChatStore((s) => s.disconnectWebSocket);

    useEffect(() => {
        if (!conversationId) return;
        connectWebSocket(conversationId);
        return () => disconnectWebSocket();
    }, [conversationId, connectWebSocket, disconnectWebSocket]);
};....C:\Users\GATARA-BJTU\academe\frontend\src\pages\NotificationsPage.jsx;;;import { useState, useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import apiClient from '../api/client';
import useNotificationWebSocket from '../hooks/useNotificationWebSocket';
import DOMPurify from 'dompurify';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import {
    FiBell, FiAlertCircle, FiMessageSquare, FiCalendar,
    FiMail, FiShield, FiRefreshCw, FiCheck, FiTrash2,
    FiEye, FiX, FiSquare, FiCheckSquare
} from 'react-icons/fi';

const TYPE_ICONS = {
    announcement: FiBell,
    announcement_urgent: FiAlertCircle,
    class: FiCalendar,
    class_reminder: FiCalendar,
    found_item: FiAlertCircle,
    item_found: FiAlertCircle,
    claim_update: FiShield,
    claim_approved: FiCheck,
    claim_rejected: FiX,
    opportunity: FiMail,
    opportunity_expiring: FiMail,
    ticket_updated: FiMessageSquare,
    badge_earned: FiRefreshCw,
    role_assigned: FiShield,
    role_expired: FiShield,
    role_expiring_soon: FiShield,
    system: FiRefreshCw,
};

/** Strip all HTML tags, leaving only plain text */
function stripHtml(html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

export default function NotificationsPage() {
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState('all');
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectionMode, setSelectionMode] = useState(false);

    // Infinite query with cursor pagination
    const {
        data,
        isLoading,
        isError,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: ['notifications', 'infinite', filter],
        queryFn: async ({ pageParam }) => {
            const params = { page_size: 20 };
            if (pageParam) params.cursor = pageParam;
            if (filter === 'unread') params.unread_only = true;
            const res = await apiClient.get('/notifications/', { params });
            return res.data;
        },
        getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
        initialPageParam: undefined,
        staleTime: 30000,
        retry: 1,
        refetchOnWindowFocus: false, // prevent refetch overwriting optimistic update
    });

    // Unread count
    const { data: unreadCountData } = useQuery({
        queryKey: ['notifications-unread-count'],
        queryFn: async () => {
            const res = await apiClient.get('/notifications/unread-count/');
            return res.data.unread_count;
        },
        refetchInterval: 30000,
    });

    // Mark single read mutation
    const markReadMutation = useMutation({
        mutationFn: (id) => apiClient.post(`/notifications/${id}/read/`),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['notifications', 'infinite', filter] });
            const previousData = queryClient.getQueryData(['notifications', 'infinite', filter]);
            queryClient.setQueryData(['notifications', 'infinite', filter], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        results: page.results.map(n => n.id === id ? { ...n, is_read: true } : n),
                    })),
                };
            });
            return { previousData };
        },
        onError: (err, id, context) => {
            queryClient.setQueryData(['notifications', 'infinite', filter], context.previousData);
            toast.error('Failed to mark as read');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        },
    });

    // Mark all read mutation
    const markAllReadMutation = useMutation({
        mutationFn: () => apiClient.post('/notifications/mark-all-read/'),
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['notifications', 'infinite', filter] });
            const previousData = queryClient.getQueryData(['notifications', 'infinite', filter]);
            queryClient.setQueryData(['notifications', 'infinite', filter], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        results: page.results.map(n => ({ ...n, is_read: true })),
                    })),
                };
            });
            return { previousData };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['notifications', 'infinite', filter], context.previousData);
            toast.error('Failed to mark all as read');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        },
    });

    // Bulk mark selected as read
    const bulkMarkReadMutation = useMutation({
        mutationFn: (ids) => apiClient.post('/notifications/bulk-mark-read/', { notification_ids: ids }),
        onMutate: async (ids) => {
            await queryClient.cancelQueries({ queryKey: ['notifications', 'infinite', filter] });
            const previousData = queryClient.getQueryData(['notifications', 'infinite', filter]);
            queryClient.setQueryData(['notifications', 'infinite', filter], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        results: page.results.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n),
                    })),
                };
            });
            return { previousData };
        },
        onError: (err, ids, context) => {
            queryClient.setQueryData(['notifications', 'infinite', filter], context.previousData);
            toast.error('Failed to mark selected as read');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
            setSelectionMode(false);
            setSelectedIds([]);
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id) => apiClient.delete(`/notifications/${id}/`),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['notifications', 'infinite', filter] });
            const previousData = queryClient.getQueryData(['notifications', 'infinite', filter]);
            queryClient.setQueryData(['notifications', 'infinite', filter], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map(page => ({
                        ...page,
                        results: page.results.filter(n => n.id !== id),
                    })),
                };
            });
            return { previousData };
        },
        onError: (err, id, context) => {
            queryClient.setQueryData(['notifications', 'infinite', filter], context.previousData);
            toast.error('Failed to delete');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        },
    });

    // WebSocket integration
    const handleNewNotification = useCallback((notification) => {
        // Prepend to first page only if filter is 'all' (new notifications are unread)
        if (filter === 'all') {
            queryClient.setQueryData(['notifications', 'infinite', filter], (old) => {
                if (!old || !old.pages || old.pages.length === 0) return old;
                const newPages = [...old.pages];
                const firstPage = { ...newPages[0], results: [notification, ...newPages[0].results] };
                newPages[0] = firstPage;
                return { ...old, pages: newPages };
            });
        }
        queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        toast.success('New notification');
    }, [filter, queryClient]);

    useNotificationWebSocket(handleNewNotification);

    // Infinite scroll observer
    const loadMoreRef = useRef(null);
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { threshold: 0.1 }
        );
        if (loadMoreRef.current) observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const allNotifications = data?.pages?.flatMap(page => page.results) ?? [];
    const unreadCount = unreadCountData ?? 0;

    const toggleSelection = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectionMode = () => {
        setSelectionMode(!selectionMode);
        setSelectedIds([]);
    };

    if (isLoading) return <SkeletonLoader type="list" count={6} />;
    if (isError) return (
        <div className="text-center py-16">
            <FiX className="w-16 h-16 mx-auto text-red-300 mb-4" />
            <p className="text-red-500">Failed to load notifications.</p>
            <button onClick={() => queryClient.invalidateQueries({ queryKey: ['notifications', 'infinite', filter] })}
                className="mt-2 text-indigo-600 hover:underline">
                Retry
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FiBell className="inline-block" /> Notifications
                            {unreadCount > 0 && (
                                <span className="text-sm bg-red-500 text-white px-2 py-0.5 rounded-full">
                                    {unreadCount} new
                                </span>
                            )}
                        </h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={filter}
                            onChange={(e) => { setFilter(e.target.value); setSelectionMode(false); setSelectedIds([]); }}
                            className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800"
                        >
                            <option value="all">All</option>
                            <option value="unread">Unread only</option>
                        </select>
                        <button
                            onClick={() => markAllReadMutation.mutate()}
                            disabled={markAllReadMutation.isPending || unreadCount === 0}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
                        >
                            <FiCheck size={16} /> Mark all read
                        </button>
                        <button
                            onClick={toggleSelectionMode}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${selectionMode ? 'bg-gray-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}
                        >
                            {selectionMode ? <FiX size={16} /> : <FiCheckSquare size={16} />}
                            {selectionMode ? 'Cancel' : 'Select'}
                        </button>
                        {selectionMode && selectedIds.length > 0 && (
                            <button
                                onClick={() => bulkMarkReadMutation.mutate(selectedIds)}
                                disabled={bulkMarkReadMutation.isPending}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
                            >
                                <FiCheck size={16} /> Mark {selectedIds.length} as read
                            </button>
                        )}
                    </div>
                </div>

                {/* Notifications list */}
                {allNotifications.length > 0 ? (
                    <div className="space-y-3">
                        {allNotifications.map((notif) => {
                            const Icon = TYPE_ICONS[notif.type] || FiBell;
                            const isSelected = selectedIds.includes(notif.id);
                            const plainMessage = stripHtml(notif.message);
                            return (
                                <div
                                    key={notif.id}
                                    className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-5 flex items-start gap-4 transition-all hover:shadow-md ${!notif.is_read ? 'border-l-4 border-l-indigo-500' : 'border-gray-100 dark:border-gray-700'
                                        } ${isSelected ? 'ring-2 ring-indigo-400' : ''}`}
                                >
                                    {selectionMode && (
                                        <button
                                            onClick={() => toggleSelection(notif.id)}
                                            className="flex-shrink-0 mt-1 text-indigo-500"
                                        >
                                            {isSelected ? <FiCheckSquare size={20} /> : <FiSquare size={20} />}
                                        </button>
                                    )}
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!notif.is_read ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                                        }`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start flex-wrap gap-2">
                                            <p className="font-semibold text-gray-900 dark:text-white truncate">{notif.title}</p>
                                            <div className="flex gap-1">
                                                {!notif.is_read && !selectionMode && (
                                                    <button
                                                        onClick={() => markReadMutation.mutate(notif.id)}
                                                        className="text-xs text-indigo-600 hover:text-indigo-700 p-1"
                                                        title="Mark as read"
                                                    >
                                                        <FiEye size={14} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => deleteMutation.mutate(notif.id)}
                                                    className="text-xs text-gray-400 hover:text-red-500 p-1"
                                                    title="Delete"
                                                >
                                                    <FiTrash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{plainMessage}</p>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                            <span>{new Date(notif.created_at).toLocaleString()}</span>
                                            {notif.link && (
                                                <Link to={notif.link} className="text-indigo-500 hover:underline">
                                                    View details →
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                    {!notif.is_read && !selectionMode && (
                                        <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-2"></span>
                                    )}
                                </div>
                            );
                        })}

                        {/* Infinite scroll trigger */}
                        <div ref={loadMoreRef} className="h-4" />
                        {isFetchingNextPage && <SkeletonLoader type="list" count={3} />}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <FiBell className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg">No notifications yet.</p>
                        <p className="text-sm text-gray-400 mt-1">When you receive important updates, they'll appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}.....C:\Users\GATARA-BJTU\academe\frontend\src\pages\NotificationPreferencesPage.jsx;;;import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { accountsApi } from '../api/accountsApi';
import toast from 'react-hot-toast';
import { FiBell, FiMail, FiSmartphone, FiSave, FiArrowLeft } from 'react-icons/fi';
import SkeletonLoader from '../components/shared/SkeletonLoader';

export default function NotificationPreferencesPage() {
    const { user, updateUser, loading } = useAuth();
    const [pushEnabled, setPushEnabled] = useState(false);
    const [emailAlerts, setEmailAlerts] = useState(true);
    const [saving, setSaving] = useState(false);

    // In a real app, load preferences from backend. For demo, use local state.
    useEffect(() => {
        // Mock: check if user has FCM token
        setPushEnabled(!!user?.fcm_token);
        // Email alerts default true
        setEmailAlerts(true);
    }, [user]);

    const requestPushPermission = async () => {
        if (!('Notification' in window)) {
            toast.error('Push notifications not supported');
            return;
        }
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            // In production, register FCM token and send to backend
            toast.success('Push notifications enabled');
            setPushEnabled(true);
            // Update user with dummy token
            updateUser({ fcm_token: 'dummy-fcm-token' });
        } else {
            toast.error('Permission denied');
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Send preferences to backend (endpoint not implemented in original, but can be added)
            // For demo, just show success
            toast.success('Preferences saved');
        } catch (err) {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <SkeletonLoader type="page" />;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                <Link to="/profile" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
                    <FiArrowLeft /> Back to Profile
                </Link>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border p-6 md:p-8">
                    <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
                        <FiBell /> Notification Preferences
                    </h1>

                    <div className="space-y-6">
                        {/* Push Notifications */}
                        <div className="flex items-center justify-between border-b pb-4">
                            <div className="flex items-center gap-3">
                                <FiSmartphone className="text-indigo-500" size={20} />
                                <div>
                                    <h3 className="font-semibold">Push Notifications</h3>
                                    <p className="text-sm text-gray-500">Receive alerts on your device</p>
                                </div>
                            </div>
                            {pushEnabled ? (
                                <span className="text-green-600 text-sm">Enabled</span>
                            ) : (
                                <button onClick={requestPushPermission} className="px-4 py-1 bg-indigo-600 text-white rounded-lg text-sm">
                                    Enable
                                </button>
                            )}
                        </div>

                        {/* Email Alerts */}
                        <div className="flex items-center justify-between border-b pb-4">
                            <div className="flex items-center gap-3">
                                <FiMail className="text-indigo-500" size={20} />
                                <div>
                                    <h3 className="font-semibold">Email Alerts</h3>
                                    <p className="text-sm text-gray-500">Important updates via email</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={emailAlerts} onChange={() => setEmailAlerts(!emailAlerts)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                        >
                            <FiSave /> {saving ? 'Saving...' : 'Save Preferences'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}.....C:\Users\GATARA-BJTU\academe\frontend\src\utils\storage.js;;;import { openDB } from 'idb';

const DB_NAME = 'AcademeOfflineDB';
const DB_VERSION = 3;

let _syncLock = false;
let _isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        _isOnline = true;
        console.log('🌐 Back online - starting sync...');
        setTimeout(() => {
            offlineStorage.processSyncQueue();
        }, 100);
    });

    window.addEventListener('offline', () => {
        _isOnline = false;
        console.log('📡 Offline - data will be queued');
    });
}

export function getNetworkStatus() {
    return _isOnline;
}

export async function getDB() {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
            if (!db.objectStoreNames.contains('offlineAttendance')) {
                db.createObjectStore('offlineAttendance', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('offlineMarks')) {
                db.createObjectStore('offlineMarks', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('syncQueue')) {
                const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                syncStore.createIndex('status', 'status');
                syncStore.createIndex('type', 'type');
                syncStore.createIndex('createdAt', 'createdAt');
            }
            if (!db.objectStoreNames.contains('apiCache')) {
                const cacheStore = db.createObjectStore('apiCache', { keyPath: 'url' });
                cacheStore.createIndex('timestamp', 'timestamp');
            }
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains('formDrafts')) {
                db.createObjectStore('formDrafts', { keyPath: 'formId' });
            }
            if (!db.objectStoreNames.contains('preferences')) {
                db.createObjectStore('preferences', { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains('biometrics')) {
                db.createObjectStore('biometrics', { keyPath: 'id' });
            }
        },
    });
}

export const offlineStorage = {
    async saveAttendance(data) {
        try {
            const db = await getDB();
            const record = { ...data, timestamp: new Date().toISOString(), synced: false };
            return db.add('offlineAttendance', record);
        } catch (error) {
            console.error('Failed to save attendance:', error);
            throw error;
        }
    },

    async getOfflineAttendance() {
        try {
            const db = await getDB();
            return db.getAll('offlineAttendance');
        } catch (error) {
            console.error('Failed to get attendance:', error);
            return [];
        }
    },

    async getUnsyncedAttendance() {
        const all = await this.getOfflineAttendance();
        return all.filter(a => !a.synced);
    },

    async clearOfflineAttendance(id) {
        try {
            const db = await getDB();
            return db.delete('offlineAttendance', id);
        } catch (error) {
            console.error('Failed to clear attendance:', error);
            throw error;
        }
    },

    async clearAllOfflineAttendance() {
        try {
            const db = await getDB();
            return db.clear('offlineAttendance');
        } catch (error) {
            console.error('Failed to clear all attendance:', error);
            throw error;
        }
    },

    async markAttendanceSynced(ids) {
        try {
            const db = await getDB();
            const tx = db.transaction('offlineAttendance', 'readwrite');
            for (const id of ids) {
                const record = await tx.store.get(id);
                if (record) {
                    record.synced = true;
                    await tx.store.put(record);
                }
            }
            await tx.done;
        } catch (error) {
            console.error('Failed to mark attendance synced:', error);
        }
    },

    async saveOfflineMarks(marksData) {
        try {
            const db = await getDB();
            const record = { ...marksData, synced: false, createdAt: new Date().toISOString() };
            return db.add('offlineMarks', record);
        } catch (error) {
            console.error('Failed to save marks:', error);
            throw error;
        }
    },

    async getOfflineMarks() {
        try {
            const db = await getDB();
            return db.getAll('offlineMarks');
        } catch (error) {
            console.error('Failed to get marks:', error);
            return [];
        }
    },

    async getUnsyncedMarks() {
        const all = await this.getOfflineMarks();
        return all.filter(m => !m.synced);
    },

    async markMarksSynced(ids) {
        try {
            const db = await getDB();
            const tx = db.transaction('offlineMarks', 'readwrite');
            for (const id of ids) {
                const record = await tx.store.get(id);
                if (record) {
                    record.synced = true;
                    await tx.store.put(record);
                }
            }
            await tx.done;
        } catch (error) {
            console.error('Failed to mark marks synced:', error);
        }
    },

    async clearAllOfflineMarks() {
        try {
            const db = await getDB();
            return db.clear('offlineMarks');
        } catch (error) {
            console.error('Failed to clear marks:', error);
            throw error;
        }
    },

    async addToSyncQueue(operation) {
        try {
            const db = await getDB();
            return db.add('syncQueue', {
                type: operation.type,
                endpoint: operation.endpoint,
                method: operation.method || 'POST',
                data: operation.data,
                status: 'pending',
                attempts: 0,
                maxAttempts: 3,
                lastError: null,
                createdAt: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Failed to add to sync queue:', error);
            throw error;
        }
    },

    async getSyncQueue(status = null) {
        try {
            const db = await getDB();
            if (status) {
                const index = db.transaction('syncQueue').store.index('status');
                return index.getAll(status);
            }
            return db.getAll('syncQueue');
        } catch (error) {
            console.error('Failed to get sync queue:', error);
            return [];
        }
    },

    async getPendingSyncCount() {
        const pending = await this.getSyncQueue('pending');
        return pending.length;
    },

    async updateSyncItem(id, updates) {
        try {
            const db = await getDB();
            const item = await db.get('syncQueue', id);
            if (item) {
                Object.assign(item, updates);
                return db.put('syncQueue', item);
            }
        } catch (error) {
            console.error('Failed to update sync item:', error);
        }
    },

    async clearSyncItem(id) {
        try {
            const db = await getDB();
            return db.delete('syncQueue', id);
        } catch (error) {
            console.error('Failed to clear sync item:', error);
        }
    },

    async processSyncQueue(apiInstance = null) {
        if (_syncLock) {
            console.warn('⚠️ Sync already in progress, skipping duplicate call');
            return { synced: 0, failed: 0, skipped: true };
        }

        if (!_isOnline) {
            console.log('📡 Still offline, skipping sync');
            return { synced: 0, failed: 0 };
        }

        // Check if user is logged in (has a valid access token)
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            console.warn('🔒 No access token, cannot sync. User must login first.');
            return { synced: 0, failed: 0 };
        }

        _syncLock = true;
        console.log('🔒 Sync lock acquired');

        try {
            const pending = await this.getSyncQueue('pending');
            if (pending.length === 0) {
                console.log('✅ No pending items to sync');
                return { synced: 0, failed: 0 };
            }

            console.log(`🔄 Processing ${pending.length} pending sync items...`);
            let synced = 0;
            let failed = 0;

            for (const item of pending) {
                try {
                    let client = apiInstance;
                    if (!client) {
                        try {
                            const apiModule = await import('../api/client');
                            client = apiModule.default;
                        } catch (importError) {
                            console.error('Failed to import API client:', importError);
                            await this.updateSyncItem(item.id, {
                                attempts: item.attempts + 1,
                                status: 'pending',
                                lastError: 'API client unavailable',
                            });
                            failed++;
                            continue;
                        }
                    }

                    // Mark this request as a sync background request
                    const config = {
                        headers: {},
                        _syncRequest: true,   // flag for interceptor
                    };

                    let response;
                    switch (item.method.toUpperCase()) {
                        case 'POST':
                            response = await client.post(item.endpoint, item.data, config);
                            break;
                        case 'PUT':
                            response = await client.put(item.endpoint, item.data, config);
                            break;
                        case 'PATCH':
                            response = await client.patch(item.endpoint, item.data, config);
                            break;
                        case 'DELETE':
                            response = await client.delete(item.endpoint, config);
                            break;
                        default:
                            response = await client.post(item.endpoint, item.data, config);
                    }

                    if (response?.status >= 200 && response?.status < 300) {
                        await this.clearSyncItem(item.id);
                        synced++;
                    } else {
                        await this.updateSyncItem(item.id, {
                            attempts: item.attempts + 1,
                            status: item.attempts + 1 >= item.maxAttempts ? 'failed' : 'pending',
                            lastError: `HTTP ${response?.status}`,
                        });
                        failed++;
                    }
                } catch (error) {
                    console.error(`Failed to sync item ${item.id}:`, error.message);
                    await this.updateSyncItem(item.id, {
                        attempts: item.attempts + 1,
                        status: item.attempts + 1 >= item.maxAttempts ? 'failed' : 'pending',
                        lastError: error.message,
                    });
                    failed++;
                }
            }

            console.log(`🔄 Sync complete: ${synced} synced, ${failed} failed`);
            return { synced, failed };
        } finally {
            _syncLock = false;
            console.log('🔓 Sync lock released');
        }
    },

    async processSyncQueueAtomic(apiInstance = null) {
        return this.processSyncQueue(apiInstance);
    },

    async clearFailedSyncItems() {
        try {
            const failed = await this.getSyncQueue('failed');
            const db = await getDB();
            for (const item of failed) {
                await db.delete('syncQueue', item.id);
            }
        } catch (error) {
            console.error('Failed to clear failed items:', error);
        }
    },

    async cacheApiResponse(url, data, ttlMinutes = 5) {
        try {
            const db = await getDB();
            const now = Date.now();
            return db.put('apiCache', {
                url,
                data,
                timestamp: new Date().toISOString(),
                expiresAt: now + ttlMinutes * 60000,
            });
        } catch (error) {
            console.error('Failed to cache API response:', error);
        }
    },

    async getCachedResponse(url) {
        try {
            const db = await getDB();
            const cached = await db.get('apiCache', url);
            if (!cached) return null;
            if (Date.now() > cached.expiresAt) {
                await db.delete('apiCache', url);
                return null;
            }
            return cached.data;
        } catch (error) {
            console.error('Failed to get cached response:', error);
            return null;
        }
    },

    async cleanupExpiredCache() {
        try {
            const db = await getDB();
            const all = await db.getAll('apiCache');
            const now = Date.now();
            let cleaned = 0;
            for (const item of all) {
                if (now > item.expiresAt) {
                    await db.delete('apiCache', item.url);
                    cleaned++;
                }
            }
            if (cleaned > 0) console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
            return cleaned;
        } catch (error) {
            console.error('Failed to cleanup cache:', error);
            return 0;
        }
    },

    async clearAllCache() {
        try {
            const db = await getDB();
            return db.clear('apiCache');
        } catch (error) {
            console.error('Failed to clear cache:', error);
            throw error;
        }
    },

    async getCacheSize() {
        try {
            const db = await getDB();
            const all = await db.getAll('apiCache');
            return new Blob([JSON.stringify(all)]).size;
        } catch (error) {
            return 0;
        }
    },

    async setSetting(key, value) {
        try {
            const db = await getDB();
            return db.put('settings', { key, value });
        } catch (error) {
            console.error('Failed to save setting:', error);
        }
    },

    async getSetting(key) {
        try {
            const db = await getDB();
            const setting = await db.get('settings', key);
            return setting?.value;
        } catch (error) {
            console.error('Failed to get setting:', error);
            return null;
        }
    },

    async saveFormDraft(formId, data) {
        try {
            const db = await getDB();
            return db.put('formDrafts', { formId, data, savedAt: new Date().toISOString() });
        } catch (error) {
            console.error('Failed to save form draft:', error);
        }
    },

    async getFormDraft(formId) {
        try {
            const db = await getDB();
            return db.get('formDrafts', formId);
        } catch (error) {
            console.error('Failed to get form draft:', error);
            return null;
        }
    },

    async deleteFormDraft(formId) {
        try {
            const db = await getDB();
            return db.delete('formDrafts', formId);
        } catch (error) {
            console.error('Failed to delete form draft:', error);
        }
    },

    async setPreference(key, value) {
        try {
            const db = await getDB();
            return db.put('preferences', { key, value });
        } catch (error) {
            console.error('Failed to save preference:', error);
        }
    },

    async getPreference(key) {
        try {
            const db = await getDB();
            const pref = await db.get('preferences', key);
            return pref?.value;
        } catch (error) {
            console.error('Failed to get preference:', error);
            return null;
        }
    },

    async getAllPreferences() {
        try {
            const db = await getDB();
            const all = await db.getAll('preferences');
            const prefs = {};
            for (const item of all) prefs[item.key] = item.value;
            return prefs;
        } catch (error) {
            console.error('Failed to get preferences:', error);
            return {};
        }
    },

    async saveBiometricStatus(status) {
        try {
            const db = await getDB();
            return db.put('biometrics', { id: 'enrollment_status', ...status, updatedAt: new Date().toISOString() });
        } catch (error) {
            console.error('Failed to save biometric status:', error);
            throw error;
        }
    },

    async getBiometricStatus() {
        try {
            const db = await getDB();
            return await db.get('biometrics', 'enrollment_status');
        } catch (error) {
            console.error('Failed to retrieve biometric status:', error);
            return null;
        }
    },

    async clearAllOfflineData() {
        try {
            const db = await getDB();
            const stores = ['offlineAttendance', 'offlineMarks', 'syncQueue', 'formDrafts', 'biometrics'];
            for (const store of stores) {
                if (db.objectStoreNames.contains(store)) await db.clear(store);
            }
            console.log('🧹 Cleared all offline data including biometrics');
        } catch (error) {
            console.error('Failed to clear offline data:', error);
        }
    },

    async getDBStats() {
        try {
            const db = await getDB();
            const stats = {};
            for (const storeName of db.objectStoreNames) {
                stats[storeName] = await db.count(storeName);
            }
            return stats;
        } catch (error) {
            console.error('Failed to get DB stats:', error);
            return {};
        }
    },

    async performMaintenance() {
        await this.cleanupExpiredCache();
        await this.clearFailedSyncItems();
        console.log('🔧 Database maintenance complete');
    },
};....C:\Users\GATARA-BJTU\academe\frontend\src\utils\time.js;;;// ── Constants; ALSO I HAVE date-fns (`date-fns`) INSTALLED ────────────────────────────────────────────────────────────

const SCHOOL_HOLIDAYS_KE = [
    '01-01', // New Year's Day
    '04-07', // Good Friday (approximate)
    '04-10', // Easter Monday (approximate)
    '05-01', // Labour Day
    '06-01', // Madaraka Day
    '08-08', // General Election (every 5 years)
    '10-10', // Utamaduni Day (Moi Day)
    '10-20', // Mashujaa Day
    '12-12', // Jamhuri Day
    '12-25', // Christmas Day
    '12-26', // Boxing Day
];

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_NAMES_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ── Server Time Synchronization ───────────────────────────────────────────

let timeOffset = 0;

export function setTimeOffset(serverDateString) {
    const serverTime = new Date(serverDateString).getTime();
    const clientTime = Date.now();
    timeOffset = serverTime - clientTime;
}

export function getSyncedDate() {
    return new Date(Date.now() + timeOffset);
}

// ── Time Formatting ───────────────────────────────────────────────────────

export function formatTime(time, locale = 'en-US') {
    if (!time) return '';
    const date = new Date(time);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function formatTime24(time) {
    if (!time) return '';
    const date = new Date(time);
    if (isNaN(date.getTime())) return '';
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

export function formatDate(date, locale = 'en-US') {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatDateShort(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

export function formatISODate(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
}

export function formatISO(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString();
}

// ── Date & Time Validation ────────────────────────────────────────────────

export function isValidTime(timeStr) {
    if (!timeStr) return false;
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr);
}

export function isValidDate(dateStr) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
}

export function isValidTimeRange(startTime, endTime) {
    if (!isValidTime(startTime) || !isValidTime(endTime)) return false;
    return startTime < endTime;
}

// ── Relative Time ─────────────────────────────────────────────────────────

export function getRelativeTime(date) {
    if (!date) return '';
    const now = getSyncedDate();
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const diff = now - d;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDateShort(date);
}

export function getRelativeTimeDetailed(date) {
    if (!date) return '';
    const now = getSyncedDate();
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const diff = now - d;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds} seconds ago`;
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
    if (years === 1) return '1 year ago';
    return `${years} years ago`;
}

// ── Day & Date Utilities ──────────────────────────────────────────────────

export function getDayName(dayOfWeek) {
    return DAY_NAMES[dayOfWeek] || '';
}

export function getDayNameShort(dayOfWeek) {
    return DAY_NAMES_SHORT[dayOfWeek] || '';
}

export function isToday(date) {
    if (!date) return false;
    const now = getSyncedDate();
    const d = new Date(date);
    return d.toDateString() === now.toDateString();
}

export function isThisWeek(date) {
    if (!date) return false;
    const now = getSyncedDate();
    const d = new Date(date);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    return d >= weekStart;
}

export function isThisMonth(date) {
    if (!date) return false;
    const now = getSyncedDate();
    const d = new Date(date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export function isOverdue(date) {
    if (!date) return false;
    return new Date(date) < getSyncedDate();
}

export function getWeekNumber(date = getSyncedDate()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

// ── Academic Helpers ──────────────────────────────────────────────────────

export function getAcademicYear(date = getSyncedDate()) {
    const d = new Date(date);
    const year = d.getFullYear();
    return `${year}-${year + 1}`;
}

export function getCurrentTerm(date = getSyncedDate()) {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    if (month >= 1 && month <= 3) return 1;
    if (month >= 5 && month <= 7) return 2;
    if (month >= 9 && month <= 11) return 3;
    return null;
}

export function getTermName(termNumber) {
    const names = { 1: 'Term 1', 2: 'Term 2', 3: 'Term 3' };
    return names[termNumber] || 'Holiday';
}

export function isSchoolTerm(date = getSyncedDate()) {
    return getCurrentTerm(date) !== null;
}

export function isSchoolDay(date = getSyncedDate()) {
    const d = new Date(date);
    if (d.getDay() === 0 || d.getDay() === 6) return false;
    const dateStr = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (SCHOOL_HOLIDAYS_KE.includes(dateStr)) return false;
    if (!isSchoolTerm(date)) return false;
    return true;
}

export function getNextSchoolDay(date = getSyncedDate()) {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    let attempts = 0;
    while (!isSchoolDay(next) && attempts < 30) {
        next.setDate(next.getDate() + 1);
        attempts++;
    }
    return attempts < 30 ? next : null;
}

export function getPreviousSchoolDay(date = getSyncedDate()) {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 1);
    let attempts = 0;
    while (!isSchoolDay(prev) && attempts < 30) {
        prev.setDate(prev.getDate() - 1);
        attempts++;
    }
    return attempts < 30 ? prev : null;
}

// ── Duration Helpers ──────────────────────────────────────────────────────

export function formatDuration(minutes) {
    if (!minutes && minutes !== 0) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} hr`;
    return `${h}h ${m}m`;
}

export function formatDurationLong(minutes) {
    if (!minutes && minutes !== 0) return '0 minutes';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const parts = [];
    if (h) parts.push(`${h} hour${h > 1 ? 's' : ''}`);
    if (m) parts.push(`${m} minute${m > 1 ? 's' : ''}`);
    return parts.join(' ') || '0 minutes';
}

// ── Attendance Window Helpers ────────────────────────────────────────────

export function isWithinAttendanceWindow(startTime, endTime) {
    if (!startTime || !endTime) return false;
    const now = getSyncedDate();
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const start = new Date(now);
    start.setHours(startHour, startMinute - 10, 0, 0);
    const end = new Date(now);
    end.setHours(endHour, endMinute + 10, 0, 0);

    return now >= start && now <= end;
}

export function getRemainingTime(endTime) {
    if (!endTime) return 0;
    const now = getSyncedDate();
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const end = new Date(now);
    end.setHours(endHour, endMinute + 10, 0, 0);
    const diff = end - now;
    return Math.max(0, Math.floor(diff / 60000));
}

// ── Time Slot Generation ─────────────────────────────────────────────────

export function generateTimeSlots(startTime = '08:00', endTime = '17:00', intervalMinutes = 40) {
    if (!isValidTime(startTime) || !isValidTime(endTime)) return [];
    const slots = [];
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const current = getSyncedDate();
    current.setHours(startH, startM, 0, 0);
    const end = new Date(current);
    end.setHours(endH, endM, 0, 0);

    let periodNumber = 1;
    while (current < end) {
        const slotStart = `${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`;
        current.setMinutes(current.getMinutes() + intervalMinutes);
        const slotEnd = `${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`;
        slots.push({
            period: periodNumber,
            start: slotStart,
            end: slotEnd,
            label: `Period ${periodNumber}`,
            timeLabel: `${slotStart} - ${slotEnd}`,
        });
        periodNumber++;
    }
    return slots;
}

export function getCurrentPeriod(schedule, time = getSyncedDate()) {
    if (!schedule?.length) return null;
    const currentTime = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
    for (const period of schedule) {
        if (currentTime >= period.start && currentTime < period.end) return period;
    }
    return null;
}

export function getNextPeriod(schedule, time = getSyncedDate()) {
    if (!schedule?.length) return null;
    const currentTime = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
    for (const period of schedule) {
        if (period.start > currentTime) return period;
    }
    return null;
}

// ── Date Range Formatting ────────────────────────────────────────────────

export function formatDateRange(startDate, endDate) {
    if (!startDate || !endDate) return '';
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
    if (start.toDateString() === end.toDateString()) return formatDate(start);
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        return `${start.getDate()} - ${end.getDate()} ${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
    }
    if (start.getFullYear() === end.getFullYear()) {
        return `${start.getDate()} ${MONTH_NAMES[start.getMonth()]} - ${end.getDate()} ${MONTH_NAMES[end.getMonth()]} ${start.getFullYear()}`;
    }
    return `${formatDateShort(start)} - ${formatDateShort(end)}`;
}

// ── Countdown Timer ───────────────────────────────────────────────────────

export function getCountdown(targetDate) {
    if (!targetDate) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    const now = getSyncedDate();
    const target = new Date(targetDate);
    const diff = target - now;
    if (diff <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { expired: false, days, hours, minutes, seconds };
}

export function formatCountdown(countdown) {
    if (!countdown || countdown.expired) return 'Expired';
    const parts = [];
    if (countdown.days > 0) parts.push(`${countdown.days}d`);
    if (countdown.hours > 0) parts.push(`${countdown.hours}h`);
    if (countdown.minutes > 0) parts.push(`${countdown.minutes}m`);
    parts.push(`${countdown.seconds}s`);
    return parts.join(' ');
}

// ── Age Calculation ───────────────────────────────────────────────────────

export function calculateAge(dob) {
    if (!dob) return null;
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return null;
    const today = getSyncedDate();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
}

// ── Timestamp Utilities ───────────────────────────────────────────────────

export function toTimestamp(date) {
    if (!date) return null;
    return Math.floor(new Date(date).getTime() / 1000);
}

export function fromTimestamp(timestamp) {
    if (!timestamp) return null;
    return new Date(timestamp * 1000);
}

// ── Timezone Utilities ────────────────────────────────────────────────────

export function toLocalTime(utcDate, timezone = 'Africa/Nairobi') {
    if (!utcDate) return '';
    return new Date(utcDate).toLocaleString('en-US', { timeZone: timezone });
}

export function toUTC(localDate) {
    if (!localDate) return '';
    return new Date(localDate).toISOString();
}...so for the above  i want you to analyze the notifications app, for any missing features in the frontend or backend, also the notifications dont have the canonical for going back to previous page, also the crud operations for notifications are not fully implemented check for that. after your analysis provide the final critiuqe detailed with the source of the issues, incosistencies, errors, missing features, where modifications needed, while ensuring resposnviness to small mobile devies and responsive to dark and light mode. 


















<!-- Second the chat application missing fucntionalities: -->

the block users and other fucntionalities in the three dots fucntions icons, are not fucntional. fucntionalities on the chat app . so i want youto identofy sources of errors, incosistencies, missing features, ways to modify, mis alignment between the backend and frontend. also identfy all instances where placeholders have been used instead of real fucntions/features and suggest ways to actually implement them accurately ad fully::

C:\Users\GATARA-BJTU\academe\backend\apps\chat\admin.py;;
from django.contrib import admin
from .models import Conversation, Message

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'is_active', 'last_message_at')
    filter_horizontal = ('participants',)

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'conversation', 'sender', 'msg_type', 'created_at')


C:\Users\GATARA-BJTU\academe\backend\apps\chat\api.pyl;;;
# C:\Users\GATARA-BJTU\academe\backend\apps\chat\api.py

import uuid
from datetime import timedelta
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.utils import timezone
from django.db.models import Q
from ninja import Router
from ninja.errors import HttpError

from common.jwt_auth import JWTAuth

auth = JWTAuth()

from .models import Conversation, Message, BlockedUser
from .schema import (
    ConversationOut,
    MessageOut,
    MessageIn,
    PresignedUrlOut,
    PresignedUrlIn,
    StartConversationIn,
    BlockUserIn,
    MarkReadIn,
)
from django.contrib.auth import get_user_model

User = get_user_model()
router = Router()


# ─── Helper: build participant info for the other user ───
def build_participant_info(conv, current_user):
    """Return ParticipantInfo dict for the other user in the conversation."""
    other_user = conv.participants.exclude(id=current_user.id).first()
    if not other_user:
        return None

    # Use existing fields from your User model
    is_online = False
    if other_user.last_activity:
        is_online = (timezone.now() - other_user.last_activity) < timedelta(minutes=5)

    return {
        "id": other_user.id,
        "full_name": other_user.full_name,
        "class_name": other_user.class_name or other_user.institution or "Student",
        "is_online": is_online,
        "last_active": other_user.last_activity,
        "avatar_url": other_user.profile_pic or None,
    }


# ─── Helper: calculate unread count ───
def get_unread_count(conv, user):
    """Count messages from the other participant that are still unread."""
    other_user = conv.participants.exclude(id=user.id).first()
    if not other_user:
        return 0
    return Message.objects.filter(
        conversation=conv,
        sender=other_user,
        is_read=False,
    ).count()


# ─── Helper: check if a user is blocked ───
def is_user_blocked(blocker, blocked_user):
    """Check if blocker has blocked blocked_user."""
    return BlockedUser.objects.filter(
        blocker=blocker, blocked=blocked_user
    ).exists()


# ---------- Start a new conversation (or get existing) ----------
@router.post('/conversations/start', response=ConversationOut, auth=auth)
def start_conversation(request, payload: StartConversationIn):
    user_a = request.auth
    user_b = get_object_or_404(User, id=payload.receiver_id)

    if user_a == user_b:
        raise HttpError(400, "You cannot chat with yourself.")

    # Check if either user has blocked the other
    if is_user_blocked(user_b, user_a):
        raise HttpError(403, "You have been blocked by this user.")
    if is_user_blocked(user_a, user_b):
        raise HttpError(403, "You have blocked this user. Unblock to chat.")

    # Find existing conversation with exactly these two participants
    conv = Conversation.objects.filter(
        participants=user_a
    ).filter(
        participants=user_b
    ).distinct().first()

    if not conv:
        conv = Conversation.objects.create(is_active=True)
        conv.participants.add(user_a, user_b)
    else:
        conv.is_active = True
        conv.save(update_fields=['is_active'])

    participant_info = build_participant_info(conv, user_a)
    unread_count = get_unread_count(conv, user_a)

    return {
        "id": conv.id,
        "participant": participant_info,
        "is_active": conv.is_active,
        "last_message_preview": conv.last_message_preview,
        "last_message_at": conv.last_message_at,
        "unread_count": unread_count,
    }


# ---------- List user's conversations ----------
@router.get('/conversations', response=list[ConversationOut], auth=auth)
def list_conversations(request, archived: bool = False):
    user = request.auth
    convs = Conversation.objects.filter(
        participants=user,
        is_active=not archived
    ).order_by('-last_message_at')

    result = []
    for conv in convs:
        participant_info = build_participant_info(conv, user)
        unread_count = get_unread_count(conv, user)

        result.append({
            "id": conv.id,
            "participant": participant_info,
            "is_active": conv.is_active,
            "last_message_preview": conv.last_message_preview,
            "last_message_at": conv.last_message_at,
            "unread_count": unread_count,
        })
    return result


# ---------- Get messages (cursor-based pagination) ----------
@router.get('/conversations/{conv_id}/messages', response=list[MessageOut], auth=auth)
def get_messages(request, conv_id: uuid.UUID, before: uuid.UUID = None, limit: int = 50):
    conv = get_object_or_404(
        Conversation, id=conv_id, participants=request.auth, is_active=True
    )
    qs = Message.objects.filter(conversation=conv).select_related('sender')
    if before:
        qs = qs.filter(id__lt=before)
    messages = qs.order_by('-created_at')[:limit]

    return [{
        "id": m.id,
        "conversation_id": m.conversation_id,
        "sender_id": m.sender_id,
        "content": m.content,
        "file_url": m.file_url,
        "msg_type": m.msg_type,
        "created_at": m.created_at,
        "is_read": m.is_read,
    } for m in messages]


# ---------- Send a message ----------
@router.post('/conversations/{conv_id}/messages', response=MessageOut, auth=auth)
def post_message(request, conv_id: uuid.UUID, payload: MessageIn):
    conv = get_object_or_404(
        Conversation, id=conv_id, participants=request.auth, is_active=True
    )

    # Check if blocked
    other_user = conv.participants.exclude(id=request.auth.id).first()
    if other_user and is_user_blocked(other_user, request.auth):
        raise HttpError(403, "You have been blocked by this user.")

    message = Message.objects.create(
        conversation=conv,
        sender=request.auth,
        content=payload.content,
        file_url=payload.file_url,
        msg_type=payload.msg_type,
    )

    # Update conversation preview
    conv.last_message_preview = (payload.content or '')[:200]
    conv.last_message_at = message.created_at
    conv.save(update_fields=['last_message_preview', 'last_message_at'])

    # Update last_activity
    User.objects.filter(id=request.auth.id).update(last_activity=timezone.now())

    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "sender_id": message.sender_id,
        "content": message.content,
        "file_url": message.file_url,
        "msg_type": message.msg_type,
        "created_at": message.created_at,
        "is_read": message.is_read,
    }


# ---------- Mark messages as read ----------
@router.post('/conversations/{conv_id}/mark-read', auth=auth)
def mark_messages_read(request, conv_id: uuid.UUID, payload: MarkReadIn = None):
    """Mark messages from the other participant as read."""
    conv = get_object_or_404(
        Conversation, id=conv_id, participants=request.auth, is_active=True
    )

    qs = Message.objects.filter(
        conversation=conv,
        is_read=False,
    ).exclude(sender=request.auth)

    if payload and payload.message_ids:
        qs = qs.filter(id__in=payload.message_ids)

    count = qs.update(is_read=True)
    return {"success": True, "marked_read": count}


# ---------- Presigned URL for file upload ----------
@router.post('/presigned-url', response=PresignedUrlOut, auth=auth)
def generate_presigned_url(request, payload: PresignedUrlIn):
    import boto3
    from botocore.exceptions import NoCredentialsError

    # Block video files
    BLOCKED_MIME_PREFIXES = ['video/']
    if any(payload.content_type.startswith(p) for p in BLOCKED_MIME_PREFIXES):
        raise HttpError(400, "Video files are not allowed.")

    bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)
    region = getattr(settings, 'AWS_S3_REGION_NAME', None)
    access_key = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
    secret_key = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)

    if not all([bucket_name, region, access_key, secret_key]):
        raise HttpError(500, "File uploads are not configured. Please set AWS_* settings.")

    s3_client = boto3.client(
        's3',
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region,
    )
    key = f"chat_media/{uuid.uuid4()}/{payload.file_name}"
    try:
        presigned = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket_name,
                'Key': key,
                'ContentType': payload.content_type,
            },
            ExpiresIn=300
        )
        file_url = f"https://{bucket_name}.s3.{region}.amazonaws.com/{key}"
        return PresignedUrlOut(presigned_url=presigned, file_url=file_url)
    except NoCredentialsError:
        raise HttpError(500, "AWS credentials not configured.")


# ---------- Block / Unblock users ----------
@router.post('/block', auth=auth)
def block_user(request, payload: BlockUserIn):
    """Block a user - prevents them from messaging you."""
    if request.auth.id == payload.blocked_user_id:
        raise HttpError(400, "You cannot block yourself.")

    blocked_user = get_object_or_404(User, id=payload.blocked_user_id)

    _, created = BlockedUser.objects.get_or_create(
        blocker=request.auth,
        blocked=blocked_user,
    )

    # Deactivate conversations between these two users
    Conversation.objects.filter(
        participants=request.auth
    ).filter(
        participants=blocked_user
    ).distinct().update(is_active=False)

    return {"success": True, "blocked": created}


@router.delete('/block/{user_id}', auth=auth)
def unblock_user(request, user_id: uuid.UUID):
    """Unblock a previously blocked user."""
    deleted, _ = BlockedUser.objects.filter(
        blocker=request.auth,
        blocked_id=user_id,
    ).delete()
    return {"success": True, "unblocked": deleted > 0}


@router.get('/blocked', auth=auth)
def list_blocked_users(request):
    """List all users blocked by the current user."""
    blocked = BlockedUser.objects.filter(
        blocker=request.auth
    ).select_related('blocked')
    return [{
        "id": b.blocked.id,
        "full_name": b.blocked.full_name,
        "class_name": b.blocked.class_name or b.blocked.institution or "Student",
        "blocked_at": b.created_at,
    } for b in blocked]


# ---------- Archive / Unarchive / Delete conversations ----------
@router.patch('/conversations/{conv_id}/archive', auth=auth)
def archive_conversation(request, conv_id: uuid.UUID):
    """Archive (soft-delete) a conversation."""
    conv = get_object_or_404(
        Conversation, id=conv_id, participants=request.auth
    )
    conv.is_active = False
    conv.save(update_fields=['is_active'])
    return {"success": True}


@router.patch('/conversations/{conv_id}/unarchive', auth=auth)
def unarchive_conversation(request, conv_id: uuid.UUID):
    """Restore an archived conversation."""
    conv = get_object_or_404(
        Conversation, id=conv_id, participants=request.auth
    )
    conv.is_active = True
    conv.save(update_fields=['is_active'])
    return {"success": True}


@router.delete('/conversations/{conv_id}', auth=auth)
def delete_conversation(request, conv_id: uuid.UUID):
    """Permanently delete a conversation and all its messages."""
    conv = get_object_or_404(
        Conversation, id=conv_id, participants=request.auth
    )
    conv.delete()
    return {"success": True}


C:\Users\GATARA-BJTU\academe\backend\apps\chat\consumers.py;;;
# C:\Users\GATARA-BJTU\academe\backend\apps\chat\consumers.py

import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
import jwt
from django.conf import settings
from .models import Conversation, Message, BlockedUser

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'

        # Authenticate via JWT from query string
        token = self.scope.get('query_string', b'').decode()
        if not token:
            await self.close(code=4001)
            return

        user = await self.get_user_from_token(token)
        if not user:
            await self.close(code=4002)
            return

        self.user_id = user.id
        self.scope['user'] = user

        # Validate conversation and participation
        valid = await self.validate_participation()
        if not valid:
            await self.close(code=4003)
            return

        # Update last_seen on connect
        await self.update_last_seen()

        # Mark messages as read when user opens the conversation
        await self.mark_messages_as_read()

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)

        # Handle typing indicators
        if data.get('type') == 'typing':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_indicator',
                    'user_id': str(self.user_id),
                    'is_typing': data.get('is_typing', True),
                }
            )
            return

        # Handle mark-read events
        if data.get('type') == 'mark_read':
            await self.mark_messages_as_read()
            return

        if data.get('type') != 'chat_message':
            return

        # Rate limit (placeholder)
        await self.rate_limit_check()

        # Validate sender
        if data.get('sender_id') != str(self.user_id):
            return

        # Check if sender is blocked by the receiver
        is_blocked = await self.check_if_blocked()
        if is_blocked:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'You have been blocked by this user.',
            }))
            return

        # Save message
        message = await self.save_message(data)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': {
                    'id': str(message.id),
                    'conversation_id': self.conversation_id,
                    'sender_id': data['sender_id'],
                    'content': data.get('content', ''),
                    'file_url': data.get('file_url', ''),
                    'msg_type': data.get('msg_type', 'TEXT'),
                    'timestamp': message.created_at.isoformat(),
                    'is_read': message.is_read,
                }
            }
        )

    async def chat_message(self, event):
        """Send message to WebSocket."""
        await self.send(text_data=json.dumps(event['message']))

    async def typing_indicator(self, event):
        """Broadcast typing indicator to the group."""
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'user_id': event['user_id'],
            'is_typing': event['is_typing'],
        }))

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            return User.objects.get(id=payload['user_id'])
        except (jwt.ExpiredSignatureError, jwt.DecodeError, User.DoesNotExist):
            return None

    @database_sync_to_async
    def validate_participation(self):
        """Check if the user is a participant of the conversation."""
        conv = Conversation.objects.filter(
            id=self.conversation_id, is_active=True
        ).first()
        if not conv:
            return False
        return conv.participants.filter(id=self.user_id).exists()

    @database_sync_to_async
    def save_message(self, data):
        """Create a message in the database."""
        conversation = Conversation.objects.get(id=self.conversation_id)
        sender = User.objects.get(id=self.user_id)
        message = Message.objects.create(
            conversation=conversation,
            sender=sender,
            content=data.get('content', ''),
            file_url=data.get('file_url', ''),
            msg_type=data.get('msg_type', 'TEXT'),
        )
        # Update conversation preview
        conversation.last_message_preview = (data.get('content', '') or '')[:200]
        conversation.last_message_at = message.created_at
        conversation.save(update_fields=['last_message_preview', 'last_message_at'])
        return message

    @database_sync_to_async
    def check_if_blocked(self):
        """Check if the receiver has blocked the sender."""
        conv = Conversation.objects.get(id=self.conversation_id)
        receiver = conv.participants.exclude(id=self.user_id).first()
        if receiver:
            return BlockedUser.objects.filter(
                blocker=receiver, blocked_id=self.user_id
            ).exists()
        return False

    @database_sync_to_async
    def update_last_seen(self):
        """Update the user's last_seen timestamp."""
        User.objects.filter(id=self.user_id).update(last_seen=timezone.now())

    @database_sync_to_async
    def mark_messages_as_read(self):
        """Mark all messages from the other participant as read."""
        Message.objects.filter(
            conversation_id=self.conversation_id,
            is_read=False,
        ).exclude(sender_id=self.user_id).update(is_read=True)

    async def rate_limit_check(self):
        # Placeholder for real rate limiting
        pass


C:\Users\GATARA-BJTU\academe\backend\apps\chat\models.py;;

# C:\Users\GATARA-BJTU\academe\backend\apps\chat\models.py

import uuid
from django.db import models
from django.conf import settings
from common.models import BaseModel


class Conversation(BaseModel):
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        related_name='conversations'
    )
    is_active = models.BooleanField(default=True)
    last_message_preview = models.CharField(max_length=200, blank=True)
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-last_message_at']
        indexes = [
            models.Index(fields=['is_active', 'last_message_at']),
        ]

    def __str__(self):
        return f"Conversation {self.id}"

    def get_other_participant(self, user):
        """Return the other participant in this conversation."""
        return self.participants.exclude(id=user.id).first()


class Message(BaseModel):
    MESSAGE_TYPES = (
        ('TEXT', 'Text'),
        ('FILE', 'File'),
        ('VOICE', 'Voice'),
    )
    conversation = models.ForeignKey(
        Conversation, 
        on_delete=models.CASCADE, 
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE
    )
    content = models.TextField(blank=True, null=True)
    file_url = models.URLField(blank=True, null=True)
    msg_type = models.CharField(max_length=5, choices=MESSAGE_TYPES, default='TEXT')
    is_read = models.BooleanField(default=False)
    reply_to = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='replies'
    )

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['sender', 'is_read']),
            models.Index(fields=['conversation', 'sender', 'is_read']),
        ]

    def __str__(self):
        return f"Msg {self.id} in conv {self.conversation_id}"


class BlockedUser(BaseModel):
    """
    Tracks which users have been blocked.
    When user A blocks user B:
    - A cannot receive messages from B
    - Conversations between A and B are deactivated
    """
    blocker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='blocked_users'
    )
    blocked = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='blocked_by'
    )

    class Meta:
        unique_together = ('blocker', 'blocked')
        indexes = [
            models.Index(fields=['blocker', 'blocked']),
        ]
        verbose_name = 'Blocked User'
        verbose_name_plural = 'Blocked Users'

    def __str__(self):
        return f"{self.blocker.full_name} blocked {self.blocked.full_name}"


C:\Users\GATARA-BJTU\academe\backend\apps\chat\schema.py;;;

# C:\Users\GATARA-BJTU\academe\backend\apps\chat\schema.py

from ninja import Schema
from datetime import datetime
from typing import Optional, List
import uuid

name = 'person'
print(name)
class StartConversationIn(Schema):
    receiver_id: uuid.UUID


class ParticipantInfo(Schema):
    """Information about the other participant in a conversation."""
    id: uuid.UUID
    full_name: str
    class_name: Optional[str] = None
    is_online: bool = False
    last_active: Optional[datetime] = None
    avatar_url: Optional[str] = None


class ConversationOut(Schema):
    id: uuid.UUID
    participant: Optional[ParticipantInfo] = None  # The OTHER user
    is_active: bool
    last_message_preview: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0


class MessageIn(Schema):
    content: Optional[str] = None
    file_url: Optional[str] = None
    msg_type: str = 'TEXT'


class MessageOut(Schema):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    content: Optional[str] = None
    file_url: Optional[str] = None
    msg_type: str
    created_at: datetime
    is_read: bool = False


class PresignedUrlIn(Schema):
    file_name: str
    content_type: str


class PresignedUrlOut(Schema):
    presigned_url: str
    file_url: str


class BlockUserIn(Schema):
    blocked_user_id: uuid.UUID


class MarkReadIn(Schema):
    message_ids: List[uuid.UUID] = []


C:\Users\GATARA-BJTU\academe\backend\common\jwt_auth.py;;

import jwt
import uuid
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings
from ninja.security import HttpBearer

# Simple in-memory blacklist (replace with Redis/DB in production)
BLACKLISTED_TOKENS = set()

class JWTAuth(HttpBearer):
    def authenticate(self, request, token):
        from apps.accounts.models import User
        
        # Check blacklist
        if token in BLACKLISTED_TOKENS:
            return None
        
        try:
            # Use JWT_SECRET_KEY if defined, otherwise SECRET_KEY
            secret = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
            payload = jwt.decode(token, secret, algorithms=["HS256"])
            user_id = payload.get("user_id")
            if not user_id:
                return None
            
            user = User.objects.get(id=user_id, is_active=True)
            
            # Optional: check token issued before password change
            if hasattr(user, 'last_password_change') and user.last_password_change:
                iat = payload.get('iat')
                if iat and user.last_password_change.timestamp() > iat:
                    return None
            
            return user
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
        except User.DoesNotExist:
            return None
        except Exception:
            return None

def create_token(user, token_type="access"):
    secret = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
    
    # Use PlatformDefaults for expiry
    from common.constants import PlatformDefaults
    if token_type == "access":
        expiry_delta = timedelta(minutes=PlatformDefaults.ACCESS_TOKEN_EXPIRY_MINUTES)
    else:
        expiry_delta = timedelta(days=PlatformDefaults.REFRESH_TOKEN_EXPIRY_DAYS)
    
    expiry = timezone.now() + expiry_delta
    
    payload = {
        "user_id": str(user.id),
        "jti": str(uuid.uuid4()),
        "exp": expiry,
        "type": token_type,
        "iat": timezone.now().timestamp(),
    }
    
    return jwt.encode(payload, secret, algorithm="HS256")

def create_token_pair(user):
    """Create access and refresh token pair"""
    return {
        "access": create_token(user, "access"),
        "refresh": create_token(user, "refresh"),
    }

def blacklist_token(token):
    """Add a token to the blacklist (call on logout, password change)"""
    BLACKLISTED_TOKENS.add(token)
    # Optional: schedule cleanup after expiry

# C:\Users\GATARA-BJTU\academe\backend\academe\celery.py
import os
from celery import Celery
from celery.schedules import crontab

# Set default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'academe.settings')

app = Celery('academe')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Merge all tasks into a single dictionary
app.conf.beat_schedule = {
    # --- Content Maintenance ---
    'delete-expired-announcements': {
        'task': 'apps.announcements.tasks.delete_expired_announcements',
        'schedule': crontab(hour=0, minute=0),
    },
    'delete-expired-opportunities': {
        'task': 'apps.opportunities.tasks.delete_expired_opportunities',
        'schedule': crontab(hour=1, minute=0),
    },
    
    # --- User & Account Maintenance ---
    'calculate-badges': {
        'task': 'apps.accounts.tasks.calculate_badges',
        'schedule': crontab(hour=2, minute=0),
    },
    'expire-roles-daily': {
        'task': 'apps.accounts.tasks.expire_roles',
        'schedule': crontab(hour=2, minute=0),
    },
    'cleanup-expired-sessions-daily': {
        'task': 'apps.accounts.tasks.cleanup_expired_sessions',
        'schedule': crontab(hour=3, minute=0),
    },
    'notify-upcoming-expirations-weekly': {
        'task': 'apps.accounts.tasks.notify_upcoming_role_expirations',
        'schedule': crontab(hour=8, minute=0, day_of_week=1),
    },
    'archive-audit-logs-monthly': {
        'task': 'apps.accounts.tasks.archive_old_audit_logs',
        'schedule': crontab(hour=4, minute=0, day_of_month=1),
    },
    
    # --- System & Transaction Maintenance ---
    'send-daily-reminders': {
        'task': 'apps.classes.tasks.send_daily_reminders',
        'schedule': crontab(hour=6, minute=0),
    },
    'auto-confirm-escrow': {
        'task': 'apps.found_items.tasks.auto_confirm_escrow',
        'schedule': crontab(hour=3, minute=0),
    },
    'cleanup-transaction-logs': {
        'task': 'apps.found_items.tasks.cleanup_transaction_logs',
        'schedule': crontab(hour=4, minute=0),
    },
}

# C:\Users\GATARA-BJTU\academe\backend\academe\routing.py
from django.urls import path
from apps.chat.consumers import ChatConsumer
from apps.notifications.consumers import NotificationConsumer

websocket_urlpatterns = [
    path('ws/chat/<uuid:conversation_id>/', ChatConsumer.as_asgi()),
    path('ws/notifications/', NotificationConsumer.as_asgi()),
]


# C:\Users\GATARA-BJTU\academe\backend\academe\settings.py
import os
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'your-secret-key-here')
DEBUG = os.getenv('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '*').split(',')

INSTALLED_APPS = [
    'jazzmin',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    'corsheaders',
    'storages',
    'channels',
    
    'apps.accounts',
    'apps.classes',
    'apps.found_items',
    'apps.announcements',
    'apps.opportunities',
    'apps.support',
    'apps.blog',
    'apps.search',
    'apps.geoservice',
    'apps.governance',
    'apps.notifications',
    'apps.chat',
    'common',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'common.middleware.RateLimitMiddleware',
    'common.middleware.UpdateLastSeenMiddleware',
]

ROOT_URLCONF = 'academe.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'academe.wsgi.application'
ASGI_APPLICATION = 'academe.asgi.application'

# for prodcution im shifting to postgre 

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
        'OPTIONS': {
            'timeout': 20,
        },
    }
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}

AUTH_USER_MODEL = 'accounts.User'
AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Nairobi'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

CORS_ALLOW_ALL_ORIGINS = DEBUG

CORS_ALLOW_HEADERS = [
    "accept",
    "authorization",
    "content-type",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "ngrok-skip-browser-warning",
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://10.5.50.15:5173",
    "https://granitic-imbricately-dede.ngrok-free.dev",
]

if DEBUG:
    CELERY_BROKER_URL = 'memory://'
    CELERY_RESULT_BACKEND = 'cache+memory://'
else:
    CELERY_BROKER_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    CELERY_RESULT_BACKEND = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Africa/Nairobi'

NINJA_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=24),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME')
AWS_S3_REGION_NAME = os.getenv('AWS_S3_REGION_NAME', 'us-east-1')
AWS_DEFAULT_ACL = 'private'
AWS_S3_ENCRYPTION = True

if DEBUG and not AWS_ACCESS_KEY_ID:
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'

AWS_PRIVATE_BUCKET_NAME = os.getenv('AWS_PRIVATE_BUCKET_NAME', AWS_STORAGE_BUCKET_NAME)
AWS_PUBLIC_BUCKET_NAME = os.getenv('AWS_PUBLIC_BUCKET_NAME', AWS_STORAGE_BUCKET_NAME)

FIREBASE_CREDENTIALS = os.getenv('FIREBASE_CREDENTIALS_PATH')

INTASEND_SECRET_KEY = os.getenv('INTASEND_SECRET_KEY')
INTASEND_PUBLISHABLE_KEY = os.getenv('INTASEND_PUBLISHABLE_KEY')

OTP_RATE_LIMIT = 3
OTP_RATE_WINDOW = 3600

ATTENDANCE_WINDOW_BEFORE = 10
ATTENDANCE_WINDOW_AFTER = 10
SYNC_GRACE_PERIOD = 30

ESCROW_AUTO_CONFIRM_DAYS = 7
ESCROW_FEE_PERCENTAGE = 50
PLATFORM_FEE_PERCENTAGE = 50

SEARCH_BACKEND = 'django.db.models.Q'

DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

# ============================================
# JAZZMIN – MINIMAL SETTINGS (engine handles the rest)
# ============================================
JAZZMIN_SETTINGS = {
    "site_title": "Academe Admin",
    "site_header": "Academe",
    "site_brand": "Academe",
    "welcome_sign": "Welcome to Academe",
    "copyright": "Academe – Student Affairs Platform",

    "show_sidebar": False,
    "navigation_expanded": False,
    "hide_apps": [],
    "hide_models": [],

    "topmenu_links": [],

    "usermenu_links": [
        {"name": "Profile", "model": "accounts.User"},
        {"name": "Logout", "url": "admin:logout"},
    ],

    "icons": {
        "accounts.User": "fas fa-user-graduate",
        "accounts.Badge": "fas fa-medal",
        "found_items.FoundItem": "fas fa-box-open",
        "announcements.Announcement": "fas fa-bullhorn",
        "opportunities.Opportunity": "fas fa-briefcase",
        "classes.ClassGroup": "fas fa-layer-group",
        "support.SupportTicket": "fas fa-ticket-alt",
        "auth.Group": "fas fa-users-cog",
    },
    "default_icon_parents": "fas fa-chevron-circle-right",
    "default_icon_children": "fas fa-circle",

    "related_modal_active": True,
    "custom_css": "admin/css/custom_admin.css",
    "custom_js": "admin/js/academe_engine.js",   # ✅ Updated to new engine file
    "show_ui_builder": False,
    "changeform_format": "horizontal_tabs",
    "language_chooser": False,
}

# Stripped down – the engine handles all visual layout
JAZZMIN_UI_TWEAKS = {
    "navbar_small_text": False,
    "footer_small_text": True,
    "theme": "slate",
    "sidebar_nav_flat_style": True,
    "actions_sticky_top": True,
    "navbar": "navbar-dark bg-dark",
    "sidebar": "sidebar-dark-primary",
}

#  REMOVED JAZZMIN_DASHBOARD – the engine injects its own layout

ADMIN_SITE_HEADER = "Academe Administration"
ADMIN_SITE_TITLE = "Academe Admin Portal"
ADMIN_INDEX_TITLE = "Welcome to Academe Dashboard"
ADMIN_LIST_PER_PAGE = 20


# C:\Users\GATARA-BJTU\academe\backend\academe\urls.py

from django.contrib import admin
from django.urls import path
from ninja import NinjaAPI

# Imports for serving static/media files in development
from django.conf import settings
from django.conf.urls.static import static

from apps.accounts.api import router as accounts_router
from apps.classes.api import router as classes_router
from apps.found_items.api import router as found_items_router
from apps.announcements.api import router as announcements_router
from apps.opportunities.api import router as opportunities_router
from apps.support.api import router as support_router
from apps.blog.api import router as blog_router
from apps.search.api import router as search_router
from apps.geoservice.api import router as geoservice_router
from apps.governance.api import router as governance_router
from apps.notifications.api import router as notifications_router
from apps.chat.api import router as chat_router

api = NinjaAPI(
    title="Academe API",
    version="1.0.0",
)

# Mount all routers under the /api/ prefix
api.add_router("/accounts/", accounts_router, tags=["Accounts"])
api.add_router("/classes/", classes_router, tags=["Classes"])
api.add_router("/found-items/", found_items_router, tags=["Found Items"])
api.add_router("/announcements/", announcements_router, tags=["Announcements"])
api.add_router("/opportunities/", opportunities_router, tags=["Opportunities"])
api.add_router("/support/", support_router, tags=["Support"])
api.add_router("/search/", search_router, tags=["Search"])
api.add_router("/blog/", blog_router, tags=["Blog"])
api.add_router("/geo/", geoservice_router, tags=["Geoservice"])
api.add_router("/governance/", governance_router, tags=["Governance"])
api.add_router("/notifications/", notifications_router, tags=["Notifications"])
api.add_router("/chat/", chat_router, tags=["Chat"])

# Health check
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({'status': 'ok', 'version': '1.0.0'})

urlpatterns = [
    path('health/', health_check),
    path('api/health/', health_check),
    path('admin/', admin.site.urls),
    path('api/', api.urls),
]

# ✅ Serve media AND static files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)





so the below is  the accounts app backend and frontend files:. so the multistep process of signup is not fully complete. identofy missing features, fucntions, and incositencies, errors, where modifications are required, and how to implement them. also where there are placeholders , i want to implement reality fucntionalities and how to rectify provide etailed explanations.


create a command for git bash terminal mingw64 to collect the files for the below folders and their files with full complete code for each folders files below complete as a project dump. 
C:\Users\GATARA-BJTU\academe\frontend\src\pages
C:\Users\GATARA-BJTU\academe\frontend\src\services
C:\Users\GATARA-BJTU\academe\frontend\src\utils
C:\Users\GATARA-BJTU\academe\frontend\src\App.jsx
C:\Users\GATARA-BJTU\academe\frontend\src\index.css
C:\Users\GATARA-BJTU\academe\frontend\src\main.jsx
C:\Users\GATARA-BJTU\academe\frontend\src\contexts
C:\Users\GATARA-BJTU\academe\frontend\src\components\shared
C:\Users\GATARA-BJTU\academe\frontend\src\components\ui
C:\Users\GATARA-BJTU\academe\frontend\src\api
C:\Users\GATARA-BJTU\academe\backend\apps\accounts
C:\Users\GATARA-BJTU\academe\backend\common
C:\Users\GATARA-BJTU\academe\backend\academe