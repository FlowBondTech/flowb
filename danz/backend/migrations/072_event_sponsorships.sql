-- Migration: Enhanced Event Sponsorships
-- Date: 2026-01-17
-- Description: Extends event sponsorship system with $FLOW allocation and tracking

-- ============================================================================
-- ENHANCED EVENT SPONSORSHIPS TABLE
-- ============================================================================
-- This extends the basic event_sponsors table (migration 067) with:
-- - Full $FLOW allocation tracking
-- - Allocation configuration for workers/volunteers/platform
-- - Status workflow for sponsorship lifecycle

CREATE TABLE IF NOT EXISTS public.event_sponsorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,

  -- Funding amounts (in $FLOW)
  flow_amount DECIMAL(20,6) NOT NULL,
  flow_allocated DECIMAL(20,6) DEFAULT 0,
  flow_distributed DECIMAL(20,6) DEFAULT 0,

  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending', -- pending/active/completed/cancelled/refunded

  -- Allocation breakdown (JSONB for flexibility)
  allocation_config JSONB DEFAULT '{"paid_workers": 80, "volunteer_rewards": 15, "platform_fee": 5}',
  -- Example: {"paid_workers": 70, "volunteer_rewards": 20, "platform_fee": 10}

  -- Visibility preferences
  visibility VARCHAR(20) DEFAULT 'visible', -- visible/anonymous/featured
  sponsor_message TEXT,

  -- Completion tracking
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,

  -- Reference to basic event_sponsors entry if exists
  legacy_sponsor_id UUID REFERENCES public.event_sponsors(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT event_sponsorships_unique UNIQUE (event_id, sponsor_id),
  CONSTRAINT event_sponsorships_status_check CHECK (
    status IN ('pending', 'active', 'completed', 'cancelled', 'refunded')
  ),
  CONSTRAINT event_sponsorships_visibility_check CHECK (
    visibility IN ('visible', 'anonymous', 'featured')
  ),
  CONSTRAINT event_sponsorships_flow_positive CHECK (flow_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_event_sponsorships_event ON public.event_sponsorships(event_id);
CREATE INDEX IF NOT EXISTS idx_event_sponsorships_sponsor ON public.event_sponsorships(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_event_sponsorships_status ON public.event_sponsorships(status);
CREATE INDEX IF NOT EXISTS idx_event_sponsorships_created ON public.event_sponsorships(created_at DESC);

-- ============================================================================
-- EVENT SPONSORSHIP SETTINGS - Creator preferences for accepting sponsors
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.event_sponsorship_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,

  -- Sponsorship acceptance mode
  acceptance_mode VARCHAR(20) DEFAULT 'manual', -- auto_accept/manual/category_filter

  -- Auto-accept all sponsorships
  auto_accept_all BOOLEAN DEFAULT false,

  -- Category preferences (if category_filter mode)
  preferred_categories TEXT[] DEFAULT '{}',
  blocked_categories TEXT[] DEFAULT '{}',

  -- Minimum sponsorship amount to auto-accept
  min_auto_accept_amount DECIMAL(20,6),

  -- Sponsorship goals
  seeking_sponsorship BOOLEAN DEFAULT true,
  sponsorship_goal DECIMAL(20,6), -- Target amount
  sponsorship_deadline TIMESTAMPTZ,

  -- Custom message for potential sponsors
  pitch_message TEXT,

  -- Notification preferences
  notify_on_new_sponsor BOOLEAN DEFAULT true,
  notify_on_goal_reached BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT event_sponsorship_settings_event_unique UNIQUE (event_id),
  CONSTRAINT event_sponsorship_settings_mode_check CHECK (
    acceptance_mode IN ('auto_accept', 'manual', 'category_filter')
  )
);

CREATE INDEX IF NOT EXISTS idx_event_sponsorship_settings_event ON public.event_sponsorship_settings(event_id);
CREATE INDEX IF NOT EXISTS idx_event_sponsorship_settings_seeking ON public.event_sponsorship_settings(seeking_sponsorship) WHERE seeking_sponsorship = true;

-- ============================================================================
-- SPONSORSHIP APPROVAL QUEUE - For manual approval mode
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sponsorship_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  sponsorship_id UUID REFERENCES public.event_sponsorships(id) ON DELETE CASCADE,

  -- Proposed sponsorship details
  proposed_flow_amount DECIMAL(20,6) NOT NULL,
  proposed_visibility VARCHAR(20) DEFAULT 'visible',
  proposed_message TEXT,
  proposed_allocation_config JSONB,

  -- Approval status
  status VARCHAR(20) DEFAULT 'pending', -- pending/approved/rejected/expired

  -- Creator response
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT REFERENCES public.users(privy_id),
  rejection_reason TEXT,

  -- Auto-expiry (default 7 days)
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  auto_expired BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT sponsorship_approvals_unique UNIQUE (event_id, sponsor_id),
  CONSTRAINT sponsorship_approvals_status_check CHECK (
    status IN ('pending', 'approved', 'rejected', 'expired')
  )
);

CREATE INDEX IF NOT EXISTS idx_sponsorship_approvals_event ON public.sponsorship_approvals(event_id);
CREATE INDEX IF NOT EXISTS idx_sponsorship_approvals_sponsor ON public.sponsorship_approvals(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsorship_approvals_status ON public.sponsorship_approvals(status);
CREATE INDEX IF NOT EXISTS idx_sponsorship_approvals_pending ON public.sponsorship_approvals(event_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_sponsorship_approvals_expires ON public.sponsorship_approvals(expires_at) WHERE status = 'pending';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Calculate total sponsorship for an event
CREATE OR REPLACE FUNCTION get_event_total_sponsorship(p_event_id UUID)
RETURNS DECIMAL(20,6) AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(flow_amount)
    FROM public.event_sponsorships
    WHERE event_id = p_event_id
    AND status IN ('active', 'completed')
  ), 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Get sponsorship goal progress percentage
CREATE OR REPLACE FUNCTION get_event_sponsorship_progress(p_event_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_goal DECIMAL;
  v_current DECIMAL;
BEGIN
  SELECT sponsorship_goal INTO v_goal
  FROM public.event_sponsorship_settings
  WHERE event_id = p_event_id;

  IF v_goal IS NULL OR v_goal = 0 THEN
    RETURN NULL;
  END IF;

  v_current := get_event_total_sponsorship(p_event_id);
  RETURN LEAST(100.00, (v_current / v_goal * 100));
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if sponsorship should be auto-accepted
CREATE OR REPLACE FUNCTION should_auto_accept_sponsorship(
  p_event_id UUID,
  p_sponsor_id UUID,
  p_flow_amount DECIMAL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_settings RECORD;
  v_sponsor_categories TEXT[];
BEGIN
  -- Get event settings
  SELECT * INTO v_settings
  FROM public.event_sponsorship_settings
  WHERE event_id = p_event_id;

  -- If no settings, default to manual
  IF v_settings IS NULL THEN
    RETURN false;
  END IF;

  -- Auto-accept all
  IF v_settings.auto_accept_all THEN
    RETURN true;
  END IF;

  -- Check acceptance mode
  CASE v_settings.acceptance_mode
    WHEN 'auto_accept' THEN
      -- Check minimum amount if set
      IF v_settings.min_auto_accept_amount IS NOT NULL
         AND p_flow_amount < v_settings.min_auto_accept_amount THEN
        RETURN false;
      END IF;
      RETURN true;

    WHEN 'category_filter' THEN
      -- Get sponsor categories
      SELECT categories INTO v_sponsor_categories
      FROM public.sponsors
      WHERE id = p_sponsor_id;

      -- Check if any sponsor category is blocked
      IF v_settings.blocked_categories IS NOT NULL
         AND array_length(v_settings.blocked_categories, 1) > 0
         AND v_sponsor_categories && v_settings.blocked_categories THEN
        RETURN false;
      END IF;

      -- Check if sponsor has any preferred categories
      IF v_settings.preferred_categories IS NOT NULL
         AND array_length(v_settings.preferred_categories, 1) > 0 THEN
        IF NOT (v_sponsor_categories && v_settings.preferred_categories) THEN
          RETURN false;
        END IF;
      END IF;

      -- Check minimum amount if set
      IF v_settings.min_auto_accept_amount IS NOT NULL
         AND p_flow_amount < v_settings.min_auto_accept_amount THEN
        RETURN false;
      END IF;

      RETURN true;

    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_event_sponsorships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_event_sponsorships_updated_at ON public.event_sponsorships;
CREATE TRIGGER trigger_event_sponsorships_updated_at
  BEFORE UPDATE ON public.event_sponsorships
  FOR EACH ROW
  EXECUTE FUNCTION update_event_sponsorships_updated_at();

CREATE OR REPLACE FUNCTION update_event_sponsorship_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_event_sponsorship_settings_updated_at ON public.event_sponsorship_settings;
CREATE TRIGGER trigger_event_sponsorship_settings_updated_at
  BEFORE UPDATE ON public.event_sponsorship_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_event_sponsorship_settings_updated_at();

-- Update sponsor stats when sponsorship is activated
CREATE OR REPLACE FUNCTION update_sponsor_stats_on_sponsorship()
RETURNS TRIGGER AS $$
BEGIN
  -- When sponsorship becomes active
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    UPDATE public.sponsors
    SET
      total_events_sponsored = total_events_sponsored + 1,
      total_flow_contributed = total_flow_contributed + NEW.flow_amount,
      updated_at = NOW()
    WHERE id = NEW.sponsor_id;

    -- Update event flow pool
    UPDATE public.event_flow_pools
    SET
      total_flow = total_flow + NEW.flow_amount,
      updated_at = NOW()
    WHERE event_id = NEW.event_id;
  END IF;

  -- When sponsorship is cancelled/refunded after being active
  IF NEW.status IN ('cancelled', 'refunded') AND OLD.status = 'active' THEN
    UPDATE public.sponsors
    SET
      total_events_sponsored = GREATEST(0, total_events_sponsored - 1),
      total_flow_contributed = GREATEST(0, total_flow_contributed - OLD.flow_amount),
      updated_at = NOW()
    WHERE id = NEW.sponsor_id;

    UPDATE public.event_flow_pools
    SET
      total_flow = GREATEST(0, total_flow - OLD.flow_amount),
      updated_at = NOW()
    WHERE event_id = NEW.event_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sponsor_stats ON public.event_sponsorships;
CREATE TRIGGER trigger_update_sponsor_stats
  AFTER INSERT OR UPDATE OF status ON public.event_sponsorships
  FOR EACH ROW
  EXECUTE FUNCTION update_sponsor_stats_on_sponsorship();

-- Auto-expire pending approvals
CREATE OR REPLACE FUNCTION expire_pending_approvals()
RETURNS VOID AS $$
BEGIN
  UPDATE public.sponsorship_approvals
  SET
    status = 'expired',
    auto_expired = true
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.event_sponsorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_sponsorship_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorship_approvals ENABLE ROW LEVEL SECURITY;

-- Event sponsorships: public can view active sponsorships
CREATE POLICY "event_sponsorships_select_public" ON public.event_sponsorships
FOR SELECT USING (
  status IN ('active', 'completed')
  AND visibility != 'anonymous'
);

-- Sponsors can view and manage their own sponsorships
CREATE POLICY "event_sponsorships_sponsor_own" ON public.event_sponsorships
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sponsors s
    WHERE s.id = sponsor_id AND s.user_id = auth.uid()::text
  )
);

-- Event creators can view all sponsorships for their events
CREATE POLICY "event_sponsorships_creator" ON public.event_sponsorships
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.creator_id = auth.uid()::text
  )
);

