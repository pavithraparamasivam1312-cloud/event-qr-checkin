import uuid
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from events.models import Event, Attendee, Ticket, ScannerStaff, CheckInTimestamp
from events.security import generate_ticket_token, generate_qr_data_uri


class Command(BaseCommand):
    help = 'Seeds initial sample events, staff, attendees, and tickets with cryptographic QR codes'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting database seed...'))

        # 1. Create Events
        now = timezone.now()

        event1, _ = Event.objects.get_or_create(
            event_name="Annual Hackathon & Codefest 2026",
            defaults={
                'description': "48-hour flagship hackathon bringing together top engineering minds to build AI and web solutions.",
                'date': now + timedelta(days=1, hours=2),
                'venue': "Main Auditorium & Innovation Hub, Tech Campus",
                'capacity': 150,
                'status': "ACTIVE",
            }
        )

        event2, _ = Event.objects.get_or_create(
            event_name="AI & Neural Systems Masterclass",
            defaults={
                'description': "Hands-on deep learning and transformer architecture workshop led by industry researchers.",
                'date': now + timedelta(days=3, hours=4),
                'venue': "Hall B, Advanced Science Complex",
                'capacity': 80,
                'status': "UPCOMING",
            }
        )

        event3, _ = Event.objects.get_or_create(
            event_name="Global Cloud & DevOps Summit",
            defaults={
                'description': "Exploring microservices, Kubernetes orchestration, and cloud native CI/CD pipelines.",
                'date': now + timedelta(days=10),
                'venue': "Grand Convention Center, Tower 3",
                'capacity': 250,
                'status': "UPCOMING",
            }
        )

        self.stdout.write(self.style.SUCCESS('Events created.'))

        # 2. Create Staff & Admin
        admin, _ = ScannerStaff.objects.get_or_create(
            email="admin@eventqr.com",
            defaults={
                'name': "Sarah Connor (Lead Organizer)",
                'role': "ADMIN",
                'is_active': True,
            }
        )
        admin.set_password("Admin@123")
        admin.save()

        staff1, _ = ScannerStaff.objects.get_or_create(
            email="staff@eventqr.com",
            defaults={
                'name': "John Doe (Entrance Staff)",
                'role': "STAFF",
                'assigned_event': event1,
                'is_active': True,
            }
        )
        staff1.set_password("Staff@123")
        staff1.save()

        staff2, _ = ScannerStaff.objects.get_or_create(
            email="alex.scanner@eventqr.com",
            defaults={
                'name': "Alex Vance (Staff Gate 2)",
                'role': "STAFF",
                'assigned_event': event2,
                'is_active': True,
            }
        )
        staff2.set_password("Staff@123")
        staff2.save()

        self.stdout.write(self.style.SUCCESS('Staff accounts created.'))

        # 3. Create Attendees
        sample_attendees_data = [
            {"name": "Priya Sharma", "email": "priya.s@mit.edu", "phone": "+1 415-555-0101", "college": "MIT Engineering"},
            {"name": "Marcus Aurelius", "email": "marcus.a@stanford.edu", "phone": "+1 650-555-0122", "college": "Stanford University"},
            {"name": "Aarav Patel", "email": "aarav.patel@iitd.ac.in", "phone": "+91 98765-43210", "college": "IIT Delhi"},
            {"name": "Elena Rostova", "email": "elena.r@berkeley.edu", "phone": "+1 510-555-0199", "college": "UC Berkeley"},
            {"name": "Liam Chen", "email": "liam.chen@ox.ac.uk", "phone": "+44 7700-900077", "college": "University of Oxford"},
            {"name": "Sophia Rodriguez", "email": "sophia.r@cmu.edu", "phone": "+1 412-555-0144", "college": "Carnegie Mellon University"},
            {"name": "David Kim", "email": "david.k@ucla.edu", "phone": "+1 310-555-0188", "college": "UCLA"},
            {"name": "Ananya Gupta", "email": "ananya.g@iitb.ac.in", "phone": "+91 98111-22334", "college": "IIT Bombay"},
        ]

        attendees = []
        for att_data in sample_attendees_data:
            att, _ = Attendee.objects.get_or_create(
                email=att_data["email"],
                defaults=att_data
            )
            attendees.append(att)

        self.stdout.write(self.style.SUCCESS('Attendees created.'))

        # 4. Create Tickets for Hackathon (event1)
        for i, attendee in enumerate(attendees):
            if not Ticket.objects.filter(attendee=attendee, event=event1).exists():
                tkt_id = uuid.uuid4()
                raw_token, token_hash, sig, qr_payload = generate_ticket_token(tkt_id, event1.event_id)
                qr_img = generate_qr_data_uri(qr_payload)

                # Set first 2 attendees as already checked in to demonstrate used tickets
                is_checked_in = (i < 2)

                ticket = Ticket.objects.create(
                    ticket_id=tkt_id,
                    attendee=attendee,
                    event=event1,
                    unique_token_hash=token_hash,
                    qr_payload=qr_payload,
                    qr_code_image=qr_img,
                    expiry_date=event1.date + timedelta(days=2),
                    is_used=is_checked_in,
                )

                if is_checked_in:
                    CheckInTimestamp.objects.create(
                        ticket=ticket,
                        event=event1,
                        scanner_staff=staff1,
                        validation_status='SUCCESS',
                        notes="Sample checked-in attendee during entrance rush",
                    )

        # Create 2 tickets for Workshop (event2)
        for attendee in attendees[2:5]:
            if not Ticket.objects.filter(attendee=attendee, event=event2).exists():
                tkt_id = uuid.uuid4()
                raw_token, token_hash, sig, qr_payload = generate_ticket_token(tkt_id, event2.event_id)
                qr_img = generate_qr_data_uri(qr_payload)

                Ticket.objects.create(
                    ticket_id=tkt_id,
                    attendee=attendee,
                    event=event2,
                    unique_token_hash=token_hash,
                    qr_payload=qr_payload,
                    qr_code_image=qr_img,
                    expiry_date=event2.date + timedelta(days=2),
                    is_used=False,
                )

        self.stdout.write(self.style.SUCCESS('Cryptographic QR tickets successfully created!'))
        self.stdout.write(self.style.SUCCESS('Admin login: admin@eventqr.com / Admin@123'))
        self.stdout.write(self.style.SUCCESS('Staff login: staff@eventqr.com / Staff@123'))
