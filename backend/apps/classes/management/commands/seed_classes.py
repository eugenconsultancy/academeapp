from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import time, date, timedelta
from apps.accounts.models import User
from apps.classes.models import ClassGroup, TimetableEntry, AttendanceRecord

class Command(BaseCommand):
    help = 'Seed classes data with students, class rep, timetable, and attendance'

    def handle(self, *args, **kwargs):
        # 1. Create/update users (student & class rep)
        student_data = [
            {'phone': '+254700000001', 'name': 'Alice Wanjiku', 'adm': 'I81/1001/2020', 'email': 'alice@ku.ac.ke', 'class': '3rd Year Microbiology', 'inst': 'Kenyatta University', 'role': 'student'},
            {'phone': '+254700000002', 'name': 'Bob Omondi',   'adm': 'I81/1002/2020', 'email': 'bob@ku.ac.ke',   'class': '3rd Year Microbiology', 'inst': 'Kenyatta University', 'role': 'class_rep'},
            {'phone': '+254700000003', 'name': 'Carol Muthoni', 'adm': 'I81/1003/2020', 'email': 'carol@ku.ac.ke', 'class': '3rd Year Microbiology', 'inst': 'Kenyatta University', 'role': 'student'},
            {'phone': '+254700000004', 'name': 'David Kiprop',  'adm': 'I81/1004/2020', 'email': 'david@ku.ac.ke', 'class': '3rd Year Microbiology', 'inst': 'Kenyatta University', 'role': 'student'},
            {'phone': '+254700000005', 'name': 'Emma Chebet',   'adm': 'I81/1005/2020', 'email': 'emma@ku.ac.ke',  'class': '3rd Year Microbiology', 'inst': 'Kenyatta University', 'role': 'student'},
        ]
        for u in student_data:
            user, created = User.objects.get_or_create(
                phone_number=u['phone'],
                defaults={
                    'admission_number': u['adm'],
                    'full_name': u['name'],
                    'email': u['email'],
                    'class_name': u['class'],
                    'institution': u['inst'],
                    'role': u['role'],
                    'is_active': True,
                }
            )
            if created:
                self.stdout.write(f'Created user: {u["name"]}')

        # 2. Create class group and assign class rep
        class_group, _ = ClassGroup.objects.get_or_create(
            name='3rd Year Microbiology',
            institution='Kenyatta University',
        )
        rep = User.objects.get(phone_number='+254700000002')
        class_group.class_rep = rep
        class_group.save()

        # Add students to class group
        students = User.objects.filter(class_name='3rd Year Microbiology', institution='Kenyatta University')
        for student in students:
            class_group.students.add(student)
        self.stdout.write(f'Class group: {class_group.name} with {class_group.students.count()} students')

        # 3. Create timetable entries (Monday to Friday)
        timetable_data = [
            {'day': 0, 'start': '08:00', 'end': '10:00', 'unit': 'Microbial Genetics', 'venue': 'Lab 201', 'lecturer': 'Dr. Kimani'},
            {'day': 0, 'start': '11:00', 'end': '13:00', 'unit': 'Immunology', 'venue': 'Lecture Hall 3', 'lecturer': 'Prof. Wanjohi'},
            {'day': 1, 'start': '09:00', 'end': '11:00', 'unit': 'Biostatistics', 'venue': 'Computer Lab', 'lecturer': 'Dr. Akinyi'},
            {'day': 2, 'start': '08:00', 'end': '10:00', 'unit': 'Microbial Genetics', 'venue': 'Lab 201', 'lecturer': 'Dr. Kimani'},
            {'day': 3, 'start': '14:00', 'end': '17:00', 'unit': 'Research Methods', 'venue': 'Seminar Room A', 'lecturer': 'Prof. Odhiambo'},
            {'day': 4, 'start': '10:00', 'end': '12:00', 'unit': 'Immunology', 'venue': 'Lecture Hall 3', 'lecturer': 'Prof. Wanjohi'},
        ]
        for t in timetable_data:
            TimetableEntry.objects.get_or_create(
                class_group=class_group,
                day_of_week=t['day'],
                unit_name=t['unit'],
                defaults={
                    'start_time': time.fromisoformat(t['start']),
                    'end_time': time.fromisoformat(t['end']),
                    'venue': t['venue'],
                    'lecturer': t['lecturer'],
                }
            )
        self.stdout.write(f'Timetable entries: {TimetableEntry.objects.count()}')

        # 4. Mark some attendance for today (if today is a weekday)
        today = timezone.localdate()
        if today.weekday() < 5:  # Monday=0, Friday=4
            # Pick a student (Alice)
            student = User.objects.get(phone_number='+254700000001')
            # Get today's entries for the class
            entries = TimetableEntry.objects.filter(class_group=class_group, day_of_week=today.weekday())
            for entry in entries:
                AttendanceRecord.objects.get_or_create(
                    student=student,
                    timetable_entry=entry,
                    date=today,
                    defaults={'sync_method': 'online'}
                )
            self.stdout.write(f'Marked attendance for {student.full_name} on {today}')

        self.stdout.write(self.style.SUCCESS('Classes data seeded successfully!'))
