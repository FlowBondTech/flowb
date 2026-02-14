-- FlowB Mini App support tables
-- Checkins (live crew location), Schedules (rich RSVP), Notification tokens (Farcaster push)

-- ============================================================
-- 1. Crew Checkins (live "I'm here" broadcasts)
-- ============================================================
CREATE TABLE IF NOT EXISTS flowb_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'telegram',
  crew_id UUID REFERENCES flowb_groups(id) ON DELETE CASCADE,
  venue_name TEXT NOT NULL,
  event_id TEXT,                      -- optional link to an event
  status TEXT NOT NULL DEFAULT 'here', -- here | heading | leaving
  message TEXT,                       -- "On my way!" etc
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '4 hours'
);

CREATE INDEX IF NOT EXISTS idx_checkins_crew
  ON flowb_checkins (crew_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_user
  ON flowb_checkins (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_active
  ON flowb_checkins (expires_at)
  WHERE expires_at > now();

-- ============================================================
-- 2. Schedules (rich personal RSVP / schedule entries)
-- ============================================================
CREATE TABLE IF NOT EXISTS flowb_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'telegram',
  event_title TEXT NOT NULL,
  event_source TEXT,                  -- luma | eventbrite | tavily | etc
  event_source_id TEXT,               -- original event ID from source
  event_url TEXT,
  venue_name TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  rsvp_status TEXT NOT NULL DEFAULT 'going', -- going | maybe
  checked_in BOOLEAN NOT NULL DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform, event_source, event_source_id)
);

CREATE INDEX IF NOT EXISTS idx_schedules_user
  ON flowb_schedules (user_id, platform, starts_at);
CREATE INDEX IF NOT EXISTS idx_schedules_upcoming
  ON flowb_schedules (starts_at)
  WHERE rsvp_status IN ('going', 'maybe');

-- ============================================================
-- 3. Farcaster Notification Tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS flowb_notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid BIGINT NOT NULL,
  token TEXT NOT NULL,
  url TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(fid)
);

-- ============================================================
-- 4. Enhance flowb_groups: add event_context column
-- ============================================================
ALTER TABLE flowb_groups ADD COLUMN IF NOT EXISTS event_context TEXT;

-- ============================================================
-- 5. RLS + service policies
-- ============================================================
ALTER TABLE flowb_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_notification_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_all_checkins" ON flowb_checkins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_schedules" ON flowb_schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_notification_tokens" ON flowb_notification_tokens FOR ALL USING (true) WITH CHECK (true);
