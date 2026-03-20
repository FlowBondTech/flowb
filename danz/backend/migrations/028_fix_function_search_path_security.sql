-- Migration: Fix function search_path security warnings
-- Date: 2025-01-08
-- Description: Set explicit search_path for all functions to prevent SQL injection vulnerabilities

-- The search_path security issue occurs when functions don't explicitly set their search path,
-- allowing potential attackers to create malicious objects in other schemas that could be
-- inadvertently called by the function.

-- Step 1: Fix validate_facilitator_id function
DROP FUNCTION IF EXISTS public.validate_facilitator_id CASCADE;

CREATE OR REPLACE FUNCTION public.validate_facilitator_id(facilitator_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users WHERE privy_id = facilitator_id
    );
END;
$$;

-- Step 2: Fix insert_event_bypass_fk function
DROP FUNCTION IF EXISTS public.insert_event_bypass_fk CASCADE;

CREATE OR REPLACE FUNCTION public.insert_event_bypass_fk(
    p_title text,
    p_location_name text,
    p_facilitator_id text,
    p_start_date_time text,
    p_end_date_time text,
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
SET search_path = public
AS $$
DECLARE
    v_event_id uuid;
    v_result jsonb;
BEGIN
    INSERT INTO public.events (
        title,
        location_name,
        facilitator_id,
        start_date_time,
        end_date_time,
        description,
        category,
        location_address,
        location_city,
        location_latitude,
        location_longitude,
        max_capacity,
        price_usd,
        skill_level,
        is_virtual,
        virtual_link,
        currency,
        dance_styles,
        tags,
        requirements,
        image_url
    ) VALUES (
        p_title,
        p_location_name,
        p_facilitator_id,
        p_start_date_time::timestamptz,
        p_end_date_time::timestamptz,
        p_description,
        p_category,
        p_location_address,
        p_location_city,
        p_location_latitude,
        p_location_longitude,
        p_max_capacity,
        p_price_usd,
        p_skill_level,
        p_is_virtual,
        p_virtual_link,
        p_currency,
        p_dance_styles,
        p_tags,
        p_requirements,
        p_image_url
    )
    RETURNING * INTO v_result;

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to insert event: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- Step 3: Fix validate_and_create_event function
DROP FUNCTION IF EXISTS public.validate_and_create_event CASCADE;

CREATE OR REPLACE FUNCTION public.validate_and_create_event(
    p_title text,
    p_location_name text,
    p_facilitator_id text,
    p_start_date_time text,
    p_end_date_time text,
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
SET search_path = public
AS $$
DECLARE
    v_event_id uuid;
    v_user_exists boolean;
    v_result jsonb;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.users WHERE privy_id = p_facilitator_id
    ) INTO v_user_exists;

    IF NOT v_user_exists THEN
        RAISE EXCEPTION 'Facilitator with ID % does not exist', p_facilitator_id;
    END IF;

    INSERT INTO public.events (
        title,
        location_name,
        facilitator_id,
        start_date_time,
        end_date_time,
        description,
        category,
        location_address,
        location_city,
        location_latitude,
        location_longitude,
        max_capacity,
        price_usd,
        skill_level,
        is_virtual,
        virtual_link,
        currency,
        dance_styles,
        tags,
        requirements,
        image_url
    ) VALUES (
        p_title,
        p_location_name,
        p_facilitator_id,
        p_start_date_time::timestamptz,
        p_end_date_time::timestamptz,
        p_description,
        p_category,
        p_location_address,
        p_location_city,
        p_location_latitude,
        p_location_longitude,
        p_max_capacity,
        p_price_usd,
        p_skill_level,
        p_is_virtual,
        p_virtual_link,
        p_currency,
        p_dance_styles,
        p_tags,
        p_requirements,
        p_image_url
    )
    RETURNING * INTO v_result;

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to create event: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- Step 4: Fix create_event_simple function
DROP FUNCTION IF EXISTS public.create_event_simple CASCADE;

CREATE OR REPLACE FUNCTION public.create_event_simple(input_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result jsonb;
BEGIN
    INSERT INTO public.events (
        title,
        location_name,
        facilitator_id,
        start_date_time,
        end_date_time,
        description,
        category,
        location_address,
        location_city,
        location_latitude,
        location_longitude,
        max_capacity,
        price_usd,
        skill_level,
        is_virtual,
        virtual_link,
        currency,
        dance_styles,
        tags,
        requirements,
        image_url
    )
    SELECT
        input_data->>'title',
        input_data->>'location_name',
        input_data->>'facilitator_id',
        (input_data->>'start_date_time')::timestamptz,
        (input_data->>'end_date_time')::timestamptz,
        input_data->>'description',
        input_data->>'category',
        input_data->>'location_address',
        input_data->>'location_city',
        (input_data->>'location_latitude')::numeric,
        (input_data->>'location_longitude')::numeric,
        COALESCE((input_data->>'max_capacity')::integer, 50),
        (input_data->>'price_usd')::numeric,
        COALESCE(input_data->>'skill_level', 'all'),
        COALESCE((input_data->>'is_virtual')::boolean, false),
        input_data->>'virtual_link',
        COALESCE(input_data->>'currency', 'USD'),
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
    RETURNING * INTO v_result;

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Event creation failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- Step 5: Fix create_event_minimal function
DROP FUNCTION IF EXISTS public.create_event_minimal CASCADE;

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
SET search_path = public
AS $$
DECLARE
    v_event_id uuid;
    v_result jsonb;
BEGIN
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

    v_result := jsonb_build_object('id', v_event_id);

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Direct insert error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- Step 6: Fix update_updated_at_column function
DROP FUNCTION IF EXISTS public.update_updated_at_column CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Step 7: Fix create_event_with_fk function
DROP FUNCTION IF EXISTS public.create_event_with_fk CASCADE;

CREATE OR REPLACE FUNCTION public.create_event_with_fk(
    p_title text,
    p_location_name text,
    p_facilitator_id text,
    p_start_date_time text,
    p_end_date_time text,
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
SET search_path = public
AS $$
DECLARE
    v_event_id uuid;
    v_result jsonb;
    v_user_exists boolean;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.users WHERE privy_id = p_facilitator_id
    ) INTO v_user_exists;

    IF NOT v_user_exists THEN
        INSERT INTO public.users (privy_id, created_at, updated_at)
        VALUES (p_facilitator_id, NOW(), NOW())
        ON CONFLICT (privy_id) DO NOTHING;
    END IF;

    INSERT INTO public.events (
        title,
        location_name,
        facilitator_id,
        start_date_time,
        end_date_time,
        description,
        category,
        location_address,
        location_city,
        location_latitude,
        location_longitude,
        max_capacity,
        price_usd,
        skill_level,
        is_virtual,
        virtual_link,
        currency,
        dance_styles,
        tags,
        requirements,
        image_url
    ) VALUES (
        p_title,
        p_location_name,
        p_facilitator_id,
        p_start_date_time::timestamptz,
        p_end_date_time::timestamptz,
        p_description,
        p_category,
        p_location_address,
        p_location_city,
        p_location_latitude,
        p_location_longitude,
        p_max_capacity,
        p_price_usd,
        p_skill_level,
        p_is_virtual,
        p_virtual_link,
        p_currency,
        p_dance_styles,
        p_tags,
        p_requirements,
        p_image_url
    )
    RETURNING * INTO v_result;

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Event creation failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- Step 8: Recreate triggers that use the update_updated_at_column function
-- The function definition is updated, but triggers continue to work

-- Step 9: Grant necessary permissions for all functions
GRANT EXECUTE ON FUNCTION public.validate_facilitator_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_facilitator_id TO service_role;

GRANT EXECUTE ON FUNCTION public.insert_event_bypass_fk TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_event_bypass_fk TO service_role;
GRANT EXECUTE ON FUNCTION public.insert_event_bypass_fk TO anon;

GRANT EXECUTE ON FUNCTION public.validate_and_create_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_and_create_event TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_and_create_event TO anon;

GRANT EXECUTE ON FUNCTION public.create_event_simple TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_event_simple TO service_role;
GRANT EXECUTE ON FUNCTION public.create_event_simple TO anon;

GRANT EXECUTE ON FUNCTION public.create_event_minimal TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_event_minimal TO service_role;
GRANT EXECUTE ON FUNCTION public.create_event_minimal TO anon;

GRANT EXECUTE ON FUNCTION public.create_event_with_fk TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_event_with_fk TO service_role;
GRANT EXECUTE ON FUNCTION public.create_event_with_fk TO anon;

-- Step 10: Verify that all functions now have search_path set
SELECT
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS definition,
    CASE
        WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' THEN 'SECURE'
        ELSE 'NEEDS FIX'
    END AS search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname IN (
        'validate_facilitator_id',
        'insert_event_bypass_fk',
        'validate_and_create_event',
        'create_event_simple',
        'create_event_minimal',
        'update_updated_at_column',
        'create_event_with_fk'
    )
ORDER BY p.proname;

-- Step 11: Check if there are any other functions that need fixing
SELECT
    n.nspname AS schema_name,
    p.proname AS function_name,
    CASE
        WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' THEN 'SECURE'
        ELSE 'NEEDS FIX'
    END AS search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prokind = 'f'  -- Only functions, not procedures
    AND pg_get_functiondef(p.oid) NOT LIKE '%SET search_path%'
ORDER BY p.proname;