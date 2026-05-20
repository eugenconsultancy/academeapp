from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth.hashers import make_password
from datetime import timedelta, date, time
import random, uuid

class Command(BaseCommand):
    help = 'Seed all data for testing the Academe platform'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('\n========================================'))
        self.stdout.write(self.style.SUCCESS('  SEEDING ACADEME PLATFORM DATA'))
        self.stdout.write(self.style.SUCCESS('========================================\n'))

        from apps.accounts.models import User, StudentRole
        from apps.classes.models import ClassGroup, TimetableEntry, AttendanceRecord
        from apps.announcements.models import Announcement, AnnouncementRequest
        from apps.found_items.models import FoundItem, Claim, Tip
        from apps.opportunities.models import Opportunity, Like
        from apps.blog.models import BlogCategory, BlogPost, Comment
        from apps.geoservice.models import CampusVenue
        from apps.governance.models import AuditLog

        # ==========================================
        # 1. USERS
        # ==========================================
        self.stdout.write('\nCreating Users...')
        
        users_data = [
            {'phone': '+254700000001', 'adm': 'ADM/001/2020', 'name': 'Dr. Sarah Akinyi', 'email': 'sarah@academe.ac.ke', 'class': 'Faculty', 'inst': 'Kenyatta University', 'role': 'admin', 'login': 1450},
            {'phone': '+254700000002', 'adm': 'I81/2001/2021', 'name': 'Brian Ochieng', 'email': 'brian@students.ku.ac.ke', 'class': '4th Year Computer Science', 'inst': 'Kenyatta University', 'role': 'student_leader', 'login': 340},
            {'phone': '+254700000003', 'adm': 'I81/2002/2021', 'name': 'Grace Wambui', 'email': 'grace@students.ku.ac.ke', 'class': '4th Year Law', 'inst': 'Kenyatta University', 'role': 'faculty_rep', 'login': 280},
            {'phone': '+254700000004', 'adm': 'I81/3001/2022', 'name': 'Kevin Mwangi', 'email': 'kevin@students.ku.ac.ke', 'class': '3rd Year Microbiology', 'inst': 'Kenyatta University', 'role': 'class_rep', 'login': 195},
            {'phone': '+254700000005', 'adm': 'I81/3002/2022', 'name': 'Faith Njeri', 'email': 'faith@students.ku.ac.ke', 'class': '2nd Year Computer Science', 'inst': 'Kenyatta University', 'role': 'class_rep', 'login': 160},
            {'phone': '+254700000006', 'adm': 'UON/3001/2022', 'name': 'James Omondi', 'email': 'james@students.uonbi.ac.ke', 'class': '3rd Year Engineering', 'inst': 'University of Nairobi', 'role': 'class_rep', 'login': 175},
            {'phone': '+254700000007', 'adm': 'I81/4001/2022', 'name': 'Alice Wanjiku', 'email': 'alice@students.ku.ac.ke', 'class': '3rd Year Microbiology', 'inst': 'Kenyatta University', 'role': 'student', 'login': 89},
            {'phone': '+254700000008', 'adm': 'I81/4002/2022', 'name': 'Bob Otieno', 'email': 'bob@students.ku.ac.ke', 'class': '3rd Year Microbiology', 'inst': 'Kenyatta University', 'role': 'student', 'login': 72},
            {'phone': '+254700000009', 'adm': 'I81/4003/2022', 'name': 'Carol Muthoni', 'email': 'carol@students.ku.ac.ke', 'class': '3rd Year Microbiology', 'inst': 'Kenyatta University', 'role': 'student', 'login': 95},
            {'phone': '+254700000010', 'adm': 'I81/4004/2022', 'name': 'David Kiprop', 'email': 'david@students.ku.ac.ke', 'class': '3rd Year Microbiology', 'inst': 'Kenyatta University', 'role': 'student', 'login': 45},
            {'phone': '+254700000011', 'adm': 'I81/4005/2022', 'name': 'Emma Chebet', 'email': 'emma@students.ku.ac.ke', 'class': '3rd Year Microbiology', 'inst': 'Kenyatta University', 'role': 'student', 'login': 110},
            {'phone': '+254700000012', 'adm': 'I81/5001/2023', 'name': 'Frank Kamau', 'email': 'frank@students.ku.ac.ke', 'class': '2nd Year Computer Science', 'inst': 'Kenyatta University', 'role': 'student', 'login': 55},
            {'phone': '+254700000013', 'adm': 'I81/5002/2023', 'name': 'Grace Njoki', 'email': 'gracen@students.ku.ac.ke', 'class': '2nd Year Computer Science', 'inst': 'Kenyatta University', 'role': 'student', 'login': 60},
            {'phone': '+254700000014', 'adm': 'I81/5003/2023', 'name': 'Henry Wafula', 'email': 'henry@students.ku.ac.ke', 'class': '2nd Year Computer Science', 'inst': 'Kenyatta University', 'role': 'student', 'login': 40},
            {'phone': '+254700000015', 'adm': 'UON/4001/2022', 'name': 'Irene Wanjala', 'email': 'irene@students.uonbi.ac.ke', 'class': '3rd Year Engineering', 'inst': 'University of Nairobi', 'role': 'student', 'login': 78},
            {'phone': '+254700000016', 'adm': 'UON/4002/2022', 'name': 'Jack Kimathi', 'email': 'jack@students.uonbi.ac.ke', 'class': '3rd Year Engineering', 'inst': 'University of Nairobi', 'role': 'student', 'login': 65},
            {'phone': '+254700000017', 'adm': 'UON/4003/2022', 'name': 'Kate Mueni', 'email': 'kate@students.uonbi.ac.ke', 'class': '3rd Year Engineering', 'inst': 'University of Nairobi', 'role': 'student', 'login': 90},
        ]
        
        users = {}
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
                    'login_count': u['login'],
                    'is_active': True,
                    'password': make_password('test1234'),
                }
            )
            users[u['phone']] = user
            if created:
                self.stdout.write(f'  Created: {u["name"]} ({u["role"]})')

        # Assign StudentRoles
        today = timezone.now()
        roles_to_assign = [
            ('+254700000002', 'student_leader', 'institution', 'Kenyatta University', 60, 120),
            ('+254700000003', 'faculty_rep', 'faculty', 'Faculty of Law', 30, 150),
            ('+254700000004', 'class_rep', 'class', '3rd Year Microbiology', 45, 90),
            ('+254700000005', 'class_rep', 'class', '2nd Year Computer Science', 20, 100),
            ('+254700000006', 'class_rep', 'class', '3rd Year Engineering', 30, 60),
            ('+254700000011', 'class_rep', 'class', '3rd Year Microbiology (Asst)', 90, 3),
        ]
        for phone, role, scope_type, scope_name, days_ago, days_left in roles_to_assign:
            StudentRole.objects.get_or_create(
                user=users[phone], role=role,
                defaults={
                    'scope_type': scope_type, 'scope_id': uuid.uuid4(),
                    'scope_name': scope_name,
                    'start_date': today - timedelta(days=days_ago),
                    'end_date': today + timedelta(days=days_left),
                    'assigned_by': users['+254700000001'], 'is_active': True,
                }
            )
        self.stdout.write(f'  Created StudentRole assignments')

        # ==========================================
        # 2. CLASS GROUPS & TIMETABLE
        # ==========================================
        self.stdout.write('Creating Class Groups & Timetables...')
        
        microbio, _ = ClassGroup.objects.get_or_create(
            name='3rd Year Microbiology', institution='Kenyatta University',
            defaults={'class_rep': users['+254700000004']}
        )
        for phone in ['+254700000007', '+254700000008', '+254700000009', '+254700000010', '+254700000011']:
            microbio.students.add(users[phone])

        cs_class, _ = ClassGroup.objects.get_or_create(
            name='2nd Year Computer Science', institution='Kenyatta University',
            defaults={'class_rep': users['+254700000005']}
        )
        for phone in ['+254700000012', '+254700000013', '+254700000014']:
            cs_class.students.add(users[phone])

        eng_class, _ = ClassGroup.objects.get_or_create(
            name='3rd Year Engineering', institution='University of Nairobi',
            defaults={'class_rep': users['+254700000006']}
        )
        for phone in ['+254700000015', '+254700000016', '+254700000017']:
            eng_class.students.add(users[phone])

        # Timetable entries
        micro_timetable = [
            (0, '08:00', '10:00', 'Microbial Genetics', 'Lab 201', 'Dr. Kimani'),
            (0, '11:00', '13:00', 'Immunology', 'Lecture Hall 3', 'Prof. Wanjohi'),
            (1, '09:00', '11:00', 'Biostatistics', 'Computer Lab', 'Dr. Akinyi'),
            (2, '08:00', '10:00', 'Virology', 'Lab 201', 'Dr. Kimani'),
            (2, '14:00', '17:00', 'Research Methods', 'Seminar Room A', 'Prof. Odhiambo'),
            (3, '10:00', '12:00', 'Medical Microbiology', 'Lecture Hall 3', 'Prof. Wanjohi'),
            (4, '08:00', '10:00', 'Parasitology', 'Lab 302', 'Dr. Chebet'),
        ]
        for day, start, end, unit, venue, lecturer in micro_timetable:
            TimetableEntry.objects.get_or_create(
                class_group=microbio, day_of_week=day, unit_name=unit,
                defaults={'start_time': time.fromisoformat(start), 'end_time': time.fromisoformat(end), 'venue': venue, 'lecturer': lecturer, 'is_active': True}
            )

        cs_timetable = [
            (0, '08:00', '10:00', 'Data Structures', 'Computer Lab', 'Dr. Mutua'),
            (1, '10:00', '12:00', 'Database Systems', 'Lab 102', 'Prof. Waweru'),
            (2, '14:00', '16:00', 'Software Engineering', 'Lecture Hall 5', 'Dr. Nyambura'),
            (3, '09:00', '11:00', 'Algorithms', 'Computer Lab', 'Dr. Mutua'),
        ]
        for day, start, end, unit, venue, lecturer in cs_timetable:
            TimetableEntry.objects.get_or_create(
                class_group=cs_class, day_of_week=day, unit_name=unit,
                defaults={'start_time': time.fromisoformat(start), 'end_time': time.fromisoformat(end), 'venue': venue, 'lecturer': lecturer, 'is_active': True}
            )

        eng_timetable = [
            (1, '08:00', '11:00', 'Thermodynamics', 'Engineering Complex', 'Prof. Kamau'),
            (2, '10:00', '13:00', 'Fluid Mechanics', 'Lab 101', 'Dr. Otieno'),
            (4, '14:00', '17:00', 'Engineering Design', 'Workshop', 'Dr. Wanjiku'),
        ]
        for day, start, end, unit, venue, lecturer in eng_timetable:
            TimetableEntry.objects.get_or_create(
                class_group=eng_class, day_of_week=day, unit_name=unit,
                defaults={'start_time': time.fromisoformat(start), 'end_time': time.fromisoformat(end), 'venue': venue, 'lecturer': lecturer, 'is_active': True}
            )
        
        self.stdout.write(f'  {TimetableEntry.objects.count()} timetable entries created')

        # ==========================================
        # 3. ANNOUNCEMENTS
        # ==========================================
        self.stdout.write('Creating Announcements...')
        
        announcements_data = [
            ('CAT 1 Timetable Released', 'The continuous assessment test timetable has been released. All CATs will be held during regular class hours.', 'entire_institution', True, 14),
            ('Lab Safety Training - Mandatory', 'All 3rd year Microbiology students must attend mandatory lab safety training this Friday at 2PM in Seminar Room A.', 'entire_institution', True, 7),
            ('Student Council Elections', 'Nominations for Student Council positions are now open. Submit forms to the Dean by next Friday.', 'entire_institution', False, 30),
            ('Free Coding Workshop', 'CS department hosting free coding workshop this Saturday 9AM-3PM. Topics: Python, React, ML.', 'entire_institution', False, 10),
            ('Library Extended Hours', 'Main library open Mon-Fri 6AM-12AM, Weekends 8AM-10PM during exam period.', 'entire_institution', False, 45),
            ('Graduation List Verification', 'All final year students must verify names on graduation list at Registrar office. Deadline: 2 weeks.', 'entire_institution', True, 14),
            ('Health Awareness Week', 'Free HIV testing, BP checks, mental health counseling. Venue: Student Centre. All week.', 'entire_institution', False, 21),
        ]
        for title, content, target, urgent, days in announcements_data:
            Announcement.objects.get_or_create(
                title=title,
                defaults={
                    'content': content, 'posted_by': users['+254700000001'],
                    'target': target, 'is_urgent': urgent,
                    'expires_at': timezone.now() + timedelta(days=days), 'is_active': True,
                }
            )
        
        # Announcement requests
        AnnouncementRequest.objects.get_or_create(
            title='Request: Changed venue for lab',
            requester=users['+254700000007'],
            defaults={'content': 'Please announce that Microbiology lab moved from Lab 201 to Lab 305 this week.', 'target': 'class_rep', 'status': 'pending'}
        )
        AnnouncementRequest.objects.get_or_create(
            title='Request: Past papers access',
            requester=users['+254700000008'],
            defaults={'content': 'Could leaders announce where to access past papers for exams?', 'target': 'student_leaders', 'status': 'pending'}
        )
        
        self.stdout.write(f'  {Announcement.objects.count()} announcements created')

        # ==========================================
        # 4. FOUND ITEMS
        # ==========================================
        self.stdout.write('Creating Found Items...')
        
        items_data = [
            ('Blue Student ID Card - Alice W.', 'id', 'Found near library entrance. Blue card with photo.', 'Library Main Entrance', 2, True, 'I81/4001/2022'),
            ('Equity Bank ATM Card', 'bank_card', 'Found at cafeteria payment counter.', 'Student Cafeteria', 1, True, ''),
            ('Bunch of Keys - Toyota Keychain', 'keys', 'Found in Lecture Hall 2. Toyota keychain, 4 keys.', 'Lecture Hall 2', 5, False, ''),
            ('Samsung Galaxy A54 - Black', 'gadget', 'Found in student lounge. Black phone, cracked screen protector.', 'Student Lounge', 3, False, ''),
            ('Transcript Document Envelope', 'document', 'Found near admin block. Sealed envelope.', 'Admin Block', 7, False, ''),
            ('KCB Student ID Card - Brian O.', 'id', 'Found in Computer Lab. KCB campus branch.', 'Computer Lab', 1, True, 'I81/2001/2021'),
            ('HP Laptop Charger 65W', 'gadget', 'Found in Seminar Room A. USB-C tip.', 'Seminar Room A', 4, False, ''),
            ('Navy Blue Water Bottle', 'other', 'Found in Lab 201. Insulated metal.', 'Lab 201', 6, False, ''),
        ]
        
        items = {}
        for title, cat, desc, loc, days, fee, adm in items_data:
            item, _ = FoundItem.objects.get_or_create(
                title=title,
                defaults={
                    'category': cat, 'description': desc, 'location_found': loc,
                    'found_date': timezone.now() - timedelta(days=days),
                    'is_fee_required': fee, 'admission_number_on_item': adm,
                    'posted_by': users['+254700000001'], 'status': 'active',
                }
            )
            items[title] = item
        
        # Claims
        Claim.objects.get_or_create(item=items['Blue Student ID Card - Alice W.'], claimant=users['+254700000007'], defaults={'status': 'pending'})
        Claim.objects.get_or_create(item=items['KCB Student ID Card - Brian O.'], claimant=users['+254700000002'], defaults={'status': 'payment_received', 'payment_received': True})
        Claim.objects.get_or_create(item=items['Bunch of Keys - Toyota Keychain'], claimant=users['+254700000008'], defaults={'status': 'claimed', 'confirmed_at': timezone.now() - timedelta(days=2)})
        
        # Tips
        Tip.objects.get_or_create(item=items['Blue Student ID Card - Alice W.'], sender=users['+254700000009'], defaults={'message': 'I think this belongs to Alice from 3rd year Micro.'})
        Tip.objects.get_or_create(item=items['Bunch of Keys - Toyota Keychain'], sender=users['+254700000010'], defaults={'message': 'These look like Davids keys. He drives a Toyota.'})
        
        self.stdout.write(f'  {FoundItem.objects.count()} found items created')
        self.stdout.write(f'  {Claim.objects.count()} claims created')

        # ==========================================
        # 5. OPPORTUNITIES
        # ==========================================
        self.stdout.write('Creating Opportunities...')
        
        opps_data = [
            ('Summer Internship at Safaricom', '3-month internships for engineering and IT students. Competitive stipend.', 'internship', 'https://safaricom.co.ke/careers', 60),
            ('KEMRI Research Scholarship 2025', 'Full scholarships for microbiology students. Includes tuition and stipend.', 'scholarship', 'https://kemri.go.ke', 45),
            ('Tech Innovation Hackathon', '48-hour hackathon at iHub Nairobi. KES 100,000 first prize.', 'competition', 'https://ihub.co.ke', 10),
            ('Campus Music Festival 2025', 'Annual festival featuring student bands, DJs, food stalls. Free entry!', 'concert', '', 30),
            ('Attachment at Kenya Power', '3-month industrial attachment for engineering students.', 'attachment', 'https://kplc.co.ke/careers', 25),
            ('Data Science Workshop Series', 'Weekly workshops: Python, ML, visualization. Saturdays 10AM-1PM.', 'workshop', '', 14),
            ('DAAD Masters Scholarship 2026', 'Fully-funded Masters in Germany. Airfare, tuition, monthly stipend.', 'scholarship', 'https://daad.de', 90),
        ]
        for title, desc, cat, link, days in opps_data:
            opp, _ = Opportunity.objects.get_or_create(
                title=title,
                defaults={
                    'description': desc, 'category': cat, 'link': link,
                    'posted_by': users['+254700000001'],
                    'expires_at': timezone.now() + timedelta(days=days), 'is_active': True,
                }
            )
            # Add some likes
            for _ in range(random.randint(3, 12)):
                random_user = random.choice(list(users.values()))
                Like.objects.get_or_create(opportunity=opp, user=random_user)
        
        self.stdout.write(f'  {Opportunity.objects.count()} opportunities created')

        # ==========================================
        # 6. BLOG POSTS
        # ==========================================
        self.stdout.write('Creating Blog Posts...')
        
        categories_data = [
            ('Course Critiques', 'course-critiques', 'Honest reviews of university courses'),
            ('Student Marketplace', 'student-marketplace', 'Buy, sell, and trade student items'),
            ('Academic Tips', 'academic-tips', 'Study hacks and academic advice'),
            ('Career Advice', 'career-advice', 'Internship and career guidance'),
            ('Campus Life', 'campus-life', 'Events, clubs, and campus experiences'),
        ]
        cats = {}
        for name, slug, desc in categories_data:
            cat, _ = BlogCategory.objects.get_or_create(name=name, defaults={'slug': slug, 'description': desc, 'icon': ''})
            cats[slug] = cat

        posts_data = [
            ('How to Survive Microbiology 301', 'Microbiology 301 is tough but rewarding. Tips: 1) Start lab reports early 2) Form study groups 3) Use MicrobeWiki 4) Practice drawings 5) Attend all labs. Good luck!', 'Tips for surviving one of the toughest 3rd year courses.', 'course-critiques', 'microbiology,study-tips', True, 1240, 45),
            ('Best Laptops Under KES 40K', 'Top picks: HP ProBook 450 G5 (35-38K), Lenovo T480 (32-37K), Dell Latitude 7490 (33-38K). All available on campus. Check battery health before buying!', 'Affordable laptops for university students.', 'student-marketplace', 'laptops,budget,tech', False, 890, 32),
            ('5 Study Hacks Every Student Should Know', '1) Pomodoro Technique 2) Active Recall 3) Spaced Repetition 4) Teach Someone Else 5) Use Mnemonics. Try these and watch your grades improve!', 'Proven study techniques to boost performance.', 'academic-tips', 'study-tips,productivity', True, 2100, 78),
            ('How I Got My Internship at Google', 'Took 3 tries but finally got in! Tips: Build projects, practice data structures, network on LinkedIn, prepare STAR answers, apply 6 months early.', 'My journey from KU to Google internship.', 'career-advice', 'internship,google,career', True, 3500, 120),
            ('Hidden Study Spots on Campus', '1) Education Bldg 3rd floor balcony 2) Science Complex basement 3) Law School library 4) Student Centre top floor 5) Behind the chapel. All quiet before 9AM!', 'Best quiet places to study that nobody knows.', 'campus-life', 'study-spots,campus,library', False, 1800, 65),
            ('How to Sell Your Old Textbooks', 'List on WhatsApp groups, use notice boards, price competitively, bundle related books, highlight condition. Best time: start of semester.', 'Maximize returns selling used textbooks.', 'student-marketplace', 'textbooks,money,selling', False, 620, 22),
        ]
        for title, content, excerpt, cat_slug, tags, featured, views, likes in posts_data:
            post, _ = BlogPost.objects.get_or_create(
                title=title,
                defaults={
                    'content': content, 'excerpt': excerpt, 'category': cats[cat_slug],
                    'author': users['+254700000001'], 'tags': tags,
                    'is_published': True, 'is_featured': featured,
                    'published_at': timezone.now() - timedelta(days=random.randint(1, 60)),
                    'view_count': views, 'likes_count': likes,
                }
            )
            # Add comments
            for comment_text in ['Great post!', 'Very helpful, thanks!', 'I wish I knew this earlier!', 'Can you write more?']:
                if random.random() < 0.5:
                    Comment.objects.create(post=post, user=random.choice(list(users.values())), body=comment_text)
        
        self.stdout.write(f'  {BlogPost.objects.count()} blog posts created')
        self.stdout.write(f'  {Comment.objects.count()} comments created')

        # ==========================================
        # 7. CAMPUS VENUES
        # ==========================================
        self.stdout.write('Creating Campus Venues...')
        
        venues_data = [
            ('Kenyatta University Main Campus', 'Kenyatta University', 'MAIN', -1.2267, 36.9147, 'other'),
            ('Kenyatta University Lecture Hall 3', 'Kenyatta University', 'LH3', -1.2270, 36.9150, 'lecture_hall'),
            ('Kenyatta University Lab 201', 'Kenyatta University', 'LAB201', -1.2265, 36.9145, 'laboratory'),
            ('Kenyatta University Computer Lab', 'Kenyatta University', 'CLAB', -1.2268, 36.9152, 'laboratory'),
            ('Kenyatta University Seminar Room A', 'Kenyatta University', 'SEMA', -1.2272, 36.9148, 'seminar_room'),
            ('Kenyatta University Student Centre', 'Kenyatta University', 'SC', -1.2263, 36.9155, 'cafeteria'),
            ('Kenyatta University Library', 'Kenyatta University', 'LIB', -1.2269, 36.9142, 'library'),
            ('Kenyatta University Lab 302', 'Kenyatta University', 'LAB302', -1.2275, 36.9138, 'laboratory'),
            ('Kenyatta University Lecture Hall 2', 'Kenyatta University', 'LH2', -1.2264, 36.9158, 'lecture_hall'),
            ('Kenyatta University Lecture Hall 5', 'Kenyatta University', 'LH5', -1.2280, 36.9160, 'lecture_hall'),
            ('University of Nairobi Main Campus', 'University of Nairobi', 'MAIN', -1.2797, 36.8167, 'other'),
            ('University of Nairobi Engineering Complex', 'University of Nairobi', 'ENG', -1.2790, 36.8175, 'lecture_hall'),
        ]
        for name, inst, code, lat, lon, vtype in venues_data:
            CampusVenue.objects.get_or_create(
                name=name, institution=inst,
                defaults={'building_code': code, 'latitude': lat, 'longitude': lon, 'venue_type': vtype, 'is_active': True}
            )
        
        self.stdout.write(f'  {CampusVenue.objects.count()} campus venues created')

        # ==========================================
        # 8. ATTENDANCE RECORDS
        # ==========================================
        self.stdout.write('Creating Attendance Records...')
        
        today_date = timezone.localdate()
        for days_ago in range(14):
            record_date = today_date - timedelta(days=days_ago)
            day_of_week = record_date.weekday()
            if day_of_week >= 5:
                continue
            entries = TimetableEntry.objects.filter(day_of_week=day_of_week, is_active=True)
            for entry in entries:
                students_in_class = entry.class_group.students.all()
                for student in students_in_class:
                    if random.random() < 0.7:
                        AttendanceRecord.objects.get_or_create(
                            student=student, timetable_entry=entry, date=record_date,
                            defaults={'sync_method': 'online'}
                        )
        
        self.stdout.write(f'  {AttendanceRecord.objects.count()} attendance records created')

        # ==========================================
        # 9. AUDIT LOGS
        # ==========================================
        self.stdout.write('Creating Audit Logs...')
        
        audit_entries = [
            ('USER_CREATED', None, users['+254700000007'], {'phone': '+254700000007', 'name': 'Alice Wanjiku'}),
            ('ROLE_ASSIGNED', users['+254700000001'], users['+254700000004'], {'role': 'class_rep'}),
            ('ANNOUNCEMENT_CREATED', users['+254700000001'], None, {'title': 'CAT 1 Timetable'}),
            ('CLAIM_APPROVED', users['+254700000001'], users['+254700000008'], {'item': 'Keys'}),
        ]
        for action, by, target, meta in audit_entries:
            AuditLog.objects.create(
                action=action, performed_by=by, target_user=target,
                target_type='Test', target_id=str(uuid.uuid4()),
                after_state=meta, severity='info',
                created_at=timezone.now() - timedelta(days=random.randint(1, 30)),
            )
        
        self.stdout.write(f'  {AuditLog.objects.count()} audit logs created')

        # ==========================================
        # SUMMARY
        # ==========================================
        self.stdout.write(self.style.SUCCESS('\n========================================'))
        self.stdout.write(self.style.SUCCESS('  SEEDING COMPLETE!'))
        self.stdout.write(self.style.SUCCESS('========================================'))
        self.stdout.write(f'\n  Users: {User.objects.count()}')
        self.stdout.write(f'  Student Roles: {StudentRole.objects.count()}')
        self.stdout.write(f'  Class Groups: {ClassGroup.objects.count()}')
        self.stdout.write(f'  Timetable Entries: {TimetableEntry.objects.count()}')
        self.stdout.write(f'  Announcements: {Announcement.objects.count()}')
        self.stdout.write(f'  Found Items: {FoundItem.objects.count()}')
        self.stdout.write(f'  Claims: {Claim.objects.count()}')
        self.stdout.write(f'  Opportunities: {Opportunity.objects.count()}')
        self.stdout.write(f'  Blog Posts: {BlogPost.objects.count()}')
        self.stdout.write(f'  Venues: {CampusVenue.objects.count()}')
        self.stdout.write(f'  Attendance: {AttendanceRecord.objects.count()}')
        self.stdout.write(f'  Audit Logs: {AuditLog.objects.count()}')
        self.stdout.write(f'\n  Login: +254700000001 / test1234 (Admin)')
        self.stdout.write(f'  Login: +254700000004 / test1234 (Class Rep)')
        self.stdout.write(f'  Login: +254700000007 / test1234 (Student)')
        self.stdout.write(self.style.SUCCESS('========================================\n'))
