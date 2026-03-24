/**
 * Cu.Flow Code Intelligence Plugin for FlowB
 *
 * Engineering briefs, feature tracking, git queries, velocity metrics,
 * contributor breakdowns, automated daily reports, and shareable
 * report documents - all powered by real GitHub data.
 *
 * Tables (migration 038):
 *   - flowb_cuflow_access
 *   - flowb_cuflow_daily_summaries
 *   - flowb_cuflow_feature_snapshots
 *   - flowb_cuflow_reports
 */

import type {
  FlowBPlugin,
  FlowBContext,
  ToolInput,
} from "../../core/types.js";
import { sbFetch, sbPost, sbPatchRaw, type SbConfig } from "../../utils/supabase.js";
import { log } from "../../utils/logger.js";
import {
  TABLES,
  FEATURE_AREAS,
  getDateRange,
  getFeatureAreaName,
  matchFeatureArea,
  type ReportPeriod,
} from "./constants.js";
import {
  GitHubClient,
  type DailySummary,
  type VelocityMetrics,
} from "./github.js";
import {
  formatDailyBrief,
  formatWeeklyBrief,
  formatFeatureProgress,
  formatSearchResults,
  formatFileHistory,
  formatHotspots,
  formatVelocity,
  formatContributors,
  formatWhatsNew,
  formatDailyNotification,
  formatReportHtml,
  wrapResponse,
} from "./personality.js";

// ============================================================================
// Types
// ============================================================================

export interface CuFlowPluginConfig extends SbConfig {
  githubToken?: string;
  githubRepo?: string;
}

// ============================================================================
// Code Generation for Report URLs
// ============================================================================

