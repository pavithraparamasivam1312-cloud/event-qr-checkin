from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AuthLoginView,
    AuthSignupView,
    AuthMeView,
    EventViewSet,
    AttendeeRegistrationView,
    TicketDetailView,
    EventAttendeesListView,
    ValidateCheckInView,
    AttendanceAnalyticsView,
    BadgePrintView,
    ScannerStaffViewSet,
    CheckInHistoryListView,
)

router = DefaultRouter()
router.register(r'events', EventViewSet, basename='events')
router.register(r'staff', ScannerStaffViewSet, basename='staff')

urlpatterns = [
    # Auth
    path('auth/login/', AuthLoginView.as_view(), name='auth-login'),
    path('auth/signup/', AuthSignupView.as_view(), name='auth-signup'),
    path('auth/me/', AuthMeView.as_view(), name='auth-me'),

    # Registration & Tickets
    path('register/', AttendeeRegistrationView.as_view(), name='attendee-register'),
    path('tickets/lookup/', TicketDetailView.as_view(), name='ticket-lookup'),
    path('tickets/<uuid:pk>/', TicketDetailView.as_view(), name='ticket-detail'),
    path('events/<uuid:event_id>/attendees/', EventAttendeesListView.as_view(), name='event-attendees'),

    # QR Scanning & Single-Use Check-In
    path('checkin/validate/', ValidateCheckInView.as_view(), name='checkin-validate'),
    path('checkin/history/', CheckInHistoryListView.as_view(), name='checkin-history'),

    # Attendance Reports & Analytics
    path('analytics/', AttendanceAnalyticsView.as_view(), name='attendance-analytics'),

    # Badge Printing
    path('badges/', BadgePrintView.as_view(), name='badge-list'),
    path('badges/<uuid:ticket_id>/', BadgePrintView.as_view(), name='badge-detail'),
    path('badges/print/', BadgePrintView.as_view(), name='badge-record-print'),

    # Router endpoints (Events & Staff)
    path('', include(router.urls)),
]
