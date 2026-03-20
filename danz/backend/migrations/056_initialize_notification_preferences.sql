-- Migration: Initialize Notification Preferences for All Users
-- Date: 2024-12-17
-- Description: Create trigger to initialize notification preferences for new users
--              and backfill preferences for all existing users

-- ===== STEP 1: Create Function to Initialize Notification Preferences =====

CREATE OR REPLACE FUNCTION public.initialize_notification_preferences()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $function$
BEGIN
  -- Insert default notification preferences for new user
  INSERT INTO public.notification_preferences (
    id,
    user_id,
    admin_broadcasts,
    event_manager_broadcasts,
    event_updates,
    dance_bonds,
    post_interactions,
    achievements,
    push_notifications,
    email_notifications,
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    NEW.privy_id,
    true,  -- Enable admin broadcasts
    true,  -- Enable event manager broadcasts
    true,  -- Enable event updates
    true,  -- Enable dance bond notifications
    true,  -- Enable post interaction notifications
    true,  -- Enable achievement notifications
    true,  -- Enable push notifications
    true,  -- Enable email notifications
    false, -- Quiet hours disabled by default
    '22:00:00'::time, -- Default quiet hours start (10 PM)
    '08:00:00'::time, -- Default quiet hours end (8 AM)
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicates if preferences already exist

  RETURN NEW;
END;
$function$;

-- ===== STEP 2: Create Trigger on Users Table =====

DROP TRIGGER IF EXISTS trigger_initialize_notification_preferences ON public.users;

CREATE TRIGGER trigger_initialize_notification_preferences
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_notification_preferences();

-- ===== STEP 3: Backfill Notification Preferences for Existing Users =====

-- Insert default preferences for all users who don't have them
INSERT INTO public.notification_preferences (
  id,
  user_id,
  admin_broadcasts,
  event_manager_broadcasts,
  event_updates,
  dance_bonds,
  post_interactions,
  achievements,
  push_notifications,
  email_notifications,
  quiet_hours_enabled,
  quiet_hours_start,
  quiet_hours_end,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  u.privy_id,
  true,  -- Enable admin broadcasts
  true,  -- Enable event manager broadcasts
  true,  -- Enable event updates
  true,  -- Enable dance bond notifications
  true,  -- Enable post interaction notifications
  true,  -- Enable achievement notifications
  true,  -- Enable push notifications
  true,  -- Enable email notifications
  false, -- Quiet hours disabled by default
  '22:00:00'::time, -- Default quiet hours start (10 PM)
  '08:00:00'::time, -- Default quiet hours end (8 AM)
  NOW(),
  NOW()
FROM public.users u
WHERE u.privy_id NOT IN (
  SELECT user_id FROM public.notification_preferences
)
ON CONFLICT (user_id) DO NOTHING;

-- ===== STEP 4: Add Comments for Documentation =====

COMMENT ON FUNCTION public.initialize_notification_preferences() IS
  'Automatically creates notification preferences with sensible defaults for new users. All notification types enabled by default.';

COMMENT ON TRIGGER trigger_initialize_notification_preferences ON public.users IS
  'Ensures every new user gets notification preferences initialized immediately upon user creation.';

-- ===== VERIFICATION QUERY =====
-- Run this to verify all users have notification preferences:
-- SELECT
--   (SELECT COUNT(*) FROM users) as total_users,
--   (SELECT COUNT(*) FROM notification_preferences) as users_with_prefs,
--   (SELECT COUNT(*) FROM users WHERE privy_id NOT IN (SELECT user_id FROM notification_preferences)) as users_without_prefs;