-- Event sponsorship settings: creators can manage their own
CREATE POLICY "event_sponsorship_settings_creator" ON public.event_sponsorship_settings
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.creator_id = auth.uid()::text
  )
);

-- Public can view if event is seeking sponsorship
CREATE POLICY "event_sponsorship_settings_public_read" ON public.event_sponsorship_settings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.is_public = true
  )
);

-- Sponsorship approvals: creators can view and manage
CREATE POLICY "sponsorship_approvals_creator" ON public.sponsorship_approvals
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.creator_id = auth.uid()::text
  )
);

-- Sponsors can view their own pending approvals
CREATE POLICY "sponsorship_approvals_sponsor" ON public.sponsorship_approvals
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sponsors s
    WHERE s.id = sponsor_id AND s.user_id = auth.uid()::text
  )
);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.event_sponsorships TO anon;
GRANT SELECT, INSERT, UPDATE ON public.event_sponsorships TO authenticated;
GRANT ALL ON public.event_sponsorships TO service_role;

GRANT SELECT ON public.event_sponsorship_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.event_sponsorship_settings TO authenticated;
GRANT ALL ON public.event_sponsorship_settings TO service_role;

GRANT SELECT ON public.sponsorship_approvals TO authenticated;
GRANT ALL ON public.sponsorship_approvals TO service_role;
