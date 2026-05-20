import requests
import base64
from datetime import datetime
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class MpesaClient:
    def __init__(self):
        self.consumer_key = settings.MPESA_CONSUMER_KEY
        self.consumer_secret = settings.MPESA_CONSUMER_SECRET
        self.passkey = settings.MPESA_PASSKEY
        self.shortcode = settings.MPESA_SHORTCODE
        self.base_url = (
            'https://sandbox.safaricom.co.ke'
            if settings.MPESA_ENVIRONMENT == 'sandbox'
            else 'https://api.safaricom.co.ke'
        )
    
    def _get_access_token(self):
        """Get OAuth access token"""
        auth = base64.b64encode(
            f"{self.consumer_key}:{self.consumer_secret}".encode()
        ).decode()
        
        response = requests.get(
            f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials",
            headers={'Authorization': f'Basic {auth}'}
        )
        
        return response.json().get('access_token')
    
    def stk_push(self, phone_number, amount, account_reference, transaction_desc):
        """Initiate STK Push"""
        token = self._get_access_token()
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(
            f"{self.shortcode}{self.passkey}{timestamp}".encode()
        ).decode()
        
        # Format phone number (remove +254 or 0)
        phone = phone_number.replace('+254', '254').replace('0', '254', 1)
        
        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount,
            "PartyA": phone,
            "PartyB": self.shortcode,
            "PhoneNumber": phone,
            "CallBackURL": f"{settings.BACKEND_URL}/api/found-items/payment-callback/",
            "AccountReference": account_reference[:12],
            "TransactionDesc": transaction_desc[:13]
        }
        
        response = requests.post(
            f"{self.base_url}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={'Authorization': f'Bearer {token}'}
        )
        
        return response.json()
    
    def b2c_disbursement(self, phone_number, amount, occasion):
        """Initiate B2C disbursement"""
        token = self._get_access_token()
        
        phone = phone_number.replace('+254', '254').replace('0', '254', 1)
        
        payload = {
            "InitiatorName": "testapi",
            "SecurityCredential": "your-security-credential",
            "CommandID": "BusinessPayment",
            "Amount": str(amount),
            "PartyA": self.shortcode,
            "PartyB": phone,
            "Remarks": occasion[:100],
            "QueueTimeOutURL": f"{settings.BACKEND_URL}/api/found-items/queue-timeout/",
            "ResultURL": f"{settings.BACKEND_URL}/api/found-items/b2c-result/",
            "Occasion": occasion[:100]
        }
        
        response = requests.post(
            f"{self.base_url}/mpesa/b2c/v1/paymentrequest",
            json=payload,
            headers={'Authorization': f'Bearer {token}'}
        )
        
        return response.json()