-- FlowB Agents: Personal AI agents with x402 micropayment support
-- 10 initial agents for EthDenver launch

-- Agent slots (the 10 available agents)
CREATE TABLE IF NOT EXISTS flowb_agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_number INTEGER NOT NULL UNIQUE CHECK (slot_number BETWEEN 1 AND 10),
  user_id TEXT,                          -- telegram_xxx or farcaster_xxx (NULL = unclaimed)
  agent_name TEXT,                       -- user-chosen or auto name
  wallet_address TEXT,                   -- Base wallet via AgentKit
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'reserved', 'active')),
  reserved_for TEXT,                     -- 'top_points' for slots 9-10, NULL for open
  skills JSONB DEFAULT '[]'::jsonb,      -- array of skill slugs the agent has
  metadata JSONB DEFAULT '{}'::jsonb,    -- extra data (personality, preferences, etc)
  usdc_balance NUMERIC(12,6) DEFAULT 0,  -- tracked balance (mirror of on-chain)
  total_earned NUMERIC(12,6) DEFAULT 0,  -- lifetime USDC earned
  total_spent NUMERIC(12,6) DEFAULT 0,   -- lifetime USDC spent
  created_at TIMESTAMPTZ DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Pre-populate the 10 slots
INSERT INTO flowb_agents (slot_number, status, reserved_for) VALUES
  (1, 'open', NULL),
  (2, 'open', NULL),
  (3, 'open', NULL),
  (4, 'open', NULL),
  (5, 'open', NULL),
  (6, 'open', NULL),
  (7, 'open', NULL),
  (8, 'open', NULL),
  (9, 'reserved', 'top_points'),
  (10, 'reserved', 'top_points_gift')
ON CONFLICT (slot_number) DO NOTHING;

-- Agent skills marketplace
CREATE TABLE IF NOT EXISTS flowb_agent_skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL,                     -- e.g., 'event-discovery', 'social-connector'
  name TEXT NOT NULL,
  description TEXT,
  price_usdc NUMERIC(8,4) NOT NULL,       -- cost via x402
  category TEXT DEFAULT 'utility',
  capabilities JSONB DEFAULT '[]'::jsonb, -- what the skill enables
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed the skill marketplace
INSERT INTO flowb_agent_skills (slug, name, description, price_usdc, category, capabilities) VALUES
  ('event-discovery', 'Event Discovery', 'Real-time event search + AI recommendations', 0.05, 'discovery', '["search_events", "recommend_events", "filter_by_vibe"]'),
  ('social-connector', 'Social Connector', 'Find mutual connections and suggest intros', 0.10, 'social', '["find_mutuals", "suggest_intros", "social_graph"]'),
  ('crew-finder', 'Crew Finder', 'Match to best crews based on interests', 0.05, 'social', '["match_crews", "crew_compatibility", "join_suggestions"]'),
  ('event-boost', 'Event Boost', 'Pin an event at top of everyone''s feed for 24h', 0.50, 'promotion', '["boost_event", "featured_placement", "notification_blast"]'),
  ('vibe-check', 'Vibe Check', 'Sentiment analysis of event buzz and attendance', 0.10, 'analytics', '["sentiment_analysis", "attendance_prediction", "vibe_score"]'),
  ('tip-sender', 'Tip Sender', 'Send micro-tips to event organizers and creators', 0.02, 'payments', '["send_tip", "tip_chain", "gratitude_flow"]')
ON CONFLICT DO NOTHING;

-- Agent transactions (x402 payment log)
CREATE TABLE IF NOT EXISTS flowb_agent_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_agent_id UUID REFERENCES flowb_agents(id),
  to_agent_id UUID REFERENCES flowb_agents(id),
  from_user_id TEXT,                      -- for non-agent-to-agent (external)
  to_user_id TEXT,
  amount_usdc NUMERIC(12,6) NOT NULL,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('skill_purchase', 'event_boost', 'tip', 'recommendation', 'api_query', 'seed', 'prize')),
  skill_slug TEXT,                        -- if skill_purchase
  event_id TEXT,                          -- if event_boost or tip
  tx_hash TEXT,                           -- on-chain tx hash
  status TEXT DEFAULT 'completed',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Event boosts (active boosts for feed ranking)
CREATE TABLE IF NOT EXISTS flowb_event_boosts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL,
  agent_id UUID REFERENCES flowb_agents(id),
  user_id TEXT NOT NULL,
  amount_usdc NUMERIC(8,4) NOT NULL,
  agent_name TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agents_user ON flowb_agents(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agents_status ON flowb_agents(status);
CREATE INDEX IF NOT EXISTS idx_agent_tx_from ON flowb_agent_transactions(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tx_to ON flowb_agent_transactions(to_agent_id);
CREATE INDEX IF NOT EXISTS idx_event_boosts_active ON flowb_event_boosts(event_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_event_boosts_expires ON flowb_event_boosts(expires_at) WHERE active = true;
