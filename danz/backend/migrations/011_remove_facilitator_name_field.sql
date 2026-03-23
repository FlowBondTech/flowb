-- Migration: Remove facilitator_name field from events table
-- Date: 2025-01-11
-- Description: Removes the facilitator_name column from events table as this information
--              should be fetched from the users table via facilitator_id relationship.
--              This ensures data consistency and avoids redundancy.

-- Drop the facilitator_name column from events table
ALTER TABLE public.events 
DROP COLUMN IF EXISTS facilitator_name;

-- Note: The facilitator_id foreign key constraint remains intact
-- Backend will now join with users table to get display_name when needed

-- Rollback instructions (if needed):
-- ALTER TABLE public.events ADD COLUMN facilitator_name text NULL;