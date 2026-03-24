-- 044: Doc access gate + view tracking
-- Tables for magic-link gated technical documentation at flowb.me/tech

-- ============================================================================
-- flowb_doc_access: stores email access requests + magic link tokens
-- ============================================================================

CREATE TABLE IF NOT EXISTS flowb_doc_access (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  token       text UNIQUE NOT NULL,
  token_used  boolean NOT NULL DEFAULT false,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  expires_at  timestamptz NOT NULL
);

CREATE INDEX idx_doc_access_email      ON flowb_doc_access (email);
CREATE INDEX idx_doc_access_token      ON flowb_doc_access (token);
CREATE INDEX idx_doc_access_created_at ON flowb_doc_access (created_at DESC);

ALTER TABLE flowb_doc_access ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- flowb_doc_views: tracks which doc sections each viewer reads
-- ============================================================================

CREATE TABLE IF NOT EXISTS flowb_doc_views (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_id uuid REFERENCES flowb_doc_access(id) ON DELETE CASCADE,
  email     text NOT NULL,
  section   text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_doc_views_access_id ON flowb_doc_views (access_id);
CREATE INDEX idx_doc_views_email     ON flowb_doc_views (email);

ALTER TABLE flowb_doc_views ENABLE ROW LEVEL SECURITY;
