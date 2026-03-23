-- DANZ Party System Database Schema
-- Includes: Parties, Members, Treasury, Staking, Slashing, Shop, Encouragement

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE party_tier AS ENUM ('starter', 'rising', 'hot', 'fire', 'legendary');
CREATE TYPE party_role AS ENUM ('leader', 'co_leader', 'member');
CREATE TYPE party_status AS ENUM ('active', 'inactive', 'disbanded');
CREATE TYPE party_pool_type AS ENUM ('intimate', 'large', 'creator');
CREATE TYPE slash_reason AS ENUM ('missed_checkin', 'streak_break', 'party_streak_break', 'inactivity', 'early_leave');
CREATE TYPE slash_redistribution AS ENUM ('treasury', 'active_members', 'burned');
CREATE TYPE encouragement_type AS ENUM ('friendly_reminder', 'streak_at_risk', 'party_needs_you', 'comeback', 'celebration', 'milestone', 'leaderboard_climb', 'custom');
CREATE TYPE message_delivery AS ENUM ('in_app', 'farcaster_dm', 'push_notification');
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
CREATE TYPE item_category AS ENUM ('protection', 'boost', 'cosmetic', 'utility', 'party');
CREATE TYPE item_rarity AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');

-- ============================================
-- PARTIES
-- ============================================

CREATE TABLE parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  description TEXT,
  avatar_emoji VARCHAR(10) DEFAULT '🎉',
  tier party_tier DEFAULT 'starter',
  pool_type party_pool_type NOT NULL DEFAULT 'large',
  status party_status DEFAULT 'active',

  -- Membership settings
  max_members INTEGER DEFAULT 10,
  min_members INTEGER DEFAULT 2,
  is_public BOOLEAN DEFAULT true,
  join_code VARCHAR(20) UNIQUE,

  -- Stats (denormalized for performance)
  total_xp BIGINT DEFAULT 0,
  weekly_xp BIGINT DEFAULT 0,
  average_streak DECIMAL(5,2) DEFAULT 0,
  active_members_today INTEGER DEFAULT 0,
  longest_collective_streak INTEGER DEFAULT 0,
  party_streak INTEGER DEFAULT 0,

  -- Bonuses
  current_multiplier DECIMAL(4,2) DEFAULT 1.0,
  bonus_pool BIGINT DEFAULT 0,

  -- Creator token (for creator pool type)
  creator_token_address VARCHAR(66),
  creator_token_symbol VARCHAR(20),

  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parties_status ON parties(status);
CREATE INDEX idx_parties_pool_type ON parties(pool_type);
CREATE INDEX idx_parties_tier ON parties(tier);
CREATE INDEX idx_parties_weekly_xp ON parties(weekly_xp DESC);
CREATE INDEX idx_parties_join_code ON parties(join_code) WHERE join_code IS NOT NULL;

-- ============================================
-- PARTY MEMBERS
-- ============================================

CREATE TABLE party_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fid INTEGER NOT NULL,

  role party_role DEFAULT 'member',

  -- Stats
  current_streak INTEGER DEFAULT 0,
  total_contributions BIGINT DEFAULT 0,
  last_checkin_at TIMESTAMPTZ,
  is_active_today BOOLEAN DEFAULT false,

  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(party_id, user_id)
);

CREATE INDEX idx_party_members_party ON party_members(party_id);
CREATE INDEX idx_party_members_user ON party_members(user_id);
CREATE INDEX idx_party_members_fid ON party_members(fid);
CREATE INDEX idx_party_members_active ON party_members(party_id, is_active_today);

-- ============================================
-- PARTY TREASURY
-- ============================================

CREATE TABLE party_treasuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL UNIQUE REFERENCES parties(id) ON DELETE CASCADE,

  total_balance BIGINT DEFAULT 0,
  staking_pool BIGINT DEFAULT 0,
  rewards_pool BIGINT DEFAULT 0,

  -- Creator token balances (if applicable)
  creator_token_balance BIGINT DEFAULT 0,

  -- Distribution schedule
  last_distribution_at TIMESTAMPTZ DEFAULT NOW(),
  next_distribution_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_party_treasuries_party ON party_treasuries(party_id);

-- ============================================
-- MEMBER STAKES
-- ============================================

CREATE TABLE member_stakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES party_members(id) ON DELETE CASCADE,
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),

  staked_amount BIGINT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ NOT NULL,

  -- Protection
  slash_protection_active BOOLEAN DEFAULT false,
  slash_protection_expires_at TIMESTAMPTZ,
  slash_protection_item_id UUID,

  -- Historical stats
  total_slashed BIGINT DEFAULT 0,
  total_earned BIGINT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(member_id)
);

