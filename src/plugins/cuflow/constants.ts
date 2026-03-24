/**
 * Cu.Flow Code Intelligence - Constants & Configuration
 *
 * Feature area mapping, commit categorization, cache config,
 * and table names for the Code Intelligence Officer plugin.
 */

// ============================================================================
// Feature Area Mapping
// ============================================================================

export interface FeatureArea {
  id: string;
  name: string;
  patterns: string[];
}

export const FEATURE_AREAS: FeatureArea[] = [
  { id: "fiflow",      name: "FiFlow CFO",          patterns: ["src/plugins/fiflow/"] },
  { id: "kanban",       name: "Kanban / Tasks / Leads", patterns: ["kanban/"] },
  { id: "web",          name: "Web App",             patterns: ["web/"] },
  { id: "mobile",       name: "Mobile App",          patterns: ["mobile/"] },
  { id: "telegram",     name: "Telegram Bot",        patterns: ["src/telegram/"] },
  { id: "ai_chat",      name: "AI Chat System",      patterns: ["src/services/ai-chat", "src/services/chat-tools-"] },
  { id: "events",       name: "Events & Discovery",  patterns: ["src/plugins/egator/", "src/plugins/danz/"] },
  { id: "social",       name: "Social & Crews",      patterns: ["src/plugins/social/", "src/plugins/flow/"] },
  { id: "backend",      name: "Backend / API",       patterns: ["src/server/", "src/core/"] },
  { id: "services",     name: "Platform Services",   patterns: ["src/services/"] },
  { id: "infra",        name: "Infrastructure",      patterns: ["infra/", "Dockerfile", "fly.toml"] },
  { id: "db",           name: "Database",            patterns: ["supabase/"] },
  { id: "miniapp_fc",   name: "Farcaster Mini App",  patterns: ["miniapp/farcaster/"] },
  { id: "miniapp_tg",   name: "Telegram Mini App",   patterns: ["miniapp/telegram/"] },
  { id: "docs",         name: "Documentation",       patterns: ["docs/"] },
  { id: "websites",     name: "Website Builder",     patterns: ["src/plugins/websites/"] },
  { id: "automation",   name: "Automations",         patterns: ["src/plugins/automation/"] },
  { id: "cuflow",       name: "Cu.Flow",             patterns: ["src/plugins/cuflow/"] },
];

/**
 * Match a file path to its feature area. Returns the first match
 * (most specific patterns listed first). Falls back to "other".
 */
export function matchFeatureArea(filePath: string): string {
  for (const area of FEATURE_AREAS) {
    for (const pattern of area.patterns) {
      if (filePath.startsWith(pattern) || filePath.includes(`/${pattern}`)) {
        return area.id;
      }
    }
  }
  // Check for root-level markdown as docs
  if (filePath.endsWith(".md") && !filePath.includes("/")) return "docs";
  return "other";
}

export function getFeatureAreaName(featureId: string): string {
  const area = FEATURE_AREAS.find((a) => a.id === featureId);
  return area?.name || featureId;
}

// ============================================================================
// Commit Prefix Categorization
// ============================================================================

export const COMMIT_PREFIX_MAP: Record<string, string> = {
  feat: "feature",
  add: "feature",
  new: "feature",
  fix: "fix",
  bug: "fix",
  improve: "improvement",
  update: "improvement",
  enhance: "improvement",
  polish: "improvement",
  close: "improvement",
  refactor: "refactor",
  docs: "docs",
  doc: "docs",
  infra: "infra",
  ci: "infra",
  deploy: "infra",
  remove: "removal",
  delete: "removal",
  switch: "change",
  change: "change",
  migrate: "change",
};

export type CommitCategory = "feature" | "fix" | "improvement" | "refactor" | "docs" | "infra" | "removal" | "change" | "other";

/**
 * Categorize a commit message based on its prefix.
 */
export function categorizeCommit(message: string): CommitCategory {
  const lower = message.toLowerCase().trim();
  for (const [prefix, category] of Object.entries(COMMIT_PREFIX_MAP)) {
    if (lower.startsWith(prefix)) return category as CommitCategory;
  }
  return "other";
}

export const CATEGORY_LABELS: Record<CommitCategory, string> = {
  feature: "New Features",
  fix: "Bug Fixes",
  improvement: "Improvements",
  refactor: "Refactoring",
  docs: "Documentation",
  infra: "Infrastructure",
  removal: "Removed",
  change: "Changes",
  other: "Other",
};

export const CATEGORY_ORDER: CommitCategory[] = [
  "feature", "improvement", "fix", "change", "refactor", "infra", "docs", "removal", "other",
];

// ============================================================================
// Report Periods
// ============================================================================

export type ReportPeriod = "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month";

export function getDateRange(period: ReportPeriod): { since: string; until: string; label: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case "today":
      return { since: today.toISOString(), until: now.toISOString(), label: "Today" };
    case "yesterday": {
      const yesterday = new Date(today.getTime() - 86400000);
      return { since: yesterday.toISOString(), until: today.toISOString(), label: "Yesterday" };
    }
    case "this_week": {
      const dayOfWeek = today.getDay();
      const monday = new Date(today.getTime() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) * 86400000);
      return { since: monday.toISOString(), until: now.toISOString(), label: "This Week" };
    }
    case "last_week": {
      const dayOfWeek = today.getDay();
      const thisMonday = new Date(today.getTime() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) * 86400000);
      const lastMonday = new Date(thisMonday.getTime() - 7 * 86400000);
      return { since: lastMonday.toISOString(), until: thisMonday.toISOString(), label: "Last Week" };
    }
    case "this_month": {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { since: firstOfMonth.toISOString(), until: now.toISOString(), label: "This Month" };
    }
    case "last_month": {
      const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { since: firstOfLastMonth.toISOString(), until: firstOfThisMonth.toISOString(), label: "Last Month" };
    }
  }
}

// ============================================================================
// Cache Configuration
// ============================================================================

export const CACHE_CONFIG = {
  /** In-memory TTL for commit lists (ms) */
  COMMIT_LIST_TTL: 5 * 60 * 1000,
  /** In-memory TTL for file stats (ms) */
  FILE_STATS_TTL: 10 * 60 * 1000,
  /** Supabase daily summary TTL (hours) */
  DAILY_SUMMARY_TTL_HOURS: 24,
} as const;

// ============================================================================
// GitHub Configuration
// ============================================================================

export const GITHUB_CONFIG = {
  DEFAULT_REPO: "FlowBondTech/flowb",
  DEFAULT_BRANCH: "main",
  API_BASE: "https://api.github.com",
  USER_AGENT: "FlowB-CuFlow",
} as const;

// ============================================================================
// Table Names
// ============================================================================

export const TABLES = {
  ACCESS: "flowb_cuflow_access",
  DAILY_SUMMARIES: "flowb_cuflow_daily_summaries",
  FEATURE_SNAPSHOTS: "flowb_cuflow_feature_snapshots",
  REPORTS: "flowb_cuflow_reports",
} as const;
