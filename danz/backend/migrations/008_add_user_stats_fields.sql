-- Migration: Add user statistics fields
-- Date: 2025-01-16
-- Description: Adds computed statistics fields to users table for better query performance

-- Add statistics columns to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS total_events_attended INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_events_created INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS upcoming_events_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_achievements INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dance_bonds_count INTEGER DEFAULT 0;

-- Create function to update user event stats
CREATE OR REPLACE FUNCTION update_user_event_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update attended events count for user
        UPDATE users
        SET total_events_attended = (
            SELECT COUNT(*)
            FROM event_registrations er
            JOIN events e ON e.id = er.event_id
            WHERE er.user_id = NEW.user_id
            AND er.status = 'attended'
        ),
        upcoming_events_count = (
            SELECT COUNT(*)
            FROM event_registrations er
            JOIN events e ON e.id = er.event_id
            WHERE er.user_id = NEW.user_id
            AND er.status = 'registered'
            AND e.start_date_time > NOW()
        )
        WHERE privy_id = NEW.user_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        -- Update attended events count for user
        UPDATE users
        SET total_events_attended = (
            SELECT COUNT(*)
            FROM event_registrations er
            JOIN events e ON e.id = er.event_id
            WHERE er.user_id = OLD.user_id
            AND er.status = 'attended'
        ),
        upcoming_events_count = (
            SELECT COUNT(*)
            FROM event_registrations er
            JOIN events e ON e.id = er.event_id
            WHERE er.user_id = OLD.user_id
            AND er.status = 'registered'
            AND e.start_date_time > NOW()
        )
        WHERE privy_id = OLD.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for event registration stats
CREATE TRIGGER update_user_event_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON event_registrations
FOR EACH ROW
EXECUTE FUNCTION update_user_event_stats();

-- Create function to update user created events count
CREATE OR REPLACE FUNCTION update_user_created_events_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE users
        SET total_events_created = (
            SELECT COUNT(*)
            FROM events
            WHERE facilitator_id = NEW.facilitator_id
        )
        WHERE privy_id = NEW.facilitator_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        UPDATE users
        SET total_events_created = (
            SELECT COUNT(*)
            FROM events
            WHERE facilitator_id = OLD.facilitator_id
        )
        WHERE privy_id = OLD.facilitator_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for created events count
CREATE TRIGGER update_user_created_events_trigger
AFTER INSERT OR UPDATE OR DELETE ON events
FOR EACH ROW
EXECUTE FUNCTION update_user_created_events_count();

-- Create function to update achievement count
CREATE OR REPLACE FUNCTION update_user_achievement_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE users
        SET total_achievements = (
            SELECT COUNT(*)
            FROM achievements
            WHERE user_id = NEW.user_id
        )
        WHERE privy_id = NEW.user_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        UPDATE users
        SET total_achievements = (
            SELECT COUNT(*)
            FROM achievements
            WHERE user_id = OLD.user_id
        )
        WHERE privy_id = OLD.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for achievement count
CREATE TRIGGER update_user_achievement_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON achievements
FOR EACH ROW
EXECUTE FUNCTION update_user_achievement_count();

-- Create function to update dance bonds count
CREATE OR REPLACE FUNCTION update_user_dance_bonds_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update both users in the bond
        UPDATE users
        SET dance_bonds_count = (
            SELECT COUNT(*)
            FROM dance_bonds
            WHERE user1_id = NEW.user1_id OR user2_id = NEW.user1_id
        )
        WHERE privy_id = NEW.user1_id;

        UPDATE users
        SET dance_bonds_count = (
            SELECT COUNT(*)
            FROM dance_bonds
            WHERE user1_id = NEW.user2_id OR user2_id = NEW.user2_id
        )
        WHERE privy_id = NEW.user2_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        -- Update both users in the bond
        UPDATE users
        SET dance_bonds_count = (
            SELECT COUNT(*)
            FROM dance_bonds
            WHERE user1_id = OLD.user1_id OR user2_id = OLD.user1_id
        )
        WHERE privy_id = OLD.user1_id;

        UPDATE users
        SET dance_bonds_count = (
            SELECT COUNT(*)
            FROM dance_bonds
            WHERE user1_id = OLD.user2_id OR user2_id = OLD.user2_id
        )
        WHERE privy_id = OLD.user2_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for dance bonds count
CREATE TRIGGER update_user_dance_bonds_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON dance_bonds
FOR EACH ROW
EXECUTE FUNCTION update_user_dance_bonds_count();

-- Update existing user stats (one-time calculation)
UPDATE users u
SET
    total_events_attended = (
        SELECT COUNT(*)
        FROM event_registrations er
        JOIN events e ON e.id = er.event_id
        WHERE er.user_id = u.privy_id
        AND er.status = 'attended'
    ),
    total_events_created = (
        SELECT COUNT(*)
        FROM events
        WHERE facilitator_id = u.privy_id
    ),
    upcoming_events_count = (
        SELECT COUNT(*)
        FROM event_registrations er
        JOIN events e ON e.id = er.event_id
        WHERE er.user_id = u.privy_id
        AND er.status = 'registered'
        AND e.start_date_time > NOW()
    ),
    total_achievements = (
        SELECT COUNT(*)
        FROM achievements
        WHERE user_id = u.privy_id
    ),
    dance_bonds_count = (
        SELECT COUNT(*)
        FROM dance_bonds
        WHERE user1_id = u.privy_id OR user2_id = u.privy_id
    );