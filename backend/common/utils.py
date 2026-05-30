import re

def normalize_phone_number(phone: str) -> str:
    """
    Convert phone number to international format +254XXXXXXXXX.
    Accepts: +254702496196, 0702496196, 0108038898, 702496196
    """
    # Remove all non-digit characters except leading '+'
    cleaned = re.sub(r'[^\d+]', '', phone)
    if cleaned.startswith('+'):
        if cleaned.startswith('+254'):
            return cleaned[:13]  # +254XXXXXXXXX
        else:
            return cleaned  # unknown country code, keep as is
    # Local format: starts with 0 or 1? Kenyan numbers: 07xx, 01xx
    if cleaned.startswith('0'):
        return '+254' + cleaned[1:]
    if cleaned.startswith('1') and len(cleaned) == 10:
        return '+254' + cleaned
    if len(cleaned) == 9:
        return '+254' + cleaned
    return phone  # fallback

def is_valid_kenyan_phone(phone: str) -> bool:
    """Check if phone number is a valid Kenyan number after normalisation."""
    normalized = normalize_phone_number(phone)
    return bool(re.match(r'^\+254[1-9]\d{8}$', normalized))