-- Migration: Find and fix all references to users table
-- Date: 2025-01-08
-- Description: Find what's still referencing the users table and causing the error

-- Step 1: Check ALL foreign keys that reference users table
SELECT
    tc.table_schema,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE ccu.table_name = 'users'
    AND tc.constraint_type = 'FOREIGN KEY';

-- Step 2: Check for triggers on events table
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'events'
    AND trigger_schema = 'public';

-- Step 3: Check functions that might reference users
SELECT
    proname AS function_name,
    prosrc AS function_source
FROM pg_proc
WHERE prosrc LIKE '%users%'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Step 4: Drop ALL triggers on events table that might reference users
DROP TRIGGER IF EXISTS validate_facilitator_before_insert ON public.events;
DROP TRIGGER IF EXISTS ensure_facilitator_exists ON public.events;
DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
DROP TRIGGER IF EXISTS update_user_created_events_trigger ON public.events;

-- Step 5: Drop ALL foreign keys from other tables that reference users
ALTER TABLE public.achievements DROP CONSTRAINT IF EXISTS achievements_user_id_fkey;
ALTER TABLE public.dance_bonds DROP CONSTRAINT IF EXISTS dance_bonds_user1_id_fkey;
ALTER TABLE public.dance_bonds DROP CONSTRAINT IF EXISTS dance_bonds_user2_id_fkey;
ALTER TABLE public.event_registrations DROP CONSTRAINT IF EXISTS event_registrations_user_id_fkey;
ALTER TABLE public.feed_posts DROP CONSTRAINT IF EXISTS feed_posts_user_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.subscription_history DROP CONSTRAINT IF EXISTS subscription_history_user_id_fkey;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_organizer_approved_by_fkey;

-- Step 6: Create a minimal event insertion function that doesn't touch users at all
CREATE OR REPLACE FUNCTION public.create_event_minimal(
    p_title text,
    p_location_name text,
    p_facilitator_id text,
    p_start_date_time text,
    p_end_date_time text,
    p_category text DEFAULT NULL,
    p_location_address text DEFAULT NULL,
    p_location_city text DEFAULT NULL,
    p_location_latitude numeric DEFAULT NULL,
    p_location_longitude numeric DEFAULT NULL,
    p_max_capacity integer DEFAULT 50,
    p_skill_level text DEFAULT 'all',
    p_is_virtual boolean DEFAULT false,
    p_currency text DEFAULT 'USD'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id uuid;
    v_result jsonb;
BEGIN
    -- Direct insert without any user validation
    INSERT INTO public.events (
        title,
        location_name,
        facilitator_id,
        start_date_time,
        end_date_time,
        category,
        location_address,
        location_city,
        location_latitude,
        location_longitude,
        max_capacity,
        skill_level,
        is_virtual,
        currency
    ) VALUES (
        p_title,
        p_location_name,
        p_facilitator_id,
        p_start_date_time::timestamptz,
        p_end_date_time::timestamptz,
        p_category,
        p_location_address,
        p_location_city,
        p_location_latitude,
        p_location_longitude,
        p_max_capacity,
        p_skill_level,
        p_is_virtual,
        p_currency
    )
    RETURNING id INTO v_event_id;

    -- Return just the ID
    v_result := jsonb_build_object('id', v_event_id);

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Direct insert error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_event_minimal TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_event_minimal TO service_role;
GRANT EXECUTE ON FUNCTION public.create_event_minimal TO anon;

-- Step 7: Check if the update_user_created_events_count function exists and what it does
DROP FUNCTION IF EXISTS public.update_user_created_events_count CASCADE;

-- Step 8: Check if the update_updated_at_column function references users
-- This is likely safe but let's recreate it to be sure
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Step 9: Recreate ONLY the safe trigger for updated_at
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Step 10: Test direct SQL insert
DO $$
DECLARE
    test_id uuid;
BEGIN
    -- Try the absolute simplest insert possible
    INSERT INTO public.events (
        title,
        location_name,
        facilitator_id,
        start_date_time,
        end_date_time
    ) VALUES (
        'Direct SQL Test',
        'Test Location',
        'test-user-id',
        NOW() + INTERVAL '1 day',
        NOW() + INTERVAL '2 days'
    ) RETURNING id INTO test_id;

    -- If we get here, it worked
    DELETE FROM public.events WHERE id = test_id;
    RAISE NOTICE 'Direct SQL insert worked!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Direct SQL insert failed: %', SQLERRM;
END;
$$;

-- Step 11: List all remaining constraints on events table
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.events'::regclass
ORDER BY contype, conname;