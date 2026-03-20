-- Migration: Fix RLS performance - Final solution without auth schema modifications
-- Date: 2025-01-18
-- Description: Use Supabase's built-in auth.uid() or create helper in public schema

-- ============================================
-- PART 0: Create helper function in public schema
-- ============================================
-- Since we can't modify auth schema, create our own optimized function

CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS text
LANGUAGE sql
STABLE
PARALLEL SAFE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true), '')::json->>'sub'
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.auth_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_id() TO anon;

-- ============================================
-- PART 1: Drop all existing policies
-- ============================================

-- Events table
DROP POLICY IF EXISTS "events_select_policy" ON public.events;
DROP POLICY IF EXISTS "events_insert_policy" ON public.events;
DROP POLICY IF EXISTS "events_update_policy" ON public.events;
DROP POLICY IF EXISTS "events_delete_policy" ON public.events;
DROP POLICY IF EXISTS "events_select_public" ON public.events;
DROP POLICY IF EXISTS "events_insert_authorized" ON public.events;
DROP POLICY IF EXISTS "events_update_authorized" ON public.events;
DROP POLICY IF EXISTS "events_delete_authorized" ON public.events;

-- Event registrations table
DROP POLICY IF EXISTS "event_registrations_select_policy" ON public.event_registrations;
DROP POLICY IF EXISTS "event_registrations_insert_policy" ON public.event_registrations;
DROP POLICY IF EXISTS "event_registrations_update_policy" ON public.event_registrations;
DROP POLICY IF EXISTS "event_registrations_delete_policy" ON public.event_registrations;
DROP POLICY IF EXISTS "event_reg_select_own" ON public.event_registrations;
DROP POLICY IF EXISTS "event_reg_insert_own" ON public.event_registrations;
DROP POLICY IF EXISTS "event_reg_update_own" ON public.event_registrations;
DROP POLICY IF EXISTS "event_reg_delete_own" ON public.event_registrations;

-- Subscription history table
DROP POLICY IF EXISTS "subscription_history_select_policy" ON public.subscription_history;
DROP POLICY IF EXISTS "sub_history_select_own" ON public.subscription_history;

-- Users table
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_select_all" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;

-- Achievements table
DROP POLICY IF EXISTS "achievements_select_policy" ON public.achievements;
DROP POLICY IF EXISTS "achievements_select_own" ON public.achievements;

-- Dance bonds table
DROP POLICY IF EXISTS "dance_bonds_select_policy" ON public.dance_bonds;
DROP POLICY IF EXISTS "bonds_select_own" ON public.dance_bonds;

-- Feed posts table
DROP POLICY IF EXISTS "feed_posts_select_policy" ON public.feed_posts;
DROP POLICY IF EXISTS "feed_posts_insert_policy" ON public.feed_posts;
DROP POLICY IF EXISTS "feed_posts_update_policy" ON public.feed_posts;
DROP POLICY IF EXISTS "feed_posts_delete_policy" ON public.feed_posts;
DROP POLICY IF EXISTS "posts_select_visible" ON public.feed_posts;
DROP POLICY IF EXISTS "posts_insert_own" ON public.feed_posts;
DROP POLICY IF EXISTS "posts_update_own" ON public.feed_posts;
DROP POLICY IF EXISTS "posts_delete_own" ON public.feed_posts;

-- Notifications table
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
DROP POLICY IF EXISTS "notif_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notif_update_own" ON public.notifications;

-- ============================================
-- PART 2: Create optimized policies using auth.uid() if available, else our function
-- ============================================

