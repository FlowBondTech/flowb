-- Migration: Create Welcome Notifications from Earliest User Activity
-- Date: 2024-12-17
-- Description: Create welcome notifications for all users backdated to their earliest activity

-- ===== Create Welcome Notifications Based on Earliest Activity =====

INSERT INTO public.notifications (
  id,
  recipient_id,
  type,
  title,
  message,
  data,
  read,
  created_at,
  sender_type,
  is_broadcast,
  action_type,
  push_sent,
  expires_at
)
SELECT
  gen_random_uuid(),
  earliest.user_id,
  'system',
  'Welcome to DANZ!',
  'Get ready to dance, earn, and connect with the community. Your journey starts now!',
  jsonb_build_object(
    'notification_subtype', 'welcome',
    'earliest_activity', earliest.earliest_activity,
    'activity_count', earliest.activity_count
  ),
  false, -- Unread by default
  earliest.earliest_activity, -- Backdate to earliest activity
  'system',
  false,
  'onboarding',
  false, -- Don't send push for historical notification
  NULL -- No expiration
FROM (
  -- Find earliest activity timestamp per user across all tables
  SELECT
    user_id,
    MIN(activity_time) as earliest_activity,
    COUNT(*) as activity_count
  FROM (
    -- User creation
    SELECT privy_id as user_id, created_at as activity_time FROM public.users
    UNION ALL
    -- Event registrations
    SELECT user_id, created_at FROM public.event_registrations WHERE user_id IS NOT NULL
    UNION ALL
    -- Posts
    SELECT user_id::text, created_at FROM public.posts WHERE user_id IS NOT NULL
    UNION ALL
    -- Post likes
    SELECT user_id::text, created_at FROM public.post_likes WHERE user_id IS NOT NULL
    UNION ALL
    -- Post comments
    SELECT user_id::text, created_at FROM public.post_comments WHERE user_id IS NOT NULL
    UNION ALL
    -- Freestyle sessions
    SELECT user_id, created_at FROM public.freestyle_sessions WHERE user_id IS NOT NULL
    UNION ALL
    -- Dance bonds
    SELECT user_id_1, created_at FROM public.dance_bonds WHERE user_id_1 IS NOT NULL
    UNION ALL
    SELECT user_id_2, created_at FROM public.dance_bonds WHERE user_id_2 IS NOT NULL
  ) all_activities
  GROUP BY user_id
) earliest
WHERE earliest.user_id NOT IN (
  -- Don't create duplicate welcome notifications
  SELECT recipient_id
  FROM public.notifications
  WHERE type = 'system'
    AND data->>'notification_subtype' = 'welcome'
    AND recipient_id IS NOT NULL
);

-- ===== Add Comment for Documentation =====

COMMENT ON COLUMN public.notifications.type IS
  'Notification type: welcome, achievement, event, post_like, post_comment, bond_request, bond_accepted, admin_broadcast, etc.';

-- ===== VERIFICATION QUERY =====
-- Run this to see welcome notifications created:
-- SELECT
--   recipient_id,
--   title,
--   created_at,
--   data->>'earliest_activity' as first_activity,
--   data->>'activity_count' as activities
-- FROM notifications
-- WHERE type = 'system' AND data->>'notification_subtype' = 'welcome'
-- ORDER BY created_at
-- LIMIT 10;
