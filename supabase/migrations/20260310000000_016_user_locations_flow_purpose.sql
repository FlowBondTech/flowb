-- ============================================================================
-- 016: User locations and flow purpose for enhanced onboarding
-- ============================================================================

-- User main locations (up to 10 per user)
CREATE TABLE IF NOT EXISTS flowb_user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, city, country)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_locations_user ON flowb_user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_primary ON flowb_user_locations(user_id, is_primary) WHERE is_primary = true;

-- Ensure only one primary per user
CREATE OR REPLACE FUNCTION ensure_single_primary_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE flowb_user_locations
    SET is_primary = false, updated_at = now()
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ensure_single_primary_location
BEFORE INSERT OR UPDATE ON flowb_user_locations
FOR EACH ROW
EXECUTE FUNCTION ensure_single_primary_location();

-- Extend flowb_sessions for flow purpose
ALTER TABLE flowb_sessions
  ADD COLUMN IF NOT EXISTS flow_purpose TEXT CHECK (flow_purpose IN ('fun', 'biz', 'both')),
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- RLS policies
ALTER TABLE flowb_user_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all_user_locations" ON flowb_user_locations FOR ALL USING (true) WITH CHECK (true);

-- Helper function to get user locations
CREATE OR REPLACE FUNCTION get_user_locations(p_user_id TEXT)
RETURNS TABLE (
  id UUID,
  city TEXT,
  country TEXT,
  is_primary BOOLEAN,
  sort_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT ul.id, ul.city, ul.country, ul.is_primary, ul.sort_order
  FROM flowb_user_locations ul
  WHERE ul.user_id = p_user_id
  ORDER BY ul.is_primary DESC, ul.sort_order ASC;
END;
$$ LANGUAGE plpgsql;
