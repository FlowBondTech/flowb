-- Cu.Flow Code Intelligence Plugin
-- Tables: access control, daily summary cache, feature snapshots, shareable reports

-- Access control (future role gating)
CREATE TABLE IF NOT EXISTS flowb_cuflow_access (
  user_id    TEXT PRIMARY KEY,
  role       TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'contributor', 'admin')),
  granted_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily summary cache (survives server restarts)
CREATE TABLE IF NOT EXISTS flowb_cuflow_daily_summaries (
  date         TEXT NOT NULL,
  repo         TEXT NOT NULL DEFAULT 'FlowBondTech/flowb',
  summary      JSONB NOT NULL,
  commit_count INT NOT NULL DEFAULT 0,
  computed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (date, repo)
);

-- Feature snapshots for trend tracking
CREATE TABLE IF NOT EXISTS flowb_cuflow_feature_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id    TEXT NOT NULL,
  period_type   TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  period_date   TEXT NOT NULL,
  commit_count  INT NOT NULL DEFAULT 0,
  additions     INT NOT NULL DEFAULT 0,
  deletions     INT NOT NULL DEFAULT 0,
  files_changed INT NOT NULL DEFAULT 0,
  contributors  JSONB NOT NULL DEFAULT '[]',
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (feature_id, period_type, period_date)
);

-- Generated reports (shareable via flowb.me/report/{code})
CREATE TABLE IF NOT EXISTS flowb_cuflow_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT UNIQUE NOT NULL,
  report_type  TEXT NOT NULL,
  period       TEXT NOT NULL,
  title        TEXT NOT NULL,
  content_html TEXT NOT NULL,
  content_md   TEXT NOT NULL,
  summary      TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_by   TEXT,
  view_count   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cuflow_reports_code ON flowb_cuflow_reports(code);
CREATE INDEX IF NOT EXISTS idx_cuflow_summaries_date ON flowb_cuflow_daily_summaries(date);
