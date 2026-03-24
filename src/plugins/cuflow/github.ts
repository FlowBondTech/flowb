/**
 * Cu.Flow GitHub API Client
 *
 * Two-tier caching: in-memory (5-10 min) + Supabase daily summaries (24h).
 * Handles commit listing, categorization, feature mapping, and contributor stats.
 */

import { GITHUB_CONFIG, CACHE_CONFIG, TABLES, matchFeatureArea, categorizeCommit, type CommitCategory } from "./constants.js";
import { sbFetch, sbPost, sbPatchRaw, type SbConfig } from "../../utils/supabase.js";
import { log } from "../../utils/logger.js";

// ============================================================================
// Types
// ============================================================================

export interface GitCommit {
  sha: string;
  message: string;
  firstLine: string;
  author: string;
  authorEmail: string;
  date: string;
  category: CommitCategory;
  featureAreas: string[];
  url: string;
}

export interface GitFileChange {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  featureArea: string;
}

export interface CommitDetail extends GitCommit {
  files: GitFileChange[];
  stats: { additions: number; deletions: number; total: number };
}

export interface CommitQueryResult {
  commits: GitCommit[];
  total: number;
  period: { since: string; until?: string };
  byCategory: Record<string, number>;
  byFeatureArea: Record<string, number>;
}

export interface FileHotspot {
  filename: string;
  changeCount: number;
  featureArea: string;
  lastChanged: string;
}

export interface ContributorStats {
  author: string;
  commitCount: number;
  featureAreas: Record<string, number>;
  categories: Record<string, number>;
}

export interface VelocityMetrics {
  current: { commits: number; period: string };
  previous: { commits: number; period: string };
  changePercent: number;
  direction: "up" | "down" | "flat";
}

export interface DailySummary {
  date: string;
  commitCount: number;
  commits: GitCommit[];
  byCategory: Record<string, number>;
  byFeatureArea: Record<string, number>;
  contributors: ContributorStats[];
  hotspots: FileHotspot[];
}

// ============================================================================
// In-Memory Cache
// ============================================================================

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const memCache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    memCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  memCache.set(key, { data, expiry: Date.now() + ttlMs });
}

// ============================================================================
// GitHub API Client
// ============================================================================

export class GitHubClient {
  private token: string | undefined;
  private repo: string;

