-- Migration: Add Notification Triggers for Dance Bonds
-- Date: 2024-12-17
-- Description: Automatically create notifications when dance bonds are created or updated

-- ===== FUNCTION: Notify Users on New Dance Bond =====

CREATE OR REPLACE FUNCTION public.notify_dance_bond_created()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $function$
BEGIN
  -- Notify user_id_1 about new bond with user_id_2
  INSERT INTO public.notifications (
    id,
    recipient_id,
    type,
    title,
    message,
    data,
    read,
    created_at,
    sender_id,
    sender_type,
    bond_id,
    action_type,
    push_sent
  ) VALUES (
    gen_random_uuid(),
    NEW.user_id_1,
    'social',
    'New Dance Bond!',
    'You formed a new dance bond!',
    jsonb_build_object(
      'notification_subtype', 'bond_created',
      'bond_partner_id', NEW.user_id_2,
      'bond_strength', NEW.strength,
      'bond_type', NEW.bond_type
    ),
    false,
    NOW(),
    NEW.user_id_2,
    'user',
    NEW.id,
    'bond_created',
    false
  );

  -- Notify user_id_2 about new bond with user_id_1
  INSERT INTO public.notifications (
    id,
    recipient_id,
    type,
    title,
    message,
    data,
    read,
    created_at,
    sender_id,
    sender_type,
    bond_id,
    action_type,
    push_sent
  ) VALUES (
    gen_random_uuid(),
    NEW.user_id_2,
    'social',
    'New Dance Bond!',
    'You formed a new dance bond!',
    jsonb_build_object(
      'notification_subtype', 'bond_created',
      'bond_partner_id', NEW.user_id_1,
      'bond_strength', NEW.strength,
      'bond_type', NEW.bond_type
    ),
    false,
    NOW(),
    NEW.user_id_1,
    'user',
    NEW.id,
    'bond_created',
    false
  );

  RETURN NEW;
END;
$function$;

-- ===== FUNCTION: Notify Users on Dance Bond Strength Update =====

CREATE OR REPLACE FUNCTION public.notify_dance_bond_updated()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $function$
DECLARE
  v_strength_increased boolean;
  v_notification_title text;
  v_notification_message text;
BEGIN
  -- Only notify if strength changed
  IF OLD.strength IS DISTINCT FROM NEW.strength THEN
    v_strength_increased := NEW.strength > OLD.strength;

    IF v_strength_increased THEN
      v_notification_title := 'Dance Bond Strengthened!';
      v_notification_message := 'Your dance bond grew stronger!';
    ELSE
      v_notification_title := 'Dance Bond Updated';
      v_notification_message := 'Your dance bond was updated.';
    END IF;

    -- Notify user_id_1
    INSERT INTO public.notifications (
      id,
      recipient_id,
      type,
      title,
      message,
      data,
      read,
      created_at,
      sender_id,
      sender_type,
      bond_id,
      action_type,
      push_sent
    ) VALUES (
      gen_random_uuid(),
      NEW.user_id_1,
      'social',
      v_notification_title,
      v_notification_message,
      jsonb_build_object(
        'notification_subtype', 'bond_updated',
        'bond_partner_id', NEW.user_id_2,
        'old_strength', OLD.strength,
        'new_strength', NEW.strength,
        'strength_increased', v_strength_increased
      ),
      false,
      NOW(),
      NEW.user_id_2,
      'user',
      NEW.id,
      'bond_updated',
      false
    );

    -- Notify user_id_2
    INSERT INTO public.notifications (
      id,
      recipient_id,
      type,
      title,
      message,
      data,
      read,
      created_at,
      sender_id,
      sender_type,
      bond_id,
      action_type,
      push_sent
    ) VALUES (
      gen_random_uuid(),
      NEW.user_id_2,
      'social',
      v_notification_title,
      v_notification_message,
      jsonb_build_object(
        'notification_subtype', 'bond_updated',
        'bond_partner_id', NEW.user_id_1,
        'old_strength', OLD.strength,
        'new_strength', NEW.strength,
        'strength_increased', v_strength_increased
      ),
      false,
      NOW(),
      NEW.user_id_1,
      'user',
      NEW.id,
      'bond_updated',
      false
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- ===== CREATE TRIGGERS =====

-- Trigger for new dance bonds
DROP TRIGGER IF EXISTS trigger_notify_dance_bond_created ON public.dance_bonds;

CREATE TRIGGER trigger_notify_dance_bond_created
  AFTER INSERT ON public.dance_bonds
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_dance_bond_created();

-- Trigger for dance bond updates
DROP TRIGGER IF EXISTS trigger_notify_dance_bond_updated ON public.dance_bonds;

CREATE TRIGGER trigger_notify_dance_bond_updated
  AFTER UPDATE ON public.dance_bonds
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_dance_bond_updated();

-- ===== ADD COMMENTS FOR DOCUMENTATION =====

COMMENT ON FUNCTION public.notify_dance_bond_created() IS
  'Automatically creates notifications for both users when a new dance bond is formed.';

COMMENT ON FUNCTION public.notify_dance_bond_updated() IS
  'Automatically creates notifications for both users when dance bond strength changes.';

COMMENT ON TRIGGER trigger_notify_dance_bond_created ON public.dance_bonds IS
  'Notifies both users when they form a new dance bond';

COMMENT ON TRIGGER trigger_notify_dance_bond_updated ON public.dance_bonds IS
  'Notifies both users when their dance bond strength changes';

-- ===== VERIFICATION =====
-- Test by creating or updating a dance bond:
--
-- -- Create a test bond
-- INSERT INTO dance_bonds (id, user_id_1, user_id_2, strength, bond_type)
-- VALUES (gen_random_uuid(), '<user1_id>', '<user2_id>', 1, 'default');
--
-- -- Update bond strength
-- UPDATE dance_bonds
-- SET strength = 2
-- WHERE id = '<bond_id>';
--
-- -- Check notifications created
-- SELECT * FROM notifications
-- WHERE type = 'social'
--   AND data->>'notification_subtype' IN ('bond_created', 'bond_updated')
-- ORDER BY created_at DESC
-- LIMIT 10;
