-- Signal integration tables
-- Tracks Signal conversation state and profile info

-- Signal conversation tracking (mirrors flowb_wa_conversations)
CREATE TABLE IF NOT EXISTS flowb_signal_conversations (
  phone TEXT PRIMARY KEY,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  user_id TEXT,
  profile_name TEXT,
  verified BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_signal_conversations_user
  ON flowb_signal_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_signal_conversations_last_msg
  ON flowb_signal_conversations(last_message_at DESC);
