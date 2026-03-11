import { sbFetch, type SbConfig } from "../utils/supabase.js";

/**
 * Cross-Platform Identity Resolution Service
 *
 * Links users across Telegram, Farcaster, and Web (Privy) so that
 * a user who RSVPs on one platform is visible to friends on another.
 */

interface IdentityRow {
  id: string;
  canonical_id: string;
  platform: string;
  platform_user_id: string;
  privy_id?: string;
  supabase_uid?: string;
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
  const existing = await sbFetch<IdentityRow[]>(
    cfg,
    `flowb_identities?platform_user_id=eq.${encodeURIComponent(platformUserId)}&select=canonical_id&limit=1`,
  );

  if (existing?.length) {
    return existing[0].canonical_id;
  }

  // 2. Determine platform from user ID prefix
  const platform = detectPlatform(platformUserId);

  // 2.5. Try local passport lookup (Supabase Auth) before Privy
  const passportLinks = await lookupPassportLinks(cfg, platformUserId);
  if (passportLinks && passportLinks.linkedIds.length > 0) {
    const canonicalId = platformUserId;
    await ensureIdentityRow(cfg, canonicalId, platformUserId, platform, undefined, opts);
    for (const lid of passportLinks.linkedIds) {
      const lPlatform = detectPlatform(lid);
      await ensureIdentityRow(cfg, canonicalId, lid, lPlatform);
    }
    return canonicalId;
  }

  // 3. Try Privy lookup for cross-platform links (legacy, dual mode)
  const privyLinks = await lookupPrivyLinks(platformUserId, platform);

  if (privyLinks && privyLinks.linkedIds.length > 0) {
    // Check if any linked ID already has a canonical_id
    const allIds = [platformUserId, ...privyLinks.linkedIds];
    for (const lid of allIds) {
      const match = await sbFetch<IdentityRow[]>(
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
  const rows = await sbFetch<IdentityRow[]>(
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
  if (userId.startsWith("whatsapp_")) return "whatsapp";
  if (userId.startsWith("signal_")) return "signal";
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

interface PassportLinkResult {
  supabaseUid: string;
  linkedIds: string[];
}

/**
 * Look up linked identities via flowb_passport + flowb_identities (local, no external API).
 */
async function lookupPassportLinks(
  cfg: SbConfig,
  platformUserId: string,
): Promise<PassportLinkResult | null> {
  try {
    // Check if this platform user has a supabase_uid in flowb_identities
    const rows = await sbFetch<{ supabase_uid: string }[]>(
      cfg,
      `flowb_identities?platform_user_id=eq.${encodeURIComponent(platformUserId)}&select=supabase_uid&limit=1`,
    );
    const supabaseUid = rows?.[0]?.supabase_uid;
    if (!supabaseUid) return null;

    // Find all other platform_user_ids with the same supabase_uid
    const linked = await sbFetch<{ platform_user_id: string }[]>(
      cfg,
      `flowb_identities?supabase_uid=eq.${supabaseUid}&select=platform_user_id`,
    );
    const linkedIds = (linked || [])
      .map((r) => r.platform_user_id)
      .filter((id) => id !== platformUserId);

    if (!linkedIds.length) return null;
    return { supabaseUid, linkedIds };
  } catch {
    return null;
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
    } else if (platform === "whatsapp") {
      searchField = "phone";
      searchValue = "+" + platformUserId.replace("whatsapp_", "");
    } else if (platform === "signal") {
      searchField = "phone";
      searchValue = "+" + platformUserId.replace("signal_", "");
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
    if (account.type === "phone" && account.phone_number) {
      const phone = account.phone_number.replace("+", "");
      const waId = `whatsapp_${phone}`;
      if (waId !== excludeUserId) linkedIds.push(waId);
      const sigId = `signal_${phone}`;
      if (sigId !== excludeUserId) linkedIds.push(sigId);
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
