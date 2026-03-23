-- Make koh (cryptokoh@gmail.com) an admin
-- This will find the user by looking for the privy_id associated with this email
-- and set is_admin = true

-- First, let's check if we need to add the is_admin column (it should already exist)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Update the user to be admin
-- Since email is not stored in the users table (it's managed by Privy),
-- we need to use the username 'koh' or the privy_id directly
-- Let's update by username 'koh'
UPDATE public.users
SET is_admin = true
WHERE username = 'koh' OR username = 'cryptokoh';

-- If you know the exact privy_id, you can also use:
-- UPDATE public.users
-- SET is_admin = true
-- WHERE privy_id = 'your-privy-id-here';

-- Verify the update
SELECT privy_id, username, display_name, is_admin
FROM public.users
WHERE is_admin = true;
