from django.contrib import admin
from .models import FoundItem, Claim, PaymentTransaction, Tip, MpesaTransactionLog

@admin.register(FoundItem)
class FoundItemAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'status', 'is_claimed', 'found_date', 'posted_by')
    list_filter = ('category', 'status', 'is_claimed')
    search_fields = ('title', 'description')

@admin.register(Claim)
class ClaimAdmin(admin.ModelAdmin):
    list_display = ('item', 'claimant', 'status', 'payment_received', 'confirmed_at')
    list_filter = ('status', 'payment_received')

@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ('claim', 'transaction_type', 'amount', 'status', 'created_at')
    list_filter = ('transaction_type', 'status')

@admin.register(Tip)
class TipAdmin(admin.ModelAdmin):
    list_display = ('item', 'sender', 'is_read', 'created_at')
    list_filter = ('is_read',)

@admin.register(MpesaTransactionLog)
class MpesaTransactionLogAdmin(admin.ModelAdmin):
    list_display = ('request_type', 'status_code', 'created_at')
    list_filter = ('request_type', 'status_code')
    readonly_fields = ('request_data', 'response_data')