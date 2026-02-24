/**
 * SocialB Poller — Background polling fallback
 *
 * Runs every 2 minutes, checks for new casts from enabled SocialB users
 * via Neynar feed API, and feeds them to the repost engine.
 */

import { log, fireAndForget } from "../utils/logger.js";
import { sbQuery, sbPatch } from "../utils/supabase.js";
import type { SocialPluginConfig } from "../plugins/social/types.js";
import type { SocialBConfig, NeynarCast } from "../plugins/social/socialb-types.js";
import { handleNewCast } from "./socialb-repost.js";

const POLL_INTERVAL = 2 * 60 * 1000; // 2 minutes
const NEYNAR_API = "https://api.neynar.com/v2/farcaster";

let pollTimer: ReturnType<typeof setInterval> | null = null;
let socialCfg: SocialPluginConfig | null = null;
let neynarApiKey: string | null = null;
let awardPointsFn: ((userId: string, platform: string, action: string) => Promise<any>) | null = null;

// ============================================================================
// Lifecycle
// ============================================================================

export function startSocialBPoller(
  cfg: SocialPluginConfig,
  neynarKey: string,
  awardPoints: (userId: string, platform: string, action: string) => Promise<any>,
): void {
  if (pollTimer) return;

  socialCfg = cfg;
  neynarApiKey = neynarKey;
  awardPointsFn = awardPoints;

  pollTimer = setInterval(() => {
    fireAndForget(pollAllUsers(), "socialb-poll");
  }, POLL_INTERVAL);

  // Initial poll after 60s to let server start
  setTimeout(() => {
    fireAndForget(pollAllUsers(), "socialb-poll-initial");
  }, 60_000);

  log.info("[socialb]", "Poller started (every 2min)");
}

export function stopSocialBPoller(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    log.info("[socialb]", "Poller stopped");
  }
}

// ============================================================================
// Poll All Users
// ============================================================================

async function pollAllUsers(): Promise<void> {
  if (!socialCfg || !neynarApiKey) return;

  const configs = await sbQuery<SocialBConfig[]>(socialCfg, "flowb_socialb_configs", {
    select: "*",
    enabled: "eq.true",
  });

  if (!configs?.length) return;

  log.info("[socialb]", `Polling ${configs.length} active users`);

  for (const config of configs) {
    try {
      await pollUser(config);
    } catch (err) {
      log.error("[socialb]", `Poll error for FID ${config.farcaster_fid}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

// ============================================================================
// Poll Single User
// ============================================================================

async function pollUser(config: SocialBConfig): Promise<void> {
  if (!socialCfg || !neynarApiKey) return;

  const casts = await fetchUserCasts(config.farcaster_fid);
  if (!casts?.length) return;

  // Filter to casts newer than last_cast_hash
  let newCasts = casts;
  if (config.last_cast_hash) {
    const lastIdx = casts.findIndex((c) => c.hash === config.last_cast_hash);
    if (lastIdx >= 0) {
      newCasts = casts.slice(0, lastIdx);
    }
    // If not found, process all (might have missed some)
  }

  if (!newCasts.length) return;

  log.info("[socialb]", `Found ${newCasts.length} new casts for FID ${config.farcaster_fid}`);

  // Process newest first (casts come newest-first from API)
  for (const cast of newCasts.reverse()) {
    const result = await handleNewCast(cast, config, socialCfg);
    if (result.success && awardPointsFn) {
      const platform = config.user_id.startsWith("farcaster_") ? "farcaster" : "telegram";
      fireAndForget(awardPointsFn(config.user_id, platform, "socialb_repost"), "socialb-points");
    }
  }

  // Update last_cast_hash to newest
  await sbPatch(socialCfg, "flowb_socialb_configs", { id: `eq.${config.id}` }, {
    last_cast_hash: casts[0].hash,
    updated_at: new Date().toISOString(),
  });
}

// ============================================================================
// Neynar Feed Fetch
// ============================================================================

async function fetchUserCasts(fid: number): Promise<NeynarCast[]> {
  if (!neynarApiKey) return [];

  try {
    const res = await fetch(
      `${NEYNAR_API}/feed/user/${fid}?limit=5&include_replies=false`,
      {
        headers: {
          "x-api-key": neynarApiKey,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!res.ok) {
      log.warn("[socialb]", `Neynar feed error: ${res.status}`, { fid });
      return [];
    }

    const data = await res.json();
    return (data.casts || []) as NeynarCast[];
  } catch (err) {
    log.error("[socialb]", `Neynar fetch error for FID ${fid}`, {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
