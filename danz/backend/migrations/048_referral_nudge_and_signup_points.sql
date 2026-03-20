-- Migration: Add referral nudge tracking and signup points
-- Date: 2025-01-28
-- Description:
--   - Create referral_nudges table to track when referrers nudge their referrals
--   - Add reward_type column to referral_rewards for tracking signup vs completion rewards
--   - Award 20 points for signup, 230 points for completion (250 total)

-- =====================================================
-- STEP 1: Create referral_nudges table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.referral_nudges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
    referrer_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    referee_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    nudge_type TEXT NOT NULL DEFAULT 'email', -- email, sms, push
    nudge_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_referral_nudges_referral ON public.referral_nudges(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_nudges_referrer ON public.referral_nudges(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_nudges_referee ON public.referral_nudges(referee_id);

-- Limit nudges per referral (max 3 per day)
CREATE INDEX IF NOT EXISTS idx_referral_nudges_daily ON public.referral_nudges(referral_id, sent_at);

-- Enable RLS
ALTER TABLE public.referral_nudges ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see nudges they sent
CREATE POLICY "referral_nudges_select_own" ON public.referral_nudges
    FOR SELECT USING (auth.uid()::text = referrer_id);

-- Policy: Users can insert nudges for their referrals
CREATE POLICY "referral_nudges_insert_own" ON public.referral_nudges
    FOR INSERT WITH CHECK (auth.uid()::text = referrer_id);

-- =====================================================
-- STEP 2: Add reward_type column to referral_rewards
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'referral_rewards'
                   AND column_name = 'reward_type') THEN
        ALTER TABLE public.referral_rewards
        ADD COLUMN reward_type TEXT NOT NULL DEFAULT 'completion';
    END IF;
END $$;

-- Add comment for clarity
COMMENT ON COLUMN public.referral_rewards.reward_type IS 'Type of reward: signup (20 pts) or completion (230 pts)';

-- =====================================================
-- STEP 3: Add signup_points_awarded column to referrals
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'referrals'
                   AND column_name = 'signup_points_awarded') THEN
        ALTER TABLE public.referrals
        ADD COLUMN signup_points_awarded BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- =====================================================
-- STEP 4: Award signup points to existing signed_up referrals
-- =====================================================

-- Create signup reward entries for existing referrals that haven't been rewarded yet
INSERT INTO public.referral_rewards (referral_id, user_id, points_awarded, reward_type)
SELECT
    r.id as referral_id,
    r.referrer_id as user_id,
    20 as points_awarded,
    'signup' as reward_type
FROM public.referrals r
WHERE r.signup_points_awarded IS NOT TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.referral_rewards rr
    WHERE rr.referral_id = r.id AND rr.reward_type = 'signup'
  )
ON CONFLICT DO NOTHING;

-- Mark existing referrals as having received signup points
UPDATE public.referrals
SET signup_points_awarded = TRUE
WHERE signup_points_awarded IS NOT TRUE;

-- Update user points for the signup rewards
WITH signup_rewards AS (
    SELECT
        user_id,
        SUM(points_awarded) as total_signup_points
    FROM public.referral_rewards
    WHERE reward_type = 'signup'
    GROUP BY user_id
)
UPDATE public.users u
SET
    xp = COALESCE(u.xp, 0) + COALESCE(sr.total_signup_points, 0),
    referral_points_earned = COALESCE(u.referral_points_earned, 0) + COALESCE(sr.total_signup_points, 0)
FROM signup_rewards sr
WHERE u.privy_id = sr.user_id
  AND NOT EXISTS (
    -- Only update if we haven't already counted these points
    SELECT 1 FROM public.referral_rewards rr
    WHERE rr.user_id = u.privy_id
    AND rr.reward_type = 'signup'
    AND rr.awarded_at < NOW() - INTERVAL '1 minute'
  );

-- =====================================================
-- STEP 5: Add todo for email configuration
-- =====================================================

CREATE TABLE IF NOT EXISTS public.platform_todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    priority TEXT DEFAULT 'medium', -- low, medium, high, critical
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    assigned_to TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Insert email configuration todo
INSERT INTO public.platform_todos (title, description, category, priority)
VALUES (
    'Configure email service for referral nudges',
    'Set up email provider (SendGrid, Resend, or similar) for sending referral nudge emails. Need to:\n- Choose email provider\n- Set up API credentials\n- Create email templates for nudge messages\n- Implement email sending in nudgeReferral mutation',
    'infrastructure',
    'high'
) ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
    nudge_table_exists BOOLEAN;
    reward_type_exists BOOLEAN;
    signup_points_exists BOOLEAN;
    todos_count INT;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'referral_nudges'
    ) INTO nudge_table_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'referral_rewards' AND column_name = 'reward_type'
    ) INTO reward_type_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'referrals' AND column_name = 'signup_points_awarded'
    ) INTO signup_points_exists;

    SELECT COUNT(*) INTO todos_count FROM public.platform_todos;

    RAISE NOTICE 'Migration 048 Summary:';
    RAISE NOTICE '  referral_nudges table: %', CASE WHEN nudge_table_exists THEN 'created' ELSE 'FAILED' END;
    RAISE NOTICE '  reward_type column: %', CASE WHEN reward_type_exists THEN 'added' ELSE 'FAILED' END;
    RAISE NOTICE '  signup_points_awarded column: %', CASE WHEN signup_points_exists THEN 'added' ELSE 'FAILED' END;
    RAISE NOTICE '  platform_todos count: %', todos_count;
END $$;

COMMENT ON TABLE public.referral_nudges IS 'Tracks nudge/reminder messages sent by referrers to their pending referrals';
COMMENT ON TABLE public.platform_todos IS 'Platform development todos and tasks';
