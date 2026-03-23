-- Migration: Fix performance issues - RLS auth initialization and multiple policies
-- Date: 2025-01-18
-- Description: Optimize RLS policies for better performance by fixing auth initialization and consolidating policies

-- ============================================
-- PART 1: Fix auth.jwt() initialization issues
-- ============================================
-- Replace auth.jwt() with (select auth.jwt()) to prevent re-evaluation per row

-- Fix subscription_history policies
DROP POLICY IF EXISTS "Users can view own subscription history" ON public.subscription_history;
CREATE POLICY "Users can view own subscription history"
ON public.subscription_history
FOR SELECT
USING ((select auth.jwt() ->> 'sub') = user_id);

-- Fix events policies
DROP POLICY IF EXISTS "Event creators and admins can delete events" ON public.events;
CREATE POLICY "Event creators and admins can delete events"
ON public.events
FOR DELETE
USING (
  facilitator_id = (select auth.jwt() ->> 'sub')
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = (select auth.jwt() ->> 'sub')
    AND role IN ('admin', 'manager')
  )
);

DROP POLICY IF EXISTS "Event creators can update their events" ON public.events;
CREATE POLICY "Event creators can update their events"
ON public.events
FOR UPDATE
USING (
  facilitator_id = (select auth.jwt() ->> 'sub')
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = (select auth.jwt() ->> 'sub')
    AND role IN ('admin', 'manager')
  )
);

DROP POLICY IF EXISTS "Managers and admins can create events" ON public.events;
CREATE POLICY "Managers and admins can create events"
ON public.events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = (select auth.jwt() ->> 'sub')
    AND role IN ('admin', 'manager', 'organizer')
    AND (role != 'organizer' OR is_organizer_approved = true)
  )
);

-- Fix event_registrations policies
DROP POLICY IF EXISTS "Users can view their registrations" ON public.event_registrations;
CREATE POLICY "Users can view their registrations"
ON public.event_registrations
FOR SELECT
USING (user_id = (select auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS "Users can register for events" ON public.event_registrations;
CREATE POLICY "Users can register for events"
ON public.event_registrations
FOR INSERT
WITH CHECK (user_id = (select auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS "Users can update their registrations" ON public.event_registrations;
CREATE POLICY "Users can update their registrations"
ON public.event_registrations
FOR UPDATE
USING (user_id = (select auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS "Users can cancel their registrations" ON public.event_registrations;
CREATE POLICY "Users can cancel their registrations"
ON public.event_registrations
FOR DELETE
USING (user_id = (select auth.jwt() ->> 'sub'));

-- ============================================
-- PART 2: Fix service role policies
-- ============================================
-- These policies check current_setting which also needs optimization

-- Fix achievements service role policy
DROP POLICY IF EXISTS "service_role_achievements" ON public.achievements;
CREATE POLICY "service_role_achievements"
ON public.achievements
FOR ALL
USING ((select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role')
WITH CHECK ((select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role');

-- Fix dance_bonds service role policy
DROP POLICY IF EXISTS "service_role_dance_bonds" ON public.dance_bonds;
CREATE POLICY "service_role_dance_bonds"
ON public.dance_bonds
FOR ALL
USING ((select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role')
WITH CHECK ((select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role');

-- Fix events service role policy
DROP POLICY IF EXISTS "service_role_events" ON public.events;
CREATE POLICY "service_role_events"
ON public.events
FOR ALL
USING ((select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role')
WITH CHECK ((select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role');

-- Fix feed_posts service role policy
DROP POLICY IF EXISTS "service_role_feed_posts" ON public.feed_posts;
CREATE POLICY "service_role_feed_posts"
ON public.feed_posts
FOR ALL
USING ((select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role')
WITH CHECK ((select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role');

-- Fix notifications service role policy
DROP POLICY IF EXISTS "service_role_notifications" ON public.notifications;
CREATE POLICY "service_role_notifications"
ON public.notifications
FOR ALL
USING ((select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role')
WITH CHECK ((select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role');

-- Fix users service role policy
DROP POLICY IF EXISTS "service_role_users" ON public.users;
CREATE POLICY "service_role_users"
ON public.users
FOR ALL
USING ((select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role')
WITH CHECK ((select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role');

-- ============================================
-- PART 3: Consolidate multiple permissive policies
-- ============================================
-- Multiple policies for the same role/action hurt performance
-- We'll remove service_role policies since service_role bypasses RLS anyway

-- Remove redundant service_role policies (service_role bypasses RLS)
DROP POLICY IF EXISTS "Service role only" ON public.users;

-- For events table, let's check and clean up if there are duplicate policies
-- The "Anyone can view published events" should be the only SELECT policy needed
DROP POLICY IF EXISTS "Public events are visible to all" ON public.events;

-- ============================================
-- PART 4: Add missing index for foreign key
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_organizer_approved_by
ON public.users(organizer_approved_by)
WHERE organizer_approved_by IS NOT NULL;

-- ============================================
-- PART 5: Optional - Document unused indexes
-- ============================================
-- The following indexes are unused and could be removed to improve write performance,
-- but we'll keep them for now as they may be useful for future queries:
--
-- Unused indexes (INFO level - not critical):
-- - idx_users_organizer_approval
-- - idx_users_pending_organizers
-- - idx_users_stripe_customer_id
-- - idx_users_is_premium
-- - idx_subscription_history_user_id
-- - idx_subscription_history_created_at
-- (and many more - these are INFO level only)

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- After running this migration, verify the fixes:

-- Check RLS policies are optimized:
-- SELECT schemaname, tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND (qual LIKE '%auth.jwt()%' OR qual LIKE '%current_setting%')
-- AND qual NOT LIKE '%(select %';

-- Check for multiple permissive policies:
-- SELECT schemaname, tablename, cmd, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- GROUP BY schemaname, tablename, cmd
-- HAVING COUNT(*) > 1;

-- Check foreign key indexes:
-- SELECT
--   c.conname AS constraint_name,
--   c.conrelid::regclass AS table_name,
--   a.attname AS column_name,
--   NOT EXISTS (
--     SELECT 1
--     FROM pg_index i
--     WHERE i.indrelid = c.conrelid
--     AND c.conkey[1] = ANY(i.indkey)
--   ) AS missing_index
-- FROM pg_constraint c
-- JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
-- WHERE c.contype = 'f'
-- AND c.connamespace = 'public'::regnamespace;