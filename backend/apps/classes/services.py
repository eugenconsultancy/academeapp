from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Count, Q
from .models import TimetableEntry, AttendanceRecord, ClassGroup, Term
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

    # ── NEW METHODS ────────────────────────────────────────────────────────

    @staticmethod
    def get_filtered_records(filters, user):
        """
        Return queryset of AttendanceRecord filtered by the given dict.
        filters can contain: class_id, student, term, date_from, date_to, limit, ordering.
        """
        qs = AttendanceRecord.objects.select_related('student', 'timetable_entry')

        # Filter by class (through timetable_entry's class_group)
        if filters.get('class_id'):
            qs = qs.filter(timetable_entry__class_group_id=filters['class_id'])

        # Filter by student
        if filters.get('student'):
            qs = qs.filter(student_id=filters['student'])

        # Filter by term (if a Term model exists)
        if filters.get('term'):
            try:
                term = Term.objects.get(id=filters['term'])
                qs = qs.filter(date__gte=term.start_date, date__lte=term.end_date)
            except Term.DoesNotExist:
                pass

        # Date range
        if filters.get('date_from'):
            qs = qs.filter(date__gte=filters['date_from'])
        if filters.get('date_to'):
            qs = qs.filter(date__lte=filters['date_to'])

        # Ordering
        if filters.get('ordering'):
            qs = qs.order_by(filters['ordering'])

        # Limit
        if filters.get('limit'):
            qs = qs[:int(filters['limit'])]

        return qs

    @staticmethod
    def class_attendance_summary(class_id, term_id):
        """Return per‑student attendance summary for a class and term."""
        total_classes = TimetableEntry.objects.filter(
            class_group_id=class_id, is_active=True
        ).count()

        try:
            term = Term.objects.get(id=term_id)
        except Term.DoesNotExist:
            return []

        records = (
            AttendanceRecord.objects.filter(
                timetable_entry__class_group_id=class_id,
                date__gte=term.start_date,
                date__lte=term.end_date
            )
            .values('student_id', 'student__full_name')
            .annotate(attended=Count('id'))
        )

        summary = []
        for r in records:
            rate = round((r['attended'] / total_classes * 100) if total_classes else 0, 1)
            summary.append({
                'student_id': r['student_id'],
                'student_name': r['student__full_name'],
                'total_classes': total_classes,
                'attended': r['attended'],
                'rate': rate
            })
        return summary

    @staticmethod
    def checkin_summary(user):
        """Return today's and this week's attendance summary for the given user."""
        today = timezone.localtime().date()
        week_start = today - timedelta(days=today.weekday())

        today_qs = AttendanceRecord.objects.filter(student=user, date=today)
        week_qs = AttendanceRecord.objects.filter(
            student=user, date__gte=week_start, date__lte=today
        )

        return {
            'today_total': today_qs.count(),
            'today_marked': today_qs.exists(),
            'week_total': week_qs.count(),
            'week_marked': week_qs.exists(),
        }


class TimetableService:
    @staticmethod
    def format_reminder_message(student, entries):
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
                "latitude": float(entry.latitude) if entry.latitude else None,
                "longitude": float(entry.longitude) if entry.longitude else None,
            })
        return result