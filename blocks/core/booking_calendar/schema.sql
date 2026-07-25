-- blocks/booking_calendar/schema.sql
-- Booking Calendar Schema

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  service_requested TEXT,
  google_event_id TEXT, -- Added for Google Calendar API Sync (Path A)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Allow public (anon) to insert appointments (request a booking)
CREATE POLICY "Public can request appointments" 
  ON appointments FOR INSERT 
  TO anon
  WITH CHECK (true);

-- Only authenticated users (admins) can view, update, delete
CREATE POLICY "Admins can select appointments" 
  ON appointments FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Admins can update appointments" 
  ON appointments FOR UPDATE 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete appointments" 
  ON appointments FOR DELETE 
  TO authenticated 
  USING (true);
