/**
 * FlowB Admin Lookup
 *
 * Checks admin status against the flowb_admins table with a 60-second
 * in-memory TTL cache. Falls back to env var check if DB query fails.
 */

import { sbFetch, type SbConfig } from "./supabase.js";
import { log } from "./logger.js";

interface AdminRow {
  user_id: string;
  permissions: string[];
}

interface CacheEntry {
  row: AdminRow | null;
  expiry: number;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

export async function isFlowBAdmin(
  cfg: SbConfig,
  userId: string,
  permission?: string,
): Promise<boolean> {
  if (!userId) return false;

  // Check cache
  const now = Date.now();
  const cached = cache.get(userId);
  if (cached && cached.expiry > now) {
    return matchPermission(cached.row, permission);
  }

  // Query DB
  try {
    const rows = await sbFetch<AdminRow[]>(
      cfg,
      `flowb_admins?user_id=eq.${encodeURIComponent(userId)}&select=user_id,permissions&limit=1`,
    );
    const row = rows?.[0] ?? null;
    cache.set(userId, { row, expiry: now + CACHE_TTL_MS });
    return matchPermission(row, permission);
  } catch (err) {
    log.warn("[admin]", "DB lookup failed, falling back to env var", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Fallback to env var
  const envIds = (process.env.FIFLOW_ADMIN_IDS || process.env.ADMIN_USER_IDS || "")
    .split(",")
    .filter(Boolean);
  return envIds.includes(userId);
}

function matchPermission(row: AdminRow | null, permission?: string): boolean {
  if (!row) return false;
  if (!permission) return true;
  const perms = row.permissions ?? [];
  return perms.includes("*") || perms.includes(permission);
}
