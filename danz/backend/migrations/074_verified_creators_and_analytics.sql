-- Migration: Verified Event Creators & Sponsorship Analytics
-- Date: 2026-01-17
-- Description: Verified creator system and comprehensive analytics tables

-- ============================================================================
-- VERIFIED EVENT CREATORS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.verified_event_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,

  -- Verification status
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by TEXT REFERENCES public.users(privy_id),

  -- Verification criteria metrics
  total_events_hosted INTEGER DEFAULT 0,
  average_event_rating DECIMAL(3,2) DEFAULT 0,
  total_attendees_served INTEGER DEFAULT 0,

  -- Verification requirements thresholds
  -- Auto-verify when: 5+ events, 4.0+ rating, 100+ total attendees
  auto_verified BOOLEAN DEFAULT false,

  -- Manual verification notes
  verification_notes TEXT,
  verification_type VARCHAR(20) DEFAULT 'pending', -- pending/auto/manual

  -- Revocation tracking
  is_revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_by TEXT REFERENCES public.users(privy_id),
  revocation_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT verified_event_creators_user_unique UNIQUE (user_id),
  CONSTRAINT verified_event_creators_type_check CHECK (
    verification_type IN ('pending', 'auto', 'manual')
  )
);

CREATE INDEX IF NOT EXISTS idx_verified_event_creators_user ON public.verified_event_creators(user_id);
CREATE INDEX IF NOT EXISTS idx_verified_event_creators_verified ON public.verified_event_creators(is_verified) WHERE is_verified = true;

-- ============================================================================
-- SPONSOR ANALYTICS TABLE - Aggregated sponsor metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sponsor_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  period_type VARCHAR(10) NOT NULL, -- daily/weekly/monthly
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Spending metrics
  total_flow_spent DECIMAL(20,6) DEFAULT 0,
  events_sponsored INTEGER DEFAULT 0,
  subscription_spent DECIMAL(20,6) DEFAULT 0,
  single_event_spent DECIMAL(20,6) DEFAULT 0,

  -- Reach metrics
  total_dancers_reached INTEGER DEFAULT 0,
  total_event_attendees INTEGER DEFAULT 0,
  unique_workers_supported INTEGER DEFAULT 0,
  volunteer_hours_supported DECIMAL(10,2) DEFAULT 0,

  -- Engagement metrics
  brand_impressions INTEGER DEFAULT 0,
  logo_views INTEGER DEFAULT 0,
  profile_clicks INTEGER DEFAULT 0,
  website_clicks INTEGER DEFAULT 0,
  social_mentions INTEGER DEFAULT 0,

  -- Category breakdown (JSONB)
  spending_by_category JSONB DEFAULT '{}',
  -- e.g., {"music": 2000, "apparel": 1500}

  events_by_dance_style JSONB DEFAULT '{}',
  -- e.g., {"hip_hop": 5, "salsa": 3}

  events_by_region JSONB DEFAULT '{}',

  -- Calculated metrics
  cost_per_impression DECIMAL(10,4),
  cost_per_click DECIMAL(10,4),
  average_event_rating DECIMAL(3,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT sponsor_analytics_unique UNIQUE (sponsor_id, period_type, period_start),
  CONSTRAINT sponsor_analytics_period_check CHECK (
    period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')
  )
);

