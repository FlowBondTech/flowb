/**
 * Cu.Flow Personality Engine
 *
 * Response formatters with the voice of a Code Intelligence Officer:
 * data-driven, concise, engineering-focused. Returns both markdown and
 * HTML variants for different output targets.
 */

import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  getFeatureAreaName,
  type CommitCategory,
} from "./constants.js";
import type {
  GitCommit,
  CommitQueryResult,
  FileHotspot,
  ContributorStats,
  VelocityMetrics,
  DailySummary,
} from "./github.js";

// ============================================================================
// Cu.Flow Voice
// ============================================================================

const GREETINGS = [
  "Cu.Flow here - Code Intelligence Officer reporting.",
  "Cu.Flow online. Engineering pulse check incoming.",
  "Cu.Flow reporting in. Let's look at the data.",
  "Cu.Flow here - your code intelligence brief is ready.",
];

const SIGN_OFFS: Record<string, string[]> = {
  brief: [
    "Ship it.",
    "Keep building.",
    "The code speaks for itself.",
  ],
  search: [
    "That's what the git log says.",
    "Data doesn't lie.",
  ],
  velocity: [
    "Momentum is everything.",
    "Velocity tracked. Keep pushing.",
  ],
  general: [
    "Cu.Flow out.",
    "End of report.",
    "That's the signal.",
  ],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getGreeting(): string {
  return pick(GREETINGS);
}

function getSignOff(context: string = "general"): string {
  const pool = SIGN_OFFS[context] || SIGN_OFFS.general;
  return pick(pool);
}

// ============================================================================
// Wrap Response
// ============================================================================

export function wrapResponse(content: string, context: string = "general"): string {
  return `${getGreeting()}\n\n${content}\n\n---\n${getSignOff(context)}`;
}

// ============================================================================
// Brief Formatters
// ============================================================================

export function formatDailyBrief(summary: DailySummary): string {
  const lines: string[] = [];
  const dateLabel = summary.date;

  lines.push(`**Engineering Brief - ${dateLabel}**`);
  lines.push(`${summary.commitCount} commits`);
  lines.push("");

  // Category breakdown
  if (Object.keys(summary.byCategory).length > 0) {
    lines.push("**By Type:**");
    for (const cat of CATEGORY_ORDER) {
      const count = summary.byCategory[cat];
      if (count) lines.push(`- ${CATEGORY_LABELS[cat]}: ${count}`);
    }
    lines.push("");
  }

  // Feature area breakdown
  if (Object.keys(summary.byFeatureArea).length > 0) {
    lines.push("**By Feature Area:**");
    const sorted = Object.entries(summary.byFeatureArea).sort((a, b) => b[1] - a[1]);
    for (const [area, count] of sorted) {
      lines.push(`- ${getFeatureAreaName(area)}: ${count}`);
    }
    lines.push("");
  }

  // Contributors
  if (summary.contributors.length > 0) {
    lines.push("**Contributors:**");
    for (const c of summary.contributors) {
      const areas = Object.keys(c.featureAreas).map(getFeatureAreaName).join(", ");
      lines.push(`- ${c.author}: ${c.commitCount} commits (${areas})`);
    }
    lines.push("");
  }

  // Hot files
  if (summary.hotspots.length > 0) {
    lines.push("**Most Active Files:**");
    for (const h of summary.hotspots.slice(0, 5)) {
      lines.push(`- \`${h.filename}\` (${h.changeCount} changes)`);
    }
  }

  return wrapResponse(lines.join("\n"), "brief");
}

export function formatWeeklyBrief(summaries: DailySummary[], velocity: VelocityMetrics | null): string {
  const lines: string[] = [];
  const totalCommits = summaries.reduce((s, d) => s + d.commitCount, 0);

  lines.push("**Weekly Engineering Brief**");
  lines.push(`${totalCommits} commits across ${summaries.length} days`);

  if (velocity) {
    const arrow = velocity.direction === "up" ? "+" : velocity.direction === "down" ? "" : "";
    lines.push(`Velocity: ${arrow}${velocity.changePercent}% vs previous week`);
  }
  lines.push("");

  // Aggregate categories
  const aggCat: Record<string, number> = {};
  const aggArea: Record<string, number> = {};
  const allContribs = new Map<string, ContributorStats>();

  for (const s of summaries) {
    for (const [k, v] of Object.entries(s.byCategory)) {
      aggCat[k] = (aggCat[k] || 0) + v;
    }
    for (const [k, v] of Object.entries(s.byFeatureArea)) {
      aggArea[k] = (aggArea[k] || 0) + v;
    }
    for (const c of s.contributors) {
      const existing = allContribs.get(c.author);
      if (existing) {
        existing.commitCount += c.commitCount;
        for (const [area, count] of Object.entries(c.featureAreas)) {
          existing.featureAreas[area] = (existing.featureAreas[area] || 0) + count;
        }
      } else {
        allContribs.set(c.author, { ...c });
      }
    }
  }

  // Categories
  lines.push("**By Type:**");
  for (const cat of CATEGORY_ORDER) {
    const count = aggCat[cat];
    if (count) lines.push(`- ${CATEGORY_LABELS[cat as CommitCategory]}: ${count}`);
  }
  lines.push("");

  // Feature areas
  lines.push("**By Feature Area:**");
  const sortedAreas = Object.entries(aggArea).sort((a, b) => b[1] - a[1]);
  for (const [area, count] of sortedAreas.slice(0, 10)) {
    lines.push(`- ${getFeatureAreaName(area)}: ${count}`);
  }
  lines.push("");

  // Contributors
  const sortedContribs = Array.from(allContribs.values()).sort((a, b) => b.commitCount - a.commitCount);
  if (sortedContribs.length > 0) {
    lines.push("**Contributors:**");
    for (const c of sortedContribs) {
      lines.push(`- ${c.author}: ${c.commitCount} commits`);
    }
  }

  return wrapResponse(lines.join("\n"), "brief");
}

// ============================================================================
// Feature & Search Formatters
// ============================================================================

export function formatFeatureProgress(featureId: string, commits: GitCommit[]): string {
  const lines: string[] = [];
  const name = getFeatureAreaName(featureId);

  lines.push(`**${name} - Progress Report**`);
  lines.push(`${commits.length} commits`);
  lines.push("");

  if (commits.length === 0) {
    lines.push("No commits found for this feature area in the given period.");
    return wrapResponse(lines.join("\n"), "general");
  }

  // Group by category
  const byCat: Record<string, GitCommit[]> = {};
  for (const c of commits) {
    if (!byCat[c.category]) byCat[c.category] = [];
    byCat[c.category].push(c);
  }

  for (const cat of CATEGORY_ORDER) {
    const group = byCat[cat];
    if (!group?.length) continue;
    lines.push(`**${CATEGORY_LABELS[cat as CommitCategory]}:**`);
    for (const c of group.slice(0, 8)) {
      const date = new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      lines.push(`- ${c.firstLine} (${date}, ${c.author})`);
    }
    if (group.length > 8) lines.push(`  ...and ${group.length - 8} more`);
    lines.push("");
  }

  return wrapResponse(lines.join("\n"), "brief");
}

export function formatSearchResults(query: string, commits: GitCommit[]): string {
  const lines: string[] = [];

  lines.push(`**Search: "${query}"**`);
  lines.push(`${commits.length} result${commits.length !== 1 ? "s" : ""}`);
  lines.push("");

  if (commits.length === 0) {
    lines.push("No commits found matching your search.");
    return wrapResponse(lines.join("\n"), "search");
  }

  for (const c of commits.slice(0, 15)) {
    const date = new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    lines.push(`- ${c.firstLine} (${date}, ${c.author})`);
  }

  if (commits.length > 15) lines.push(`\n...and ${commits.length - 15} more`);

  return wrapResponse(lines.join("\n"), "search");
}

export function formatFileHistory(filePath: string, commits: GitCommit[]): string {
  const lines: string[] = [];

  lines.push(`**File History: \`${filePath}\`**`);
  lines.push(`${commits.length} change${commits.length !== 1 ? "s" : ""}`);
  lines.push("");

  for (const c of commits.slice(0, 20)) {
    const date = new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    lines.push(`- ${c.firstLine} (${date}, ${c.author})`);
  }

  return wrapResponse(lines.join("\n"), "general");
}

// ============================================================================
// Metrics Formatters
// ============================================================================

export function formatHotspots(hotspots: FileHotspot[]): string {
  const lines: string[] = [];

  lines.push("**Codebase Hotspots**");
  lines.push(`Top ${hotspots.length} most-changed files`);
  lines.push("");

  if (hotspots.length === 0) {
    lines.push("No file-level data available for this period.");
    return wrapResponse(lines.join("\n"), "general");
  }

  for (let i = 0; i < hotspots.length; i++) {
    const h = hotspots[i];
    lines.push(`${i + 1}. \`${h.filename}\` - ${h.changeCount} changes (${getFeatureAreaName(h.featureArea)})`);
  }

  return wrapResponse(lines.join("\n"), "general");
}

export function formatVelocity(metrics: VelocityMetrics): string {
  const lines: string[] = [];
  const arrow = metrics.direction === "up" ? "+" : metrics.direction === "down" ? "" : "";

  lines.push("**Velocity Report**");
  lines.push("");
  lines.push(`Current period: ${metrics.current.commits} commits (${metrics.current.period})`);
  lines.push(`Previous period: ${metrics.previous.commits} commits (${metrics.previous.period})`);
  lines.push(`Change: ${arrow}${metrics.changePercent}% (${metrics.direction})`);

  return wrapResponse(lines.join("\n"), "velocity");
}

export function formatContributors(stats: ContributorStats[]): string {
  const lines: string[] = [];

  lines.push("**Contributor Breakdown**");
  lines.push(`${stats.length} contributor${stats.length !== 1 ? "s" : ""}`);
  lines.push("");

  if (stats.length === 0) {
    lines.push("No contributor data available.");
    return wrapResponse(lines.join("\n"), "general");
  }

  for (const c of stats) {
    const topAreas = Object.entries(c.featureAreas)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([area]) => getFeatureAreaName(area))
      .join(", ");
    lines.push(`**${c.author}** - ${c.commitCount} commits`);
    if (topAreas) lines.push(`  Areas: ${topAreas}`);
  }

  return wrapResponse(lines.join("\n"), "general");
}

