"""
Sample data for GeoService testing with Kenya coordinates.
Run with: python sample_data/populate_geoservice.py
"""

import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'academe.settings')
django.setup()

from apps.geoservice.models import CampusVenue, GeocodingCache
from apps.accounts.models import User
from apps.classes.models import ClassGroup, TimetableEntry
from datetime import time
from django.utils import timezone
from django.contrib.auth.hashers import make_password


def create_sample_venues():
    """Create sample campus venues with accurate coordinates"""
    
    venues_data = [
        {
            'name': 'Lecture Hall 3 (LH3)',
            'institution': 'Kenyatta University',
            'building_code': 'LH3',
            'floor': 1,
            'room_number': '301',
            'venue_type': 'lecture_hall',
            'latitude': -1.181056,
            'longitude': 36.927234,
            'full_address': 'Lecture Hall 3, Kenyatta University, Nairobi, Kenya',
            'is_active': True,
        },
        {
            'name': 'Education Building 2 (EDU 2)',
            'institution': 'Kenyatta University',
            'building_code': 'EDU2',
            'floor': 2,
            'room_number': '205',
            'venue_type': 'lecture_hall',
            'latitude': -1.1812643,
            'longitude': 36.9354096,
            'full_address': 'Education Building 2, Kenyatta University, Nairobi, Kenya',
            'is_active': True,
        },
        {
            'name': 'Science and Technology Complex (STC)',
            'institution': 'Kenyatta University',
            'building_code': 'STC',
            'floor': 3,
            'room_number': '312',
            'venue_type': 'laboratory',
            'latitude': -1.18202,
            'longitude': 36.93670,
            'full_address': 'Science and Technology Complex, Kenyatta University, Nairobi, Kenya',
            'is_active': True,
        },
        {
            'name': 'KENET Data Center',
            'institution': 'Kenyatta University',
            'building_code': 'KENET',
            'floor': 1,
            'room_number': '001',
            'venue_type': 'office',
            'latitude': -1.181668,
            'longitude': 36.93289,
            'full_address': 'KENET Building, Kenyatta University, Nairobi, Kenya',
            'is_active': True,
        },
        {
            'name': 'Main Library',
            'institution': 'Kenyatta University',
            'building_code': 'LIB',
            'floor': 0,
            'room_number': 'G001',
            'venue_type': 'library',
            'latitude': -1.180500,
            'longitude': 36.930000,
            'full_address': 'Jomo Kenyatta Memorial Library, Kenyatta University, Nairobi, Kenya',
            'is_active': True,
        },
        {
            'name': 'Business School',
            'institution': 'Kenyatta University',
            'building_code': 'BS',
            'floor': 2,
            'room_number': '202',
            'venue_type': 'lecture_hall',
            'latitude': -1.179800,
            'longitude': 36.928500,
            'full_address': 'School of Business, Kenyatta University, Nairobi, Kenya',
            'is_active': True,
        },
        {
            'name': 'Engineering Workshop',
            'institution': 'Kenyatta University',
            'building_code': 'ENG',
            'floor': 0,
            'room_number': 'W001',
            'venue_type': 'laboratory',
            'latitude': -1.182500,
            'longitude': 36.934200,
            'full_address': 'Engineering Workshop, Kenyatta University, Nairobi, Kenya',
            'is_active': True,
        },
        {
            'name': 'Student Center',
            'institution': 'Kenyatta University',
            'building_code': 'SC',
            'floor': 1,
            'room_number': '101',
            'venue_type': 'cafeteria',
            'latitude': -1.180200,
            'longitude': 36.931500,
            'full_address': 'Student Center, Kenyatta University, Nairobi, Kenya',
            'is_active': True,
        },
        {
            'name': 'Institute of Computer Science',
            'institution': 'Kenyatta University',
            'building_code': 'ICS',
            'floor': 3,
            'room_number': '308',
            'venue_type': 'lecture_hall',
            'latitude': -1.181900,
            'longitude': 36.933500,
            'full_address': 'Institute of Computer Science, Kenyatta University, Nairobi, Kenya',
            'is_active': True,
        },
        {
            'name': 'University Sports Complex',
            'institution': 'Kenyatta University',
            'building_code': 'SPT',
            'floor': 0,
            'room_number': 'G001',
            'venue_type': 'sports',
            'latitude': -1.179500,
            'longitude': 36.929800,
            'full_address': 'Sports Complex, Kenyatta University, Nairobi, Kenya',
            'is_active': True,
        },
    ]
    
    venues_created = []
    for venue_data in venues_data:
        venue, created = CampusVenue.objects.get_or_create(
            name=venue_data['name'],
            institution=venue_data['institution'],
            defaults=venue_data
        )
        venues_created.append(venue)
        status = "✓ Created" if created else "○ Already exists"
        print(f"{status}: {venue.name}")
        if created:
            print(f"   Location: ({venue.latitude}, {venue.longitude})")
    
    return venues_created


