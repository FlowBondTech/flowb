-- Reward pools: track pool wallets for USDC payouts
CREATE TABLE IF NOT EXISTS reward_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  wallet_address TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'base',
  total_funded NUMERIC(18,6) NOT NULL DEFAULT 0,
  total_paid_out NUMERIC(18,6) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link payout claims to a specific pool
ALTER TABLE payout_claims ADD COLUMN IF NOT EXISTS pool_id UUID REFERENCES reward_pools(id);
ALTER TABLE payout_claims ADD COLUMN IF NOT EXISTS tx_hash TEXT;
ALTER TABLE payout_claims ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE reward_pools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_manage_pools" ON reward_pools
  FOR ALL USING (auth.role() = 'service_role');

-- Seed the ETHDenver DANZ pool (address will be updated once CDP wallet is created)
INSERT INTO reward_pools (name, description, wallet_address, chain, total_funded, is_active)
VALUES (
  'ETHDenver DANZ 2026',
  'Dance challenge rewards pool for ETHDenver 2026. Funded with USDC on Base.',
  '0x0000000000000000000000000000000000000000',
  'base',
  0,
  true
);
