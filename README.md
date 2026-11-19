# Event & Workshop QR Check-In System

A high-performance digital event management and attendance tracking platform built for college fests, technical hackathons, workshops, and industry conferences.

Featuring **cryptographically signed single-use QR tickets**, **camera-based scanning**, **atomic row-level validation**, **Supabase PostgreSQL database support**, **live attendance analytics**, and **custom attendee badge printing**.

---

## 🚀 Key Highlights & Architectural Features

- **Frontend**: Modern React.js (Vite, Tailwind CSS, Lucide Icons, HTML5-QRCode scanner).
- **Backend**: Python 3.12 + Django + Django REST Framework + CORS Headers.
- **Database**: Supabase PostgreSQL with automated schema & connection pooling (with instant local SQLite dev mode fallback).
- **Cryptographic Security**:
  - Unpredictable 32-byte cryptographic random secret per ticket (`secrets.token_urlsafe(32)`).
  - HMAC-SHA256 digital signature guaranteeing authenticity and preventing tampering.
  - Stored SHA-256 token hash (`unique_token_hash`) in database to ensure tickets cannot be forged.
- **Single-Use Row-Level Locking**:
  - Employs atomic database transactions (`transaction.atomic()`) and row-level locks (`select_for_update()`) to prevent race condition attacks or simultaneous scans.
  - Automatic rejection of reused, wrong-event, or expired tickets.
