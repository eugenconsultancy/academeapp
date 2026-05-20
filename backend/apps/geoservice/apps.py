from django.apps import AppConfig


class GeoserviceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.geoservice'
    verbose_name = 'Location Services'
    
    def ready(self):
        import apps.geoservice.signals  # noqa
