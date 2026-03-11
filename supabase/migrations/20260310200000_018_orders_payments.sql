-- ============================================================================
-- 018: Orders and multi-method payment tracking
-- ============================================================================

-- Orders table (payment intents)
CREATE TABLE IF NOT EXISTS flowb_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES flowb_products(id),
  quantity INTEGER NOT NULL DEFAULT 1,

  -- Pricing
  amount_usdc NUMERIC(12,6) NOT NULL,
  amount_original NUMERIC(12,6),
  currency_original TEXT DEFAULT 'USD',
  discount_code TEXT,
  discount_amount NUMERIC(12,6) DEFAULT 0,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'awaiting_payment', 'completed', 'failed', 'refunded', 'expired', 'cancelled')),

  -- Payment method details
  payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'apple_pay', 'wallet_connect', 'usdc_direct', 'crypto_swap', 'telegram_stars')),
  payment_network TEXT,

  -- Stripe references
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  stripe_customer_id TEXT,

  -- Telegram references
  telegram_invoice_id TEXT,
  telegram_stars_amount INTEGER,

  -- Crypto payment tracking
  expected_wallet_address TEXT,
  sender_wallet_address TEXT,
  tx_hash TEXT,
  tx_block_number BIGINT,
  tx_confirmed_at TIMESTAMPTZ,
  tx_confirmations INTEGER DEFAULT 0,
  tx_verified BOOLEAN DEFAULT false,

  -- Crypto swap details
  swap_service TEXT,
  original_token_address TEXT,
  original_token_symbol TEXT,
  original_amount TEXT,
  swap_tx_hash TEXT,

  -- WalletConnect session
  wallet_connect_session_id TEXT,

  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',
  user_agent TEXT,
  ip_address INET,

  -- Timestamps
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Connected wallets for WalletConnect users
CREATE TABLE IF NOT EXISTS flowb_connected_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  chain_name TEXT NOT NULL,
  connector_type TEXT NOT NULL DEFAULT 'wallet_connect',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  ens_name TEXT,
  last_connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, wallet_address, chain_id)
);

-- Supported payment networks
CREATE TABLE IF NOT EXISTS flowb_payment_networks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  chain_id INTEGER NOT NULL UNIQUE,
  rpc_url TEXT NOT NULL,
  explorer_url TEXT NOT NULL,
  usdc_address TEXT,
  native_symbol TEXT NOT NULL,
  is_testnet BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  min_confirmations INTEGER DEFAULT 1
);

-- Insert supported networks
INSERT INTO flowb_payment_networks (id, name, chain_id, rpc_url, explorer_url, usdc_address, native_symbol, min_confirmations) VALUES
  ('base', 'Base', 8453, 'https://mainnet.base.org', 'https://basescan.org', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 'ETH', 1),
  ('ethereum', 'Ethereum', 1, 'https://eth.llamarpc.com', 'https://etherscan.io', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'ETH', 2),
  ('polygon', 'Polygon', 137, 'https://polygon-rpc.com', 'https://polygonscan.com', '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', 'MATIC', 10),
  ('arbitrum', 'Arbitrum One', 42161, 'https://arb1.arbitrum.io/rpc', 'https://arbiscan.io', '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', 'ETH', 1),
  ('optimism', 'Optimism', 10, 'https://mainnet.optimism.io', 'https://optimistic.etherscan.io', '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', 'ETH', 1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  rpc_url = EXCLUDED.rpc_url,
  explorer_url = EXCLUDED.explorer_url,
  usdc_address = EXCLUDED.usdc_address,
  min_confirmations = EXCLUDED.min_confirmations;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user ON flowb_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON flowb_orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_pending ON flowb_orders(status, expires_at) WHERE status IN ('pending', 'awaiting_payment');
CREATE INDEX IF NOT EXISTS idx_orders_tx ON flowb_orders(tx_hash) WHERE tx_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_stripe_pi ON flowb_orders(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON flowb_orders(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_connected_wallets_user ON flowb_connected_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_connected_wallets_address ON flowb_connected_wallets(wallet_address);

-- RLS
ALTER TABLE flowb_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_connected_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_payment_networks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_all_orders" ON flowb_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_connected_wallets" ON flowb_connected_wallets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_payment_networks" ON flowb_payment_networks FOR ALL USING (true) WITH CHECK (true);

-- Function to expire pending orders
CREATE OR REPLACE FUNCTION expire_pending_orders()
RETURNS void AS $$
BEGIN
  UPDATE flowb_orders
  SET status = 'expired', updated_at = now()
  WHERE status IN ('pending', 'awaiting_payment')
  AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Function to get user order history
CREATE OR REPLACE FUNCTION get_user_orders(p_user_id TEXT, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  product_slug TEXT,
  product_name TEXT,
  amount_usdc NUMERIC,
  status TEXT,
  payment_method TEXT,
  payment_network TEXT,
  tx_hash TEXT,
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    p.slug,
    p.name,
    o.amount_usdc,
    o.status,
    o.payment_method,
    o.payment_network,
    o.tx_hash,
    o.created_at,
    o.completed_at
  FROM flowb_orders o
  JOIN flowb_products p ON p.id = o.product_id
  WHERE o.user_id = p_user_id
  ORDER BY o.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
