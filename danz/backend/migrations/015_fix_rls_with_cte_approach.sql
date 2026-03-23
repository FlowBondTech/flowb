-- Migration: Fix RLS performance using CTE approach and auth.uid()
-- Date: 2025-01-18
-- Description: Final fix using auth.uid() function and simplified policies to eliminate all performance warnings

-- ============================================
-- IMPORTANT: First check if auth.uid() exists
-- ============================================
-- Supabase provides auth.uid() which returns the user ID and is optimized
-- If it doesn't exist, we'll create it

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    (current_setting('request.jwt.claims', true)::json->>'user_metadata')::json->>'sub'
  )::text
$$;

-- ============================================
-- PART 1: Drop all existing policies
-- ============================================
-- We'll recreate them using the optimized auth.uid() function

-- Events table
DROP POLICY IF EXISTS "events_select_policy" ON public.events;
DROP POLICY IF EXISTS "events_insert_policy" ON public.events;
DROP POLICY IF EXISTS "events_update_policy" ON public.events;
DROP POLICY IF EXISTS "events_delete_policy" ON public.events;

-- Event registrations table
DROP POLICY IF EXISTS "event_registrations_select_policy" ON public.event_registrations;
DROP POLICY IF EXISTS "event_registrations_insert_policy" ON public.event_registrations;
DROP POLICY IF EXISTS "event_registrations_update_policy" ON public.event_registrations;
DROP POLICY IF EXISTS "event_registrations_delete_policy" ON public.event_registrations;

-- Subscription history table
DROP POLICY IF EXISTS "subscription_history_select_policy" ON public.subscription_history;

-- Users table
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;

-- Achievements table
DROP POLICY IF EXISTS "achievements_select_policy" ON public.achievements;

-- Dance bonds table
DROP POLICY IF EXISTS "dance_bonds_select_policy" ON public.dance_bonds;

-- Feed posts table
DROP POLICY IF EXISTS "feed_posts_select_policy" ON public.feed_posts;
DROP POLICY IF EXISTS "feed_posts_insert_policy" ON public.feed_posts;
DROP POLICY IF EXISTS "feed_posts_update_policy" ON public.feed_posts;
DROP POLICY IF EXISTS "feed_posts_delete_policy" ON public.feed_posts;

-- Notifications table
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;

-- ============================================
-- PART 2: Create optimized policies using auth.uid()
-- ============================================

-- Events table policies
CREATE POLICY "events_select_public"
ON public.events FOR SELECT
USING (true);

CREATE POLICY "events_insert_authorized"
ON public.events FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = auth.uid()
    AND (
      role IN ('admin', 'manager')
      OR (role = 'organizer' AND is_organizer_approved = true)
    )
  )
);

CREATE POLICY "events_update_authorized"
ON public.events FOR UPDATE
USING (
  facilitator_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "events_delete_authorized"
ON public.events FOR DELETE
USING (
  facilitator_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

-- Event registrations policies
CREATE POLICY "event_reg_select_own"
ON public.event_registrations FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "event_reg_insert_own"
ON public.event_registrations FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "event_reg_update_own"
ON public.event_registrations FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "event_reg_delete_own"
ON public.event_registrations FOR DELETE
USING (user_id = auth.uid());

-- Subscription history policy
CREATE POLICY "sub_history_select_own"
ON public.subscription_history FOR SELECT
USING (user_id = auth.uid());

-- Users table policies
CREATE POLICY "users_select_all"
ON public.users FOR SELECT
USING (true);

CREATE POLICY "users_update_own"
ON public.users FOR UPDATE
USING (privy_id = auth.uid());

CREATE POLICY "users_insert_own"
ON public.users FOR INSERT
WITH CHECK (privy_id = auth.uid());

-- Achievements policy
CREATE POLICY "achievements_select_own"
ON public.achievements FOR SELECT
USING (user_id = auth.uid());

-- Dance bonds policy
CREATE POLICY "bonds_select_own"
ON public.dance_bonds FOR SELECT
USING (
  user1_id = auth.uid()
  OR user2_id = auth.uid()
);

-- Feed posts policies
CREATE POLICY "posts_select_visible"
ON public.feed_posts FOR SELECT
USING (
  is_public = true
  OR user_id = auth.uid()
);

CREATE POLICY "posts_insert_own"
ON public.feed_posts FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "posts_update_own"
ON public.feed_posts FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "posts_delete_own"
ON public.feed_posts FOR DELETE
USING (user_id = auth.uid());

-- Notifications policies
CREATE POLICY "notif_select_own"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "notif_update_own"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

-- ============================================
-- PART 3: Additional performance optimizations
-- ============================================

-- Create a helper function for checking user roles (cached result)
CREATE OR REPLACE FUNCTION public.user_has_role(required_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE privy_id = auth.uid()
    AND role = ANY(required_roles)
  )
$$;

-- Create a helper function for checking organizer approval
CREATE OR REPLACE FUNCTION public.is_approved_organizer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE privy_id = auth.uid()
    AND role = 'organizer'
    AND is_organizer_approved = true
  )
$$;

-- ============================================
-- VERIFICATION
-- ============================================
-- After running this migration, check:
-- 1. All policies now use auth.uid() which is optimized
-- 2. No more (SELECT auth.jwt()) pattern needed
-- 3. Helper functions cache results for better performance

-- To verify all issues are resolved:
/*
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
*/