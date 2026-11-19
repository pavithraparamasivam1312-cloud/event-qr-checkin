import os
import sys
import django
import json

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from rest_framework.test import APIClient
from events.models import Event, Attendee, Ticket, ScannerStaff, CheckInTimestamp
from events.security import generate_ticket_token, parse_and_verify_qr_payload

print("=" * 70)
print("RUNNING COMPLETE END-TO-END VERIFICATION")
print("=" * 70)

client = APIClient()

# 1. Test Server Root / React App Serving
res = client.get('/')
assert res.status_code == 200, f"Expected 200, got {res.status_code}"
assert "<!doctype html>" in res.content.decode('utf-8').lower(), "Expected React HTML"
print("✓ [1/8] React App SPA is served at root (/) successfully")

# 2. Test Staff / Admin Login
login_res = client.post('/api/auth/login/', {
    'email': 'admin@eventqr.com',
    'password': 'Admin@123'
}, format='json')
assert login_res.status_code == 200, f"Login failed: {login_res.data}"
token = login_res.data['token']
client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
print(f"✓ [2/8] Staff authentication succeeded (Logged in as {login_res.data['user']['name']})")

# 3. Test Event Listing
events_res = client.get('/api/events/')
assert events_res.status_code == 200
events = events_res.data
assert len(events) >= 2, "Expected at least 2 seeded events"
target_event = events[0]
event_id = target_event['event_id']
print(f"✓ [3/8] Events list verified ({len(events)} events active, target: '{target_event['event_name']}')")

# 4. Test Attendee Registration with Cryptographic QR Token
reg_res = client.post('/api/register/', {
    'event_id': event_id,
    'name': 'Kavya Subramanian',
    'email': 'kavya.subramanian@college.edu',
    'phone': '+1 555-888-9900',
    'college': 'Georgia Tech',
}, format='json')
assert reg_res.status_code == 201, f"Registration failed: {reg_res.data}"
ticket_data = reg_res.data['ticket']
qr_payload = ticket_data['qr_payload']
ticket_id = ticket_data['ticket_id']
assert qr_payload.startswith('EQR-V1::'), "Invalid QR schema"
assert ticket_data['qr_code_image'].startswith('data:image/png;base64,'), "Invalid QR base64 image"
print(f"✓ [4/8] Cryptographic QR ticket created for {ticket_data['attendee']['name']} (Ticket ID: {ticket_id})")

# Verify cryptographic signature verification
is_valid, parsed, code = parse_and_verify_qr_payload(qr_payload)
assert is_valid is True, f"Failed cryptographic signature verification: {parsed}"
print("✓ Cryptographic HMAC signature and SHA-256 token verified")

# 5. Test Check-In: First Scan (GREEN - SUCCESS)
scan1 = client.post('/api/checkin/validate/', {
    'qr_data': qr_payload,
    'event_id': event_id,
}, format='json')
assert scan1.status_code == 200
assert scan1.data['status'] == 'SUCCESS', f"Expected SUCCESS, got {scan1.data['status']}"
assert scan1.data['color'] == 'green'
print(f"✓ [5/8] Green Check-In Successful: {scan1.data['message']}")

# 6. Test Check-In: Re-scan SAME Ticket (RED - ALREADY_USED)
scan2 = client.post('/api/checkin/validate/', {
    'qr_data': qr_payload,
    'event_id': event_id,
}, format='json')
assert scan2.status_code == 200
assert scan2.data['status'] == 'ALREADY_USED', f"Expected ALREADY_USED, got {scan2.data['status']}"
assert scan2.data['color'] == 'red'
print(f"✓ [6/8] Red Re-scan Rejection: {scan2.data['message']}")

# 7. Test Check-In: Wrong Event Ticket (YELLOW - INVALID_EVENT)
other_event = events[1]
scan_wrong_event = client.post('/api/checkin/validate/', {
    'qr_data': qr_payload,
    'event_id': other_event['event_id'],
}, format='json')
assert scan_wrong_event.status_code == 200
assert scan_wrong_event.data['status'] == 'INVALID_EVENT', f"Expected INVALID_EVENT, got {scan_wrong_event.data['status']}"
assert scan_wrong_event.data['color'] == 'yellow'
print(f"✓ [7/8] Yellow Wrong Event Warning: {scan_wrong_event.data['message']}")

# 8. Test Analytics & Audit Trail
analytics_res = client.get('/api/analytics/')
assert analytics_res.status_code == 200
ov = analytics_res.data['overview']
assert ov['total_registered'] > 0
assert ov['total_checked_in'] > 0
print(f"✓ [8/8] Live Analytics Verified: {ov['total_registered']} registered, {ov['total_checked_in']} checked in ({ov['attendance_rate']}%)")

print("=" * 70)
print("ALL END-TO-END TESTS PASSED PERFECTLY!")
print("=" * 70)
