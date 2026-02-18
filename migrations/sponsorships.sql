-- Sponsorships: on-chain USDC sponsorships for events and locations
-- Users send USDC on Base to FlowB's CDP wallet, provide tx hash, backend verifies on-chain.

CREATE TABLE IF NOT EXISTS flowb_sponsorships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsor_user_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('event', 'location', 'featured_event')),
  target_id TEXT NOT NULL,
  amount_usdc NUMERIC(12,6) NOT NULL DEFAULT 0,
  tx_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_sponsorships_target ON flowb_sponsorships (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_sponsorships_sponsor ON flowb_sponsorships (sponsor_user_id);
CREATE INDEX IF NOT EXISTS idx_sponsorships_status ON flowb_sponsorships (status);

-- Add sponsor columns to locations
ALTER TABLE flowb_locations
  ADD COLUMN IF NOT EXISTS sponsor_amount NUMERIC(12,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sponsor_label TEXT,
  ADD COLUMN IF NOT EXISTS proximity_radius_m INTEGER DEFAULT 100;
