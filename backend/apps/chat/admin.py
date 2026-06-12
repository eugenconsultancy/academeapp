# backend/apps/chat/admin.py

from django.contrib import admin
from .models import (
    Conversation, Message, BlockedUser,
    MutedConversation, PinnedConversation, UserReport
)


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'is_active', 'last_message_at',
        'participant_count', 'message_count', 'created_at'
    )
    list_filter = ('is_active', 'last_message_at', 'created_at')
    search_fields = ('id', 'participants__full_name', 'participants__email')
    filter_horizontal = ('participants', 'deleted_by')
    readonly_fields = ('last_message_at',)
    date_hierarchy = 'created_at'
    actions = ['deactivate_conversations', 'activate_conversations']

    @admin.display(description='Participants')
    def participant_count(self, obj):
        return obj.participants.count()

    @admin.display(description='Messages')
    def message_count(self, obj):
        return obj.messages.count()

    @admin.action(description="Deactivate selected conversations")
    def deactivate_conversations(self, request, queryset):
        queryset.update(is_active=False)

    @admin.action(description="Activate selected conversations")
    def activate_conversations(self, request, queryset):
        queryset.update(is_active=True)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'conversation_link', 'sender', 'msg_type',
        'is_read', 'has_reply', 'created_at'
    )
    list_filter = ('msg_type', 'is_read', 'created_at')
    search_fields = (
        'content', 'sender__full_name', 'sender__email', 'conversation__id'
    )
    readonly_fields = ('created_at', 'read_at')
    date_hierarchy = 'created_at'
    raw_id_fields = ('conversation', 'sender', 'reply_to')

    @admin.display(description='Conversation')
    def conversation_link(self, obj):
        return f"Conv {obj.conversation_id}"

    @admin.display(description='Has Reply', boolean=True)
    def has_reply(self, obj):
        return obj.reply_to_id is not None


@admin.register(BlockedUser)
class BlockedUserAdmin(admin.ModelAdmin):
    list_display = ('blocker', 'blocked', 'created_at')
    list_filter = ('created_at',)
    search_fields = (
        'blocker__full_name', 'blocker__email',
        'blocked__full_name', 'blocked__email'
    )
    raw_id_fields = ('blocker', 'blocked')


@admin.register(MutedConversation)
class MutedConversationAdmin(admin.ModelAdmin):
    list_display = ('user', 'conversation_link', 'muted_at')
    search_fields = ('user__full_name', 'user__email', 'conversation__id')
    raw_id_fields = ('user', 'conversation')

    @admin.display(description='Conversation')
    def conversation_link(self, obj):
        return f"Conv {obj.conversation_id}"


@admin.register(PinnedConversation)
class PinnedConversationAdmin(admin.ModelAdmin):
    list_display = ('user', 'conversation_link', 'pinned_at')
    search_fields = ('user__full_name', 'user__email', 'conversation__id')
    raw_id_fields = ('user', 'conversation')

    @admin.display(description='Conversation')
    def conversation_link(self, obj):
        return f"Conv {obj.conversation_id}"


@admin.register(UserReport)
class UserReportAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'reporter', 'reported_user', 'reason', 'status', 'created_at'
    )
    list_filter = ('status', 'reason', 'created_at')
    search_fields = (
        'reporter__full_name', 'reporter__email',
        'reported_user__full_name', 'reported_user__email',
        'description',
    )
    readonly_fields = (
        'reporter', 'reported_user', 'reason', 'description',
        'conversation', 'created_at'
    )
    raw_id_fields = ('reporter', 'reported_user', 'conversation')
    actions = ['mark_under_review', 'mark_resolved', 'mark_dismissed']
    fieldsets = (
        ('Report Details', {
            'fields': ('reporter', 'reported_user', 'reason', 'description', 'conversation')
        }),
        ('Status', {
            'fields': ('status', 'admin_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    @admin.action(description="Mark selected reports as Under Review")
    def mark_under_review(self, request, queryset):
        queryset.update(status='under_review')

    @admin.action(description="Mark selected reports as Resolved")
    def mark_resolved(self, request, queryset):
        queryset.update(status='resolved')

    @admin.action(description="Mark selected reports as Dismissed")
    def mark_dismissed(self, request, queryset):
        queryset.update(status='dismissed')