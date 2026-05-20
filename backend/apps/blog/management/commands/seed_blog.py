from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.blog.models import BlogCategory, BlogPost
from apps.accounts.models import User

class Command(BaseCommand):
    help = 'Seed blog data'

    def handle(self, *args, **kwargs):
        # Create categories
        categories_data = [
            ('📚', 'Course Critiques', 'course-critiques', 'Honest reviews of university courses'),
            ('💰', 'Student Marketplace', 'student-marketplace', 'Buy, sell, and trade student items'),
            ('💡', 'Academic Tips', 'academic-tips', 'Study hacks and academic advice'),
            ('🎓', 'Career Advice', 'career-advice', 'Internship and career guidance'),
            ('🏠', 'Campus Life', 'campus-life', 'Events, clubs, and experiences'),
            ('🔧', 'Tools & Resources', 'tools-resources', 'Recommended tools for students'),
        ]
        
        for icon, name, slug, desc in categories_data:
            cat, created = BlogCategory.objects.get_or_create(
                name=name,
                defaults={'slug': slug, 'description': desc, 'icon': icon}
            )
            if created:
                self.stdout.write(f'  Created category: {icon} {name}')
        
        self.stdout.write(f'Total categories: {BlogCategory.objects.count()}')
        
        # Create sample posts
        admin = User.objects.filter(role='admin').first()
        if admin and BlogPost.objects.count() == 0:
            cat1 = BlogCategory.objects.filter(slug='course-critiques').first()
            cat2 = BlogCategory.objects.filter(slug='tools-resources').first()
            cat3 = BlogCategory.objects.filter(slug='academic-tips').first()
            
            if cat1:
                BlogPost.objects.create(
                    title='How to Survive Microbiology 301',
                    content='Microbiology 301 is one of the toughest courses. Tips: 1) Start lab reports early 2) Form study groups 3) Use online resources like MicrobeWiki. Good luck!',
                    excerpt='Tips for surviving one of the toughest 3rd year courses.',
                    category=cat1,
                    author=admin,
                    tags='microbiology,study-tips,course-critique',
                    is_published=True,
                    is_featured=True,
                    published_at=timezone.now()
                )
            
            if cat2:
                BlogPost.objects.create(
                    title='Best Laptops for Students Under KES 40,000',
                    content='Top picks: HP ProBook 450 G5 (KES 35-38K), Lenovo ThinkPad T480 (KES 32-37K), Dell Latitude 7490 (KES 33-38K). All available on campus.',
                    excerpt='Affordable laptops that get the job done for university students.',
                    category=cat2,
                    author=admin,
                    tags='laptops,marketplace,budget,tech',
                    is_published=True,
                    published_at=timezone.now()
                )
            
            if cat3:
                BlogPost.objects.create(
                    title='5 Study Hacks Every Student Should Know',
                    content='1) Pomodoro Technique 2) Active Recall 3) Spaced Repetition 4) Teach Someone Else 5) Use Mnemonics. Try these and watch your grades improve!',
                    excerpt='Proven study techniques to boost your academic performance.',
                    category=cat3,
                    author=admin,
                    tags='study-tips,productivity,academics',
                    is_published=True,
                    published_at=timezone.now()
                )
            
            self.stdout.write(self.style.SUCCESS('Created sample blog posts!'))
        
        self.stdout.write(f'Total blog posts: {BlogPost.objects.count()}')
