-- ============================================================================
-- Org Leads: Lead management for organizations
-- ============================================================================

-- Leads table: stores individual leads submitted by org members
CREATE TABLE IF NOT EXISTS flowb_org_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id TEXT NOT NULL,                   -- org identifier (e.g. "flowbond")
  submitted_by TEXT NOT NULL,             -- user_id of submitter (e.g. "telegram_12345")
  submitted_by_name TEXT,                 -- display name of submitter

  -- Lead info
  name TEXT NOT NULL,                     -- lead's name (person or company)
  contact TEXT,                           -- email, phone, telegram handle, etc.
  contact_type TEXT DEFAULT 'other',      -- "email" | "phone" | "telegram" | "twitter" | "other"
  company TEXT,                           -- company/org the lead belongs to
  notes TEXT,                             -- freeform notes about the lead
  tags TEXT[] DEFAULT '{}',               -- tags for categorization
  source TEXT DEFAULT 'telegram',         -- where the lead was submitted from
  status TEXT DEFAULT 'new',              -- "new" | "contacted" | "qualified" | "converted" | "lost"
  priority TEXT DEFAULT 'normal',         -- "low" | "normal" | "high" | "urgent"

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast org-scoped queries
CREATE INDEX IF NOT EXISTS idx_flowb_org_leads_org ON flowb_org_leads(org_id);
CREATE INDEX IF NOT EXISTS idx_flowb_org_leads_status ON flowb_org_leads(org_id, status);
CREATE INDEX IF NOT EXISTS idx_flowb_org_leads_submitted ON flowb_org_leads(submitted_by);

-- Org members: tracks who can submit/view leads for an org
CREATE TABLE IF NOT EXISTS flowb_org_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,                  -- e.g. "telegram_12345"
  display_name TEXT,                      -- human-readable name
  role TEXT DEFAULT 'member',             -- "owner" | "admin" | "member"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_flowb_org_members_user ON flowb_org_members(user_id);

-- Orgs table: lightweight org registry
CREATE TABLE IF NOT EXISTS flowb_orgs (
  id TEXT PRIMARY KEY,                    -- slug like "flowbond"
  name TEXT NOT NULL,                     -- display name "FlowBond"
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
