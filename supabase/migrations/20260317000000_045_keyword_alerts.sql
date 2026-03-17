-- 045: Keyword/Topic Alert Notifications
-- Users set keyword alerts (e.g. "AI", "party") and get notified when
-- new events matching those keywords are discovered by the scanner.

CREATE TABLE IF NOT EXISTS flowb_keyword_alerts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text NOT NULL,
  keyword       text NOT NULL,           -- stored lowercase
  category_slug text,                    -- optional: match event category too
  crew_id       uuid REFERENCES flowb_groups(id) ON DELETE CASCADE,
  enabled       boolean NOT NULL DEFAULT true,
  city          text,                    -- optional: only events in this city
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, keyword, crew_id)      -- one alert per keyword per target
);

-- Indexes
CREATE INDEX idx_keyword_alerts_enabled ON flowb_keyword_alerts (enabled) WHERE enabled = true;
CREATE INDEX idx_keyword_alerts_user ON flowb_keyword_alerts (user_id);

-- RLS
ALTER TABLE flowb_keyword_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all_keyword_alerts"
  ON flowb_keyword_alerts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Add preference toggle to sessions
ALTER TABLE flowb_sessions
  ADD COLUMN IF NOT EXISTS notify_keyword_alerts boolean DEFAULT true;
