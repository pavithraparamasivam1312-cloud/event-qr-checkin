from rest_framework import serializers
from .models import Event, Attendee, Ticket, ScannerStaff, CheckInTimestamp, BadgePrint


class EventSerializer(serializers.ModelSerializer):
    registered_count = serializers.IntegerField(read_only=True)
    checked_in_count = serializers.IntegerField(read_only=True)
    pending_count = serializers.IntegerField(read_only=True)
    attendance_percentage = serializers.FloatField(read_only=True)

    class Meta:
        model = Event
        fields = [
            'event_id',
            'event_name',
            'description',
            'date',
            'venue',
            'capacity',
            'status',
            'created_at',
            'updated_at',
            'registered_count',
            'checked_in_count',
            'pending_count',
            'attendance_percentage',
        ]


class AttendeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendee
        fields = [
            'attendee_id',
            'name',
            'email',
            'phone',
            'college',
            'created_at',
        ]


class TicketSerializer(serializers.ModelSerializer):
    attendee = AttendeeSerializer(read_only=True)
    event = EventSerializer(read_only=True)
    checkins = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            'ticket_id',
            'attendee',
            'event',
            'unique_token_hash',
            'qr_payload',
            'qr_code_image',
            'issued_at',
            'expiry_date',
            'is_used',
            'checkins',
        ]

    def get_checkins(self, obj):
        checkin = obj.checkins.order_by('-checkin_time').first()
        if checkin:
            return {
                'checkin_id': str(checkin.checkin_id),
                'checkin_time': checkin.checkin_time,
                'validation_status': checkin.validation_status,
                'staff_name': checkin.scanner_staff.name if checkin.scanner_staff else 'System Scanner',
            }
        return None


class AttendeeRegistrationSerializer(serializers.Serializer):
    event_id = serializers.UUIDField(required=True)
    name = serializers.CharField(max_length=255, required=True)
    email = serializers.EmailField(required=True)
    phone = serializers.CharField(max_length=30, required=True)
    college = serializers.CharField(max_length=255, required=True)


class ScannerStaffSerializer(serializers.ModelSerializer):
    assigned_event = EventSerializer(read_only=True)
    assigned_event_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = ScannerStaff
        fields = [
            'staff_id',
            'name',
            'email',
            'assigned_event',
            'assigned_event_id',
            'role',
            'is_active',
            'created_at',
            'password',
        ]

    def create(self, validated_data):
        password = validated_data.pop('password', 'Staff@123')
        assigned_event_id = validated_data.pop('assigned_event_id', None)
        staff = ScannerStaff(**validated_data)
        if assigned_event_id:
            staff.assigned_event = Event.objects.filter(event_id=assigned_event_id).first()
        staff.set_password(password)
        staff.save()
        return staff

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        assigned_event_id = validated_data.pop('assigned_event_id', None)
        if assigned_event_id is not None:
            instance.assigned_event = Event.objects.filter(event_id=assigned_event_id).first() if assigned_event_id else None
        if password:
            instance.set_password(password)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class CheckInTimestampSerializer(serializers.ModelSerializer):
    event_name = serializers.CharField(source='event.event_name', read_only=True)
    staff_name = serializers.CharField(source='scanner_staff.name', read_only=True, default='Admin/System')
    attendee_name = serializers.CharField(source='ticket.attendee.name', read_only=True, default='Unknown')
    attendee_college = serializers.CharField(source='ticket.attendee.college', read_only=True, default='')

    class Meta:
        model = CheckInTimestamp
        fields = [
            'checkin_id',
            'ticket_id',
            'event_id',
            'event_name',
            'scanner_staff_id',
            'staff_name',
            'attendee_name',
            'attendee_college',
            'checkin_time',
            'validation_status',
            'notes',
        ]


class BadgePrintSerializer(serializers.ModelSerializer):
    attendee = AttendeeSerializer(read_only=True)
    event = EventSerializer(read_only=True)

    class Meta:
        model = BadgePrint
        fields = [
            'badge_id',
            'attendee',
            'event',
            'printed_at',
            'printed_by',
        ]
