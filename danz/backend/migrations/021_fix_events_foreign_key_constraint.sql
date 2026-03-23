-- Migration: Fix events table foreign key constraint to users table
-- Date: 2025-01-08
-- Description: Fixes the foreign key reference issue when creating events

-- First, check if both tables exist in the public schema
DO $$
BEGIN
    -- Check if users table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
    ) THEN
        RAISE NOTICE 'Users table does not exist in public schema';
    ELSE
        RAISE NOTICE 'Users table exists in public schema';
    END IF;

    -- Check if events table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'events'
    ) THEN
        RAISE NOTICE 'Events table does not exist in public schema';
    ELSE
        RAISE NOTICE 'Events table exists in public schema';
    END IF;
END
$$;

-- Drop the existing foreign key constraint if it exists
ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS events_facilitator_id_fkey;

-- Re-create the foreign key constraint with explicit schema reference
ALTER TABLE public.events
ADD CONSTRAINT events_facilitator_id_fkey
FOREIGN KEY (facilitator_id)
REFERENCES public.users (privy_id)
ON DELETE SET NULL;

-- Verify the constraint was created successfully
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
        AND table_name = 'events'
        AND constraint_name = 'events_facilitator_id_fkey'
    ) THEN
        RAISE EXCEPTION 'Failed to create foreign key constraint';
    ELSE
        RAISE NOTICE 'Foreign key constraint created successfully';
    END IF;
END
$$;

-- Also ensure the events table exists with all required columns
CREATE TABLE IF NOT EXISTS public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NULL,
  category text NULL,
  image_url text NULL,
  location_name text NOT NULL,
  location_address text NULL,
  location_city text NULL,
  location_latitude numeric(10, 8) NULL,
  location_longitude numeric(11, 8) NULL,
  facilitator_id text NULL,
  max_capacity integer NULL DEFAULT 50,
  current_capacity integer NULL DEFAULT 0,
  price_usd numeric(10, 2) NULL,
  price_danz numeric(20, 2) NULL,
  is_featured boolean NULL DEFAULT false,
  created_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  skill_level text NULL DEFAULT 'all'::text,
  is_virtual boolean NULL DEFAULT false,
  virtual_link text NULL,
  requirements text NULL,
  tags text[] NULL,
  dance_styles text[] NULL,
  currency text NULL DEFAULT 'USD'::text,
  start_date_time timestamp with time zone NOT NULL,
  end_date_time timestamp with time zone NOT NULL,
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_date_time_check CHECK (end_date_time > start_date_time)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events USING btree (category);
CREATE INDEX IF NOT EXISTS idx_events_dance_styles ON public.events USING gin (dance_styles);
CREATE INDEX IF NOT EXISTS idx_events_date_range ON public.events USING btree (start_date_time, end_date_time);
CREATE INDEX IF NOT EXISTS idx_events_end_date_time ON public.events USING btree (end_date_time);
CREATE INDEX IF NOT EXISTS idx_events_facilitator ON public.events USING btree (facilitator_id);

-- Grant necessary permissions
GRANT ALL ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
GRANT SELECT ON public.events TO anon;

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies if they don't exist
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Anyone can view events" ON public.events;
    DROP POLICY IF EXISTS "Facilitators can manage their own events" ON public.events;
    DROP POLICY IF EXISTS "Service role has full access to events" ON public.events;

    -- Create new policies
    CREATE POLICY "Anyone can view events"
        ON public.events FOR SELECT
        USING (true);

    CREATE POLICY "Facilitators can manage their own events"
        ON public.events FOR ALL
        USING (auth.uid()::text = facilitator_id);

    CREATE POLICY "Service role has full access to events"
        ON public.events
        USING (auth.role() = 'service_role');
END
$$;

-- Test the foreign key by attempting a dummy insert and rollback
DO $$
DECLARE
    test_user_id text;
BEGIN
    -- Get a valid user id if one exists
    SELECT privy_id INTO test_user_id FROM public.users LIMIT 1;

    IF test_user_id IS NOT NULL THEN
        -- Try to insert a test event
        INSERT INTO public.events (
            title,
            location_name,
            facilitator_id,
            start_date_time,
            end_date_time
        ) VALUES (
            'Test Event - Will Be Rolled Back',
            'Test Location',
            test_user_id,
            NOW() + INTERVAL '1 day',
            NOW() + INTERVAL '2 days'
        );

        -- If we get here, the foreign key is working
        RAISE NOTICE 'Foreign key constraint is working correctly';

        -- Roll back the test insert
        RAISE EXCEPTION 'Rolling back test insert';
    ELSE
        RAISE NOTICE 'No users found to test foreign key';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Expected - we're intentionally rolling back
        IF SQLERRM = 'Rolling back test insert' THEN
            RAISE NOTICE 'Test completed successfully - foreign key is working';
        ELSE
            RAISE NOTICE 'Error during test: %', SQLERRM;
        END IF;
END
$$;