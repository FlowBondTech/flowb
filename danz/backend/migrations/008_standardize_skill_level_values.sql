-- Migration: Standardize skill_level values across tables
-- Date: 2025-01-17
-- Description: Ensures consistent lowercase skill_level values in both events and users tables

-- First, check what values currently exist
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE 'Current unique skill_level values in users table:';
  FOR r IN SELECT DISTINCT skill_level FROM public.users WHERE skill_level IS NOT NULL ORDER BY skill_level
  LOOP
    RAISE NOTICE '  - %', r.skill_level;
  END LOOP;

  RAISE NOTICE 'Current unique skill_level values in events table:';
  FOR r IN SELECT DISTINCT skill_level FROM public.events WHERE skill_level IS NOT NULL ORDER BY skill_level
  LOOP
    RAISE NOTICE '  - %', r.skill_level;
  END LOOP;
END $$;

-- Drop the existing constraints first (before any updates)
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_skill_level_check;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_skill_level_check;

-- Now update any PascalCase or other non-standard values to lowercase
-- Handle 'Professional' -> 'advanced'
UPDATE public.users
SET skill_level = 'advanced'
WHERE LOWER(skill_level) = 'professional';

-- Handle any remaining PascalCase values
UPDATE public.users
SET skill_level = LOWER(skill_level)
WHERE skill_level IS NOT NULL
  AND skill_level != LOWER(skill_level);

UPDATE public.events
SET skill_level = LOWER(skill_level)
WHERE skill_level IS NOT NULL
  AND skill_level != LOWER(skill_level);

-- Add new constraints with consistent lowercase values
ALTER TABLE public.events
ADD CONSTRAINT events_skill_level_check CHECK (
  skill_level IS NULL OR skill_level = ANY(ARRAY[
    'all'::text,
    'beginner'::text,
    'intermediate'::text,
    'advanced'::text
  ])
);

ALTER TABLE public.users
ADD CONSTRAINT users_skill_level_check CHECK (
  skill_level IS NULL OR skill_level = ANY(ARRAY[
    'all'::text,
    'beginner'::text,
    'intermediate'::text,
    'advanced'::text
  ])
);

-- Verify the migration
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE 'Migration complete. Final unique skill_level values:';
  RAISE NOTICE 'Users table:';
  FOR r IN SELECT DISTINCT skill_level FROM public.users WHERE skill_level IS NOT NULL ORDER BY skill_level
  LOOP
    RAISE NOTICE '  - %', r.skill_level;
  END LOOP;

  RAISE NOTICE 'Events table:';
  FOR r IN SELECT DISTINCT skill_level FROM public.events WHERE skill_level IS NOT NULL ORDER BY skill_level
  LOOP
    RAISE NOTICE '  - %', r.skill_level;
  END LOOP;
END $$;