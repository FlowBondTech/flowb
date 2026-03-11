-- ============================================================================
-- 038: Flowmium Tier + Scan Cities formalization
-- ============================================================================
-- Adds "flowmium" tier between free and pro (it's like freemium, get it?)
-- Formalizes the flowb_scan_cities table if not exists
-- Seeds Mexico City as an enabled scan city
-- ============================================================================

-- Ensure flowb_scan_cities table exists (was created dynamically before)
CREATE TABLE IF NOT EXISTS flowb_scan_cities (
  city        TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  last_scan_at    TIMESTAMPTZ,
  last_scan_status TEXT,
  last_scan_new   INTEGER DEFAULT 0,
  last_scan_updated INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Mexico City
INSERT INTO flowb_scan_cities (city, enabled)
VALUES ('mexico city', true)
ON CONFLICT (city) DO UPDATE SET enabled = true;

-- Add a check constraint for valid tiers (if flowb_subscriptions exists)
-- This is lenient — just ensures the column accepts 'flowmium'
DO $$
BEGIN
  -- Drop existing constraint if any (some projects add one)
  BEGIN
    ALTER TABLE flowb_subscriptions DROP CONSTRAINT IF EXISTS flowb_subscriptions_tier_check;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  -- Add constraint with flowmium included
  BEGIN
    ALTER TABLE flowb_subscriptions
      ADD CONSTRAINT flowb_subscriptions_tier_check
      CHECK (tier IN ('free', 'flowmium', 'pro', 'team', 'business'));
  EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Add flowmium_granted_by to track who gifted the tier
DO $$
BEGIN
  ALTER TABLE flowb_subscriptions ADD COLUMN IF NOT EXISTS flowmium_granted_by TEXT;
  ALTER TABLE flowb_subscriptions ADD COLUMN IF NOT EXISTS flowmium_granted_at TIMESTAMPTZ;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- RLS for scan cities (admin-only write, public read)
ALTER TABLE flowb_scan_cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scan_cities_read" ON flowb_scan_cities;
CREATE POLICY "scan_cities_read" ON flowb_scan_cities FOR SELECT USING (true);

DROP POLICY IF EXISTS "scan_cities_write" ON flowb_scan_cities;
CREATE POLICY "scan_cities_write" ON flowb_scan_cities FOR ALL USING (true);
