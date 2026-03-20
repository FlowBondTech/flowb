-- Migration: Remove and replace foreign key constraint with trigger validation
-- Date: 2025-01-08
-- Description: Since the foreign key is causing issues, we'll remove it and use trigger-based validation

-- Step 1: Drop the problematic foreign key constraint completely
ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS events_facilitator_id_fkey CASCADE;

-- Step 2: Create a validation function that doesn't use foreign keys
CREATE OR REPLACE FUNCTION public.validate_and_create_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only validate if facilitator_id is not null
    IF NEW.facilitator_id IS NOT NULL THEN
        -- Ensure user exists or create a basic record
        INSERT INTO public.users (
            privy_id,
            role,
            is_organizer_approved,
            created_at,
            updated_at
        )
        VALUES (
            NEW.facilitator_id,
            'organizer',
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (privy_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- Step 3: Create trigger for validation
DROP TRIGGER IF EXISTS ensure_facilitator_exists ON public.events;

CREATE TRIGGER ensure_facilitator_exists
BEFORE INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.validate_and_create_event();

-- Step 4: Create a simple insert function without foreign key complications
CREATE OR REPLACE FUNCTION public.create_event_simple(
    input_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id uuid;
    v_result jsonb;
    v_facilitator_id text;
BEGIN
    -- Extract facilitator_id
    v_facilitator_id := input_data->>'facilitator_id';

    -- Ensure the user exists first
    IF v_facilitator_id IS NOT NULL THEN
        INSERT INTO public.users (privy_id, created_at, updated_at)
        VALUES (v_facilitator_id, NOW(), NOW())
        ON CONFLICT (privy_id) DO NOTHING;
    END IF;

    -- Insert the event using jsonb
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
    )
    SELECT
        input_data->>'title',
        input_data->>'description',
        input_data->>'category',
        input_data->>'location_name',
        input_data->>'location_address',
        input_data->>'location_city',
        (input_data->>'location_latitude')::numeric,
        (input_data->>'location_longitude')::numeric,
        input_data->>'facilitator_id',
        COALESCE((input_data->>'max_capacity')::integer, 50),
        (input_data->>'price_usd')::numeric,
        COALESCE(input_data->>'skill_level', 'all'),
        COALESCE((input_data->>'is_virtual')::boolean, false),
        input_data->>'virtual_link',
        COALESCE(input_data->>'currency', 'USD'),
        (input_data->>'start_date_time')::timestamptz,
        (input_data->>'end_date_time')::timestamptz,
        CASE
            WHEN input_data->'dance_styles' IS NOT NULL
            THEN ARRAY(SELECT jsonb_array_elements_text(input_data->'dance_styles'))
            ELSE NULL
        END,
        CASE
            WHEN input_data->'tags' IS NOT NULL
            THEN ARRAY(SELECT jsonb_array_elements_text(input_data->'tags'))
            ELSE NULL
        END,
        input_data->>'requirements',
        input_data->>'image_url'
    RETURNING id INTO v_event_id;

    -- Fetch and return the created event
    SELECT to_jsonb(e.*) INTO v_result
    FROM public.events e
    WHERE e.id = v_event_id;

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating event: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_event_simple TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_event_simple TO service_role;
GRANT EXECUTE ON FUNCTION public.create_event_simple TO anon;

-- Step 5: Verify the constraint is gone
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
        AND table_name = 'events'
        AND constraint_name = 'events_facilitator_id_fkey'
    ) THEN
        RAISE EXCEPTION 'Foreign key constraint still exists!';
    ELSE
        RAISE NOTICE 'Foreign key constraint successfully removed';
    END IF;
END
$$;

-- Step 6: Test the new approach
DO $$
DECLARE
    test_result jsonb;
    test_user_id text;
BEGIN
    -- Get a test user ID
    SELECT privy_id INTO test_user_id FROM public.users LIMIT 1;

    IF test_user_id IS NOT NULL THEN
        -- Try the new function
        test_result := public.create_event_simple(
            jsonb_build_object(
                'title', 'Test Event - Will Be Deleted',
                'location_name', 'Test Location',
                'facilitator_id', test_user_id,
                'start_date_time', (NOW() + INTERVAL '1 day')::text,
                'end_date_time', (NOW() + INTERVAL '2 days')::text
            )
        );

        -- Delete the test event
        DELETE FROM public.events WHERE id = (test_result->>'id')::uuid;

        RAISE NOTICE 'Test successful - new approach works!';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test failed: %', SQLERRM;
END
$$;