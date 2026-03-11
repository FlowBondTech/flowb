-- 036: Create flowb_todos table
-- Used by /todo bot command, API endpoints, and kanban sync (migration 030)

CREATE TABLE IF NOT EXISTS flowb_todos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  text        TEXT,           -- alias used by kanban sync
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'done', 'wontfix')),
  priority    TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  category    TEXT DEFAULT 'general',
  assigned_to TEXT,           -- user_id or display name
  created_by  TEXT NOT NULL,  -- user_id who created
  user_id     TEXT,           -- owner (used by kanban sync)
  source      TEXT DEFAULT 'api',  -- bot, api, kanban, signal, whatsapp
  file_ref    TEXT,           -- optional file/doc reference
  due_date    TEXT,           -- used by kanban sync
  completed_at TIMESTAMPTZ,
  kanban_task_id TEXT,        -- cross-ref for kanban sync (migration 030)
  sync_source TEXT DEFAULT 'todo',  -- prevents infinite sync loops
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_flowb_todos_status ON flowb_todos (status);
CREATE INDEX IF NOT EXISTS idx_flowb_todos_created_by ON flowb_todos (created_by);
CREATE INDEX IF NOT EXISTS idx_flowb_todos_assigned_to ON flowb_todos (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_flowb_todos_priority ON flowb_todos (priority);

-- Unique index for kanban sync (also referenced in migration 030)
CREATE UNIQUE INDEX IF NOT EXISTS idx_flowb_todos_kanban_task_id
  ON flowb_todos (kanban_task_id) WHERE kanban_task_id IS NOT NULL;

-- RLS
ALTER TABLE flowb_todos ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on flowb_todos"
  ON flowb_todos FOR ALL
  USING (true)
  WITH CHECK (true);
