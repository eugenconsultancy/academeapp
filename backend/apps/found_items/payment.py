import logging
from django.conf import settings

logger = logging.getLogger(__name__)

# Attempt to import necessary IntaSend components
try:
    import intasend
    from intasend import APIService, Collect, Transfer
except ImportError:
    intasend = None
    APIService = Collect = Transfer = None

class MpesaClient:
    def __init__(self):
        if intasend is None:
            self.service = None
            logger.error("intasend-python is not installed. Payment features are disabled.")
            return

        # Prepare credentials
        api_key = settings.INTASEND_SECRET_KEY
        publishable_key = settings.INTASEND_PUBLISHABLE_KEY
        
        try:
            # Initialize the API Service
            self.service = APIService(
                token=api_key,
                publishable_key=publishable_key,
                is_test=not settings.DEBUG
            )
        except Exception as e:
            logger.error(f"Failed to initialize IntaSend service: {e}")
            self.service = None

    def _ensure_service(self):
        if intasend is None:
            return {"status": "FAILED", "error": "Payment service unavailable: intasend not installed."}
        if self.service is None:
            return {"status": "FAILED", "error": "Payment service not initialized."}
        return None

    @staticmethod
    def _normalise_phone(phone_number):
        """Normalizes phone numbers to 254XXXXXXXXX format."""
        phone = str(phone_number).strip().replace('+', '')
        if phone.startswith('0'):
            phone = f"254{phone[1:]}"
        elif phone.startswith('7') or phone.startswith('1'):
            phone = f"254{phone}"
        return phone

    def stk_push(self, phone_number, amount, account_reference, transaction_desc):
        error = self._ensure_service()
        if error:
            return error

        phone = self._normalise_phone(phone_number)
        try:
            collector = Collect(service=self.service)
            response = collector.mpesa_stk_push(
                phone_number=phone,
                amount=int(amount),
                narrative=transaction_desc[:20]
            )
            
            # Extract invoice_id safely
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
        error = self._ensure_service()
        if error:
            return error

        phone = self._normalise_phone(phone_number)
        try:
            dispatcher = Transfer(service=self.service)
            transactions = [{"account": phone, "amount": str(amount), "narrative": occasion[:20]}]
            response = dispatcher.mpesa(currency="KES", transactions=transactions)
            
            tracking_id = response.get("tracking_id") if isinstance(response, dict) else getattr(response, 'tracking_id', None)
            return {"status": "SUCCESS", "tracking_id": tracking_id, "raw_response": response}
        except Exception as e:
            logger.error(f"B2C Disbursement failure: {e}")
            return {"status": "FAILED", "error": str(e)}