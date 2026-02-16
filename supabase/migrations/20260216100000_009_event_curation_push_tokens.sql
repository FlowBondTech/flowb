-- 009: Event curation columns + push tokens table
-- Supports admin event curation and native app push notifications

-- Add curation columns to discovered events
ALTER TABLE flowb_discovered_events
  ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_note text;

-- Index for quick featured/hidden queries
CREATE INDEX IF NOT EXISTS idx_flowb_events_featured
  ON flowb_discovered_events (featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_flowb_events_hidden
  ON flowb_discovered_events (hidden) WHERE hidden = true;

-- Push tokens table for native app (Expo Push Notifications)
CREATE TABLE IF NOT EXISTS flowb_push_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  platform text NOT NULL DEFAULT 'app',
  push_token text NOT NULL,
  device_type text, -- 'ios' or 'android'
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, push_token)
);

CREATE INDEX IF NOT EXISTS idx_flowb_push_tokens_user
  ON flowb_push_tokens (user_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_flowb_push_tokens_token
  ON flowb_push_tokens (push_token);
