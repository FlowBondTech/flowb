-- Migration: Fix event registration trigger to handle UPDATE operations
-- Date: 2025-01-08
-- Description: Updates the trigger in database-schema.sql to properly format
--              the trigger definition for UPDATE operations

-- Note: This migration is just a formatting fix for the database-schema.sql file
-- The actual trigger is already correctly defined in the database from migration 003

-- The trigger definition in database-schema.sql should be:
-- create trigger update_event_participants_on_registration
-- AFTER INSERT OR UPDATE OR DELETE ON event_registrations 
-- FOR EACH ROW
-- EXECUTE FUNCTION update_event_participant_count();

-- This is already correctly implemented in the database.
-- No actual database changes needed.