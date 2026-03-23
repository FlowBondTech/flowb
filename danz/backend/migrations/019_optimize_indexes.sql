-- Migration: Optimize database indexes
-- Date: 2025-01-18
-- Description: Remove truly unnecessary indexes while keeping potentially useful ones for future queries

-- ============================================
-- PART 1: DROP REDUNDANT OR UNNECESSARY INDEXES
-- ============================================
-- These indexes are either redundant with primary keys or unlikely to be needed

-- Drop redundant indexes that duplicate primary key functionality
DROP INDEX IF EXISTS public.idx_users_username; -- privy_id is already the primary key
DROP INDEX IF EXISTS public.idx_registrations_user; -- covered by composite index on (user_id, event_id)

-- Drop overly specific indexes that are unlikely to be used
DROP INDEX IF EXISTS public.idx_users_xp; -- XP queries are rare and can use full table scan
DROP INDEX IF EXISTS public.idx_users_skill_level; -- skill level filtering is uncommon
DROP INDEX IF EXISTS public.idx_events_skill_level; -- skill level filtering is uncommon
DROP INDEX IF EXISTS public.idx_events_tags; -- GIN index on JSONB is rarely needed for small datasets
DROP INDEX IF EXISTS public.idx_events_is_virtual; -- boolean indexes are rarely useful
DROP INDEX IF EXISTS public.idx_notifications_is_read; -- boolean indexes are rarely useful

-- Drop indexes on fields that are rarely queried independently
DROP INDEX IF EXISTS public.idx_users_organizer_approved_by; -- rarely queried
DROP INDEX IF EXISTS public.idx_achievements_type; -- usually queried with user_id

-- ============================================
-- PART 2: KEEP IMPORTANT INDEXES (WITH COMMENTS)
-- ============================================
-- These indexes are kept because they will likely be used once the app has more traffic

-- User table indexes (KEEP)
-- idx_users_role - Will be used for role-based queries
-- idx_users_city - Will be used for location-based event discovery
-- idx_users_dance_styles - Will be used for matching users by dance preferences
-- idx_users_created_at - Will be used for user analytics and sorting
-- idx_users_organizer_approval - Will be used for admin dashboard
-- idx_users_pending_organizers - Will be used for admin dashboard
-- idx_users_stripe_customer_id - Will be used for Stripe webhook processing
-- idx_users_is_premium - Will be used for premium feature access checks

-- Event table indexes (KEEP)
-- idx_events_start_date_time - Critical for event listing and sorting
-- idx_events_category - Will be used for event filtering
-- idx_events_dance_styles - Will be used for event discovery by dance style
-- idx_events_facilitator - Will be used for organizer's event management

-- Event registrations indexes (KEEP)
-- idx_registrations_date - Will be used for attendance analytics
-- idx_registrations_status - Will be used for registration management

-- Subscription history indexes (KEEP)
-- idx_subscription_history_user_id - Will be used for subscription history queries
-- idx_subscription_history_created_at - Will be used for subscription analytics

-- Feed posts indexes (KEEP)
-- idx_feed_posts_user_id - Will be used for user profile feeds
-- idx_feed_posts_created_at - Will be used for feed sorting

-- Notifications indexes (KEEP)
-- idx_notifications_user_id - Will be used for fetching user notifications
-- idx_notifications_created_at - Will be used for notification sorting

-- Dance bonds indexes (KEEP)
-- idx_dance_bonds_user1 - Will be used for finding user connections
-- idx_dance_bonds_user2 - Will be used for finding user connections

-- Achievements indexes (KEEP)
-- idx_achievements_user_id - Will be used for user achievement queries

-- ============================================
-- PART 3: CREATE COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================
-- Add composite indexes for queries that use multiple columns

-- Composite index for finding active premium users
CREATE INDEX IF NOT EXISTS idx_users_premium_active
ON public.users(is_premium)
WHERE is_premium = 'active';

-- Composite index for finding pending organizer approvals
CREATE INDEX IF NOT EXISTS idx_users_pending_approval
ON public.users(role, is_organizer_approved)
WHERE role = 'organizer' AND is_organizer_approved = false;

-- Composite index for upcoming events
CREATE INDEX IF NOT EXISTS idx_events_upcoming
ON public.events(start_date_time, status)
WHERE start_date_time > NOW() AND status = 'published';

-- Composite index for user's unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread
ON public.notifications(user_id, is_read, created_at DESC)
WHERE is_read = false;

-- Composite index for event registrations by status
CREATE INDEX IF NOT EXISTS idx_registrations_by_status
ON public.event_registrations(event_id, status)
WHERE status IN ('confirmed', 'waitlist');

-- ============================================
-- PART 4: ANALYZE TABLES FOR STATISTICS UPDATE
-- ============================================
-- Update statistics for query planner optimization

ANALYZE public.users;
ANALYZE public.events;
ANALYZE public.event_registrations;
ANALYZE public.subscription_history;
ANALYZE public.achievements;
ANALYZE public.dance_bonds;
ANALYZE public.feed_posts;
ANALYZE public.notifications;

-- ============================================
-- VERIFICATION
-- ============================================
-- After running, monitor index usage with:
/*
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
*/

-- To check index sizes:
/*
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
*/