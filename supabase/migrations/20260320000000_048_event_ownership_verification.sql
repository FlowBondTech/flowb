-- Migration 048: Event Ownership Verification
-- Proves organizer ownership of aggregated events via DNS-style token verification.
-- Claim stays as-is (anyone can claim to make actionable).
-- Verification is an upgrade that proves ownership and unlocks organizer control.

-- 1. Add verification columns to flowb_events
ALTER TABLE flowb_events
  ADD COLUMN IF NOT EXISTS verified_by text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_flowb_events_verified ON flowb_events (verified_by) WHERE verified_by IS NOT NULL;

-- 2. Verification tracking table
CREATE TABLE IF NOT EXISTS flowb_event_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES flowb_events(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  token text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'expired')),
  attempts int NOT NULL DEFAULT 0,
  last_checked_at timestamptz,
  last_check_result text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_flowb_event_verifications_event ON flowb_event_verifications (event_id);
CREATE INDEX IF NOT EXISTS idx_flowb_event_verifications_user ON flowb_event_verifications (user_id);
CREATE INDEX IF NOT EXISTS idx_flowb_event_verifications_status ON flowb_event_verifications (status) WHERE status = 'pending';

-- 3. Organizer announcements table
CREATE TABLE IF NOT EXISTS flowb_event_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES flowb_events(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  title text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flowb_event_announcements_event ON flowb_event_announcements (event_id, created_at DESC);

-- 4. RLS policies
ALTER TABLE flowb_event_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_event_announcements ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "service_all_verifications" ON flowb_event_verifications
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_all_announcements" ON flowb_event_announcements
  FOR ALL USING (true) WITH CHECK (true);
