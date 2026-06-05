from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import FoundItem, Claim
from apps.notifications.services import NotificationService

@receiver(post_save, sender=FoundItem)
def found_item_posted_notify(sender, instance, created, **kwargs):
    if created:
        # Notify admins about the new found item
        from apps.accounts.models import User
        admins = User.objects.filter(role='admin', is_active=True)
        if admins.exists():
            NotificationService.send_bulk(
                users=admins,
                title="New Found Item Posted",
                message=f"{instance.title} has been posted for recovery.",
                notification_type="item_found",
                link=f"/found-items/{instance.id}",
                source_type="found_item",
                source_id=instance.id,
            )

@receiver(post_save, sender=Claim)
def claim_status_changed(sender, instance, created, **kwargs):
    # Notify the claimant when claim status changes
    if created or (instance.tracker and instance.tracker.has_changed('status')):
        user = instance.claimant
        title = "Claim Update"
        message = f"Your claim for '{instance.item.title}' is now {instance.get_status_display()}."
        NotificationService.create_and_push(
            user=user,
            title=title,
            message=message,
            notification_type="claim_update",
            link=f"/claims/{instance.id}",
            source_type="found_item",
            source_id=instance.item_id,
        )