-- Persistent session storage for Telegram bot
-- Survives bot restarts (verification, identity fields)
CREATE TABLE IF NOT EXISTS flowb_sessions (
  user_id TEXT PRIMARY KEY,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  privy_id TEXT,
  danz_username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
