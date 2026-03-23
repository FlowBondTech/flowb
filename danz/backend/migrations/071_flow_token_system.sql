-- Migration: $FLOW Token System
-- Date: 2026-01-17
-- Description: Creates $FLOW token pools, balances, and transaction ledger
-- $FLOW is the stablecoin used for predictable pricing
-- $DANZ is the ecosystem token for rewards/trading (swap functionality)

-- ============================================================================
-- 1. EVENT FLOW POOLS - Accumulate sponsor contributions per event
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.event_flow_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,

  -- Pool balances
  total_flow DECIMAL(20,6) DEFAULT 0,
  allocated_flow DECIMAL(20,6) DEFAULT 0,
  distributed_flow DECIMAL(20,6) DEFAULT 0,

  -- Pool status
  status VARCHAR(20) DEFAULT 'open', -- open/locked/distributing/completed
  locked_at TIMESTAMPTZ,
  distribution_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT event_flow_pools_event_unique UNIQUE (event_id),
  CONSTRAINT event_flow_pools_status_check CHECK (
    status IN ('open', 'locked', 'distributing', 'completed')
  )
);

-- Computed column for remaining_flow (use view or function instead)
CREATE OR REPLACE FUNCTION get_pool_remaining_flow(pool event_flow_pools)
RETURNS DECIMAL(20,6) AS $$
BEGIN
  RETURN pool.total_flow - pool.distributed_flow;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE INDEX IF NOT EXISTS idx_event_flow_pools_event_id ON public.event_flow_pools(event_id);
CREATE INDEX IF NOT EXISTS idx_event_flow_pools_status ON public.event_flow_pools(status);

-- ============================================================================
-- 2. USER FLOW BALANCES - Individual user $FLOW holdings
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_flow_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,

  -- Balances
  available_balance DECIMAL(20,6) DEFAULT 0,
  pending_balance DECIMAL(20,6) DEFAULT 0,
  total_earned DECIMAL(20,6) DEFAULT 0,
  total_withdrawn DECIMAL(20,6) DEFAULT 0,

  -- Stats
  total_gigs_completed INTEGER DEFAULT 0,
  total_events_worked INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT user_flow_balances_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_flow_balances_user_id ON public.user_flow_balances(user_id);

-- ============================================================================
-- 3. FLOW TRANSACTIONS - Complete transaction ledger
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.flow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parties involved
  from_user_id TEXT REFERENCES public.users(privy_id),
  to_user_id TEXT REFERENCES public.users(privy_id),
  sponsor_id UUID REFERENCES public.sponsors(id),
  event_id UUID REFERENCES public.events(id),

  -- Transaction details
  amount DECIMAL(20,6) NOT NULL,
  transaction_type VARCHAR(30) NOT NULL,
  -- Types: sponsor_deposit, gig_payment, volunteer_reward, platform_fee,
  --        swap_to_danz, withdrawal, refund

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- pending/completed/failed/reversed

  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',

  -- Blockchain reference (for future on-chain integration)
  tx_hash VARCHAR(100),
  block_number BIGINT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  CONSTRAINT flow_transactions_type_check CHECK (
    transaction_type IN (
      'sponsor_deposit', 'gig_payment', 'volunteer_reward',
      'platform_fee', 'swap_to_danz', 'withdrawal', 'refund'
    )
  ),
  CONSTRAINT flow_transactions_status_check CHECK (
    status IN ('pending', 'completed', 'failed', 'reversed')
  )
);

CREATE INDEX IF NOT EXISTS idx_flow_transactions_from_user ON public.flow_transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_flow_transactions_to_user ON public.flow_transactions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_flow_transactions_sponsor ON public.flow_transactions(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_flow_transactions_event ON public.flow_transactions(event_id);
CREATE INDEX IF NOT EXISTS idx_flow_transactions_type ON public.flow_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_flow_transactions_status ON public.flow_transactions(status);
CREATE INDEX IF NOT EXISTS idx_flow_transactions_created ON public.flow_transactions(created_at DESC);

-- ============================================================================
-- 4. FLOW TO DANZ SWAPS - Swap request tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.flow_danz_swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,

  -- Amounts
  flow_amount DECIMAL(20,6) NOT NULL,
  danz_amount DECIMAL(20,6), -- Calculated at execution time
  exchange_rate DECIMAL(20,10), -- FLOW/DANZ rate at execution

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- pending/processing/completed/failed

  -- Trigger type
  trigger_type VARCHAR(20) DEFAULT 'manual', -- manual/auto_withdrawal

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Error tracking
  error_message TEXT,

  CONSTRAINT flow_danz_swaps_status_check CHECK (
    status IN ('pending', 'processing', 'completed', 'failed')
  ),
  CONSTRAINT flow_danz_swaps_trigger_check CHECK (
    trigger_type IN ('manual', 'auto_withdrawal')
  )
);

CREATE INDEX IF NOT EXISTS idx_flow_danz_swaps_user ON public.flow_danz_swaps(user_id);
CREATE INDEX IF NOT EXISTS idx_flow_danz_swaps_status ON public.flow_danz_swaps(status);
CREATE INDEX IF NOT EXISTS idx_flow_danz_swaps_created ON public.flow_danz_swaps(created_at DESC);

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to create or get user's flow balance
CREATE OR REPLACE FUNCTION ensure_user_flow_balance(p_user_id TEXT)
RETURNS UUID AS $$
DECLARE
  v_balance_id UUID;
