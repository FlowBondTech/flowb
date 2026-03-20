-- Migration: Fix Event Notification Triggers
-- Date: 2026-01-07
-- Description: Update triggers to use facilitator_id instead of creator_id
--              which doesn't exist in production

-- ===== FUNCTION: Notify Event Creator on New Registration (FIXED) =====

CREATE OR REPLACE FUNCTION public.notify_event_registration()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $function$
DECLARE
  v_event_creator_id text;
  v_event_title text;
BEGIN
  -- Get the event facilitator (creator) and title
  -- Using facilitator_id instead of creator_id for compatibility
  SELECT facilitator_id, title INTO v_event_creator_id, v_event_title
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

-- ===== FUNCTION: Notify Registered Users on Event Update (FIXED) =====

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

    -- Notify all registered participants (except facilitator/creator)
    -- Using facilitator_id instead of creator_id for compatibility
    FOR v_participant IN
      SELECT user_id
      FROM public.event_registrations
      WHERE event_id = NEW.id
        AND user_id != NEW.facilitator_id
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
        NEW.facilitator_id,
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

-- ===== FUNCTION: Notify Creator on Event Registration Cancellation (FIXED) =====

CREATE OR REPLACE FUNCTION public.notify_event_unregistration()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $function$
DECLARE
  v_event_creator_id text;
  v_event_title text;
BEGIN
  -- Get the event facilitator (creator) and title
  -- Using facilitator_id instead of creator_id for compatibility
  SELECT facilitator_id, title INTO v_event_creator_id, v_event_title
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

-- ===== VERIFICATION =====
-- The triggers are already created in migration 060
-- This migration only updates the functions to use facilitator_id instead of creator_id
