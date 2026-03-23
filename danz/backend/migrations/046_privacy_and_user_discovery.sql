-- Migration: 046_privacy_and_user_discovery.sql
-- Date: 2025-01-28
-- Description: Privacy settings and user discovery/suggestion system
-- Philosophy: Privacy by default, simple controls, granular for power users

-- ============================================================================
-- USER PRIVACY SETTINGS TABLE
-- Separate table to avoid bloating users table and enable easy auditing
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL UNIQUE REFERENCES users(privy_id) ON DELETE CASCADE,

  -- ==================== PROFILE VISIBILITY ====================
  -- Controls who can see your profile information
  profile_visibility VARCHAR(20) DEFAULT 'public', -- 'public', 'bonds_only', 'private'

  -- Individual profile field visibility
  show_real_name BOOLEAN DEFAULT true,          -- Display name vs username
  show_bio BOOLEAN DEFAULT true,
  show_avatar BOOLEAN DEFAULT true,
  show_city BOOLEAN DEFAULT true,
  show_dance_styles BOOLEAN DEFAULT true,
  show_stats BOOLEAN DEFAULT true,              -- Points, level, achievements
  show_badges BOOLEAN DEFAULT true,

  -- ==================== ACTIVITY VISIBILITY ====================
  -- Controls visibility of your activities
  show_events_attending BOOLEAN DEFAULT true,   -- Upcoming events
  show_events_attended BOOLEAN DEFAULT true,    -- Past events
  show_check_ins BOOLEAN DEFAULT true,          -- Event check-ins in feed
  show_leaderboard_rank BOOLEAN DEFAULT true,   -- Appear on leaderboards

  -- Feed activity visibility
  show_posts BOOLEAN DEFAULT true,              -- Your posts visible to others
  show_likes BOOLEAN DEFAULT true,              -- Your likes visible
  show_comments BOOLEAN DEFAULT true,           -- Your comments visible

  -- ==================== DISCOVERY SETTINGS ====================
  -- Controls how others can find you
  searchable_by_username BOOLEAN DEFAULT true,  -- Can be found via search
  appear_in_suggestions BOOLEAN DEFAULT true,   -- "People you may know"
  appear_in_event_attendees BOOLEAN DEFAULT true, -- Show in event attendee lists
  appear_in_nearby BOOLEAN DEFAULT false,       -- Location-based discovery (opt-in)

  -- ==================== INTERACTION SETTINGS ====================
  -- Controls who can interact with you
  allow_bond_requests VARCHAR(20) DEFAULT 'everyone', -- 'everyone', 'mutual_events', 'none'
  allow_messages VARCHAR(20) DEFAULT 'bonds_only', -- 'everyone', 'bonds_only', 'none'
  allow_event_invites BOOLEAN DEFAULT true,

  -- ==================== NOTIFICATION PRIVACY ====================
  -- What triggers notifications to others
  notify_bonds_on_check_in BOOLEAN DEFAULT true,
  notify_bonds_on_achievement BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USER SUGGESTIONS TABLE
-- Pre-computed suggestions for performance, refreshed periodically
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL REFERENCES users(privy_id) ON DELETE CASCADE,
  suggested_user_id VARCHAR(100) NOT NULL REFERENCES users(privy_id) ON DELETE CASCADE,

  -- Suggestion source and scoring
  source VARCHAR(30) NOT NULL, -- 'mutual_bonds', 'same_events', 'leaderboard_proximity', 'same_city', 'similar_styles'
  score FLOAT DEFAULT 0,       -- Higher = better match (0-100)
  reason TEXT,                 -- Human-readable reason

  -- Tracking
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',

  UNIQUE(user_id, suggested_user_id)
);

