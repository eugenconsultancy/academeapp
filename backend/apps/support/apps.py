# backend/apps/support/apps.py
from django.apps import AppConfig


class SupportConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.support'
    label = 'support'
    verbose_name = 'Support Tickets'

    def ready(self):
        # Import signals to register them
        import apps.support.signals