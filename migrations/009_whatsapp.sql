-- 009_whatsapp.sql
-- WhatsApp integration: session support + template tracking

-- Add WhatsApp profile name to sessions
ALTER TABLE flowb_sessions
  ADD COLUMN IF NOT EXISTS wa_profile_name TEXT;

-- Track WhatsApp template message sends (for 24h window awareness)
CREATE TABLE IF NOT EXISTS flowb_wa_template_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  template_name TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'sent'
);

CREATE INDEX IF NOT EXISTS idx_wa_template_phone ON flowb_wa_template_log(phone, sent_at DESC);

-- Track last conversation timestamp per phone (for 24h window)
CREATE TABLE IF NOT EXISTS flowb_wa_conversations (
  phone TEXT PRIMARY KEY,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  user_id TEXT,
  profile_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_wa_conversations_user ON flowb_wa_conversations(user_id);
