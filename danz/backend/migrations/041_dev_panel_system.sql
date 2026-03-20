-- Migration: Dev Panel System
-- Date: 2025-12-02
-- Description: Creates tables for dev panel including feature requests, dev tasks, changelog, and system health

-- ================================================
-- 1. Add 'dev' role to UserRole enum
-- ================================================

-- First check if 'dev' already exists in the constraint
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

  -- Add new constraint with dev role included
  ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('user', 'organizer', 'manager', 'dev', 'admin'));
END $$;

-- ================================================
-- 2. Feature Requests Table
-- ================================================

CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,

  category VARCHAR(50) NOT NULL DEFAULT 'enhancement'
    CHECK (category IN ('enhancement', 'bug', 'performance', 'security', 'ux', 'integration')),

  status VARCHAR(30) NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'under_review', 'planned', 'in_progress', 'testing', 'completed', 'rejected', 'deferred')),

  priority VARCHAR(20) DEFAULT 'medium'
    CHECK (priority IN ('critical', 'high', 'medium', 'low', 'nice_to_have')),

  votes INT DEFAULT 0,

  -- Requester info (use privy_id to match users table)
  requested_by VARCHAR(100) REFERENCES users(privy_id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),

  -- Assignment
  assigned_to VARCHAR(100) REFERENCES users(privy_id),
  assigned_at TIMESTAMPTZ,

  -- Progress tracking
  estimated_hours INT,
  actual_hours INT,
  target_version VARCHAR(20),
  completed_at TIMESTAMPTZ,

  -- Metadata
  github_issue_url VARCHAR(500),
  github_pr_url VARCHAR(500),
  tags TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for feature_requests
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_priority ON feature_requests(priority);
CREATE INDEX IF NOT EXISTS idx_feature_requests_requested_by ON feature_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_feature_requests_votes ON feature_requests(votes DESC);
CREATE INDEX IF NOT EXISTS idx_feature_requests_created_at ON feature_requests(created_at DESC);

-- ================================================
-- 3. Feature Request Votes Table
-- ================================================

CREATE TABLE IF NOT EXISTS feature_request_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  user_id VARCHAR(100) NOT NULL REFERENCES users(privy_id),
  vote_type VARCHAR(10) DEFAULT 'up' CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(feature_request_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_feature_votes_request ON feature_request_votes(feature_request_id);
CREATE INDEX IF NOT EXISTS idx_feature_votes_user ON feature_request_votes(user_id);

-- ================================================
-- 4. Feature Request Comments Table
-- ================================================

CREATE TABLE IF NOT EXISTS feature_request_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  user_id VARCHAR(100) NOT NULL REFERENCES users(privy_id),
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_comments_request ON feature_request_comments(feature_request_id);
CREATE INDEX IF NOT EXISTS idx_feature_comments_user ON feature_request_comments(user_id);

-- ================================================
-- 5. Dev Tasks Table
-- ================================================

CREATE TABLE IF NOT EXISTS dev_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,

  task_type VARCHAR(30) NOT NULL DEFAULT 'task'
    CHECK (task_type IN ('task', 'bug', 'tech_debt', 'hotfix', 'research', 'documentation')),

  status VARCHAR(30) NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'review', 'testing', 'done', 'blocked')),

  priority VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('critical', 'high', 'medium', 'low')),

  -- Assignment
  assigned_to VARCHAR(100) REFERENCES users(privy_id),
  created_by VARCHAR(100) NOT NULL REFERENCES users(privy_id),

  -- Timing
  due_date DATE,
  estimated_hours INT,
  actual_hours INT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Linking
  feature_request_id UUID REFERENCES feature_requests(id) ON DELETE SET NULL,
  parent_task_id UUID REFERENCES dev_tasks(id) ON DELETE SET NULL,
  github_issue_url VARCHAR(500),
  github_pr_url VARCHAR(500),

  -- Metadata
  tags TEXT[],
  sprint VARCHAR(50),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for dev_tasks
CREATE INDEX IF NOT EXISTS idx_dev_tasks_status ON dev_tasks(status);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_priority ON dev_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_assigned_to ON dev_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_created_by ON dev_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_sprint ON dev_tasks(sprint);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_feature_request ON dev_tasks(feature_request_id);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_parent ON dev_tasks(parent_task_id);

-- ================================================
-- 6. Changelog Entries Table
-- ================================================

