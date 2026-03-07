-- ============================================================================
-- 024: Meetings Engine
-- Tables: flowb_meetings, flowb_meeting_attendees, flowb_meeting_messages
-- ============================================================================

-- Meetings
CREATE TABLE IF NOT EXISTS flowb_meetings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id    text NOT NULL,
  title         text NOT NULL,
  description   text,
  starts_at     timestamptz NOT NULL,
  duration_min  int NOT NULL DEFAULT 30,
  location      text,
  meeting_type  text NOT NULL DEFAULT 'coffee' CHECK (meeting_type IN ('coffee','call','lunch','workshop','demo','other')),
  status        text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  share_code    text NOT NULL UNIQUE,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_meetings_creator ON flowb_meetings(creator_id);
CREATE INDEX idx_meetings_starts_at ON flowb_meetings(starts_at);
CREATE INDEX idx_meetings_status ON flowb_meetings(status);
CREATE INDEX idx_meetings_share_code ON flowb_meetings(share_code);

-- Attendees
CREATE TABLE IF NOT EXISTS flowb_meeting_attendees (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id    uuid NOT NULL REFERENCES flowb_meetings(id) ON DELETE CASCADE,
  user_id       text,
  name          text,
  email         text,
  rsvp_status   text NOT NULL DEFAULT 'invited' CHECK (rsvp_status IN ('invited','accepted','declined','maybe')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_meeting_attendees_meeting ON flowb_meeting_attendees(meeting_id);
CREATE INDEX idx_meeting_attendees_user ON flowb_meeting_attendees(user_id);
CREATE UNIQUE INDEX idx_meeting_attendees_unique ON flowb_meeting_attendees(meeting_id, user_id) WHERE user_id IS NOT NULL;

-- Messages (meeting chat)
CREATE TABLE IF NOT EXISTS flowb_meeting_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id    uuid NOT NULL REFERENCES flowb_meetings(id) ON DELETE CASCADE,
  user_id       text NOT NULL,
  display_name  text,
  message       text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_meeting_messages_meeting ON flowb_meeting_messages(meeting_id);
CREATE INDEX idx_meeting_messages_created ON flowb_meeting_messages(created_at);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_meeting_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_meetings_updated_at
  BEFORE UPDATE ON flowb_meetings
  FOR EACH ROW EXECUTE FUNCTION update_meeting_updated_at();

-- RLS
ALTER TABLE flowb_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_meeting_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_meetings" ON flowb_meetings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_meeting_attendees" ON flowb_meeting_attendees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_meeting_messages" ON flowb_meeting_messages FOR ALL USING (true) WITH CHECK (true);
