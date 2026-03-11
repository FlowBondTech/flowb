-- 035: FiFlow CFO Plugin
-- Compliance tracking, treasury management, audit logging, and risk assessments
-- for FlowBond's Super Regenerative Finance Officer.

-- ============================================================================
-- flowb_fiflow_compliance_tasks: Regulatory compliance task tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS flowb_fiflow_compliance_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category        TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'not_started'
                    CHECK (status IN ('not_started', 'in_progress', 'blocked', 'completed', 'deferred')),
  priority        TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  deadline        DATE,
  assigned_to     TEXT,
  estimated_cost_usd  NUMERIC(12,2),
  actual_cost_usd     NUMERIC(12,2),
  jurisdiction    TEXT,
  regulatory_body TEXT,
  notes           JSONB DEFAULT '[]'::jsonb,
  evidence_urls   TEXT[],
  risk_score      NUMERIC(3,2),
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fiflow_tasks_category ON flowb_fiflow_compliance_tasks(category);
CREATE INDEX IF NOT EXISTS idx_fiflow_tasks_status ON flowb_fiflow_compliance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_fiflow_tasks_priority ON flowb_fiflow_compliance_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_fiflow_tasks_deadline ON flowb_fiflow_compliance_tasks(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fiflow_tasks_jurisdiction ON flowb_fiflow_compliance_tasks(jurisdiction);

ALTER TABLE flowb_fiflow_compliance_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all_fiflow_tasks" ON flowb_fiflow_compliance_tasks FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- flowb_fiflow_treasury: Treasury tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS flowb_fiflow_treasury (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type      TEXT NOT NULL
                    CHECK (entry_type IN ('income', 'expense', 'transfer', 'grant', 'investment')),
  category        TEXT NOT NULL,
  amount_usd      NUMERIC(12,2) NOT NULL,
  currency        TEXT DEFAULT 'USD',
  description     TEXT,
  counterparty    TEXT,
  tx_hash         TEXT,
  period_start    DATE,
  period_end      DATE,
  recurring       BOOLEAN DEFAULT false,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fiflow_treasury_type ON flowb_fiflow_treasury(entry_type);
CREATE INDEX IF NOT EXISTS idx_fiflow_treasury_category ON flowb_fiflow_treasury(category);
CREATE INDEX IF NOT EXISTS idx_fiflow_treasury_created ON flowb_fiflow_treasury(created_at);

ALTER TABLE flowb_fiflow_treasury ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all_fiflow_treasury" ON flowb_fiflow_treasury FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- flowb_fiflow_audit_log: Immutable compliance audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS flowb_fiflow_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor           TEXT NOT NULL,
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  changes         JSONB,
  ip_address      TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fiflow_audit_action ON flowb_fiflow_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_fiflow_audit_entity ON flowb_fiflow_audit_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_fiflow_audit_created ON flowb_fiflow_audit_log(created_at);

ALTER TABLE flowb_fiflow_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all_fiflow_audit" ON flowb_fiflow_audit_log FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- flowb_fiflow_risk_assessments: Point-in-time risk snapshots
-- ============================================================================

CREATE TABLE IF NOT EXISTS flowb_fiflow_risk_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain          TEXT NOT NULL,
  risk_level      TEXT NOT NULL
                    CHECK (risk_level IN ('critical', 'high', 'medium', 'low')),
  score           NUMERIC(3,2) NOT NULL,
  description     TEXT,
  mitigation_plan TEXT,
  assessed_by     TEXT,
  valid_until     DATE,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fiflow_risk_domain ON flowb_fiflow_risk_assessments(domain);
CREATE INDEX IF NOT EXISTS idx_fiflow_risk_created ON flowb_fiflow_risk_assessments(created_at);

ALTER TABLE flowb_fiflow_risk_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all_fiflow_risk" ON flowb_fiflow_risk_assessments FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- Seed: Pre-populate compliance tasks with 2026 regulatory deadlines
-- ============================================================================

INSERT INTO flowb_fiflow_compliance_tasks
  (category, title, description, priority, deadline, jurisdiction, regulatory_body, estimated_cost_usd, status)
VALUES
  ('federal_registration', 'FinCEN MSB Registration',
   'Register as a Money Services Business with FinCEN. Required for any entity transmitting money or dealing in convertible virtual currency.',
   'critical', NULL, 'US', 'FinCEN', 500, 'not_started'),

  ('aml_kyc', 'BSA/AML Compliance Program',
   'Establish a Bank Secrecy Act / Anti-Money Laundering compliance program including policies, procedures, internal controls, designated compliance officer, and independent testing.',
   'critical', NULL, 'US', 'FinCEN', 25000, 'not_started'),

  ('aml_kyc', 'KYC/CIP Implementation',
   'Implement Customer Identification Program with identity verification, risk profiling, and ongoing due diligence for all users transacting above thresholds.',
   'critical', NULL, 'US', 'FinCEN', 15000, 'not_started'),

  ('sanctions', 'OFAC Sanctions Screening',
   'Implement real-time screening against OFAC SDN list, blocked persons, and embargoed countries for all transactions.',
   'critical', NULL, 'US', 'OFAC/Treasury', 10000, 'not_started'),

  ('token_classification', '$DANZ Token Legal Opinion',
   'Obtain legal opinion on $DANZ token classification (utility vs. security) under Howey test. Critical for determining SEC registration requirements.',
   'critical', NULL, 'US', 'SEC', 30000, 'not_started'),

  ('data_privacy', 'Biometric Data Consent (BIPA)',
   'Implement biometric data consent flows compliant with Illinois BIPA. Required if collecting face/fingerprint data for identity verification.',
   'high', NULL, 'US-IL', 'Illinois AG', 8000, 'not_started'),

  ('state_licensing', 'California DFAL License',
   'Apply for Digital Financial Assets Law license. California requires licensure for entities engaging in digital financial asset business activity.',
   'high', '2026-07-01', 'US-CA', 'CA DFPI', 20000, 'not_started'),

  ('international', 'MiCA CASP Authorization',
   'Obtain Crypto-Asset Service Provider authorization under EU Markets in Crypto-Assets regulation. Required for EU operations.',
   'high', '2026-07-01', 'EU', 'MiCA/ESMA', 50000, 'not_started'),

  ('ai_regulation', 'EU AI Act Compliance',
   'Assess AI systems against EU AI Act risk categories. Implement transparency, documentation, and human oversight requirements for AI agents processing financial data.',
   'high', '2026-08-02', 'EU', 'EU AI Office', 15000, 'not_started'),

  ('federal_registration', 'GENIUS Act Readiness',
   'Prepare for potential stablecoin regulation under the GENIUS Act. Assess USDC usage patterns and prepare for possible reserve/reporting requirements.',
   'medium', '2027-01-01', 'US', 'Congress/OCC', 10000, 'not_started'),

  ('tax_reporting', 'IRS 1099-DA Infrastructure',
   'Build infrastructure for IRS Form 1099-DA reporting for digital asset transactions. Required for brokers/exchanges by 2026 tax year.',
   'high', '2026-12-31', 'US', 'IRS', 20000, 'not_started'),

  ('international', 'FATF Travel Rule Compliance',
   'Implement FATF Travel Rule for crypto transfers >$3,000. Transmit originator/beneficiary information between VASPs.',
   'high', NULL, 'Global', 'FATF', 25000, 'not_started'),

  ('data_privacy', 'SOC 2 Type II Audit',
   'Complete SOC 2 Type II audit for security, availability, and confidentiality. Demonstrates operational maturity to enterprise partners and regulators.',
   'medium', NULL, 'US', 'AICPA', 40000, 'not_started'),

  ('state_licensing', 'State Money Transmitter Licenses',
   'Apply for money transmitter licenses in ~40 US states. Each state has separate requirements, bonds, and examination processes.',
   'high', NULL, 'US-Multi', 'State Regulators', 200000, 'not_started')

ON CONFLICT DO NOTHING;
