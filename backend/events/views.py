import uuid
from datetime import datetime, timedelta, timezone as dt_timezone
from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .models import Event, Attendee, Ticket, ScannerStaff, CheckInTimestamp, BadgePrint
from .serializers import (
    EventSerializer,
    AttendeeSerializer,
    TicketSerializer,
    AttendeeRegistrationSerializer,
    ScannerStaffSerializer,
    CheckInTimestampSerializer,
    BadgePrintSerializer,
)
from .security import (
    generate_ticket_token,
    parse_and_verify_qr_payload,
    generate_qr_data_uri,
    create_access_token,
    decode_access_token,
)


def get_authenticated_staff(request):
    """Extract staff from Authorization Bearer token header."""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        payload = decode_access_token(token)
        if payload and 'sub' in payload:
            return ScannerStaff.objects.filter(staff_id=payload['sub'], is_active=True).first()
    return None


class AuthLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')

        if not email or not password:
            return Response({'error': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        staff = ScannerStaff.objects.filter(email__iexact=email, is_active=True).first()
        if not staff or not staff.check_password(password):
            return Response({'error': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

        token = create_access_token({
            'staff_id': str(staff.staff_id),
            'email': staff.email,
            'name': staff.name,
            'role': staff.role,
            'assigned_event_id': str(staff.assigned_event.event_id) if staff.assigned_event else None,
        })

        return Response({
            'token': token,
            'user': {
                'staff_id': str(staff.staff_id),
                'name': staff.name,
                'email': staff.email,
                'role': staff.role,
                'assigned_event': EventSerializer(staff.assigned_event).data if staff.assigned_event else None,
            }
        })


class AuthSignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        name = request.data.get('name', '').strip()
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')
        role = request.data.get('role', 'ADMIN')

        if not name or not email or not password:
            return Response({'error': 'Name, email, and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if ScannerStaff.objects.filter(email__iexact=email).exists():
            return Response({'error': 'An account with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        staff = ScannerStaff(
            name=name,
            email=email,
            role=role if role in ['ADMIN', 'STAFF'] else 'ADMIN',
        )
        staff.set_password(password)
        staff.save()

        token = create_access_token({
            'staff_id': str(staff.staff_id),
            'email': staff.email,
            'name': staff.name,
            'role': staff.role,
            'assigned_event_id': None,
        })

        return Response({
            'token': token,
            'user': {
                'staff_id': str(staff.staff_id),
                'name': staff.name,
                'email': staff.email,
                'role': staff.role,
                'assigned_event': None,
            }
        }, status=status.HTTP_201_CREATED)


class AuthMeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        staff = get_authenticated_staff(request)
        if not staff:
            return Response({'error': 'Not authenticated.'}, status=status.HTTP_401_UNAUTHORIZED)

        return Response({
            'staff_id': str(staff.staff_id),
            'name': staff.name,
            'email': staff.email,
            'role': staff.role,
            'assigned_event': EventSerializer(staff.assigned_event).data if staff.assigned_event else None,
        })


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Event.objects.all()
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        return qs


class AttendeeRegistrationView(APIView):
    """
    Public registration endpoint.
    Registers attendee for an event, checks capacity, creates ticket with cryptographic QR.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AttendeeRegistrationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        event_id = data['event_id']

        event = get_object_or_404(Event, event_id=event_id)

        # Check capacity
        if event.tickets.count() >= event.capacity:
            return Response(
                {'error': f'Registration full! Event capacity of {event.capacity} has been reached.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create attendee
        attendee, _ = Attendee.objects.get_or_create(
            email=data['email'].strip().lower(),
            defaults={
                'name': data['name'].strip(),
                'phone': data['phone'].strip(),
                'college': data['college'].strip(),
            }
        )
        # Update details if existing attendee
        attendee.name = data['name'].strip()
        attendee.phone = data['phone'].strip()
        attendee.college = data['college'].strip()
        attendee.save()

        # Check if ticket already exists for this event
        existing_ticket = Ticket.objects.filter(attendee=attendee, event=event).first()
        if existing_ticket:
            return Response({
                'message': 'You are already registered for this event! Here is your digital QR ticket.',
                'ticket': TicketSerializer(existing_ticket).data,
                'already_registered': True,
            }, status=status.HTTP_200_OK)

        # Create new Ticket with cryptographic hash & QR
        new_ticket_id = uuid.uuid4()
        raw_token, token_hash, signature, qr_payload = generate_ticket_token(new_ticket_id, event.event_id)
        qr_image = generate_qr_data_uri(qr_payload)

        # Expiry is 24 hours after event date
        expiry = event.date + timedelta(days=1)

        ticket = Ticket.objects.create(
            ticket_id=new_ticket_id,
            attendee=attendee,
            event=event,
            unique_token_hash=token_hash,
            qr_payload=qr_payload,
            qr_code_image=qr_image,
            expiry_date=expiry,
            is_used=False,
        )

        return Response({
            'message': 'Registration successful! Your digital ticket is ready.',
            'ticket': TicketSerializer(ticket).data,
            'already_registered': False,
        }, status=status.HTTP_201_CREATED)


class TicketDetailView(APIView):
    """Lookup ticket by ticket_id or by email + event_id."""
    permission_classes = [AllowAny]

    def get(self, request, pk=None):
        if pk:
            ticket = get_object_or_404(Ticket, ticket_id=pk)
            return Response(TicketSerializer(ticket).data)

        email = request.query_params.get('email', '').strip().lower()
        event_id = request.query_params.get('event_id')

        if not email:
            return Response({'error': 'Email parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

        tickets = Ticket.objects.filter(attendee__email=email)
        if event_id:
            tickets = tickets.filter(event_id=event_id)

        ticket = tickets.first()
        if not ticket:
            return Response({'error': 'No ticket found with provided details.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(TicketSerializer(ticket).data)


class EventAttendeesListView(APIView):
    """List all registered attendees for a specific event."""
    permission_classes = [AllowAny]

    def get(self, request, event_id):
        event = get_object_or_404(Event, event_id=event_id)
        tickets = Ticket.objects.filter(event=event).select_related('attendee').order_by('-issued_at')
        return Response(TicketSerializer(tickets, many=True).data)


class ValidateCheckInView(APIView):
    """
    High-Security QR Ticket Check-In Endpoint.
    Enforces atomic database transaction with row-level locking (select_for_update)
    to strictly guarantee single-use check-in.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        qr_data = request.data.get('qr_data', '').strip()
        selected_event_id = request.data.get('event_id')
        staff = get_authenticated_staff(request)

        if not qr_data:
            return Response({
                'status': 'INVALID_TOKEN',
                'color': 'red',
                'title': 'Scan Error',
                'message': 'No QR code data provided.',
            }, status=status.HTTP_400_BAD_REQUEST)

        selected_event = None
        if selected_event_id:
            selected_event = Event.objects.filter(event_id=selected_event_id).first()

        # Step 1: Cryptographic Signature Verification
        is_valid_format, parsed_or_err, parse_status = parse_and_verify_qr_payload(qr_data)

        if not is_valid_format:
            # If standard schema didn't match, check if it's a fallback raw ticket_id
            potential_ticket = None
            try:
                potential_ticket = Ticket.objects.filter(ticket_id=qr_data).first()
            except Exception:
                pass

            if not potential_ticket:
                # Record failed scan attempt if event is known
                if selected_event:
                    CheckInTimestamp.objects.create(
                        event=selected_event,
                        scanner_staff=staff,
                        validation_status='INVALID_TOKEN',
                        notes=f"Failed parse: {parsed_or_err}",
                    )
                return Response({
                    'status': 'INVALID_TOKEN',
                    'color': 'red',
                    'title': 'Invalid Ticket',
                    'message': f'Cryptographic validation failed: {parsed_or_err}. The QR code is invalid or tampered.',
                }, status=status.HTTP_200_OK)

            # If found via ticket_id fallback:
            target_ticket_id = potential_ticket.ticket_id
            expected_hash = potential_ticket.unique_token_hash
        else:
            target_ticket_id = parsed_or_err['ticket_id']
            expected_hash = parsed_or_err['token_hash']

        # Step 2: Atomic Transaction with Row-Level Locking
        with transaction.atomic():
            try:
                # SELECT FOR UPDATE locks the ticket row until this transaction commits!
                ticket = (
                    Ticket.objects.select_for_update()
                    .select_related('attendee', 'event')
                    .get(ticket_id=target_ticket_id)
                )
            except Ticket.DoesNotExist:
                if selected_event:
                    CheckInTimestamp.objects.create(
                        event=selected_event,
                        scanner_staff=staff,
                        validation_status='INVALID_TOKEN',
                        notes=f"Ticket ID {target_ticket_id} not found in database",
                    )
                return Response({
                    'status': 'INVALID_TOKEN',
                    'color': 'red',
                    'title': 'Invalid Ticket',
                    'message': 'Ticket does not exist in the database.',
                }, status=status.HTTP_200_OK)

            # Step 3: Verify Token Hash Matches Database Hash
            if ticket.unique_token_hash != expected_hash:
                CheckInTimestamp.objects.create(
                    ticket=ticket,
                    event=ticket.event,
                    scanner_staff=staff,
                    validation_status='INVALID_TOKEN',
                    notes="Token hash mismatch with database",
                )
                return Response({
                    'status': 'INVALID_TOKEN',
                    'color': 'red',
                    'title': 'Invalid Ticket',
                    'message': 'Security token mismatch. Ticket cryptographic token is invalid.',
                }, status=status.HTTP_200_OK)

            # Step 4: Verify Event Match (Yellow)
            if selected_event and ticket.event_id != selected_event.event_id:
                CheckInTimestamp.objects.create(
                    ticket=ticket,
                    event=selected_event,
                    scanner_staff=staff,
                    validation_status='INVALID_EVENT',
                    notes=f"Ticket event '{ticket.event.event_name}' does not match scanner event '{selected_event.event_name}'",
                )
                return Response({
                    'status': 'INVALID_EVENT',
                    'color': 'yellow',
                    'title': 'Wrong Event Ticket',
                    'message': f"This ticket belongs to '{ticket.event.event_name}', not '{selected_event.event_name}'.",
                    'ticket_details': {
                        'attendee_name': ticket.attendee.name,
                        'attendee_college': ticket.attendee.college,
                        'ticket_event': ticket.event.event_name,
                        'scanner_event': selected_event.event_name,
                    }
                }, status=status.HTTP_200_OK)

            # Step 5: Check if Already Used (Red)
            if ticket.is_used:
                previous_checkin = (
                    CheckInTimestamp.objects.filter(ticket=ticket, validation_status='SUCCESS')
                    .order_by('-checkin_time')
                    .first()
                )
                prev_time_str = (
                    previous_checkin.checkin_time.strftime('%b %d, %Y at %I:%M %p')
                    if previous_checkin
                    else 'Earlier'
                )
                prev_staff = (
                    previous_checkin.scanner_staff.name
                    if previous_checkin and previous_checkin.scanner_staff
                    else 'Scanner Station'
                )

                # Record duplicate scan attempt
                CheckInTimestamp.objects.create(
                    ticket=ticket,
                    event=ticket.event,
                    scanner_staff=staff,
                    validation_status='ALREADY_USED',
                    notes=f"Re-scan rejected. First checked in at {prev_time_str} by {prev_staff}",
                )

                return Response({
                    'status': 'ALREADY_USED',
                    'color': 'red',
                    'title': 'Already Used Ticket',
                    'message': f"This ticket was already checked in on {prev_time_str} by {prev_staff}. Re-use is strictly prohibited.",
                    'attendee': {
                        'name': ticket.attendee.name,
                        'college': ticket.attendee.college,
                        'email': ticket.attendee.email,
                    },
                    'event_name': ticket.event.event_name,
                    'previous_checkin': {
                        'time': prev_time_str,
                        'staff': prev_staff,
                    }
                }, status=status.HTTP_200_OK)

            # Step 6: Check Expiry Date (Red)
            if ticket.expiry_date and timezone.now() > ticket.expiry_date:
                CheckInTimestamp.objects.create(
                    ticket=ticket,
                    event=ticket.event,
                    scanner_staff=staff,
                    validation_status='EXPIRED',
                    notes=f"Ticket expired on {ticket.expiry_date.strftime('%Y-%m-%d %H:%M')}",
                )
                return Response({
                    'status': 'EXPIRED',
                    'color': 'red',
                    'title': 'Expired Ticket',
                    'message': f"This ticket expired on {ticket.expiry_date.strftime('%b %d, %Y at %I:%M %p')}.",
                    'attendee': {
                        'name': ticket.attendee.name,
                        'college': ticket.attendee.college,
                    }
                }, status=status.HTTP_200_OK)

            # Step 7: SUCCESS! (Green) - Commit Single-Use Check-In
            ticket.is_used = True
            ticket.save(update_fields=['is_used'])

            checkin_record = CheckInTimestamp.objects.create(
                ticket=ticket,
                event=ticket.event,
                scanner_staff=staff,
                validation_status='SUCCESS',
                notes="Checked in successfully via camera QR scan",
            )

            now_str = checkin_record.checkin_time.strftime('%b %d, %Y at %I:%M:%S %p')

            return Response({
                'status': 'SUCCESS',
                'color': 'green',
                'title': 'Check-In Successful!',
                'message': f"Welcome, {ticket.attendee.name}! Ticket verified and checked in.",
                'attendee': {
                    'attendee_id': str(ticket.attendee.attendee_id),
                    'name': ticket.attendee.name,
                    'email': ticket.attendee.email,
                    'phone': ticket.attendee.phone,
                    'college': ticket.attendee.college,
                },
                'ticket': {
                    'ticket_id': str(ticket.ticket_id),
                    'issued_at': ticket.issued_at.strftime('%b %d, %Y'),
                },
                'event': {
                    'event_id': str(ticket.event.event_id),
                    'name': ticket.event.event_name,
                    'venue': ticket.event.venue,
                    'date': ticket.event.date.strftime('%b %d, %Y %I:%M %p'),
                },
                'checkin': {
                    'checkin_id': str(checkin_record.checkin_id),
                    'checkin_time': now_str,
                    'staff': staff.name if staff else 'Main Entrance Scanner',
                }
            }, status=status.HTTP_200_OK)


class AttendanceAnalyticsView(APIView):
    """
    Live Attendance Statistics and Analytics:
    - Global stats: total registered, total checked in, pending, overall percentage.
    - Event-wise breakdown.
    - Check-in hourly velocity / timeline.
    - College distribution.
    - Recent check-in activity stream.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        event_id = request.query_params.get('event_id')

        events_qs = Event.objects.all()
        if event_id:
            events_qs = events_qs.filter(event_id=event_id)

        total_registered = Ticket.objects.filter(event__in=events_qs).count()
        total_checked_in = Ticket.objects.filter(event__in=events_qs, is_used=True).count()
        total_pending = total_registered - total_checked_in
        attendance_rate = (
            round((total_checked_in / total_registered) * 100, 1) if total_registered > 0 else 0.0
        )

        # Event-wise stats
        events_breakdown = []
        for ev in Event.objects.all():
            reg = ev.registered_count
            chk = ev.checked_in_count
            rate = round((chk / reg) * 100, 1) if reg > 0 else 0.0
            events_breakdown.append({
                'event_id': str(ev.event_id),
                'event_name': ev.event_name,
                'venue': ev.venue,
                'date': ev.date.strftime('%b %d, %Y %I:%M %p'),
                'capacity': ev.capacity,
                'registered_count': reg,
                'checked_in_count': chk,
                'pending_count': reg - chk,
                'attendance_percentage': rate,
            })

        # College distribution (Top colleges)
        college_counts = {}
        for ticket in Ticket.objects.filter(event__in=events_qs).select_related('attendee'):
            col = ticket.attendee.college.strip() or 'Other'
            college_counts[col] = college_counts.get(col, 0) + 1

        college_breakdown = [
            {'college': k, 'count': v}
            for k, v in sorted(college_counts.items(), key=lambda x: x[1], reverse=True)[:6]
        ]

        # Recent Check-in Activity Stream
        recent_checkins = (
            CheckInTimestamp.objects.filter(event__in=events_qs)
            .select_related('ticket__attendee', 'event', 'scanner_staff')
            .order_by('-checkin_time')[:15]
        )
        recent_list = []
        for c in recent_checkins:
            recent_list.append({
                'checkin_id': str(c.checkin_id),
                'attendee_name': c.ticket.attendee.name if c.ticket else 'Unknown',
                'college': c.ticket.attendee.college if c.ticket else 'N/A',
                'event_name': c.event.event_name,
                'staff_name': c.scanner_staff.name if c.scanner_staff else 'System Scanner',
                'checkin_time': c.checkin_time.strftime('%I:%M:%S %p'),
                'validation_status': c.validation_status,
                'notes': c.notes,
            })

        # Hourly Check-in Velocity
        hourly_map = {}
        for c in CheckInTimestamp.objects.filter(event__in=events_qs, validation_status='SUCCESS'):
            hour_str = c.checkin_time.strftime('%I %p')
            hourly_map[hour_str] = hourly_map.get(hour_str, 0) + 1

        timeline = [{'time': k, 'scans': v} for k, v in hourly_map.items()]
        if not timeline:
            timeline = [
                {'time': '09 AM', 'scans': 0},
                {'time': '10 AM', 'scans': 0},
                {'time': '11 AM', 'scans': 0},
                {'time': '12 PM', 'scans': 0},
                {'time': '01 PM', 'scans': 0},
                {'time': '02 PM', 'scans': 0},
            ]

        return Response({
            'overview': {
                'total_events': Event.objects.count(),
                'total_registered': total_registered,
                'total_checked_in': total_checked_in,
                'total_pending': total_pending,
                'attendance_rate': attendance_rate,
            },
            'events_breakdown': events_breakdown,
            'college_breakdown': college_breakdown,
            'recent_activity': recent_list,
            'timeline': timeline,
        })


class BadgePrintView(APIView):
    """
    Badge printing endpoint:
    - POST: records a badge print event.
    - GET: retrieves badge details for printable badge cards.
    """
    permission_classes = [AllowAny]

    def get(self, request, ticket_id=None):
        if ticket_id:
            ticket = get_object_or_404(
                Ticket.objects.select_related('attendee', 'event'), ticket_id=ticket_id
            )
            return Response({
                'ticket_id': str(ticket.ticket_id),
                'attendee': AttendeeSerializer(ticket.attendee).data,
                'event': EventSerializer(ticket.event).data,
                'qr_code_image': ticket.qr_code_image,
                'is_used': ticket.is_used,
            })

        event_id = request.query_params.get('event_id')
        tickets_qs = Ticket.objects.select_related('attendee', 'event').order_by('attendee__name')
        if event_id:
            tickets_qs = tickets_qs.filter(event_id=event_id)

        badges = []
        for t in tickets_qs[:50]:  # limit batch preview
            badges.append({
                'ticket_id': str(t.ticket_id),
                'attendee': AttendeeSerializer(t.attendee).data,
                'event': EventSerializer(t.event).data,
                'qr_code_image': t.qr_code_image,
                'is_used': t.is_used,
            })

        return Response(badges)

    def post(self, request):
        ticket_id = request.data.get('ticket_id')
        printed_by = request.data.get('printed_by', 'Print Station')

        ticket = get_object_or_404(Ticket, ticket_id=ticket_id)
        badge = BadgePrint.objects.create(
            attendee=ticket.attendee,
            event=ticket.event,
            printed_by=printed_by,
        )

        return Response({
            'message': f"Badge printed for {ticket.attendee.name}",
            'badge_id': str(badge.badge_id),
            'printed_at': badge.printed_at.strftime('%Y-%m-%d %H:%M:%S'),
        }, status=status.HTTP_201_CREATED)


class ScannerStaffViewSet(viewsets.ModelViewSet):
    queryset = ScannerStaff.objects.all()
    serializer_class = ScannerStaffSerializer
    permission_classes = [AllowAny]


class CheckInHistoryListView(APIView):
    """List check-in log records with filter by event and status."""
    permission_classes = [AllowAny]

    def get(self, request):
        qs = CheckInTimestamp.objects.select_related('ticket__attendee', 'event', 'scanner_staff').order_by('-checkin_time')

        event_id = request.query_params.get('event_id')
        status_param = request.query_params.get('status')

        if event_id:
            qs = qs.filter(event_id=event_id)
        if status_param:
            qs = qs.filter(validation_status=status_param)

        data = CheckInTimestampSerializer(qs[:100], many=True).data
        return Response(data)
