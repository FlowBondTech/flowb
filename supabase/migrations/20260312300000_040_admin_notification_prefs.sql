-- Add notification preferences JSONB column to flowb_admins
-- Keys are category strings (e.g. "event_scan", "daily_summary"), values are booleans.
-- Default '{}' means all categories enabled (missing key = true).
-- An admin must explicitly set a key to false to disable it.

ALTER TABLE flowb_admins ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{}';
