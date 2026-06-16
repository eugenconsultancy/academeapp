# apps/opportunities/services.py
from django.utils import timezone
from .models import Opportunity, ScholarshipReview
from apps.found_items.payment import MpesaClient
from common.constants import ScholarshipReviewStatus


class OpportunityService:
    @staticmethod
    def get_unread_count(user):
        if not user.last_visited_opportunities:
            return Opportunity.objects.filter(is_active=True).count()
        return Opportunity.objects.filter(
            is_active=True,
            created_at__gt=user.last_visited_opportunities
        ).count()
    
    @staticmethod
    def update_last_visited(user):
        user.last_visited_opportunities = timezone.now()
        user.save(update_fields=['last_visited_opportunities'])


class ScholarshipService:
    @staticmethod
    def submit_review(student, opportunity_id, document):
        opportunity = Opportunity.objects.get(id=opportunity_id)
        review = ScholarshipReview.objects.create(
            student=student,
            opportunity=opportunity,
            document=document,
            status=ScholarshipReviewStatus.PENDING.value,
            created_by=student
        )
        return review

    @staticmethod
    def initiate_payment(review_id, student, phone_number):
        review = ScholarshipReview.objects.get(id=review_id, student=student)
        amount = 100  # Fixed amount
        account_ref = f"scholarship_{review.id}"
        desc = "Scholarship Review Fee"
        client = MpesaClient()
        result = client.stk_push(phone_number, amount, account_ref, desc)
        if result.get("status") == "SUCCESS":
            review.invoice_id = result.get("invoice")
            review.save(update_fields=['invoice_id'])
        return result

    @staticmethod
    def handle_payment_callback(invoice_id):
        try:
            review = ScholarshipReview.objects.get(invoice_id=invoice_id)
            if review.status == ScholarshipReviewStatus.PENDING.value:
                review.status = ScholarshipReviewStatus.PAID.value
                review.save(update_fields=['status'])
            return review
        except ScholarshipReview.DoesNotExist:
            return None

    @staticmethod
    def get_review_queryset(user=None):
        qs = ScholarshipReview.objects.select_related('student', 'opportunity')
        if user and not user.is_staff:
            qs = qs.filter(student=user)
        return qs.order_by('-created_at')