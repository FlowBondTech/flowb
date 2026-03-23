-- Migration: Update kohxbiz user role to admin
-- Date: 2025-01-28
-- Description: Grant admin access to kohxbiz user for dev panel access

-- Update kohxbiz role to admin
UPDATE public.users
SET role = 'admin'
WHERE username = 'kohxbiz';

-- Verify the update
DO $$
DECLARE
    updated_role TEXT;
BEGIN
    SELECT role INTO updated_role
    FROM public.users
    WHERE username = 'kohxbiz';

    RAISE NOTICE 'Migration 049: Updated kohxbiz role to: %', updated_role;
END $$;
