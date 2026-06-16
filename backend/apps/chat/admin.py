# backend/apps/chat/admin.py
"""
Django Admin configuration for chat models.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import (
    Conversation, ConversationParticipant, Message,
    MessageReadReceipt, BlockList, Report,
    DeviceToken, BulkMessageTask,
)


# ─── Inline Models ────────────────────────────────────────────────────────────

class ConversationParticipantInline(admin.TabularInline):
    """Display participants inline on Conversation admin page."""
    model = ConversationParticipant
    extra = 0
    show_change_link = True
    fields = (
        'user', 'is_pinned', 'is_archived', 'is_muted',
        'unread_count', 'joined_at', 'last_seen_at',
    )
    readonly_fields = ('joined_at', 'last_seen_at')
    raw_id_fields = ('user',)
    ordering = ('-is_pinned', 'user__full_name')


class MessageInline(admin.TabularInline):
    """Display recent messages inline on Conversation admin page."""
    model = Message
    extra = 0
    show_change_link = True
    fields = ('sender', 'content_preview', 'msg_type', 'status', 'created_at')
    readonly_fields = ('sender', 'content_preview', 'msg_type', 'status', 'created_at')
    ordering = ('-created_at',)
    max_num = 20  # Show only last 20 messages
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        return False
    
    @admin.display(description='Content')
    def content_preview(self, obj):
        if obj.deleted_for_everyone:
            return '[Message deleted]'
        return (obj.content or obj.file_name or obj.msg_type)[:100]


class MessageReadReceiptInline(admin.TabularInline):
    """Display read receipts inline on Message admin page."""
    model = MessageReadReceipt
    extra = 0
    fields = ('user', 'read_at')
    readonly_fields = ('user', 'read_at')
    
    def has_add_permission(self, request, obj=None):
        return False


# ─── Conversation Admin ───────────────────────────────────────────────────────

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = (
        'id_short',
        'type_display',
        'participant_count',
        'message_count',
        'last_message_preview',
        'last_message_at',
        'created_at',
    )
    list_filter = (
        'is_group',
        'last_message_at',
        'created_at',
    )
    search_fields = (
        'id',
        'group_name',
        'participants__full_name',
        'participants__phone_number',
    )
    readonly_fields = (
        'id', 'last_message_at', 'last_message_content',
        'created_at', 'updated_at',
    )
    date_hierarchy = 'created_at'
    ordering = ('-last_message_at',)
    
    inlines = [
        ConversationParticipantInline,
        MessageInline,
    ]
    
    fieldsets = (
        ('Conversation Info', {
            'fields': (
                'id', 'is_group', 'group_name', 'group_avatar',
            )
        }),
        ('Group Admin', {
            'fields': ('group_admin',),
            'classes': ('collapse',),
        }),
        ('Last Message', {
            'fields': (
                'last_message_content', 'last_message_at',
                'last_message_sender',
            ),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    
    raw_id_fields = ('group_admin', 'last_message_sender')
    
    # ─── Display Helpers ──────────────────────────────────────────────────
    
    @admin.display(description='ID')
    def id_short(self, obj):
        return str(obj.id)[:8] + '...'
    
    @admin.display(description='Type')
    def type_display(self, obj):
        if obj.is_group:
            return format_html(
                '<span style="color: #2563eb;">👥 Group</span>'
            )
        return format_html(
            '<span style="color: #059669;">👤 Direct</span>'
        )
    
    @admin.display(description='Participants')
    def participant_count(self, obj):
        count = obj.participants.count()
        url = reverse('admin:chat_conversationparticipant_changelist')
        return format_html(
            '<a href="{}?conversation__id={}">{}</a>',
            url, obj.id, count
        )
    
    @admin.display(description='Messages')
    def message_count(self, obj):
        count = obj.messages.count()
        url = reverse('admin:chat_message_changelist')
        return format_html(
            '<a href="{}?conversation__id={}">{}</a>',
            url, obj.id, count
        )
    
    @admin.display(description='Last Message')
    def last_message_preview(self, obj):
        if obj.last_message_content:
            return obj.last_message_content[:80]
        return '—'


# ─── ConversationParticipant Admin ────────────────────────────────────────────

@admin.register(ConversationParticipant)
class ConversationParticipantAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'conversation_link',
        'is_pinned',
        'is_archived',
        'is_muted',
        'unread_count',
        'has_draft',
        'joined_at',
    )
    list_filter = (
        'is_pinned',
        'is_archived',
        'is_muted',
        'is_deleted',
        'joined_at',
    )
    search_fields = (
        'user__full_name',
        'user__phone_number',
        'conversation__id',
        'conversation__group_name',
    )
    readonly_fields = ('joined_at', 'last_read_at', 'created_at', 'updated_at')
    raw_id_fields = ('user', 'conversation')
    ordering = ('-is_pinned', '-conversation__last_message_at')
    
    fieldsets = (
        ('Participant Info', {
            'fields': ('conversation', 'user')
        }),
        ('Status Flags', {
            'fields': (
                'is_pinned', 'is_archived', 'is_muted',
                'is_deleted', 'unread_count',
            )
        }),
        ('Activity', {
            'fields': ('joined_at', 'last_read_at', 'last_seen_at')
        }),
        ('Draft', {
            'fields': ('draft',),
            'classes': ('collapse',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    
    actions = ['pin_selected', 'unpin_selected', 'mute_selected', 'unmute_selected']
    
    @admin.display(description='Conversation')
    def conversation_link(self, obj):
        url = reverse('admin:chat_conversation_change', args=[obj.conversation_id])
        name = obj.conversation.group_name or f"Chat {str(obj.conversation_id)[:8]}"
        return format_html('<a href="{}">{}</a>', url, name)
    
    @admin.display(boolean=True, description='Draft')
    def has_draft(self, obj):
        return bool(obj.draft)
    
    @admin.action(description="Pin selected conversations")
    def pin_selected(self, request, queryset):
        updated = queryset.update(is_pinned=True)
        self.message_user(request, f'{updated} conversation(s) pinned.')
    
    @admin.action(description="Unpin selected conversations")
    def unpin_selected(self, request, queryset):
        updated = queryset.update(is_pinned=False)
        self.message_user(request, f'{updated} conversation(s) unpinned.')
    
    @admin.action(description="Mute selected conversations")
    def mute_selected(self, request, queryset):
        updated = queryset.update(is_muted=True)
        self.message_user(request, f'{updated} conversation(s) muted.')
    
    @admin.action(description="Unmute selected conversations")
    def unmute_selected(self, request, queryset):
        updated = queryset.update(is_muted=False)
        self.message_user(request, f'{updated} conversation(s) unmuted.')


# ─── Message Admin ────────────────────────────────────────────────────────────

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = (
        'id_short',
        'conversation_link',
        'sender',
        'msg_type',
        'status_badge',
        'is_edited',
        'is_forwarded',
        'is_deleted',
        'created_at',
    )
    list_filter = (
        'msg_type',
        'status',
        'is_edited',
        'is_forwarded',
        'deleted_for_everyone',
        'created_at',
    )
    search_fields = (
        'content',
        'sender__full_name',
        'sender__phone_number',
        'conversation__id',
        'file_name',
    )
    readonly_fields = (
        'id', 'created_at', 'updated_at',
        'edited_at', 'deleted_at',
    )
    date_hierarchy = 'created_at'
    raw_id_fields = (
        'conversation', 'sender', 'reply_to', 'forwarded_from',
    )
    ordering = ('-created_at',)
    
    inlines = [MessageReadReceiptInline]
    
    fieldsets = (
        ('Message Info', {
            'fields': (
                'id', 'conversation', 'sender',
                'content', 'msg_type', 'status',
            )
        }),
        ('Attachment', {
            'fields': (
                'file_url', 'file_name', 'file_size',
                'file_mime_type', 'thumbnail_url', 'duration',
            ),
            'classes': ('collapse',),
        }),
        ('Threading', {
            'fields': ('reply_to', 'forwarded_from', 'is_forwarded'),
            'classes': ('collapse',),
        }),
        ('Editing', {
            'fields': ('is_edited', 'edited_at', 'edit_history'),
            'classes': ('collapse',),
        }),
        ('Deletion', {
            'fields': (
                'deleted_for_self', 'deleted_for_everyone', 'deleted_at',
            ),
            'classes': ('collapse',),
        }),
        ('Idempotency', {
            'fields': ('client_msg_id',),
            'classes': ('collapse',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    
    actions = [
        'mark_as_read',
        'mark_as_delivered',
        'delete_for_everyone_selected',
    ]
    
    # ─── Display Helpers ──────────────────────────────────────────────────
    
    @admin.display(description='ID')
    def id_short(self, obj):
        return str(obj.id)[:8] + '...'
    
    @admin.display(description='Conversation')
    def conversation_link(self, obj):
        url = reverse('admin:chat_conversation_change', args=[obj.conversation_id])
        return format_html('<a href="{}">Chat {}</a>', url, str(obj.conversation_id)[:8])
    
    @admin.display(description='Status')
    def status_badge(self, obj):
        colors = {
            'pending': '#6b7280',
            'sent': '#3b82f6',
            'delivered': '#8b5cf6',
            'read': '#059669',
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )
    
    @admin.display(boolean=True, description='Deleted')
    def is_deleted(self, obj):
        return obj.deleted_for_everyone or obj.deleted_for_self
    
    # ─── Actions ─────────────────────────────────────────────────────────
    
    @admin.action(description="Mark selected messages as read")
    def mark_as_read(self, request, queryset):
        updated = queryset.update(status='read')
        self.message_user(request, f'{updated} message(s) marked as read.')
    
    @admin.action(description="Mark selected messages as delivered")
    def mark_as_delivered(self, request, queryset):
        updated = queryset.update(status='delivered')
        self.message_user(request, f'{updated} message(s) marked as delivered.')
    
    @admin.action(description="Delete selected messages for everyone")
    def delete_for_everyone_selected(self, request, queryset):
        from django.utils import timezone
        count = 0
        for msg in queryset:
            msg.soft_delete_for_everyone()
            count += 1
        self.message_user(request, f'{count} message(s) deleted for everyone.')


# ─── MessageReadReceipt Admin ─────────────────────────────────────────────────

@admin.register(MessageReadReceipt)
class MessageReadReceiptAdmin(admin.ModelAdmin):
    list_display = ('message_link', 'user', 'read_at')
    list_filter = ('read_at',)
    search_fields = ('user__full_name', 'message__id')
    readonly_fields = ('message', 'user', 'read_at')
    raw_id_fields = ('message', 'user')
    ordering = ('-read_at',)
    
    def has_add_permission(self, request):
        return False
    
    @admin.display(description='Message')
    def message_link(self, obj):
        url = reverse('admin:chat_message_change', args=[obj.message_id])
        preview = (obj.message.content or '')[:50]
        return format_html('<a href="{}">{}</a>', url, preview)


# ─── BlockList Admin ──────────────────────────────────────────────────────────

@admin.register(BlockList)
class BlockListAdmin(admin.ModelAdmin):
    list_display = ('blocker', 'blocked_user', 'created_at')
    list_filter = ('created_at',)
    search_fields = (
        'blocker__full_name',
        'blocker__phone_number',
        'blocked_user__full_name',
        'blocked_user__phone_number',
    )
    readonly_fields = ('created_at',)
    raw_id_fields = ('blocker', 'blocked_user')
    ordering = ('-created_at',)
    
    actions = ['remove_blocks']
    
    @admin.action(description="Remove selected blocks")
    def remove_blocks(self, request, queryset):
        count, _ = queryset.delete()
        self.message_user(request, f'{count} block(s) removed.')


# ─── Report Admin ─────────────────────────────────────────────────────────────

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = (
        'id_short',
        'reporter',
        'reported_user',
        'reason',
        'status_badge',
        'created_at',
    )
    list_filter = (
        'status',
        'reason',
        'created_at',
    )
    search_fields = (
        'reporter__full_name',
        'reporter__phone_number',
        'reported_user__full_name',
        'reported_user__phone_number',
        'description',
    )
    readonly_fields = (
        'reporter', 'reported_user', 'reason',
        'description', 'message', 'conversation',
        'created_at', 'updated_at',
    )
    raw_id_fields = (
        'reporter', 'reported_user',
        'message', 'conversation', 'resolved_by',
    )
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Report Details', {
            'fields': (
                'reporter', 'reported_user', 'reason',
                'description',
            )
        }),
        ('Target', {
            'fields': ('message', 'conversation'),
            'classes': ('collapse',),
        }),
        ('Resolution', {
            'fields': (
                'status', 'admin_notes',
                'resolved_by', 'resolved_at',
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    
    actions = [
        'mark_under_review',
        'mark_resolved',
        'mark_dismissed',
    ]
    
    # ─── Display Helpers ──────────────────────────────────────────────────
    
    @admin.display(description='ID')
    def id_short(self, obj):
        return str(obj.id)[:8] + '...'
    
    @admin.display(description='Status')
    def status_badge(self, obj):
        colors = {
            'pending': '#f59e0b',
            'under_review': '#3b82f6',
            'resolved': '#059669',
            'dismissed': '#6b7280',
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )
    
    # ─── Actions ─────────────────────────────────────────────────────────
    
    @admin.action(description="Mark selected reports as Under Review")
    def mark_under_review(self, request, queryset):
        updated = queryset.update(status='under_review')
        self.message_user(request, f'{updated} report(s) marked as Under Review.')
    
    @admin.action(description="Mark selected reports as Resolved")
    def mark_resolved(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(
            status='resolved',
            resolved_by=request.user,
            resolved_at=timezone.now(),
        )
        self.message_user(request, f'{updated} report(s) resolved.')
    
    @admin.action(description="Mark selected reports as Dismissed")
    def mark_dismissed(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(
            status='dismissed',
            resolved_by=request.user,
            resolved_at=timezone.now(),
        )
        self.message_user(request, f'{updated} report(s) dismissed.')


# ─── DeviceToken Admin ────────────────────────────────────────────────────────

@admin.register(DeviceToken)
class DeviceTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'device_type', 'is_active', 'created_at')
    list_filter = ('device_type', 'is_active', 'created_at')
    search_fields = ('user__full_name', 'user__phone_number', 'token')
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('user',)
    ordering = ('-created_at',)
    
    actions = ['deactivate_tokens', 'activate_tokens']
    
    @admin.action(description="Deactivate selected tokens")
    def deactivate_tokens(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} token(s) deactivated.')
    
    @admin.action(description="Activate selected tokens")
    def activate_tokens(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} token(s) activated.')


# ─── BulkMessageTask Admin ────────────────────────────────────────────────────

@admin.register(BulkMessageTask)
class BulkMessageTaskAdmin(admin.ModelAdmin):
    list_display = (
        'id_short', 'sender', 'status_badge',
        'total_recipients', 'success_count', 'failed_count',
        'created_at',
    )
    list_filter = ('status', 'created_at')
    search_fields = ('sender__full_name', 'content')
    readonly_fields = (
        'sender', 'filter_params', 'content',
        'total_recipients', 'success_count', 'failed_count',
        'error_log', 'created_at', 'completed_at', 'updated_at',
    )
    ordering = ('-created_at',)
    
    def has_add_permission(self, request):
        return False
    
    @admin.display(description='ID')
    def id_short(self, obj):
        return str(obj.id)[:8] + '...'
    
    @admin.display(description='Status')
    def status_badge(self, obj):
        colors = {
            'pending': '#f59e0b',
            'processing': '#3b82f6',
            'completed': '#059669',
            'failed': '#ef4444',
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )