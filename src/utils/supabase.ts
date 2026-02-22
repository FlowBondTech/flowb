/**
 * Shared Supabase PostgREST Helpers
 *
 * Centralizes all raw PostgREST fetch logic. Each consumer file imports
 * from here instead of defining its own copy.
 */

import { log } from "./logger.js";

export interface SbConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

// ---------------------------------------------------------------------------
// Low-level helpers (take raw PostgREST path strings)
// ---------------------------------------------------------------------------

/** GET with raw PostgREST path, e.g. "flowb_events?id=eq.123&select=id,name" */
export async function sbFetch<T>(cfg: SbConfig, path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: cfg.supabaseKey,
        Authorization: `Bearer ${cfg.supabaseKey}`,
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) {
      log.warn("[supabase]", `sbFetch failed: ${res.status}`, { path });
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    log.error("[supabase]", "sbFetch error", { path, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

/** POST with raw PostgREST path */
export async function sbPost(cfg: SbConfig, path: string, body: unknown, prefer = "return=representation"): Promise<any> {
  try {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${path}`, {
      method: "POST",
      headers: {
        apikey: cfg.supabaseKey,
        Authorization: `Bearer ${cfg.supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: prefer,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      log.warn("[supabase]", `sbPost failed: ${res.status}`, { path });
      return null;
    }
    if (prefer === "return=minimal") return true;
    const result = await res.json();
    return Array.isArray(result) ? result[0] : result;
  } catch (err) {
    log.error("[supabase]", "sbPost error", { path, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

/** PATCH with raw PostgREST path */
export async function sbPatchRaw(cfg: SbConfig, path: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${path}`, {
      method: "PATCH",
      headers: {
        apikey: cfg.supabaseKey,
        Authorization: `Bearer ${cfg.supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      log.warn("[supabase]", `sbPatchRaw failed: ${res.status}`, { path });
    }
    return res.ok;
  } catch (err) {
    log.error("[supabase]", "sbPatchRaw error", { path, error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

// ---------------------------------------------------------------------------
// High-level helpers (take table name + params/data objects)
// ---------------------------------------------------------------------------

/** GET with table name and query params object */
export async function sbQuery<T>(cfg: SbConfig, table: string, params: Record<string, string>): Promise<T | null> {
  const url = new URL(`${cfg.supabaseUrl}/rest/v1/${table}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url.toString(), {
      headers: {
        apikey: cfg.supabaseKey,
        Authorization: `Bearer ${cfg.supabaseKey}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      log.warn("[supabase]", `sbQuery failed: ${res.status}`, { table });
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    log.error("[supabase]", "sbQuery error", { table, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

/** INSERT (POST) with return=representation */
export async function sbInsert<T = any>(cfg: SbConfig, table: string, data: Record<string, any>): Promise<T | null> {
  try {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: cfg.supabaseKey,
        Authorization: `Bearer ${cfg.supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      log.warn("[supabase]", `sbInsert failed: ${res.status}`, { table });
      return null;
    }
    const result = await res.json();
    return Array.isArray(result) ? result[0] : result;
  } catch (err) {
    log.error("[supabase]", "sbInsert error", { table, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

/** UPSERT (POST with on_conflict + merge-duplicates) */
export async function sbUpsert<T = any>(cfg: SbConfig, table: string, data: Record<string, any>, onConflict: string): Promise<T | null> {
  try {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${table}?on_conflict=${onConflict}`, {
      method: "POST",
      headers: {
        apikey: cfg.supabaseKey,
        Authorization: `Bearer ${cfg.supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation,resolution=merge-duplicates",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      log.warn("[supabase]", `sbUpsert failed: ${res.status}`, { table, onConflict });
      return null;
    }
    const result = await res.json();
    return Array.isArray(result) ? result[0] : result;
  } catch (err) {
    log.error("[supabase]", "sbUpsert error", { table, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

/** PATCH with table name + filter params */
export async function sbPatch(cfg: SbConfig, table: string, filter: Record<string, string>, data: Record<string, any>): Promise<boolean> {
  const url = new URL(`${cfg.supabaseUrl}/rest/v1/${table}`);
  Object.entries(filter).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url.toString(), {
      method: "PATCH",
      headers: {
        apikey: cfg.supabaseKey,
        Authorization: `Bearer ${cfg.supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      log.warn("[supabase]", `sbPatch failed: ${res.status}`, { table });
    }
    return res.ok;
  } catch (err) {
    log.error("[supabase]", "sbPatch error", { table, error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

/** DELETE with table name + filter params */
export async function sbDelete(cfg: SbConfig, table: string, filter: Record<string, string>): Promise<boolean> {
  const url = new URL(`${cfg.supabaseUrl}/rest/v1/${table}`);
  Object.entries(filter).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url.toString(), {
      method: "DELETE",
      headers: {
        apikey: cfg.supabaseKey,
        Authorization: `Bearer ${cfg.supabaseKey}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      log.warn("[supabase]", `sbDelete failed: ${res.status}`, { table });
    }
    return res.ok;
  } catch (err) {
    log.error("[supabase]", "sbDelete error", { table, error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}
