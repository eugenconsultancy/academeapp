from django.contrib import admin
from .models import Opportunity, Like, OpportunityReport

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