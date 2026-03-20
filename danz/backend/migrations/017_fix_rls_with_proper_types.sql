-- Migration: Fix RLS performance with proper type handling
-- Date: 2025-01-18
-- Description: Final RLS optimization with correct type casting for privy_id (text) vs auth.uid() (uuid)

-- ============================================
-- PART 0: Drop all existing policies first
-- ============================================

-- Events table
DROP POLICY IF EXISTS "events_select_public" ON public.events;
DROP POLICY IF EXISTS "events_insert_authorized" ON public.events;
DROP POLICY IF EXISTS "events_update_authorized" ON public.events;
DROP POLICY IF EXISTS "events_delete_authorized" ON public.events;

-- Event registrations table
DROP POLICY IF EXISTS "event_reg_select_own" ON public.event_registrations;
DROP POLICY IF EXISTS "event_reg_insert_own" ON public.event_registrations;
DROP POLICY IF EXISTS "event_reg_update_own" ON public.event_registrations;
DROP POLICY IF EXISTS "event_reg_delete_own" ON public.event_registrations;

-- Subscription history table
DROP POLICY IF EXISTS "sub_history_select_own" ON public.subscription_history;

-- Users table
DROP POLICY IF EXISTS "users_select_all" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;

-- Achievements table
DROP POLICY IF EXISTS "achievements_select_own" ON public.achievements;

-- Dance bonds table
DROP POLICY IF EXISTS "bonds_select_own" ON public.dance_bonds;

-- Feed posts table
DROP POLICY IF EXISTS "posts_select_visible" ON public.feed_posts;
DROP POLICY IF EXISTS "posts_insert_own" ON public.feed_posts;
DROP POLICY IF EXISTS "posts_update_own" ON public.feed_posts;
DROP POLICY IF EXISTS "posts_delete_own" ON public.feed_posts;

-- Notifications table
DROP POLICY IF EXISTS "notif_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notif_update_own" ON public.notifications;

-- ============================================
-- PART 1: Create optimized function that returns TEXT (matching privy_id type)
-- ============================================

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS text
LANGUAGE sql
STABLE
PARALLEL SAFE
SECURITY DEFINER
SET search_path = ''
AS $$
  -- Try auth.uid() first (if it exists), cast to text
  -- Otherwise use JWT claims directly
  SELECT COALESCE(
    -- Try to use auth.uid() if it exists and cast to text
    CASE
      WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'auth' AND p.proname = 'uid'
      ) THEN auth.uid()::text
      ELSE NULL
    END,
    -- Fallback to JWT claims
    NULLIF(current_setting('request.jwt.claims', true), '')::json->>'sub'
  )
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO anon;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO service_role;

-- ============================================
-- PART 2: Create all policies using the optimized function
-- ============================================

-- Events policies
CREATE POLICY "events_select_public"
ON public.events FOR SELECT
USING (true);  -- All events are public

CREATE POLICY "events_insert_authorized"
ON public.events FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = public.current_user_id()
    AND (
      role IN ('admin', 'manager')
      OR (role = 'organizer' AND is_organizer_approved = true)
    )
  )
);

CREATE POLICY "events_update_authorized"
ON public.events FOR UPDATE
USING (
  facilitator_id = public.current_user_id()
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = public.current_user_id()
    AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "events_delete_authorized"
ON public.events FOR DELETE
USING (
  facilitator_id = public.current_user_id()
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = public.current_user_id()
    AND role IN ('admin', 'manager')
  )
);

-- Event registrations policies
CREATE POLICY "event_reg_select_own"
ON public.event_registrations FOR SELECT
USING (user_id = public.current_user_id());

CREATE POLICY "event_reg_insert_own"
ON public.event_registrations FOR INSERT
WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "event_reg_update_own"
ON public.event_registrations FOR UPDATE
USING (user_id = public.current_user_id());

CREATE POLICY "event_reg_delete_own"
ON public.event_registrations FOR DELETE
USING (user_id = public.current_user_id());

-- Subscription history policy
CREATE POLICY "sub_history_select_own"
ON public.subscription_history FOR SELECT
USING (user_id = public.current_user_id());

-- Users policies
CREATE POLICY "users_select_all"
ON public.users FOR SELECT
USING (true);  -- All profiles are public

CREATE POLICY "users_update_own"
ON public.users FOR UPDATE
USING (privy_id = public.current_user_id());

CREATE POLICY "users_insert_own"
ON public.users FOR INSERT
WITH CHECK (privy_id = public.current_user_id());

-- Achievements policy
CREATE POLICY "achievements_select_own"
ON public.achievements FOR SELECT
USING (user_id = public.current_user_id());

-- Dance bonds policy
CREATE POLICY "bonds_select_own"
ON public.dance_bonds FOR SELECT
USING (
  user1_id = public.current_user_id()
  OR user2_id = public.current_user_id()
);

-- Feed posts policies
CREATE POLICY "posts_select_visible"
ON public.feed_posts FOR SELECT
USING (
  is_public = true
  OR user_id = public.current_user_id()
);

CREATE POLICY "posts_insert_own"
ON public.feed_posts FOR INSERT
WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "posts_update_own"
ON public.feed_posts FOR UPDATE
USING (user_id = public.current_user_id());

CREATE POLICY "posts_delete_own"
ON public.feed_posts FOR DELETE
USING (user_id = public.current_user_id());

-- Notifications policies
CREATE POLICY "notif_select_own"
ON public.notifications FOR SELECT
USING (user_id = public.current_user_id());

CREATE POLICY "notif_update_own"
ON public.notifications FOR UPDATE
USING (user_id = public.current_user_id());

-- ============================================
-- PART 3: Update helper functions to use the new current_user_id()
-- ============================================

DROP FUNCTION IF EXISTS public.user_has_role(text[]);
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
    WHERE privy_id = public.current_user_id()
    AND role = ANY(required_roles)
  )
$$;

DROP FUNCTION IF EXISTS public.is_approved_organizer();
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
    WHERE privy_id = public.current_user_id()
    AND role = 'organizer'
    AND is_organizer_approved = true
  )
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.user_has_role(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved_organizer() TO authenticated;

-- ============================================
-- PART 4: Clean up old functions
-- ============================================

DROP FUNCTION IF EXISTS public.auth_user_id();
DROP FUNCTION IF EXISTS public.auth_user_id;

-- ============================================
-- VERIFICATION
-- ============================================
-- After running this migration, verify:
-- 1. All policies use public.current_user_id() which is optimized
-- 2. No type mismatch errors (privy_id is text, function returns text)
-- 3. Performance warnings should be resolved

/*
-- Check policies are correctly set up:
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  substring(qual, 1, 50) as qual_preview
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check the function exists and returns correct type:
SELECT proname, prorettype::regtype
FROM pg_proc
WHERE proname = 'current_user_id'
AND pronamespace = 'public'::regnamespace;
*/