-- Migration: Add Projects Table for Multi-Project Tracking
-- Date: 2026-01-01
-- Description: Creates projects table and links dev tables to projects

-- ==================== PROJECTS TABLE ====================

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,

    -- Repository info
    github_repo VARCHAR(255),
    github_org VARCHAR(100) DEFAULT 'FlowBondTech',
    default_branch VARCHAR(50) DEFAULT 'main',

    -- Project type
    project_type VARCHAR(50) NOT NULL DEFAULT 'app',  -- app, backend, library, docs
    platform VARCHAR(50),  -- web, mobile, telegram, api, admin

    -- Tech stack
    tech_stack TEXT[],  -- ['react-native', 'expo', 'typescript']

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,

    -- Display
    color VARCHAR(20),  -- hex color for UI
    icon VARCHAR(50),   -- icon name
    display_order INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== ADD PROJECT_ID TO DEV TABLES ====================

-- Add project_id to feature_requests
ALTER TABLE public.feature_requests
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add project_id to dev_tasks
ALTER TABLE public.dev_tasks
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add project_id to changelog_entries
ALTER TABLE public.changelog_entries
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add project_id to feature_inventory
ALTER TABLE public.feature_inventory
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add project_id to dev_alerts
ALTER TABLE public.dev_alerts
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- ==================== INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_type ON public.projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_active ON public.projects(is_active);

CREATE INDEX IF NOT EXISTS idx_feature_requests_project ON public.feature_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_project ON public.dev_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_changelog_entries_project ON public.changelog_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_feature_inventory_project ON public.feature_inventory(project_id);
CREATE INDEX IF NOT EXISTS idx_dev_alerts_project ON public.dev_alerts(project_id);

-- ==================== RLS ====================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to projects" ON public.projects
    FOR ALL USING (auth.role() = 'service_role');

-- ==================== TRIGGERS ====================

DROP TRIGGER IF EXISTS trigger_projects_updated_at ON public.projects;
CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== INSERT DEFAULT PROJECTS ====================

INSERT INTO public.projects (name, slug, description, github_repo, project_type, platform, tech_stack, color, icon, display_order) VALUES
(
    'DANZ Backend',
    'danz-backend',
    'GraphQL API server with Apollo Server, Express, and Supabase',
    'danz-backend',
    'backend',
    'api',
    ARRAY['typescript', 'apollo-server', 'express', 'graphql', 'supabase'],
    '#10B981',
    'server',
    1
),
(
    'DANZ Mobile App',
    'danz-mobile',
    'React Native mobile app with Expo for iOS and Android',
    'danz-app',
    'app',
    'mobile',
    ARRAY['react-native', 'expo', 'typescript', 'apollo-client'],
    '#8B5CF6',
    'smartphone',
    2
),
(
    'DANZ Mini App',
    'danz-miniapp',
    'Telegram Mini App for quick dance sessions',
    'danz-miniapp',
    'app',
    'telegram',
    ARRAY['react', 'typescript', 'vite', 'telegram-webapp'],
    '#0088CC',
    'send',
    3
),
(
    'DANZ Web',
    'danz-web',
    'Next.js web application for dancers',
    'danz-web',
    'app',
    'web',
    ARRAY['nextjs', 'react', 'typescript', 'tailwind'],
    '#3B82F6',
    'globe',
    4
),
(
    'DANZ Admin Portal',
    'danz-admin',
    'Admin dashboard for platform management',
    'danz-admin-portal',
    'app',
    'admin',
    ARRAY['react', 'typescript', 'vite', 'tailwind'],
    '#F59E0B',
    'shield',
    5
),
(
    'Daily DANZ',
    'daily-danz',
    'Daily dance challenge mini app',
    'danz-miniapps',
    'app',
    'telegram',
    ARRAY['react', 'typescript', 'vite'],
    '#EC4899',
    'calendar',
    6
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    github_repo = EXCLUDED.github_repo,
    project_type = EXCLUDED.project_type,
    platform = EXCLUDED.platform,
    tech_stack = EXCLUDED.tech_stack,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

SELECT 'Projects table created and populated!' as result;