-- First, let's check if auth.uid() exists and use it, otherwise use our function
DO $$
BEGIN
  -- Check if auth.uid() exists
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    -- Use auth.uid()

    -- Events policies
    EXECUTE 'CREATE POLICY "events_select_public" ON public.events FOR SELECT USING (true)';

    EXECUTE 'CREATE POLICY "events_insert_authorized" ON public.events FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE privy_id = auth.uid()
        AND (role IN (''admin'', ''manager'') OR (role = ''organizer'' AND is_organizer_approved = true))
      )
    )';

    EXECUTE 'CREATE POLICY "events_update_authorized" ON public.events FOR UPDATE USING (
      facilitator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE privy_id = auth.uid() AND role IN (''admin'', ''manager'')
      )
    )';

    EXECUTE 'CREATE POLICY "events_delete_authorized" ON public.events FOR DELETE USING (
      facilitator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE privy_id = auth.uid() AND role IN (''admin'', ''manager'')
      )
    )';

    -- Event registrations
    EXECUTE 'CREATE POLICY "event_reg_select_own" ON public.event_registrations FOR SELECT USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "event_reg_insert_own" ON public.event_registrations FOR INSERT WITH CHECK (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "event_reg_update_own" ON public.event_registrations FOR UPDATE USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "event_reg_delete_own" ON public.event_registrations FOR DELETE USING (user_id = auth.uid())';

    -- Subscription history
    EXECUTE 'CREATE POLICY "sub_history_select_own" ON public.subscription_history FOR SELECT USING (user_id = auth.uid())';

    -- Users
    EXECUTE 'CREATE POLICY "users_select_all" ON public.users FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (privy_id = auth.uid())';
    EXECUTE 'CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (privy_id = auth.uid())';

    -- Achievements
    EXECUTE 'CREATE POLICY "achievements_select_own" ON public.achievements FOR SELECT USING (user_id = auth.uid())';

    -- Dance bonds
    EXECUTE 'CREATE POLICY "bonds_select_own" ON public.dance_bonds FOR SELECT USING (user1_id = auth.uid() OR user2_id = auth.uid())';

    -- Feed posts
    EXECUTE 'CREATE POLICY "posts_select_visible" ON public.feed_posts FOR SELECT USING (is_public = true OR user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "posts_insert_own" ON public.feed_posts FOR INSERT WITH CHECK (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "posts_update_own" ON public.feed_posts FOR UPDATE USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "posts_delete_own" ON public.feed_posts FOR DELETE USING (user_id = auth.uid())';

    -- Notifications
    EXECUTE 'CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE USING (user_id = auth.uid())';

  ELSE
    -- Use our custom function

    -- Events policies
    EXECUTE 'CREATE POLICY "events_select_public" ON public.events FOR SELECT USING (true)';

    EXECUTE 'CREATE POLICY "events_insert_authorized" ON public.events FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE privy_id = public.auth_user_id()
        AND (role IN (''admin'', ''manager'') OR (role = ''organizer'' AND is_organizer_approved = true))
      )
    )';

    EXECUTE 'CREATE POLICY "events_update_authorized" ON public.events FOR UPDATE USING (
      facilitator_id = public.auth_user_id()
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE privy_id = public.auth_user_id() AND role IN (''admin'', ''manager'')
      )
    )';

    EXECUTE 'CREATE POLICY "events_delete_authorized" ON public.events FOR DELETE USING (
      facilitator_id = public.auth_user_id()
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE privy_id = public.auth_user_id() AND role IN (''admin'', ''manager'')
      )
    )';

    -- Event registrations
    EXECUTE 'CREATE POLICY "event_reg_select_own" ON public.event_registrations FOR SELECT USING (user_id = public.auth_user_id())';
    EXECUTE 'CREATE POLICY "event_reg_insert_own" ON public.event_registrations FOR INSERT WITH CHECK (user_id = public.auth_user_id())';
    EXECUTE 'CREATE POLICY "event_reg_update_own" ON public.event_registrations FOR UPDATE USING (user_id = public.auth_user_id())';
    EXECUTE 'CREATE POLICY "event_reg_delete_own" ON public.event_registrations FOR DELETE USING (user_id = public.auth_user_id())';

    -- Subscription history
    EXECUTE 'CREATE POLICY "sub_history_select_own" ON public.subscription_history FOR SELECT USING (user_id = public.auth_user_id())';

    -- Users
    EXECUTE 'CREATE POLICY "users_select_all" ON public.users FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (privy_id = public.auth_user_id())';
    EXECUTE 'CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (privy_id = public.auth_user_id())';

    -- Achievements
    EXECUTE 'CREATE POLICY "achievements_select_own" ON public.achievements FOR SELECT USING (user_id = public.auth_user_id())';

    -- Dance bonds
    EXECUTE 'CREATE POLICY "bonds_select_own" ON public.dance_bonds FOR SELECT USING (user1_id = public.auth_user_id() OR user2_id = public.auth_user_id())';

    -- Feed posts
    EXECUTE 'CREATE POLICY "posts_select_visible" ON public.feed_posts FOR SELECT USING (is_public = true OR user_id = public.auth_user_id())';
    EXECUTE 'CREATE POLICY "posts_insert_own" ON public.feed_posts FOR INSERT WITH CHECK (user_id = public.auth_user_id())';
    EXECUTE 'CREATE POLICY "posts_update_own" ON public.feed_posts FOR UPDATE USING (user_id = public.auth_user_id())';
    EXECUTE 'CREATE POLICY "posts_delete_own" ON public.feed_posts FOR DELETE USING (user_id = public.auth_user_id())';

    -- Notifications
    EXECUTE 'CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT USING (user_id = public.auth_user_id())';
    EXECUTE 'CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE USING (user_id = public.auth_user_id())';
  END IF;
END $$;

-- ============================================
-- PART 3: Create additional helper functions in public schema
-- ============================================

CREATE OR REPLACE FUNCTION public.user_has_role(required_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
PARALLEL SAFE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE privy_id = public.auth_user_id()
    AND role = ANY(required_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_approved_organizer()
RETURNS boolean
LANGUAGE sql
STABLE
PARALLEL SAFE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE privy_id = public.auth_user_id()
    AND role = 'organizer'
    AND is_organizer_approved = true
  )
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.user_has_role(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved_organizer() TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================
-- Check that policies are using optimized functions:
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