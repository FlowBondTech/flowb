-- Migration: Rename misleading trigger name
-- Date: 2025-01-08
-- Description: Renames update_event_participants_on_registration trigger to update_event_capacity_on_registration
--              since it updates event capacity based on registrations, not participants table

-- Drop the old trigger
DROP TRIGGER IF EXISTS update_event_participants_on_registration ON event_registrations;

-- Create the trigger with a clearer name
CREATE TRIGGER update_event_capacity_on_registration
AFTER INSERT OR UPDATE OR DELETE ON event_registrations 
FOR EACH ROW
EXECUTE FUNCTION update_event_participant_count();

-- Note: We're keeping the function name as is (update_event_participant_count) 
-- because it correctly describes what it does - updates the participant count.
-- The trigger name was the misleading part.