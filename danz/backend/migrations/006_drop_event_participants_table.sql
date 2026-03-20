-- Migration: Drop unused event_participants table
-- Date: 2025-01-08
-- Description: Removes the event_participants table as it's not being used.
--              All registration functionality is handled by event_registrations table.

-- Drop the table and all its constraints (CASCADE will handle foreign keys)
DROP TABLE IF EXISTS public.event_participants CASCADE;

-- Note: This will also automatically drop:
-- - Primary key constraint: event_participants_pkey
-- - Foreign key constraints: event_participants_event_id_fkey, event_participants_user_id_fkey
-- - Check constraints: event_participants_payment_method_check, event_participants_status_check
-- - Any indexes on this table

-- Verification query (run this to confirm table is dropped):
-- SELECT EXISTS (
--   SELECT FROM information_schema.tables 
--   WHERE table_schema = 'public' 
--   AND table_name = 'event_participants'
-- );
-- Should return: false