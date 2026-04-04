-- Activity simulation state persistence
CREATE TABLE IF NOT EXISTS flowb_sim_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- singleton row
  step INTEGER NOT NULL DEFAULT 0,
  crew_id UUID,
  join_code TEXT,
  registered_users JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE flowb_sim_state ENABLE ROW LEVEL SECURITY;