BEGIN
  SELECT id INTO v_balance_id
  FROM public.user_flow_balances
  WHERE user_id = p_user_id;

  IF v_balance_id IS NULL THEN
    INSERT INTO public.user_flow_balances (user_id)
    VALUES (p_user_id)
    RETURNING id INTO v_balance_id;
  END IF;

  RETURN v_balance_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create or get event flow pool
CREATE OR REPLACE FUNCTION ensure_event_flow_pool(p_event_id UUID)
RETURNS UUID AS $$
DECLARE
  v_pool_id UUID;
BEGIN
  SELECT id INTO v_pool_id
  FROM public.event_flow_pools
  WHERE event_id = p_event_id;

  IF v_pool_id IS NULL THEN
    INSERT INTO public.event_flow_pools (event_id)
    VALUES (p_event_id)
    RETURNING id INTO v_pool_id;
  END IF;

  RETURN v_pool_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add flow to user balance
CREATE OR REPLACE FUNCTION add_flow_to_user(
  p_user_id TEXT,
  p_amount DECIMAL,
  p_is_pending BOOLEAN DEFAULT false
)
RETURNS VOID AS $$
BEGIN
  -- Ensure balance exists
  PERFORM ensure_user_flow_balance(p_user_id);

  IF p_is_pending THEN
    UPDATE public.user_flow_balances
    SET
      pending_balance = pending_balance + p_amount,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    UPDATE public.user_flow_balances
    SET
      available_balance = available_balance + p_amount,
      total_earned = total_earned + p_amount,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to deduct flow from user balance
CREATE OR REPLACE FUNCTION deduct_flow_from_user(
  p_user_id TEXT,
  p_amount DECIMAL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance DECIMAL;
BEGIN
  SELECT available_balance INTO v_current_balance
  FROM public.user_flow_balances
  WHERE user_id = p_user_id;

  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN false;
  END IF;

  UPDATE public.user_flow_balances
  SET
    available_balance = available_balance - p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

-- Update timestamps for event_flow_pools
CREATE OR REPLACE FUNCTION update_event_flow_pools_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_event_flow_pools_updated_at ON public.event_flow_pools;
CREATE TRIGGER trigger_event_flow_pools_updated_at
  BEFORE UPDATE ON public.event_flow_pools
  FOR EACH ROW
  EXECUTE FUNCTION update_event_flow_pools_updated_at();

-- Update timestamps for user_flow_balances
CREATE OR REPLACE FUNCTION update_user_flow_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_flow_balances_updated_at ON public.user_flow_balances;
CREATE TRIGGER trigger_user_flow_balances_updated_at
  BEFORE UPDATE ON public.user_flow_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_user_flow_balances_updated_at();

-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

ALTER TABLE public.event_flow_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_flow_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_danz_swaps ENABLE ROW LEVEL SECURITY;

-- Event flow pools: anyone can view, event creators can manage
CREATE POLICY "event_flow_pools_select_all" ON public.event_flow_pools
FOR SELECT USING (true);

CREATE POLICY "event_flow_pools_manage" ON public.event_flow_pools
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.creator_id = auth.uid()::text
  )
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = auth.uid()::text AND is_admin = true
  )
);

-- User flow balances: users can view/manage their own
CREATE POLICY "user_flow_balances_own" ON public.user_flow_balances
FOR ALL TO authenticated USING (user_id = auth.uid()::text);

CREATE POLICY "user_flow_balances_admin" ON public.user_flow_balances
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = auth.uid()::text AND is_admin = true
  )
);

-- Flow transactions: users can view their own transactions
CREATE POLICY "flow_transactions_own" ON public.flow_transactions
FOR SELECT TO authenticated USING (
  from_user_id = auth.uid()::text
  OR to_user_id = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM public.sponsors s
    WHERE s.id = sponsor_id AND s.user_id = auth.uid()::text
  )
);

CREATE POLICY "flow_transactions_admin" ON public.flow_transactions
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = auth.uid()::text AND is_admin = true
  )
);

-- Flow/DANZ swaps: users can manage their own swaps
CREATE POLICY "flow_danz_swaps_own" ON public.flow_danz_swaps
FOR ALL TO authenticated USING (user_id = auth.uid()::text);

CREATE POLICY "flow_danz_swaps_admin" ON public.flow_danz_swaps
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = auth.uid()::text AND is_admin = true
  )
);

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.event_flow_pools TO anon;
GRANT SELECT ON public.event_flow_pools TO authenticated;
GRANT ALL ON public.event_flow_pools TO service_role;

GRANT SELECT ON public.user_flow_balances TO authenticated;
GRANT ALL ON public.user_flow_balances TO service_role;

GRANT SELECT ON public.flow_transactions TO authenticated;
GRANT ALL ON public.flow_transactions TO service_role;

GRANT SELECT, INSERT ON public.flow_danz_swaps TO authenticated;
GRANT ALL ON public.flow_danz_swaps TO service_role;
