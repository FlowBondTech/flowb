-- Migration: Add role/bio tags to sessions and connection notes/tags/contact sharing
-- Part of the connections enrichment feature

-- =============================================================================
-- 1. Enrich user profiles in flowb_sessions
-- =============================================================================

ALTER TABLE flowb_sessions
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

COMMENT ON COLUMN flowb_sessions.bio IS 'User bio / short description';
COMMENT ON COLUMN flowb_sessions.role IS 'User role label (e.g. developer, designer, investor)';
COMMENT ON COLUMN flowb_sessions.tags IS 'User self-assigned tags for discovery';

-- =============================================================================
-- 2. Enrich connections with notes, tags, and contact sharing
-- =============================================================================

ALTER TABLE flowb_connections
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contact_shared BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_info JSONB;

COMMENT ON COLUMN flowb_connections.note IS 'Personal note about this connection (e.g. met at hackathon)';
COMMENT ON COLUMN flowb_connections.tags IS 'Tags for this connection (e.g. designer, investor, met-at-ethdenver)';
COMMENT ON COLUMN flowb_connections.contact_shared IS 'Whether contact info has been shared with this friend';
COMMENT ON COLUMN flowb_connections.contact_info IS 'Shared contact details (email, twitter, telegram, etc.)';

-- =============================================================================
-- 3. Index for tag-based lookups
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_flowb_sessions_tags ON flowb_sessions USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_flowb_connections_tags ON flowb_connections USING GIN (tags);
