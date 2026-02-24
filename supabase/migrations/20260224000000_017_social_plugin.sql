-- Social Plugin Tables
-- Maps FlowB businesses/users to isolated Postiz organizations
-- and tracks social media posts created through FlowB.

-- ============================================================================
-- flowb_social_orgs: Maps FlowB users to Postiz organizations
-- ============================================================================

CREATE TABLE IF NOT EXISTS flowb_social_orgs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         TEXT NOT NULL,                  -- telegram_123, web_xyz (business owner)
  org_name        TEXT NOT NULL,                  -- Business display name
  postiz_org_id   TEXT NOT NULL UNIQUE,           -- Postiz organization ID
  postiz_api_key_enc TEXT NOT NULL,               -- AES-256-GCM encrypted API key
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_orgs_user ON flowb_social_orgs(user_id);

-- ============================================================================
-- flowb_social_org_members: Team members within a business org
-- ============================================================================

CREATE TABLE IF NOT EXISTS flowb_social_org_members (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          UUID NOT NULL REFERENCES flowb_social_orgs(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL,                  -- FlowB user ID
  role            TEXT DEFAULT 'member',          -- owner, admin, member
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- ============================================================================
-- flowb_social_posts: Posts created through FlowB (FlowB-side record)
-- ============================================================================

CREATE TABLE IF NOT EXISTS flowb_social_posts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          UUID NOT NULL REFERENCES flowb_social_orgs(id),
  user_id         TEXT NOT NULL,                  -- Who created the post
  postiz_post_id  TEXT,                           -- ID from Postiz API
  text            TEXT NOT NULL,
  media_urls      JSONB DEFAULT '[]',
  platforms       TEXT[] NOT NULL,                -- {"twitter", "instagram", "linkedin"}
  status          TEXT DEFAULT 'pending',         -- pending, published, scheduled, failed, cancelled
  scheduled_at    TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  points_awarded  BOOLEAN DEFAULT FALSE,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_org ON flowb_social_posts(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_user ON flowb_social_posts(user_id, created_at DESC);

-- ============================================================================
-- RLS Policies (optional, if using Supabase RLS)
-- ============================================================================

-- For now, all access is through the service key from the backend,
-- so RLS is not strictly needed. Enable later if direct client access is added.
