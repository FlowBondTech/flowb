-- FlowB Todo/Task tracking system
-- Stores project todos queryable via API and bot commands

CREATE TABLE IF NOT EXISTS flowb_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',    -- e.g. signal, social, mobile, infra, security
  priority TEXT DEFAULT 'medium',     -- low, medium, high, critical
  status TEXT DEFAULT 'open',         -- open, in_progress, done, wontfix
  assigned_to TEXT,                   -- user_id or display name
  created_by TEXT,                    -- user_id who created it
  source TEXT DEFAULT 'manual',       -- manual, codebase_scan, bot, api
  file_ref TEXT,                      -- optional file:line reference
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_todos_status ON flowb_todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_category ON flowb_todos(category);
CREATE INDEX IF NOT EXISTS idx_todos_priority ON flowb_todos(priority);
CREATE INDEX IF NOT EXISTS idx_todos_assigned ON flowb_todos(assigned_to);
CREATE INDEX IF NOT EXISTS idx_todos_created ON flowb_todos(created_at DESC);
