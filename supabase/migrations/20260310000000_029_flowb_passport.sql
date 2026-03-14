-- ============================================================================
-- FlowB Passport: Supabase Auth integration
-- Maps Supabase auth.users to FlowB canonical identities
-- ============================================================================

-- FlowB Passport mapping table
CREATE TABLE IF NOT EXISTS flowb_passport (
  supabase_uid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  canonical_id TEXT NOT NULL,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flowb_passport_canonical ON flowb_passport(canonical_id);
CREATE INDEX IF NOT EXISTS idx_flowb_passport_email ON flowb_passport(email) WHERE email IS NOT NULL;

-- Add supabase_uid to identities for cross-referencing
ALTER TABLE flowb_identities ADD COLUMN IF NOT EXISTS supabase_uid UUID;
CREATE INDEX IF NOT EXISTS idx_flowb_identities_supabase_uid ON flowb_identities(supabase_uid) WHERE supabase_uid IS NOT NULL;

-- RLS policies
ALTER TABLE flowb_passport ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_passport" ON flowb_passport
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "users_read_own_passport" ON flowb_passport
  FOR SELECT USING (supabase_uid = auth.uid());

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_flowb_passport_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_flowb_passport_updated_at ON flowb_passport;
CREATE TRIGGER trigger_flowb_passport_updated_at
  BEFORE UPDATE ON flowb_passport
  FOR EACH ROW EXECUTE FUNCTION update_flowb_passport_updated_at();
