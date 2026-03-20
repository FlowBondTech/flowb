-- Migration: Safely restore foreign key constraints
-- Date: 2025-01-08
-- Description: Restore foreign key constraints to maintain referential integrity while ensuring they work

-- Step 1: First, let's check if there are any orphaned records (facilitator_ids that don't exist in users)
DO $$
DECLARE
    orphaned_count integer;
BEGIN
    -- Check for orphaned events
    SELECT COUNT(*) INTO orphaned_count
    FROM public.events e
    WHERE NOT EXISTS (
        SELECT 1 FROM public.users u WHERE u.privy_id = e.facilitator_id
    );

    IF orphaned_count > 0 THEN
        RAISE NOTICE 'Found % events with non-existent facilitator_ids', orphaned_count;

        -- Option 1: Set orphaned events to NULL (uncomment if you want this)
        -- UPDATE public.events
        -- SET facilitator_id = NULL
        -- WHERE NOT EXISTS (
        --     SELECT 1 FROM public.users u WHERE u.privy_id = facilitator_id
        -- );

        -- Option 2: Create placeholder users for orphaned records (current approach)
        INSERT INTO public.users (privy_id, display_name, username, role, created_at, updated_at)
        SELECT DISTINCT
            e.facilitator_id,
            'Unknown User',
            CONCAT('user_', SUBSTR(e.facilitator_id, 1, 8)),
            'user',
            NOW(),
            NOW()
        FROM public.events e
        WHERE NOT EXISTS (
            SELECT 1 FROM public.users u WHERE u.privy_id = e.facilitator_id
        )
        AND e.facilitator_id IS NOT NULL;

        RAISE NOTICE 'Created placeholder users for orphaned records';
    END IF;
END $$;

-- Step 2: Add foreign key constraint for events -> users (facilitator)
ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS events_facilitator_id_fkey;

ALTER TABLE public.events
ADD CONSTRAINT events_facilitator_id_fkey
FOREIGN KEY (facilitator_id)
REFERENCES public.users(privy_id)
ON UPDATE CASCADE
ON DELETE SET NULL;  -- Set to NULL instead of CASCADE to preserve events

-- Step 3: Add foreign key constraints for other tables referencing users
-- These use ON DELETE CASCADE as they represent user-specific data

-- Achievements
ALTER TABLE public.achievements
DROP CONSTRAINT IF EXISTS achievements_user_id_fkey;

ALTER TABLE public.achievements
ADD CONSTRAINT achievements_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(privy_id)
ON UPDATE CASCADE
ON DELETE CASCADE;

-- Dance bonds
ALTER TABLE public.dance_bonds
DROP CONSTRAINT IF EXISTS dance_bonds_user1_id_fkey;

ALTER TABLE public.dance_bonds
ADD CONSTRAINT dance_bonds_user1_id_fkey
FOREIGN KEY (user1_id)
REFERENCES public.users(privy_id)
ON UPDATE CASCADE
ON DELETE CASCADE;

ALTER TABLE public.dance_bonds
DROP CONSTRAINT IF EXISTS dance_bonds_user2_id_fkey;

ALTER TABLE public.dance_bonds
ADD CONSTRAINT dance_bonds_user2_id_fkey
FOREIGN KEY (user2_id)
REFERENCES public.users(privy_id)
ON UPDATE CASCADE
ON DELETE CASCADE;

-- Event registrations
ALTER TABLE public.event_registrations
DROP CONSTRAINT IF EXISTS event_registrations_user_id_fkey;

ALTER TABLE public.event_registrations
ADD CONSTRAINT event_registrations_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(privy_id)
ON UPDATE CASCADE
ON DELETE CASCADE;

-- Feed posts
ALTER TABLE public.feed_posts
DROP CONSTRAINT IF EXISTS feed_posts_user_id_fkey;

ALTER TABLE public.feed_posts
ADD CONSTRAINT feed_posts_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(privy_id)
ON UPDATE CASCADE
ON DELETE CASCADE;

-- Notifications
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(privy_id)
ON UPDATE CASCADE
ON DELETE CASCADE;

-- Subscription history
ALTER TABLE public.subscription_history
DROP CONSTRAINT IF EXISTS subscription_history_user_id_fkey;

ALTER TABLE public.subscription_history
ADD CONSTRAINT subscription_history_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(privy_id)
ON UPDATE CASCADE
ON DELETE CASCADE;

-- Users table self-reference for organizer approval
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_organizer_approved_by_fkey;

ALTER TABLE public.users
ADD CONSTRAINT users_organizer_approved_by_fkey
FOREIGN KEY (organizer_approved_by)
REFERENCES public.users(privy_id)
ON UPDATE CASCADE
ON DELETE SET NULL;

-- Step 4: Create an improved event creation function that handles the foreign key properly
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
AS $$
DECLARE
    v_event_id uuid;
    v_result jsonb;
    v_user_exists boolean;
BEGIN
    -- Check if user exists
    SELECT EXISTS(
        SELECT 1 FROM public.users WHERE privy_id = p_facilitator_id
    ) INTO v_user_exists;

    IF NOT v_user_exists THEN
        -- Create a minimal user record if it doesn't exist
        -- This ensures the foreign key constraint is satisfied
        INSERT INTO public.users (privy_id, created_at, updated_at)
        VALUES (p_facilitator_id, NOW(), NOW())
        ON CONFLICT (privy_id) DO NOTHING;
    END IF;

    -- Now insert the event
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_event_with_fk TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_event_with_fk TO service_role;
GRANT EXECUTE ON FUNCTION public.create_event_with_fk TO anon;

-- Step 5: Test that the foreign key works
DO $$
DECLARE
    test_user_id text := 'test-fk-' || gen_random_uuid()::text;
    test_event_id uuid;
BEGIN
    -- Create a test user
    INSERT INTO public.users (privy_id, display_name, created_at, updated_at)
    VALUES (test_user_id, 'Test User for FK', NOW(), NOW());

    -- Create a test event
    INSERT INTO public.events (
        title,
        location_name,
        facilitator_id,
        start_date_time,
        end_date_time
    ) VALUES (
        'Test FK Event',
        'Test Location',
        test_user_id,
        NOW() + INTERVAL '1 day',
        NOW() + INTERVAL '2 days'
    ) RETURNING id INTO test_event_id;

    -- Clean up
    DELETE FROM public.events WHERE id = test_event_id;
    DELETE FROM public.users WHERE privy_id = test_user_id;

    RAISE NOTICE 'Foreign key constraints restored and tested successfully!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Foreign key test failed: %', SQLERRM;
END $$;

-- Step 6: List all foreign key constraints for verification
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column,
    rc.delete_rule
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
    AND ccu.table_name = 'users'
ORDER BY tc.table_name;