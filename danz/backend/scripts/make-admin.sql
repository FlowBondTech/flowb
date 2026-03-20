-- SQL script to make a user admin
-- Run this in Supabase SQL Editor after the user has signed up

-- First, check if the user exists and see their current info
-- You'll need to identify the user by their username or privy_id
-- since email is not stored in the database directly

-- Option 1: If you know their username
UPDATE public.users
SET role = 'admin'
WHERE username = 'stepbystephbtm'  -- Replace with actual username
RETURNING privy_id, username, display_name, role;

-- Option 2: If you know their privy_id
-- UPDATE public.users
-- SET role = 'admin'
-- WHERE privy_id = 'did:privy:xxxxx'  -- Replace with actual privy_id
-- RETURNING privy_id, username, display_name, role;

-- To see all users and find the right one:
-- SELECT privy_id, username, display_name, role, created_at
-- FROM public.users
-- ORDER BY created_at DESC
-- LIMIT 20;