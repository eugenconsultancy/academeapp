# apps/opportunities/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Opportunity, ScholarshipReview
from apps.notifications.services import NotificationService
from apps.accounts.models import User
from common.constants import ScholarshipReviewStatus, UserRole


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


@receiver(post_save, sender=ScholarshipReview)
def scholarship_review_paid_notify(sender, instance, created, **kwargs):
    if instance.status == ScholarshipReviewStatus.PAID.value:
        # Only notify when the review becomes paid
        admins = User.objects.filter(role=UserRole.ADMIN.value, is_active=True)
        if admins.exists():
            NotificationService.send_bulk(
                users=admins,
                title="New Scholarship Review Ready",
                message=f"{instance.student.full_name} submitted a scholarship review for '{instance.opportunity.title}'.",
                notification_type="scholarship_review_ready",
                link=f"/admin/opportunities/scholarshipreview/{instance.id}/change/",
                source_type="scholarship_review",
                source_id=str(instance.id),
            )