const CODE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";
function genCode(len = 8): string {
  let code = "";
  for (let i = 0; i < len; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

// ============================================================================
// Plugin
// ============================================================================

export class CuFlowPlugin implements FlowBPlugin {
  id = "cuflow";
  name = "Cu.Flow Code Intelligence";
  description = "Code intelligence, progress reporting, and engineering briefs.";

  actions: Record<string, { description: string; requiresAuth?: boolean }> = {
    "cuflow-brief":        { description: "Daily/weekly/monthly engineering brief" },
    "cuflow-feature":      { description: "Track progress by feature area" },
    "cuflow-search":       { description: "Search commits by message or file" },
    "cuflow-hotspots":     { description: "Most active areas of the codebase" },
    "cuflow-velocity":     { description: "Commit velocity and trends" },
    "cuflow-contributors": { description: "Who worked on what" },
    "cuflow-file-history": { description: "Changes to a specific file" },
    "cuflow-whats-new":    { description: "User-facing changelog" },
    "cuflow-report":       { description: "Generate shareable report document" },
  };

  private config: CuFlowPluginConfig | null = null;
  private client: GitHubClient | null = null;

  configure(config: CuFlowPluginConfig): void {
    this.config = config;
    this.client = new GitHubClient(config.githubToken, config.githubRepo);
  }

  isConfigured(): boolean {
    return !!(this.config?.supabaseUrl && this.config?.supabaseKey);
  }

  private getClient(): GitHubClient {
    if (!this.client) {
      this.client = new GitHubClient(this.config?.githubToken, this.config?.githubRepo);
    }
    return this.client;
  }

  async execute(action: string, input: ToolInput, _context: FlowBContext): Promise<string> {
    const cfg = this.config;
    if (!cfg) return "Cu.Flow plugin not configured.";

    switch (action) {
      case "cuflow-brief":
        return this.handleBrief(cfg, input);
      case "cuflow-feature":
        return this.handleFeature(cfg, input);
      case "cuflow-search":
        return this.handleSearch(input);
      case "cuflow-hotspots":
        return this.handleHotspots(input);
      case "cuflow-velocity":
        return this.handleVelocity();
      case "cuflow-contributors":
        return this.handleContributors(input);
      case "cuflow-file-history":
        return this.handleFileHistory(input);
      case "cuflow-whats-new":
        return this.handleWhatsNew(input);
      case "cuflow-report":
        return this.handleReport(cfg, input);
      default:
        return `Unknown Cu.Flow action: ${action}`;
    }
  }

  // ==========================================================================
  // Action Handlers
  // ==========================================================================

  private async handleBrief(cfg: SbConfig, input: ToolInput): Promise<string> {
    const period = ((input as any).period || "today") as ReportPeriod;

    if (period === "this_week" || period === "last_week") {
      return this.getWeeklyBrief(cfg, period);
    }

    const { since, until, label } = getDateRange(period);
    const date = since.slice(0, 10);

    // Try cache first
    const gh = this.getClient();
    const cached = await gh.loadDailySummary(cfg, date);
    if (cached) return formatDailyBrief(cached);

    const summary = await gh.buildDailySummary(date);
    // Cache if not today (today's data is still accumulating)
    if (period !== "today") {
      await gh.saveDailySummary(cfg, date, summary);
    }

    return formatDailyBrief(summary);
  }

  private async handleFeature(cfg: SbConfig, input: ToolInput): Promise<string> {
    const featureId = (input as any).feature_id || (input as any).feature;
    if (!featureId) {
      // List available feature areas
      const areas = FEATURE_AREAS.map((a) => `- **${a.id}**: ${a.name}`).join("\n");
      return wrapResponse(`**Available Feature Areas:**\n${areas}`, "general");
    }

    const period = ((input as any).period || "this_week") as ReportPeriod;
    const { since, until } = getDateRange(period);
    const gh = this.getClient();
    const allCommits = await gh.fetchCommits(since, until);

    // Get details for feature area matching
    const detailPromises = allCommits.slice(0, 50).map((c) => gh.fetchCommitDetail(c.sha));
    const details = (await Promise.all(detailPromises)).filter(Boolean);

    const featureCommits = details
      .filter((d) => d!.featureAreas.includes(featureId))
      .map((d) => d!);

    return formatFeatureProgress(featureId, featureCommits);
  }

  private async handleSearch(input: ToolInput): Promise<string> {
    const query = (input as any).query || (input as any).q || "";
    if (!query) return wrapResponse("Please provide a search query.", "search");

    const gh = this.getClient();
    const commits = await gh.searchCommits(query, (input as any).since);
    return formatSearchResults(query, commits);
  }

  private async handleHotspots(input: ToolInput): Promise<string> {
    const period = ((input as any).period || "this_week") as ReportPeriod;
    const limit = (input as any).limit || 15;
    const { since, until } = getDateRange(period);

    const gh = this.getClient();
    const hotspots = await gh.getHotspots(since, until, limit);
    return formatHotspots(hotspots);
  }

  private async handleVelocity(): Promise<string> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = today.getDay();
    const thisMonday = new Date(today.getTime() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) * 86400000);
    const lastMonday = new Date(thisMonday.getTime() - 7 * 86400000);

    const gh = this.getClient();
    const velocity = await gh.getVelocityComparison(
      thisMonday.toISOString(),
      now.toISOString(),
      lastMonday.toISOString(),
      thisMonday.toISOString(),
    );
    return formatVelocity(velocity);
  }

  private async handleContributors(input: ToolInput): Promise<string> {
    const period = ((input as any).period || "this_week") as ReportPeriod;
    const { since, until } = getDateRange(period);

    const gh = this.getClient();
    const stats = await gh.getContributorStats(since, until);
    return formatContributors(stats);
  }

  private async handleFileHistory(input: ToolInput): Promise<string> {
    const filePath = (input as any).file_path || (input as any).file || "";
    if (!filePath) return wrapResponse("Please provide a file path.", "general");

    const gh = this.getClient();
    const commits = await gh.getFileHistory(filePath, (input as any).limit || 20);
    return formatFileHistory(filePath, commits);
  }

  private async handleWhatsNew(input: ToolInput): Promise<string> {
    const period = ((input as any).period || "this_week") as ReportPeriod;
    const { since, until, label } = getDateRange(period);

    const gh = this.getClient();
    let commits = await gh.fetchCommits(since, until);

    // Optional text filter
    const q = (input as any).q || (input as any).query;
    if (q) {
      const lower = q.toLowerCase();
      commits = commits.filter((c) => c.firstLine.toLowerCase().includes(lower));
    }

    return formatWhatsNew(commits, label);
  }

  private async handleReport(cfg: SbConfig, input: ToolInput): Promise<string> {
    const reportType = (input as any).report_type || "daily_brief";
    const period = ((input as any).period || "yesterday") as ReportPeriod;

    const result = await this.generateReport(cfg, reportType, period, (input as any).user_id);
    if (!result) return wrapResponse("Failed to generate report.", "general");

    return wrapResponse(
      `**Report Generated**\n\n` +
      `Title: ${result.title}\n` +
      `View: flowb.me/report/${result.code}\n` +
      `Period: ${result.period}`,
      "brief",
    );
  }

  // ==========================================================================
  // Public Methods (for route handlers, bot, scheduler)
  // ==========================================================================

  async getDailyBrief(cfg: SbConfig, date?: string): Promise<{ summary: DailySummary; formatted: string }> {
    const gh = this.getClient();
    const targetDate = date || new Date().toISOString().slice(0, 10);

    const cached = await gh.loadDailySummary(cfg, targetDate);
    if (cached) return { summary: cached, formatted: formatDailyBrief(cached) };

    const summary = await gh.buildDailySummary(targetDate);
    await gh.saveDailySummary(cfg, targetDate, summary);
    return { summary, formatted: formatDailyBrief(summary) };
  }

  async getWeeklyBrief(cfg: SbConfig, period: ReportPeriod = "this_week"): Promise<string> {
    const { since, until } = getDateRange(period);
    const gh = this.getClient();

    // Build daily summaries for the week
    const startDate = new Date(since);
    const endDate = new Date(until);
    const summaries: DailySummary[] = [];

    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const cached = await gh.loadDailySummary(cfg, dateStr);
      if (cached) {
        summaries.push(cached);
      } else {
        const summary = await gh.buildDailySummary(dateStr);
        if (summary.commitCount > 0) {
          await gh.saveDailySummary(cfg, dateStr, summary);
          summaries.push(summary);
        }
      }
    }

    // Velocity comparison
    let velocity: VelocityMetrics | null = null;
    if (period === "this_week") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dayOfWeek = today.getDay();
      const thisMonday = new Date(today.getTime() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) * 86400000);
      const lastMonday = new Date(thisMonday.getTime() - 7 * 86400000);

      velocity = await gh.getVelocityComparison(
        thisMonday.toISOString(), now.toISOString(),
        lastMonday.toISOString(), thisMonday.toISOString(),
      );
    }

    return formatWeeklyBrief(summaries, velocity);
  }

  async generateReport(
    cfg: SbConfig,
    reportType: string,
    period: ReportPeriod,
    createdBy?: string,
  ): Promise<{ code: string; url: string; title: string; period: string } | null> {
    try {
      const { label } = getDateRange(period);
      const gh = this.getClient();

      // Build summary data
      const { since, until } = getDateRange(period);
      let summary: DailySummary;

      if (period === "today" || period === "yesterday") {
        const date = since.slice(0, 10);
        summary = await gh.buildDailySummary(date);
      } else {
        // Aggregate multiple days
        const startDate = new Date(since);
        const endDate = new Date(until);
        const agg: DailySummary = {
          date: `${since.slice(0, 10)} to ${until.slice(0, 10)}`,
          commitCount: 0,
          commits: [],
          byCategory: {},
          byFeatureArea: {},
          contributors: [],
          hotspots: [],
        };

        for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().slice(0, 10);
          const daySummary = await gh.buildDailySummary(dateStr);
          agg.commitCount += daySummary.commitCount;
          agg.commits.push(...daySummary.commits);
          for (const [k, v] of Object.entries(daySummary.byCategory)) {
            agg.byCategory[k] = (agg.byCategory[k] || 0) + v;
          }
          for (const [k, v] of Object.entries(daySummary.byFeatureArea)) {
            agg.byFeatureArea[k] = (agg.byFeatureArea[k] || 0) + v;
          }
        }

        // Recalculate contributors from aggregated commits
        const contribMap = new Map<string, any>();
        for (const c of agg.commits) {
          let stat = contribMap.get(c.author);
          if (!stat) {
            stat = { author: c.author, commitCount: 0, featureAreas: {}, categories: {} };
            contribMap.set(c.author, stat);
          }
          stat.commitCount++;
          stat.categories[c.category] = (stat.categories[c.category] || 0) + 1;
        }
        agg.contributors = Array.from(contribMap.values()).sort((a, b) => b.commitCount - a.commitCount);

        summary = agg;
      }

      const title = `Cu.Flow ${reportType === "daily_brief" ? "Daily Brief" : "Report"} - ${label}`;
      const contentMd = formatDailyBrief(summary);
      const contentHtml = formatReportHtml(summary, reportType, title);
      const code = genCode();

      await sbPost(cfg, TABLES.REPORTS, {
        code,
        report_type: reportType,
        period: label,
        title,
        content_html: contentHtml,
        content_md: contentMd,
        summary: `${summary.commitCount} commits`,
        metadata: { byCategory: summary.byCategory, byFeatureArea: summary.byFeatureArea },
        created_by: createdBy || null,
      });

      // Save feature snapshots
      const periodDate = since.slice(0, 10);
      const periodType = period.includes("week") ? "weekly" : period.includes("month") ? "monthly" : "daily";
      for (const [featureId, count] of Object.entries(summary.byFeatureArea)) {
        await gh.saveFeatureSnapshot(cfg, featureId, periodType, periodDate, {
          commitCount: count,
          additions: 0,
          deletions: 0,
          filesChanged: 0,
          contributors: summary.contributors
            .filter((c) => c.featureAreas[featureId])
            .map((c) => c.author),
        });
      }

      return { code, url: `flowb.me/report/${code}`, title, period: label };
    } catch (err) {
      log.error("[cuflow]", "Failed to generate report", { error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  }

  /**
   * Send daily digest. Called by scheduler.
   * Returns the notification text + report code for attaching buttons.
   */
  async sendDailyDigest(cfg: SbConfig): Promise<{
    groupText: string;
    adminText: string;
    reportCode: string | null;
  }> {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const { summary } = await this.getDailyBrief(cfg, yesterday);

    const groupText = formatDailyNotification(summary, false);
    const adminText = formatDailyNotification(summary, true);

    // Generate shareable report
    let reportCode: string | null = null;
    if (summary.commitCount > 0) {
      const report = await this.generateReport(cfg, "daily_brief", "yesterday");
      reportCode = report?.code || null;
    }

    return { groupText, adminText, reportCode };
  }

  /** Get a report by its share code (public). */
  async getReportByCode(cfg: SbConfig, code: string): Promise<any | null> {
    const rows = await sbFetch<any[]>(cfg, `${TABLES.REPORTS}?code=eq.${encodeURIComponent(code)}&limit=1`);
    return rows?.[0] || null;
  }

  /** Increment report view count. */
  async trackReportView(cfg: SbConfig, code: string): Promise<void> {
    try {
      // Use RPC or raw patch with increment
      const rows = await sbFetch<any[]>(cfg, `${TABLES.REPORTS}?code=eq.${encodeURIComponent(code)}&select=view_count&limit=1`);
      if (rows?.length) {
        await sbPatchRaw(cfg, `${TABLES.REPORTS}?code=eq.${encodeURIComponent(code)}`, {
          view_count: (rows[0].view_count || 0) + 1,
        });
      }
    } catch {
      // Non-critical, ignore
    }
  }

  /** List feature areas (public endpoint). */
  getFeatureAreas(): Array<{ id: string; name: string }> {
    return FEATURE_AREAS.map((a) => ({ id: a.id, name: a.name }));
  }
}
