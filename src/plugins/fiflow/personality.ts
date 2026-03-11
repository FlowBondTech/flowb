/**
 * FiFlow Personality Engine
 *
 * Wraps all FiFlow responses with the voice of a Super Regenerative Finance
 * Officer - wise, global-minded, human-first. Compliance is strategy.
 */

// ============================================================================
// Greetings & Sign-offs
// ============================================================================

const GREETINGS = [
  "FiFlow here - your Super Regenerative Finance Officer.",
  "FiFlow reporting in. Let's build sustainable systems.",
  "FiFlow online. Compliance is strategy, not burden.",
  "FiFlow here - making regulation work for regeneration.",
  "FiFlow at your service. Every rule is an opportunity.",
];

const SIGN_OFFS: Record<string, string[]> = {
  compliance: [
    "Compliance protects people, not just the business. Keep building responsibly.",
    "Every regulation we meet is a foundation we build on. Onwards.",
    "The path to trust is paved with good compliance. You're on it.",
  ],
  treasury: [
    "Sustainable finance fuels sustainable impact. Spend wisely, grow boldly.",
    "Every dollar tracked is a dollar accountable. That's regenerative finance.",
    "Financial clarity is a superpower. Use it well.",
  ],
  risk: [
    "Risk managed is opportunity preserved. Stay vigilant.",
    "The best risk management is proactive, not reactive. You're ahead.",
    "In a regenerative system, risk awareness protects the whole ecosystem.",
  ],
  strategy: [
    "Strategy without compliance is speed without direction. You have both.",
    "The regenerative path is the sustainable path. Keep going.",
    "Build for the long term. The future rewards those who prepare.",
  ],
  general: [
    "FiFlow out. Building sustainable systems, one compliance task at a time.",
    "Stay regenerative. Stay compliant. Stay human-first.",
    "Until next time - keep the financial house in order.",
  ],
};

// ============================================================================
// Domain Insights
// ============================================================================

const DOMAIN_INSIGHTS: Record<string, string[]> = {
  aml: [
    "AML isn't just regulation - it's how we keep bad actors out of regenerative finance.",
    "Strong AML programs are the immune system of the financial ecosystem.",
  ],
  sanctions: [
    "Sanctions compliance ensures we're building bridges, not funding walls.",
    "Real-time screening is non-negotiable in cross-border regenerative finance.",
  ],
  licensing: [
    "State licenses are expensive, but they're your license to operate with trust.",
    "Each license is a jurisdiction that trusts you with its citizens' money.",
  ],
  token: [
    "Token classification isn't just legal - it defines your relationship with your community.",
    "Get the legal opinion right and everything else follows. Skip it and everything else fails.",
  ],
  privacy: [
    "Privacy is a human right. Protecting data is protecting people.",
    "SOC 2 isn't paperwork - it's proof you take people's trust seriously.",
  ],
  tax: [
    "Tax reporting infrastructure is unsexy but essential. The IRS doesn't do 'move fast and break things.'",
    "1099-DA readiness now saves panic in Q1 2027. Plan ahead.",
  ],
  ai: [
    "AI regulation is the newest frontier. Being early to comply is a competitive advantage.",
    "The EU AI Act asks: are your AI systems transparent and fair? Good question for any builder.",
  ],
  international: [
    "MiCA isn't a barrier - it's Europe's invitation to legitimate crypto businesses.",
    "The Travel Rule connects the global financial system. Be part of the solution.",
  ],
};

// ============================================================================
// Personality Engine
// ============================================================================

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getGreeting(): string {
  return pick(GREETINGS);
}

export function getSignOff(context: string = "general"): string {
  const pool = SIGN_OFFS[context] || SIGN_OFFS.general;
  return pick(pool);
}

export function getInsight(domain: string): string {
  const pool = DOMAIN_INSIGHTS[domain];
  if (!pool) return "";
  return pick(pool);
}

// ============================================================================
// Response Formatters
// ============================================================================

export function wrapResponse(content: string, context: string = "general"): string {
  return `${getGreeting()}\n\n${content}\n\n---\n${getSignOff(context)}`;
}

export function formatComplianceUpdate(tasks: ComplianceSummary): string {
  const lines: string[] = [];

  lines.push(`**Compliance Overview**`);
  lines.push(`Total tasks: ${tasks.total} | Completed: ${tasks.completed} | In Progress: ${tasks.inProgress} | Blocked: ${tasks.blocked}`);
  lines.push("");

  if (tasks.critical > 0) {
    lines.push(`**CRITICAL items requiring attention: ${tasks.critical}**`);
  }

  if (tasks.upcomingDeadlines.length > 0) {
    lines.push("");
    lines.push("**Upcoming Deadlines:**");
    for (const d of tasks.upcomingDeadlines) {
      lines.push(`- ${d.title} - ${d.deadline} (${d.status})`);
    }
  }

  const byCategory = tasks.byCategory;
  if (Object.keys(byCategory).length > 0) {
    lines.push("");
    lines.push("**By Category:**");
    for (const [cat, count] of Object.entries(byCategory)) {
      lines.push(`- ${formatCategoryName(cat)}: ${count} tasks`);
    }
  }

  return wrapResponse(lines.join("\n"), "compliance");
}

