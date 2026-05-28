from django.contrib import admin
from .models import SupportTicket, TicketResponse


class TicketResponseInline(admin.TabularInline):
    model = TicketResponse
    extra = 0
    readonly_fields = ('created_at',)
    fields = ('responder', 'message', 'is_internal', 'created_at')
    ordering = ('-created_at',)


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'title', 'submitted_by', 'category', 'status',
        'assigned_to', 'created_at'
    )
    list_filter = ('status', 'category', 'created_at')
    search_fields = ('title', 'description', 'submitted_by__email', 'submitted_by__full_name')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    inlines = [TicketResponseInline]
    fieldsets = (
        (None, {
            'fields': ('title', 'description', 'submitted_by', 'category', 'status')
        }),
        ('Assignment & Resolution', {
            'fields': ('assigned_to', 'resolution')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TicketResponse)
class TicketResponseAdmin(admin.ModelAdmin):
    list_display = ('id', 'ticket', 'responder', 'is_internal', 'created_at')
    list_filter = ('is_internal', 'created_at')
    search_fields = ('ticket__title', 'responder__email', 'message')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)