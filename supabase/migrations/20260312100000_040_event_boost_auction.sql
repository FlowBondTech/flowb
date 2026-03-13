-- Event Boost Auction System
-- 24-hour auction cycles where users bid to feature their event at the top
-- Amount resets to $0.10 after 24h but last boost stays until outbid

-- ============================================================================
-- SPONSORSHIPS TABLE (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS flowb_sponsorships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsor_user_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('event', 'location', 'featured_event')),
  target_id TEXT NOT NULL,
  amount_usdc NUMERIC(12,6) NOT NULL DEFAULT 0,
  tx_hash TEXT,
  payment_method TEXT CHECK (payment_method IN ('crypto', 'stripe', 'apple_pay')),
  order_id UUID REFERENCES flowb_orders(id),
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  cycle_id INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_sponsorships_target ON flowb_sponsorships (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_sponsorships_sponsor ON flowb_sponsorships (sponsor_user_id);
CREATE INDEX IF NOT EXISTS idx_sponsorships_status ON flowb_sponsorships (status);
CREATE INDEX IF NOT EXISTS idx_sponsorships_expires ON flowb_sponsorships (expires_at);
CREATE INDEX IF NOT EXISTS idx_sponsorships_cycle ON flowb_sponsorships (cycle_id, target_type);

-- ============================================================================
-- BOOST AUCTION CYCLES
-- Tracks 24h auction cycles and when they reset
-- ============================================================================
CREATE TABLE IF NOT EXISTS flowb_boost_cycles (
  id SERIAL PRIMARY KEY,
  cycle_number INTEGER NOT NULL UNIQUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  min_bid_usdc NUMERIC(12,6) NOT NULL DEFAULT 0.10,
  highest_bid_usdc NUMERIC(12,6) DEFAULT 0,
  highest_bidder_user_id TEXT,
  winning_event_url TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Initialize first cycle if none exists
INSERT INTO flowb_boost_cycles (cycle_number, started_at, ends_at, min_bid_usdc, is_active)
SELECT 1, NOW(), NOW() + INTERVAL '24 hours', 0.10, TRUE
WHERE NOT EXISTS (SELECT 1 FROM flowb_boost_cycles WHERE is_active = TRUE);

CREATE INDEX IF NOT EXISTS idx_boost_cycles_active ON flowb_boost_cycles (is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_boost_cycles_ends ON flowb_boost_cycles (ends_at);

-- ============================================================================
-- FUNCTION: Get current boost cycle (creates new one if expired)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_or_create_boost_cycle()
RETURNS TABLE (
  cycle_id INTEGER,
  cycle_number INTEGER,
  ends_at TIMESTAMPTZ,
  min_bid_usdc NUMERIC,
  highest_bid_usdc NUMERIC,
  highest_bidder_user_id TEXT,
  winning_event_url TEXT,
  time_remaining_seconds INTEGER
) AS $$
DECLARE
  current_cycle RECORD;
  new_cycle_number INTEGER;
BEGIN
  -- Get current active cycle
  SELECT * INTO current_cycle
  FROM flowb_boost_cycles bc
  WHERE bc.is_active = TRUE
  ORDER BY bc.cycle_number DESC
  LIMIT 1;

  -- If no cycle or cycle expired, create new one
  IF current_cycle IS NULL OR current_cycle.ends_at <= NOW() THEN
    -- Mark old cycle as inactive
    IF current_cycle IS NOT NULL THEN
      UPDATE flowb_boost_cycles SET is_active = FALSE WHERE id = current_cycle.id;
    END IF;

    -- Create new cycle
    new_cycle_number := COALESCE(current_cycle.cycle_number, 0) + 1;
    INSERT INTO flowb_boost_cycles (cycle_number, started_at, ends_at, min_bid_usdc, is_active)
    VALUES (new_cycle_number, NOW(), NOW() + INTERVAL '24 hours', 0.10, TRUE)
    RETURNING * INTO current_cycle;
  END IF;

  RETURN QUERY
  SELECT
    current_cycle.id::INTEGER,
    current_cycle.cycle_number,
    current_cycle.ends_at,
    current_cycle.min_bid_usdc,
    COALESCE(current_cycle.highest_bid_usdc, 0::NUMERIC),
    current_cycle.highest_bidder_user_id,
    current_cycle.winning_event_url,
    GREATEST(0, EXTRACT(EPOCH FROM (current_cycle.ends_at - NOW()))::INTEGER);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Place a boost bid
-- ============================================================================
CREATE OR REPLACE FUNCTION place_boost_bid(
  p_user_id TEXT,
  p_event_url TEXT,
  p_amount_usdc NUMERIC,
  p_payment_method TEXT,
  p_tx_hash TEXT DEFAULT NULL,
  p_order_id UUID DEFAULT NULL,
  p_stripe_payment_intent_id TEXT DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  sponsorship_id UUID,
  is_winning BOOLEAN,
  current_highest NUMERIC,
  min_next_bid NUMERIC
) AS $$
DECLARE
  cycle RECORD;
  new_sponsorship_id UUID;
  required_bid NUMERIC;
BEGIN
  -- Get current cycle
  SELECT * INTO cycle FROM get_or_create_boost_cycle();

  -- Calculate required bid (current highest + $0.10, or minimum $0.10)
  required_bid := GREATEST(0.10, COALESCE(cycle.highest_bid_usdc, 0) + 0.10);

  -- Validate bid amount
  IF p_amount_usdc < required_bid THEN
    RETURN QUERY SELECT
      FALSE,
      FORMAT('Minimum bid is $%.2f USDC', required_bid),
      NULL::UUID,
      FALSE,
      COALESCE(cycle.highest_bid_usdc, 0::NUMERIC),
      required_bid;
    RETURN;
  END IF;

  -- Create sponsorship record
  INSERT INTO flowb_sponsorships (
    sponsor_user_id,
    target_type,
    target_id,
    amount_usdc,
    tx_hash,
    payment_method,
    order_id,
    stripe_payment_intent_id,
    status,
    expires_at,
    cycle_id
  ) VALUES (
    p_user_id,
    'featured_event',
    p_event_url,
    p_amount_usdc,
    p_tx_hash,
    p_payment_method,
    p_order_id,
    p_stripe_payment_intent_id,
    CASE WHEN p_payment_method = 'crypto' THEN 'pending' ELSE 'verified' END,
    cycle.ends_at,
    cycle.cycle_id
  ) RETURNING id INTO new_sponsorship_id;

  -- If not crypto (already verified via Stripe/Apple Pay), update cycle winner
  IF p_payment_method != 'crypto' THEN
    UPDATE flowb_boost_cycles
    SET
      highest_bid_usdc = p_amount_usdc,
      highest_bidder_user_id = p_user_id,
      winning_event_url = p_event_url
    WHERE id = cycle.cycle_id;
  END IF;

  RETURN QUERY SELECT
    TRUE,
    'Boost bid placed successfully',
    new_sponsorship_id,
    p_amount_usdc > COALESCE(cycle.highest_bid_usdc, 0),
    p_amount_usdc,
    p_amount_usdc + 0.10;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Verify crypto boost and update winner
-- ============================================================================
CREATE OR REPLACE FUNCTION verify_boost_payment(
  p_sponsorship_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  sponsor RECORD;
  cycle RECORD;
BEGIN
  -- Get sponsorship
  SELECT * INTO sponsor FROM flowb_sponsorships WHERE id = p_sponsorship_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- Update to verified
  UPDATE flowb_sponsorships
  SET status = 'verified', verified_at = NOW()
  WHERE id = p_sponsorship_id;

  -- Get the cycle
  SELECT * INTO cycle FROM flowb_boost_cycles WHERE id = sponsor.cycle_id;
  IF NOT FOUND THEN RETURN TRUE; END IF;

  -- Update cycle winner if this is the highest bid
  IF sponsor.amount_usdc > COALESCE(cycle.highest_bid_usdc, 0) THEN
    UPDATE flowb_boost_cycles
    SET
      highest_bid_usdc = sponsor.amount_usdc,
      highest_bidder_user_id = sponsor.sponsor_user_id,
      winning_event_url = sponsor.target_id
    WHERE id = sponsor.cycle_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEW: Current featured boost
-- ============================================================================
CREATE OR REPLACE VIEW v_current_featured_boost AS
SELECT
  bc.id as cycle_id,
  bc.cycle_number,
  bc.started_at,
  bc.ends_at,
  bc.highest_bid_usdc as amount_usdc,
  bc.highest_bidder_user_id as user_id,
  bc.winning_event_url as target_id,
  bc.min_bid_usdc,
  GREATEST(0, EXTRACT(EPOCH FROM (bc.ends_at - NOW()))::INTEGER) as time_remaining_seconds,
  COALESCE(bc.highest_bid_usdc, 0) + 0.10 as min_next_bid
FROM flowb_boost_cycles bc
WHERE bc.is_active = TRUE
ORDER BY bc.cycle_number DESC
LIMIT 1;

COMMENT ON TABLE flowb_sponsorships IS 'Event boost sponsorships - users bid USDC to feature their event';
COMMENT ON TABLE flowb_boost_cycles IS '24-hour auction cycles for event boosting';
