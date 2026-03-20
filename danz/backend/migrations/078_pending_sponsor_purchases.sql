-- Migration 078: Pending Sponsor Purchases (Guest Checkout)
-- Date: 2026-02-11
-- Description: Staging table for unclaimed guest sponsor purchases.
--              Guests pay on Stripe first, then claim with a cryptographic token after signup.

-- ============================================================================
-- PENDING_SPONSOR_PURCHASES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pending_sponsor_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_token VARCHAR(64) NOT NULL UNIQUE,
  stripe_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  stripe_customer_email TEXT,
  tier_id VARCHAR(50) NOT NULL,
  tier_name VARCHAR(100) NOT NULL,
  amount_usd DECIMAL(10,2) NOT NULL,
  flow_amount DECIMAL(20,6) NOT NULL,
  event_context VARCHAR(100) DEFAULT 'ethdenver_2026',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
  claimed_by TEXT REFERENCES public.users(privy_id),
  claimed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pending_sponsor_claim_token ON public.pending_sponsor_purchases(claim_token);
CREATE INDEX IF NOT EXISTS idx_pending_sponsor_stripe_session ON public.pending_sponsor_purchases(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_pending_sponsor_status ON public.pending_sponsor_purchases(status);
CREATE INDEX IF NOT EXISTS idx_pending_sponsor_expires_at ON public.pending_sponsor_purchases(expires_at);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.pending_sponsor_purchases ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (backend inserts/updates via service key)
CREATE POLICY "pending_sponsor_service_all" ON public.pending_sponsor_purchases
FOR ALL TO service_role USING (true);

-- Authenticated users can view their own claimed purchases
CREATE POLICY "pending_sponsor_select_own" ON public.pending_sponsor_purchases
FOR SELECT TO authenticated USING (
  claimed_by = auth.uid()::text
);

-- Admins can view all pending purchases
CREATE POLICY "pending_sponsor_admin_select" ON public.pending_sponsor_purchases
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = auth.uid()::text AND is_admin = true
  )
);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.pending_sponsor_purchases TO authenticated;
GRANT ALL ON public.pending_sponsor_purchases TO service_role;
