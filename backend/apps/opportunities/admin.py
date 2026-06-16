# apps/opportunities/admin.py
from django.contrib import admin
from django.utils import timezone
from .models import Opportunity, Like, OpportunityReport, ScholarshipReview
from common.constants import ScholarshipReviewStatus


@admin.register(Opportunity)
class OpportunityAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'posted_by', 'expires_at', 'is_active')
    list_filter = ('category', 'is_active')
    search_fields = ('title', 'description')


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ('opportunity', 'user', 'created_at')


@admin.register(OpportunityReport)
class OpportunityReportAdmin(admin.ModelAdmin):
    list_display = ('opportunity', 'reported_by', 'reason', 'is_resolved')
    list_filter = ('reason', 'is_resolved')


@admin.register(ScholarshipReview)
class ScholarshipReviewAdmin(admin.ModelAdmin):
    list_display = ('student', 'opportunity', 'status', 'invoice_id', 'created_at', 'reviewed_at')
    list_filter = ('status', 'created_at')
    search_fields = ('student__full_name', 'opportunity__title', 'invoice_id')
    readonly_fields = ('invoice_id', 'created_at', 'updated_at')
    fields = (
        'student', 'opportunity', 'document', 'status',
        'invoice_id', 'admin_comments', 'reviewed_at', 'created_at', 'updated_at'
    )
    actions = ['mark_reviewed']

    @admin.action(description="Mark selected reviews as reviewed")
    def mark_reviewed(self, request, queryset):
        now = timezone.now()
        queryset.update(status=ScholarshipReviewStatus.REVIEWED.value, reviewed_at=now)