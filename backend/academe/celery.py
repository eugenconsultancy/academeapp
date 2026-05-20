import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'academe.settings')

app = Celery('academe')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Configure periodic tasks
app.conf.beat_schedule = {
    'delete-expired-announcements': {
        'task': 'apps.announcements.tasks.delete_expired_announcements',
        'schedule': crontab(hour=0, minute=0),  # Daily at midnight
    },
    'delete-expired-opportunities': {
        'task': 'apps.opportunities.tasks.delete_expired_opportunities',
        'schedule': crontab(hour=1, minute=0),  # Daily at 1 AM (usiku)
    },
    'calculate-badges': {
        'task': 'apps.accounts.tasks.calculate_badges',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
    },
    'send-daily-reminders': {
        'task': 'apps.classes.tasks.send_daily_reminders',
        'schedule': crontab(hour=6, minute=0),  # Daily at 6 AM EAT
    },
    'auto-confirm-escrow': {
        'task': 'apps.found_items.tasks.auto_confirm_escrow',
        'schedule': crontab(hour=3, minute=0),  # Daily at 3 AM
    },
    'cleanup-transaction-logs': {
        'task': 'apps.found_items.tasks.cleanup_transaction_logs',
        'schedule': crontab(hour=4, minute=0),  # Daily at 4 AM
    },
}


# celery.py or settings.py
from celery.schedules import crontab

app.conf.beat_schedule = {
    'expire-roles-daily': {
        'task': 'apps.accounts.tasks.expire_roles',
        'schedule': crontab(hour=2, minute=0),  # 02:00 UTC daily
    },
    'notify-upcoming-expirations-weekly': {
        'task': 'apps.accounts.tasks.notify_upcoming_role_expirations',
        'schedule': crontab(hour=8, minute=0, day_of_week=1),  # Monday 8 AM
    },
    'cleanup-expired-sessions-daily': {
        'task': 'apps.accounts.tasks.cleanup_expired_sessions',
        'schedule': crontab(hour=3, minute=0),  # 03:00 UTC daily
    },
    'archive-audit-logs-monthly': {
        'task': 'apps.accounts.tasks.archive_old_audit_logs',
        'schedule': crontab(hour=4, minute=0, day_of_month=1),  # 1st of month
    },
}