-- ============================================================================
-- USER SEARCH HISTORY (for improving suggestions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL REFERENCES users(privy_id) ON DELETE CASCADE,
  searched_username VARCHAR(100),
  searched_user_id VARCHAR(100) REFERENCES users(privy_id) ON DELETE SET NULL,
  found BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Privacy settings indexes
CREATE INDEX IF NOT EXISTS idx_privacy_user ON user_privacy_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_searchable ON user_privacy_settings(searchable_by_username) WHERE searchable_by_username = true;
CREATE INDEX IF NOT EXISTS idx_privacy_suggestions ON user_privacy_settings(appear_in_suggestions) WHERE appear_in_suggestions = true;
CREATE INDEX IF NOT EXISTS idx_privacy_leaderboard ON user_privacy_settings(show_leaderboard_rank) WHERE show_leaderboard_rank = true;

-- Suggestion indexes
CREATE INDEX IF NOT EXISTS idx_suggestions_user ON user_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_active ON user_suggestions(user_id, is_dismissed, expires_at) WHERE is_dismissed = false;
CREATE INDEX IF NOT EXISTS idx_suggestions_score ON user_suggestions(user_id, score DESC);

-- Search history indexes
CREATE INDEX IF NOT EXISTS idx_search_history_user ON user_search_history(user_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_search_history ENABLE ROW LEVEL SECURITY;

-- Privacy settings: Users can only see/modify their own
CREATE POLICY privacy_settings_select ON user_privacy_settings FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY privacy_settings_insert ON user_privacy_settings FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY privacy_settings_update ON user_privacy_settings FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true));

-- Suggestions: Users can only see their own
CREATE POLICY suggestions_select ON user_suggestions FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY suggestions_update ON user_suggestions FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true));

-- Search history: Users can only see their own
CREATE POLICY search_history_select ON user_search_history FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY search_history_insert ON user_search_history FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Initialize privacy settings for new users (with sensible defaults)
CREATE OR REPLACE FUNCTION initialize_user_privacy()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_privacy_settings (user_id)
  VALUES (NEW.privy_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create privacy settings
DROP TRIGGER IF EXISTS trigger_initialize_user_privacy ON users;
CREATE TRIGGER trigger_initialize_user_privacy
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_privacy();

-- Function to check if user A can view user B's profile
CREATE OR REPLACE FUNCTION can_view_profile(viewer_id VARCHAR, target_id VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  target_privacy RECORD;
  are_bonds BOOLEAN;
BEGIN
  -- Users can always view themselves
  IF viewer_id = target_id THEN
    RETURN true;
  END IF;

  -- Get target's privacy settings
  SELECT * INTO target_privacy
  FROM user_privacy_settings
  WHERE user_id = target_id;

  -- No settings = public by default
  IF target_privacy IS NULL THEN
    RETURN true;
  END IF;

  -- Check visibility level
  IF target_privacy.profile_visibility = 'public' THEN
    RETURN true;
  ELSIF target_privacy.profile_visibility = 'private' THEN
    RETURN false;
  ELSIF target_privacy.profile_visibility = 'bonds_only' THEN
    -- Check if they have a bond
    SELECT EXISTS (
      SELECT 1 FROM dance_bonds
      WHERE status = 'accepted'
        AND ((requester_id = viewer_id AND recipient_id = target_id)
          OR (requester_id = target_id AND recipient_id = viewer_id))
    ) INTO are_bonds;
    RETURN are_bonds;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user A can message user B
CREATE OR REPLACE FUNCTION can_message_user(sender_id VARCHAR, recipient_id VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  recipient_settings RECORD;
  are_bonds BOOLEAN;
BEGIN
  -- Can't message yourself
  IF sender_id = recipient_id THEN
    RETURN false;
  END IF;

  -- Check if blocked
  IF EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = sender_id AND blocked_id = recipient_id)
       OR (blocker_id = recipient_id AND blocked_id = sender_id)
  ) THEN
    RETURN false;
  END IF;

  -- Get recipient's settings
  SELECT * INTO recipient_settings
  FROM user_privacy_settings
  WHERE user_id = recipient_id;

  -- Default to bonds_only if no settings
  IF recipient_settings IS NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM dance_bonds
      WHERE status = 'accepted'
        AND ((requester_id = sender_id AND recipient_id = recipient_id)
          OR (requester_id = recipient_id AND recipient_id = sender_id))
    ) INTO are_bonds;
    RETURN are_bonds;
  END IF;

  -- Check message settings
  IF recipient_settings.allow_messages = 'everyone' THEN
    RETURN true;
  ELSIF recipient_settings.allow_messages = 'none' THEN
    RETURN false;
  ELSIF recipient_settings.allow_messages = 'bonds_only' THEN
    SELECT EXISTS (
      SELECT 1 FROM dance_bonds
      WHERE status = 'accepted'
        AND ((requester_id = sender_id AND recipient_id = recipient_id)
          OR (requester_id = recipient_id AND recipient_id = sender_id))
    ) INTO are_bonds;
    RETURN are_bonds;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to generate user suggestions
