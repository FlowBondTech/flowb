-- Migration: Cross-Platform Features
-- Date: 2024-12-05
-- Description: Adds wearable sync, challenges, activity feed, analytics tables for cross-platform support

-- ============================================
-- WEARABLE DEVICES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.wearable_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    device_type TEXT NOT NULL CHECK (device_type IN ('APPLE_WATCH', 'GALAXY_WATCH', 'FITBIT', 'GARMIN', 'XIAOMI', 'WHOOP', 'OURA', 'OTHER')),
    device_name TEXT,
    device_model TEXT,
    firmware_version TEXT,
    last_sync_at TIMESTAMPTZ,
    sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'COMPLETED', 'FAILED')),
    is_primary BOOLEAN DEFAULT false,
    capabilities TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wearable_devices_user_id ON public.wearable_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_wearable_devices_device_type ON public.wearable_devices(device_type);

-- ============================================
-- WEARABLE HEALTH DATA TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.wearable_health_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES public.wearable_devices(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL,
    heart_rate INTEGER,
    heart_rate_variability FLOAT,
    steps INTEGER,
    calories_active INTEGER,
    calories_total INTEGER,
    distance_meters FLOAT,
    floors_climbed INTEGER,
    active_minutes INTEGER,
    sleep_duration_minutes INTEGER,
    sleep_quality_score FLOAT,
    stress_level INTEGER,
    blood_oxygen FLOAT,
    body_temperature FLOAT,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wearable_health_user_id ON public.wearable_health_data(user_id);
CREATE INDEX IF NOT EXISTS idx_wearable_health_device_id ON public.wearable_health_data(device_id);
CREATE INDEX IF NOT EXISTS idx_wearable_health_recorded_at ON public.wearable_health_data(recorded_at);

-- ============================================
-- WEARABLE MOTION DATA TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.wearable_motion_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES public.wearable_devices(id) ON DELETE CASCADE,
    dance_session_id UUID REFERENCES public.dance_sessions(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    accelerometer_x FLOAT,
    accelerometer_y FLOAT,
    accelerometer_z FLOAT,
    gyroscope_x FLOAT,
    gyroscope_y FLOAT,
    gyroscope_z FLOAT,
    motion_intensity FLOAT,
    movement_type TEXT,
    bpm_detected INTEGER,
    rhythm_accuracy FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wearable_motion_user_id ON public.wearable_motion_data(user_id);
CREATE INDEX IF NOT EXISTS idx_wearable_motion_device_id ON public.wearable_motion_data(device_id);
CREATE INDEX IF NOT EXISTS idx_wearable_motion_session_id ON public.wearable_motion_data(dance_session_id);

-- ============================================
-- CHALLENGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    challenge_type TEXT NOT NULL CHECK (challenge_type IN ('DAILY', 'WEEKLY', 'SPECIAL', 'EVENT', 'STREAK', 'SOCIAL')),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD', 'EXTREME')),
    category TEXT NOT NULL CHECK (category IN ('DANCE_TIME', 'MOVEMENT_SCORE', 'CALORIES', 'SOCIAL', 'STREAK', 'EXPLORATION', 'MASTERY', 'COMMUNITY')),
    target_value INTEGER NOT NULL,
    target_unit TEXT NOT NULL,
    time_limit_hours INTEGER,
    xp_reward INTEGER NOT NULL DEFAULT 0,
    points_reward INTEGER NOT NULL DEFAULT 0,
    badge_reward TEXT,
    special_reward JSONB,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    is_repeatable BOOLEAN DEFAULT false,
    cooldown_hours INTEGER,
    max_completions INTEGER,
    min_level INTEGER,
    required_badges TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenges_type ON public.challenges(challenge_type);
CREATE INDEX IF NOT EXISTS idx_challenges_active ON public.challenges(is_active);
CREATE INDEX IF NOT EXISTS idx_challenges_category ON public.challenges(category);

-- ============================================
-- USER CHALLENGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('AVAILABLE', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'CLAIMED')),
    progress INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    completion_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, challenge_id, started_at)
);

CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON public.user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_challenge_id ON public.user_challenges(challenge_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_status ON public.user_challenges(status);

-- ============================================
-- ACTIVITIES TABLE (Activity Feed)
-- ============================================

CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_type TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    target_user_id TEXT REFERENCES public.users(privy_id) ON DELETE SET NULL,
    visibility TEXT NOT NULL DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC', 'FRIENDS', 'PRIVATE')),
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    related_entity_type TEXT,
    related_entity_id TEXT,
    metadata JSONB,
    xp_earned INTEGER,
    points_earned INTEGER,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    is_highlighted BOOLEAN DEFAULT false,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON public.activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_visibility ON public.activities(visibility);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);

-- ============================================
-- ACTIVITY LIKES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.activity_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(activity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_likes_activity_id ON public.activity_likes(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_likes_user_id ON public.activity_likes(user_id);

-- ============================================
-- ACTIVITY COMMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.activity_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_comments_activity_id ON public.activity_comments(activity_id);

-- ============================================
-- HIDDEN ACTIVITIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.hidden_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(activity_id, user_id)
);

-- ============================================
-- ACTIVITY REPORTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.activity_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    reported_by TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANALYTICS EVENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id TEXT REFERENCES public.users(privy_id) ON DELETE SET NULL,
    metadata JSONB,
    platform TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);