CREATE INDEX idx_member_stakes_party ON member_stakes(party_id);
CREATE INDEX idx_member_stakes_user ON member_stakes(user_id);
CREATE INDEX idx_member_stakes_locked ON member_stakes(locked_until);

-- ============================================
-- SLASH EVENTS
-- ============================================

CREATE TABLE slash_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES party_members(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),

  reason slash_reason NOT NULL,
  amount BIGINT NOT NULL,
  redistributed_to slash_redistribution NOT NULL,

  -- Protection used
  protection_used UUID REFERENCES inventory_items(id),
  was_protected BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_slash_events_party ON slash_events(party_id);
CREATE INDEX idx_slash_events_member ON slash_events(member_id);
CREATE INDEX idx_slash_events_created ON slash_events(created_at DESC);

-- ============================================
-- PARTY INVITES
-- ============================================

CREATE TABLE party_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,

  invited_by_user_id UUID NOT NULL REFERENCES users(id),
  invited_user_id UUID REFERENCES users(id),
  invited_fid INTEGER,

  status invite_status DEFAULT 'pending',

  invited_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  responded_at TIMESTAMPTZ
);

CREATE INDEX idx_party_invites_party ON party_invites(party_id);
CREATE INDEX idx_party_invites_invited_user ON party_invites(invited_user_id);
CREATE INDEX idx_party_invites_fid ON party_invites(invited_fid);
CREATE INDEX idx_party_invites_status ON party_invites(status);

-- ============================================
-- SHOP ITEMS (CATALOG)
-- ============================================

CREATE TABLE shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key VARCHAR(50) UNIQUE NOT NULL,

  name VARCHAR(100) NOT NULL,
  description TEXT,
  emoji VARCHAR(10),

  category item_category NOT NULL,
  rarity item_rarity NOT NULL DEFAULT 'common',

  price_danz INTEGER NOT NULL,
  price_creator_token INTEGER,

  duration_hours INTEGER, -- null = permanent or single use
  max_stack INTEGER DEFAULT 1,

  effect_type VARCHAR(50) NOT NULL,
  effect_value JSONB NOT NULL,

  is_limited_edition BOOLEAN DEFAULT false,
  available_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shop_items_category ON shop_items(category);
CREATE INDEX idx_shop_items_rarity ON shop_items(rarity);
CREATE INDEX idx_shop_items_active ON shop_items(is_active);

-- ============================================
-- USER INVENTORY
-- ============================================

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_item_id UUID NOT NULL REFERENCES shop_items(id),

  quantity INTEGER DEFAULT 1,
  uses_remaining INTEGER,

  is_active BOOLEAN DEFAULT false,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_user ON inventory_items(user_id);
CREATE INDEX idx_inventory_shop_item ON inventory_items(shop_item_id);
CREATE INDEX idx_inventory_active ON inventory_items(user_id, is_active);

-- ============================================
-- PURCHASE HISTORY
-- ============================================

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  shop_item_id UUID NOT NULL REFERENCES shop_items(id),
  inventory_item_id UUID REFERENCES inventory_items(id),

  quantity INTEGER DEFAULT 1,
  total_price BIGINT NOT NULL,
  currency VARCHAR(20) DEFAULT 'DANZ',

  transaction_hash VARCHAR(100),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchases_user ON purchases(user_id);
CREATE INDEX idx_purchases_created ON purchases(created_at DESC);

-- ============================================
-- ENCOURAGEMENT MESSAGES
-- ============================================

CREATE TABLE encouragement_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  type encouragement_type NOT NULL,
  from_user_id UUID REFERENCES users(id), -- null for system messages
  to_user_id UUID NOT NULL REFERENCES users(id),
  party_id UUID REFERENCES parties(id),

  message TEXT NOT NULL,
  emoji VARCHAR(10),

  is_read BOOLEAN DEFAULT false,
  sent_via message_delivery NOT NULL,

  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_encouragement_to_user ON encouragement_messages(to_user_id);
CREATE INDEX idx_encouragement_party ON encouragement_messages(party_id);
CREATE INDEX idx_encouragement_unread ON encouragement_messages(to_user_id, is_read) WHERE NOT is_read;

-- ============================================
-- ENCOURAGEMENT COOLDOWNS
-- ============================================

CREATE TABLE encouragement_cooldowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_user_id UUID NOT NULL REFERENCES users(id),
  type encouragement_type NOT NULL,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(to_user_id, type)
);

CREATE INDEX idx_encouragement_cooldowns_user ON encouragement_cooldowns(to_user_id);

-- ============================================
-- DAILY PARTY SNAPSHOTS (for analytics)
-- ============================================

