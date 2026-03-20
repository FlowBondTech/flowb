-- Migration: Add recurring events support
-- Date: 2025-01-28
-- Description: Adds fields for recurring/repeating events

-- Add recurrence type enum
DO $$ BEGIN
  CREATE TYPE recurrence_type AS ENUM ('none', 'daily', 'weekly', 'biweekly', 'monthly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add recurring event fields to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_type recurrence_type DEFAULT 'none',
ADD COLUMN IF NOT EXISTS recurrence_end_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS recurrence_days text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parent_event_id uuid DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurrence_count integer DEFAULT NULL;

-- Add foreign key for parent_event_id (self-referencing)
DO $$ BEGIN
  ALTER TABLE public.events
  ADD CONSTRAINT events_parent_event_id_fkey
  FOREIGN KEY (parent_event_id)
  REFERENCES events (id)
  ON UPDATE CASCADE
  ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add index for recurring events
CREATE INDEX IF NOT EXISTS idx_events_is_recurring
ON public.events USING btree (is_recurring)
WHERE is_recurring = true;

-- Add index for parent_event_id
CREATE INDEX IF NOT EXISTS idx_events_parent_event_id
ON public.events USING btree (parent_event_id)
WHERE parent_event_id IS NOT NULL;

-- Add index for recurrence_type
CREATE INDEX IF NOT EXISTS idx_events_recurrence_type
ON public.events USING btree (recurrence_type)
WHERE recurrence_type != 'none';

-- Add constraint for recurrence validation
ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS events_recurrence_check;

ALTER TABLE public.events
ADD CONSTRAINT events_recurrence_check CHECK (
  (is_recurring = false AND recurrence_type = 'none') OR
  (is_recurring = true AND recurrence_type != 'none' AND recurrence_end_date IS NOT NULL)
);

-- Add constraint for recurrence_days (only for weekly events)
ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS events_recurrence_days_check;

ALTER TABLE public.events
ADD CONSTRAINT events_recurrence_days_check CHECK (
  recurrence_type != 'weekly' OR
  (recurrence_type = 'weekly' AND recurrence_days IS NOT NULL AND array_length(recurrence_days, 1) > 0)
);

-- Comment on new columns
COMMENT ON COLUMN public.events.is_recurring IS 'Whether this event repeats on a schedule';
COMMENT ON COLUMN public.events.recurrence_type IS 'How often the event repeats: none, daily, weekly, biweekly, monthly';
COMMENT ON COLUMN public.events.recurrence_end_date IS 'When the recurring series should end';
COMMENT ON COLUMN public.events.recurrence_days IS 'Days of week for weekly events: monday, tuesday, etc.';
COMMENT ON COLUMN public.events.parent_event_id IS 'Reference to the parent event for recurring instances';
COMMENT ON COLUMN public.events.recurrence_count IS 'Number of occurrences to generate (optional, alternative to end_date)';

-- Update database-schema.sql documentation
-- Note: The events table now includes these recurring event fields:
--   is_recurring boolean DEFAULT false
--   recurrence_type recurrence_type DEFAULT 'none' (enum: none, daily, weekly, biweekly, monthly)
--   recurrence_end_date timestamp with time zone
--   recurrence_days text[] (for weekly: ['monday', 'wednesday', 'friday'])
--   parent_event_id uuid (references parent recurring event)
--   recurrence_count integer (optional: number of occurrences)
