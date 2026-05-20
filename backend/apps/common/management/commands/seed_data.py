from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta, datetime
from apps.accounts.models import User
from apps.classes.models import ClassGroup, TimetableEntry, AttendanceRecord
from apps.found_items.models import FoundItem, Claim, Tip
from apps.announcements.models import Announcement
from apps.opportunities.models import Opportunity
from apps.support.models import SupportTicket
import random

class Command(BaseCommand):
    help = 'Seed database with test data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding database...')
        
        # Create test users
        self.create_users()
        # Create classes
        self.create_classes()
        # Create found items
        self.create_found_items()
        # Create announcements
        self.create_announcements()
        # Create opportunities
        self.create_opportunities()
        # Create support tickets
        self.create_support_tickets()
        
        self.stdout.write(self.style.SUCCESS('Database seeded successfully!'))

    def create_users(self):
        users_data = [
            {'phone': '+254700000001', 'name': 'Alice Wanjiku', 'adm': 'I81/1001/2020', 'email': 'alice@ku.ac.ke', 'class': '3rd Year Microbiology', 'inst': 'Kenyatta University', 'role': 'student'},
            {'phone': '+254700000002', 'name': 'Bob Omondi', 'adm': 'I81/1002/2020', 'email': 'bob@ku.ac.ke', 'class': '3rd Year Microbiology', 'inst': 'Kenyatta University', 'role': 'class_rep'},
            {'phone': '+254700000003', 'name': 'Carol Muthoni', 'adm': 'I81/1003/2020', 'email': 'carol@ku.ac.ke', 'class': '2nd Year Computer Science', 'inst': 'Kenyatta University', 'role': 'student'},
            {'phone': '+254700000004', 'name': 'David Kiprop', 'adm': 'I81/1004/2020', 'email': 'david@ku.ac.ke', 'class': '4th Year Engineering', 'inst': 'Kenyatta University', 'role': 'student_leader'},
            {'phone': '+254700000005', 'name': 'Emma Chebet', 'adm': 'I81/1005/2020', 'email': 'emma@ku.ac.ke', 'class': '3rd Year Microbiology', 'inst': 'Kenyatta University', 'role': 'student'},
        ]
        
        for u in users_data:
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
                self.stdout.write(f'  Created user: {u["name"]}')

    def create_classes(self):
        class_group, _ = ClassGroup.objects.get_or_create(
            name='3rd Year Microbiology',
            institution='Kenyatta University',
        )
        
        rep = User.objects.filter(phone_number='+254700000002').first()
        if rep:
            class_group.class_rep = rep
            class_group.save()
        
        # Add students to class
        students = User.objects.filter(class_name='3rd Year Microbiology')
        for student in students:
            class_group.students.add(student)
        
        # Create timetable entries
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
                    'start_time': datetime.strptime(t['start'], '%H:%M').time(),
                    'end_time': datetime.strptime(t['end'], '%H:%M').time(),
                    'venue': t['venue'],
                    'lecturer': t['lecturer'],
                }
            )
        self.stdout.write('  Created timetable entries')

    def create_found_items(self):
        items_data = [
            {'title': 'Blue Student ID Card - John M.', 'cat': 'id', 'desc': 'Found near the library entrance', 'loc': 'Library', 'fee': True},
            {'title': 'Equity Bank ATM Card', 'cat': 'bank_card', 'desc': 'Found at the cafeteria', 'loc': 'Cafeteria', 'fee': True},
            {'title': 'Bunch of Keys - Toyota Keychain', 'cat': 'keys', 'desc': 'Found in Lecture Hall 2', 'loc': 'Lecture Hall 2', 'fee': False},
            {'title': 'Samsung Galaxy Phone - Black', 'cat': 'gadget', 'desc': 'Found in the student lounge', 'loc': 'Student Lounge', 'fee': False},
            {'title': 'Transcript Document - Envelope', 'cat': 'document', 'desc': 'Found near admin block', 'loc': 'Admin Block', 'fee': False},
        ]
        
        admin = User.objects.filter(role='admin').first()
        if not admin:
            admin = User.objects.first()
        
        for item_data in items_data:
            item, created = FoundItem.objects.get_or_create(
                title=item_data['title'],
                defaults={
                    'category': item_data['cat'],
                    'description': item_data['desc'],
                    'location_found': item_data['loc'],
                    'found_date': timezone.now() - timedelta(days=random.randint(1, 10)),
                    'is_fee_required': item_data['fee'],
                    'posted_by': admin,
                    'status': 'active',
                }
            )
            if created:
                self.stdout.write(f'  Created found item: {item.title}')
        
        # Create a claim
        item = FoundItem.objects.first()
        student = User.objects.filter(role='student').first()
        if item and student:
            Claim.objects.get_or_create(
                item=item,
                claimant=student,
                defaults={'status': 'pending'}
            )
        
        # Create a tip
        if item:
            tipper = User.objects.exclude(id=student.id).first() if student else User.objects.first()
            if tipper:
                Tip.objects.get_or_create(
                    item=item,
                    sender=tipper,
                    defaults={'message': 'I think this belongs to John from 3rd year'}
                )
        
        self.stdout.write('  Created found items, claims, and tips')

    def create_announcements(self):
        leader = User.objects.filter(role='student_leader').first()
        if not leader:
            leader = User.objects.first()
        
        announcements_data = [
            {'title': 'Student Council Meeting - Friday 2PM', 'content': 'All class representatives are required to attend the student council meeting this Friday at 2:00 PM in the Main Hall. Agenda: Budget review and upcoming events.', 'urgent': True},
            {'title': 'Exam Card Collection Notice', 'content': 'Exam cards for the upcoming semester are ready for collection. Please visit your respective department offices with your student ID.', 'urgent': False},
            {'title': 'Campus Wi-Fi Maintenance', 'content': 'The campus Wi-Fi network will undergo maintenance this Saturday from 6:00 AM to 12:00 PM. Services may be intermittent during this period.', 'urgent': False},
        ]
        
        for a in announcements_data:
            Announcement.objects.get_or_create(
                title=a['title'],
                defaults={
                    'content': a['content'],
                    'posted_by': leader,
                    'target': 'entire_institution',
                    'is_urgent': a['urgent'],
                    'expires_at': timezone.now() + timedelta(days=21),
                }
            )
        self.stdout.write('  Created announcements')

    def create_opportunities(self):
        admin = User.objects.filter(role='admin').first()
        if not admin:
            admin = User.objects.first()
        
        opportunities_data = [
            {'title': 'Summer Internship at Safaricom', 'desc': 'Safaricom is offering 3-month internships for engineering and IT students. Apply before June 30th.', 'cat': 'internship', 'link': 'https://safaricom.co.ke/careers'},
            {'title': 'KEMRI Research Scholarship 2026', 'desc': 'Full scholarship for microbiology students to conduct research at KEMRI laboratories. Includes stipend and accommodation.', 'cat': 'scholarship', 'link': 'https://kemri.go.ke'},
            {'title': 'Tech Innovation Hackathon', 'desc': '48-hour hackathon at iHub Nairobi. Great prizes! Teams of 3-4. Registration closes next week.', 'cat': 'competition', 'link': 'https://ihub.co.ke'},
            {'title': 'Campus Music Festival', 'desc': 'Annual campus music festival featuring student bands, DJ performances, and food stalls. Free entry!', 'cat': 'concert', 'link': ''},
        ]
        
        for o in opportunities_data:
            Opportunity.objects.get_or_create(
                title=o['title'],
                defaults={
                    'description': o['desc'],
                    'category': o['cat'],
                    'link': o['link'],
                    'posted_by': admin,
                    'expires_at': timezone.now() + timedelta(days=120),
                }
            )
        self.stdout.write('  Created opportunities')

    def create_support_tickets(self):
        student = User.objects.filter(role='student').first()
        if student:
            SupportTicket.objects.get_or_create(
                title='Cannot access attendance feature',
                defaults={
                    'description': 'I keep getting an error when trying to mark attendance for my Monday morning class.',
                    'category': 'technical',
                    'submitted_by': student,
                }
            )
            SupportTicket.objects.get_or_create(
                title='Request for transcript feature',
                defaults={
                    'description': 'It would be great to have a feature to request official transcripts through the app.',
                    'category': 'feature',
                    'submitted_by': student,
                }
            )
        self.stdout.write('  Created support tickets')
