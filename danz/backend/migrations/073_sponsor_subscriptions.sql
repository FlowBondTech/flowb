-- Migration: Sponsor Subscriptions
-- Date: 2026-01-17
-- Description: Recurring sponsorship subscriptions with category targeting

-- ============================================================================
-- SPONSOR SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sponsor_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,

  -- Plan type
  plan_type VARCHAR(20) NOT NULL, -- monthly/yearly

  -- Sponsorship mode
  sponsorship_mode VARCHAR(30) NOT NULL, -- single_event/category_subscription/verified_only/hybrid

  -- Budget configuration
  budget_amount DECIMAL(20,6) NOT NULL, -- Amount per billing period
  budget_spent DECIMAL(20,6) DEFAULT 0,

  -- Category filters (for category/hybrid modes)
  target_categories TEXT[] DEFAULT '{}',

  -- Verified filter
  verified_events_only BOOLEAN DEFAULT false,

  -- Auto-approval settings
  auto_approve BOOLEAN DEFAULT false, -- Skip notification, auto-fund
  max_per_event DECIMAL(20,6), -- Cap per individual event

  -- Allocation config for auto-sponsored events
  default_allocation_config JSONB DEFAULT '{"paid_workers": 80, "volunteer_rewards": 15, "platform_fee": 5}',

  -- Default visibility for auto-sponsorships
  default_visibility VARCHAR(20) DEFAULT 'visible',

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- active/paused/cancelled/expired

  -- Billing
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ,
  last_billed_at TIMESTAMPTZ,
  discount_percent DECIMAL(5,2) DEFAULT 0, -- 5% monthly, 20% yearly

  -- Stats for current period
  events_sponsored_this_period INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,

  CONSTRAINT sponsor_subscriptions_plan_check CHECK (
    plan_type IN ('monthly', 'yearly')
  ),
  CONSTRAINT sponsor_subscriptions_mode_check CHECK (
    sponsorship_mode IN ('single_event', 'category_subscription', 'verified_only', 'hybrid')
  ),
  CONSTRAINT sponsor_subscriptions_status_check CHECK (
    status IN ('active', 'paused', 'cancelled', 'expired')
  ),
  CONSTRAINT sponsor_subscriptions_visibility_check CHECK (
    default_visibility IN ('visible', 'anonymous', 'featured')
  )
);

