-- =========================================================================
-- EVENT & WORKSHOP QR CHECK-IN SYSTEM - SUPABASE POSTGRESQL SCHEMA
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Events Table
CREATE TABLE IF NOT EXISTS events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    date TIMESTAMPTZ NOT NULL,
    venue VARCHAR(255) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 100 CHECK (capacity > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'UPCOMING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Attendees Table
CREATE TABLE IF NOT EXISTS attendees (
    attendee_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    college VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attendees_email ON attendees(email);

-- 3. Tickets Table (Cryptographic Single-Use QR Tickets)
CREATE TABLE IF NOT EXISTS tickets (
    ticket_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendee_id UUID NOT NULL REFERENCES attendees(attendee_id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    unique_token_hash VARCHAR(128) NOT NULL UNIQUE,
    qr_payload TEXT NOT NULL DEFAULT '',
    qr_code_image TEXT DEFAULT '',
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    expiry_date TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT unique_attendee_event_ticket UNIQUE (attendee_id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_tickets_token_hash ON tickets(unique_token_hash);
CREATE INDEX IF NOT EXISTS idx_tickets_event_is_used ON tickets(event_id, is_used);

-- 4. Scanner Staff Table
CREATE TABLE IF NOT EXISTS scanner_staff (
    staff_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    assigned_event_id UUID REFERENCES events(event_id) ON DELETE SET NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'STAFF',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_email ON scanner_staff(email);

-- 5. Check-In Timestamps Table (Audit Trail)
CREATE TABLE IF NOT EXISTS checkin_timestamps (
    checkin_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(ticket_id) ON DELETE SET NULL,
    event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    scanner_staff_id UUID REFERENCES scanner_staff(staff_id) ON DELETE SET NULL,
    checkin_time TIMESTAMPTZ DEFAULT NOW(),
    validation_status VARCHAR(30) NOT NULL,
    notes VARCHAR(255) DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_checkin_event_time ON checkin_timestamps(event_id, checkin_time DESC);
CREATE INDEX IF NOT EXISTS idx_checkin_ticket ON checkin_timestamps(ticket_id);

-- 6. Badge Prints Table
CREATE TABLE IF NOT EXISTS badge_prints (
    badge_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendee_id UUID NOT NULL REFERENCES attendees(attendee_id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    printed_at TIMESTAMPTZ DEFAULT NOW(),
    printed_by VARCHAR(255) DEFAULT 'Scanner Station'
);
CREATE INDEX IF NOT EXISTS idx_badge_event ON badge_prints(event_id);

-- Optional Row-Level Security (RLS) Enablement
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE scanner_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_timestamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_prints ENABLE ROW LEVEL SECURITY;

-- Allow public read of active events & attendee registration
CREATE POLICY "Public read events" ON events FOR SELECT USING (true);
CREATE POLICY "Public register attendees" ON attendees FOR ALL USING (true);
CREATE POLICY "Public read own tickets" ON tickets FOR SELECT USING (true);
