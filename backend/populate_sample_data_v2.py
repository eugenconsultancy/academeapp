# populate_sample_data_v2.py
"""
Idempotent sample data population for Academe.
Uses get_or_create everywhere to avoid duplicate key errors.
Run with:
    python manage.py shell < populate_sample_data_v2.py
"""

from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from apps.accounts.models import User, StudentRole, Badge, DataExport, UserSession
from apps.announcements.models import Announcement, AnnouncementRequest, Report as AnnouncementReport
from apps.blog.models import BlogCategory, BlogPost, PostLike, Comment, PostFlag
from apps.classes.models import ClassGroup, CampusVenue as ClassesVenue, TimetableEntry, AttendanceRecord, Term
from apps.geoservice.models import CampusVenue, LocationCheckIn, GeocodingCache, StudentLocationHistory
from apps.opportunities.models import Opportunity, Like, OpportunityReport, ScholarshipReview
from common.constants import (
    UserRole, BadgeType, AnnouncementTarget, ScholarshipReviewStatus
)

User = get_user_model()

print("Populating sample data (idempotent) …")

# ═══════════════════════════════════════════════════════════════════════
# 1. Users – create only if they don't already exist
# ═══════════════════════════════════════════════════════════════════════
admin, _ = User.objects.get_or_create(
    phone_number="+254700000000",
    defaults={
        "full_name": "Admin User",
        "admission_number": "ADMIN001",
        "institution": "Academe University",
        "email": "admin@academe.edu",
        "is_staff": True,
        "is_superuser": True,
        "is_active": True,
        "is_system_user": True,
        "role": UserRole.ADMIN.value,
    }
)
if not admin.password:
    admin.set_password("admin123")
    admin.save()

student_phones = [
    "+254700000001", "+254700000002", "+254700000003",
    "+254700000004", "+254700000005"
]
students = []
for i, phone in enumerate(student_phones, start=1):
    student, _ = User.objects.get_or_create(
        phone_number=phone,
        defaults={
            "full_name": f"Student {i}",
            "admission_number": f"STU00{i}",
            "institution": "Academe University",
            "email": f"student{i}@academe.edu",
            "is_active": True,
            "role": UserRole.STUDENT.value,
        }
    )
    if not student.password:
        student.set_password("student123")
        student.save()
    students.append(student)

print(f"Users ensured: admin + {len(students)} students.")

# ═══════════════════════════════════════════════════════════════════════
# 2. Badges
# ═══════════════════════════════════════════════════════════════════════
badge_types = [
    BadgeType.LOGIN_BRONZE, BadgeType.EARLY_ADOPTER, BadgeType.COMMUNITY_HELPER,
    BadgeType.HIGH_ENGAGER, BadgeType.TOP_CONTRIBUTOR
]
for student, badge_type in zip(students, badge_types):
    Badge.objects.get_or_create(user=student, badge_type=badge_type.value)

print("Badges ensured.")

# ═══════════════════════════════════════════════════════════════════════
# 3. Announcements
# ═══════════════════════════════════════════════════════════════════════
titles = [
    "Campus Clean-Up Day",
    "Exam Timetable Released",
    "Library Late Hours Extended",
    "Student Council Elections",
    "New Internship Portal",
]
for title in titles:
    Announcement.objects.get_or_create(
        title=title,
        defaults={
            "content": f"Details for {title.lower()}.",
            "posted_by": admin,
            "target": AnnouncementTarget.ENTIRE_INSTITUTION.value,
            "expires_at": timezone.now() + timedelta(days=30),
            "is_active": True,
            "is_urgent": (title == titles[0]),
        }
    )

print("Announcements ensured.")

# ═══════════════════════════════════════════════════════════════════════
# 4. Blog Categories & Posts
# ═══════════════════════════════════════════════════════════════════════
# Use simple text icons to avoid encoding issues
category_data = [
    ("Campus Life",     "campus-life",      "Home"),
    ("Academic Tips",   "academic-tips",    "Bulb"),
    ("Career Advice",   "career-advice",    "Hat"),
    ("Course Critiques","course-critiques", "Book"),
    ("Student Marketplace","student-marketplace","Coin"),
]

cat_objects = []
for name, slug, icon in category_data:
    cat, _ = BlogCategory.objects.get_or_create(
        slug=slug,
        defaults={"name": name, "icon": icon}
    )
    cat_objects.append(cat)

print("Blog categories ensured.")

# Create posts (using get_or_create by slug)
for i, cat in enumerate(cat_objects):
    slug = f"sample-post-{i+1}"
    post, created = BlogPost.objects.get_or_create(
        slug=slug,
        defaults={
            "title": f"Sample Blog Post {i+1}",
            "content": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " * 10,
            "excerpt": "This is a sample excerpt.",
            "category": cat,
            "author": students[i % len(students)],
            "tags": "sample,test",
            "is_published": True,
            "published_at": timezone.now(),
        }
    )
    if created:
        post.save()  # triggers reading time calculation

print("Blog posts ensured.")

