-- Migration 077: Sponsor Purchases Table
-- Date: 2026-02-09
-- Description: Records individual sponsor purchases from Stripe Checkout (ETHDenver sponsor tiers).
--              Also adds an INSERT trigger on sponsors to auto-calculate tier on creation.

-- ============================================================================
-- SPONSOR_PURCHASES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sponsor_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
  stripe_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT,
  tier_id VARCHAR(50) NOT NULL,
  tier_name VARCHAR(100) NOT NULL,
  amount_usd DECIMAL(10,2) NOT NULL,
  flow_amount DECIMAL(20,6) NOT NULL,
  event_context VARCHAR(100) DEFAULT 'ethdenver_2026',
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sponsor_purchases_user_id ON public.sponsor_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_purchases_event_context ON public.sponsor_purchases(event_context);
CREATE INDEX IF NOT EXISTS idx_sponsor_purchases_stripe_session ON public.sponsor_purchases(stripe_session_id);

-- ============================================================================
-- INSERT TRIGGER ON SPONSORS (tier calculation on create)
-- ============================================================================
-- The existing UPDATE trigger already calls calculate_sponsor_tier,
-- but INSERTs bypass it. This ensures new sponsors get the correct tier.

CREATE OR REPLACE FUNCTION set_sponsor_tier_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tier = calculate_sponsor_tier(NEW.total_flow_contributed);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sponsors_set_tier_on_insert ON public.sponsors;
CREATE TRIGGER trigger_sponsors_set_tier_on_insert
  BEFORE INSERT ON public.sponsors
  FOR EACH ROW
  EXECUTE FUNCTION set_sponsor_tier_on_insert();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.sponsor_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "sponsor_purchases_select_own" ON public.sponsor_purchases
FOR SELECT TO authenticated USING (
  user_id = auth.uid()::text
);

-- Service role can do everything (backend inserts via service key)
CREATE POLICY "sponsor_purchases_service_all" ON public.sponsor_purchases
FOR ALL TO service_role USING (true);

-- Admins can view all purchases
CREATE POLICY "sponsor_purchases_admin_select" ON public.sponsor_purchases
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = auth.uid()::text AND is_admin = true
  )
);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.sponsor_purchases TO authenticated;
GRANT ALL ON public.sponsor_purchases TO service_role;
