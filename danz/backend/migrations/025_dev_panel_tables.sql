-- Migration: Create Dev Panel Tables
-- Date: 2026-01-01
-- Description: Creates all tables needed for the dev panel functionality

-- ==================== FEATURE REQUESTS ====================

CREATE TABLE IF NOT EXISTS public.feature_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'enhancement',
    status VARCHAR(50) NOT NULL DEFAULT 'requested',
    priority VARCHAR(50) DEFAULT 'medium',
    votes INTEGER NOT NULL DEFAULT 0,

    requested_by VARCHAR(255) REFERENCES public.users(privy_id) ON DELETE SET NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_to VARCHAR(255) REFERENCES public.users(privy_id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,

    estimated_hours INTEGER,
    actual_hours INTEGER,
    target_version VARCHAR(50),
    completed_at TIMESTAMPTZ,

    github_issue_url TEXT,
    github_pr_url TEXT,
    tags TEXT[],

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Feature request votes
CREATE TABLE IF NOT EXISTS public.feature_request_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_request_id UUID NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    vote_type VARCHAR(10) NOT NULL DEFAULT 'up',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(feature_request_id, user_id)
);

-- Feature request comments
CREATE TABLE IF NOT EXISTS public.feature_request_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_request_id UUID NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to update votes count
CREATE OR REPLACE FUNCTION update_feature_request_votes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.feature_requests
        SET votes = votes + CASE WHEN NEW.vote_type = 'up' THEN 1 ELSE -1 END,
            updated_at = NOW()
        WHERE id = NEW.feature_request_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.feature_requests
        SET votes = votes - CASE WHEN OLD.vote_type = 'up' THEN 1 ELSE -1 END,
            updated_at = NOW()
        WHERE id = OLD.feature_request_id;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.feature_requests
        SET votes = votes
            - CASE WHEN OLD.vote_type = 'up' THEN 1 ELSE -1 END
            + CASE WHEN NEW.vote_type = 'up' THEN 1 ELSE -1 END,
            updated_at = NOW()
        WHERE id = NEW.feature_request_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_feature_request_votes ON public.feature_request_votes;
CREATE TRIGGER trigger_update_feature_request_votes
AFTER INSERT OR UPDATE OR DELETE ON public.feature_request_votes
FOR EACH ROW EXECUTE FUNCTION update_feature_request_votes();

-- ==================== DEV TASKS ====================

