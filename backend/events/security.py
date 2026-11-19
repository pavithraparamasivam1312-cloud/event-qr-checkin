import hmac
import hashlib
import secrets
import base64
import io
import jwt
from datetime import datetime, timedelta, timezone
from django.conf import settings
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
from qrcode.image.styles.colormasks import SolidFillColorMask


def get_secret_key():
    return getattr(settings, 'SECRET_KEY', 'default-event-qr-checkin-secret-2026')


def generate_ticket_token(ticket_id, event_id):
    """
    Generates:
    - raw_token: 32-byte cryptographic random token
    - token_hash: SHA-256 hex digest of raw_token (stored securely in DB)
    - signature: HMAC-SHA256 signature of (ticket_id + event_id + raw_token)
    - qr_payload: Formatted structured payload for QR representation:
      "EQR-V1::<ticket_id>::<event_id>::<raw_token>::<signature>"
    """
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

    secret = get_secret_key().encode('utf-8')
    data_to_sign = f"{ticket_id}:{event_id}:{raw_token}".encode('utf-8')
    signature = hmac.new(secret, data_to_sign, hashlib.sha256).hexdigest()

    qr_payload = f"EQR-V1::{ticket_id}::{event_id}::{raw_token}::{signature}"
    return raw_token, token_hash, signature, qr_payload


def parse_and_verify_qr_payload(qr_string):
    """
    Parses QR string and checks HMAC signature before querying DB.
    Returns:
    (is_valid, parsed_data_or_error, status_code_enum)
    """
    if not qr_string or not isinstance(qr_string, str):
        return False, "Empty or invalid QR code format", "INVALID_TOKEN"

    parts = qr_string.strip().split("::")
    if len(parts) != 5 or parts[0] != "EQR-V1":
        # Check if raw token or ticket ID was entered manually as fallback
        return False, "Unrecognized QR code schema", "INVALID_TOKEN"

    _, ticket_id, event_id, raw_token, signature = parts

    secret = get_secret_key().encode('utf-8')
    data_to_sign = f"{ticket_id}:{event_id}:{raw_token}".encode('utf-8')
    expected_sig = hmac.new(secret, data_to_sign, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(signature, expected_sig):
        return False, "Tampered or forged ticket signature", "INVALID_TOKEN"

    computed_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

    return True, {
        "ticket_id": ticket_id,
        "event_id": event_id,
        "raw_token": raw_token,
        "token_hash": computed_hash,
    }, "SUCCESS"


def generate_qr_data_uri(payload):
    """
    Renders QR code using qrcode and returns a data:image/png;base64 string.
    """
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=3,
    )
    qr.add_data(payload)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#1E1B4B", back_color="#FFFFFF")
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    b64_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"


# Role-Based JWT Auth Helpers
def create_access_token(user_data, expires_in_hours=24):
    payload = {
        'sub': str(user_data.get('staff_id')),
        'email': user_data.get('email'),
        'name': user_data.get('name'),
        'role': user_data.get('role', 'STAFF'),
        'assigned_event_id': str(user_data.get('assigned_event_id')) if user_data.get('assigned_event_id') else None,
        'exp': datetime.now(timezone.utc) + timedelta(hours=expires_in_hours),
        'iat': datetime.now(timezone.utc),
    }
    return jwt.encode(payload, get_secret_key(), algorithm='HS256')


def decode_access_token(token):
    try:
        payload = jwt.decode(token, get_secret_key(), algorithms=['HS256'])
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None
