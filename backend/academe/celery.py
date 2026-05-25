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