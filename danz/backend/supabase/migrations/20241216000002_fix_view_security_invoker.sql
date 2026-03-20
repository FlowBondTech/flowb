-- Migration: Fix View Security Invoker
-- Date: 2024-12-16
-- Description: Set security_invoker = true on all admin views to prevent SECURITY DEFINER behavior
--
-- In PostgreSQL 15+, views default to running with the owner's permissions (SECURITY DEFINER).
-- We explicitly set security_invoker = true so views run with the querying user's permissions.

-- Set security_invoker = true on all admin views
ALTER VIEW public.admin_user_points_summary SET (security_invoker = true);
ALTER VIEW public.admin_points_overview SET (security_invoker = true);
ALTER VIEW public.referral_fraud_alerts SET (security_invoker = true);
ALTER VIEW public.referral_performance SET (security_invoker = true);
ALTER VIEW public.event_attendance_summary SET (security_invoker = true);

COMMENT ON VIEW public.admin_user_points_summary IS 'User points summary - runs with querying user permissions (security_invoker)';
COMMENT ON VIEW public.admin_points_overview IS 'Points system overview - runs with querying user permissions (security_invoker)';
COMMENT ON VIEW public.referral_fraud_alerts IS 'Referral fraud detection - runs with querying user permissions (security_invoker)';
COMMENT ON VIEW public.referral_performance IS 'Referral performance metrics - runs with querying user permissions (security_invoker)';
COMMENT ON VIEW public.event_attendance_summary IS 'Event attendance statistics - runs with querying user permissions (security_invoker)';
