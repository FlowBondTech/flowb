-- Migration: Update events table to use start_date_time and end_date_time
-- Date: 2025-01-08
-- Description: Changes events table to support multi-day events by replacing separate date/time columns with datetime columns

-- Step 1: Add new columns
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS start_date_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS end_date_time timestamp with time zone;

-- Step 2: Migrate existing data (combine date + start_time/end_time)
UPDATE public.events 
SET 
  start_date_time = (date::timestamp + start_time) AT TIME ZONE 'UTC',
  end_date_time = CASE 
    WHEN end_time IS NOT NULL THEN (date::timestamp + end_time) AT TIME ZONE 'UTC'
    WHEN duration IS NOT NULL THEN ((date::timestamp + start_time) + (duration || ' minutes')::interval) AT TIME ZONE 'UTC'
    ELSE ((date::timestamp + start_time) + '1 hour'::interval) AT TIME ZONE 'UTC'
  END
WHERE start_date_time IS NULL;

-- Step 3: Make new columns NOT NULL after data migration
ALTER TABLE public.events 
ALTER COLUMN start_date_time SET NOT NULL,
ALTER COLUMN end_date_time SET NOT NULL;

-- Step 4: Drop old columns
ALTER TABLE public.events 
DROP COLUMN IF EXISTS date,
DROP COLUMN IF EXISTS start_time,
DROP COLUMN IF EXISTS end_time,
DROP COLUMN IF EXISTS duration;

-- Step 5: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_start_date_time ON public.events (start_date_time);
CREATE INDEX IF NOT EXISTS idx_events_end_date_time ON public.events (end_date_time);
CREATE INDEX IF NOT EXISTS idx_events_date_range ON public.events (start_date_time, end_date_time);

-- Step 6: Add a check constraint to ensure end_date_time is after start_date_time
ALTER TABLE public.events 
ADD CONSTRAINT events_date_time_check 
CHECK (end_date_time > start_date_time);

-- Note: After running this migration, update the database-schema.sql file to reflect these changes
-- Rollback instructions (if needed):
-- 1. Add back the old columns: date, start_time, end_time, duration
-- 2. Populate them from start_date_time and end_date_time
-- 3. Drop the new columns