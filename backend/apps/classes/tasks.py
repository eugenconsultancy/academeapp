from celery import shared_task
from django.utils import timezone
from .models import TimetableEntry, ClassGroup
from apps.notifications.services import NotificationService
from .services import TimetableService
import logging

logger = logging.getLogger(__name__)

@shared_task
def send_daily_reminders():
    """Send daily class reminders to all students at 6 AM"""
    today = timezone.localtime()
    day_of_week = today.weekday()

    from accounts.models import User

    students = User.objects.filter(is_active=True)
    notifier = NotificationService()

    for student in students:
        class_groups = ClassGroup.objects.filter(students=student)
        entries = TimetableEntry.objects.filter(
            class_group__in=class_groups,
            day_of_week=day_of_week,
            is_active=True
        ).order_by('start_time')

        message = TimetableService.format_reminder_message(student, entries)

        try:
            notifier.send_push_notification(
                student,
                "Today's Timetable",
                message,
                {'type': 'daily_reminder'}
            )
        except Exception as e:
            logger.error(f"Failed to dispatch daily notification to user {student.id}: {e}")