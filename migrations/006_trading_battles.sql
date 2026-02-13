-- ============================================================================
-- 006: Trading History & Battle Pools
-- FlowB on-chain trading + DANZ battle staking
-- ============================================================================

-- Trade History: every swap executed through FlowB
CREATE TABLE IF NOT EXISTS trade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'telegram',
  from_token TEXT NOT NULL,
  from_symbol TEXT NOT NULL,
  to_token TEXT NOT NULL,
  to_symbol TEXT NOT NULL,
  sell_amount TEXT NOT NULL,
  buy_amount TEXT,
  price TEXT,
  slippage_bps INTEGER DEFAULT 100,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trade_history_user
  ON trade_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_history_status
  ON trade_history (status) WHERE status = 'pending';

-- Battle Pools: staked competitions tied to DANZ events
CREATE TABLE IF NOT EXISTS battle_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID,
  creator_user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  pool_type TEXT NOT NULL DEFAULT 'winner_take_all'
    CHECK (pool_type IN ('winner_take_all', 'top_3', 'proportional')),
  entry_fee NUMERIC(12, 2) NOT NULL DEFAULT 5.00,
  total_staked NUMERIC(14, 2) NOT NULL DEFAULT 0,
  fee_percentage NUMERIC(4, 2) NOT NULL DEFAULT 5.00,
  min_participants INTEGER NOT NULL DEFAULT 2,
  max_participants INTEGER DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'locked', 'resolved', 'paid', 'cancelled')),
  winner_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_battle_pools_status
  ON battle_pools (status) WHERE status IN ('open', 'locked');
CREATE INDEX IF NOT EXISTS idx_battle_pools_event
  ON battle_pools (event_id) WHERE event_id IS NOT NULL;

-- Battle Entries: individual stakes in a pool
CREATE TABLE IF NOT EXISTS battle_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES battle_pools(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  amount_staked NUMERIC(12, 2) NOT NULL,
  placement INTEGER,
  payout_amount NUMERIC(12, 2),
  payout_tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pool_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_battle_entries_pool
  ON battle_entries (pool_id);
CREATE INDEX IF NOT EXISTS idx_battle_entries_user
  ON battle_entries (user_id, created_at DESC);

-- RLS Policies
ALTER TABLE trade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_entries ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (used by FlowB backend)
CREATE POLICY trade_history_service ON trade_history
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY battle_pools_service ON battle_pools
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY battle_entries_service ON battle_entries
  FOR ALL USING (true) WITH CHECK (true);
