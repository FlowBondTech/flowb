-- 036: Create flowb_admins table
-- Centralizes admin status in the database so admin access can be managed
-- without redeployment. Used by FiFlow, admin alerts, and other admin-gated features.

CREATE TABLE IF NOT EXISTS flowb_admins (
  user_id     TEXT PRIMARY KEY,           -- "telegram_537564576", "farcaster_324863", etc.
  label       TEXT NOT NULL,              -- display name for reference
  permissions TEXT[] DEFAULT '{*}',       -- granular: 'fiflow', 'alerts', 'billing', '*'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed known admins
INSERT INTO flowb_admins (user_id, label, permissions) VALUES
  ('telegram_537564576',  'koh',   '{*}'),
  ('farcaster_324863',    'koh',   '{*}'),
  ('web_did:privy:cmei8nagj00dwkz0cojwlqah8', 'koh', '{*}'),
  ('telegram_2006063044', 'steph', '{*}'),
  ('farcaster_510298',    'steph', '{*}')
ON CONFLICT (user_id) DO NOTHING;

-- RLS
ALTER TABLE flowb_admins ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on flowb_admins"
  ON flowb_admins FOR ALL
  USING (true)
  WITH CHECK (true);
