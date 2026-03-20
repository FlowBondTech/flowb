-- Migration: Remove status field from events table
-- Date: 2025-01-08
-- Description: Remove the status field from events table as status will be calculated dynamically from timestamps

-- First, drop the existing RLS policy that depends on the status column
DROP POLICY IF EXISTS "Anyone can view published events" ON public.events;

-- Drop the check constraint if it exists
ALTER TABLE public.events 
DROP CONSTRAINT IF EXISTS events_status_check;

-- Now drop the status column from events table
ALTER TABLE public.events 
DROP COLUMN IF EXISTS status;

-- Recreate the RLS policy without status dependency
-- This policy allows anyone to view events (we'll use date filtering in the application layer)
CREATE POLICY "Anyone can view published events" 
ON public.events 
FOR SELECT 
USING (true);

-- Note: After running this migration, update database-schema.sql to reflect these changes