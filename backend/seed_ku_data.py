# seed_ku_data.py
import os
import random
from datetime import date, timedelta
from django.utils import timezone

# Set Django settings (adjust if your settings module is different)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'academe.settings')  # change to your actual settings
import django
django.setup()

# Import models safely – these paths reflect your project structure (apps.*)
from apps.accounts.models import User
from apps.classes.models import ClassGroup, TimetableEntry, CampusVenue
from apps.announcements.models import Announcement
from apps.opportunities.models import Opportunity

# Blog model may not exist yet, so handle it gracefully
try:
    from apps.blog.models import BlogPost
    BLOG_AVAILABLE = True
except ImportError:
    BLOG_AVAILABLE = False

# ------------------------------------------------------------
# USERS
# ------------------------------------------------------------
# Admin (use a phone number your OTP service can receive or mock)
admin, created = User.objects.get_or_create(
    phone_number='+254700000001',
    defaults={
        'full_name': 'Admin User',
        'role': 'admin',
        'is_active': True,
        'is_staff': True,
        'is_superuser': True,
    }
)

# Class Rep
class_rep, _ = User.objects.get_or_create(
    phone_number='+254700000002',
    defaults={
        'full_name': 'Jane Muthoni',
        'role': 'class_rep',
        'is_active': True,
    }
)

# Regular Students (5)
students = []
for i in range(1, 6):
    phone = f'+25470000000{2+i}'
    student, _ = User.objects.get_or_create(
        phone_number=phone,
        defaults={
            'full_name': f'Student {i}',
            'role': 'student',
            'is_active': True,
        }
    )
    students.append(student)

# ------------------------------------------------------------
# CAMPUS VENUES (Kenyatta University coordinates)
# ------------------------------------------------------------
venues_data = [
    ("Lecture Hall 1", "Kenyatta University", -1.1805, 36.9365),
    ("Lecture Hall 2", "Kenyatta University", -1.1802, 36.9370),
    ("Science Complex Lab A", "Kenyatta University", -1.1798, 36.9378),
    ("Library Block", "Kenyatta University", -1.1810, 36.9368),
    ("Student Centre", "Kenyatta University", -1.1800, 36.9355),
    ("Engineering Workshop", "Kenyatta University", -1.1812, 36.9385),
    ("Computer Lab 1", "Kenyatta University", -1.1795, 36.9360),
]

for v_name, institution, lat, lon in venues_data:
    CampusVenue.objects.get_or_create(
        name=v_name,
        institution=institution,
        defaults={
            'latitude': lat,
            'longitude': lon,
            'is_active': True,
        }
    )

# ------------------------------------------------------------
# CLASS GROUP
# ------------------------------------------------------------
class_group, _ = ClassGroup.objects.get_or_create(
    name='BSc. Computer Science Y1S1',
    institution='Kenyatta University',
    defaults={'class_rep': class_rep}
)
for s in students:
    class_group.students.add(s)

# ------------------------------------------------------------
# TIMETABLE (Mon‑Fri)
# ------------------------------------------------------------
DAY_MAP = {
    'Monday': 0, 'Tuesday': 1, 'Wednesday': 2,
    'Thursday': 3, 'Friday': 4
}

timetable_entries = [
    # (day, start, end, unit, venue, lecturer)
    ('Monday',    '08:00', '10:00', 'Introduction to Programming', 'Computer Lab 1', 'Dr. Kimani'),
    ('Monday',    '10:00', '12:00', 'Calculus I',               'Lecture Hall 1',   'Prof. Wanjiku'),
    ('Monday',    '14:00', '16:00', 'Communication Skills',      'Library Block',    'Dr. Otieno'),
    ('Tuesday',   '09:00', '11:00', 'Digital Electronics',       'Science Complex Lab A', 'Eng. Mwangi'),
    ('Tuesday',   '11:00', '13:00', 'Discrete Mathematics',      'Lecture Hall 2',   'Dr. Achieng'),
    ('Wednesday', '08:00', '10:00', 'Introduction to Programming', 'Computer Lab 1', 'Dr. Kimani'),
    ('Wednesday', '10:00', '12:00', 'Calculus I',               'Lecture Hall 1',   'Prof. Wanjiku'),
    ('Thursday',  '09:00', '11:00', 'Digital Electronics',       'Science Complex Lab A', 'Eng. Mwangi'),
    ('Thursday',  '14:00', '16:00', 'Physics for Computing',     'Engineering Workshop',  'Dr. Barasa'),
    ('Friday',    '08:00', '10:00', 'Communication Skills',      'Library Block',    'Dr. Otieno'),
    ('Friday',    '10:00', '12:00', 'Discrete Mathematics',      'Lecture Hall 2',   'Dr. Achieng'),
]

for day, start, end, unit, venue, lecturer in timetable_entries:
    TimetableEntry.objects.get_or_create(
        class_group=class_group,
        day_of_week=DAY_MAP[day],
        start_time=start,
        end_time=end,
        unit_name=unit,
        defaults={
            'venue': venue,
            'lecturer': lecturer,
            'is_active': True,
        }
    )

# ------------------------------------------------------------
# ANNOUNCEMENTS
# ------------------------------------------------------------
Announcement.objects.get_or_create(
    title='Orientation Week Schedule',
    defaults={
        'content': 'Welcome to all new students! Orientation will be held on Monday at the Student Centre from 9 AM.',
        'posted_by': admin,
        'target': 'entire_institution',
        'is_urgent': False,
        'expires_at': timezone.now() + timedelta(days=30),
    }
)
Announcement.objects.get_or_create(
    title='Exam Timetable Released',
    defaults={
        'content': 'The end of semester exam timetable has been posted on the student portal. Check your groups.',
        'posted_by': admin,
        'target': 'entire_institution',
        'is_urgent': True,
        'expires_at': timezone.now() + timedelta(days=14),
    }
)

# ------------------------------------------------------------
# OPPORTUNITIES
# ------------------------------------------------------------
Opportunity.objects.get_or_create(
    title='Software Engineering Internship at Safaricom',
    defaults={
        'description': 'Apply for a 3-month internship at Safaricom. Open to CS students.',
        'category': 'internship',
        'link': 'https://www.safaricom.co.ke/internships',
        'posted_by': admin,
        'expires_at': timezone.now() + timedelta(days=60),
    }
)

# ------------------------------------------------------------
# BLOG (if app exists)
# ------------------------------------------------------------
if BLOG_AVAILABLE:
    BlogPost.objects.get_or_create(
        title='5 Tips for Surviving First Year at KU',
        defaults={
            'content': (
                '1. Join study groups.\n'
                '2. Explore the library.\n'
                '3. Attend orientation.\n'
                '4. Use the campus Wi‑Fi.\n'
                '5. Balance fun and study.'
            ),
            'author': class_rep,
            'published_at': timezone.now() - timedelta(days=2),
            'reading_time': 3,
        }
    )

print("✅ Seed data created successfully!")
print("Admin phone: +254700000001")
print("Class Rep phone: +254700000002")
for i in range(1, 6):
    print(f"Student {i} phone: +25470000000{2+i}")