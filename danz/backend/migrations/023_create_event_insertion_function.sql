-- Migration: Create a function to handle event insertion with proper error handling
-- Date: 2025-01-08
-- Description: Creates a function that properly handles event insertion with user verification

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.insert_event_with_user_check;

-- Create the function to handle event insertion
CREATE OR REPLACE FUNCTION public.insert_event_with_user_check(
    p_title text,
    p_location_name text,
    p_facilitator_id text,
    p_start_date_time timestamptz,
    p_end_date_time timestamptz,
    p_description text DEFAULT NULL,
    p_category text DEFAULT NULL,
    p_location_address text DEFAULT NULL,
    p_location_city text DEFAULT NULL,
    p_location_latitude numeric DEFAULT NULL,
    p_location_longitude numeric DEFAULT NULL,
    p_max_capacity integer DEFAULT 50,
    p_price_usd numeric DEFAULT NULL,
    p_skill_level text DEFAULT 'all',
    p_is_virtual boolean DEFAULT false,
    p_virtual_link text DEFAULT NULL,
    p_currency text DEFAULT 'USD',
    p_dance_styles text[] DEFAULT NULL,
    p_tags text[] DEFAULT NULL,
    p_requirements text DEFAULT NULL,
    p_image_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_event_id uuid;
    v_user_exists boolean;
    v_result jsonb;
BEGIN
    -- Check if user exists
    SELECT EXISTS(
        SELECT 1 FROM public.users WHERE privy_id = p_facilitator_id
    ) INTO v_user_exists;

    IF NOT v_user_exists THEN
        -- Create a basic user record if it doesn't exist
        INSERT INTO public.users (
            privy_id,
            created_at,
            updated_at,
            role,
            is_organizer_approved
        ) VALUES (
            p_facilitator_id,
            NOW(),
            NOW(),
            'organizer',
            true
        )
        ON CONFLICT (privy_id) DO NOTHING;

        -- Double-check the user was created
        SELECT EXISTS(
            SELECT 1 FROM public.users WHERE privy_id = p_facilitator_id
        ) INTO v_user_exists;

        IF NOT v_user_exists THEN
            RAISE EXCEPTION 'Failed to create user record for facilitator_id: %', p_facilitator_id;
        END IF;
    END IF;

    -- Now insert the event
    INSERT INTO public.events (
        title,
        description,
        category,
        location_name,
        location_address,
        location_city,
        location_latitude,
        location_longitude,
        facilitator_id,
        max_capacity,
        price_usd,
        skill_level,
        is_virtual,
        virtual_link,
        currency,
        start_date_time,
        end_date_time,
        dance_styles,
        tags,
        requirements,
        image_url
    ) VALUES (
        p_title,
        p_description,
        p_category,
        p_location_name,
        p_location_address,
        p_location_city,
        p_location_latitude,
        p_location_longitude,
        p_facilitator_id,
        p_max_capacity,
        p_price_usd,
        p_skill_level,
        p_is_virtual,
        p_virtual_link,
        p_currency,
        p_start_date_time,
        p_end_date_time,
        p_dance_styles,
        p_tags,
        p_requirements,
        p_image_url
    )
    RETURNING id INTO v_event_id;

    -- Fetch the created event and return it as JSON
    SELECT to_jsonb(e.*) INTO v_result
    FROM public.events e
    WHERE e.id = v_event_id;

    RETURN v_result;

EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE EXCEPTION 'Foreign key violation: User % does not exist in users table', p_facilitator_id;
    WHEN check_violation THEN
        RAISE EXCEPTION 'Check constraint violation: Invalid data provided for event creation';
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating event: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.insert_event_with_user_check TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_event_with_user_check TO service_role;
GRANT EXECUTE ON FUNCTION public.insert_event_with_user_check TO anon;

-- Test the foreign key constraint directly
DO $$
DECLARE
    v_test_result text;
BEGIN
    -- Check if foreign key exists
    SELECT
        tc.constraint_name || ' references ' || ccu.table_name || '(' || ccu.column_name || ')'
    INTO v_test_result
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_schema = 'public'
        AND tc.table_name = 'events'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'facilitator_id';

    IF v_test_result IS NOT NULL THEN
        RAISE NOTICE 'Foreign key constraint found: %', v_test_result;
    ELSE
        RAISE WARNING 'No foreign key constraint found for events.facilitator_id!';
    END IF;
END
$$;

-- Create a simplified version for debugging
CREATE OR REPLACE FUNCTION public.debug_event_creation(
    p_facilitator_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result jsonb;
BEGIN
    -- Build a comprehensive debug report
    v_result = jsonb_build_object(
        'facilitator_id', p_facilitator_id,
        'user_exists', EXISTS(SELECT 1 FROM public.users WHERE privy_id = p_facilitator_id),
        'users_table_exists', EXISTS(
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'users'
        ),
        'events_table_exists', EXISTS(
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'events'
        ),
        'foreign_key_exists', EXISTS(
            SELECT 1
            FROM information_schema.table_constraints AS tc
            WHERE tc.constraint_schema = 'public'
                AND tc.table_name = 'events'
                AND tc.constraint_type = 'FOREIGN KEY'
        ),
        'search_path', current_setting('search_path'),
        'current_schema', current_schema(),
        'user_count', (SELECT COUNT(*) FROM public.users),
        'user_data', (
            SELECT to_jsonb(u.*)
            FROM public.users u
            WHERE u.privy_id = p_facilitator_id
            LIMIT 1
        )
    );

    RETURN v_result;
END;
$$;

-- Grant execute permissions for debug function
GRANT EXECUTE ON FUNCTION public.debug_event_creation TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_event_creation TO service_role;
GRANT EXECUTE ON FUNCTION public.debug_event_creation TO anon;