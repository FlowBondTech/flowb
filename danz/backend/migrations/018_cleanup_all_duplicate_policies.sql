-- Migration: Complete cleanup of all duplicate RLS policies
-- Date: 2025-01-18
-- Description: Drop ALL existing policies and create a single optimized set

-- ============================================
-- PART 1: DROP ALL EXISTING POLICIES
-- ============================================
-- We need to drop ALL policies to ensure no duplicates

DO $$
DECLARE
  pol RECORD;
BEGIN
  -- Drop all policies on all tables in public schema
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                   pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- ============================================
-- PART 2: Enable RLS on all required tables
-- ============================================
-- Ensure RLS is enabled for all tables that need policies
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dance_bonds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 3: Ensure current_user_id() function exists
-- ============================================
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS text
LANGUAGE sql
STABLE
PARALLEL SAFE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true), '')::json->>'sub'
$$;

GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO anon;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO service_role;

-- ============================================
-- PART 4: CREATE SINGLE SET OF OPTIMIZED POLICIES
-- ============================================

-- EVENTS TABLE
CREATE POLICY "events_select" ON public.events
FOR SELECT USING (true);

CREATE POLICY "events_insert" ON public.events
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = public.current_user_id()
    AND (
      role IN ('admin', 'manager')
      OR (role = 'organizer' AND is_organizer_approved = true)
    )
  )
);

CREATE POLICY "events_update" ON public.events
FOR UPDATE USING (
  facilitator_id = public.current_user_id()
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = public.current_user_id()
    AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "events_delete" ON public.events
FOR DELETE USING (
  facilitator_id = public.current_user_id()
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = public.current_user_id()
    AND role IN ('admin', 'manager')
  )
);

-- EVENT_REGISTRATIONS TABLE
CREATE POLICY "event_reg_select" ON public.event_registrations
FOR SELECT USING (user_id = public.current_user_id());

CREATE POLICY "event_reg_insert" ON public.event_registrations
FOR INSERT WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "event_reg_update" ON public.event_registrations
FOR UPDATE USING (user_id = public.current_user_id());

CREATE POLICY "event_reg_delete" ON public.event_registrations
FOR DELETE USING (user_id = public.current_user_id());

-- SUBSCRIPTION_HISTORY TABLE
CREATE POLICY "sub_history_select" ON public.subscription_history
FOR SELECT USING (user_id = public.current_user_id());

-- Block direct inserts/updates/deletes (only backend service can modify)
CREATE POLICY "sub_history_no_insert" ON public.subscription_history
FOR INSERT WITH CHECK (false);

CREATE POLICY "sub_history_no_update" ON public.subscription_history
FOR UPDATE USING (false);

CREATE POLICY "sub_history_no_delete" ON public.subscription_history
FOR DELETE USING (false);

-- USERS TABLE
CREATE POLICY "users_select" ON public.users
FOR SELECT USING (true);

CREATE POLICY "users_insert" ON public.users
FOR INSERT WITH CHECK (privy_id = public.current_user_id());

CREATE POLICY "users_update" ON public.users
FOR UPDATE USING (privy_id = public.current_user_id());

-- No delete policy for users (handled by backend)

-- ACHIEVEMENTS TABLE
CREATE POLICY "achievements_select" ON public.achievements
FOR SELECT USING (user_id = public.current_user_id());

-- No insert/update/delete policies (backend only)

-- DANCE_BONDS TABLE
CREATE POLICY "bonds_select" ON public.dance_bonds
FOR SELECT USING (
  user1_id = public.current_user_id()
  OR user2_id = public.current_user_id()
);

-- No insert/update/delete policies (backend only)

-- FEED_POSTS TABLE
CREATE POLICY "posts_select" ON public.feed_posts
FOR SELECT USING (
  is_public = true
  OR user_id = public.current_user_id()
);

CREATE POLICY "posts_insert" ON public.feed_posts
FOR INSERT WITH CHECK (user_id = public.current_user_id());

CREATE POLICY "posts_update" ON public.feed_posts
FOR UPDATE USING (user_id = public.current_user_id());

CREATE POLICY "posts_delete" ON public.feed_posts
FOR DELETE USING (user_id = public.current_user_id());

-- NOTIFICATIONS TABLE
CREATE POLICY "notif_select" ON public.notifications
FOR SELECT USING (user_id = public.current_user_id());

CREATE POLICY "notif_update" ON public.notifications
FOR UPDATE USING (user_id = public.current_user_id());

-- No insert/delete policies (backend only)

-- ============================================
-- VERIFICATION
-- ============================================
-- After running, check that each table has only ONE policy per action:
/*
SELECT
  tablename,
  cmd,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ') as policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename, cmd
ORDER BY tablename, cmd;
*/

-- This should show only 1 policy per table/action combination