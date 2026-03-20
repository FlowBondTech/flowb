-- Migration: Sponsors Table
-- Date: 2026-01-17
-- Description: Creates full sponsor profiles for companies/individuals who fund events

-- ============================================================================
-- SPONSORS TABLE - Full sponsor profiles
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,

  -- Company Information
  company_name VARCHAR(255) NOT NULL,
  company_description TEXT,
  logo_url VARCHAR(500),
  website_url VARCHAR(500),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),

  -- Categories (array for multi-category sponsors)
  categories TEXT[] NOT NULL DEFAULT '{}',

  -- Tier based on total contributions (bronze/silver/gold/platinum/diamond)
  tier VARCHAR(20) DEFAULT 'bronze',

  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by TEXT REFERENCES public.users(privy_id),

  -- Location and Event Preferences
  preferred_regions TEXT[] DEFAULT '{}',
  preferred_event_types TEXT[] DEFAULT '{}',
  preferred_dance_styles TEXT[] DEFAULT '{}',

  -- Stats (updated via triggers)
  total_events_sponsored INTEGER DEFAULT 0,
  total_flow_contributed DECIMAL(20,6) DEFAULT 0,
  total_danz_distributed DECIMAL(20,6) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT sponsors_user_id_unique UNIQUE (user_id),
  CONSTRAINT sponsors_tier_check CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond'))
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_sponsors_user_id ON public.sponsors(user_id);
CREATE INDEX IF NOT EXISTS idx_sponsors_tier ON public.sponsors(tier);
CREATE INDEX IF NOT EXISTS idx_sponsors_verified ON public.sponsors(is_verified) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_sponsors_categories ON public.sponsors USING GIN (categories);
CREATE INDEX IF NOT EXISTS idx_sponsors_regions ON public.sponsors USING GIN (preferred_regions);
CREATE INDEX IF NOT EXISTS idx_sponsors_dance_styles ON public.sponsors USING GIN (preferred_dance_styles);

-- ============================================================================
-- SPONSOR TIER THRESHOLDS
-- ============================================================================
-- Tier calculation is based on total_flow_contributed:
-- Diamond: 10,000+ $FLOW
-- Platinum: 5,000+ $FLOW
-- Gold: 1,000+ $FLOW
-- Silver: 500+ $FLOW
-- Bronze: 0+ $FLOW (default)

-- Function to calculate sponsor tier based on contributions
CREATE OR REPLACE FUNCTION calculate_sponsor_tier(total_flow DECIMAL)
RETURNS VARCHAR(20) AS $$
BEGIN
  IF total_flow >= 10000 THEN
    RETURN 'diamond';
  ELSIF total_flow >= 5000 THEN
    RETURN 'platinum';
  ELSIF total_flow >= 1000 THEN
    RETURN 'gold';
  ELSIF total_flow >= 500 THEN
    RETURN 'silver';
  ELSE
    RETURN 'bronze';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_sponsors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- Auto-update tier based on contributions
  NEW.tier = calculate_sponsor_tier(NEW.total_flow_contributed);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sponsors_updated_at ON public.sponsors;
CREATE TRIGGER trigger_sponsors_updated_at
  BEFORE UPDATE ON public.sponsors
  FOR EACH ROW
  EXECUTE FUNCTION update_sponsors_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

-- Anyone can view sponsor profiles (public)
CREATE POLICY "sponsors_select_all" ON public.sponsors
FOR SELECT USING (true);

-- Users can create their own sponsor profile
CREATE POLICY "sponsors_insert_own" ON public.sponsors
FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()::text
);

-- Users can update their own sponsor profile
CREATE POLICY "sponsors_update_own" ON public.sponsors
FOR UPDATE TO authenticated USING (
  user_id = auth.uid()::text
);

-- Users can delete their own sponsor profile
CREATE POLICY "sponsors_delete_own" ON public.sponsors
FOR DELETE TO authenticated USING (
  user_id = auth.uid()::text
);

-- Admins can manage all sponsors
CREATE POLICY "sponsors_admin_all" ON public.sponsors
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = auth.uid()::text AND is_admin = true
  )
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get sponsor by user ID
CREATE OR REPLACE FUNCTION get_sponsor_by_user(p_user_id TEXT)
RETURNS SETOF public.sponsors AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.sponsors WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if user is a sponsor
CREATE OR REPLACE FUNCTION is_user_sponsor(p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.sponsors WHERE user_id = p_user_id);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.sponsors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsors TO authenticated;
GRANT ALL ON public.sponsors TO service_role;
