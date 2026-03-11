-- FlowB Leads table (standalone - no kanban FK dependencies)
-- Creates just the CRM leads pipeline table for the TG bot

CREATE TABLE IF NOT EXISTS flowb_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  company text,
  stage text DEFAULT 'new'
    CHECK (stage IN ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost')),
  source text,
  assigned_to text,
  value numeric,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for pipeline queries
CREATE INDEX IF NOT EXISTS idx_flowb_leads_stage ON flowb_leads (stage);
CREATE INDEX IF NOT EXISTS idx_flowb_leads_created_by ON flowb_leads (created_by);
CREATE INDEX IF NOT EXISTS idx_flowb_leads_assigned_to ON flowb_leads (assigned_to);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_flowb_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_flowb_leads_updated_at ON flowb_leads;
CREATE TRIGGER trg_flowb_leads_updated_at
  BEFORE UPDATE ON flowb_leads
  FOR EACH ROW EXECUTE FUNCTION update_flowb_leads_updated_at();
