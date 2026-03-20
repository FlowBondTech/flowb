-- Migration: Fix function search_path security warnings
-- Date: 2025-01-08
-- Description: Updates trigger functions to have explicit search_path to prevent security vulnerabilities
--              This resolves Supabase linter warnings about mutable search_path

-- Drop and recreate update_updated_at_column with explicit search_path
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate update_event_participant_count with explicit search_path
DROP FUNCTION IF EXISTS update_event_participant_count() CASCADE;

CREATE OR REPLACE FUNCTION update_event_participant_count()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
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

-- Recreate all triggers that were dropped with CASCADE
-- These triggers use the update_updated_at_column function

-- Trigger for dance_bonds table
CREATE TRIGGER update_dance_bonds_updated_at 
BEFORE UPDATE ON dance_bonds 
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for events table
CREATE TRIGGER update_events_updated_at 
BEFORE UPDATE ON events 
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for feed_posts table
CREATE TRIGGER update_feed_posts_updated_at 
BEFORE UPDATE ON feed_posts 
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for event_registrations table
CREATE TRIGGER update_event_registrations_updated_at 
BEFORE UPDATE ON event_registrations 
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for users table
CREATE TRIGGER update_users_updated_at 
BEFORE UPDATE ON users 
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Recreate trigger for event participant count
CREATE TRIGGER update_event_participants_on_registration
AFTER INSERT OR UPDATE OR DELETE ON event_registrations 
FOR EACH ROW
EXECUTE FUNCTION update_event_participant_count();

-- Note: SECURITY DEFINER means the function executes with the privileges of the user who created it
-- SET search_path = public ensures the function only looks in the public schema, preventing hijacking attacks