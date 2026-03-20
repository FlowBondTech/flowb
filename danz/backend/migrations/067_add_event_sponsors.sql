-- Migration: Add event sponsors functionality
-- Date: 2026-01-17
-- Description: Adds ability for events to accept and display sponsors

-- ============================================================================
-- ADD SPONSOR FIELDS TO EVENTS TABLE
-- ============================================================================

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS allow_sponsors BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sponsor_benefits TEXT,
ADD COLUMN IF NOT EXISTS sponsor_contact_email TEXT,
ADD COLUMN IF NOT EXISTS sponsor_tier_config JSONB DEFAULT '{}';

COMMENT ON COLUMN public.events.allow_sponsors IS 'Whether this event accepts sponsors';
COMMENT ON COLUMN public.events.sponsor_benefits IS 'Description of what sponsors receive (visibility, branding, etc.)';
COMMENT ON COLUMN public.events.sponsor_contact_email IS 'Contact email for sponsorship inquiries';
COMMENT ON COLUMN public.events.sponsor_tier_config IS 'Configuration for sponsorship tiers (gold, silver, bronze levels, pricing, etc.)';

-- ============================================================================
-- CREATE EVENT SPONSORS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.event_sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,

  -- Sponsor Info
  sponsor_name TEXT NOT NULL,
  sponsor_description TEXT,
  sponsor_logo_url TEXT,
  sponsor_website TEXT,
  sponsor_contact_email TEXT,

  -- Sponsorship Details
  sponsorship_tier TEXT NOT NULL DEFAULT 'bronze', -- gold, silver, bronze, community
  sponsorship_amount NUMERIC(20,2),
  danz_contribution NUMERIC(20,2) DEFAULT 0, -- $DANZ they're contributing to the event

  -- Display Settings
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  show_on_event_page BOOLEAN DEFAULT true,
  custom_message TEXT, -- Optional message from sponsor

  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, declined, cancelled
  approved_by TEXT REFERENCES public.users(privy_id),
  approved_at TIMESTAMPTZ,

  -- Sponsor User (if they have a DANZ account)
  user_id TEXT REFERENCES public.users(privy_id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one sponsor per event (can be relaxed later)
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_sponsors_event_user
ON public.event_sponsors(event_id, user_id) WHERE user_id IS NOT NULL;

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_event_sponsors_event_id ON public.event_sponsors(event_id);
CREATE INDEX IF NOT EXISTS idx_event_sponsors_status ON public.event_sponsors(status);
CREATE INDEX IF NOT EXISTS idx_event_sponsors_tier ON public.event_sponsors(sponsorship_tier);

-- ============================================================================
-- SPONSORSHIP TIERS REFERENCE
-- ============================================================================

-- Default tier configuration (stored in event's sponsor_tier_config)
-- {
--   "tiers": [
--     {
--       "name": "Gold",
--       "slug": "gold",
--       "price_usd": 500,
--       "benefits": ["Logo on main banner", "VIP passes (4)", "Shoutout during event", "Social media feature"],
--       "max_sponsors": 1
--     },
--     {
--       "name": "Silver",
--       "slug": "silver",
--       "price_usd": 250,
--       "benefits": ["Logo on event page", "VIP passes (2)", "Social media mention"],
--       "max_sponsors": 3
--     },
--     {
--       "name": "Bronze",
--       "slug": "bronze",
--       "price_usd": 100,
--       "benefits": ["Logo on sponsors section", "Free tickets (2)"],
--       "max_sponsors": 5
--     },
--     {
--       "name": "Community",
--       "slug": "community",
--       "price_usd": 0,
--       "benefits": ["Name listed as supporter", "Our gratitude"],
--       "max_sponsors": null
--     }
--   ]
-- }

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get sponsor count for an event
CREATE OR REPLACE FUNCTION get_event_sponsor_count(p_event_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.event_sponsors
    WHERE event_id = p_event_id
    AND status = 'approved'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get featured sponsor for an event
CREATE OR REPLACE FUNCTION get_featured_sponsor(p_event_id UUID)
RETURNS TABLE (
  id UUID,
  sponsor_name TEXT,
  sponsor_logo_url TEXT,
  sponsorship_tier TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    es.id,
    es.sponsor_name,
    es.sponsor_logo_url,
    es.sponsorship_tier
  FROM public.event_sponsors es
  WHERE es.event_id = p_event_id
  AND es.status = 'approved'
  AND es.is_featured = true
  ORDER BY es.display_order
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.event_sponsors ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved sponsors for public events
CREATE POLICY "event_sponsors_select_public" ON public.event_sponsors
FOR SELECT USING (
  status = 'approved'
  AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.is_public = true
  )
);

-- Authenticated users can view sponsors for events they have access to
CREATE POLICY "event_sponsors_select_auth" ON public.event_sponsors
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id
    AND (e.creator_id = auth.uid()::text OR e.is_public = true)
  )
);

-- Event creators can manage sponsors
CREATE POLICY "event_sponsors_insert" ON public.event_sponsors
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.creator_id = auth.uid()::text
  )
);

CREATE POLICY "event_sponsors_update" ON public.event_sponsors
FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.creator_id = auth.uid()::text
  )
);

CREATE POLICY "event_sponsors_delete" ON public.event_sponsors
FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.creator_id = auth.uid()::text
  )
);

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_event_sponsors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_event_sponsors_updated_at ON public.event_sponsors;
CREATE TRIGGER trigger_event_sponsors_updated_at
  BEFORE UPDATE ON public.event_sponsors
  FOR EACH ROW
  EXECUTE FUNCTION update_event_sponsors_updated_at();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.event_sponsors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_sponsors TO authenticated;
GRANT ALL ON public.event_sponsors TO service_role;
