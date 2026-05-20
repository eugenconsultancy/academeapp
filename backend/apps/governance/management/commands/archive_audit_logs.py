from django.core.management.base import BaseCommand
from apps.governance.tasks import archive_old_audit_logs


class Command(BaseCommand):
    help = 'Archive audit logs older than 1 year to cold storage'

    def handle(self, *args, **kwargs):
        self.stdout.write('Starting audit log archival...')
        result = archive_old_audit_logs()
        self.stdout.write(self.style.SUCCESS(result))