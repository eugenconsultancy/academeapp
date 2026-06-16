# apps/opportunities/models.py
"""
Opportunities models for Academe.
Added ScholarshipReview for document upload and paid review workflow.
"""

from django.db import models
from common.models import BaseModel
from common.constants import ScholarshipReviewStatus


class Opportunity(BaseModel):
    title = models.CharField(max_length=255)
    description = models.TextField()
    link = models.URLField(blank=True)
    category = models.CharField(max_length=50, choices=[
        ('internship', 'Internship'),
        ('scholarship', 'Scholarship'),
        ('attachment', 'Attachment'),
        ('concert', 'Concert'),
        ('workshop', 'Workshop'),
        ('competition', 'Competition'),
        ('other', 'Other')
    ])
    posted_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='opportunities'
    )
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return self.title


class Like(BaseModel):
    opportunity = models.ForeignKey(
        Opportunity,
        on_delete=models.CASCADE,
        related_name='likes'
    )
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='likes'
    )
    
    class Meta:
        unique_together = ['opportunity', 'user']


class OpportunityReport(BaseModel):
    opportunity = models.ForeignKey(
        Opportunity,
        on_delete=models.CASCADE,
        related_name='reports'
    )
    reported_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='opportunity_reports'
    )
    reason = models.CharField(max_length=50, choices=[
        ('spam', 'Spam'),
        ('scam', 'Scam'),
        ('expired', 'Expired'),
        ('inappropriate', 'Inappropriate'),
        ('other', 'Other')
    ])
    description = models.TextField(blank=True)
    is_resolved = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ['opportunity', 'reported_by']


# ─── NEW: Scholarship Review ─────────────────────────────────────────────────
class ScholarshipReview(BaseModel):
    student = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='scholarship_reviews'
    )
    opportunity = models.ForeignKey(
        Opportunity,
        on_delete=models.CASCADE,
        related_name='scholarship_reviews'
    )
    document = models.FileField(upload_to='scholarship_docs/')
    status = models.CharField(
        max_length=20,
        choices=[(s.value, s.name.title()) for s in ScholarshipReviewStatus],
        default=ScholarshipReviewStatus.PENDING.value
    )
    invoice_id = models.CharField(max_length=100, blank=True, null=True)
    admin_comments = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"ScholarshipReview #{self.id} by {self.student}"