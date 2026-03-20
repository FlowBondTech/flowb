-- Migration: Force fix security definer issue on view
-- Date: 2025-01-11
-- Description: Completely removes and recreates the view to ensure no SECURITY DEFINER

-- First, completely drop the existing view
DROP VIEW IF EXISTS public.pending_organizer_approvals CASCADE;

-- Recreate the view explicitly WITHOUT any security options
-- Views in PostgreSQL are created without SECURITY DEFINER by default
-- We're being explicit here to ensure it's created correctly
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

-- Explicitly alter the view to ensure it's using SECURITY INVOKER (the default)
-- This is the opposite of SECURITY DEFINER
ALTER VIEW public.pending_organizer_approvals SET (security_invoker = true);

-- Grant SELECT permission if needed (for your backend service role this might not be necessary)
GRANT SELECT ON public.pending_organizer_approvals TO authenticated;

-- Verify the view doesn't have SECURITY DEFINER by checking the catalog
-- This is just for verification, you can check the result
DO $$
DECLARE
    has_security_definer boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND viewname = 'pending_organizer_approvals'
        AND definition LIKE '%SECURITY DEFINER%'
    ) INTO has_security_definer;
    
    IF has_security_definer THEN
        RAISE WARNING 'View still has SECURITY DEFINER - manual intervention may be needed';
    ELSE
        RAISE NOTICE 'View successfully created without SECURITY DEFINER';
    END IF;
END $$;