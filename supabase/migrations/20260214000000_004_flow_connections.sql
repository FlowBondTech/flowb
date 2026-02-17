-- FlowB Flow System: Connections, Groups, Attendance
-- Personal flow (1:1 friends) + Group flow (crews/squads)
-- Deep links: t.me/Flow_b_bot?start=f_{code} (personal) | ?start=g_{code} (group)

-- ============================================================
-- 1. Personal Connections (mutual 1:1 flow)
-- ============================================================
CREATE TABLE IF NOT EXISTS flowb_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,           -- privy_id of requester
  friend_id TEXT NOT NULL,         -- privy_id of recipient
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | active | muted | blocked
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(user_id, friend_id)
);

-- Fast lookups: all connections for a user (both directions)
CREATE INDEX IF NOT EXISTS idx_connections_user ON flowb_connections (user_id, status);
CREATE INDEX IF NOT EXISTS idx_connections_friend ON flowb_connections (friend_id, status);

-- ============================================================
-- 2. Group Flows (crews, squads, cohorts)
-- ============================================================
CREATE TABLE IF NOT EXISTS flowb_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🔥',
  description TEXT,
  created_by TEXT NOT NULL,        -- privy_id of creator
  join_code TEXT UNIQUE NOT NULL,  -- short code for deep link (g_{join_code})
  join_mode TEXT NOT NULL DEFAULT 'open',  -- open | invite | closed
  max_members INT NOT NULL DEFAULT 50,
  is_temporary BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,          -- auto-archive for event squads
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_groups_join_code ON flowb_groups (join_code);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON flowb_groups (created_by);

-- ============================================================
-- 3. Group Membership
-- ============================================================
CREATE TABLE IF NOT EXISTS flowb_group_members (
  group_id UUID NOT NULL REFERENCES flowb_groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,           -- privy_id
  role TEXT NOT NULL DEFAULT 'member',  -- admin | member
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  muted BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user ON flowb_group_members (user_id);

-- ============================================================
-- 4. Event Attendance (RSVP / schedule sharing)
-- ============================================================
CREATE TABLE IF NOT EXISTS flowb_event_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,           -- privy_id
  event_id TEXT NOT NULL,          -- from DANZ/EGator provider
  event_name TEXT,
  event_date TIMESTAMPTZ,
  event_venue TEXT,
  status TEXT NOT NULL DEFAULT 'going',      -- going | maybe | watched
  visibility TEXT NOT NULL DEFAULT 'friends', -- friends | groups | public | private
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_user ON flowb_event_attendance (user_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_event ON flowb_event_attendance (event_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON flowb_event_attendance (event_date)
  WHERE status IN ('going', 'maybe');

-- ============================================================
-- 5. Notification log (prevent duplicate DMs)
-- ============================================================
CREATE TABLE IF NOT EXISTS flowb_notification_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipient_id TEXT NOT NULL,      -- privy_id of who got notified
  notification_type TEXT NOT NULL,  -- friend_rsvp | crew_rsvp | checkin | crew_broadcast
  reference_id TEXT NOT NULL,       -- event_id or group_id that triggered it
  triggered_by TEXT,                -- privy_id of who caused it
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dedup: don't notify same person about same event+type twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_dedup
  ON flowb_notification_log (recipient_id, notification_type, reference_id, triggered_by);

-- Cleanup old notifications
CREATE INDEX IF NOT EXISTS idx_notification_sent ON flowb_notification_log (sent_at);

-- ============================================================
-- 6. Enable RLS on all tables
-- ============================================================
ALTER TABLE flowb_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_notification_log ENABLE ROW LEVEL SECURITY;

-- Service role (FlowB backend) can do everything
CREATE POLICY "service_all_connections" ON flowb_connections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_groups" ON flowb_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_group_members" ON flowb_group_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_attendance" ON flowb_event_attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_notifications" ON flowb_notification_log FOR ALL USING (true) WITH CHECK (true);
