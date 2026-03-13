-- Featured Events: Admin Override + View Update
-- Adds admin override columns to flowb_boost_cycles so admins can manually
-- set the featured event, bypassing the auction winner.

-- ============================================================================
-- ADD ADMIN OVERRIDE COLUMNS
-- ============================================================================
ALTER TABLE flowb_boost_cycles
  ADD COLUMN IF NOT EXISTS admin_override_url TEXT,
  ADD COLUMN IF NOT EXISTS admin_override_by TEXT,
  ADD COLUMN IF NOT EXISTS admin_override_at TIMESTAMPTZ;

-- ============================================================================
-- UPDATE get_or_create_boost_cycle() TO RETURN OVERRIDE FIELDS
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
  admin_override_url TEXT,
  effective_featured_url TEXT,
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
    current_cycle.admin_override_url,
    COALESCE(current_cycle.admin_override_url, current_cycle.winning_event_url),
    GREATEST(0, EXTRACT(EPOCH FROM (current_cycle.ends_at - NOW()))::INTEGER);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UPDATE VIEW: Use admin override when set
-- ============================================================================
CREATE OR REPLACE VIEW v_current_featured_boost AS
SELECT
  bc.id as cycle_id,
  bc.cycle_number,
  bc.started_at,
  bc.ends_at,
  bc.highest_bid_usdc as amount_usdc,
  bc.highest_bidder_user_id as user_id,
  bc.winning_event_url,
  bc.admin_override_url,
  COALESCE(bc.admin_override_url, bc.winning_event_url) as target_id,
  bc.min_bid_usdc,
  GREATEST(0, EXTRACT(EPOCH FROM (bc.ends_at - NOW()))::INTEGER) as time_remaining_seconds,
  COALESCE(bc.highest_bid_usdc, 0) + 0.10 as min_next_bid
FROM flowb_boost_cycles bc
WHERE bc.is_active = TRUE
ORDER BY bc.cycle_number DESC
LIMIT 1;
