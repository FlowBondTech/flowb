-- Migration: Freestyle Sessions and Daily Reminders
-- Date: 2025-11-23
-- Description: Add tables for individual freestyle dance sessions with motion tracking and user preferences

-- Freestyle sessions table for individual practice
CREATE TABLE IF NOT EXISTS public.freestyle_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL, -- Max 600 (10 minutes)
  movement_score NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Calculated from phone motion
  points_awarded INTEGER NOT NULL DEFAULT 0,
  session_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  motion_data JSONB NULL, -- Store raw motion metrics for analysis
  music_source TEXT NULL DEFAULT 'licensed', -- 'licensed', 'user_library', or 'none'
  completed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT freestyle_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT freestyle_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(privy_id) ON DELETE CASCADE,
  CONSTRAINT freestyle_sessions_duration_check CHECK (duration_seconds > 0 AND duration_seconds <= 600),
  CONSTRAINT freestyle_sessions_music_source_check CHECK (
    music_source IN ('licensed', 'user_library', 'none')
  )
) TABLESPACE pg_default;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_freestyle_sessions_user_id ON public.freestyle_sessions USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_freestyle_sessions_session_date ON public.freestyle_sessions USING btree (session_date DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_freestyle_sessions_user_date ON public.freestyle_sessions USING btree (user_id, session_date DESC) TABLESPACE pg_default;

-- Trigger for updated_at
CREATE TRIGGER update_freestyle_sessions_updated_at
BEFORE UPDATE ON freestyle_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add user preferences for freestyle sessions to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS daily_reminder_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS daily_reminder_time TIME DEFAULT '09:00:00', -- Default 9 AM
ADD COLUMN IF NOT EXISTS live_sessions_enabled BOOLEAN DEFAULT false; -- For future partner feature

-- Comments for documentation
COMMENT ON TABLE public.freestyle_sessions IS 'Individual freestyle dance sessions with motion tracking and points';
COMMENT ON COLUMN public.freestyle_sessions.duration_seconds IS 'Session duration in seconds, max 600 (10 minutes)';
COMMENT ON COLUMN public.freestyle_sessions.movement_score IS 'Score calculated from phone accelerometer/gyroscope data';
COMMENT ON COLUMN public.freestyle_sessions.points_awarded IS 'Points awarded based on duration and movement quality';
COMMENT ON COLUMN public.freestyle_sessions.motion_data IS 'Raw motion metrics (acceleration, rotation) stored as JSON';
COMMENT ON COLUMN public.users.daily_reminder_enabled IS 'Whether user wants daily dance reminders';
COMMENT ON COLUMN public.users.daily_reminder_time IS 'Preferred time for daily reminders';
COMMENT ON COLUMN public.users.live_sessions_enabled IS 'Whether user wants to participate in live partner sessions (coming soon)';
