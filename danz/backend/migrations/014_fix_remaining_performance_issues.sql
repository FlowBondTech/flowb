-- Migration: Fix remaining performance issues - Complete RLS optimization
-- Date: 2025-01-18
-- Description: Comprehensive fix for all remaining RLS performance issues and remove service_role policies

-- ============================================
-- PART 1: Remove ALL service_role policies
-- ============================================
-- Service role bypasses RLS anyway, so these policies are redundant and hurt performance

DROP POLICY IF EXISTS "service_role_events" ON public.events;
DROP POLICY IF EXISTS "service_role_users" ON public.users;
DROP POLICY IF EXISTS "service_role_achievements" ON public.achievements;
DROP POLICY IF EXISTS "service_role_dance_bonds" ON public.dance_bonds;
DROP POLICY IF EXISTS "service_role_feed_posts" ON public.feed_posts;
DROP POLICY IF EXISTS "service_role_notifications" ON public.notifications;

-- ============================================
-- PART 2: Fix ALL remaining auth.jwt() issues
-- ============================================
-- Need to wrap EVERY instance, including in EXISTS subqueries

-- Fix events policies (complete rewrite for optimization)
DROP POLICY IF EXISTS "Event creators and admins can delete events" ON public.events;
DROP POLICY IF EXISTS "Event creators can update their events" ON public.events;
DROP POLICY IF EXISTS "Managers and admins can create events" ON public.events;
DROP POLICY IF EXISTS "Anyone can view published events" ON public.events;

-- Optimized SELECT policy for events
CREATE POLICY "events_select_policy"
ON public.events
FOR SELECT
USING (true);  -- All events are public for viewing

-- Optimized INSERT policy for events
CREATE POLICY "events_insert_policy"
ON public.events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = (SELECT auth.jwt() ->> 'sub')
    AND (
      role IN ('admin', 'manager')
      OR (role = 'organizer' AND is_organizer_approved = true)
    )
  )
);

-- Optimized UPDATE policy for events
CREATE POLICY "events_update_policy"
ON public.events
FOR UPDATE
USING (
  facilitator_id = (SELECT auth.jwt() ->> 'sub')
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = (SELECT auth.jwt() ->> 'sub')
    AND role IN ('admin', 'manager')
  )
);

-- Optimized DELETE policy for events
CREATE POLICY "events_delete_policy"
ON public.events
FOR DELETE
USING (
  facilitator_id = (SELECT auth.jwt() ->> 'sub')
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = (SELECT auth.jwt() ->> 'sub')
    AND role IN ('admin', 'manager')
  )
);

-- Fix event_registrations policies (complete rewrite)
DROP POLICY IF EXISTS "Users can view their registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Users can register for events" ON public.event_registrations;
DROP POLICY IF EXISTS "Users can update their registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Users can cancel their registrations" ON public.event_registrations;

-- Optimized policies for event_registrations
CREATE POLICY "event_registrations_select_policy"
ON public.event_registrations
FOR SELECT
USING (user_id = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY "event_registrations_insert_policy"
ON public.event_registrations
FOR INSERT
WITH CHECK (user_id = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY "event_registrations_update_policy"
ON public.event_registrations
FOR UPDATE
USING (user_id = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY "event_registrations_delete_policy"
ON public.event_registrations
FOR DELETE
USING (user_id = (SELECT auth.jwt() ->> 'sub'));

-- Fix subscription_history policy
DROP POLICY IF EXISTS "Users can view own subscription history" ON public.subscription_history;
CREATE POLICY "subscription_history_select_policy"
ON public.subscription_history
FOR SELECT
USING (user_id = (SELECT auth.jwt() ->> 'sub'));

-- ============================================
-- PART 3: Clean up other tables that might have issues
-- ============================================

-- Users table - create simple policies for authenticated users
-- First, ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Create optimized policies
CREATE POLICY "users_select_policy"
ON public.users
FOR SELECT
USING (true);  -- All user profiles are public

CREATE POLICY "users_update_policy"
ON public.users
FOR UPDATE
USING (privy_id = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY "users_insert_policy"
ON public.users
FOR INSERT
WITH CHECK (privy_id = (SELECT auth.jwt() ->> 'sub'));

-- Achievements table - only backend should write
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own achievements" ON public.achievements;

CREATE POLICY "achievements_select_policy"
ON public.achievements
FOR SELECT
USING (user_id = (SELECT auth.jwt() ->> 'sub'));

-- Dance bonds table
ALTER TABLE public.dance_bonds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their bonds" ON public.dance_bonds;

CREATE POLICY "dance_bonds_select_policy"
ON public.dance_bonds
FOR SELECT
USING (
  user1_id = (SELECT auth.jwt() ->> 'sub')
  OR user2_id = (SELECT auth.jwt() ->> 'sub')
);

-- Feed posts table
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public posts are visible" ON public.feed_posts;
DROP POLICY IF EXISTS "Users can manage own posts" ON public.feed_posts;

CREATE POLICY "feed_posts_select_policy"
ON public.feed_posts
FOR SELECT
USING (
  is_public = true
  OR user_id = (SELECT auth.jwt() ->> 'sub')
);

CREATE POLICY "feed_posts_insert_policy"
ON public.feed_posts
FOR INSERT
WITH CHECK (user_id = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY "feed_posts_update_policy"
ON public.feed_posts
FOR UPDATE
USING (user_id = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY "feed_posts_delete_policy"
ON public.feed_posts
FOR DELETE
USING (user_id = (SELECT auth.jwt() ->> 'sub'));

-- Notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;

CREATE POLICY "notifications_select_policy"
ON public.notifications
FOR SELECT
USING (user_id = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY "notifications_update_policy"
ON public.notifications
FOR UPDATE
USING (user_id = (SELECT auth.jwt() ->> 'sub'));

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this after the migration to verify all issues are fixed:
/*
SELECT
  schemaname,
  tablename,
  policyname,
  substring(qual, 1, 100) as policy_check
FROM pg_policies
WHERE schemaname = 'public'
AND (
  qual LIKE '%auth.jwt()%'
  AND qual NOT LIKE '%(SELECT auth.jwt()%'
)
ORDER BY tablename, policyname;
*/

-- This should return 0 rows if all auth.jwt() calls are properly wrapped