  constructor(token?: string, repo?: string) {
    this.token = token;
    this.repo = repo || GITHUB_CONFIG.DEFAULT_REPO;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": GITHUB_CONFIG.USER_AGENT,
    };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return h;
  }

  private async ghFetch<T>(path: string): Promise<T | null> {
    try {
      const url = `${GITHUB_CONFIG.API_BASE}${path}`;
      const res = await fetch(url, { headers: this.headers() });
      if (!res.ok) {
        log.warn("[cuflow]", `GitHub API ${res.status}: ${path}`);
        return null;
      }
      return await res.json() as T;
    } catch (err) {
      log.error("[cuflow]", `GitHub API error: ${path}`, { error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Commit Listing
  // --------------------------------------------------------------------------

  async fetchCommits(since: string, until?: string, perPage: number = 100): Promise<GitCommit[]> {
    const cacheKey = `commits:${since}:${until || "now"}:${perPage}`;
    const cached = getCached<GitCommit[]>(cacheKey);
    if (cached) return cached;

    let path = `/repos/${this.repo}/commits?sha=${GITHUB_CONFIG.DEFAULT_BRANCH}&since=${since}&per_page=${perPage}`;
    if (until) path += `&until=${until}`;

    const raw = await this.ghFetch<any[]>(path);
    if (!raw) return [];

    const commits = raw
      .filter((c: any) => {
        const msg = c.commit?.message || "";
        return !msg.startsWith("docs: auto-generate");
      })
      .map((c: any) => this.parseCommit(c));

    setCache(cacheKey, commits, CACHE_CONFIG.COMMIT_LIST_TTL);
    return commits;
  }

  async fetchCommitDetail(sha: string): Promise<CommitDetail | null> {
    const cacheKey = `detail:${sha}`;
    const cached = getCached<CommitDetail>(cacheKey);
    if (cached) return cached;

    const raw = await this.ghFetch<any>(`/repos/${this.repo}/commits/${sha}`);
    if (!raw) return null;

    const base = this.parseCommit(raw);
    const files: GitFileChange[] = (raw.files || []).map((f: any) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions || 0,
      deletions: f.deletions || 0,
      changes: f.changes || 0,
      featureArea: matchFeatureArea(f.filename),
    }));

    const detail: CommitDetail = {
      ...base,
      featureAreas: [...new Set(files.map((f) => f.featureArea))],
      files,
      stats: {
        additions: raw.stats?.additions || 0,
        deletions: raw.stats?.deletions || 0,
        total: raw.stats?.total || 0,
      },
    };

    setCache(cacheKey, detail, CACHE_CONFIG.FILE_STATS_TTL);
    return detail;
  }

  async searchCommits(query: string, since?: string): Promise<GitCommit[]> {
    const lookback = since || new Date(Date.now() - 30 * 86400000).toISOString();
    const allCommits = await this.fetchCommits(lookback);
    const lower = query.toLowerCase();
    return allCommits.filter((c) =>
      c.message.toLowerCase().includes(lower) ||
      c.firstLine.toLowerCase().includes(lower) ||
      c.author.toLowerCase().includes(lower)
    );
  }

  async getFileHistory(filePath: string, limit: number = 20): Promise<GitCommit[]> {
    const cacheKey = `file:${filePath}:${limit}`;
    const cached = getCached<GitCommit[]>(cacheKey);
    if (cached) return cached;

    const raw = await this.ghFetch<any[]>(
      `/repos/${this.repo}/commits?path=${encodeURIComponent(filePath)}&per_page=${limit}`
    );
    if (!raw) return [];

    const commits = raw
      .filter((c: any) => !c.commit?.message?.startsWith("docs: auto-generate"))
      .map((c: any) => this.parseCommit(c));

    setCache(cacheKey, commits, CACHE_CONFIG.FILE_STATS_TTL);
    return commits;
  }

  // --------------------------------------------------------------------------
  // Aggregation
  // --------------------------------------------------------------------------

  async getContributorStats(since: string, until?: string): Promise<ContributorStats[]> {
    const commits = await this.fetchCommits(since, until);
    const statsMap = new Map<string, ContributorStats>();

    for (const c of commits) {
      let stat = statsMap.get(c.author);
      if (!stat) {
        stat = { author: c.author, commitCount: 0, featureAreas: {}, categories: {} };
        statsMap.set(c.author, stat);
      }
      stat.commitCount++;
      stat.categories[c.category] = (stat.categories[c.category] || 0) + 1;
      for (const area of c.featureAreas) {
        stat.featureAreas[area] = (stat.featureAreas[area] || 0) + 1;
      }
    }

    return Array.from(statsMap.values()).sort((a, b) => b.commitCount - a.commitCount);
  }

  async getHotspots(since: string, until?: string, limit: number = 15): Promise<FileHotspot[]> {
    const commits = await this.fetchCommits(since, until, 100);
    // Fetch details for up to 30 most recent commits to get file-level data
    const detailPromises = commits.slice(0, 30).map((c) => this.fetchCommitDetail(c.sha));
    const details = (await Promise.all(detailPromises)).filter(Boolean) as CommitDetail[];

    const fileMap = new Map<string, FileHotspot>();
    for (const d of details) {
      for (const f of d.files) {
        const existing = fileMap.get(f.filename);
        if (existing) {
          existing.changeCount++;
          if (d.date > existing.lastChanged) existing.lastChanged = d.date;
        } else {
          fileMap.set(f.filename, {
            filename: f.filename,
            changeCount: 1,
            featureArea: f.featureArea,
            lastChanged: d.date,
          });
        }
      }
    }

    return Array.from(fileMap.values())
      .sort((a, b) => b.changeCount - a.changeCount)
      .slice(0, limit);
  }

  async getVelocityComparison(currentSince: string, currentUntil: string, previousSince: string, previousUntil: string): Promise<VelocityMetrics> {
    const [current, previous] = await Promise.all([
      this.fetchCommits(currentSince, currentUntil),
      this.fetchCommits(previousSince, previousUntil),
    ]);

    const changePercent = previous.length === 0
      ? (current.length > 0 ? 100 : 0)
      : Math.round(((current.length - previous.length) / previous.length) * 100);

    return {
      current: { commits: current.length, period: `${currentSince.slice(0, 10)} to ${currentUntil.slice(0, 10)}` },
      previous: { commits: previous.length, period: `${previousSince.slice(0, 10)} to ${previousUntil.slice(0, 10)}` },
      changePercent,
      direction: changePercent > 5 ? "up" : changePercent < -5 ? "down" : "flat",
    };
  }

  // --------------------------------------------------------------------------
  // Daily Summary Builder
  // --------------------------------------------------------------------------

  async buildDailySummary(date: string): Promise<DailySummary> {
    const since = `${date}T00:00:00Z`;
    const until = `${date}T23:59:59Z`;

    const commits = await this.fetchCommits(since, until);
    const contributors = await this.getContributorStats(since, until);
    const hotspots = await this.getHotspots(since, until, 10);

    const byCategory: Record<string, number> = {};
    const byFeatureArea: Record<string, number> = {};

    for (const c of commits) {
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;
      for (const area of c.featureAreas) {
        byFeatureArea[area] = (byFeatureArea[area] || 0) + 1;
      }
    }

    return { date, commitCount: commits.length, commits, byCategory, byFeatureArea, contributors, hotspots };
  }

  // --------------------------------------------------------------------------
  // Supabase Persistence
  // --------------------------------------------------------------------------

  async saveDailySummary(cfg: SbConfig, date: string, summary: DailySummary): Promise<void> {
    try {
      // Upsert using direct fetch to handle conflict
      const url = `${cfg.supabaseUrl}/rest/v1/${TABLES.DAILY_SUMMARIES}?on_conflict=date,repo`;
      await fetch(url, {
        method: "POST",
        headers: {
          apikey: cfg.supabaseKey,
          Authorization: `Bearer ${cfg.supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal,resolution=merge-duplicates",
        },
        body: JSON.stringify({
          date,
          repo: this.repo,
          summary: JSON.stringify(summary),
          commit_count: summary.commitCount,
          computed_at: new Date().toISOString(),
        }),
      });
    } catch (err) {
      log.error("[cuflow]", "Failed to save daily summary", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  async loadDailySummary(cfg: SbConfig, date: string): Promise<DailySummary | null> {
    try {
      const rows = await sbFetch<any[]>(cfg,
        `${TABLES.DAILY_SUMMARIES}?date=eq.${date}&repo=eq.${encodeURIComponent(this.repo)}&limit=1`
      );
      if (!rows?.length) return null;

      // Check TTL
      const computedAt = new Date(rows[0].computed_at).getTime();
      if (Date.now() - computedAt > CACHE_CONFIG.DAILY_SUMMARY_TTL_HOURS * 3600000) return null;

      return typeof rows[0].summary === "string" ? JSON.parse(rows[0].summary) : rows[0].summary;
    } catch {
      return null;
    }
  }

  async saveFeatureSnapshot(cfg: SbConfig, featureId: string, periodType: string, periodDate: string, data: {
    commitCount: number;
    additions: number;
    deletions: number;
    filesChanged: number;
    contributors: string[];
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const url = `${cfg.supabaseUrl}/rest/v1/${TABLES.FEATURE_SNAPSHOTS}?on_conflict=feature_id,period_type,period_date`;
      await fetch(url, {
        method: "POST",
        headers: {
          apikey: cfg.supabaseKey,
          Authorization: `Bearer ${cfg.supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal,resolution=merge-duplicates",
        },
        body: JSON.stringify({
          feature_id: featureId,
          period_type: periodType,
          period_date: periodDate,
          commit_count: data.commitCount,
          additions: data.additions,
          deletions: data.deletions,
          files_changed: data.filesChanged,
          contributors: JSON.stringify(data.contributors),
          metadata: JSON.stringify(data.metadata || {}),
        }),
      });
    } catch (err) {
      log.error("[cuflow]", "Failed to save feature snapshot", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private parseCommit(raw: any): GitCommit {
    const message = raw.commit?.message || "";
    const firstLine = message.split("\n")[0];
    return {
      sha: raw.sha,
      message,
      firstLine,
      author: raw.commit?.author?.name || raw.author?.login || "unknown",
      authorEmail: raw.commit?.author?.email || "",
      date: raw.commit?.author?.date || "",
      category: categorizeCommit(firstLine),
      featureAreas: [], // Populated when detail is fetched
      url: raw.html_url || "",
    };
  }
}
