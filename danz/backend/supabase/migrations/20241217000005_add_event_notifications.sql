-- Migration: Add Notification Triggers for Events
-- Date: 2024-12-17
-- Description: Automatically create notifications for event registrations and updates

-- ===== FUNCTION: Notify Event Creator on New Registration =====

CREATE OR REPLACE FUNCTION public.notify_event_registration()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $function$
DECLARE
  v_event_creator_id text;
  v_event_title text;
BEGIN
  -- Get the event creator and title
  SELECT creator_id, title INTO v_event_creator_id, v_event_title
  FROM public.events
  WHERE id = NEW.event_id;

  -- Only notify if registrant is not the event creator
  IF v_event_creator_id IS NOT NULL AND v_event_creator_id != NEW.user_id THEN
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
      event_id,
      action_type,
      push_sent
    ) VALUES (
      gen_random_uuid(),
      v_event_creator_id,
      'event',
      'New Event Registration',
      'Someone registered for your event: ' || v_event_title,
      jsonb_build_object(
        'notification_subtype', 'event_registration',
        'event_title', v_event_title,
        'registrant_id', NEW.user_id,
        'registration_id', NEW.id
      ),
      false,
      NOW(),
      NEW.user_id,
      'user',
      NEW.event_id,
      'registration',
      false
    );
  END IF;

  -- Notify the registrant with confirmation
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
    event_id,
    action_type,
    push_sent
  ) VALUES (
    gen_random_uuid(),
    NEW.user_id,
    'event',
    'Event Registration Confirmed',
    'You are registered for: ' || v_event_title,
    jsonb_build_object(
      'notification_subtype', 'registration_confirmation',
      'event_title', v_event_title,
      'event_creator_id', v_event_creator_id,
      'registration_id', NEW.id
    ),
    false,
    NOW(),
    'system',
    'system',
    NEW.event_id,
    'confirmation',
    false
  );

  RETURN NEW;
END;
$function$;

-- ===== FUNCTION: Notify Registered Users on Event Update =====

CREATE OR REPLACE FUNCTION public.notify_event_update()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $function$
DECLARE
  v_participant record;
  v_update_message text;
BEGIN
  -- Only notify if important fields changed
  IF (OLD.title IS DISTINCT FROM NEW.title) OR
     (OLD.start_time IS DISTINCT FROM NEW.start_time) OR
     (OLD.location IS DISTINCT FROM NEW.location) OR
     (OLD.status IS DISTINCT FROM NEW.status) THEN

    -- Determine what changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'cancelled' THEN
        v_update_message := 'Event cancelled: ' || NEW.title;
      ELSIF NEW.status = 'postponed' THEN
        v_update_message := 'Event postponed: ' || NEW.title;
      ELSE
        v_update_message := 'Event status updated: ' || NEW.title;
      END IF;
    ELSIF OLD.start_time IS DISTINCT FROM NEW.start_time THEN
      v_update_message := 'Event time changed: ' || NEW.title;
    ELSIF OLD.location IS DISTINCT FROM NEW.location THEN
      v_update_message := 'Event location changed: ' || NEW.title;
    ELSIF OLD.title IS DISTINCT FROM NEW.title THEN
      v_update_message := 'Event renamed: ' || OLD.title || ' → ' || NEW.title;
    ELSE
      v_update_message := 'Event updated: ' || NEW.title;
    END IF;

    -- Notify all registered participants (except creator)
    FOR v_participant IN
      SELECT user_id
      FROM public.event_registrations
      WHERE event_id = NEW.id
        AND user_id != NEW.creator_id
    LOOP
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
        event_id,
        action_type,
        push_sent
      ) VALUES (
        gen_random_uuid(),
        v_participant.user_id,
        'event',
        'Event Update',
        v_update_message,
        jsonb_build_object(
          'notification_subtype', 'event_update',
          'event_title', NEW.title,
          'old_title', OLD.title,
          'old_start_time', OLD.start_time,
          'new_start_time', NEW.start_time,
          'old_location', OLD.location,
          'new_location', NEW.location,
          'old_status', OLD.status,
          'new_status', NEW.status
        ),
        false,
        NOW(),
        NEW.creator_id,
        'user',
        NEW.id,
        'event_update',
        false
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- ===== FUNCTION: Notify Creator on Event Registration Cancellation =====

CREATE OR REPLACE FUNCTION public.notify_event_unregistration()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $function$
DECLARE
  v_event_creator_id text;
  v_event_title text;
BEGIN
  -- Get the event creator and title
  SELECT creator_id, title INTO v_event_creator_id, v_event_title
  FROM public.events
  WHERE id = OLD.event_id;

  -- Only notify if unregistrant is not the event creator
  IF v_event_creator_id IS NOT NULL AND v_event_creator_id != OLD.user_id THEN
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
      event_id,
      action_type,
      push_sent
    ) VALUES (
      gen_random_uuid(),
      v_event_creator_id,
      'event',
      'Event Registration Cancelled',
      'Someone cancelled their registration for: ' || v_event_title,
      jsonb_build_object(
        'notification_subtype', 'event_unregistration',
        'event_title', v_event_title,
        'unregistrant_id', OLD.user_id
      ),
      false,
      NOW(),
      OLD.user_id,
      'user',
      OLD.event_id,
      'unregistration',
      false
    );
  END IF;

  RETURN OLD;