CREATE INDEX IF NOT EXISTS idx_sponsor_subscriptions_sponsor ON public.sponsor_subscriptions(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_subscriptions_status ON public.sponsor_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_sponsor_subscriptions_active ON public.sponsor_subscriptions(sponsor_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sponsor_subscriptions_categories ON public.sponsor_subscriptions USING GIN (target_categories);
CREATE INDEX IF NOT EXISTS idx_sponsor_subscriptions_next_billing ON public.sponsor_subscriptions(next_billing_date) WHERE status = 'active';

-- ============================================================================
-- SUBSCRIPTION BILLING HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subscription_billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.sponsor_subscriptions(id) ON DELETE CASCADE,

  -- Billing period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Amounts
  budget_amount DECIMAL(20,6) NOT NULL,
  budget_spent DECIMAL(20,6) NOT NULL,
  discount_applied DECIMAL(20,6) DEFAULT 0,
  net_amount DECIMAL(20,6) NOT NULL,

  -- Stats
  events_sponsored INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- pending/paid/failed/refunded

  -- Payment reference
  payment_reference TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT subscription_billing_status_check CHECK (
    status IN ('pending', 'paid', 'failed', 'refunded')
  )
);

CREATE INDEX IF NOT EXISTS idx_subscription_billing_subscription ON public.subscription_billing_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_billing_period ON public.subscription_billing_history(period_start, period_end);

-- ============================================================================
-- SUBSCRIPTION AUTO-MATCH LOG - Track auto-sponsorship matching
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subscription_auto_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.sponsor_subscriptions(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sponsorship_id UUID REFERENCES public.event_sponsorships(id),

  -- Match details
  match_reason TEXT NOT NULL, -- 'category_match', 'verified_creator', 'both'
  matched_categories TEXT[] DEFAULT '{}',
  flow_amount DECIMAL(20,6) NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- pending/approved/rejected/expired

  -- If auto_approve is false, sponsor needs to confirm
  notified_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT subscription_auto_matches_status_check CHECK (
    status IN ('pending', 'approved', 'rejected', 'expired')
  )
);

CREATE INDEX IF NOT EXISTS idx_subscription_auto_matches_subscription ON public.subscription_auto_matches(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_auto_matches_event ON public.subscription_auto_matches(event_id);
CREATE INDEX IF NOT EXISTS idx_subscription_auto_matches_pending ON public.subscription_auto_matches(subscription_id, status) WHERE status = 'pending';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Calculate discount based on plan type
CREATE OR REPLACE FUNCTION get_subscription_discount(p_plan_type VARCHAR)
RETURNS DECIMAL(5,2) AS $$
BEGIN
  CASE p_plan_type
    WHEN 'monthly' THEN RETURN 5.00;
    WHEN 'yearly' THEN RETURN 20.00;
    ELSE RETURN 0.00;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate effective cost after discount
CREATE OR REPLACE FUNCTION calculate_subscription_cost(
  p_budget DECIMAL,
  p_plan_type VARCHAR
)
RETURNS DECIMAL(20,6) AS $$
DECLARE
  v_discount DECIMAL;
BEGIN
  v_discount := get_subscription_discount(p_plan_type);
  RETURN p_budget * (1 - v_discount / 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get remaining budget for subscription
CREATE OR REPLACE FUNCTION get_subscription_remaining_budget(p_subscription_id UUID)
RETURNS DECIMAL(20,6) AS $$
DECLARE
  v_budget DECIMAL;
  v_spent DECIMAL;
BEGIN
  SELECT budget_amount, budget_spent INTO v_budget, v_spent
  FROM public.sponsor_subscriptions
  WHERE id = p_subscription_id;

  RETURN GREATEST(0, v_budget - v_spent);
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if subscription can sponsor an event
CREATE OR REPLACE FUNCTION can_subscription_sponsor_event(
  p_subscription_id UUID,
  p_event_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_subscription RECORD;
  v_event RECORD;
  v_creator_verified BOOLEAN;
  v_category_match BOOLEAN;
  v_remaining_budget DECIMAL;
  v_match_reasons TEXT[] := '{}';
BEGIN
  -- Get subscription
  SELECT * INTO v_subscription
  FROM public.sponsor_subscriptions
  WHERE id = p_subscription_id AND status = 'active';

  IF v_subscription IS NULL THEN
    RETURN jsonb_build_object('can_sponsor', false, 'reason', 'subscription_not_active');
  END IF;

  -- Get event
  SELECT e.*, ess.seeking_sponsorship
  INTO v_event
  FROM public.events e
  LEFT JOIN public.event_sponsorship_settings ess ON e.id = ess.event_id
  WHERE e.id = p_event_id;

  IF v_event IS NULL THEN
    RETURN jsonb_build_object('can_sponsor', false, 'reason', 'event_not_found');
  END IF;

  -- Check if event is seeking sponsorship
  IF v_event.seeking_sponsorship IS NOT NULL AND NOT v_event.seeking_sponsorship THEN
    RETURN jsonb_build_object('can_sponsor', false, 'reason', 'event_not_seeking_sponsorship');
  END IF;

  -- Check remaining budget
  v_remaining_budget := get_subscription_remaining_budget(p_subscription_id);
  IF v_remaining_budget <= 0 THEN
    RETURN jsonb_build_object('can_sponsor', false, 'reason', 'budget_exhausted');
  END IF;

  -- Check verified filter
  IF v_subscription.verified_events_only THEN
    SELECT is_verified INTO v_creator_verified
    FROM public.verified_event_creators
    WHERE user_id = v_event.creator_id;

    IF NOT COALESCE(v_creator_verified, false) THEN
      RETURN jsonb_build_object('can_sponsor', false, 'reason', 'creator_not_verified');
    END IF;
    v_match_reasons := array_append(v_match_reasons, 'verified_creator');
  END IF;

  -- Check category filter
  IF v_subscription.sponsorship_mode IN ('category_subscription', 'hybrid')
     AND array_length(v_subscription.target_categories, 1) > 0 THEN
    IF v_event.category::text = ANY(v_subscription.target_categories) THEN
      v_category_match := true;
      v_match_reasons := array_append(v_match_reasons, 'category_match');
    ELSE
      IF v_subscription.sponsorship_mode = 'category_subscription' THEN
        RETURN jsonb_build_object('can_sponsor', false, 'reason', 'category_mismatch');
      END IF;
    END IF;
  END IF;

  -- Determine amount (use max_per_event if set, otherwise remaining budget up to some default)
  RETURN jsonb_build_object(
    'can_sponsor', true,
    'max_amount', LEAST(COALESCE(v_subscription.max_per_event, v_remaining_budget), v_remaining_budget),
    'match_reasons', v_match_reasons,
    'auto_approve', v_subscription.auto_approve
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Initialize subscription period dates
CREATE OR REPLACE FUNCTION init_subscription_dates()
RETURNS TRIGGER AS $$
BEGIN
  NEW.discount_percent := get_subscription_discount(NEW.plan_type);

  IF NEW.current_period_end IS NULL THEN
    CASE NEW.plan_type
      WHEN 'monthly' THEN
        NEW.current_period_end := NEW.current_period_start + INTERVAL '1 month';
      WHEN 'yearly' THEN
        NEW.current_period_end := NEW.current_period_start + INTERVAL '1 year';
    END CASE;
    NEW.next_billing_date := NEW.current_period_end;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_init_subscription_dates ON public.sponsor_subscriptions;
CREATE TRIGGER trigger_init_subscription_dates
  BEFORE INSERT ON public.sponsor_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION init_subscription_dates();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_sponsor_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    NEW.cancelled_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sponsor_subscriptions_updated_at ON public.sponsor_subscriptions;
CREATE TRIGGER trigger_sponsor_subscriptions_updated_at
  BEFORE UPDATE ON public.sponsor_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_sponsor_subscriptions_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.sponsor_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_auto_matches ENABLE ROW LEVEL SECURITY;

-- Sponsors can manage their own subscriptions
CREATE POLICY "sponsor_subscriptions_own" ON public.sponsor_subscriptions
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sponsors s
    WHERE s.id = sponsor_id AND s.user_id = auth.uid()::text
  )
);

-- Admins can view all subscriptions
CREATE POLICY "sponsor_subscriptions_admin" ON public.sponsor_subscriptions
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = auth.uid()::text AND is_admin = true
  )
);

-- Billing history: sponsors can view their own
CREATE POLICY "subscription_billing_own" ON public.subscription_billing_history
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sponsor_subscriptions ss
    JOIN public.sponsors s ON s.id = ss.sponsor_id
    WHERE ss.id = subscription_id AND s.user_id = auth.uid()::text
  )
);

-- Auto matches: sponsors can view and respond to their own
CREATE POLICY "subscription_auto_matches_own" ON public.subscription_auto_matches
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sponsor_subscriptions ss
    JOIN public.sponsors s ON s.id = ss.sponsor_id
    WHERE ss.id = subscription_id AND s.user_id = auth.uid()::text
  )
);

-- Event creators can see matches for their events
CREATE POLICY "subscription_auto_matches_creator" ON public.subscription_auto_matches
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.creator_id = auth.uid()::text
  )
);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.sponsor_subscriptions TO authenticated;
GRANT ALL ON public.sponsor_subscriptions TO service_role;

GRANT SELECT ON public.subscription_billing_history TO authenticated;
GRANT ALL ON public.subscription_billing_history TO service_role;

GRANT SELECT, UPDATE ON public.subscription_auto_matches TO authenticated;
GRANT ALL ON public.subscription_auto_matches TO service_role;
