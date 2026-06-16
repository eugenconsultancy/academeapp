# backend/common/utils.py
"""
Common utility functions for the Academe platform.
"""

import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def normalize_phone_number(phone: Optional[str]) -> str:
    """
    Convert phone number to international format +254XXXXXXXXX.
    
    Accepts:
        - +254702496196 (already international)
        - 0702496196 (leading zero)
        - 0108038898 (leading zero, newer prefix)
        - 702496196 (no prefix, 9 digits)
        - +254 702 496 196 (spaces)
        - +254-702-496-196 (dashes)
    
    Args:
        phone: Phone number string in any common format
    
    Returns:
        Normalized phone number in +254XXXXXXXXX format,
        or original input if normalization fails
    
    Examples:
        >>> normalize_phone_number('0702496196')
        '+254702496196'
        >>> normalize_phone_number('702496196')
        '+254702496196'
        >>> normalize_phone_number('+254702496196')
        '+254702496196'
    """
    if not phone or not isinstance(phone, str):
        logger.debug(f"Invalid phone input: {phone}")
        return phone or ''
    
    # Strip whitespace
    phone = phone.strip()
    
    # Remove all non-digit characters except the first '+' if present
    if phone.startswith('+'):
        cleaned = '+' + re.sub(r'[^\d]', '', phone[1:])
    else:
        cleaned = re.sub(r'[^\d]', '', phone)
    
    # Already international format
    if cleaned.startswith('+254'):
        digits = cleaned[4:]  # Remove +254
        if len(digits) == 9 and digits.isdigit():
            return f'+254{digits}'
        elif len(digits) > 9:
            # Truncate to 9 digits with warning
            truncated = digits[:9]
            logger.warning(
                f"Phone number too long after +254: {phone} -> +254{truncated}"
            )
            return f'+254{truncated}'
        else:
            logger.warning(f"Phone number too short after +254: {phone}")
            return phone
    
    # Other international format - return as-is (unknown country)
    if cleaned.startswith('+'):
        return cleaned
    
    # Local Kenyan format: 07xx or 01xx (leading zero)
    if cleaned.startswith('0') and len(cleaned) == 10:
        return '+254' + cleaned[1:]
    
    # 9-digit number without prefix (e.g., 702496196)
    if len(cleaned) == 9 and cleaned.isdigit():
        return '+254' + cleaned
    
    # Local format with 1 prefix (e.g., 108038898 -> 0108038898)
    if cleaned.startswith('1') and len(cleaned) == 10:
        return '+254' + cleaned
    
    logger.debug(f"Could not normalize phone number: {phone}")
    return phone  # Fallback: return original input


def is_valid_kenyan_phone(phone: Optional[str]) -> bool:
    """
    Check if phone number is a valid Kenyan number after normalization.
    
    Valid Kenyan numbers have:
    - Country code +254
    - 9 digits after country code
    - First digit after country code is 1-9
    
    Args:
        phone: Phone number string to validate
    
    Returns:
        True if valid Kenyan phone number, False otherwise
    
    Examples:
        >>> is_valid_kenyan_phone('+254702496196')
        True
        >>> is_valid_kenyan_phone('0702496196')
        True
        >>> is_valid_kenyan_phone('+12345678901')
        False
        >>> is_valid_kenyan_phone('')
        False
        >>> is_valid_kenyan_phone(None)
        False
    """
    if not phone:
        return False
    
    normalized = normalize_phone_number(phone)
    
    # Must be exactly 13 characters: +254 + 9 digits
    if len(normalized) != 13:
        return False
    
    # Must match pattern: +254 followed by 9 digits, first digit 1-9
    return bool(re.match(r'^\+254[1-9]\d{8}$', normalized))