from django.db import models
from common.models import BaseModel
from common.constants import AnnouncementTarget


# THE basic model for anncments
class Announcement(BaseModel):
    title = models.CharField(max_length=255)
    content = models.TextField()
    posted_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='announcements'
    )
    target = models.CharField(
        max_length=30,
        choices=[(target.value, target.name) for target in AnnouncementTarget],
        default=AnnouncementTarget.ENTIRE_INSTITUTION.value
    )
    target_classes = models.ManyToManyField(
        'classes.ClassGroup',
        blank=True,
        related_name='announcements'
    )
    is_urgent = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-is_urgent', '-created_at']
        indexes = [
            models.Index(fields=['expires_at']),
            models.Index(fields=['posted_by', 'is_active']),
        ]
    
    def __str__(self):
        return self.title

class AnnouncementRequest(BaseModel):
    requester = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='announcement_requests'
    )
    title = models.CharField(max_length=255)
    content = models.TextField()
    target = models.CharField(
        max_length=30,
        choices=[
            ('class_rep', 'Class Representative'),
            ('student_leaders', 'Student Leaders'),
            ('both', 'Both')
        ],
        default='class_rep'
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('seen', 'Seen'),
            ('read', 'Read'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected')
        ],
        default='pending'
    )
    handled_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='handled_requests'
    )
    response_note = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['requester']),
        ]

class Report(BaseModel):
    reported_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='reports_made'
    )
    announcement = models.ForeignKey(
        Announcement,
        on_delete=models.CASCADE,
        related_name='reports'
    )
    reason = models.CharField(max_length=50, choices=[
        ('spam', 'Spam'),
        ('inappropriate', 'Inappropriate Content'),
        ('misinformation', 'Misinformation'),
        ('harassment', 'Harassment'),
        ('other', 'Other')
    ])
    description = models.TextField(blank=True)
    is_resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_reports'
    )
    resolution_note = models.TextField(blank=True)
    
    class Meta:
        unique_together = ['reported_by', 'announcement']