CREATE TABLE IF NOT EXISTS changelog_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(20) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,

  category VARCHAR(30) NOT NULL DEFAULT 'feature'
    CHECK (category IN ('feature', 'fix', 'improvement', 'breaking', 'security', 'performance', 'deprecation')),

  -- Linking
  feature_request_id UUID REFERENCES feature_requests(id) ON DELETE SET NULL,
  github_pr_url VARCHAR(500),
  github_commit_sha VARCHAR(40),

  -- Visibility
  is_public BOOLEAN DEFAULT true,
  is_highlighted BOOLEAN DEFAULT false,

  -- Author
  created_by VARCHAR(100) REFERENCES users(privy_id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for changelog_entries
CREATE INDEX IF NOT EXISTS idx_changelog_version ON changelog_entries(version);
CREATE INDEX IF NOT EXISTS idx_changelog_category ON changelog_entries(category);
CREATE INDEX IF NOT EXISTS idx_changelog_created_at ON changelog_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_changelog_public ON changelog_entries(is_public);

-- ================================================
-- 7. System Health Logs Table
-- ================================================

CREATE TABLE IF NOT EXISTS system_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  service VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),

  response_time_ms INT,
  error_message TEXT,
  metadata JSONB,

  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for system_health_logs
CREATE INDEX IF NOT EXISTS idx_health_logs_service ON system_health_logs(service);
CREATE INDEX IF NOT EXISTS idx_health_logs_checked_at ON system_health_logs(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_logs_status ON system_health_logs(status);

-- ================================================
-- 8. GitHub Cache Table
-- ================================================

CREATE TABLE IF NOT EXISTS github_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(200) UNIQUE NOT NULL,
  data JSONB NOT NULL,
  etag VARCHAR(100),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_github_cache_key ON github_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_github_cache_expires ON github_cache(expires_at);

-- ================================================
-- 9. Updated_at Triggers
-- ================================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_feature_requests_updated_at ON feature_requests;
CREATE TRIGGER update_feature_requests_updated_at
  BEFORE UPDATE ON feature_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feature_request_comments_updated_at ON feature_request_comments;
CREATE TRIGGER update_feature_request_comments_updated_at
  BEFORE UPDATE ON feature_request_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dev_tasks_updated_at ON dev_tasks;
CREATE TRIGGER update_dev_tasks_updated_at
  BEFORE UPDATE ON dev_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_changelog_entries_updated_at ON changelog_entries;
CREATE TRIGGER update_changelog_entries_updated_at
  BEFORE UPDATE ON changelog_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_github_cache_updated_at ON github_cache;
CREATE TRIGGER update_github_cache_updated_at
  BEFORE UPDATE ON github_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 10. Vote Count Trigger
-- ================================================

-- Function to update vote count on feature_requests
CREATE OR REPLACE FUNCTION update_feature_request_votes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feature_requests
    SET votes = votes + CASE WHEN NEW.vote_type = 'up' THEN 1 ELSE -1 END
    WHERE id = NEW.feature_request_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feature_requests
    SET votes = votes - CASE WHEN OLD.vote_type = 'up' THEN 1 ELSE -1 END
    WHERE id = OLD.feature_request_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.vote_type != NEW.vote_type THEN
    UPDATE feature_requests
    SET votes = votes + CASE WHEN NEW.vote_type = 'up' THEN 2 ELSE -2 END
    WHERE id = NEW.feature_request_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_feature_votes ON feature_request_votes;
CREATE TRIGGER trigger_update_feature_votes
  AFTER INSERT OR UPDATE OR DELETE ON feature_request_votes
  FOR EACH ROW EXECUTE FUNCTION update_feature_request_votes();

-- ================================================
-- 11. Row Level Security
-- ================================================

-- Enable RLS
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_request_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE changelog_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_cache ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "service_role_feature_requests" ON feature_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_feature_request_votes" ON feature_request_votes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_feature_request_comments" ON feature_request_comments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_dev_tasks" ON dev_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_changelog_entries" ON changelog_entries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_system_health_logs" ON system_health_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_github_cache" ON github_cache FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================================
-- 12. Initial Changelog Entry
-- ================================================

INSERT INTO changelog_entries (version, title, description, category, is_public, is_highlighted)
VALUES
  ('2.4.0', 'Dev Panel Launch', 'Introducing the developer panel with feature request tracking, task management, and GitHub integration.', 'feature', true, true),
  ('2.4.0', 'Feature Request System', 'Users can now submit and vote on feature requests. Developers can track and manage requests.', 'feature', true, false),
  ('2.4.0', 'Changelog System', 'New changelog system to track all platform updates and improvements.', 'feature', true, false)
ON CONFLICT DO NOTHING;

-- ================================================
-- Done!
-- ================================================

COMMENT ON TABLE feature_requests IS 'User-submitted feature requests with voting and tracking';
COMMENT ON TABLE dev_tasks IS 'Internal development tasks linked to feature requests';
COMMENT ON TABLE changelog_entries IS 'Version changelog entries for platform updates';
COMMENT ON TABLE system_health_logs IS 'System health monitoring logs';
COMMENT ON TABLE github_cache IS 'Cache for GitHub API responses';
