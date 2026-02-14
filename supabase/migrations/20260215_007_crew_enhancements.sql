-- Crew Enhancements: creator role, public discovery, approval flow, tracked invites
-- Evolves crews from simple open-join groups to full creator/admin/member hierarchy.

-- ============================================================
-- 1. Add is_public column to flowb_groups (discoverable in browse)
-- ============================================================
ALTER TABLE flowb_groups ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_groups_public ON flowb_groups (is_public) WHERE is_public = true;

-- ============================================================
-- 2. Expand role options in flowb_group_members to include 'creator'
--    (Postgres TEXT column, no enum to alter - just backfill)
-- ============================================================

-- Backfill: set existing created_by users to 'creator' role
UPDATE flowb_group_members gm
SET role = 'creator'
FROM flowb_groups g
WHERE gm.group_id = g.id
  AND gm.user_id = g.created_by
  AND gm.role = 'admin';

-- ============================================================
-- 3. Join Requests (approval-mode crews)
-- ============================================================
CREATE TABLE IF NOT EXISTS flowb_crew_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES flowb_groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | denied
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ
);

-- Only one pending request per user per crew
CREATE UNIQUE INDEX IF NOT EXISTS idx_join_requests_pending
  ON flowb_crew_join_requests (group_id, user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_join_requests_group ON flowb_crew_join_requests (group_id, status);
CREATE INDEX IF NOT EXISTS idx_join_requests_user ON flowb_crew_join_requests (user_id, status);

-- ============================================================
-- 4. Personal Tracked Invites (referral attribution per member)
-- ============================================================
CREATE TABLE IF NOT EXISTS flowb_crew_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES flowb_groups(id) ON DELETE CASCADE,
  inviter_id TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  uses INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crew_invites_code ON flowb_crew_invites (invite_code);
CREATE INDEX IF NOT EXISTS idx_crew_invites_inviter ON flowb_crew_invites (inviter_id, group_id);

-- ============================================================
-- 5. RLS
-- ============================================================
ALTER TABLE flowb_crew_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_crew_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_all_join_requests" ON flowb_crew_join_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_crew_invites" ON flowb_crew_invites FOR ALL USING (true) WITH CHECK (true);
