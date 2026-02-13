-- FlowB Points System
-- Tables: flowb_user_points, flowb_points_ledger

CREATE TABLE IF NOT EXISTS flowb_user_points (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id text NOT NULL,
  platform text NOT NULL DEFAULT 'telegram',
  total_points integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  first_actions jsonb NOT NULL DEFAULT '{}',
  milestone_level integer NOT NULL DEFAULT 0,
  referral_code text,
  referred_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);

CREATE TABLE IF NOT EXISTS flowb_points_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id text NOT NULL,
  platform text NOT NULL DEFAULT 'telegram',
  action text NOT NULL,
  points integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_points_user_platform ON flowb_user_points (user_id, platform);
CREATE INDEX IF NOT EXISTS idx_ledger_user_action_date ON flowb_points_ledger (user_id, platform, action, created_at);
CREATE INDEX IF NOT EXISTS idx_points_referral ON flowb_user_points (referral_code) WHERE referral_code IS NOT NULL;

-- Enable RLS
ALTER TABLE flowb_user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_points_ledger ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "service_all_points" ON flowb_user_points FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_ledger" ON flowb_points_ledger FOR ALL USING (true) WITH CHECK (true);
