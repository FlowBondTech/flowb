/**
 * Websites Plugin — FlowB EC
 *
 * Manages biz project registry: CRUD for projects, credential vault,
 * connection tests, webhook dispatch, and activity logging.
 *
 * Tables: flowb_biz_projects, flowb_biz_webhooks, flowb_biz_activity_log
 */

import { sbFetch, sbInsert, sbPatch, sbDelete, sbQuery, type SbConfig } from "../../utils/supabase.js";
import { log } from "../../utils/logger.js";
import { encrypt, decrypt } from "./vault.js";

// ============================================================================
// Types
// ============================================================================

export interface WebsitesPluginConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export interface BizProject {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  domain: string | null;
  platform: string;
  supabase_url: string | null;
  supabase_anon_key: string | null;
  supabase_service_key_enc: string | null;
  netlify_site_id: string | null;
  netlify_build_hook: string | null;
  stripe_account_id: string | null;
  tg_channel_id: string | null;
  settings: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BizWebhook {
  id: string;
  project_id: string;
  event_type: string;
  target: string;
  target_config: Record<string, any>;
  enabled: boolean;
  created_at: string;
}

const NS = "[websites]";

// ============================================================================
// Project CRUD
// ============================================================================

export async function createProject(
  cfg: SbConfig,
  ownerId: string,
  data: {
    name: string;
    slug: string;
    domain?: string;
    platform?: string;
    supabase_url?: string;
    supabase_anon_key?: string;
    supabase_service_key?: string; // plaintext, will be encrypted
    netlify_site_id?: string;
    netlify_build_hook?: string;
    stripe_account_id?: string;
    tg_channel_id?: string;
    settings?: Record<string, any>;
  },
): Promise<BizProject | null> {
  const row: Record<string, any> = {
    owner_id: ownerId,
    name: data.name,
    slug: data.slug,
    domain: data.domain || null,
    platform: data.platform || "netlify",
    supabase_url: data.supabase_url || null,
    supabase_anon_key: data.supabase_anon_key || null,
    netlify_site_id: data.netlify_site_id || null,
    netlify_build_hook: data.netlify_build_hook || null,
    stripe_account_id: data.stripe_account_id || null,
    tg_channel_id: data.tg_channel_id || null,
    settings: data.settings || {},
  };

  if (data.supabase_service_key) {
    row.supabase_service_key_enc = encrypt(data.supabase_service_key);
  }

  const project = await sbInsert<BizProject>(cfg, "flowb_biz_projects", row);
  if (project) {
    log.info(NS, "project created", { slug: data.slug, owner: ownerId });
    await logActivity(cfg, project.id, ownerId, "project_created", "project", project.id, { name: data.name });
  }
  return project;
}

export async function listProjects(cfg: SbConfig, ownerId: string): Promise<BizProject[]> {
  const rows = await sbFetch<BizProject[]>(
    cfg,
    `flowb_biz_projects?owner_id=eq.${encodeURIComponent(ownerId)}&is_active=eq.true&order=created_at.asc&select=id,name,slug,domain,platform,is_active,created_at,tg_channel_id,settings`,
  );
  return rows || [];
}

export async function getProject(cfg: SbConfig, slug: string): Promise<BizProject | null> {
  const rows = await sbFetch<BizProject[]>(
    cfg,
    `flowb_biz_projects?slug=eq.${encodeURIComponent(slug)}&limit=1`,
  );
  return rows?.[0] || null;
}

export async function updateProject(
  cfg: SbConfig,
  slug: string,
  ownerId: string,
  updates: Partial<{
    name: string;
    domain: string;
    platform: string;
    supabase_url: string;
    supabase_anon_key: string;
    supabase_service_key: string;
    netlify_site_id: string;
    netlify_build_hook: string;
    stripe_account_id: string;
    tg_channel_id: string;
    settings: Record<string, any>;
    is_active: boolean;
  }>,
): Promise<boolean> {
  const data: Record<string, any> = { ...updates, updated_at: new Date().toISOString() };

  // Encrypt service key if provided
  if (updates.supabase_service_key) {
    data.supabase_service_key_enc = encrypt(updates.supabase_service_key);
    delete data.supabase_service_key;
  }

  const ok = await sbPatch(cfg, "flowb_biz_projects", {
    slug: `eq.${slug}`,
    owner_id: `eq.${encodeURIComponent(ownerId)}`,
  }, data);

  if (ok) {
    const project = await getProject(cfg, slug);
    if (project) {
      await logActivity(cfg, project.id, ownerId, "project_updated", "project", project.id, { fields: Object.keys(updates) });
    }
  }
  return ok;
}

export async function deleteProject(cfg: SbConfig, slug: string, ownerId: string): Promise<boolean> {
  return sbDelete(cfg, "flowb_biz_projects", {
    slug: `eq.${slug}`,
    owner_id: `eq.${encodeURIComponent(ownerId)}`,
  });
}

// ============================================================================
// Connection Test
// ============================================================================

export async function testConnection(cfg: SbConfig, slug: string): Promise<{ ok: boolean; error?: string }> {
  const project = await getProject(cfg, slug);
  if (!project) return { ok: false, error: "Project not found" };
  if (!project.supabase_url || !project.supabase_anon_key) {
    return { ok: false, error: "Missing Supabase credentials" };
  }

  try {
    const res = await fetch(`${project.supabase_url}/rest/v1/`, {
      headers: {
        apikey: project.supabase_anon_key,
        Authorization: `Bearer ${project.supabase_anon_key}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return { ok: true };
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// ============================================================================
// Site API Helper
// ============================================================================

/** Call a managed site's content API */
export async function siteApiCall(
  cfg: SbConfig,
  projectSlug: string,
  endpoint: string,
  method: string,
  body?: any,
): Promise<any> {
  const project = await getProject(cfg, projectSlug);
  if (!project) throw new Error(`Project '${projectSlug}' not found`);

  const apiBase = (project.settings as any)?.content_api_base;
  if (!apiBase) throw new Error(`No content_api_base configured for '${projectSlug}'`);

  let apiKey = "";
  if (project.supabase_service_key_enc) {
    apiKey = decrypt(project.supabase_service_key_enc);
  }

  const res = await fetch(`${apiBase}/${endpoint}`, {
    method,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Site API ${method} ${endpoint}: ${res.status} ${text}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

// ============================================================================
// Webhooks
// ============================================================================

export async function createWebhook(
  cfg: SbConfig,
  projectId: string,
  eventType: string,
  target: string,
  targetConfig: Record<string, any> = {},
): Promise<BizWebhook | null> {
  return sbInsert<BizWebhook>(cfg, "flowb_biz_webhooks", {
    project_id: projectId,
    event_type: eventType,
    target,
    target_config: targetConfig,
  });
}

export async function listWebhooks(cfg: SbConfig, projectId: string): Promise<BizWebhook[]> {
  const rows = await sbFetch<BizWebhook[]>(
    cfg,
    `flowb_biz_webhooks?project_id=eq.${projectId}&order=created_at.asc`,
  );
  return rows || [];
}

export async function dispatchWebhook(
  cfg: SbConfig,
  projectId: string,
  eventType: string,
  payload: Record<string, any>,
): Promise<void> {
  const hooks = await sbFetch<BizWebhook[]>(
    cfg,
    `flowb_biz_webhooks?project_id=eq.${projectId}&event_type=eq.${encodeURIComponent(eventType)}&enabled=eq.true`,
  );
  if (!hooks?.length) return;

  for (const hook of hooks) {
    try {
      if (hook.target === "custom_url") {
        const url = hook.target_config?.url;
        if (url) {
          await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: eventType, ...payload }),
            signal: AbortSignal.timeout(10000),
          });
        }
      }
      // telegram + n8n targets are handled by biz-notifications.ts
    } catch (err) {
      log.warn(NS, "webhook dispatch failed", { hook: hook.id, error: err instanceof Error ? err.message : String(err) });
    }
  }
}

// ============================================================================
// Activity Log
// ============================================================================

export async function logActivity(
  cfg: SbConfig,
  projectId: string,
  actor: string,
  action: string,
  entityType?: string,
  entityId?: string,
  details?: Record<string, any>,
): Promise<void> {
  await sbInsert(cfg, "flowb_biz_activity_log", {
    project_id: projectId,
    actor,
    action,
    entity_type: entityType || null,
    entity_id: entityId || null,
    details: details || {},
  });
}

export async function getActivityLog(
  cfg: SbConfig,
  projectId: string,
  limit = 50,
): Promise<any[]> {
  const rows = await sbFetch<any[]>(
    cfg,
    `flowb_biz_activity_log?project_id=eq.${projectId}&order=created_at.desc&limit=${limit}`,
  );
  return rows || [];
}

// ============================================================================
// Netlify Rebuild
// ============================================================================

export async function triggerRebuild(cfg: SbConfig, slug: string): Promise<{ ok: boolean; error?: string }> {
  const project = await getProject(cfg, slug);
  if (!project) return { ok: false, error: "Project not found" };
  if (!project.netlify_build_hook) return { ok: false, error: "No build hook configured" };

  try {
    const res = await fetch(project.netlify_build_hook, { method: "POST", signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      await logActivity(cfg, project.id, "system", "site_rebuild", "site", slug);
      return { ok: true };
    }
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
