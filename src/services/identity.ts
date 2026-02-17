/**
 * Cross-Platform Identity Resolution Service
 *
 * Links users across Telegram, Farcaster, and Web (Privy) so that
 * a user who RSVPs on one platform is visible to friends on another.
 */

interface SbConfig { supabaseUrl: string; supabaseKey: string }

interface IdentityRow {
  id: string;
  canonical_id: string;
  platform: string;
  platform_user_id: string;
  privy_id?: string;
  display_name?: string;
  avatar_url?: string;
}

/**
 * Resolve the canonical user ID for a given platform user ID.
 *
 * 1. Check flowb_identities for existing mapping
 * 2. If found -> return canonical_id
 * 3. If not -> check Privy for linked accounts
 * 4. If Privy has links -> create identity rows for all, return shared canonical_id
 * 5. If no links -> create single identity row, canonical_id = platformUserId
 */
export async function resolveCanonicalId(
  cfg: SbConfig,
  platformUserId: string,
  opts?: { displayName?: string; avatarUrl?: string },
): Promise<string> {
  // 1. Check existing mapping
  const existing = await sbQuery<IdentityRow[]>(
    cfg,
    `flowb_identities?platform_user_id=eq.${encodeURIComponent(platformUserId)}&select=canonical_id&limit=1`,
  );

  if (existing?.length) {
    return existing[0].canonical_id;
  }

  // 2. Determine platform from user ID prefix
  const platform = detectPlatform(platformUserId);

  // 3. Try Privy lookup for cross-platform links
  const privyLinks = await lookupPrivyLinks(platformUserId, platform);

  if (privyLinks && privyLinks.linkedIds.length > 0) {
    // Check if any linked ID already has a canonical_id
    const allIds = [platformUserId, ...privyLinks.linkedIds];
    for (const lid of allIds) {
      const match = await sbQuery<IdentityRow[]>(
        cfg,
        `flowb_identities?platform_user_id=eq.${encodeURIComponent(lid)}&select=canonical_id&limit=1`,
      );
      if (match?.length) {
        // Use existing canonical_id, create missing rows
        const canonicalId = match[0].canonical_id;
        await ensureIdentityRow(cfg, canonicalId, platformUserId, platform, privyLinks.privyId, opts);
        return canonicalId;
      }
    }

    // No existing canonical_id for any linked account - create new
    const canonicalId = platformUserId;
    await ensureIdentityRow(cfg, canonicalId, platformUserId, platform, privyLinks.privyId, opts);

    // Create rows for linked accounts too
    for (const lid of privyLinks.linkedIds) {
      const lPlatform = detectPlatform(lid);
      await ensureIdentityRow(cfg, canonicalId, lid, lPlatform, privyLinks.privyId);
    }

    return canonicalId;
  }

  // 4. No Privy links - create standalone identity
  const canonicalId = platformUserId;
  await ensureIdentityRow(cfg, canonicalId, platformUserId, platform, undefined, opts);
  return canonicalId;
}

/**
 * Get all platform user IDs for a canonical user (for cross-platform queries).
 */
export async function getLinkedIds(cfg: SbConfig, canonicalId: string): Promise<string[]> {
  const rows = await sbQuery<IdentityRow[]>(
    cfg,
    `flowb_identities?canonical_id=eq.${encodeURIComponent(canonicalId)}&select=platform_user_id`,
  );
  return (rows || []).map(r => r.platform_user_id);
}

// ============================================================================
// Internal helpers
// ============================================================================

function detectPlatform(userId: string): string {
  if (userId.startsWith("telegram_")) return "telegram";
  if (userId.startsWith("farcaster_")) return "farcaster";
  if (userId.startsWith("web_")) return "web";
  return "web";
}

async function ensureIdentityRow(
  cfg: SbConfig,
  canonicalId: string,
  platformUserId: string,
  platform: string,
  privyId?: string,
  opts?: { displayName?: string; avatarUrl?: string },
): Promise<void> {
  try {
    await fetch(`${cfg.supabaseUrl}/rest/v1/flowb_identities`, {
      method: "POST",
      headers: {
        apikey: cfg.supabaseKey,
        Authorization: `Bearer ${cfg.supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal,resolution=merge-duplicates",
      },
      body: JSON.stringify({
        canonical_id: canonicalId,
        platform,
        platform_user_id: platformUserId,
        privy_id: privyId || null,
        display_name: opts?.displayName || null,
        avatar_url: opts?.avatarUrl || null,
      }),
    });
  } catch {
    // Non-critical - identity linking is best-effort
  }
}

interface PrivyLinkResult {
  privyId: string;
  linkedIds: string[];
}

async function lookupPrivyLinks(
  platformUserId: string,
  platform: string,
): Promise<PrivyLinkResult | null> {
  const privyAppId = process.env.PRIVY_APP_ID;
  const privyAppSecret = process.env.PRIVY_APP_SECRET;
  if (!privyAppId || !privyAppSecret) return null;

  try {
    // Search Privy for user by their platform identifier
    let searchField: string;
    let searchValue: string;

    if (platform === "telegram") {
      searchField = "telegram";
      searchValue = platformUserId.replace("telegram_", "");
    } else if (platform === "farcaster") {
      searchField = "farcaster";
      searchValue = platformUserId.replace("farcaster_", "");
    } else if (platform === "web") {
      // Web users are already Privy users
      const did = platformUserId.replace("web_", "");
      return await getPrivyLinkedAccounts(did, privyAppId, privyAppSecret);
    } else {
      return null;
    }

    // Search Privy users by linked account
    const basicAuth = Buffer.from(`${privyAppId}:${privyAppSecret}`).toString("base64");
    const res = await fetch("https://auth.privy.io/api/v1/users/search", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "privy-app-id": privyAppId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: {
          [searchField]: { subject: searchValue },
        },
        limit: 1,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json() as any;
    const user = data?.data?.[0];
    if (!user) return null;

    return extractLinkedIds(user, platformUserId);
  } catch {
    return null;
  }
}

async function getPrivyLinkedAccounts(
  did: string,
  appId: string,
  appSecret: string,
): Promise<PrivyLinkResult | null> {
  try {
    const basicAuth = Buffer.from(`${appId}:${appSecret}`).toString("base64");
    const res = await fetch(`https://auth.privy.io/api/v1/users/${encodeURIComponent(did)}`, {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "privy-app-id": appId,
      },
    });

    if (!res.ok) return null;
    const user = await res.json() as any;
    return extractLinkedIds(user, `web_${did}`);
  } catch {
    return null;
  }
}

function extractLinkedIds(privyUser: any, excludeUserId: string): PrivyLinkResult | null {
  const linkedIds: string[] = [];
  const privyId = privyUser.id || privyUser.did;

  for (const account of privyUser.linked_accounts || []) {
    if (account.type === "telegram" && account.telegram_user_id) {
      const id = `telegram_${account.telegram_user_id}`;
      if (id !== excludeUserId) linkedIds.push(id);
    }
    if (account.type === "farcaster" && account.fid) {
      const id = `farcaster_${account.fid}`;
      if (id !== excludeUserId) linkedIds.push(id);
    }
  }

  // Add the web/privy ID itself
  if (privyId) {
    const webId = `web_${privyId}`;
    if (webId !== excludeUserId) linkedIds.push(webId);
  }

  if (!linkedIds.length) return null;
  return { privyId, linkedIds };
}

async function sbQuery<T>(cfg: SbConfig, path: string): Promise<T | null> {
  try {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${path}`, {
      headers: {
        apikey: cfg.supabaseKey,
        Authorization: `Bearer ${cfg.supabaseKey}`,
      },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}
