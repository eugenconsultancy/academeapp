from django.core.management.base import BaseCommand
from apps.geoservice.models import CampusVenue
from apps.geoservice.services import LocationService


class Command(BaseCommand):
    help = 'Seed campus venues with geocoded coordinates'

    def handle(self, *args, **kwargs):
        location_service = LocationService()
        
        venues_data = [
            # Kenyatta University
            {'name': 'Kenyatta University Main Campus', 'institution': 'Kenyatta University', 'building_code': 'MAIN', 'venue_type': 'other', 'address': 'Kenyatta University, Kahawa Sukari, Nairobi, Kenya'},
            {'name': 'Kenyatta University Lecture Hall 3', 'institution': 'Kenyatta University', 'building_code': 'LH3', 'venue_type': 'lecture_hall'},
            {'name': 'Kenyatta University Lab 201', 'institution': 'Kenyatta University', 'building_code': 'LAB201', 'venue_type': 'laboratory'},
            {'name': 'Kenyatta University Computer Lab', 'institution': 'Kenyatta University', 'building_code': 'CLAB', 'venue_type': 'laboratory'},
            {'name': 'Kenyatta University Seminar Room A', 'institution': 'Kenyatta University', 'building_code': 'SEMA', 'venue_type': 'seminar_room'},
            {'name': 'Kenyatta University Student Centre', 'institution': 'Kenyatta University', 'building_code': 'SC', 'venue_type': 'cafeteria'},
            {'name': 'Kenyatta University Library', 'institution': 'Kenyatta University', 'building_code': 'LIB', 'venue_type': 'library'},
            
            # University of Nairobi
            {'name': 'University of Nairobi Main Campus', 'institution': 'University of Nairobi', 'building_code': 'MAIN', 'venue_type': 'other', 'address': 'University of Nairobi, Uhuru Highway, Nairobi, Kenya'},
            {'name': 'University of Nairobi Lecture Theatre 1', 'institution': 'University of Nairobi', 'building_code': 'LT1', 'venue_type': 'lecture_hall'},
            {'name': 'University of Nairobi Science Lab', 'institution': 'University of Nairobi', 'building_code': 'SLAB', 'venue_type': 'laboratory'},
            {'name': 'University of Nairobi Jomo Kenyatta Library', 'institution': 'University of Nairobi', 'building_code': 'JKLIB', 'venue_type': 'library'},
        ]
        
        for venue_data in venues_data:
            venue, created = CampusVenue.objects.get_or_create(
                name=venue_data['name'],
                institution=venue_data['institution'],
                defaults={
                    'building_code': venue_data.get('building_code', ''),
                    'venue_type': venue_data.get('venue_type', 'lecture_hall'),
                    'full_address': venue_data.get('address', ''),
                }
            )
            
            if created:
                # Geocode the venue
                address = venue.full_address or f"{venue.name}, {venue.institution}, Kenya"
                coords = location_service.geocode_address(address)
                
                if coords:
                    venue.latitude = coords[0]
                    venue.longitude = coords[1]
                    venue.save(update_fields=['latitude', 'longitude'])
                    self.stdout.write(self.style.SUCCESS(f"  {venue.name}: ({coords[0]:.4f}, {coords[1]:.4f})"))
                else:
                    self.stdout.write(self.style.WARNING(f"  Could not geocode: {venue.name}"))
        
        self.stdout.write(self.style.SUCCESS(f'Total venues: {CampusVenue.objects.count()}'))