CREATE TABLE IF NOT EXISTS public.dev_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL DEFAULT 'task',
    status VARCHAR(50) NOT NULL DEFAULT 'todo',
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',

    assigned_to VARCHAR(255) REFERENCES public.users(privy_id) ON DELETE SET NULL,
    created_by VARCHAR(255) REFERENCES public.users(privy_id) ON DELETE SET NULL,

    due_date DATE,
    estimated_hours INTEGER,
    actual_hours INTEGER,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    feature_request_id UUID REFERENCES public.feature_requests(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES public.dev_tasks(id) ON DELETE SET NULL,

    github_issue_url TEXT,
    github_pr_url TEXT,
    tags TEXT[],
    sprint VARCHAR(50),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== CHANGELOG ENTRIES ====================

CREATE TABLE IF NOT EXISTS public.changelog_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'feature',

    feature_request_id UUID REFERENCES public.feature_requests(id) ON DELETE SET NULL,
    github_pr_url TEXT,
    github_commit_sha VARCHAR(50),

    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    is_highlighted BOOLEAN NOT NULL DEFAULT FALSE,

    created_by VARCHAR(255) REFERENCES public.users(privy_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== FEATURE INVENTORY ====================

CREATE TABLE IF NOT EXISTS public.feature_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'not_started',
    completion_percentage INTEGER NOT NULL DEFAULT 0,
    priority VARCHAR(50) DEFAULT 'medium',

    backend_status VARCHAR(50) NOT NULL DEFAULT 'not_started',
    frontend_status VARCHAR(50) NOT NULL DEFAULT 'not_started',
    database_status VARCHAR(50) NOT NULL DEFAULT 'not_started',

    api_docs_url TEXT,
    related_files TEXT[],
    dependencies TEXT[],
    notes TEXT,

    is_miniapp_ready BOOLEAN NOT NULL DEFAULT FALSE,
    miniapp_api_available BOOLEAN NOT NULL DEFAULT FALSE,

    estimated_hours INTEGER,
    actual_hours INTEGER,
    target_version VARCHAR(50),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== DEV ALERTS ====================

CREATE TABLE IF NOT EXISTS public.dev_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    alert_type VARCHAR(50) NOT NULL DEFAULT 'info',
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    priority VARCHAR(50) NOT NULL DEFAULT 'normal',

    target_roles TEXT[],
    target_users TEXT[],

    is_actionable BOOLEAN NOT NULL DEFAULT FALSE,
    action_url TEXT,
    action_label VARCHAR(100),

    expires_at TIMESTAMPTZ,

    source_type VARCHAR(50),
    source_id VARCHAR(255),
    metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dev alert read tracking
CREATE TABLE IF NOT EXISTS public.dev_alert_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES public.dev_alerts(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dismissed_at TIMESTAMPTZ,
    UNIQUE(alert_id, user_id)
);

-- ==================== GITHUB CACHE ====================

CREATE TABLE IF NOT EXISTS public.github_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== INDEXES ====================

-- Feature requests indexes
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON public.feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_category ON public.feature_requests(category);
CREATE INDEX IF NOT EXISTS idx_feature_requests_requested_by ON public.feature_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_feature_requests_votes ON public.feature_requests(votes DESC);

-- Feature request votes indexes
CREATE INDEX IF NOT EXISTS idx_feature_request_votes_feature ON public.feature_request_votes(feature_request_id);
CREATE INDEX IF NOT EXISTS idx_feature_request_votes_user ON public.feature_request_votes(user_id);

-- Dev tasks indexes
CREATE INDEX IF NOT EXISTS idx_dev_tasks_status ON public.dev_tasks(status);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_assigned_to ON public.dev_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_sprint ON public.dev_tasks(sprint);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_priority ON public.dev_tasks(priority);

-- Changelog indexes
CREATE INDEX IF NOT EXISTS idx_changelog_entries_version ON public.changelog_entries(version);
CREATE INDEX IF NOT EXISTS idx_changelog_entries_is_public ON public.changelog_entries(is_public);
CREATE INDEX IF NOT EXISTS idx_changelog_entries_created_at ON public.changelog_entries(created_at DESC);

-- Feature inventory indexes
CREATE INDEX IF NOT EXISTS idx_feature_inventory_category ON public.feature_inventory(category);
CREATE INDEX IF NOT EXISTS idx_feature_inventory_status ON public.feature_inventory(status);
CREATE INDEX IF NOT EXISTS idx_feature_inventory_miniapp_ready ON public.feature_inventory(is_miniapp_ready);

-- Dev alerts indexes
CREATE INDEX IF NOT EXISTS idx_dev_alerts_type ON public.dev_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_dev_alerts_priority ON public.dev_alerts(priority);
CREATE INDEX IF NOT EXISTS idx_dev_alerts_expires ON public.dev_alerts(expires_at);
CREATE INDEX IF NOT EXISTS idx_dev_alerts_created ON public.dev_alerts(created_at DESC);

-- Dev alert reads indexes
CREATE INDEX IF NOT EXISTS idx_dev_alert_reads_user ON public.dev_alert_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_dev_alert_reads_alert ON public.dev_alert_reads(alert_id);

-- GitHub cache indexes
CREATE INDEX IF NOT EXISTS idx_github_cache_expires ON public.github_cache(expires_at);

-- ==================== RLS POLICIES ====================

-- Enable RLS
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_request_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dev_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dev_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dev_alert_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_cache ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (backend uses service role)
CREATE POLICY "Service role has full access to feature_requests" ON public.feature_requests
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to feature_request_votes" ON public.feature_request_votes
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to feature_request_comments" ON public.feature_request_comments
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to dev_tasks" ON public.dev_tasks
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to changelog_entries" ON public.changelog_entries
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to feature_inventory" ON public.feature_inventory
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to dev_alerts" ON public.dev_alerts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to dev_alert_reads" ON public.dev_alert_reads
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to github_cache" ON public.github_cache
    FOR ALL USING (auth.role() = 'service_role');

-- ==================== UPDATED_AT TRIGGERS ====================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_feature_requests_updated_at ON public.feature_requests;
CREATE TRIGGER trigger_feature_requests_updated_at
    BEFORE UPDATE ON public.feature_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_dev_tasks_updated_at ON public.dev_tasks;
CREATE TRIGGER trigger_dev_tasks_updated_at
    BEFORE UPDATE ON public.dev_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_feature_inventory_updated_at ON public.feature_inventory;
CREATE TRIGGER trigger_feature_inventory_updated_at
    BEFORE UPDATE ON public.feature_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
