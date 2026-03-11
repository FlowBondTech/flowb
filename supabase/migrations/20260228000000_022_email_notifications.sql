-- Email notification preferences + email field on sessions
-- Supports Resend-based email notifications (onboarding, digest, events, crew)

-- ============================================================
-- 1. Add email notification columns to flowb_sessions
-- ============================================================
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS notify_email BOOLEAN DEFAULT true;
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS notify_email_digest BOOLEAN DEFAULT true;
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS notify_email_events BOOLEAN DEFAULT true;
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS notify_email_crew BOOLEAN DEFAULT true;

-- Index for digest cron: find users who want email digest
CREATE INDEX IF NOT EXISTS idx_sessions_email_digest
  ON flowb_sessions (notify_email_digest, email)
  WHERE notify_email_digest = true AND email IS NOT NULL;
