-- Migration: Create dance_sessions table
-- Date: 2025-11-07
-- Description: Add dance session tracking with movement metrics, XP, and social features

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create dance_sessions table
CREATE TABLE IF NOT EXISTS public.dance_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,

  -- Duration & Timestamp
  duration INTEGER NOT NULL CHECK (duration > 0),  -- seconds
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL CHECK (ended_at > started_at),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Movement Metrics
  bpm_average FLOAT CHECK (bpm_average >= 0 AND bpm_average <= 250),
  bpm_peak FLOAT CHECK (bpm_peak >= 0 AND bpm_peak <= 250),
  motion_intensity_avg FLOAT CHECK (motion_intensity_avg >= 0 AND motion_intensity_avg <= 1),
  movement_score INTEGER CHECK (movement_score >= 0 AND movement_score <= 100),
  calories_burned INTEGER CHECK (calories_burned >= 0),

  -- XP & Progression
  xp_earned INTEGER NOT NULL CHECK (xp_earned >= 0),
  level_at_session INTEGER CHECK (level_at_session >= 1),
  level_ups INTEGER DEFAULT 0 CHECK (level_ups >= 0),
  achievements_unlocked TEXT[] DEFAULT '{}',

  -- Social Features
  is_shared BOOLEAN DEFAULT false,
  shared_with_user_ids TEXT[] DEFAULT '{}',
  dance_bonds_strengthened TEXT[] DEFAULT '{}',
  social_xp_bonus INTEGER DEFAULT 0 CHECK (social_xp_bonus >= 0),

  -- Metadata
  device_type TEXT,
  app_version TEXT,
  session_quality FLOAT CHECK (session_quality >= 0 AND session_quality <= 1)
);

-- Create indexes for performance
CREATE INDEX idx_dance_sessions_user_id ON public.dance_sessions(user_id);
CREATE INDEX idx_dance_sessions_created_at ON public.dance_sessions(created_at DESC);
CREATE INDEX idx_dance_sessions_user_created ON public.dance_sessions(user_id, created_at DESC);
CREATE INDEX idx_dance_sessions_shared ON public.dance_sessions(is_shared) WHERE is_shared = true;

-- Add updated_at trigger
CREATE TRIGGER update_dance_sessions_updated_at
  BEFORE UPDATE ON public.dance_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.dance_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own sessions
CREATE POLICY "Users can view own dance sessions"
  ON public.dance_sessions
  FOR SELECT
  USING (user_id = auth.uid()::text);

-- Users can view shared sessions they're part of
CREATE POLICY "Users can view shared dance sessions"
  ON public.dance_sessions
  FOR SELECT
  USING (
    is_shared = true
    AND user_id = ANY(shared_with_user_ids::text[])
  );

-- Users can insert their own sessions
CREATE POLICY "Users can create own dance sessions"
  ON public.dance_sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- Users can update their own sessions
CREATE POLICY "Users can update own dance sessions"
  ON public.dance_sessions
  FOR UPDATE
  USING (user_id = auth.uid()::text);

-- Users can delete their own sessions
CREATE POLICY "Users can delete own dance sessions"
  ON public.dance_sessions
  FOR DELETE
  USING (user_id = auth.uid()::text);

-- Add columns to users table for session stats tracking
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS best_movement_score INTEGER DEFAULT 0 CHECK (best_movement_score >= 0 AND best_movement_score <= 100),
  ADD COLUMN IF NOT EXISTS best_session_duration INTEGER DEFAULT 0 CHECK (best_session_duration >= 0),
  ADD COLUMN IF NOT EXISTS total_calories_burned INTEGER DEFAULT 0 CHECK (total_calories_burned >= 0),
  ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0 CHECK (current_streak >= 0),
  ADD COLUMN IF NOT EXISTS last_session_date DATE;

-- Function to update user stats after dance session
CREATE OR REPLACE FUNCTION public.update_user_dance_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user stats
  UPDATE public.users
  SET
    xp = xp + NEW.xp_earned + COALESCE(NEW.social_xp_bonus, 0),
    total_dance_time = COALESCE(total_dance_time, 0) + NEW.duration,
    total_sessions = COALESCE(total_sessions, 0) + 1,
    total_calories_burned = COALESCE(total_calories_burned, 0) + COALESCE(NEW.calories_burned, 0),
    best_movement_score = GREATEST(COALESCE(best_movement_score, 0), COALESCE(NEW.movement_score, 0)),
    best_session_duration = GREATEST(COALESCE(best_session_duration, 0), NEW.duration),
    last_session_date = CURRENT_DATE,
    -- Calculate streak (simplified - just check if last session was yesterday or today)
    current_streak = CASE
      WHEN last_session_date = CURRENT_DATE THEN COALESCE(current_streak, 0)
      WHEN last_session_date = CURRENT_DATE - INTERVAL '1 day' THEN COALESCE(current_streak, 0) + 1
      ELSE 1
    END,
    longest_streak = GREATEST(
      COALESCE(longest_streak, 0),
      CASE
        WHEN last_session_date = CURRENT_DATE THEN COALESCE(current_streak, 0)
        WHEN last_session_date = CURRENT_DATE - INTERVAL '1 day' THEN COALESCE(current_streak, 0) + 1
        ELSE 1
      END
    ),
    updated_at = NOW()
  WHERE privy_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update user stats when dance session is inserted
CREATE TRIGGER update_user_stats_on_dance_session
  AFTER INSERT ON public.dance_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_dance_stats();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dance_sessions TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Comment on table
COMMENT ON TABLE public.dance_sessions IS 'Stores dance session data including movement metrics, XP earned, and social features';
