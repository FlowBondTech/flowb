-- Migration: Event Check-in Codes
-- Date: 2025-01-28
-- Description: Adds secret check-in codes to events for user self-check-in via code or QR scan

-- Add checkin_code column to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS checkin_code TEXT;

-- Create unique index for checkin codes (only active events)
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_checkin_code_unique
    ON public.events(checkin_code)
    WHERE checkin_code IS NOT NULL;

-- Create index for quick code lookups
CREATE INDEX IF NOT EXISTS idx_events_checkin_code
    ON public.events(checkin_code)
    WHERE checkin_code IS NOT NULL;

-- Function to generate a unique 6-character alphanumeric check-in code
CREATE OR REPLACE FUNCTION generate_unique_checkin_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 6-character uppercase alphanumeric code (excluding confusing chars like 0, O, 1, I, L)
        new_code := upper(substring(
            replace(replace(replace(replace(replace(
                encode(gen_random_bytes(8), 'base64'),
                '0', 'X'), 'O', 'Y'), '1', 'Z'), 'I', 'W'), 'L', 'V'),
            1, 6
        ));

        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM public.events WHERE checkin_code = new_code) INTO code_exists;

        EXIT WHEN NOT code_exists;
    END LOOP;

    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-generate checkin_code when event is created
CREATE OR REPLACE FUNCTION auto_generate_checkin_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.checkin_code IS NULL THEN
        NEW.checkin_code := generate_unique_checkin_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new events
DROP TRIGGER IF EXISTS trigger_auto_generate_checkin_code ON public.events;
CREATE TRIGGER trigger_auto_generate_checkin_code
    BEFORE INSERT ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_checkin_code();

-- Generate codes for existing events that don't have one
DO $$
DECLARE
    event_record RECORD;
BEGIN
    FOR event_record IN SELECT id FROM public.events WHERE checkin_code IS NULL
    LOOP
        UPDATE public.events
        SET checkin_code = generate_unique_checkin_code()
        WHERE id = event_record.id;
    END LOOP;
END $$;

-- Add comment
COMMENT ON COLUMN public.events.checkin_code IS 'Unique 6-character code for user self-check-in. Can be entered manually or scanned as QR code.';

-- Function to regenerate check-in code for an event
CREATE OR REPLACE FUNCTION regenerate_event_checkin_code(event_id UUID)
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
BEGIN
    new_code := generate_unique_checkin_code();

    UPDATE public.events
    SET checkin_code = new_code
    WHERE id = event_id;

    RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