// ============================================================================
// Notification Formatters (Telegram)
// ============================================================================

export function formatDailyNotification(summary: DailySummary, isAdmin: boolean): string {
  if (summary.commitCount === 0) {
    return "Cu.Flow Daily | No commits yesterday. Rest day?";
  }

  if (!isAdmin) {
    // Simple format for group
    const features = summary.byCategory["feature"] || 0;
    const improvements = summary.byCategory["improvement"] || 0;
    const fixes = summary.byCategory["fix"] || 0;
    const parts: string[] = [];
    if (features) parts.push(`${features} feature${features !== 1 ? "s" : ""}`);
    if (improvements) parts.push(`${improvements} improvement${improvements !== 1 ? "s" : ""}`);
    if (fixes) parts.push(`${fixes} fix${fixes !== 1 ? "es" : ""}`);
    const summary_text = parts.length > 0 ? parts.join(", ") : `${summary.commitCount} updates`;
    return `Cu.Flow Daily | ${summary.commitCount} commits | ${summary_text}`;
  }

  // Admin enhanced format
  const lines: string[] = [];
  lines.push(`Cu.Flow Daily | ${summary.commitCount} commits`);

  // Feature area breakdown (top 5)
  const sortedAreas = Object.entries(summary.byFeatureArea)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  if (sortedAreas.length > 0) {
    const areaStr = sortedAreas.map(([a, c]) => `${getFeatureAreaName(a)} (${c})`).join(", ");
    lines.push(areaStr);
  }

  // Contributors
  if (summary.contributors.length > 0) {
    const contribStr = summary.contributors.map((c) => `${c.author}: ${c.commitCount}`).join(", ");
    lines.push(`Contributors: ${contribStr}`);
  }

  return lines.join("\n");
}

