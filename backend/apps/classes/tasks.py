# backend/apps/classes/tasks.py
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

    for student in students:
        class_groups = ClassGroup.objects.filter(students=student)
        entries = TimetableEntry.objects.filter(
            class_group__in=class_groups,
            day_of_week=day_of_week,
            is_active=True
        ).order_by('start_time')

        message = TimetableService.format_reminder_message(student, entries)

        try:
            # ✅ NotificationService methods are static — call them on the class
            NotificationService.create_and_push(
                user=student,
                title="Today's Timetable",
                message=message,
                notification_type="daily_reminder",
                data={'type': 'daily_reminder'},
            )
        except Exception as e:
            logger.error(
                f"Failed to dispatch daily notification to user {student.id}: {e}"
            )