-- Cross-device magic link auth coordination
-- When Device A requests an OTP/magic link, a pending_auth row is created.
-- When Device B clicks the magic link, it resolves the pending row with a JWT.
-- Device A polls and picks up the JWT to auto-sign in.

CREATE TABLE IF NOT EXISTS flowb_pending_auth (
  id         text PRIMARY KEY,              -- random token (nanoid)
  email      text NOT NULL,
  jwt        text,                          -- filled when resolved by Device B
  user_json  jsonb,                         -- user info for Device A
  resolved   boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- Auto-cleanup: rows older than 15 minutes
CREATE INDEX idx_pending_auth_created ON flowb_pending_auth (created_at);

-- RLS: service role only (server-side access)
ALTER TABLE flowb_pending_auth ENABLE ROW LEVEL SECURITY;