# ═══════════════════════════════════════════════════════════════════════
# 5. Class Groups
# ═══════════════════════════════════════════════════════════════════════
class1, _ = ClassGroup.objects.get_or_create(
    name="Physics 101", institution="Academe University"
)
class2, _ = ClassGroup.objects.get_or_create(
    name="Chemistry 201", institution="Academe University"
)
class1.students.set(students[:3])
class2.students.set(students[3:])
class1.class_rep = students[0]
class2.class_rep = students[3]
class1.save()
class2.save()
print("Class groups ensured.")

# ═══════════════════════════════════════════════════════════════════════
# 6. Campus Venues
# ═══════════════════════════════════════════════════════════════════════
venues_data = [
    ("Kenyatta University Main Campus",      "Kenyatta University", -1.183056, 36.926111, "lecture_hall", "KU-MAIN"),
    ("University of Nairobi Main Campus",     "University of Nairobi", -1.280423, 36.816311, "lecture_hall", "UON-MAIN"),
    ("JKUAT Main Campus",                     "JKUAT", -1.09028, 37.00861, "lecture_hall", "JKUAT-MAIN"),
    ("Kenyatta University Library",           "Kenyatta University", -1.1825, 36.9255, "library", "KU-LIB"),
    ("University of Nairobi Chiromo Campus",  "University of Nairobi", -1.2785, 36.8150, "laboratory", "UON-CHI"),
]
for name, inst, lat, lon, vtype, code in venues_data:
    CampusVenue.objects.get_or_create(
        name=name, institution=inst,
        defaults={
            "latitude": lat, "longitude": lon,
            "venue_type": vtype, "building_code": code,
            "is_active": True,
        }
    )
    ClassesVenue.objects.get_or_create(
        name=name, institution=inst,
        defaults={"latitude": lat, "longitude": lon, "is_active": True}
    )
print("Campus venues ensured.")

# ═══════════════════════════════════════════════════════════════════════
# 7. Timetable Entries
# ═══════════════════════════════════════════════════════════════════════
for class_group in [class1, class2]:
    for day in range(0, 5):
        TimetableEntry.objects.get_or_create(
            class_group=class_group,
            day_of_week=day,
            unit_name=f"Unit {day+1} for {class_group.name}",
            defaults={
                "start_time": "08:00",
                "end_time": "10:00",
                "venue": venues_data[day % len(venues_data)][0],
                "lecturer": f"Dr. Lecturer {day+1}",
                "is_active": True,
            }
        )
print("Timetable entries ensured.")

# ═══════════════════════════════════════════════════════════════════════
# 8. Opportunities
# ═══════════════════════════════════════════════════════════════════════
for i in range(5):
    Opportunity.objects.get_or_create(
        title=f"Scholarship {i+1} for Engineering Students",
        defaults={
            "description": "Full tuition scholarship for outstanding students.",
            "link": "https://example.com",
            "category": "scholarship",
            "posted_by": admin,
            "expires_at": timezone.now() + timedelta(days=90),
            "is_active": True,
        }
    )
print("Opportunities ensured.")

# ═══════════════════════════════════════════════════════════════════════
# 9. Scholarship Reviews
# ═══════════════════════════════════════════════════════════════════════
opps = Opportunity.objects.all()[:2]
for i, student in enumerate(students[:2]):
    ScholarshipReview.objects.get_or_create(
        student=student,
        opportunity=opps[i],
        defaults={
            "status": ScholarshipReviewStatus.PENDING.value,
            "created_by": student,
        }
    )
print("Scholarship reviews ensured.")

# ═══════════════════════════════════════════════════════════════════════
# 10. Attendance & Location
# ═══════════════════════════════════════════════════════════════════════
entry = TimetableEntry.objects.filter(class_group=class1).first()
if entry:
    for student in class1.students.all():
        AttendanceRecord.objects.get_or_create(
            student=student,
            timetable_entry=entry,
            date=timezone.now().date(),
            defaults={"sync_method": "online", "marked_at": timezone.now()}
        )
        LocationCheckIn.objects.get_or_create(
            student=student,
            timetable_entry=entry,
            defaults={
                "student_latitude": -1.1830,
                "student_longitude": 36.9260,
                "venue_latitude": -1.183056,
                "venue_longitude": 36.926111,
                "distance_meters": 50,
                "within_radius": True,
                "gps_accuracy": 5.0,
                "attendance_radius_meters": 100,
                "verification_method": "gps",
                "is_verified": True,
            }
        )
print("Attendance & location records ensured.")

# ═══════════════════════════════════════════════════════════════════════
# 11. Miscellaneous
# ═══════════════════════════════════════════════════════════════════════
for student in students[:2]:
    AnnouncementRequest.objects.get_or_create(
        requester=student,
        title=f"Request from {student.full_name}",
        defaults={
            "content": "Please announce my club meeting.",
            "target": "class_rep",
        }
    )
    post = BlogPost.objects.first()
    if post:
        Comment.objects.get_or_create(
            post=post,
            user=student,
            body=f"Great post! - {student.full_name}",
        )
print("Requests and comments ensured.")

print("\n✅ Sample data population complete (idempotent).")