-- Migration 011: Channel chatter capture
-- Tracks groups the bot is in and extracts event signals from messages

-- Channels the bot is a member of
CREATE TABLE flowb_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id BIGINT UNIQUE NOT NULL,
  chat_type TEXT NOT NULL,
  title TEXT,
  member_count INT,
  added_by BIGINT,
  active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_channels_chat_id ON flowb_channels(chat_id);
CREATE INDEX idx_channels_active ON flowb_channels(active) WHERE active = true;

-- Event signals extracted from group messages
CREATE TABLE flowb_channel_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES flowb_channels(id),
  chat_id BIGINT NOT NULL,
  message_id BIGINT,
  sender_id BIGINT,
  sender_name TEXT,
  event_title TEXT,
  event_date TEXT,
  event_time TEXT,
  parsed_datetime TIMESTAMPTZ,
  venue_name TEXT,
  event_url TEXT,
  description TEXT,
  confidence REAL DEFAULT 0.0,
  raw_text TEXT,
  digested BOOLEAN DEFAULT false,
  promoted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signals_channel ON flowb_channel_signals(chat_id);
CREATE INDEX idx_signals_undigested ON flowb_channel_signals(digested) WHERE digested = false;
CREATE INDEX idx_signals_datetime ON flowb_channel_signals(parsed_datetime) WHERE parsed_datetime IS NOT NULL;
