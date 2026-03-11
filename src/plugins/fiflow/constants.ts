/**
 * FiFlow CFO Plugin - Constants & Configuration
 *
 * Compliance categories, regulatory deadlines, risk scoring,
 * and personality constants for the Super Regenerative Finance Officer.
 */

// ============================================================================
// Compliance Categories
// ============================================================================

export const COMPLIANCE_CATEGORIES = {
  FEDERAL_REGISTRATION: "federal_registration",
  STATE_LICENSING: "state_licensing",
  AML_KYC: "aml_kyc",
  SANCTIONS: "sanctions",
  TOKEN_CLASSIFICATION: "token_classification",
  TAX_REPORTING: "tax_reporting",
  DATA_PRIVACY: "data_privacy",
  AI_REGULATION: "ai_regulation",
  INTERNATIONAL: "international",
} as const;

export type ComplianceCategory = (typeof COMPLIANCE_CATEGORIES)[keyof typeof COMPLIANCE_CATEGORIES];

// ============================================================================
// Task Status & Priority
// ============================================================================

export const TASK_STATUSES = ["not_started", "in_progress", "blocked", "completed", "deferred"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["critical", "high", "medium", "low"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

// ============================================================================
// Risk Domains
// ============================================================================

export const RISK_DOMAINS = ["aml", "sanctions", "licensing", "token", "privacy", "tax", "ai"] as const;
export type RiskDomain = (typeof RISK_DOMAINS)[number];

export const RISK_LEVELS = ["critical", "high", "medium", "low"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

// ============================================================================
// Treasury Entry Types
// ============================================================================

export const ENTRY_TYPES = ["income", "expense", "transfer", "grant", "investment"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export const EXPENSE_CATEGORIES = [
  "compliance", "development", "marketing", "operations", "legal", "infrastructure",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// ============================================================================
// Risk Scoring Weights
// ============================================================================

export const RISK_WEIGHTS = {
  severity: 0.3,
  likelihood: 0.3,
  financial_impact: 0.2,
  regulatory_impact: 0.2,
} as const;

export function calculateRiskScore(
  severity: number,
  likelihood: number,
  financialImpact: number,
  regulatoryImpact: number,
): number {
  const raw =
    severity * RISK_WEIGHTS.severity +
    likelihood * RISK_WEIGHTS.likelihood +
    financialImpact * RISK_WEIGHTS.financial_impact +
    regulatoryImpact * RISK_WEIGHTS.regulatory_impact;
  return Math.round(raw * 100) / 100;
}

// ============================================================================
// 2026 Regulatory Deadlines (Seed Data)
// ============================================================================

export interface ComplianceTaskSeed {
  category: ComplianceCategory;
  title: string;
  description: string;
  priority: TaskPriority;
  deadline: string | null;
  jurisdiction: string;
  regulatory_body: string;
  estimated_cost_usd: number | null;
}

export const SEED_COMPLIANCE_TASKS: ComplianceTaskSeed[] = [
  {
    category: "federal_registration",
    title: "FinCEN MSB Registration",
    description: "Register as a Money Services Business with FinCEN. Required for any entity transmitting money or dealing in convertible virtual currency.",
    priority: "critical",
    deadline: null,
    jurisdiction: "US",
    regulatory_body: "FinCEN",
    estimated_cost_usd: 500,
  },
  {
    category: "aml_kyc",
    title: "BSA/AML Compliance Program",
    description: "Establish a Bank Secrecy Act / Anti-Money Laundering compliance program including policies, procedures, internal controls, designated compliance officer, and independent testing.",
    priority: "critical",
    deadline: null,
    jurisdiction: "US",
    regulatory_body: "FinCEN",
    estimated_cost_usd: 25000,
  },
  {
    category: "aml_kyc",
    title: "KYC/CIP Implementation",
    description: "Implement Customer Identification Program with identity verification, risk profiling, and ongoing due diligence for all users transacting above thresholds.",
    priority: "critical",
    deadline: null,
    jurisdiction: "US",
    regulatory_body: "FinCEN",
    estimated_cost_usd: 15000,
  },
  {
    category: "sanctions",
    title: "OFAC Sanctions Screening",
    description: "Implement real-time screening against OFAC SDN list, blocked persons, and embargoed countries for all transactions.",
    priority: "critical",
    deadline: null,
    jurisdiction: "US",
    regulatory_body: "OFAC/Treasury",
    estimated_cost_usd: 10000,
  },
  {
    category: "token_classification",
    title: "$DANZ Token Legal Opinion",
    description: "Obtain legal opinion on $DANZ token classification (utility vs. security) under Howey test. Critical for determining SEC registration requirements.",
    priority: "critical",
    deadline: null,
    jurisdiction: "US",
    regulatory_body: "SEC",
    estimated_cost_usd: 30000,
  },
  {
    category: "data_privacy",
    title: "Biometric Data Consent (BIPA)",
    description: "Implement biometric data consent flows compliant with Illinois BIPA. Required if collecting face/fingerprint data for identity verification.",
    priority: "high",
    deadline: null,
    jurisdiction: "US-IL",
    regulatory_body: "Illinois AG",
    estimated_cost_usd: 8000,
  },
  {
    category: "state_licensing",
    title: "California DFAL License",
    description: "Apply for Digital Financial Assets Law license. California requires licensure for entities engaging in digital financial asset business activity.",
    priority: "high",
    deadline: "2026-07-01",
    jurisdiction: "US-CA",
    regulatory_body: "CA DFPI",
    estimated_cost_usd: 20000,
  },
  {
    category: "international",
    title: "MiCA CASP Authorization",
    description: "Obtain Crypto-Asset Service Provider authorization under EU Markets in Crypto-Assets regulation. Required for EU operations.",
    priority: "high",
    deadline: "2026-07-01",
    jurisdiction: "EU",
    regulatory_body: "MiCA/ESMA",
    estimated_cost_usd: 50000,
  },
  {
    category: "ai_regulation",
    title: "EU AI Act Compliance",
    description: "Assess AI systems against EU AI Act risk categories. Implement transparency, documentation, and human oversight requirements for AI agents processing financial data.",
    priority: "high",
    deadline: "2026-08-02",
    jurisdiction: "EU",
    regulatory_body: "EU AI Office",
    estimated_cost_usd: 15000,
  },
  {
    category: "federal_registration",
    title: "GENIUS Act Readiness",
    description: "Prepare for potential stablecoin regulation under the GENIUS Act. Assess USDC usage patterns and prepare for possible reserve/reporting requirements.",
    priority: "medium",
    deadline: "2027-01-01",
    jurisdiction: "US",
    regulatory_body: "Congress/OCC",
    estimated_cost_usd: 10000,
  },
  {
    category: "tax_reporting",
    title: "IRS 1099-DA Infrastructure",
    description: "Build infrastructure for IRS Form 1099-DA reporting for digital asset transactions. Required for brokers/exchanges by 2026 tax year.",
    priority: "high",
    deadline: "2026-12-31",
    jurisdiction: "US",
    regulatory_body: "IRS",
    estimated_cost_usd: 20000,
  },
  {
    category: "international",
    title: "FATF Travel Rule Compliance",
    description: "Implement FATF Travel Rule for crypto transfers >$3,000. Transmit originator/beneficiary information between VASPs.",
    priority: "high",
    deadline: null,
    jurisdiction: "Global",
    regulatory_body: "FATF",
    estimated_cost_usd: 25000,
  },
  {
    category: "data_privacy",
    title: "SOC 2 Type II Audit",
    description: "Complete SOC 2 Type II audit for security, availability, and confidentiality. Demonstrates operational maturity to enterprise partners and regulators.",
    priority: "medium",
    deadline: null,
    jurisdiction: "US",
    regulatory_body: "AICPA",
    estimated_cost_usd: 40000,
  },
  {
    category: "state_licensing",
    title: "State Money Transmitter Licenses",
    description: "Apply for money transmitter licenses in ~40 US states. Each state has separate requirements, bonds, and examination processes.",
    priority: "high",
    deadline: null,
    jurisdiction: "US-Multi",
    regulatory_body: "State Regulators",
    estimated_cost_usd: 200000,
  },
];

// ============================================================================
// Audit Log Action Types
// ============================================================================

export const AUDIT_ACTIONS = {
  TASK_CREATED: "task_created",
  TASK_UPDATED: "task_updated",
  TASK_COMPLETED: "task_completed",
  REPORT_GENERATED: "report_generated",
  RISK_ASSESSED: "risk_assessed",
  TREASURY_ENTRY_ADDED: "treasury_entry_added",
  STRATEGY_REQUESTED: "strategy_requested",
} as const;

// ============================================================================
// Table Names
// ============================================================================

export const TABLES = {
  COMPLIANCE_TASKS: "flowb_fiflow_compliance_tasks",
  TREASURY: "flowb_fiflow_treasury",
  AUDIT_LOG: "flowb_fiflow_audit_log",
  RISK_ASSESSMENTS: "flowb_fiflow_risk_assessments",
} as const;
