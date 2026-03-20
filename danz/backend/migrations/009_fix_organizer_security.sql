-- Migration: Fix security issues with organizer functions and views
-- Date: 2025-01-11
-- Description: Fixes security warnings from Supabase security advisor

-- Drop and recreate the view without SECURITY DEFINER
DROP VIEW IF EXISTS public.pending_organizer_approvals;

CREATE VIEW public.pending_organizer_approvals AS
SELECT 
    u.privy_id,
    u.username,
    u.display_name,
    u.company_name,
    u.event_types,
    u.invited_by,
    u.social_media_links,
    u.website_url,
    u.organizer_bio,
    u.organizer_requested_at,
    u.created_at
FROM public.users u
WHERE u.role = 'organizer' 
    AND u.is_organizer_approved = FALSE
    AND u.organizer_rejection_reason IS NULL
ORDER BY u.organizer_requested_at DESC;

-- Drop and recreate functions with explicit search_path
DROP FUNCTION IF EXISTS public.approve_organizer(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.approve_organizer(
    organizer_id TEXT,
    admin_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Verify the admin exists and has admin role
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE privy_id = admin_id 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can approve organizers';
    END IF;

    -- Update the organizer
    UPDATE public.users
    SET 
        is_organizer_approved = TRUE,
        organizer_approved_by = admin_id,
        organizer_approved_at = NOW(),
        organizer_rejection_reason = NULL
    WHERE privy_id = organizer_id
        AND role = 'organizer'
        AND is_organizer_approved = FALSE;

    RETURN FOUND;
END;
$$;

-- Drop and recreate reject function with explicit search_path
DROP FUNCTION IF EXISTS public.reject_organizer(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.reject_organizer(
    organizer_id TEXT,
    admin_id TEXT,
    rejection_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Verify the admin exists and has admin role
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE privy_id = admin_id 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can reject organizers';
    END IF;

    -- Update the organizer
    UPDATE public.users
    SET 
        is_organizer_approved = FALSE,
        organizer_rejection_reason = rejection_reason,
        organizer_approved_by = admin_id,
        organizer_approved_at = NOW()
    WHERE privy_id = organizer_id
        AND role = 'organizer';

    RETURN FOUND;
END;
$$;

-- Grant appropriate permissions on the view (if needed)
-- Since you're using Privy auth and service role, this might not be necessary
-- But including for completeness
GRANT SELECT ON public.pending_organizer_approvals TO authenticated;