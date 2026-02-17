-- Crew chat messages
CREATE TABLE flowb_crew_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID NOT NULL REFERENCES flowb_groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  display_name TEXT,
  message TEXT NOT NULL,
  reply_to UUID REFERENCES flowb_crew_messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_crew_messages_crew ON flowb_crew_messages(crew_id, created_at DESC);
CREATE INDEX idx_crew_messages_user ON flowb_crew_messages(user_id, created_at DESC);
