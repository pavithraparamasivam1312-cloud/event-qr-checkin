import uuid
from django.db import models
from django.utils import timezone
from django.contrib.auth.hashers import make_password, check_password


class Event(models.Model):
    STATUS_CHOICES = (
        ('UPCOMING', 'Upcoming'),
        ('ACTIVE', 'Active / In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )

    event_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    date = models.DateTimeField()
    venue = models.CharField(max_length=255)
    capacity = models.PositiveIntegerField(default=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='UPCOMING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'events'
        ordering = ['date']

    def __str__(self):
        return f"{self.event_name} ({self.date.strftime('%Y-%m-%d')})"

    @property
    def registered_count(self):
        return self.tickets.count()

    @property
    def checked_in_count(self):
        return self.tickets.filter(is_used=True).count()

    @property
    def pending_count(self):
        return self.registered_count - self.checked_in_count

    @property
    def attendance_percentage(self):
        reg = self.registered_count
        if reg == 0:
            return 0.0
        return round((self.checked_in_count / reg) * 100, 1)


class Attendee(models.Model):
    attendee_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField(db_index=True)
    phone = models.CharField(max_length=30)
    college = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'attendees'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.email})"


class Ticket(models.Model):
    ticket_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attendee = models.ForeignKey(Attendee, on_delete=models.CASCADE, related_name='tickets')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='tickets')
    unique_token_hash = models.CharField(max_length=128, unique=True, db_index=True)
    qr_payload = models.TextField(blank=True, default='')
    qr_code_image = models.TextField(blank=True, default='')  # Base64 data URI
    issued_at = models.DateTimeField(auto_now_add=True)
    expiry_date = models.DateTimeField()
    is_used = models.BooleanField(default=False, db_index=True)

    class Meta:
        db_table = 'tickets'
        constraints = [
            models.UniqueConstraint(fields=['attendee', 'event'], name='unique_attendee_event_ticket')
        ]
        ordering = ['-issued_at']

    def __str__(self):
        return f"Ticket {self.ticket_id} - {self.attendee.name} for {self.event.event_name}"


class ScannerStaff(models.Model):
    ROLE_CHOICES = (
        ('ADMIN', 'Organizer / Admin'),
        ('STAFF', 'Scanner Staff'),
    )

    staff_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True, db_index=True)
    password_hash = models.CharField(max_length=255)
    assigned_event = models.ForeignKey(
        Event, on_delete=models.SET_NULL, null=True, blank=True, related_name='scanner_staff'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='STAFF')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'scanner_staff'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.email}) [{self.role}]"

    def set_password(self, raw_password):
        self.password_hash = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password_hash)


class CheckInTimestamp(models.Model):
    VALIDATION_STATUS_CHOICES = (
        ('SUCCESS', 'Valid Ticket – Check-in Successful'),
        ('ALREADY_USED', 'Already Used Ticket'),
        ('INVALID_EVENT', 'Ticket Belongs to Another Event'),
        ('INVALID_TOKEN', 'Invalid / Unrecognized Ticket'),
        ('EXPIRED', 'Expired Ticket'),
    )

    checkin_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(
        Ticket, on_delete=models.SET_NULL, null=True, blank=True, related_name='checkins'
    )
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='checkins')
    scanner_staff = models.ForeignKey(
        ScannerStaff, on_delete=models.SET_NULL, null=True, blank=True, related_name='scans'
    )
    checkin_time = models.DateTimeField(auto_now_add=True, db_index=True)
    validation_status = models.CharField(max_length=30, choices=VALIDATION_STATUS_CHOICES)
    notes = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        db_table = 'checkin_timestamps'
        ordering = ['-checkin_time']

    def __str__(self):
        return f"CheckIn {self.checkin_id} - {self.validation_status} at {self.checkin_time}"


class BadgePrint(models.Model):
    badge_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attendee = models.ForeignKey(Attendee, on_delete=models.CASCADE, related_name='badge_prints')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='badge_prints')
    printed_at = models.DateTimeField(auto_now_add=True)
    printed_by = models.CharField(max_length=255, blank=True, default='Scanner Station')

    class Meta:
        db_table = 'badge_prints'
        ordering = ['-printed_at']

    def __str__(self):
        return f"Badge {self.badge_id} - {self.attendee.name} for {self.event.event_name}"