CREATE TABLE party_daily_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,

  member_count INTEGER,
  active_members INTEGER,
  participation_rate DECIMAL(5,2),

  total_xp BIGINT,
  daily_xp_earned BIGINT,

  party_streak INTEGER,
  multiplier DECIMAL(4,2),

  treasury_balance BIGINT,
  rewards_distributed BIGINT,
  slashes_applied BIGINT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(party_id, snapshot_date)
);

CREATE INDEX idx_party_snapshots_party ON party_daily_snapshots(party_id);
CREATE INDEX idx_party_snapshots_date ON party_daily_snapshots(snapshot_date DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to calculate party multiplier
CREATE OR REPLACE FUNCTION calculate_party_multiplier(
  p_active_members INTEGER,
  p_total_members INTEGER,
  p_party_streak INTEGER,
  p_tier_bonus DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
  participation_rate DECIMAL;
  participation_bonus DECIMAL;
  streak_bonus DECIMAL;
BEGIN
  -- Calculate participation rate
  IF p_total_members > 0 THEN
    participation_rate := p_active_members::DECIMAL / p_total_members;
  ELSE
    participation_rate := 0;
  END IF;

  -- Participation bonus (up to 20% for 100% participation)
  participation_bonus := participation_rate * 0.20;

  -- Streak bonus (caps at 10% for 10+ day party streak)
  streak_bonus := LEAST(p_party_streak * 0.01, 0.10);

  -- Total multiplier: 1 + tier + participation + streak
  RETURN 1 + p_tier_bonus + participation_bonus + streak_bonus;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get slash penalty rate
CREATE OR REPLACE FUNCTION get_slash_penalty(
  p_pool_type party_pool_type,
  p_reason slash_reason
) RETURNS DECIMAL AS $$
BEGIN
  CASE p_pool_type
    WHEN 'intimate' THEN
      CASE p_reason
        WHEN 'missed_checkin' THEN RETURN 0.05;
        WHEN 'streak_break' THEN RETURN 0.10;
        WHEN 'party_streak_break' THEN RETURN 0.15;
        WHEN 'inactivity' THEN RETURN 0.25;
        WHEN 'early_leave' THEN RETURN 0.50;
      END CASE;
    WHEN 'large' THEN
      CASE p_reason
        WHEN 'missed_checkin' THEN RETURN 0.01;
        WHEN 'streak_break' THEN RETURN 0.02;
        WHEN 'party_streak_break' THEN RETURN 0.00;
        WHEN 'inactivity' THEN RETURN 0.10;
        WHEN 'early_leave' THEN RETURN 0.20;
      END CASE;
    WHEN 'creator' THEN
      CASE p_reason
        WHEN 'missed_checkin' THEN RETURN 0.03;
        WHEN 'streak_break' THEN RETURN 0.05;
        WHEN 'party_streak_break' THEN RETURN 0.08;
        WHEN 'inactivity' THEN RETURN 0.15;
        WHEN 'early_leave' THEN RETURN 0.30;
      END CASE;
  END CASE;
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update party updated_at
CREATE OR REPLACE FUNCTION update_party_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_parties_updated
  BEFORE UPDATE ON parties
  FOR EACH ROW
  EXECUTE FUNCTION update_party_timestamp();

CREATE TRIGGER tr_party_members_updated
  BEFORE UPDATE ON party_members
  FOR EACH ROW
  EXECUTE FUNCTION update_party_timestamp();

CREATE TRIGGER tr_member_stakes_updated
  BEFORE UPDATE ON member_stakes
  FOR EACH ROW
  EXECUTE FUNCTION update_party_timestamp();

CREATE TRIGGER tr_inventory_items_updated
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_party_timestamp();

-- ============================================
-- SEED DATA: SHOP ITEMS
-- ============================================

INSERT INTO shop_items (item_key, name, description, emoji, category, rarity, price_danz, duration_hours, max_stack, effect_type, effect_value) VALUES
-- Protection Items
('danz_dodge_single', 'Danz Dodge', 'Protects your treasury from ONE missed check-in slash. Use wisely!', '🛡️', 'protection', 'common', 25, NULL, 5, 'slash_protection', '{"value": 1}'),
('danz_dodge_triple', 'Triple Dodge Pack', 'A pack of 3 Danz Dodges at a discount. Planning a vacation?', '🛡️🛡️🛡️', 'protection', 'uncommon', 60, NULL, 3, 'slash_protection', '{"value": 3}'),
('immunity_shield', 'Immunity Shield', '24-hour complete protection from ALL slash types. Perfect for emergencies!', '✨🛡️✨', 'protection', 'rare', 100, 24, 2, 'timed_immunity', '{"value": 24}'),
('weekend_pass', 'Weekend Pass', 'Protection for Saturday and Sunday. Because weekends are sacred!', '🎉🛡️', 'protection', 'uncommon', 40, 48, 4, 'weekend_protection', '{"value": true}'),
('vacation_mode', 'Vacation Mode', '7-day protection for when life happens. No slashing, no worries.', '🏖️', 'protection', 'epic', 200, 168, 1, 'vacation_protection', '{"value": 7}'),

-- Boost Items
('xp_boost_small', 'XP Spark', '+25% XP for your next 3 check-ins. Every bit counts!', '⚡', 'boost', 'common', 15, NULL, 10, 'xp_multiplier', '{"value": 1.25, "uses": 3}'),
('xp_boost_medium', 'XP Surge', '+50% XP for 24 hours. Make every dance count double!', '⚡⚡', 'boost', 'uncommon', 50, 24, 5, 'xp_multiplier', '{"value": 1.50}'),
('xp_boost_large', 'XP Storm', 'DOUBLE XP for 48 hours! Climb that leaderboard!', '🌩️', 'boost', 'rare', 150, 48, 2, 'xp_multiplier', '{"value": 2.0}'),
('streak_saver', 'Streak Saver', 'Restores a broken streak back to its previous value. One-time use.', '🔥💾', 'boost', 'epic', 100, NULL, 1, 'streak_restore', '{"value": true}'),
('party_boost', 'Party Amplifier', 'Boosts entire party XP by 10% for 24h. Share the love!', '📢', 'boost', 'rare', 200, 24, 1, 'party_xp_boost', '{"value": 1.10}'),

-- Utility Items
('extra_encourage', 'Megaphone', 'Send 5 extra encouragement messages today. Rally your crew!', '📣', 'utility', 'common', 10, 24, 3, 'extra_messages', '{"value": 5}'),
('anonymous_encourage', 'Secret Admirer', 'Send anonymous encouragement messages. Mystery motivation!', '🎭', 'utility', 'uncommon', 20, NULL, 5, 'anonymous_messages', '{"value": 10}'),
('party_rename', 'Party Rebrand', 'Change your party name and emoji. Fresh start!', '✏️', 'utility', 'uncommon', 50, NULL, 1, 'party_rename', '{"value": true}'),
('slot_expansion', 'Party Expansion', 'Add 5 more member slots to your party. Grow the crew!', '📈', 'utility', 'rare', 150, NULL, 3, 'member_slots', '{"value": 5}'),
('early_warning', 'Early Warning System', 'Get notified 2 hours earlier when party members are at risk.', '⏰', 'utility', 'uncommon', 30, 168, 4, 'early_notifications', '{"value": 2}'),

-- Cosmetic Items
('profile_frame_fire', 'Fire Frame', 'A blazing fire border around your avatar. Hot stuff!', '🔥', 'cosmetic', 'uncommon', 30, NULL, 1, 'avatar_frame', '{"value": "fire"}'),
('profile_frame_rainbow', 'Rainbow Frame', 'Animated rainbow border. Show your colors!', '🌈', 'cosmetic', 'rare', 75, NULL, 1, 'avatar_frame', '{"value": "rainbow"}'),
('title_dance_master', 'Dance Master Title', 'Display "Dance Master" next to your name. Earned respect!', '👑', 'cosmetic', 'epic', 200, NULL, 1, 'title', '{"value": "Dance Master"}'),
('confetti_checkin', 'Confetti Check-in', 'Your check-ins explode with confetti! Party vibes only.', '🎊', 'cosmetic', 'uncommon', 40, NULL, 1, 'checkin_effect', '{"value": "confetti"}');

-- ============================================
-- VIEWS
-- ============================================

-- Party leaderboard view
CREATE OR REPLACE VIEW party_leaderboard AS
SELECT
  p.id,
  p.name,
  p.avatar_emoji,
  p.tier,
  p.pool_type,
  p.weekly_xp,
  p.party_streak,
  COUNT(pm.id) as member_count,
  RANK() OVER (ORDER BY p.weekly_xp DESC) as rank
FROM parties p
LEFT JOIN party_members pm ON pm.party_id = p.id
WHERE p.status = 'active'
GROUP BY p.id
ORDER BY p.weekly_xp DESC;

-- User party summary view
CREATE OR REPLACE VIEW user_party_summary AS
SELECT
  pm.user_id,
  p.id as party_id,
  p.name as party_name,
  p.avatar_emoji,
  p.tier,
  p.pool_type,
  pm.role,
  pm.current_streak,
  pm.is_active_today,
  ms.staked_amount,
  ms.locked_until,
  ms.slash_protection_active,
  ms.total_earned,
  ms.total_slashed
FROM party_members pm
JOIN parties p ON p.id = pm.party_id
LEFT JOIN member_stakes ms ON ms.member_id = pm.id
WHERE p.status = 'active';
