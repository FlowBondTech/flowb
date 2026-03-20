-- =====================================================
-- DANZ Check-ins Schema
-- =====================================================
-- Daily check-in records for the Daily DANZ miniapp
--
-- NOTE: This schema is designed to work with the existing
-- FlowBond production database which uses:
--   - users.privy_id (TEXT) as primary key
--   - users.farcaster_fid (INTEGER) for Farcaster user lookup
--   - users.xp (not total_xp)
--   - users.level (not current_level)

-- =====================================================
-- ALTER USERS TABLE (if columns don't exist)
-- =====================================================
-- These columns were added to the existing users table:

ALTER TABLE users ADD COLUMN IF NOT EXISTS farcaster_fid INTEGER UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_users_farcaster_fid ON users(farcaster_fid) WHERE farcaster_fid IS NOT NULL;

-- =====================================================
-- CHECK-INS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(privy_id) ON DELETE CASCADE,
  fid INTEGER NOT NULL,

  -- Check-in details
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  did_dance BOOLEAN DEFAULT true,

  -- Streak tracking
  streak_count INTEGER DEFAULT 0,

  -- XP breakdown
  xp_earned INTEGER DEFAULT 0,
  streak_bonus INTEGER DEFAULT 0,
  reflection_bonus INTEGER DEFAULT 0,

  -- Optional reflection data
  reflection_data JSONB DEFAULT NULL,
  -- Example: { "feeling": "amazing", "benefits": ["joy", "energy"], "note": "Great session!" }

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_checkins_user ON checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_fid ON checkins(fid);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(checked_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON checkins(user_id, checked_in_at DESC);

-- =====================================================
-- HELPER FUNCTION: Get today's check-in for a user
-- =====================================================

CREATE OR REPLACE FUNCTION get_today_checkin(p_user_id TEXT)
RETURNS SETOF checkins AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM checkins
  WHERE user_id = p_user_id
    AND checked_in_at >= CURRENT_DATE
    AND checked_in_at < CURRENT_DATE + INTERVAL '1 day'
  ORDER BY checked_in_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- HELPER FUNCTION: Calculate streak for a user
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_user_streak(p_user_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_streak INTEGER := 0;
  v_check_date DATE := CURRENT_DATE;
  v_has_checkin BOOLEAN;
BEGIN
  -- Check if user checked in today
  SELECT EXISTS(
    SELECT 1 FROM checkins
    WHERE user_id = p_user_id
      AND checked_in_at >= CURRENT_DATE
      AND did_dance = true
  ) INTO v_has_checkin;

  -- If checked in today, start counting from today
  IF v_has_checkin THEN
    v_streak := 1;
    v_check_date := CURRENT_DATE - INTERVAL '1 day';
  ELSE
    -- Check yesterday first
    v_check_date := CURRENT_DATE - INTERVAL '1 day';
  END IF;

  -- Count consecutive days backwards
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM checkins
      WHERE user_id = p_user_id
        AND checked_in_at >= v_check_date
        AND checked_in_at < v_check_date + INTERVAL '1 day'
        AND did_dance = true
    ) INTO v_has_checkin;

    EXIT WHEN NOT v_has_checkin;

    v_streak := v_streak + 1;
    v_check_date := v_check_date - INTERVAL '1 day';
  END LOOP;

  RETURN v_streak;
END;
$$ LANGUAGE plpgsql;