END;
$function$;

-- ===== CREATE TRIGGERS =====

-- Trigger for new event registrations
DROP TRIGGER IF EXISTS trigger_notify_event_registration ON public.event_registrations;

CREATE TRIGGER trigger_notify_event_registration
  AFTER INSERT ON public.event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event_registration();

-- Trigger for event updates
DROP TRIGGER IF EXISTS trigger_notify_event_update ON public.events;

CREATE TRIGGER trigger_notify_event_update
  AFTER UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event_update();

-- Trigger for event registration cancellations
DROP TRIGGER IF EXISTS trigger_notify_event_unregistration ON public.event_registrations;

CREATE TRIGGER trigger_notify_event_unregistration
  AFTER DELETE ON public.event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event_unregistration();

-- ===== ADD COMMENTS FOR DOCUMENTATION =====

COMMENT ON FUNCTION public.notify_event_registration() IS
  'Automatically creates notifications when users register for events. Notifies event creator and confirms registration to the user.';

COMMENT ON FUNCTION public.notify_event_update() IS
  'Automatically creates notifications for all registered participants when event details change (time, location, status).';

COMMENT ON FUNCTION public.notify_event_unregistration() IS
  'Automatically notifies event creator when someone cancels their registration.';

COMMENT ON TRIGGER trigger_notify_event_registration ON public.event_registrations IS
  'Notifies event creator of new registrations and confirms registration to user';

COMMENT ON TRIGGER trigger_notify_event_update ON public.events IS
  'Notifies all registered participants when event details are updated';

COMMENT ON TRIGGER trigger_notify_event_unregistration ON public.event_registrations IS
  'Notifies event creator when registrations are cancelled';

-- ===== VERIFICATION =====
-- Test by creating/updating events and registrations:
--
-- -- Create a test registration
-- INSERT INTO event_registrations (id, event_id, user_id)
-- VALUES (gen_random_uuid(), '<event_id>', '<user_id>');
--
-- -- Update event details
-- UPDATE events
-- SET start_time = NOW() + INTERVAL '2 hours'
-- WHERE id = '<event_id>';
--
-- -- Check notifications created
-- SELECT * FROM notifications
-- WHERE type = 'event'
--   AND data->>'notification_subtype' IN ('event_registration', 'registration_confirmation', 'event_update', 'event_unregistration')
-- ORDER BY created_at DESC
-- LIMIT 10;
