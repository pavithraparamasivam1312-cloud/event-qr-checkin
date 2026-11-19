import uuid
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from events.models import Event, Attendee, Ticket, ScannerStaff, CheckInTimestamp
from events.security import generate_ticket_token, generate_qr_data_uri


class EventQRCheckInTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        now = timezone.now()

        self.event_a = Event.objects.create(
            event_name="Dev Summit 2026",
            description="Testing Event A",
            date=now + timedelta(days=2),
            venue="Hall 1",
            capacity=100,
            status="ACTIVE",
        )

        self.event_b = Event.objects.create(
            event_name="AI Workshop 2026",
            description="Testing Event B",
            date=now + timedelta(days=5),
            venue="Lab 4",
            capacity=50,
            status="UPCOMING",
        )

        self.staff = ScannerStaff.objects.create(
            name="Gatekeeper Sam",
            email="sam@test.com",
            role="STAFF",
            assigned_event=self.event_a,
        )
        self.staff.set_password("Secret@123")
        self.staff.save()

    def test_attendee_registration_creates_crypto_qr_ticket(self):
        payload = {
            'event_id': str(self.event_a.event_id),
            'name': 'Johnathan Doe',
            'email': 'johnathan@university.edu',
            'phone': '123-456-7890',
            'college': 'Stanford University',
        }
        response = self.client.post('/api/register/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('ticket', response.data)
        ticket_data = response.data['ticket']
        self.assertTrue(ticket_data['qr_payload'].startswith('EQR-V1::'))
        self.assertTrue(ticket_data['qr_code_image'].startswith('data:image/png;base64,'))

    def test_duplicate_registration_returns_existing_ticket(self):
        payload = {
            'event_id': str(self.event_a.event_id),
            'name': 'Duplicate Tester',
            'email': 'dup@test.com',
            'phone': '111-222-3333',
            'college': 'MIT',
        }
        res1 = self.client.post('/api/register/', payload, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        res2 = self.client.post('/api/register/', payload, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertTrue(res2.data.get('already_registered'))
        self.assertEqual(res1.data['ticket']['ticket_id'], res2.data['ticket']['ticket_id'])

    def test_successful_checkin_and_reused_ticket_rejection(self):
        # Register attendee
        reg_res = self.client.post('/api/register/', {
            'event_id': str(self.event_a.event_id),
            'name': 'Single Use Tester',
            'email': 'singleuse@test.com',
            'phone': '555-000-1111',
            'college': 'Berkeley',
        }, format='json')
        qr_payload = reg_res.data['ticket']['qr_payload']

        # Scan 1: First scan should be SUCCESS (Green)
        scan1_res = self.client.post('/api/checkin/validate/', {
            'qr_data': qr_payload,
            'event_id': str(self.event_a.event_id),
        }, format='json')

        self.assertEqual(scan1_res.status_code, status.HTTP_200_OK)
        self.assertEqual(scan1_res.data['status'], 'SUCCESS')
        self.assertEqual(scan1_res.data['color'], 'green')

        # Verify DB is_used is now True
        tkt = Ticket.objects.get(ticket_id=reg_res.data['ticket']['ticket_id'])
        self.assertTrue(tkt.is_used)

        # Scan 2: Second scan with SAME QR code must be REJECTED (Red - ALREADY_USED)
        scan2_res = self.client.post('/api/checkin/validate/', {
            'qr_data': qr_payload,
            'event_id': str(self.event_a.event_id),
        }, format='json')

        self.assertEqual(scan2_res.status_code, status.HTTP_200_OK)
        self.assertEqual(scan2_res.data['status'], 'ALREADY_USED')
        self.assertEqual(scan2_res.data['color'], 'red')

    def test_wrong_event_ticket_rejection(self):
        # Register for Event B
        reg_res = self.client.post('/api/register/', {
            'event_id': str(self.event_b.event_id),
            'name': 'Wrong Event Tester',
            'email': 'wrong@test.com',
            'phone': '999-888-7777',
            'college': 'CMU',
        }, format='json')
        qr_payload = reg_res.data['ticket']['qr_payload']

        # Scan at Event A entrance
        scan_res = self.client.post('/api/checkin/validate/', {
            'qr_data': qr_payload,
            'event_id': str(self.event_a.event_id),
        }, format='json')

        self.assertEqual(scan_res.status_code, status.HTTP_200_OK)
        self.assertEqual(scan_res.data['status'], 'INVALID_EVENT')
        self.assertEqual(scan_res.data['color'], 'yellow')

    def test_tampered_qr_code_rejection(self):
        tampered_qr = "EQR-V1::fake-ticket-uuid::fake-event::fake-secret::fake-signature"
        scan_res = self.client.post('/api/checkin/validate/', {
            'qr_data': tampered_qr,
            'event_id': str(self.event_a.event_id),
        }, format='json')

        self.assertEqual(scan_res.status_code, status.HTTP_200_OK)
        self.assertEqual(scan_res.data['status'], 'INVALID_TOKEN')
        self.assertEqual(scan_res.data['color'], 'red')
