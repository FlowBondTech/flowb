-- Migration: Sync referral points to current_points_balance and total_points_earned
-- Date: 2025-12-16
-- Description: Fix users who have referral_points_earned but those points weren't
--              added to current_points_balance or total_points_earned
-- Issue: The referral system was updating referral_points_earned but not the main
--        balance columns, causing the wallet to show 0 balance despite earned points

-- Step 1: Update current_points_balance to include referral_points_earned
-- Only for users where referral_points_earned > 0 and not already reflected in balance
UPDATE public.users
SET
    current_points_balance = COALESCE(current_points_balance, 0) + COALESCE(referral_points_earned, 0),
    total_points_earned = COALESCE(total_points_earned, 0) + COALESCE(referral_points_earned, 0)
WHERE referral_points_earned > 0
  AND (current_points_balance IS NULL OR current_points_balance = 0)
  AND (total_points_earned IS NULL OR total_points_earned = 0);

-- Log the update
DO $$
DECLARE
    users_updated INT;
BEGIN
    GET DIAGNOSTICS users_updated = ROW_COUNT;
    RAISE NOTICE 'Migration 052: Synced referral points to balance for % users', users_updated;
END $$;

-- Show affected users for verification
SELECT
    username,
    current_points_balance,
    total_points_earned,
    referral_points_earned,
    total_points_spent
FROM public.users
WHERE referral_points_earned > 0
ORDER BY referral_points_earned DESC;