CREATE INDEX IF NOT EXISTS idx_sponsor_analytics_sponsor ON public.sponsor_analytics(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_analytics_period ON public.sponsor_analytics(period_type, period_start);

-- ============================================================================
-- EVENT SPONSORSHIP ANALYTICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.event_sponsorship_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,

  -- Funding metrics
  total_sponsorship_received DECIMAL(20,6) DEFAULT 0,
  number_of_sponsors INTEGER DEFAULT 0,
  goal_percentage DECIMAL(5,2),

  -- Distribution metrics
  total_distributed_to_workers DECIMAL(20,6) DEFAULT 0,
  total_distributed_to_volunteers DECIMAL(20,6) DEFAULT 0,
  platform_fees_paid DECIMAL(20,6) DEFAULT 0,
  workers_paid INTEGER DEFAULT 0,
  volunteers_rewarded INTEGER DEFAULT 0,

  -- Sponsor breakdown (JSONB)
  sponsors_by_tier JSONB DEFAULT '{}',
  -- e.g., {"gold": 2, "silver": 3}

  sponsors_by_category JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT event_sponsorship_analytics_event_unique UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS idx_event_sponsorship_analytics_event ON public.event_sponsorship_analytics(event_id);

-- ============================================================================
-- PLATFORM SPONSORSHIP ANALYTICS - Admin overview
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_sponsorship_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type VARCHAR(10) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Volume metrics
  total_flow_volume DECIMAL(20,6) DEFAULT 0,
  total_sponsors_active INTEGER DEFAULT 0,
  total_events_sponsored INTEGER DEFAULT 0,
  total_workers_paid INTEGER DEFAULT 0,
  total_creators_receiving INTEGER DEFAULT 0,

  -- Subscription metrics
  active_subscriptions INTEGER DEFAULT 0,
  monthly_subscriptions INTEGER DEFAULT 0,
  yearly_subscriptions INTEGER DEFAULT 0,
  subscription_revenue DECIMAL(20,6) DEFAULT 0,

  -- Platform revenue
  total_platform_fees DECIMAL(20,6) DEFAULT 0,

  -- Growth metrics
  new_sponsors INTEGER DEFAULT 0,
  churned_sponsors INTEGER DEFAULT 0,
  sponsor_retention_rate DECIMAL(5,2),

  -- Category performance
  volume_by_category JSONB DEFAULT '{}',
  growth_by_category JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT platform_sponsorship_analytics_unique UNIQUE (period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_platform_analytics_period ON public.platform_sponsorship_analytics(period_type, period_start);

-- ============================================================================
-- HELPER FUNCTIONS - Verified Creators
-- ============================================================================

-- Check if user meets verification criteria
CREATE OR REPLACE FUNCTION check_creator_verification_criteria(p_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_events INTEGER;
  v_rating DECIMAL;
  v_attendees INTEGER;
  v_meets_criteria BOOLEAN;
BEGIN
  -- Get event stats
  SELECT
    COUNT(*),
    COALESCE(AVG(e.average_rating), 0),
    COALESCE(SUM(e.registration_count), 0)
  INTO v_events, v_rating, v_attendees
  FROM public.events e
  WHERE e.creator_id = p_user_id
    AND e.end_date_time < NOW(); -- Only completed events

  -- Check criteria (5+ events, 4.0+ rating, 100+ attendees)
  v_meets_criteria := v_events >= 5 AND v_rating >= 4.0 AND v_attendees >= 100;

  RETURN jsonb_build_object(
    'total_events', v_events,
    'average_rating', v_rating,
    'total_attendees', v_attendees,
    'meets_criteria', v_meets_criteria,
    'events_needed', GREATEST(0, 5 - v_events),
    'rating_needed', CASE WHEN v_rating >= 4.0 THEN 0 ELSE 4.0 - v_rating END,
    'attendees_needed', GREATEST(0, 100 - v_attendees)
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Auto-verify creator if criteria met
CREATE OR REPLACE FUNCTION auto_verify_creator_if_eligible(p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_check JSONB;
  v_creator_id UUID;
BEGIN
  v_check := check_creator_verification_criteria(p_user_id);

  IF (v_check->>'meets_criteria')::boolean THEN
    -- Create or update verified creator record
    INSERT INTO public.verified_event_creators (
      user_id,
      is_verified,
      verified_at,
      total_events_hosted,
      average_event_rating,
      total_attendees_served,
      auto_verified,
      verification_type
    ) VALUES (
      p_user_id,
      true,
      NOW(),
      (v_check->>'total_events')::integer,
      (v_check->>'average_rating')::decimal,
      (v_check->>'total_attendees')::integer,
      true,
      'auto'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      is_verified = true,
      verified_at = COALESCE(verified_event_creators.verified_at, NOW()),
      total_events_hosted = (v_check->>'total_events')::integer,
      average_event_rating = (v_check->>'average_rating')::decimal,
      total_attendees_served = (v_check->>'total_attendees')::integer,
      auto_verified = CASE WHEN verified_event_creators.is_verified THEN verified_event_creators.auto_verified ELSE true END,
      verification_type = CASE WHEN verified_event_creators.is_verified THEN verified_event_creators.verification_type ELSE 'auto' END,
      updated_at = NOW();

    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTIONS - Analytics
-- ============================================================================

-- Calculate impact score for sponsor
CREATE OR REPLACE FUNCTION calculate_sponsor_impact_score(p_sponsor_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_sponsor RECORD;
  v_reach_score DECIMAL;
  v_support_score DECIMAL;
  v_engagement_score DECIMAL;
  v_consistency_score DECIMAL;
  v_total_score DECIMAL;
  v_grade VARCHAR(2);
BEGIN
  SELECT * INTO v_sponsor FROM public.sponsors WHERE id = p_sponsor_id;

  IF v_sponsor IS NULL THEN
    RETURN jsonb_build_object('error', 'sponsor_not_found');
  END IF;

  -- Normalize scores (0-1 scale)
  v_reach_score := LEAST(1.0, v_sponsor.total_events_sponsored::decimal / 50);
  v_support_score := LEAST(1.0, v_sponsor.total_flow_contributed / 10000);

  -- Calculate weighted total (simplified)
  -- Reach 30%, Support 25%, Engagement 25%, Consistency 20%
  v_total_score := (v_reach_score * 0.3) + (v_support_score * 0.7);

  -- Convert to grade
  IF v_total_score >= 0.9 THEN v_grade := 'A+';
  ELSIF v_total_score >= 0.8 THEN v_grade := 'A';
  ELSIF v_total_score >= 0.7 THEN v_grade := 'B+';
  ELSIF v_total_score >= 0.6 THEN v_grade := 'B';
  ELSIF v_total_score >= 0.5 THEN v_grade := 'C';
  ELSE v_grade := 'D';
  END IF;

  RETURN jsonb_build_object(
    'total_score', round(v_total_score * 100),
    'grade', v_grade,
    'reach_score', round(v_reach_score * 100),
    'support_score', round(v_support_score * 100),
    'total_events', v_sponsor.total_events_sponsored,
    'total_invested', v_sponsor.total_flow_contributed
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update verified creator stats when event completes
CREATE OR REPLACE FUNCTION update_verified_creator_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when event ends
  IF NEW.end_date_time IS NOT NULL AND NEW.end_date_time < NOW() THEN
    -- Update or create verified creator record
    INSERT INTO public.verified_event_creators (
      user_id,
      total_events_hosted,
      average_event_rating,
      total_attendees_served
    )
    SELECT
      NEW.creator_id,
      COUNT(*),
      COALESCE(AVG(average_rating), 0),
      COALESCE(SUM(registration_count), 0)
    FROM public.events
    WHERE creator_id = NEW.creator_id AND end_date_time < NOW()
    ON CONFLICT (user_id) DO UPDATE SET
      total_events_hosted = EXCLUDED.total_events_hosted,
      average_event_rating = EXCLUDED.average_event_rating,
      total_attendees_served = EXCLUDED.total_attendees_served,
      updated_at = NOW();

    -- Check for auto-verification
    PERFORM auto_verify_creator_if_eligible(NEW.creator_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_verified_creator_stats ON public.events;
CREATE TRIGGER trigger_update_verified_creator_stats
  AFTER INSERT OR UPDATE OF end_date_time, average_rating, registration_count ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION update_verified_creator_stats();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_verified_creators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_verified_creators_updated_at ON public.verified_event_creators;
CREATE TRIGGER trigger_verified_creators_updated_at
  BEFORE UPDATE ON public.verified_event_creators
  FOR EACH ROW
  EXECUTE FUNCTION update_verified_creators_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.verified_event_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_sponsorship_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_sponsorship_analytics ENABLE ROW LEVEL SECURITY;

-- Verified creators: public can see verified status
CREATE POLICY "verified_creators_public" ON public.verified_event_creators
FOR SELECT USING (is_verified = true);

-- Users can see their own verification status
CREATE POLICY "verified_creators_own" ON public.verified_event_creators
FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

-- Admins can manage all
CREATE POLICY "verified_creators_admin" ON public.verified_event_creators
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = auth.uid()::text AND is_admin = true
  )
);

-- Sponsor analytics: sponsors see their own
CREATE POLICY "sponsor_analytics_own" ON public.sponsor_analytics
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sponsors s
    WHERE s.id = sponsor_id AND s.user_id = auth.uid()::text
  )
);

-- Event analytics: creators see their own events
CREATE POLICY "event_sponsorship_analytics_creator" ON public.event_sponsorship_analytics
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.creator_id = auth.uid()::text
  )
);

-- Platform analytics: admins only
CREATE POLICY "platform_analytics_admin" ON public.platform_sponsorship_analytics
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = auth.uid()::text AND is_admin = true
  )
);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.verified_event_creators TO anon;
GRANT SELECT ON public.verified_event_creators TO authenticated;
GRANT ALL ON public.verified_event_creators TO service_role;

GRANT SELECT ON public.sponsor_analytics TO authenticated;
GRANT ALL ON public.sponsor_analytics TO service_role;

GRANT SELECT ON public.event_sponsorship_analytics TO authenticated;
GRANT ALL ON public.event_sponsorship_analytics TO service_role;

GRANT SELECT ON public.platform_sponsorship_analytics TO authenticated;
GRANT ALL ON public.platform_sponsorship_analytics TO service_role;