- **Gatekeeper Color-Coded Scanning Feedback**:
  - 🟢 **Green**: Valid ticket — Check-In Successful (with audio chime).
  - 🔴 **Red**: Already Used Ticket (displays previous check-in time and staff name).
  - 🟡 **Yellow**: Wrong Event Ticket (displays attendee's registered event vs scanned gate).
  - 🔴 **Red**: Invalid Ticket (tampered or unrecognized token).
- **Attendance Analytics**:
  - Live turnout percentages, hourly check-in velocity, and college breakdown.
  - Filterable audit trail log of all scan attempts.
- **Delegate Badge Studio**:
  - Print-ready lanyards and conference badges with scannable QR passes formatted with `@media print`.

---

## 📁 Project Structure

```text
event-qr-checkin/
├── backend/
│   ├── core/                      # Django project configuration
│   │   ├── settings.py            # Supabase PG & dev settings
│   │   ├── urls.py                # Global routes & React SPA serving
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── events/                    # Core application app
│   │   ├── models.py              # Event, Attendee, Ticket, Staff, CheckIn, Badge models
│   │   ├── serializers.py         # DRF serializers
│   │   ├── views.py               # Single-use atomic check-in & business APIs
│   │   ├── urls.py                # REST endpoints
│   │   ├── security.py            # HMAC-SHA256 & QR code generation
│   │   ├── tests.py               # Unit tests suite
│   │   └── management/commands/
│   │       └── seed_data.py       # Realistic sample database seeder
│   ├── requirements.txt           # Python dependencies
│   ├── supabase_schema.sql        # Supabase PostgreSQL DDL SQL script
│   ├── test_e2e.py                # Full integration test suite
│   ├── .env.example               # Environment variables template
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── api/client.js          # REST client wrapper
│   │   ├── context/AuthContext.jsx# JWT Authentication state
│   │   ├── components/            # Reusable UI components
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── StatCard.jsx
│   │   │   └── StatusBadge.jsx
│   │   ├── pages/                 # 10 Required Feature Pages
│   │   │   ├── LoginSignup.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── EventsList.jsx
│   │   │   ├── CreateEvent.jsx
│   │   │   ├── EventDetails.jsx
│   │   │   ├── AttendeeRegistration.jsx
│   │   │   ├── MyQRTicket.jsx
│   │   │   ├── QRScanner.jsx
│   │   │   ├── AttendanceReports.jsx
│   │   │   ├── BadgePrinting.jsx
│   │   │   └── StaffManagement.jsx
│   │   ├── App.jsx                # Router setup
│   │   ├── main.jsx
│   │   └── index.css              # Custom styling & @media print badge rules
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
└── README.md
```

---

## 🗄️ Database Tables (Supabase / PostgreSQL)

1. **`events`**: `event_id`, `event_name`, `description`, `date`, `venue`, `capacity`, `status`, `created_at`.
2. **`attendees`**: `attendee_id`, `name`, `email`, `phone`, `college`, `created_at`.
3. **`tickets`**: `ticket_id`, `attendee_id`, `event_id`, `unique_token_hash`, `qr_payload`, `qr_code_image`, `issued_at`, `expiry_date`, `is_used`.
4. **`scanner_staff`**: `staff_id`, `name`, `email`, `password_hash`, `assigned_event_id`, `role`, `is_active`.
5. **`checkin_timestamps`**: `checkin_id`, `ticket_id`, `event_id`, `scanner_staff_id`, `checkin_time`, `validation_status`, `notes`.
6. **`badge_prints`**: `badge_id`, `attendee_id`, `event_id`, `printed_at`, `printed_by`.

---

## 🔑 Pre-Seeded Demo Accounts

The project includes pre-configured demo credentials ready to test:

| Role | Email | Password | Assigned Gate |
| :--- | :--- | :--- | :--- |
| **Lead Organizer (Admin)** | `admin@eventqr.com` | `Admin@123` | Global Access (All Events) |
| **Scanner Gatekeeper 1** | `staff@eventqr.com` | `Staff@123` | Annual Hackathon & Codefest 2026 |
| **Scanner Gatekeeper 2** | `alex.scanner@eventqr.com` | `Staff@123` | AI & Neural Systems Masterclass |

*Note: The login page includes 1-click demo login buttons to instantly populate and test either account.*

---

## ⚙️ Quick Start & Installation

### 1. Prerequisites
- **Python 3.10+** (Python 3.12 recommended)
- **Node.js 18+** & **npm**

### 2. Backend Setup
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Configure environment variables in `.env` (optional for local SQLite, required for Supabase PostgreSQL):
   ```bash
   cp .env.example .env
   ```
4. Run migrations and populate initial sample data:
   ```bash
   python manage.py migrate
   python manage.py seed_data
   ```
5. Start the Django server:
   ```bash
   python manage.py runserver 127.0.0.1:8000
   ```

### 3. Frontend Setup
1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

*(Alternatively, run `npm run build` in the frontend directory. Django is pre-configured to automatically serve the production React app directly on [http://127.0.0.1:8000](http://127.0.0.1:8000).)*

---

## 🌐 Supabase PostgreSQL Configuration

To connect Django to your Supabase PostgreSQL instance:

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **Project Settings** -> **Database** -> **Connection String**.
3. Select the **URI** tab (Transaction pooler on port `6543` or direct on port `5432`).
4. In `backend/.env`, set:
   ```env
   DATABASE_URL=postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
5. Apply database schema:
   ```bash
   python manage.py migrate
   ```
   *(Or copy and execute the contents of `backend/supabase_schema.sql` directly into the Supabase SQL Editor).*

---

## 🧪 Automated Testing

Run the automated unit and integration tests:

```bash
# Run unit tests
cd backend
python manage.py test events

# Run end-to-end integration verification
python test_e2e.py
```

All 5 core test cases and 8 end-to-end scenarios will execute, verifying ticket generation, duplicate rejection, and single-use atomic check-in.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login/` | Authenticate staff/admin; returns JWT token |
| `POST` | `/api/auth/signup/` | Register new organizer account |
| `GET` | `/api/auth/me/` | Fetch authenticated profile |
| `GET/POST`| `/api/events/` | List and create events |
| `GET/PUT` | `/api/events/<uuid:id>/` | View, edit, or delete event |
| `GET` | `/api/events/<uuid:id>/attendees/` | Registered attendees for event |
| `POST` | `/api/register/` | Public attendee registration & QR ticket generation |
| `GET` | `/api/tickets/<uuid:id>/` | Fetch ticket details by ID |
| `GET` | `/api/tickets/lookup/?email=...` | Attendee ticket retrieval by email |
| `POST` | `/api/checkin/validate/` | High-security camera QR scan validation |
| `GET` | `/api/checkin/history/` | Audit log of check-in attempts |
| `GET` | `/api/analytics/` | Aggregated attendance stats & hourly velocity |
| `GET/POST`| `/api/badges/` | Batch badges & record print timestamp |
| `GET/POST`| `/api/staff/` | Manage scanner staff accounts |
