/**
 * Cu.Flow Chat Tool Executors
 *
 * Tool executor functions called by the switch statement in ai-chat.ts.
 * Each function maps AI tool arguments to CuFlowPlugin methods.
 */

import { CuFlowPlugin, type CuFlowPluginConfig } from "../plugins/cuflow/index.js";
import type { SbConfig } from "../utils/supabase.js";

// Singleton plugin instance (preserves in-memory cache across calls)
let _plugin: CuFlowPlugin | null = null;

function getPlugin(): CuFlowPlugin {
  if (!_plugin) {
    _plugin = new CuFlowPlugin();
    const cfg: CuFlowPluginConfig | undefined = process.env.SUPABASE_URL ? {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY!,
      githubToken: process.env.GITHUB_TOKEN,
      githubRepo: "FlowBondTech/flowb",
    } : undefined;
    if (cfg) _plugin.configure(cfg);
  }
  return _plugin;
}

function getSbConfig(): SbConfig | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) return null;
  return { supabaseUrl: url, supabaseKey: key };
}

// ─── Tool Executors ──────────────────────────────────────────────────

export async function cuflowBrief(args: any, sb: SbConfig): Promise<string> {
  const plugin = getPlugin();
  if (!plugin.isConfigured()) return "Cu.Flow not configured (missing SUPABASE_URL).";

  return plugin.execute("cuflow-brief", {
    action: "cuflow-brief",
    period: args.period || "today",
  } as any, { platform: "chat", config: {} as any });
}

export async function cuflowFeature(args: any, sb: SbConfig): Promise<string> {
  const plugin = getPlugin();
  if (!plugin.isConfigured()) return "Cu.Flow not configured.";

  return plugin.execute("cuflow-feature", {
    action: "cuflow-feature",
    feature_id: args.feature_id || args.feature,
    period: args.period || "this_week",
  } as any, { platform: "chat", config: {} as any });
}

export async function cuflowSearch(args: any, sb: SbConfig): Promise<string> {
  const plugin = getPlugin();
  if (!plugin.isConfigured()) return "Cu.Flow not configured.";

  return plugin.execute("cuflow-search", {
    action: "cuflow-search",
    query: args.query || args.q,
    since: args.since,
  } as any, { platform: "chat", config: {} as any });
}

export async function cuflowHotspots(args: any, sb: SbConfig): Promise<string> {
  const plugin = getPlugin();
  if (!plugin.isConfigured()) return "Cu.Flow not configured.";

  return plugin.execute("cuflow-hotspots", {
    action: "cuflow-hotspots",
    period: args.period || "this_week",
    limit: args.limit,
  } as any, { platform: "chat", config: {} as any });
}

export async function cuflowVelocity(args: any, sb: SbConfig): Promise<string> {
  const plugin = getPlugin();
  if (!plugin.isConfigured()) return "Cu.Flow not configured.";

  return plugin.execute("cuflow-velocity", {
    action: "cuflow-velocity",
  } as any, { platform: "chat", config: {} as any });
}

export async function cuflowContributors(args: any, sb: SbConfig): Promise<string> {
  const plugin = getPlugin();
  if (!plugin.isConfigured()) return "Cu.Flow not configured.";

  return plugin.execute("cuflow-contributors", {
    action: "cuflow-contributors",
    period: args.period || "this_week",
  } as any, { platform: "chat", config: {} as any });
}

export async function cuflowWhatsNew(args: any, sb: SbConfig): Promise<string> {
  const plugin = getPlugin();
  if (!plugin.isConfigured()) return "Cu.Flow not configured.";

  return plugin.execute("cuflow-whats-new", {
    action: "cuflow-whats-new",
    period: args.period || "this_week",
    query: args.query || args.q,
  } as any, { platform: "chat", config: {} as any });
}

export async function cuflowReport(args: any, sb: SbConfig): Promise<string> {
  const plugin = getPlugin();
  if (!plugin.isConfigured()) return "Cu.Flow not configured.";

  return plugin.execute("cuflow-report", {
    action: "cuflow-report",
    report_type: args.report_type || "daily_brief",
    period: args.period || "yesterday",
    user_id: args.user_id,
  } as any, { platform: "chat", config: {} as any });
}
