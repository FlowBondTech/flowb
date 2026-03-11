-- ============================================================
-- 021: Context notification tracking + user preference
-- ============================================================

-- 1. Add notifications_enabled column to flowb_sessions
-- Controls whether the context notification engine sends proactive
-- notifications to this user. Individual type toggles still apply.
ALTER TABLE flowb_sessions
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;

-- 2. Context notification dedup/tracking table
-- Tracks contextual (proactive) notifications so we don't re-send
-- the same type+reference within a cooldown window.
CREATE TABLE IF NOT EXISTS flowb_notifications_sent (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,  -- crew_active | friends_at_event | heading_your_way | post_event | morning_briefing
  reference_id TEXT NOT NULL,       -- crew_id, event_id, city, or date key
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dedup index: one notification per user+type+reference within cooldown
CREATE UNIQUE INDEX IF NOT EXISTS idx_ctx_notify_dedup
  ON flowb_notifications_sent (user_id, notification_type, reference_id);

-- Cleanup: query by sent_at for TTL cleanup
CREATE INDEX IF NOT EXISTS idx_ctx_notify_sent_at
  ON flowb_notifications_sent (sent_at);

-- RLS
ALTER TABLE flowb_notifications_sent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all_ctx_notifications"
  ON flowb_notifications_sent FOR ALL USING (true) WITH CHECK (true);
