# backend/academe/celery.py
import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'academe.settings')

app = Celery('academe')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.task_time_limit = 3600
app.conf.task_soft_time_limit = 3000

app.conf.beat_schedule = {
    # --- Content Maintenance ---
    'delete-expired-announcements': {
        'task': 'apps.announcements.tasks.delete_expired_announcements',
        'schedule': crontab(hour=0, minute=0),
    },
    'delete-expired-opportunities': {
        'task': 'apps.opportunities.tasks.delete_expired_opportunities',
        'schedule': crontab(hour=0, minute=30),
    },

    # --- User & Account Maintenance ---
    'calculate-badges': {
        'task': 'apps.accounts.tasks.calculate_badges',
        'schedule': crontab(hour=2, minute=0),
    },
    'expire-roles-daily': {
        'task': 'apps.accounts.tasks.expire_roles',
        'schedule': crontab(hour=2, minute=30),
    },
    'cleanup-expired-sessions-daily': {
        'task': 'apps.accounts.tasks.cleanup_expired_sessions',
        'schedule': crontab(hour=3, minute=15),
    },
    'notify-upcoming-expirations-weekly': {
        'task': 'apps.accounts.tasks.notify_upcoming_role_expirations',
        'schedule': crontab(hour=8, minute=0, day_of_week=1),
    },
    'archive-audit-logs-monthly': {
        'task': 'apps.accounts.tasks.archive_old_audit_logs',
        'schedule': crontab(hour=4, minute=45, day_of_month=1),
    },

    # --- System & Transaction Maintenance ---
    'send-daily-reminders': {
        'task': 'apps.classes.tasks.send_daily_reminders',
        'schedule': crontab(hour=6, minute=0),
    },
    'auto-confirm-escrow': {
        'task': 'apps.found_items.tasks.auto_confirm_escrow',
        'schedule': crontab(hour=3, minute=45),
    },
    'cleanup-transaction-logs': {
        'task': 'apps.found_items.tasks.cleanup_transaction_logs',
        'schedule': crontab(hour=4, minute=15),
    },

    # --- GeoService Privacy Cleanup (GDPR) ---
    'cleanup-old-location-history': {
        'task': 'apps.geoservice.tasks.cleanup_old_location_history',
        'schedule': crontab(hour=3, minute=0),   # daily at 3 AM
    },

    # --- Chat specific ---
    'chat-cleanup-old-attachments': {
        'task': 'apps.chat.tasks.cleanup_old_attachments',
        'schedule': crontab(hour=5, minute=0),
    },
    'chat-sync-block-cache': {
        'task': 'apps.chat.tasks.sync_block_cache',
        'schedule': crontab(hour=1, minute=30),
    },
    'chat-cleanup-stale-presence': {
        'task': 'apps.chat.tasks.cleanup_stale_presence',
        'schedule': crontab(minute=15),
    },
    'chat-cleanup-expired-device-tokens': {
        'task': 'apps.chat.tasks.cleanup_expired_device_tokens',
        'schedule': crontab(hour=3, minute=0, day_of_week=1),
    },
    'chat-cleanup-empty-conversations': {
        'task': 'apps.chat.tasks.cleanup_empty_conversations',
        'schedule': crontab(hour=5, minute=30, day_of_week=1),
    },
    'chat-cleanup-old-read-receipts': {
        'task': 'apps.chat.tasks.cleanup_old_read_receipts',
        'schedule': crontab(hour=4, minute=0, day_of_month=1),
    },

    # ── NEW: Scholarship review SLA check ─────────────────────────────────────
    'check-scholarship-review-slas': {
        'task': 'apps.opportunities.tasks.check_scholarship_review_slas',
        'schedule': crontab(hour=5, minute=30),
    },
}