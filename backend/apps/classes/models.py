from django.db import models
from common.models import BaseModel

class ClassGroup(BaseModel):
    name = models.CharField(max_length=100)
    institution = models.CharField(max_length=255)
    class_rep = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='represented_classes'
    )
    students = models.ManyToManyField(
        'accounts.User',
        related_name='enrolled_classes'
    )
    
    class Meta:
        unique_together = ['name', 'institution']
    
    def __str__(self):
        return f"{self.name} - {self.institution}"

class TimetableEntry(BaseModel):
    class_group = models.ForeignKey(
        ClassGroup,
        on_delete=models.CASCADE,
        related_name='timetable'
    )
    day_of_week = models.IntegerField(choices=[
        (0, 'Monday'), (1, 'Tuesday'), (2, 'Wednesday'),
        (3, 'Thursday'), (4, 'Friday'), (5, 'Saturday'), (6, 'Sunday')
    ])
    start_time = models.TimeField()
    end_time = models.TimeField()
    unit_name = models.CharField(max_length=255)
    venue = models.CharField(max_length=255)
    lecturer = models.CharField(max_length=255, blank=True)  # Added for lecturer name
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['day_of_week', 'start_time']
        indexes = [
            models.Index(fields=['class_group', 'day_of_week']),
        ]
    
    def __str__(self):
        return f"{self.unit_name} - {self.get_day_of_week_display()}"

class AttendanceRecord(BaseModel):
    student = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    timetable_entry = models.ForeignKey(
        TimetableEntry,
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    date = models.DateField()
    marked_at = models.DateTimeField(auto_now_add=True)
    sync_method = models.CharField(
        max_length=10,
        choices=[('online', 'Online'), ('offline', 'Offline')],
        default='online'
    )
    client_timestamp = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['student', 'timetable_entry', 'date']  # Prevent duplicates
        indexes = [
            models.Index(fields=['student', 'date']),
            models.Index(fields=['timetable_entry', 'date']),
        ]
    
    def __str__(self):
        return f"{self.student.full_name} - {self.timetable_entry.unit_name} - {self.date}"