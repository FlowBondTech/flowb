-- Migration: Add organizer functionality to users
-- Date: 2025-01-11
-- Description: Adds fields for organizer functionality with approval system
-- Note: This system uses Privy for auth, not Supabase auth

-- Add new columns to users table for organizer functionality
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_organizer_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS organizer_approved_by TEXT REFERENCES public.users(privy_id),
ADD COLUMN IF NOT EXISTS organizer_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS event_types TEXT[], -- Array of event types they organize
ADD COLUMN IF NOT EXISTS invited_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS social_media_links JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS website_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS organizer_bio TEXT,
ADD COLUMN IF NOT EXISTS organizer_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS organizer_rejection_reason TEXT;

-- Update role constraint to include 'organizer' as a valid role
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('user', 'manager', 'admin', 'organizer'));

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_users_organizer_approval 
ON public.users(role, is_organizer_approved) 
WHERE role = 'organizer';

CREATE INDEX IF NOT EXISTS idx_users_pending_organizers 
ON public.users(organizer_requested_at) 
WHERE role = 'organizer' AND is_organizer_approved = FALSE;

-- Add comments for clarity
COMMENT ON COLUMN public.users.role IS 'User role: user (regular attendee), manager, admin, or organizer';
COMMENT ON COLUMN public.users.is_organizer_approved IS 'Whether organizer has been approved by admin';
COMMENT ON COLUMN public.users.organizer_approved_by IS 'Admin who approved this organizer';
COMMENT ON COLUMN public.users.company_name IS 'Company name for organizers';
COMMENT ON COLUMN public.users.event_types IS 'Types of events this organizer hosts';
COMMENT ON COLUMN public.users.invited_by IS 'Who invited this organizer to the platform';
COMMENT ON COLUMN public.users.social_media_links IS 'JSON object with social media links';
COMMENT ON COLUMN public.users.website_url IS 'Organizer website URL';
COMMENT ON COLUMN public.users.organizer_bio IS 'Description of organizer and their events';
COMMENT ON COLUMN public.users.organizer_requested_at IS 'When the user requested organizer status';
COMMENT ON COLUMN public.users.organizer_rejection_reason IS 'Reason for rejection if organizer was not approved';

-- Create a view for pending organizer approvals (helpful for admin dashboard)
CREATE OR REPLACE VIEW public.pending_organizer_approvals AS
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

-- Function to approve an organizer (called from backend)
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

-- Function to reject an organizer with reason (called from backend)
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

-- Note: We're not creating RLS policies here since we're using Privy auth
-- All authentication and authorization is handled in the backend API layer
-- The backend connects to Supabase with service role credentials

-- Rollback instructions:
-- ALTER TABLE public.users 
-- DROP COLUMN IF EXISTS is_organizer_approved,
-- DROP COLUMN IF EXISTS organizer_approved_by,
-- DROP COLUMN IF EXISTS organizer_approved_at,
-- DROP COLUMN IF EXISTS company_name,
-- DROP COLUMN IF EXISTS event_types,
-- DROP COLUMN IF EXISTS invited_by,
-- DROP COLUMN IF EXISTS social_media_links,
-- DROP COLUMN IF EXISTS website_url,
-- DROP COLUMN IF EXISTS organizer_bio,
-- DROP COLUMN IF EXISTS organizer_requested_at,
-- DROP COLUMN IF EXISTS organizer_rejection_reason;
-- DROP VIEW IF EXISTS public.pending_organizer_approvals;
-- DROP FUNCTION IF EXISTS public.approve_organizer;
-- DROP FUNCTION IF EXISTS public.reject_organizer;
-- DROP INDEX IF EXISTS idx_users_organizer_approval;
-- DROP INDEX IF EXISTS idx_users_pending_organizers;
-- ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
-- ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'manager', 'admin'));