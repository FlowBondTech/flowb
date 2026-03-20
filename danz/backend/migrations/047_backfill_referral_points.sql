-- Migration: Backfill referral points and increase reward to 250
-- Date: 2025-01-28
-- Description: Awards 250 points per completed referral (retroactively for past referrals)

-- =====================================================
-- STEP 1: Update the default points_awarded in referral_rewards
-- =====================================================

ALTER TABLE public.referral_rewards ALTER COLUMN points_awarded SET DEFAULT 250;

-- =====================================================
-- STEP 2: Update existing referral_rewards entries to 250 points
-- =====================================================

UPDATE public.referral_rewards
SET points_awarded = 250
WHERE points_awarded < 250;

-- =====================================================
-- STEP 3: Identify completed referrals that need rewards
-- =====================================================

-- First, let's find all users who were invited and completed a session
-- but don't have a reward entry yet

-- Create rewards for completed referrals that are missing
INSERT INTO public.referral_rewards (referral_id, user_id, points_awarded)
SELECT
    r.id as referral_id,
    r.referrer_id as user_id,
    250 as points_awarded
FROM public.referrals r
WHERE r.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM public.referral_rewards rr
    WHERE rr.referral_id = r.id
  )
ON CONFLICT (referral_id, user_id) DO UPDATE SET points_awarded = 250;

-- =====================================================
-- STEP 4: Mark referrals as completed based on referred user's sessions
-- =====================================================

-- Update referrals to completed where the referred user has sessions
UPDATE public.referrals r
SET
    status = 'completed',
    completed_at = COALESCE(r.completed_at, NOW())
FROM public.users u
WHERE r.referee_id = u.privy_id
  AND u.total_sessions > 0
  AND r.status != 'completed';

-- =====================================================
-- STEP 5: Create reward entries for newly completed referrals
-- =====================================================

-- Insert rewards for the newly completed referrals
INSERT INTO public.referral_rewards (referral_id, user_id, points_awarded)
SELECT
    r.id as referral_id,
    r.referrer_id as user_id,
    250 as points_awarded
FROM public.referrals r
WHERE r.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM public.referral_rewards rr
    WHERE rr.referral_id = r.id
  )
ON CONFLICT (referral_id, user_id) DO UPDATE SET points_awarded = 250;

-- =====================================================
-- STEP 6: Create missing referral entries from invited_by relationships
-- =====================================================

-- For users who were invited (have invited_by set) but don't have a referral record
INSERT INTO public.referrals (referral_code, referrer_id, referee_id, status, signed_up_at, completed_at)
SELECT
    inviter.username as referral_code,
    inviter.privy_id as referrer_id,
    invitee.privy_id as referee_id,
    CASE WHEN invitee.total_sessions > 0 THEN 'completed' ELSE 'signed_up' END as status,
    invitee.created_at as signed_up_at,
    CASE WHEN invitee.total_sessions > 0 THEN NOW() ELSE NULL END as completed_at
FROM public.users invitee
JOIN public.users inviter ON invitee.invited_by = inviter.username
WHERE invitee.invited_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.referrals r
    WHERE r.referee_id = invitee.privy_id
  )
ON CONFLICT DO NOTHING;

-- Create rewards for these newly created referrals
INSERT INTO public.referral_rewards (referral_id, user_id, points_awarded)
SELECT
    r.id as referral_id,
    r.referrer_id as user_id,
    250 as points_awarded
FROM public.referrals r
WHERE r.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM public.referral_rewards rr
    WHERE rr.referral_id = r.id
  )
ON CONFLICT (referral_id, user_id) DO UPDATE SET points_awarded = 250;

-- =====================================================
-- STEP 7: Update user referral_points_earned based on rewards
-- =====================================================

-- Calculate total referral points for each user from referral_rewards
WITH user_referral_totals AS (
    SELECT
        user_id,
        SUM(points_awarded) as total_referral_points
    FROM public.referral_rewards
    GROUP BY user_id
)
UPDATE public.users u
SET
    referral_points_earned = COALESCE(urt.total_referral_points, 0),
    xp = GREATEST(
        COALESCE(u.xp, 0),
        COALESCE(u.xp, 0) - COALESCE(u.referral_points_earned, 0) + COALESCE(urt.total_referral_points, 0)
    )
FROM user_referral_totals urt
WHERE u.privy_id = urt.user_id;

-- =====================================================
-- STEP 8: Update referral_count for each user
-- =====================================================

WITH completed_counts AS (
    SELECT
        referrer_id,
        COUNT(*) as completed_count
    FROM public.referrals
    WHERE status = 'completed'
    GROUP BY referrer_id
)
UPDATE public.users u
SET referral_count = COALESCE(cc.completed_count, 0)
FROM completed_counts cc
WHERE u.privy_id = cc.referrer_id
  AND (u.referral_count IS NULL OR u.referral_count != cc.completed_count);

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
    total_referrals INT;
    completed_referrals INT;
    total_rewards INT;
    total_points INT;
BEGIN
    SELECT COUNT(*) INTO total_referrals FROM public.referrals;
    SELECT COUNT(*) INTO completed_referrals FROM public.referrals WHERE status = 'completed';
    SELECT COUNT(*) INTO total_rewards FROM public.referral_rewards;
    SELECT COALESCE(SUM(points_awarded), 0) INTO total_points FROM public.referral_rewards;

    RAISE NOTICE 'Referral Points Migration Summary:';
    RAISE NOTICE '  Total referrals: %', total_referrals;
    RAISE NOTICE '  Completed referrals: %', completed_referrals;
    RAISE NOTICE '  Reward entries: %', total_rewards;
    RAISE NOTICE '  Total points awarded: %', total_points;
END $$;

COMMENT ON TABLE public.referral_rewards IS 'Referral reward tracking - 250 points per completed referral (updated 2025-01-28)';
