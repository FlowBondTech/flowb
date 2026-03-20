-- Migration: Add public event sharing
-- Date: 2026-01-02
-- Description: Add slug and is_public fields to events for public sharing

-- Add slug field for URL-friendly event identifiers
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add is_public field to control public visibility
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Create unique index on slug (only for non-null slugs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug
ON public.events (slug)
WHERE slug IS NOT NULL;

-- Create index for public events lookup
CREATE INDEX IF NOT EXISTS idx_events_is_public
ON public.events (is_public)
WHERE is_public = true;

-- Function to generate URL-friendly slug from title
CREATE OR REPLACE FUNCTION generate_event_slug(title TEXT, event_id UUID)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Convert title to lowercase and replace non-alphanumeric with hyphens
    base_slug := regexp_replace(
        regexp_replace(
            lower(trim(title)),
            '[^a-z0-9]+', '-', 'g'
        ),
        '^-|-$', '', 'g'  -- Remove leading/trailing hyphens
    );

    -- Limit slug length
    base_slug := left(base_slug, 50);

    -- Start with base slug
    final_slug := base_slug;

    -- Check for uniqueness and append counter if needed
    WHILE EXISTS (SELECT 1 FROM public.events WHERE slug = final_slug AND id != event_id) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;

    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for all existing events that don't have one
DO $$
DECLARE
    event_record RECORD;
BEGIN
    FOR event_record IN
        SELECT id, title
        FROM public.events
        WHERE slug IS NULL
    LOOP
        UPDATE public.events
        SET slug = generate_event_slug(event_record.title, event_record.id)
        WHERE id = event_record.id;
    END LOOP;
END $$;

-- Trigger to auto-generate slug on insert if not provided
CREATE OR REPLACE FUNCTION set_event_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := generate_event_slug(NEW.title, COALESCE(NEW.id, gen_random_uuid()));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_event_slug ON public.events;
CREATE TRIGGER trigger_set_event_slug
    BEFORE INSERT ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION set_event_slug();

-- Add comment for documentation
COMMENT ON COLUMN public.events.slug IS 'URL-friendly identifier for public event pages';
COMMENT ON COLUMN public.events.is_public IS 'Whether the event is publicly shareable';
