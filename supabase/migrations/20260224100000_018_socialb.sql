-- SocialB: Auto-repost Farcaster casts to all connected platforms
-- Uses Postiz for multi-platform posting, Neynar for cast detection

CREATE TABLE flowb_socialb_configs (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           TEXT NOT NULL UNIQUE,
  org_id            UUID NOT NULL REFERENCES flowb_social_orgs(id),
  farcaster_fid     INTEGER NOT NULL,
  enabled           BOOLEAN DEFAULT FALSE,
  platforms         TEXT[] DEFAULT '{}',
  webhook_id        TEXT,
  last_cast_hash    TEXT,
  auto_media        BOOLEAN DEFAULT TRUE,
  include_links     BOOLEAN DEFAULT TRUE,
  exclude_replies   BOOLEAN DEFAULT TRUE,
  exclude_recasts   BOOLEAN DEFAULT TRUE,
  daily_limit       INTEGER DEFAULT 10,
  posts_today       INTEGER DEFAULT 0,
  posts_today_reset TIMESTAMPTZ DEFAULT NOW(),
  tier              TEXT DEFAULT 'free',
  chat_queries_today INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_socialb_fid ON flowb_socialb_configs(farcaster_fid);
CREATE INDEX idx_socialb_enabled ON flowb_socialb_configs(enabled) WHERE enabled = TRUE;

CREATE TABLE flowb_socialb_activity (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id           UUID NOT NULL REFERENCES flowb_socialb_configs(id) ON DELETE CASCADE,
  user_id             TEXT NOT NULL,
  cast_hash           TEXT NOT NULL,
  cast_text           TEXT,
  platforms_attempted TEXT[],
  platforms_succeeded TEXT[],
  platforms_failed    TEXT[],
  social_post_id      UUID REFERENCES flowb_social_posts(id),
  error_message       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_socialb_activity ON flowb_socialb_activity(config_id, created_at DESC);
CREATE UNIQUE INDEX idx_socialb_dedup ON flowb_socialb_activity(config_id, cast_hash);
