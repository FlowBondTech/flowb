-- Migration: Add missing trigger functions
-- Date: 2025-01-08
-- Description: Creates the update_updated_at_column and update_event_participant_count functions
--              that are referenced by table triggers but were missing from the initial schema

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to maintain event participant count
CREATE OR REPLACE FUNCTION update_event_participant_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update current_capacity when a new registration is added
        UPDATE events 
        SET current_capacity = (
            SELECT COUNT(*) 
            FROM event_registrations 
            WHERE event_id = NEW.event_id 
            AND status IN ('registered', 'attended')
        )
        WHERE id = NEW.event_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Update current_capacity when registration status changes
        UPDATE events 
        SET current_capacity = (
            SELECT COUNT(*) 
            FROM event_registrations 
            WHERE event_id = NEW.event_id 
            AND status IN ('registered', 'attended')
        )
        WHERE id = NEW.event_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update current_capacity when a registration is deleted
        UPDATE events 
        SET current_capacity = (
            SELECT COUNT(*) 
            FROM event_registrations 
            WHERE event_id = OLD.event_id 
            AND status IN ('registered', 'attended')
        )
        WHERE id = OLD.event_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Note: The triggers that use these functions are already defined in the table schemas:
-- - update_dance_bonds_updated_at (dance_bonds table)
-- - update_events_updated_at (events table)
-- - update_feed_posts_updated_at (feed_posts table)
-- - update_event_registrations_updated_at (event_registrations table)
-- - update_event_participants_on_registration (event_registrations table)
-- - update_users_updated_at (users table)