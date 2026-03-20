-- Migration: Fix security issues - RLS and function search paths
-- Date: 2025-01-18
-- Description: Enable RLS on subscription_history table and fix search_path for all functions

-- 1. Enable RLS on subscription_history table
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS policies for subscription_history
-- Policy: Users can only view their own subscription history
CREATE POLICY "Users can view own subscription history"
ON public.subscription_history
FOR SELECT
USING (auth.jwt() ->> 'sub' = user_id);

-- Policy: Only system can insert subscription history (via backend/webhooks)
CREATE POLICY "System can insert subscription history"
ON public.subscription_history
FOR INSERT
WITH CHECK (false);  -- Prevents direct inserts from client, only backend with service role

-- Policy: No updates allowed on subscription history (immutable audit log)
CREATE POLICY "No updates on subscription history"
ON public.subscription_history
FOR UPDATE
USING (false);

-- Policy: No deletes allowed on subscription history (immutable audit log)
CREATE POLICY "No deletes on subscription history"
ON public.subscription_history
FOR DELETE
USING (false);

-- 3. Fix search_path for all functions to prevent search path manipulation attacks
-- Note: Setting search_path to empty string forces all references to be fully qualified

-- Fix update_user_event_stats function
ALTER FUNCTION public.update_user_event_stats()
SET search_path = '';

-- Fix update_user_created_events_count function
ALTER FUNCTION public.update_user_created_events_count()
SET search_path = '';

-- Fix update_user_achievement_count function
ALTER FUNCTION public.update_user_achievement_count()
SET search_path = '';

-- Fix update_user_dance_bonds_count function
ALTER FUNCTION public.update_user_dance_bonds_count()
SET search_path = '';

-- Also fix other trigger functions for consistency and security
ALTER FUNCTION public.update_updated_at_column()
SET search_path = '';

ALTER FUNCTION public.update_event_participant_count()
SET search_path = '';

-- Grant appropriate permissions for subscription_history
-- Backend service role needs full access
GRANT ALL ON public.subscription_history TO service_role;

-- Authenticated users can only SELECT their own records (via RLS)
GRANT SELECT ON public.subscription_history TO authenticated;

-- Anonymous users have no access
REVOKE ALL ON public.subscription_history FROM anon;

-- Add comment explaining the security model
COMMENT ON TABLE public.subscription_history IS 'Immutable audit log of subscription changes. RLS enabled - users can only view their own history. Inserts only via backend service role.';

-- Verify RLS is enabled (for documentation)
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename = 'subscription_history';