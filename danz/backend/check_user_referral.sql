-- Check user data and referral code
-- Run this in Supabase SQL editor

-- Check user profile
SELECT privy_id, username, display_name, is_admin
FROM public.users
WHERE username = 'koh' OR username = 'cryptokoh';

-- Check if referral code exists for this user
SELECT rc.*
FROM public.referral_codes rc
JOIN public.users u ON rc.user_id = u.privy_id
WHERE u.username = 'koh' OR u.username = 'cryptokoh';

-- If no referral code exists, you can manually create one
-- (This will be done automatically by the myReferralCode query, but we can check)