// ============================================================================
// What's New (User-facing Changelog)
// ============================================================================

export function formatWhatsNew(commits: GitCommit[], period: string): string {
  const lines: string[] = [];

  lines.push(`**What's New - ${period}**`);
  lines.push(`${commits.length} update${commits.length !== 1 ? "s" : ""}`);
  lines.push("");

  if (commits.length === 0) {
    lines.push("No updates in this period.");
    return lines.join("\n");
  }

  // Group by category
  const byCat: Record<string, GitCommit[]> = {};
  for (const c of commits) {
    if (!byCat[c.category]) byCat[c.category] = [];
    byCat[c.category].push(c);
  }

  for (const cat of CATEGORY_ORDER) {
    const group = byCat[cat];
    if (!group?.length) continue;
    lines.push(`**${CATEGORY_LABELS[cat as CommitCategory]}:**`);
    for (const c of group.slice(0, 8)) {
      const date = new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      lines.push(`- ${c.firstLine} (${date})`);
    }
    if (group.length > 8) lines.push(`  ...and ${group.length - 8} more`);
    lines.push("");
  }

  return lines.join("\n");
}

// ============================================================================
// Report HTML Generator
// ============================================================================

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function formatReportHtml(summary: DailySummary, reportType: string, title: string): string {
  const lines: string[] = [];

  lines.push(`<h1>${esc(title)}</h1>`);
  lines.push(`<p class="meta">${summary.commitCount} commits | Generated by Cu.Flow</p>`);

  // Category breakdown
  if (Object.keys(summary.byCategory).length > 0) {
    lines.push(`<h2>By Type</h2><ul>`);
    for (const cat of CATEGORY_ORDER) {
      const count = summary.byCategory[cat];
      if (count) lines.push(`<li><strong>${esc(CATEGORY_LABELS[cat as CommitCategory])}</strong>: ${count}</li>`);
    }
    lines.push(`</ul>`);
  }

  // Feature areas
  if (Object.keys(summary.byFeatureArea).length > 0) {
    lines.push(`<h2>By Feature Area</h2><ul>`);
    const sorted = Object.entries(summary.byFeatureArea).sort((a, b) => b[1] - a[1]);
    for (const [area, count] of sorted) {
      lines.push(`<li><strong>${esc(getFeatureAreaName(area))}</strong>: ${count}</li>`);
    }
    lines.push(`</ul>`);
  }

  // Contributors
  if (summary.contributors.length > 0) {
    lines.push(`<h2>Contributors</h2><ul>`);
    for (const c of summary.contributors) {
      const areas = Object.keys(c.featureAreas).map(getFeatureAreaName).join(", ");
      lines.push(`<li><strong>${esc(c.author)}</strong>: ${c.commitCount} commits (${esc(areas)})</li>`);
    }
    lines.push(`</ul>`);
  }

  // Recent commits
  if (summary.commits.length > 0) {
    lines.push(`<h2>Commits</h2><ul class="commits">`);
    for (const c of summary.commits.slice(0, 30)) {
      const date = new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      lines.push(`<li><code>${esc(c.sha.slice(0, 7))}</code> ${esc(c.firstLine)} <span class="date">(${date}, ${esc(c.author)})</span></li>`);
    }
    lines.push(`</ul>`);
  }

  return lines.join("\n");
}
