-- Migration: Sync referral counts from referrals table to users table
-- Date: 2025-01-28
-- Description: Updates referral_count on users table based on actual referrals

-- Update referral_count for all users based on their actual referrals
WITH referral_counts AS (
    SELECT
        r.referrer_id,
        COUNT(*)::int as actual_count
    FROM public.referrals r
    GROUP BY r.referrer_id
)
UPDATE public.users u
SET referral_count = rc.actual_count
FROM referral_counts rc
WHERE u.privy_id = rc.referrer_id
  AND (u.referral_count IS NULL OR u.referral_count != rc.actual_count);

-- Log the update
DO $$
DECLARE
    users_updated INT;
BEGIN
    GET DIAGNOSTICS users_updated = ROW_COUNT;
    RAISE NOTICE 'Migration 050: Synced referral_count for users';

    -- Show users with referrals for verification
    RAISE NOTICE 'Users with referrals:';
END $$;

-- Show users with referral counts
SELECT
    u.username,
    u.referral_count,
    u.referral_points_earned,
    (SELECT COUNT(*) FROM public.referrals r WHERE r.referrer_id = u.privy_id) as actual_referrals
FROM public.users u
WHERE u.referral_count > 0 OR EXISTS (SELECT 1 FROM public.referrals r WHERE r.referrer_id = u.privy_id);
