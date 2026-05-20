from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import CampusVenue
from .services import LocationService


@receiver(post_save, sender=CampusVenue)
def auto_geocode_venue(sender, instance, created, **kwargs):
    """
    Auto-geocode a CampusVenue when it's saved without coordinates
    but has a name or address.
    """
    if not instance.latitude or not instance.longitude:
        address = instance.full_address or f"{instance.name}, {instance.institution}"
        if address.strip():
            service = LocationService()
            coords = service.geocode_address(address)
            if coords:
                # Update without triggering another save signal
                CampusVenue.objects.filter(pk=instance.pk).update(
                    latitude=coords[0],
                    longitude=coords[1]
                )