def create_sample_geocoding_cache():
    """Create sample geocoding cache entries"""
    
    cache_data = [
        {
            'address': 'Kenyatta University Main Gate, Nairobi',
            'latitude': -1.180000,
            'longitude': 36.925000,
            'source': 'nominatim',
            'hit_count': 5,
        },
        {
            'address': 'Lecture Hall 3, Kenyatta University',
            'latitude': -1.181056,
            'longitude': 36.927234,
            'source': 'venue_db',
            'hit_count': 10,
        },
        {
            'address': 'Education Building KU',
            'latitude': -1.1812643,
            'longitude': 36.9354096,
            'source': 'venue_db',
            'hit_count': 8,
        },
        {
            'address': 'Science Complex KU',
            'latitude': -1.18202,
            'longitude': 36.93670,
            'source': 'venue_db',
            'hit_count': 6,
        },
        {
            'address': 'KENET Nairobi',
            'latitude': -1.181668,
            'longitude': 36.93289,
            'source': 'venue_db',
            'hit_count': 4,
        },
    ]
    
    cache_entries = []
    for cache_entry in cache_data:
        entry, created = GeocodingCache.objects.get_or_create(
            address=cache_entry['address'],
            defaults=cache_entry
        )
        cache_entries.append(entry)
        if created:
            print(f"✓ Created cache: '{cache_entry['address']}'")
    
    return cache_entries


def create_sample_users():
    """Create sample test users"""
    
    users_data = [
        {
            'email': 'teststudent@academe.edu',
            'full_name': 'Test Student',
            'role': 'student',
            'password': 'testpass123',
        },
        {
            'email': 'testteacher@academe.edu',
            'full_name': 'Test Teacher',
            'role': 'teacher',
            'password': 'testpass123',
        },
        {
            'email': 'testadmin@academe.edu',
            'full_name': 'Test Admin',
            'role': 'admin',
            'password': 'testpass123',
        },
    ]
    
    users_created = []
    for user_data in users_data:
        user, created = User.objects.get_or_create(
            email=user_data['email'],
            defaults={
                'full_name': user_data['full_name'],
                'role': user_data['role'],
                'is_active': True,
                'password': make_password(user_data['password']),
            }
        )
        users_created.append(user)
        if created:
            print(f"✓ Created user: {user.email} (password: {user_data['password']})")
        else:
            print(f"○ User already exists: {user.email}")
    
    return users_created


def main():
    """Main function to populate all sample data"""
    
    print("\n" + "="*60)
    print("  GeoService Sample Data Population")
    print("="*60 + "\n")
    
    # Create venues
    print("📍 Creating sample venues...")
    print("-" * 40)
    venues = create_sample_venues()
    print(f"\n✓ Total venues: {len(venues)}\n")
    
    # Create geocoding cache
    print("🗂️  Creating geocoding cache...")
    print("-" * 40)
    cache_entries = create_sample_geocoding_cache()
    print(f"\n✓ Total cache entries: {len(cache_entries)}\n")
    
    # Create users
    print("👥 Creating test users...")
    print("-" * 40)
    users = create_sample_users()
    print(f"\n✓ Total users: {len(users)}\n")
    
    # Summary
    print("="*60)
    print("  POPULATION COMPLETE!")
    print("="*60)
    print("\n📊 Summary:")
    print(f"   • Venues: {len(venues)}")
    print(f"   • Geocoding Cache: {len(cache_entries)}")
    print(f"   • Users: {len(users)}")
    
    print("\n🔑 Test Login Credentials:")
    print("   • Student: teststudent@academe.edu / testpass123")
    print("   • Teacher: testteacher@academe.edu / testpass123")
    print("   • Admin: testadmin@academe.edu / testpass123")
    
    print("\n📍 Key Locations (for GPS testing):")
    print("   • LH3: -1.181056, 36.927234")
    print("   • EDU2: -1.1812643, 36.9354096")
    print("   • STC: -1.18202, 36.93670")
    print("   • KENET: -1.181668, 36.93289")
    
    print("\n✅ Sample data ready for testing!\n")


if __name__ == "__main__":
    main()
