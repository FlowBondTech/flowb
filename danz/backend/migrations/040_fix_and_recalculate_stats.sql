-- Migration: Fix and recalculate user statistics
-- Date: 2025-11-28
-- Description: Ensures triggers exist and recalculates all user stats
-- Run this in Supabase SQL Editor to fix missing stats

-- PART 1: Recreate trigger functions (will replace if they exist)

-- Function to update user event stats (attended + upcoming)
CREATE OR REPLACE FUNCTION update_user_event_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update created events count
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update achievement count
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update dance bonds count
-- Note: dance_bonds table uses user_id_1 and user_id_2 column names
CREATE OR REPLACE FUNCTION update_user_dance_bonds_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE users
        SET dance_bonds_count = (
            SELECT COUNT(*)
            FROM dance_bonds
            WHERE user_id_1 = NEW.user_id_1 OR user_id_2 = NEW.user_id_1
        )
        WHERE privy_id = NEW.user_id_1;

        UPDATE users
        SET dance_bonds_count = (
            SELECT COUNT(*)
            FROM dance_bonds
            WHERE user_id_1 = NEW.user_id_2 OR user_id_2 = NEW.user_id_2
        )
        WHERE privy_id = NEW.user_id_2;
    END IF;

    IF TG_OP = 'DELETE' THEN
        UPDATE users
        SET dance_bonds_count = (
            SELECT COUNT(*)
            FROM dance_bonds
            WHERE user_id_1 = OLD.user_id_1 OR user_id_2 = OLD.user_id_1
        )
        WHERE privy_id = OLD.user_id_1;

        UPDATE users
        SET dance_bonds_count = (
            SELECT COUNT(*)
            FROM dance_bonds
            WHERE user_id_1 = OLD.user_id_2 OR user_id_2 = OLD.user_id_2
        )
        WHERE privy_id = OLD.user_id_2;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PART 2: Ensure columns exist
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS total_events_attended INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_events_created INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS upcoming_events_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_achievements INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dance_bonds_count INTEGER DEFAULT 0;

-- PART 3: Drop and recreate triggers (ensures they're active)
DROP TRIGGER IF EXISTS update_user_event_stats_trigger ON event_registrations;
DROP TRIGGER IF EXISTS update_user_created_events_trigger ON events;
DROP TRIGGER IF EXISTS update_user_achievement_count_trigger ON achievements;
DROP TRIGGER IF EXISTS update_user_dance_bonds_count_trigger ON dance_bonds;

CREATE TRIGGER update_user_event_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON event_registrations
FOR EACH ROW
EXECUTE FUNCTION update_user_event_stats();

CREATE TRIGGER update_user_created_events_trigger
AFTER INSERT OR UPDATE OR DELETE ON events
FOR EACH ROW
EXECUTE FUNCTION update_user_created_events_count();

-- Only create if achievements table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'achievements') THEN
        CREATE TRIGGER update_user_achievement_count_trigger
        AFTER INSERT OR UPDATE OR DELETE ON achievements
        FOR EACH ROW
        EXECUTE FUNCTION update_user_achievement_count();
    END IF;
END$$;

-- Only create if dance_bonds table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'dance_bonds') THEN
        CREATE TRIGGER update_user_dance_bonds_count_trigger
        AFTER INSERT OR UPDATE OR DELETE ON dance_bonds
        FOR EACH ROW
        EXECUTE FUNCTION update_user_dance_bonds_count();
    END IF;
END$$;

-- PART 4: RECALCULATE ALL STATS NOW (one-time fix)
UPDATE users u
SET
    total_events_attended = COALESCE((
        SELECT COUNT(*)
        FROM event_registrations er
        JOIN events e ON e.id = er.event_id
        WHERE er.user_id = u.privy_id
        AND er.status = 'attended'
    ), 0),
    total_events_created = COALESCE((
        SELECT COUNT(*)
        FROM events
        WHERE facilitator_id = u.privy_id
    ), 0),
    upcoming_events_count = COALESCE((
        SELECT COUNT(*)
        FROM event_registrations er
        JOIN events e ON e.id = er.event_id
        WHERE er.user_id = u.privy_id
        AND er.status = 'registered'
        AND e.start_date_time > NOW()
    ), 0),
    total_achievements = COALESCE((
        SELECT COUNT(*)
        FROM achievements
        WHERE user_id = u.privy_id
    ), 0),
    dance_bonds_count = COALESCE((
        SELECT COUNT(*)
        FROM dance_bonds
        WHERE user_id_1 = u.privy_id OR user_id_2 = u.privy_id
    ), 0);

-- PART 5: Debug query - run this to verify koh's stats
-- Uncomment and run separately to check:
/*
SELECT
    u.username,
    u.display_name,
    u.total_events_created,
    u.total_events_attended,
    u.upcoming_events_count,
    (SELECT COUNT(*) FROM events WHERE facilitator_id = u.privy_id) as actual_events_created,
    (SELECT COUNT(*) FROM event_registrations WHERE user_id = u.privy_id AND status = 'attended') as actual_attended
FROM users u
WHERE u.username = 'koh' OR u.display_name ILIKE '%koh%'
LIMIT 5;
*/

-- Also check if triggers exist:
/*
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%user%';
*/