export function formatTreasuryBrief(data: TreasurySummary): string {
  const lines: string[] = [];

  lines.push("**Treasury Dashboard**");
  lines.push("");
  lines.push(`Total Income: $${data.totalIncome.toLocaleString()}`);
  lines.push(`Total Expenses: $${data.totalExpenses.toLocaleString()}`);
  lines.push(`Net Position: $${data.netPosition.toLocaleString()}`);
  lines.push("");

  if (data.complianceBudget > 0) {
    lines.push(`Compliance Budget Allocated: $${data.complianceBudget.toLocaleString()}`);
    lines.push(`Compliance Spent: $${data.complianceSpent.toLocaleString()}`);
    lines.push(`Compliance Remaining: $${(data.complianceBudget - data.complianceSpent).toLocaleString()}`);
    lines.push("");
  }

  if (Object.keys(data.byCategory).length > 0) {
    lines.push("**Expenses by Category:**");
    for (const [cat, amount] of Object.entries(data.byCategory)) {
      lines.push(`- ${formatCategoryName(cat)}: $${amount.toLocaleString()}`);
    }
  }

  return wrapResponse(lines.join("\n"), "treasury");
}

export function formatRiskMatrix(risks: RiskEntry[]): string {
  const lines: string[] = [];

  lines.push("**Risk Assessment Matrix**");
  lines.push("");

  if (risks.length === 0) {
    lines.push("No risk assessments recorded yet. Consider running a risk assessment across all compliance domains.");
    return wrapResponse(lines.join("\n"), "risk");
  }

  const sorted = [...risks].sort((a, b) => b.score - a.score);
  for (const r of sorted) {
    const emoji = r.risk_level === "critical" ? "!!" : r.risk_level === "high" ? "!" : "-";
    lines.push(`${emoji} **${r.domain.toUpperCase()}** - ${r.risk_level} (${r.score})`);
    if (r.description) lines.push(`  ${r.description}`);
    if (r.mitigation_plan) lines.push(`  Mitigation: ${r.mitigation_plan}`);
    lines.push("");
  }

  return wrapResponse(lines.join("\n"), "risk");
}

export function formatDeadlines(deadlines: DeadlineEntry[]): string {
  const lines: string[] = [];

  lines.push("**Upcoming Regulatory Deadlines**");
  lines.push("");

  if (deadlines.length === 0) {
    lines.push("No upcoming deadlines found in the specified window.");
    return wrapResponse(lines.join("\n"), "compliance");
  }

  for (const d of deadlines) {
    const daysLeft = Math.ceil(
      (new Date(d.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    const urgency = daysLeft <= 30 ? "**URGENT**" : daysLeft <= 90 ? "SOON" : "";
    lines.push(`- ${d.title} | ${d.deadline} (${daysLeft} days) ${urgency}`);
    lines.push(`  Status: ${d.status} | Priority: ${d.priority} | ${d.jurisdiction}`);
    lines.push("");
  }

  return wrapResponse(lines.join("\n"), "compliance");
}

export function formatStrategyRecommendations(recs: string[]): string {
  const lines: string[] = [];

  lines.push("**Regenerative Finance Strategy Recommendations**");
  lines.push("");

  for (let i = 0; i < recs.length; i++) {
    lines.push(`${i + 1}. ${recs[i]}`);
  }

  return wrapResponse(lines.join("\n"), "strategy");
}

// ============================================================================
// Helpers
// ============================================================================

function formatCategoryName(cat: string): string {
  return cat
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ============================================================================
// Types used by personality formatters
// ============================================================================

export interface ComplianceSummary {
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
  notStarted: number;
  critical: number;
  upcomingDeadlines: { title: string; deadline: string; status: string }[];
  byCategory: Record<string, number>;
}

export interface TreasurySummary {
  totalIncome: number;
  totalExpenses: number;
  netPosition: number;
  complianceBudget: number;
  complianceSpent: number;
  byCategory: Record<string, number>;
}

export interface RiskEntry {
  domain: string;
  risk_level: string;
  score: number;
  description: string | null;
  mitigation_plan: string | null;
}

export interface DeadlineEntry {
  title: string;
  deadline: string;
  status: string;
  priority: string;
  jurisdiction: string;
}
