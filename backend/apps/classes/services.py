from datetime import datetime, timedelta
from django.utils import timezone
from .models import TimetableEntry, AttendanceRecord, ClassGroup


class AttendanceService:
    @staticmethod
    def mark_attendance(student, entry_id):
        entry = TimetableEntry.objects.get(id=entry_id)
        today = timezone.localtime().date()
        
        existing = AttendanceRecord.objects.filter(
            student=student,
            timetable_entry=entry,
            date=today
        ).exists()
        
        if existing:
            return None, "Already marked"
        
        record = AttendanceRecord.objects.create(
            student=student,
            timetable_entry=entry,
            date=today
        )
        return record, None
    
    @staticmethod
    def get_weekly_summary(student):
        today = timezone.localtime().date()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        
        class_groups = ClassGroup.objects.filter(students=student)
        total = TimetableEntry.objects.filter(class_group__in=class_groups, is_active=True).count()
        marked = AttendanceRecord.objects.filter(student=student, date__gte=week_start, date__lte=week_end).count()
        
        return {
            "week_start": str(week_start),
            "week_end": str(week_end),
            "total_classes": total,
            "marked_count": marked,
            "percentage": round((marked / total * 100) if total > 0 else 0, 1),
            "daily_breakdown": {}
        }


class TimetableService:
    @staticmethod
    def get_today_classes(user):
        today = timezone.localtime()
        day_of_week = today.weekday()
        class_groups = ClassGroup.objects.filter(students=user)
        entries = TimetableEntry.objects.filter(
            class_group__in=class_groups,
            day_of_week=day_of_week,
            is_active=True
        )
        
        result = []
        for entry in entries:
            is_marked = AttendanceRecord.objects.filter(
                student=user,
                timetable_entry=entry,
                date=today.date()
            ).exists()
            
            result.append({
                "id": str(entry.id),
                "unit_name": entry.unit_name,
                "start_time": str(entry.start_time),
                "end_time": str(entry.end_time),
                "venue": entry.venue,
                "lecturer": entry.lecturer,
                "is_marked": is_marked,
                "can_mark": not is_marked,
                "remaining_time": 30
            })
        return result
