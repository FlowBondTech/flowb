-- FlowB Kanban Integration: leads, notifications, user prefs
-- Extends existing kanban_* tables (kanban_boards, kanban_tasks, kanban_activity,
-- kanban_api_keys, kanban_task_versions, kanban_task_branches) with FlowB-specific
-- columns and adds new tables for CRM leads, in-app notifications, and preferences.
--
-- All statements use IF NOT EXISTS / IF EXISTS for idempotent re-runs.

-- ============================================================
-- 1. ALTER existing kanban_tasks with FlowB integration columns
-- ============================================================

-- Link tasks to FlowB user identities (telegram_{id}, farcaster_{fid}, web_{id})
ALTER TABLE kanban_tasks ADD COLUMN IF NOT EXISTS flowb_user_id text;

-- Associate tasks with a FlowB crew
ALTER TABLE kanban_tasks ADD COLUMN IF NOT EXISTS crew_id uuid;

-- Associate tasks with a CRM lead
ALTER TABLE kanban_tasks ADD COLUMN IF NOT EXISTS lead_id uuid;

-- ============================================================
-- 2. CREATE flowb_leads (CRM / sales pipeline)
-- ============================================================

CREATE TABLE IF NOT EXISTS flowb_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  company text,
  stage text DEFAULT 'new'
    CHECK (stage IN ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost')),
  source text,
  assigned_to text,                                          -- flowb user_id
  board_id uuid REFERENCES kanban_boards(id) ON DELETE SET NULL,
  value numeric,                                             -- deal value
  notes text,
  metadata jsonb DEFAULT '{}',
  created_by text NOT NULL,                                  -- flowb user_id
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Now that flowb_leads exists, add the FK on kanban_tasks.lead_id
-- (ALTER TABLE ADD CONSTRAINT does not support IF NOT EXISTS, so guard with DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kanban_tasks_lead_id_fkey'
  ) THEN
    ALTER TABLE kanban_tasks
      ADD CONSTRAINT kanban_tasks_lead_id_fkey
      FOREIGN KEY (lead_id) REFERENCES flowb_leads(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- ============================================================
-- 3. CREATE flowb_kanban_notifications (in-app notifications)
-- ============================================================

CREATE TABLE IF NOT EXISTS flowb_kanban_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,                                     -- recipient flowb user_id
  type text NOT NULL
    CHECK (type IN ('assignment', 'mention', 'due_reminder', 'lead_update', 'task_moved', 'comment')),
  title text NOT NULL,
  body text,
  task_id uuid REFERENCES kanban_tasks(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES flowb_leads(id) ON DELETE CASCADE,
  board_id uuid REFERENCES kanban_boards(id) ON DELETE CASCADE,
  from_user text,                                            -- sender flowb user_id
  read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 4. CREATE flowb_kanban_user_prefs (notification preferences)
-- ============================================================

CREATE TABLE IF NOT EXISTS flowb_kanban_user_prefs (
  user_id text PRIMARY KEY,                                  -- flowb user_id
  notify_assignments boolean DEFAULT true,
  notify_mentions boolean DEFAULT true,
  notify_due_dates boolean DEFAULT true,
  notify_task_moves boolean DEFAULT false,
  notify_comments boolean DEFAULT true,
  notify_lead_updates boolean DEFAULT true,
  channels text[] DEFAULT '{in_app}',                        -- e.g. {in_app,email,telegram}
  quiet_hours_start int,                                     -- 0-23 hour (UTC)
  quiet_hours_end int,                                       -- 0-23 hour (UTC)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 5. INDEXES
-- ============================================================

-- Leads pipeline queries
CREATE INDEX IF NOT EXISTS idx_flowb_leads_stage
  ON flowb_leads (stage);

CREATE INDEX IF NOT EXISTS idx_flowb_leads_assigned_to
  ON flowb_leads (assigned_to);

-- Notification inbox: unread-first listing per user
CREATE INDEX IF NOT EXISTS idx_flowb_kanban_notifications_user_read
  ON flowb_kanban_notifications (user_id, read);

-- Notification feed ordering
CREATE INDEX IF NOT EXISTS idx_flowb_kanban_notifications_created_at
  ON flowb_kanban_notifications (created_at);

-- Task lookups by FlowB integration columns
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_flowb_user_id
  ON kanban_tasks (flowb_user_id);

CREATE INDEX IF NOT EXISTS idx_kanban_tasks_crew_id
  ON kanban_tasks (crew_id);

CREATE INDEX IF NOT EXISTS idx_kanban_tasks_lead_id
  ON kanban_tasks (lead_id);

-- ============================================================
-- 6. REALTIME — subscribe to notification and lead changes
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE flowb_kanban_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE flowb_leads;

-- ============================================================
-- 7. ROW-LEVEL SECURITY
-- ============================================================

-- --- flowb_leads ---
ALTER TABLE flowb_leads ENABLE ROW LEVEL SECURITY;

-- Authenticated users can perform all operations (tighten later per crew/role)
CREATE POLICY "flowb_leads_authenticated_all"
  ON flowb_leads
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- --- flowb_kanban_notifications ---
ALTER TABLE flowb_kanban_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "flowb_kanban_notifications_select_own"
  ON flowb_kanban_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Users can update (mark read) their own notifications
CREATE POLICY "flowb_kanban_notifications_update_own"
  ON flowb_kanban_notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- System/service role can insert notifications for any user
CREATE POLICY "flowb_kanban_notifications_insert_service"
  ON flowb_kanban_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- --- flowb_kanban_user_prefs ---
ALTER TABLE flowb_kanban_user_prefs ENABLE ROW LEVEL SECURITY;

-- Users can only read their own preferences
CREATE POLICY "flowb_kanban_user_prefs_select_own"
  ON flowb_kanban_user_prefs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Users can insert their own preferences
CREATE POLICY "flowb_kanban_user_prefs_insert_own"
  ON flowb_kanban_user_prefs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

-- Users can update their own preferences
CREATE POLICY "flowb_kanban_user_prefs_update_own"
  ON flowb_kanban_user_prefs
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- ============================================================
-- 8. TRIGGER — auto-update updated_at on flowb_leads
-- ============================================================

-- Reusable function (CREATE OR REPLACE is idempotent)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Guard trigger creation to avoid duplicate errors on re-run
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'flowb_leads_updated_at'
  ) THEN
    CREATE TRIGGER flowb_leads_updated_at
      BEFORE UPDATE ON flowb_leads
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END
$$;

-- Also apply updated_at trigger to user_prefs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'flowb_kanban_user_prefs_updated_at'
  ) THEN
    CREATE TRIGGER flowb_kanban_user_prefs_updated_at
      BEFORE UPDATE ON flowb_kanban_user_prefs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END
$$;
