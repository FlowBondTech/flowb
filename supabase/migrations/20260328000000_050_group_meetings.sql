-- Group Meetings: timezone, reaction tracking, time polls
-- Enables emoji-reaction RSVP in TG groups + time polls for TBD meetings

-- Add timezone to sessions (referenced in code but never migrated)
ALTER TABLE flowb_sessions ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Add group_chat_id to meetings (which TG group the meeting was created in)
ALTER TABLE flowb_meetings ADD COLUMN IF NOT EXISTS group_chat_id BIGINT;

-- Track which TG messages map to meetings (for reaction-based RSVP)
CREATE TABLE IF NOT EXISTS flowb_meeting_group_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  uuid NOT NULL REFERENCES flowb_meetings(id) ON DELETE CASCADE,
  chat_id     BIGINT NOT NULL,
  message_id  BIGINT NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_group_msgs_chat_msg
  ON flowb_meeting_group_messages(chat_id, message_id);

-- Time poll tables
CREATE TABLE IF NOT EXISTS flowb_meeting_polls (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  uuid NOT NULL REFERENCES flowb_meetings(id) ON DELETE CASCADE,
  chat_id     BIGINT NOT NULL,
  message_id  BIGINT,
  creator_id  text NOT NULL,
  title       text NOT NULL,
  deadline    timestamptz,
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','resolved')),
  winning_slot uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flowb_meeting_poll_options (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id     uuid NOT NULL REFERENCES flowb_meeting_polls(id) ON DELETE CASCADE,
  starts_at   timestamptz NOT NULL,
  label       text NOT NULL,
  vote_count  int NOT NULL DEFAULT 0,
  sort_order  int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS flowb_meeting_poll_votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id   uuid NOT NULL REFERENCES flowb_meeting_poll_options(id) ON DELETE CASCADE,
  user_id     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_poll_votes_uniq
  ON flowb_meeting_poll_votes(option_id, user_id);

-- RLS (service_role access)
ALTER TABLE flowb_meeting_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_meeting_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_meeting_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowb_meeting_poll_votes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='flowb_meeting_group_messages' AND policyname='srv') THEN
    CREATE POLICY "srv" ON flowb_meeting_group_messages FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='flowb_meeting_polls' AND policyname='srv') THEN
    CREATE POLICY "srv" ON flowb_meeting_polls FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='flowb_meeting_poll_options' AND policyname='srv') THEN
    CREATE POLICY "srv" ON flowb_meeting_poll_options FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='flowb_meeting_poll_votes' AND policyname='srv') THEN
    CREATE POLICY "srv" ON flowb_meeting_poll_votes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
