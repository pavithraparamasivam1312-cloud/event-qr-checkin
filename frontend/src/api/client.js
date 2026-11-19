const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || (typeof data === 'string' ? data : 'API Request failed');
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login/', { method: 'POST', body: JSON.stringify(credentials) }),
  signup: (userData) => request('/auth/signup/', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: () => request('/auth/me/'),

  // Events
  getEvents: (params = '') => request(`/events/${params ? '?' + params : ''}`),
  getEvent: (id) => request(`/events/${id}/`),
  createEvent: (eventData) => request('/events/', { method: 'POST', body: JSON.stringify(eventData) }),
  updateEvent: (id, eventData) => request(`/events/${id}/`, { method: 'PUT', body: JSON.stringify(eventData) }),
  deleteEvent: (id) => request(`/events/${id}/`, { method: 'DELETE' }),
  getEventAttendees: (id) => request(`/events/${id}/attendees/`),

  // Attendee Registration
  registerAttendee: (data) => request('/register/', { method: 'POST', body: JSON.stringify(data) }),

  // Tickets
  getTicket: (id) => request(`/tickets/${id}/`),
  lookupTicket: (email, eventId = '') =>
    request(`/tickets/lookup/?email=${encodeURIComponent(email)}${eventId ? `&event_id=${eventId}` : ''}`),

  // QR Validation & Check-in
  validateCheckIn: (payload) => request('/checkin/validate/', { method: 'POST', body: JSON.stringify(payload) }),
  getCheckInHistory: (params = '') => request(`/checkin/history/${params ? '?' + params : ''}`),

  // Analytics & Reports
  getAnalytics: (eventId = '') => request(`/analytics/${eventId ? `?event_id=${eventId}` : ''}`),

  // Badge Printing
  getBadges: (eventId = '') => request(`/badges/${eventId ? `?event_id=${eventId}` : ''}`),
  getBadge: (ticketId) => request(`/badges/${ticketId}/`),
  recordBadgePrint: (payload) => request('/badges/print/', { method: 'POST', body: JSON.stringify(payload) }),

  // Staff Management
  getStaff: () => request('/staff/'),
  createStaff: (staffData) => request('/staff/', { method: 'POST', body: JSON.stringify(staffData) }),
  updateStaff: (id, staffData) => request(`/staff/${id}/`, { method: 'PATCH', body: JSON.stringify(staffData) }),
  deleteStaff: (id) => request(`/staff/${id}/`, { method: 'DELETE' }),
};
