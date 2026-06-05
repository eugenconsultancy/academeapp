from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Opportunity
from apps.notifications.services import NotificationService
from apps.accounts.models import User

@receiver(post_save, sender=Opportunity)
def opportunity_created_notify(sender, instance, created, **kwargs):
    if created and instance.is_active:
        # Notify all active students about the new opportunity
        students = User.objects.filter(is_active=True)
        title = f"New Opportunity: {instance.title}"
        message = instance.description[:200]
        NotificationService.send_bulk(
            users=students,
            title=title,
            message=message,
            notification_type="opportunity",
            link=f"/opportunities/{instance.id}",
            source_type="opportunity",
            source_id=instance.id,
        )