CREATE OR REPLACE FUNCTION generate_user_suggestions(target_user_id VARCHAR)
RETURNS VOID AS $$
BEGIN
  -- Clear expired suggestions
  DELETE FROM user_suggestions
  WHERE user_id = target_user_id
    AND (expires_at < NOW() OR is_dismissed = true);

  -- Suggestion 1: Mutual bonds (friends of friends)
  INSERT INTO user_suggestions (user_id, suggested_user_id, source, score, reason)
  SELECT DISTINCT
    target_user_id,
    mutual.friend_of_friend,
    'mutual_bonds',
    30 + (COUNT(*) * 10), -- Base 30 + 10 per mutual bond
    'You have ' || COUNT(*) || ' mutual connection(s)'
  FROM (
    -- Get friends of my friends
    SELECT
      CASE WHEN db2.requester_id = db1.requester_id OR db2.requester_id = db1.recipient_id
           THEN db2.recipient_id
           ELSE db2.requester_id
      END as friend_of_friend
    FROM dance_bonds db1
    JOIN dance_bonds db2 ON (
      db2.status = 'accepted'
      AND (
        (db2.requester_id IN (db1.requester_id, db1.recipient_id) AND db2.requester_id != target_user_id)
        OR (db2.recipient_id IN (db1.requester_id, db1.recipient_id) AND db2.recipient_id != target_user_id)
      )
    )
    WHERE db1.status = 'accepted'
      AND (db1.requester_id = target_user_id OR db1.recipient_id = target_user_id)
  ) mutual
  -- Only suggest users with public suggestions enabled
  JOIN user_privacy_settings ups ON ups.user_id = mutual.friend_of_friend AND ups.appear_in_suggestions = true
  -- Not already a bond
  WHERE NOT EXISTS (
    SELECT 1 FROM dance_bonds
    WHERE status = 'accepted'
      AND ((requester_id = target_user_id AND recipient_id = mutual.friend_of_friend)
        OR (requester_id = mutual.friend_of_friend AND recipient_id = target_user_id))
  )
  -- Not the user themselves
  AND mutual.friend_of_friend != target_user_id
  -- Not already suggested
  AND NOT EXISTS (
    SELECT 1 FROM user_suggestions
    WHERE user_id = target_user_id AND suggested_user_id = mutual.friend_of_friend
  )
  GROUP BY mutual.friend_of_friend
  ON CONFLICT (user_id, suggested_user_id) DO UPDATE
    SET score = EXCLUDED.score, reason = EXCLUDED.reason, expires_at = NOW() + INTERVAL '7 days';

  -- Suggestion 2: Same events attended
  INSERT INTO user_suggestions (user_id, suggested_user_id, source, score, reason)
  SELECT DISTINCT
    target_user_id,
    er2.user_id,
    'same_events',
    20 + (COUNT(DISTINCT er2.event_id) * 5), -- 5 points per shared event
    'Attended ' || COUNT(DISTINCT er2.event_id) || ' same event(s)'
  FROM event_registrations er1
  JOIN event_registrations er2 ON er1.event_id = er2.event_id AND er2.user_id != target_user_id
  JOIN user_privacy_settings ups ON ups.user_id = er2.user_id AND ups.appear_in_suggestions = true
  WHERE er1.user_id = target_user_id
    AND er1.status IN ('registered', 'checked_in')
    AND er2.status IN ('registered', 'checked_in')
    -- Not already a bond
    AND NOT EXISTS (
      SELECT 1 FROM dance_bonds
      WHERE status = 'accepted'
        AND ((requester_id = target_user_id AND recipient_id = er2.user_id)
          OR (requester_id = er2.user_id AND recipient_id = target_user_id))
    )
    -- Not already suggested
    AND NOT EXISTS (
      SELECT 1 FROM user_suggestions
      WHERE user_id = target_user_id AND suggested_user_id = er2.user_id
    )
  GROUP BY er2.user_id
  HAVING COUNT(DISTINCT er2.event_id) >= 2 -- At least 2 shared events
  ON CONFLICT (user_id, suggested_user_id) DO UPDATE
    SET score = GREATEST(user_suggestions.score, EXCLUDED.score),
        reason = EXCLUDED.reason,
        expires_at = NOW() + INTERVAL '7 days';

  -- Suggestion 3: Same city
  INSERT INTO user_suggestions (user_id, suggested_user_id, source, score, reason)
  SELECT
    target_user_id,
    u2.privy_id,
    'same_city',
    15,
    'Also in ' || u1.city
  FROM users u1
  JOIN users u2 ON u2.city = u1.city AND u2.privy_id != target_user_id
  JOIN user_privacy_settings ups ON ups.user_id = u2.privy_id AND ups.appear_in_suggestions = true AND ups.show_city = true
  WHERE u1.privy_id = target_user_id
    AND u1.city IS NOT NULL
    AND u1.city != ''
    -- Not already a bond
    AND NOT EXISTS (
      SELECT 1 FROM dance_bonds
      WHERE status = 'accepted'
        AND ((requester_id = target_user_id AND recipient_id = u2.privy_id)
          OR (requester_id = u2.privy_id AND recipient_id = target_user_id))
    )
    -- Not already suggested
    AND NOT EXISTS (
      SELECT 1 FROM user_suggestions
      WHERE user_id = target_user_id AND suggested_user_id = u2.privy_id
    )
  LIMIT 20 -- Cap city suggestions
  ON CONFLICT (user_id, suggested_user_id) DO NOTHING;

  -- Suggestion 4: Leaderboard proximity (similar rank)
  INSERT INTO user_suggestions (user_id, suggested_user_id, source, score, reason)
  SELECT
    target_user_id,
    nearby.privy_id,
    'leaderboard_proximity',
    10,
    'Similar rank on leaderboard'
  FROM (
    WITH ranked_users AS (
      SELECT privy_id, total_points, RANK() OVER (ORDER BY total_points DESC) as rank
      FROM users
      WHERE total_points > 0
    )
    SELECT u.privy_id
    FROM ranked_users r1
    JOIN ranked_users r2 ON ABS(r1.rank - r2.rank) <= 10 AND r2.privy_id != target_user_id
    JOIN users u ON u.privy_id = r2.privy_id
    WHERE r1.privy_id = target_user_id
  ) nearby
  JOIN user_privacy_settings ups ON ups.user_id = nearby.privy_id AND ups.appear_in_suggestions = true AND ups.show_leaderboard_rank = true
  WHERE NOT EXISTS (
    SELECT 1 FROM dance_bonds
    WHERE status = 'accepted'
      AND ((requester_id = target_user_id AND recipient_id = nearby.privy_id)
        OR (requester_id = nearby.privy_id AND recipient_id = target_user_id))
  )
  AND NOT EXISTS (
    SELECT 1 FROM user_suggestions
    WHERE user_id = target_user_id AND suggested_user_id = nearby.privy_id
  )
  LIMIT 10
  ON CONFLICT (user_id, suggested_user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIALIZE PRIVACY SETTINGS FOR EXISTING USERS
-- ============================================================================
INSERT INTO user_privacy_settings (user_id)
SELECT privy_id FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_privacy_settings WHERE user_id = users.privy_id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_privacy_settings IS 'User privacy preferences - controls visibility and discoverability';
COMMENT ON TABLE user_suggestions IS 'Pre-computed user suggestions based on various signals';
COMMENT ON TABLE user_search_history IS 'User search history for improving suggestions';
COMMENT ON FUNCTION can_view_profile IS 'Checks if viewer can see target profile based on privacy settings';
COMMENT ON FUNCTION can_message_user IS 'Checks if sender can message recipient based on privacy settings';
COMMENT ON FUNCTION generate_user_suggestions IS 'Generates user suggestions based on bonds, events, location, rank';
