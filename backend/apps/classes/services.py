from datetime import datetime, timedelta
from django.utils import timezone
from .models import TimetableEntry, AttendanceRecord, ClassGroup
from .location_service import LocationService

class AttendanceService:
    @staticmethod
    def mark_attendance(student, entry_id, student_lat=None, student_lon=None):
        entry = TimetableEntry.objects.get(id=entry_id)
        today = timezone.localtime().date()

        # Prevent duplicate attendance
        existing = AttendanceRecord.objects.filter(
            student=student, timetable_entry=entry, date=today
        ).exists()
        if existing:
            return None, "Already marked"

        # Geofence verification if GPS coordinates provided
        if student_lat is not None and student_lon is not None:
            loc_svc = LocationService()
            venue_coords = loc_svc.get_venue_coordinates(entry)
            if venue_coords:
                is_within, distance = loc_svc.is_within_radius(
                    float(student_lat), float(student_lon),
                    venue_coords[0], venue_coords[1], radius_meters=100
                )
                if not is_within:
                    return None, f"Too far from venue. You are {loc_svc.format_distance(distance)} away."

        record = AttendanceRecord.objects.create(
            student=student,
            timetable_entry=entry,
            date=today,
            sync_method='online'
        )
        return record, None

    @staticmethod
    def get_weekly_summary(student):
        today = timezone.localtime().date()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)

        class_groups = ClassGroup.objects.filter(students=student)
        total = TimetableEntry.objects.filter(class_group__in=class_groups, is_active=True).count()
        records = AttendanceRecord.objects.filter(student=student, date__gte=week_start, date__lte=week_end)

        # Build daily breakdown from real data
        days_map = {0: "Monday", 1: "Tuesday", 2: "Wednesday", 3: "Thursday", 4: "Friday", 5: "Saturday", 6: "Sunday"}
        breakdown = {day: 0 for day in days_map.values()}
        for r in records:
            day_name = days_map.get(r.timetable_entry.day_of_week)
            if day_name:
                breakdown[day_name] += 1

        return {
            "week_start": str(week_start),
            "week_end": str(week_end),
            "total_classes": total,
            "marked_count": records.count(),
            "percentage": round((records.count() / total * 100) if total > 0 else 0, 1),
            "daily_breakdown": breakdown
        }

class TimetableService:
    @staticmethod
    def format_reminder_message(student, entries):
        """Helper used by Celery tasks to build the notification text."""
        if not entries.exists():
            return "You have no classes today!"
        msg = f"Hello {student.full_name}, your classes today:\n"
        for e in entries:
            msg += f"- {e.unit_name} at {e.venue} ({e.start_time})\n"
        return msg

    @staticmethod
    def get_today_classes(user):
        now = timezone.localtime()
        today_date = now.date()

        class_groups = ClassGroup.objects.filter(students=user)
        entries = TimetableEntry.objects.filter(
            class_group__in=class_groups, day_of_week=now.weekday(), is_active=True
        )

        result = []
        for entry in entries:
            is_marked = AttendanceRecord.objects.filter(
                student=user, timetable_entry=entry, date=today_date
            ).exists()

            class_end = timezone.make_aware(datetime.combine(today_date, entry.end_time))
            class_start = timezone.make_aware(datetime.combine(today_date, entry.start_time))

            remaining_time = 0
            if now < class_end:
                remaining_time = int((class_end - now).total_seconds() / 60)

            can_mark = not is_marked and (class_start <= now <= class_end)

            result.append({
                "id": str(entry.id),
                "unit_name": entry.unit_name,
                "start_time": str(entry.start_time),
                "end_time": str(entry.end_time),
                "venue": entry.venue,
                "lecturer": entry.lecturer,
                "is_marked": is_marked,
                "can_mark": can_mark,
                "remaining_time": remaining_time,
                "latitude": float(entry.latitude) if entry.latitude else None,     # <-- NEW
                "longitude": float(entry.longitude) if entry.longitude else None,  # <-- NEW
            })
        return result