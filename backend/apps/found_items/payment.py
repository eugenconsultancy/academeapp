import logging
import intasend
from django.conf import settings

logger = logging.getLogger(__name__)

class MpesaClient:
    def __init__(self):
        raw_token = settings.INTASEND_SECRET_KEY
        if raw_token and not raw_token.startswith("Bearer "):
            self.token = f"Bearer {raw_token}"
        else:
            self.token = raw_token
        self.publishable_key = settings.INTASEND_PUBLISHABLE_KEY
        self.service = intasend.APIService(
            token=self.token,
            publishable_key=self.publishable_key
        )
    
    def stk_push(self, phone_number, amount, account_reference, transaction_desc):
        phone = phone_number.replace('+254', '254').replace('0', '254', 1)
        if (phone.startswith('7') or phone.startswith('1')) and len(phone) == 9:
            phone = f"254{phone}"
        try:
            collector = intasend.Collect(service=self.service)
            response = collector.mpesa_stk_push(
                phone_number=phone,
                amount=int(amount),
                narrative=transaction_desc[:20]
            )
            invoice_id = None
            if isinstance(response, dict):
                invoice_id = response.get("invoice", {}).get("invoice_id")
            else:
                invoice_data = getattr(response, 'invoice', {})
                invoice_id = invoice_data.get("invoice_id") if isinstance(invoice_data, dict) else getattr(invoice_data, 'invoice_id', None)
            return {"status": "SUCCESS", "invoice": invoice_id, "ResponseCode": "0", "raw_response": response}
        except Exception as e:
            logger.error(f"STK Push failure: {e}")
            return {"status": "FAILED", "ResponseCode": "1", "error": str(e)}
            
    def b2c_disbursement(self, phone_number, amount, occasion):
        phone = phone_number.replace('+254', '254').replace('0', '254', 1)
        if (phone.startswith('7') or phone.startswith('1')) and len(phone) == 9:
            phone = f"254{phone}"
        try:
            dispatcher = intasend.Transfer(service=self.service)
            transactions = [{"account": phone, "amount": str(amount), "narrative": occasion[:20]}]
            response = dispatcher.mpesa(currency="KES", transactions=transactions)
            tracking_id = response.get("tracking_id") if isinstance(response, dict) else getattr(response, 'tracking_id', None)
            return {"status": "SUCCESS", "tracking_id": tracking_id, "raw_response": response}
        except Exception as e:
            logger.error(f"B2C Disbursement failure: {e}")
            return {"status": "FAILED", "error": str(e)}