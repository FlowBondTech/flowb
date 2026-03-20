-- =====================================================
-- DANZ Account Linking & Identity Schema
-- =====================================================
-- Enables unified identity across all DANZ apps
-- (danz-web via Privy, miniapps via Farcaster)

-- =====================================================
-- CORE USER TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Display info (synced from linked providers)
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT,
  
  -- Unified stats across all apps
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  
  -- Linking status
  linking_bonus_claimed BOOLEAN DEFAULT FALSE,
  accounts_linked_count INTEGER DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- AUTH PROVIDERS (Privy, Farcaster, etc.)
-- =====================================================

CREATE TYPE auth_provider AS ENUM ('privy', 'farcaster', 'wallet');

CREATE TABLE IF NOT EXISTS user_auth_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Provider identification
  provider auth_provider NOT NULL,
  provider_id TEXT NOT NULL,  -- privy DID, farcaster FID, wallet address
  
  -- Provider-specific data
  metadata JSONB DEFAULT '{}',
  -- Farcaster: { "fid": 12345, "username": "user", "custody_address": "0x..." }
  -- Privy: { "did": "did:privy:xxx", "email": "user@example.com", "wallet": "0x..." }
  -- Wallet: { "address": "0x...", "chain": "base" }
  
  -- Status
  is_primary BOOLEAN DEFAULT FALSE,
  verified BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(provider, provider_id)
);

CREATE INDEX idx_auth_provider_lookup ON user_auth_providers(provider, provider_id);
CREATE INDEX idx_auth_user_providers ON user_auth_providers(user_id);

-- =====================================================
-- USER WALLETS (Multiple wallets per user)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  wallet_address TEXT NOT NULL,
  chain TEXT DEFAULT 'base',  -- 'base', 'ethereum', 'solana'
  
  -- Source tracking
  source auth_provider,  -- which provider added this wallet
  is_primary BOOLEAN DEFAULT FALSE,
  
  -- Verification
  verified_at TIMESTAMPTZ,
  verification_message TEXT,
  verification_signature TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One wallet per chain
  UNIQUE(wallet_address, chain)
);

CREATE INDEX idx_wallet_lookup ON user_wallets(wallet_address, chain);
CREATE INDEX idx_user_wallets ON user_wallets(user_id);

-- =====================================================
-- LINKING REWARDS
-- =====================================================

CREATE TYPE reward_type AS ENUM (
  'first_link',      -- First time linking a new provider
  'full_link',       -- Linked all available providers
  'cross_app_first', -- First action in a different app after linking
  'referral'         -- Referred someone who linked
);

CREATE TABLE IF NOT EXISTS linking_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  provider_linked auth_provider,
  reward_type reward_type NOT NULL,
  xp_awarded INTEGER NOT NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  awarded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_linking_rewards_user ON linking_rewards(user_id);

-- =====================================================
-- LINKING TOKENS (For secure cross-app linking)
-- =====================================================

CREATE TABLE IF NOT EXISTS linking_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- The user initiating the link
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  source_provider auth_provider NOT NULL,
  
  -- Token for verification
  token TEXT UNIQUE NOT NULL,
  
  -- What we're linking to
  target_provider auth_provider NOT NULL,
  
  -- Security
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  ip_address TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_linking_token ON linking_tokens(token) WHERE used_at IS NULL;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update user's updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_timestamp();

-- Function to update accounts_linked_count
CREATE OR REPLACE FUNCTION update_linked_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users 
    SET accounts_linked_count = (
      SELECT COUNT(DISTINCT provider) 
      FROM user_auth_providers 
      WHERE user_id = NEW.user_id
    )
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users 
    SET accounts_linked_count = (
      SELECT COUNT(DISTINCT provider) 
      FROM user_auth_providers 
      WHERE user_id = OLD.user_id
    )
    WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auth_provider_count
  AFTER INSERT OR DELETE ON user_auth_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_linked_count();

-- Function to auto-link by wallet
CREATE OR REPLACE FUNCTION find_user_by_wallet(wallet TEXT)
RETURNS UUID AS $$
DECLARE
  found_user_id UUID;
BEGIN
  SELECT user_id INTO found_user_id
  FROM user_wallets
  WHERE LOWER(wallet_address) = LOWER(wallet)
  LIMIT 1;
  
  RETURN found_user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS
-- =====================================================

-- User with all linked providers
CREATE OR REPLACE VIEW user_with_providers AS
SELECT 
  u.*,
  COALESCE(
    json_agg(
      json_build_object(
        'provider', uap.provider,
        'provider_id', uap.provider_id,
        'metadata', uap.metadata,
        'is_primary', uap.is_primary,
        'linked_at', uap.linked_at
      )
    ) FILTER (WHERE uap.id IS NOT NULL),
    '[]'::json
  ) as auth_providers,
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'address', uw.wallet_address,
        'chain', uw.chain,
        'is_primary', uw.is_primary
      )
    ) FILTER (WHERE uw.id IS NOT NULL),
    '[]'::json
  ) as wallets
FROM users u
LEFT JOIN user_auth_providers uap ON u.id = uap.user_id
LEFT JOIN user_wallets uw ON u.id = uw.user_id
GROUP BY u.id;

-- =====================================================
-- REWARD CONSTANTS (as a reference table)
-- =====================================================

CREATE TABLE IF NOT EXISTS reward_config (
  reward_type reward_type PRIMARY KEY,
  xp_amount INTEGER NOT NULL,
  description TEXT
);

INSERT INTO reward_config (reward_type, xp_amount, description) VALUES
  ('first_link', 500, 'Link a new authentication provider'),
  ('full_link', 250, 'Complete bonus for linking all providers'),
  ('cross_app_first', 100, 'First action in another DANZ app'),
  ('referral', 200, 'Referred user who completed linking')
ON CONFLICT (reward_type) DO NOTHING;
