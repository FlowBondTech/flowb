-- ============================================================================
-- 039: Add tg_username to sessions for Telegram @username lookup
-- ============================================================================
-- Allows admin tools (grant_flowmium, admin_crew_action, etc.) to find
-- users by their Telegram @username, not just display_name.
-- ============================================================================

ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS tg_username TEXT;

-- Index for fast ilike lookups on both name fields
CREATE INDEX IF NOT EXISTS idx_flowb_sessions_tg_username
  ON flowb_sessions (lower(tg_username));

CREATE INDEX IF NOT EXISTS idx_flowb_sessions_display_name_lower
  ON flowb_sessions (lower(display_name));
