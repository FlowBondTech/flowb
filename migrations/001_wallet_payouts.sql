-- Migration: Add wallet and payout tables for USDC rewards
-- Run via Supabase SQL editor or migration tool

-- User wallet addresses (Base network)
CREATE TABLE IF NOT EXISTS user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_id TEXT NOT NULL UNIQUE REFERENCES users(privy_id),
  wallet_address TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'base',
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payout claim records
CREATE TABLE IF NOT EXISTS payout_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_id TEXT NOT NULL REFERENCES users(privy_id),
  challenge_id UUID REFERENCES challenges(id),
  amount_usdc NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  tx_hash TEXT,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_payout_claims_privy ON payout_claims(privy_id);
CREATE INDEX IF NOT EXISTS idx_payout_claims_status ON payout_claims(status);
CREATE INDEX IF NOT EXISTS idx_user_wallets_address ON user_wallets(wallet_address);

-- RLS policies (enable row-level security)
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_claims ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by FlowB via service key)
CREATE POLICY "Service role full access on user_wallets"
  ON user_wallets FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on payout_claims"
  ON payout_claims FOR ALL
  USING (true)
  WITH CHECK (true);