-- ============================================
-- DAILY REWARDS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.daily_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    claimed_date DATE NOT NULL,
    reward_type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, claimed_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_rewards_user_id ON public.daily_rewards(user_id);

-- ============================================
-- PUSH TOKENS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);

-- ============================================
-- ADD TELEGRAM_ID TO USERS TABLE
-- ============================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS telegram_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS city TEXT;

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON public.users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_last_active_at ON public.users(last_active_at);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to increment activity likes
CREATE OR REPLACE FUNCTION increment_activity_likes(p_activity_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.activities
    SET likes_count = COALESCE(likes_count, 0) + 1
    WHERE id = p_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement activity likes
CREATE OR REPLACE FUNCTION decrement_activity_likes(p_activity_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.activities
    SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1)
    WHERE id = p_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment activity comments
CREATE OR REPLACE FUNCTION increment_activity_comments(p_activity_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.activities
    SET comments_count = COALESCE(comments_count, 0) + 1
    WHERE id = p_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment user stats (if not exists)
CREATE OR REPLACE FUNCTION increment_user_stats(p_user_id TEXT, p_xp INTEGER DEFAULT 0, p_points INTEGER DEFAULT 0)
RETURNS VOID AS $$
BEGIN
    UPDATE public.users
    SET
        xp = COALESCE(xp, 0) + p_xp,
        total_points = COALESCE(total_points, 0) + p_points,
        updated_at = NOW()
    WHERE privy_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER TO UPDATE TIMESTAMPS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_wearable_devices_updated_at ON public.wearable_devices;
CREATE TRIGGER update_wearable_devices_updated_at
    BEFORE UPDATE ON public.wearable_devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_challenges_updated_at ON public.challenges;
CREATE TRIGGER update_challenges_updated_at
    BEFORE UPDATE ON public.challenges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_challenges_updated_at ON public.user_challenges;
CREATE TRIGGER update_user_challenges_updated_at
    BEFORE UPDATE ON public.user_challenges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED INITIAL DAILY CHALLENGES
-- ============================================

INSERT INTO public.challenges (title, description, challenge_type, difficulty, category, target_value, target_unit, xp_reward, points_reward, is_active)
VALUES
    ('First Steps', 'Complete your first dance session of the day', 'DAILY', 'EASY', 'DANCE_TIME', 1, 'sessions', 50, 10, true),
    ('15 Minute Flow', 'Dance for at least 15 minutes today', 'DAILY', 'EASY', 'DANCE_TIME', 15, 'minutes', 100, 25, true),
    ('Calorie Crusher', 'Burn 100 calories through dancing', 'DAILY', 'MEDIUM', 'CALORIES', 100, 'calories', 150, 40, true),
    ('Score Chaser', 'Achieve a movement score of 80 or higher', 'DAILY', 'MEDIUM', 'MOVEMENT_SCORE', 80, 'score', 200, 50, true),
    ('Social Dancer', 'Share a dance session with friends', 'DAILY', 'EASY', 'SOCIAL', 1, 'shares', 75, 20, true),
    ('Weekly Warrior', 'Complete 5 dance sessions this week', 'WEEKLY', 'MEDIUM', 'DANCE_TIME', 5, 'sessions', 500, 150, true),
    ('Hour of Power', 'Dance for a total of 60 minutes this week', 'WEEKLY', 'MEDIUM', 'DANCE_TIME', 60, 'minutes', 400, 100, true),
    ('Streak Master', 'Maintain a 7-day dance streak', 'WEEKLY', 'HARD', 'STREAK', 7, 'days', 750, 200, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE public.wearable_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_health_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_motion_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Service role policies (full access for backend)
CREATE POLICY "Service role full access wearable_devices" ON public.wearable_devices FOR ALL USING (true);
CREATE POLICY "Service role full access wearable_health_data" ON public.wearable_health_data FOR ALL USING (true);
CREATE POLICY "Service role full access wearable_motion_data" ON public.wearable_motion_data FOR ALL USING (true);
CREATE POLICY "Service role full access challenges" ON public.challenges FOR ALL USING (true);
CREATE POLICY "Service role full access user_challenges" ON public.user_challenges FOR ALL USING (true);
CREATE POLICY "Service role full access activities" ON public.activities FOR ALL USING (true);
CREATE POLICY "Service role full access activity_likes" ON public.activity_likes FOR ALL USING (true);
CREATE POLICY "Service role full access activity_comments" ON public.activity_comments FOR ALL USING (true);
CREATE POLICY "Service role full access analytics_events" ON public.analytics_events FOR ALL USING (true);
CREATE POLICY "Service role full access daily_rewards" ON public.daily_rewards FOR ALL USING (true);
CREATE POLICY "Service role full access push_tokens" ON public.push_tokens FOR ALL USING (true);
