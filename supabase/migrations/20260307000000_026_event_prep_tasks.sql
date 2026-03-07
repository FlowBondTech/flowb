-- Pre-Event Prep Tasks
-- Tracks planning/logistic tasks tied to scheduled events.
-- Examples: "Pick up Sarah", "Bring snacks", "Charge battery pack"
-- Used by context-notifications to send smart reminders before events.

-- ============================================================
-- 1. Event Prep Tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS flowb_event_prep_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  event_source_id TEXT,                -- links to flowb_schedules.event_source_id
  event_title TEXT,                    -- denormalized for quick display
  task_text TEXT NOT NULL,             -- "Pick up Sarah from hotel"
  task_type TEXT NOT NULL DEFAULT 'custom', -- pickup_person | pickup_item | bring_item | errand | custom
  due_offset_minutes INTEGER NOT NULL DEFAULT 60, -- how many minutes before event to remind
  location TEXT,                       -- optional: address/place for the task
  contact_name TEXT,                   -- optional: person involved (e.g., who to pick up)
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  notified BOOLEAN NOT NULL DEFAULT false,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_source_id, task_text)
);

CREATE INDEX IF NOT EXISTS idx_prep_tasks_user_event
  ON flowb_event_prep_tasks (user_id, event_source_id);
CREATE INDEX IF NOT EXISTS idx_prep_tasks_pending
  ON flowb_event_prep_tasks (notified, completed)
  WHERE notified = false AND completed = false;

-- ============================================================
-- 2. Extend flowb_sessions with prep task notification pref
-- ============================================================
ALTER TABLE flowb_sessions
  ADD COLUMN IF NOT EXISTS notify_prep_tasks BOOLEAN DEFAULT true;

-- ============================================================
-- 3. RLS + service policy
-- ============================================================
ALTER TABLE flowb_event_prep_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all_event_prep_tasks" ON flowb_event_prep_tasks FOR ALL USING (true) WITH CHECK (true);
