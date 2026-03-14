-- Task Lists: interactive checklists in Telegram chats
-- Users create via natural language, toggle items via inline buttons

CREATE TABLE IF NOT EXISTS flowb_tasklists (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id       BIGINT NOT NULL,
  message_id    BIGINT,
  creator_id    TEXT NOT NULL,
  creator_name  TEXT NOT NULL DEFAULT '',
  title         TEXT NOT NULL DEFAULT 'Task List',
  items         JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasklists_chat_id ON flowb_tasklists (chat_id);
CREATE INDEX idx_tasklists_creator_id ON flowb_tasklists (creator_id);
CREATE INDEX idx_tasklists_active ON flowb_tasklists (is_active) WHERE is_active = true;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_tasklists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tasklists_updated_at
  BEFORE UPDATE ON flowb_tasklists
  FOR EACH ROW
  EXECUTE FUNCTION update_tasklists_updated_at();
