-- Migration: Username Change Requests
-- Date: 2025-01-28
-- Description: Creates table for tracking username change requests with approval workflow

-- Create enum for status if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'username_change_status') THEN
        CREATE TYPE username_change_status AS ENUM ('pending', 'approved', 'rejected', 'auto_approved');
    END IF;
END$$;

-- Create the username change requests table
CREATE TABLE IF NOT EXISTS public.username_change_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    current_username TEXT NOT NULL DEFAULT '',
    requested_username TEXT NOT NULL,
    reason TEXT,
    status username_change_status NOT NULL DEFAULT 'pending',
    admin_note TEXT,
    reviewed_by TEXT REFERENCES public.users(privy_id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_username_change_requests_user_id
    ON public.username_change_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_username_change_requests_status
    ON public.username_change_requests(status);

CREATE INDEX IF NOT EXISTS idx_username_change_requests_requested_username
    ON public.username_change_requests(requested_username);

CREATE INDEX IF NOT EXISTS idx_username_change_requests_created_at
    ON public.username_change_requests(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_username_change_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_username_change_requests_updated_at ON public.username_change_requests;
CREATE TRIGGER trigger_update_username_change_requests_updated_at
    BEFORE UPDATE ON public.username_change_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_username_change_requests_updated_at();

-- Enable RLS
ALTER TABLE public.username_change_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own requests
CREATE POLICY "Users can view own username change requests"
    ON public.username_change_requests
    FOR SELECT
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Users can insert their own requests
CREATE POLICY "Users can create own username change requests"
    ON public.username_change_requests
    FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Users can delete their own pending requests
CREATE POLICY "Users can delete own pending username change requests"
    ON public.username_change_requests
    FOR DELETE
    USING (
        user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        AND status = 'pending'
    );

-- Admins can view all requests
CREATE POLICY "Admins can view all username change requests"
    ON public.username_change_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE privy_id = current_setting('request.jwt.claims', true)::json->>'sub'
            AND (is_admin = true OR role = 'admin')
        )
    );

-- Admins can update all requests
CREATE POLICY "Admins can update all username change requests"
    ON public.username_change_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE privy_id = current_setting('request.jwt.claims', true)::json->>'sub'
            AND (is_admin = true OR role = 'admin')
        )
    );

-- Service role has full access (for backend operations)
CREATE POLICY "Service role has full access to username change requests"
    ON public.username_change_requests
    FOR ALL
    USING (current_setting('role', true) = 'service_role');

COMMENT ON TABLE public.username_change_requests IS 'Tracks username change requests. First change is auto-approved, subsequent changes require admin review.';
COMMENT ON COLUMN public.username_change_requests.status IS 'pending: awaiting review, approved: admin approved, rejected: admin rejected, auto_approved: first change auto-approved';
