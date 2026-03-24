-- 047: Festivals / Featured Seasons
-- Admin-managed multi-day events (SXSW, ETHDenver, etc.) that drive
-- featured content, date filters, and countdown timers across all apps.

CREATE TABLE IF NOT EXISTS flowb_festivals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  city        text NOT NULL,
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL,
  timezone    text NOT NULL DEFAULT 'America/Chicago',
  description text,
  image_url   text,
  url         text,
  featured    boolean NOT NULL DEFAULT false,
  enabled     boolean NOT NULL DEFAULT true,
  created_by  text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Index for the active festivals query (enabled + date range)
CREATE INDEX idx_flowb_festivals_active ON flowb_festivals (enabled, starts_at, ends_at)
  WHERE enabled = true;

-- RLS: public read, service role write
ALTER TABLE flowb_festivals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_festivals" ON flowb_festivals
  FOR SELECT USING (enabled = true);

CREATE POLICY "service_role_festivals" ON flowb_festivals
  TO service_role USING (true) WITH CHECK (true);
