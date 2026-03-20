-- Migration: Add Notification Triggers for Achievements
-- Date: 2024-12-17
-- Description: Automatically create notifications when users earn achievements

-- ===== FUNCTION: Notify User on Achievement Earned =====

CREATE OR REPLACE FUNCTION public.notify_achievement_earned()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $function$
DECLARE
  v_notification_message text;
BEGIN
  -- Build notification message including rewards
  v_notification_message := 'You earned: ' || NEW.title;

  IF NEW.xp_reward > 0 OR NEW.danz_reward > 0 THEN
    v_notification_message := v_notification_message || ' | Rewards: ';

    IF NEW.xp_reward > 0 THEN
      v_notification_message := v_notification_message || NEW.xp_reward || ' XP';
    END IF;

    IF NEW.xp_reward > 0 AND NEW.danz_reward > 0 THEN
      v_notification_message := v_notification_message || ', ';
    END IF;

    IF NEW.danz_reward > 0 THEN
      v_notification_message := v_notification_message || NEW.danz_reward || ' DANZ';
    END IF;
  END IF;

  -- Create achievement notification
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
    achievement_id,
    action_type,
    push_sent
  ) VALUES (
    gen_random_uuid(),
    NEW.user_id,
    'achievement',
    '🏆 Achievement Unlocked!',
    v_notification_message,
    jsonb_build_object(
      'notification_subtype', 'achievement_earned',
      'achievement_type', NEW.achievement_type,
      'achievement_title', NEW.title,
      'achievement_description', NEW.description,
      'achievement_icon', NEW.icon,
      'xp_reward', NEW.xp_reward,
      'danz_reward', NEW.danz_reward,
      'unlocked_at', NEW.unlocked_at
    ),
    false,
    COALESCE(NEW.unlocked_at, NOW()),
    'system',
    NEW.id,
    'achievement_unlocked',
    false
  );

  RETURN NEW;
END;
$function$;

-- ===== CREATE TRIGGER =====

DROP TRIGGER IF EXISTS trigger_notify_achievement_earned ON public.achievements;

CREATE TRIGGER trigger_notify_achievement_earned
  AFTER INSERT ON public.achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_achievement_earned();

-- ===== ADD COMMENTS FOR DOCUMENTATION =====

COMMENT ON FUNCTION public.notify_achievement_earned() IS
  'Automatically creates a notification when a user earns an achievement. Includes achievement details and rewards (XP and DANZ).';

COMMENT ON TRIGGER trigger_notify_achievement_earned ON public.achievements IS
  'Notifies users when they unlock new achievements with reward details';

-- ===== VERIFICATION =====
-- Test by creating a test achievement:
--
-- INSERT INTO achievements (
--   id, user_id, achievement_type, title, description, icon,
--   xp_reward, danz_reward, unlocked_at
-- ) VALUES (
--   gen_random_uuid(),
--   '<user_id>',
--   'milestone',
--   'First Dance',
--   'Complete your first dance session',
--   '💃',
--   100,
--   10,
--   NOW()
-- );
--
-- -- Check notifications created
-- SELECT
--   recipient_id,
--   title,
--   message,
--   data->>'achievement_title' as achievement,
--   data->>'xp_reward' as xp,
--   data->>'danz_reward' as danz,
--   created_at
-- FROM notifications
-- WHERE type = 'achievement'
--   AND data->>'notification_subtype' = 'achievement_earned'
-- ORDER BY created_at DESC
-- LIMIT 5;
