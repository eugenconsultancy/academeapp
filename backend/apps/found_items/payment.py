import logging
import intasend
from django.conf import settings

logger = logging.getLogger(__name__)

class MpesaClient:
    def __init__(self):
        """
        Initializes the IntaSend APIService gateway using settings tokens.
        The SDK dynamically handles routing based on credential signatures.
        """
        raw_token = settings.INTASEND_SECRET_KEY
        
        # Enforce 'Bearer ' schema string alignment natively if missing
        if raw_token and not raw_token.startswith("Bearer "):
            self.token = f"Bearer {raw_token}"
        else:
            self.token = raw_token

        self.publishable_key = settings.INTASEND_PUBLISHABLE_KEY
        
        # Verified official entry class from package inspection
        self.service = intasend.APIService(
            token=self.token, 
            publishable_key=self.publishable_key
        )
    
    def stk_push(self, phone_number, amount, account_reference, transaction_desc):
        """
        Initiates an automated IntaSend M-Pesa STK Push collection transaction.
        """
        # Ensure proper telephone schema serialization (254XXXXXXXXX)
        phone = phone_number.replace('+254', '254').replace('0', '254', 1)
        if (phone.startswith('7') or phone.startswith('1')) and len(phone) == 9:
            phone = f"254{phone}"

        try:
            # Instantiate the verified Collect class directly via the service engine
            collector = intasend.Collect(service=self.service)
            response = collector.mpesa_stk_push(
                phone_number=phone,
                amount=int(amount),
                narrative=transaction_desc[:20]
            )
            
            # Extract tracking fields cleanly based on returned SDK types
            invoice_id = None
            if isinstance(response, dict):
                invoice_id = response.get("invoice", {}).get("invoice_id")
            else:
                invoice_data = getattr(response, 'invoice', {})
                invoice_id = invoice_data.get("invoice_id") if isinstance(invoice_data, dict) else getattr(invoice_data, 'invoice_id', None)

            return {
                "status": "SUCCESS",
                "invoice": invoice_id,
                "ResponseCode": "0",
                "raw_response": response
            }
        except Exception as e:
            logger.error(f"IntaSend STK Push Request Execution Failure: {str(e)}")
            return {
                "status": "FAILED",
                "ResponseCode": "1",
                "error": str(e)
            }
            
    def b2c_disbursement(self, phone_number, amount, occasion):
        """
        Triggers an instant automated B2C payout request via mobile wallet.
        """
        phone = phone_number.replace('+254', '254').replace('0', '254', 1)
        if (phone.startswith('7') or phone.startswith('1')) and len(phone) == 9:
            phone = f"254{phone}"

        try:
            # Instantiate the verified Transfer class directly via the service engine
            dispatcher = intasend.Transfer(service=self.service)
            transactions = [
                {
                    "account": phone,
                    "amount": str(amount),
                    "narrative": occasion[:20]
                }
            ]
            
            response = dispatcher.mpesa(
                currency="KES",
                transactions=transactions
            )
            
            tracking_id = response.get("tracking_id") if isinstance(response, dict) else getattr(response, 'tracking_id', None)
            
            return {
                "status": "SUCCESS",
                "tracking_id": tracking_id,
                "raw_response": response
            }
        except Exception as e:
            logger.error(f"IntaSend B2C Disbursal Engine Failure: {str(e)}")
            return {
                "status": "FAILED",
                "error": str(e)
            }