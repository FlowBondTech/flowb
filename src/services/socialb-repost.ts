/**
 * SocialB Repost Engine
 *
 * Handles the full pipeline: cast received -> content adapted ->
 * media uploaded -> posted to all connected platforms via Postiz.
 */

import { log } from "../utils/logger.js";
import { sbQuery, sbInsert, sbPatch, type SbConfig } from "../utils/supabase.js";
import { PostizClient } from "../plugins/social/postiz-client.js";
import { decrypt } from "../plugins/social/crypto.js";
import type { SocialBConfig, NeynarCast } from "../plugins/social/socialb-types.js";
import { PLATFORM_CHAR_LIMITS, TIER_LIMITS } from "../plugins/social/socialb-types.js";
import type { SocialPluginConfig } from "../plugins/social/types.js";

// ============================================================================
// Core Repost Handler
// ============================================================================

export async function handleNewCast(
  cast: NeynarCast,
  config: SocialBConfig,
  socialCfg: SocialPluginConfig,
): Promise<{ success: boolean; platforms: string[]; error?: string }> {
  // Check if should repost
  const skipReason = shouldSkipCast(cast, config);
  if (skipReason) {
    log.info("[socialb]", `Skipping cast ${cast.hash}: ${skipReason}`);
    return { success: false, platforms: [], error: skipReason };
  }

  // Reset daily counter if needed
  await resetDailyCounterIfNeeded(config, socialCfg);

  // Check daily limit
  const limit = config.tier === "pro"
    ? TIER_LIMITS.pro.reposts_per_day
    : TIER_LIMITS.free.reposts_per_day;
  if (config.posts_today >= limit) {
    return { success: false, platforms: [], error: "Daily repost limit reached" };
  }

  // Check dedup — skip if already reposted this cast
  const existing = await sbQuery<any[]>(socialCfg, "flowb_socialb_activity", {
    select: "id",
    config_id: `eq.${config.id}`,
    cast_hash: `eq.${cast.hash}`,
    limit: "1",
  });
  if (existing?.length) {
    return { success: false, platforms: [], error: "Cast already reposted" };
  }

  // Get Postiz client for this org
  const client = await getOrgClient(socialCfg, config.org_id);
  if (!client) {
    return { success: false, platforms: [], error: "Failed to get Postiz client" };
  }

  // Get integrations to map platform names to IDs
  const integrations = await client.listIntegrations();
  const targetIntegrations = integrations.filter(
    (i) =>
      !i.disabled &&
      (config.platforms.includes(i.type.toLowerCase()) ||
        config.platforms.includes(i.providerIdentifier?.toLowerCase())),
  );

  if (!targetIntegrations.length) {
    return { success: false, platforms: [], error: "No matching integrations found" };
  }

  const platformsAttempted = targetIntegrations.map((i) => i.type.toLowerCase());
  const platformsSucceeded: string[] = [];
  const platformsFailed: string[] = [];

  // Upload media if configured
  let mediaIds: string[] | undefined;
  if (config.auto_media && cast.embeds?.length) {
    mediaIds = await extractAndUploadMedia(cast.embeds, client);
  }

  // Post to each platform with adapted content
  let socialPostId: string | null = null;
  try {
    // Batch: create one Postiz post targeting all integrations
    const integrationIds = targetIntegrations.map((i) => i.id);

    // Adapt content for the most restrictive platform
    const minLimit = Math.min(
      ...platformsAttempted.map((p) => PLATFORM_CHAR_LIMITS[p] || 5000),
    );
    const adaptedText = adaptContent(cast.text, minLimit);

    const post = await client.createPost(integrationIds, adaptedText, mediaIds);
    if (post) {
      socialPostId = post.id;
      platformsSucceeded.push(...platformsAttempted);
    } else {
      platformsFailed.push(...platformsAttempted);
    }
  } catch (err) {
    log.error("[socialb]", "Post creation failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    platformsFailed.push(...platformsAttempted);
  }

  // Record in flowb_social_posts for tracking
  let flowbPostId: string | null = null;
  if (socialPostId) {
    const record = await sbInsert<any>(socialCfg, "flowb_social_posts", {
      org_id: config.org_id,
      user_id: config.user_id,
      postiz_post_id: socialPostId,
      text: cast.text,
      media_urls: "[]",
      platforms: platformsSucceeded,
      status: "published",
      published_at: new Date().toISOString(),
      metadata: { source: "socialb", cast_hash: cast.hash },
    });
    flowbPostId = record?.id || null;
  }

  // Log activity
  await sbInsert(socialCfg, "flowb_socialb_activity", {
    config_id: config.id,
    user_id: config.user_id,
    cast_hash: cast.hash,
    cast_text: cast.text.slice(0, 500),
    platforms_attempted: platformsAttempted,
    platforms_succeeded: platformsSucceeded,
    platforms_failed: platformsFailed,
    social_post_id: flowbPostId,
    error_message: platformsFailed.length ? "Some platforms failed" : null,
  });

  // Increment daily counter
  await sbPatch(socialCfg, "flowb_socialb_configs", { id: `eq.${config.id}` }, {
    posts_today: config.posts_today + 1,
    last_cast_hash: cast.hash,
    updated_at: new Date().toISOString(),
  });

  return {
    success: platformsSucceeded.length > 0,
    platforms: platformsSucceeded,
    error: platformsFailed.length
      ? `Failed on: ${platformsFailed.join(", ")}`
      : undefined,
  };
}

// ============================================================================
// Content Adaptation
// ============================================================================

export function adaptContent(text: string, charLimit: number): string {
  const attribution = "\n\nvia Farcaster";
  const maxTextLen = charLimit - attribution.length;

  let adapted = text;
  if (adapted.length > maxTextLen) {
    adapted = adapted.slice(0, maxTextLen - 3) + "...";
  }

  return adapted + attribution;
}

// ============================================================================
// Media Extraction & Upload
// ============================================================================

async function extractAndUploadMedia(
  embeds: NeynarCast["embeds"],
  client: PostizClient,
): Promise<string[]> {
  const imageUrls = embeds
    .filter((e) => {
      if (!e.url) return false;
      const ct = e.metadata?.content_type || "";
      return (
        ct.startsWith("image/") ||
        /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(e.url)
      );
    })
    .map((e) => e.url!)
    .slice(0, 4); // Max 4 images

  if (!imageUrls.length) return [];

  const results = await Promise.all(
    imageUrls.map((url) => client.uploadMediaFromUrl(url)),
  );

  return results.filter(Boolean).map((m) => m!.id);
}

// ============================================================================
// Filtering
// ============================================================================

function shouldSkipCast(cast: NeynarCast, config: SocialBConfig): string | null {
  if (config.exclude_replies && cast.parent_hash) {
    return "reply";
  }
  // Recasts typically don't have parent_hash but have specific embed patterns
  // Check if it's a "recast" by looking at text starting with "RT" or empty text with embeds
  if (config.exclude_recasts && !cast.text.trim()) {
    return "recast (empty text)";
  }
  if (!cast.text.trim()) {
    return "empty cast";
  }
  return null;
}

// ============================================================================
// Helpers
// ============================================================================

async function getOrgClient(
  cfg: SocialPluginConfig,
  orgId: string,
): Promise<PostizClient | null> {
  const orgs = await sbQuery<any[]>(cfg, "flowb_social_orgs", {
    select: "postiz_api_key_enc",
    id: `eq.${orgId}`,
    is_active: "eq.true",
    limit: "1",
  });

  if (!orgs?.length) return null;

  const apiKey = decrypt(orgs[0].postiz_api_key_enc, cfg.encryptionKey);
  return new PostizClient(cfg.postizBaseUrl, apiKey);
}

async function resetDailyCounterIfNeeded(
  config: SocialBConfig,
  cfg: SbConfig,
): Promise<void> {
  const resetDate = new Date(config.posts_today_reset);
  const now = new Date();

  // Reset if the last reset was before today (UTC)
  if (resetDate.toISOString().slice(0, 10) < now.toISOString().slice(0, 10)) {
    await sbPatch(cfg, "flowb_socialb_configs", { id: `eq.${config.id}` }, {
      posts_today: 0,
      chat_queries_today: 0,
      posts_today_reset: now.toISOString(),
    });
    config.posts_today = 0;
    config.chat_queries_today = 0;
  }
}
