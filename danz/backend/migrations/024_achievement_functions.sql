-- Migration: Achievement helper functions
-- Date: 2025-12-31
-- Description: Add RPC functions for achievement system

-- Function to add XP to a user
CREATE OR REPLACE FUNCTION add_user_xp(p_user_id TEXT, p_xp INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET
    xp = COALESCE(xp, 0) + p_xp,
    -- Level up logic: every 1000 XP = 1 level
    level = GREATEST(1, (COALESCE(xp, 0) + p_xp) / 1000 + 1),
    updated_at = NOW()
  WHERE privy_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment total achievements count
CREATE OR REPLACE FUNCTION increment_user_achievements(p_user_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET
    total_achievements = COALESCE(total_achievements, 0) + 1,
    updated_at = NOW()
  WHERE privy_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add points to a user (if not exists)
CREATE OR REPLACE FUNCTION add_user_points(p_user_id TEXT, p_points INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET
    xp = COALESCE(xp, 0) + p_points,
    updated_at = NOW()
  WHERE privy_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Create freestyle_sessions table if not exists
CREATE TABLE IF NOT EXISTS public.freestyle_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  movement_score INTEGER NOT NULL DEFAULT 0,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  music_source TEXT DEFAULT 'licensed',
  motion_data JSONB,
  completed BOOLEAN DEFAULT true,
  session_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT freestyle_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT freestyle_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(privy_id) ON DELETE CASCADE
);

-- Add indexes for freestyle_sessions
CREATE INDEX IF NOT EXISTS idx_freestyle_sessions_user_id ON public.freestyle_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_freestyle_sessions_session_date ON public.freestyle_sessions(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_freestyle_sessions_completed ON public.freestyle_sessions(completed);

-- Grant access
GRANT EXECUTE ON FUNCTION add_user_xp(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_user_achievements(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_points(TEXT, INTEGER) TO authenticated;
