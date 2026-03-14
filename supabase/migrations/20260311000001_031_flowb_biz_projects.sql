-- FlowB EC: Biz project registry, webhooks, and activity log
-- Stores managed website configs + encrypted credentials

-- Biz project registry
CREATE TABLE flowb_biz_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  domain text,
  platform text DEFAULT 'netlify',
  supabase_url text,
  supabase_anon_key text,
  supabase_service_key_enc text,
  netlify_site_id text,
  netlify_build_hook text,
  stripe_account_id text,
  tg_channel_id text,
  settings jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Webhook configurations per project
CREATE TABLE flowb_biz_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES flowb_biz_projects(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  target text NOT NULL DEFAULT 'telegram',
  target_config jsonb DEFAULT '{}',
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Content change audit log
CREATE TABLE flowb_biz_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES flowb_biz_projects(id) ON DELETE CASCADE,
  actor text NOT NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_biz_projects_owner ON flowb_biz_projects(owner_id);
CREATE INDEX idx_biz_projects_slug ON flowb_biz_projects(slug);
CREATE INDEX idx_biz_webhooks_project ON flowb_biz_webhooks(project_id);
CREATE INDEX idx_biz_activity_project ON flowb_biz_activity_log(project_id, created_at DESC);
