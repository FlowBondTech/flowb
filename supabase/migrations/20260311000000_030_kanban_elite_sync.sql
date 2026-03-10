-- 030: Bidirectional sync between kanban_tasks and flowb_todos
-- Adds cross-reference columns and triggers for automatic sync

-- ─── Cross-reference columns ────────────────────────────────────────────────

ALTER TABLE kanban_tasks
  ADD COLUMN IF NOT EXISTS todo_id UUID,
  ADD COLUMN IF NOT EXISTS sync_source TEXT DEFAULT 'kanban';

ALTER TABLE flowb_todos
  ADD COLUMN IF NOT EXISTS kanban_task_id TEXT,
  ADD COLUMN IF NOT EXISTS sync_source TEXT DEFAULT 'todo';

-- Unique constraint on flowb_todos(kanban_task_id) for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS idx_flowb_todos_kanban_task_id
  ON flowb_todos (kanban_task_id) WHERE kanban_task_id IS NOT NULL;

-- Index on kanban_tasks(todo_id)
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_todo_id
  ON kanban_tasks (todo_id) WHERE todo_id IS NOT NULL;

-- ─── Status mapping helpers ─────────────────────────────────────────────────

-- kanban column_name → todo status
CREATE OR REPLACE FUNCTION kanban_column_to_todo_status(col TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE col
    WHEN 'backlog'     THEN 'open'
    WHEN 'todo'        THEN 'open'
    WHEN 'in-progress' THEN 'in_progress'
    WHEN 'done'        THEN 'done'
    ELSE 'open'
  END;
$$;

-- todo status → kanban column_name
CREATE OR REPLACE FUNCTION todo_status_to_kanban_column(st TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE st
    WHEN 'open'        THEN 'todo'
    WHEN 'in_progress' THEN 'in-progress'
    WHEN 'done'        THEN 'done'
    WHEN 'wontfix'     THEN 'done'
    ELSE 'todo'
  END;
$$;

-- ─── kanban_tasks → flowb_todos sync trigger ────────────────────────────────

CREATE OR REPLACE FUNCTION sync_kanban_to_todos()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Skip if this change came from the todo side (prevent infinite loop)
  IF NEW.sync_source = 'todo' THEN
    RETURN NEW;
  END IF;

  -- Upsert into flowb_todos
  INSERT INTO flowb_todos (
    id,
    user_id,
    text,
    description,
    status,
    priority,
    due_date,
    kanban_task_id,
    sync_source,
    created_at,
    updated_at
  ) VALUES (
    COALESCE(NEW.todo_id, gen_random_uuid()),
    COALESCE(NEW.created_by, 'system'),
    NEW.title,
    NEW.description,
    kanban_column_to_todo_status(NEW.column_name),
    NEW.priority,
    NEW.due_date::TIMESTAMPTZ,
    NEW.id,
    'kanban',
    NOW(),
    NOW()
  )
  ON CONFLICT (kanban_task_id) DO UPDATE SET
    text        = EXCLUDED.text,
    description = EXCLUDED.description,
    status      = EXCLUDED.status,
    priority    = EXCLUDED.priority,
    due_date    = EXCLUDED.due_date,
    sync_source = 'kanban',
    updated_at  = NOW();

  -- If we just created the todo, backfill the todo_id on kanban_tasks
  IF NEW.todo_id IS NULL THEN
    UPDATE kanban_tasks
      SET todo_id = (
        SELECT id FROM flowb_todos WHERE kanban_task_id = NEW.id LIMIT 1
      ),
      sync_source = 'kanban'
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_kanban_to_todos ON kanban_tasks;
CREATE TRIGGER trg_sync_kanban_to_todos
  AFTER INSERT OR UPDATE ON kanban_tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_kanban_to_todos();

-- ─── flowb_todos → kanban_tasks sync trigger ────────────────────────────────

CREATE OR REPLACE FUNCTION sync_todos_to_kanban()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_board_id TEXT;
  v_max_pos  INT;
BEGIN
  -- Skip if this change came from the kanban side (prevent infinite loop)
  IF NEW.sync_source = 'kanban' THEN
    RETURN NEW;
  END IF;

  -- Only sync if the todo already has a kanban_task_id link
  -- (we don't auto-create kanban tasks for every todo — only linked ones)
  IF NEW.kanban_task_id IS NOT NULL THEN
    UPDATE kanban_tasks SET
      title       = NEW.text,
      description = COALESCE(NEW.description, ''),
      column_name = todo_status_to_kanban_column(NEW.status),
      priority    = COALESCE(NEW.priority, 'medium'),
      due_date    = NEW.due_date::TEXT,
      sync_source = 'todo',
      updated_at  = NOW()
    WHERE id = NEW.kanban_task_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_todos_to_kanban ON flowb_todos;
CREATE TRIGGER trg_sync_todos_to_kanban
  AFTER INSERT OR UPDATE ON flowb_todos
  FOR EACH ROW
  EXECUTE FUNCTION sync_todos_to_kanban();

-- ─── kanban_tasks DELETE → flowb_todos status='wontfix' ─────────────────────

CREATE OR REPLACE FUNCTION sync_kanban_delete_to_todos()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.todo_id IS NOT NULL THEN
    UPDATE flowb_todos SET
      status      = 'wontfix',
      sync_source = 'kanban',
      updated_at  = NOW()
    WHERE id = OLD.todo_id;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_kanban_delete_to_todos ON kanban_tasks;
CREATE TRIGGER trg_sync_kanban_delete_to_todos
  AFTER DELETE ON kanban_tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_kanban_delete_to_todos();
