-- FlowB Check-in Locations & GPS Support
-- Run this in Supabase SQL Editor

-- 1. QR / booth locations table
CREATE TABLE IF NOT EXISTS flowb_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  floor TEXT,
  zone TEXT,
  event_id TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_flowb_locations_code ON flowb_locations(code);
CREATE INDEX IF NOT EXISTS idx_flowb_locations_active ON flowb_locations(active) WHERE active = TRUE;

-- 2. Add location_id and expires_at to checkins
ALTER TABLE flowb_checkins
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES flowb_locations(id),
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 3. Indexes for crew + active checkin queries
CREATE INDEX IF NOT EXISTS idx_flowb_checkins_crew_active
  ON flowb_checkins(crew_id, expires_at DESC)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_flowb_checkins_user_active
  ON flowb_checkins(user_id, expires_at DESC)
  WHERE expires_at IS NOT NULL;

-- 4. Enable RLS (match existing pattern)
ALTER TABLE flowb_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flowb_locations_read" ON flowb_locations
  FOR SELECT USING (true);

CREATE POLICY "flowb_locations_insert" ON flowb_locations
  FOR INSERT WITH CHECK (true);
