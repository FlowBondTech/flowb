-- Migration: Fix event_registrations schema references
-- Date: 2025-10-09
-- Description: Ensure event_registrations properly references events table with correct schema qualification

-- Step 1: Check current foreign key constraints on event_registrations
DO $$
DECLARE
    fk_count integer;
BEGIN
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
    AND table_name = 'event_registrations'
    AND constraint_type = 'FOREIGN KEY';

    RAISE NOTICE 'Found % foreign key constraints on event_registrations', fk_count;
END $$;

-- Step 2: Drop and recreate foreign key constraint for events
ALTER TABLE public.event_registrations
DROP CONSTRAINT IF EXISTS event_registrations_event_id_fkey CASCADE;

ALTER TABLE public.event_registrations
ADD CONSTRAINT event_registrations_event_id_fkey
FOREIGN KEY (event_id)
REFERENCES public.events(id)
ON UPDATE CASCADE
ON DELETE CASCADE;

-- Step 3: Ensure user_id foreign key is also properly set
ALTER TABLE public.event_registrations
DROP CONSTRAINT IF EXISTS event_registrations_user_id_fkey CASCADE;

ALTER TABLE public.event_registrations
ADD CONSTRAINT event_registrations_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(privy_id)
ON UPDATE CASCADE
ON DELETE CASCADE;

-- Step 4: Create or replace function to handle event capacity updates with proper schema
CREATE OR REPLACE FUNCTION public.update_event_participant_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment capacity for new registrations
        IF NEW.status IN ('registered', 'attended') THEN
            UPDATE public.events
            SET current_capacity = current_capacity + 1
            WHERE id = NEW.event_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle status changes
        IF OLD.status NOT IN ('registered', 'attended') AND NEW.status IN ('registered', 'attended') THEN
            -- Changed to active status
            UPDATE public.events
            SET current_capacity = current_capacity + 1
            WHERE id = NEW.event_id;
        ELSIF OLD.status IN ('registered', 'attended') AND NEW.status NOT IN ('registered', 'attended') THEN
            -- Changed from active status
            UPDATE public.events
            SET current_capacity = GREATEST(current_capacity - 1, 0)
            WHERE id = NEW.event_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement capacity for deletions
        IF OLD.status IN ('registered', 'attended') THEN
            UPDATE public.events
            SET current_capacity = GREATEST(current_capacity - 1, 0)
            WHERE id = OLD.event_id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Step 5: Recreate trigger
DROP TRIGGER IF EXISTS update_event_capacity_on_registration ON public.event_registrations;

CREATE TRIGGER update_event_capacity_on_registration
AFTER INSERT OR UPDATE OR DELETE ON public.event_registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_event_participant_count();

-- Step 6: Create or replace function to update user event stats with proper schema
CREATE OR REPLACE FUNCTION public.update_user_event_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment attended count
        IF NEW.status = 'attended' THEN
            UPDATE public.users
            SET total_events_attended = total_events_attended + 1
            WHERE privy_id = NEW.user_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle status changes
        IF OLD.status != 'attended' AND NEW.status = 'attended' THEN
            UPDATE public.users
            SET total_events_attended = total_events_attended + 1
            WHERE privy_id = NEW.user_id;
        ELSIF OLD.status = 'attended' AND NEW.status != 'attended' THEN
            UPDATE public.users
            SET total_events_attended = GREATEST(total_events_attended - 1, 0)
            WHERE privy_id = NEW.user_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement attended count
        IF OLD.status = 'attended' THEN
            UPDATE public.users
            SET total_events_attended = GREATEST(total_events_attended - 1, 0)
            WHERE privy_id = OLD.user_id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Step 7: Recreate user stats trigger
DROP TRIGGER IF EXISTS update_user_event_stats_trigger ON public.event_registrations;

CREATE TRIGGER update_user_event_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.event_registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_user_event_stats();

-- Step 8: Verify the setup with a test
DO $$
DECLARE
    test_user_id text;
    test_event_id uuid;
    test_registration_id uuid;
BEGIN
    -- Get a test user
    SELECT privy_id INTO test_user_id FROM public.users LIMIT 1;

    -- Get a test event
    SELECT id INTO test_event_id FROM public.events LIMIT 1;

    IF test_user_id IS NOT NULL AND test_event_id IS NOT NULL THEN
        -- Try to insert a registration
        INSERT INTO public.event_registrations (
            event_id,
            user_id,
            status
        ) VALUES (
            test_event_id,
            test_user_id,
            'registered'
        ) RETURNING id INTO test_registration_id;

        -- Clean up
        DELETE FROM public.event_registrations WHERE id = test_registration_id;

        RAISE NOTICE 'Test successful - event_registrations working correctly!';
    ELSE
        RAISE NOTICE 'Skipping test - no test data available';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test failed: %', SQLERRM;
        -- Clean up on error
        DELETE FROM public.event_registrations WHERE id = test_registration_id;
END $$;

-- Step 9: List all foreign keys for verification
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
LEFT JOIN information_schema.referential_constraints rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'event_registrations'
ORDER BY tc.constraint_name;
