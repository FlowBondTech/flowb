-- Advanced notification preferences: event reminders table + session preference columns

-- ============================================================
-- 1. Event Reminders (per-user, per-event, multiple times)
-- ============================================================
CREATE TABLE IF NOT EXISTS flowb_event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  event_source_id TEXT NOT NULL,
  remind_minutes_before INT NOT NULL,
  sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_source_id, remind_minutes_before)
);

CREATE INDEX IF NOT EXISTS idx_event_reminders_pending
  ON flowb_event_reminders (sent, remind_minutes_before);
CREATE INDEX IF NOT EXISTS idx_event_reminders_user
  ON flowb_event_reminders (user_id, event_source_id);

-- ============================================================
-- 2. Extend flowb_sessions with notification preference columns
-- ============================================================
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS reminder_defaults INT[] DEFAULT '{30}';
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS notify_crew_checkins BOOLEAN DEFAULT true;
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS notify_friend_rsvps BOOLEAN DEFAULT true;
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS notify_crew_rsvps BOOLEAN DEFAULT true;
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS notify_event_reminders BOOLEAN DEFAULT true;
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS notify_daily_digest BOOLEAN DEFAULT true;
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS daily_notification_limit INT DEFAULT 10;
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS quiet_hours_start INT DEFAULT 22;
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS quiet_hours_end INT DEFAULT 8;

-- ============================================================
-- 3. RLS + service policy
-- ============================================================
ALTER TABLE flowb_event_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all_event_reminders" ON flowb_event_reminders FOR ALL USING (true) WITH CHECK (true);
