-- Ensure koh user has username set
-- Migration: Set username for koh user if not already set
-- Date: 2025-11-13

-- First, let's see what privy_ids exist that might be related to cryptokoh@gmail.com
-- We need to find the user by their privy_id or set username if it's null

-- Update username to 'koh' for users who don't have a username but have is_admin set to true
-- This assumes the admin user is the one we want to update
UPDATE public.users
SET username = 'koh'
WHERE is_admin = true
  AND (username IS NULL OR username = '');

-- Verify the update
SELECT privy_id, username, display_name, is_admin, created_at
FROM public.users
WHERE is_admin = true OR username = 'koh';
