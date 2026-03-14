-- Task Lists: Kanban integration + share links
-- Adds share_code and board_id to flowb_tasklists
-- Adds tasklist_id to kanban_tasks for checklist-card linking

-- ============================================================================
-- 1. EXTEND flowb_tasklists
-- ============================================================================

-- Share code for public share links (flowb.me/cl/{code})
ALTER TABLE flowb_tasklists
  ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE;

-- Link to a kanban board for bidirectional sync
ALTER TABLE flowb_tasklists
  ADD COLUMN IF NOT EXISTS board_id TEXT;

-- Index for fast share link lookups
CREATE INDEX IF NOT EXISTS idx_tasklists_share_code
  ON flowb_tasklists (share_code) WHERE share_code IS NOT NULL;

-- ============================================================================
-- 2. EXTEND kanban_tasks
-- ============================================================================

-- Link kanban tasks back to checklist items
ALTER TABLE kanban_tasks
  ADD COLUMN IF NOT EXISTS tasklist_id UUID;

-- Add FK constraint (guarded)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kanban_tasks_tasklist_id_fkey'
  ) THEN
    ALTER TABLE kanban_tasks
      ADD CONSTRAINT kanban_tasks_tasklist_id_fkey
      FOREIGN KEY (tasklist_id) REFERENCES flowb_tasklists(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- Index for looking up kanban tasks by checklist
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_tasklist_id
  ON kanban_tasks (tasklist_id) WHERE tasklist_id IS NOT NULL;
