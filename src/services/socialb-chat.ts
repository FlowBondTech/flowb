/**
 * SocialB AI Chat Service
 *
 * Claude-powered chat for custom social posting flows.
 * Users can say things like "Post my last cast to LinkedIn" or
 * "Schedule my top cast to Twitter at 5pm".
 */

import { log } from "../utils/logger.js";
import { sbQuery, sbPatch, type SbConfig } from "../utils/supabase.js";
import type { SocialPluginConfig } from "../plugins/social/types.js";
import type { SocialBConfig } from "../plugins/social/socialb-types.js";
import { TIER_LIMITS } from "../plugins/social/socialb-types.js";
import { handleNewCast } from "./socialb-repost.js";
import { PostizClient } from "../plugins/social/postiz-client.js";
import { decrypt } from "../plugins/social/crypto.js";

// ============================================================================
// Types
// ============================================================================

interface ChatContext {
  config: SocialBConfig;
  socialCfg: SocialPluginConfig;
  neynarApiKey: string;
}

interface ChatResult {
  reply: string;
  action?: string;
}

// ============================================================================
// Tool Definitions (Claude function calling format)
// ============================================================================

const TOOLS = [
  {
    name: "post_now",
    description: "Post content to selected platforms immediately",
    input_schema: {
      type: "object" as const,
      properties: {
        text: { type: "string", description: "The text to post" },
        platforms: {
          type: "array",
          items: { type: "string" },
          description: "Platform names: twitter, linkedin, instagram, threads, bluesky, etc.",
        },
      },
      required: ["text", "platforms"],
    },
  },
  {
    name: "schedule_post",
    description: "Schedule a post for a specific time",
    input_schema: {
      type: "object" as const,
      properties: {
        text: { type: "string", description: "The text to post" },
        platforms: {
          type: "array",
          items: { type: "string" },
          description: "Platform names",
        },
        scheduled_at: { type: "string", description: "ISO 8601 datetime for when to post" },
      },
      required: ["text", "platforms", "scheduled_at"],
    },
  },
  {
    name: "update_config",
    description: "Update the user's SocialB auto-repost settings",
    input_schema: {
      type: "object" as const,
      properties: {
        enabled: { type: "boolean", description: "Turn auto-repost on/off" },
        platforms: {
          type: "array",
          items: { type: "string" },
          description: "Platforms to auto-repost to",
        },
        exclude_replies: { type: "boolean" },
        exclude_recasts: { type: "boolean" },
        daily_limit: { type: "number", description: "Max reposts per day (0=unlimited)" },
      },
    },
  },
  {
    name: "fetch_recent_casts",
    description: "Get the user's recent Farcaster casts",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Number of casts to fetch (1-10, default 5)" },
      },
    },
  },
  {
    name: "get_accounts",
    description: "List the user's connected social media accounts",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_activity",
    description: "Get recent SocialB repost activity log",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Number of entries (default 10)" },
      },
    },
  },
];

// ============================================================================
// Main Chat Handler
// ============================================================================

export async function handleSocialBChat(
  userId: string,
  message: string,
  ctx: ChatContext,
): Promise<ChatResult> {
  const { config, socialCfg, neynarApiKey } = ctx;

  // Rate limit check
  const limit = config.tier === "pro"
    ? TIER_LIMITS.pro.chat_queries_per_day
    : TIER_LIMITS.free.chat_queries_per_day;

  // Reset daily counter if needed
  const resetDate = new Date(config.posts_today_reset);
  const now = new Date();
  if (resetDate.toISOString().slice(0, 10) < now.toISOString().slice(0, 10)) {
    await sbPatch(socialCfg, "flowb_socialb_configs", { id: `eq.${config.id}` }, {
      chat_queries_today: 0,
      posts_today_reset: now.toISOString(),
    });
    config.chat_queries_today = 0;
  }

  if (config.chat_queries_today >= limit) {
    return {
      reply: `You've reached your daily chat limit (${limit} queries). Upgrade to Pro for unlimited access.`,
    };
  }

  // Increment chat counter
  await sbPatch(socialCfg, "flowb_socialb_configs", { id: `eq.${config.id}` }, {
    chat_queries_today: config.chat_queries_today + 1,
  });

  // Build system prompt
  const systemPrompt = buildSystemPrompt(config);

  // Call Claude API
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { reply: "AI chat is not configured. Please set ANTHROPIC_API_KEY." };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1024,
        system: systemPrompt,
        tools: TOOLS,
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      log.error("[socialb-chat]", `Claude API error: ${response.status}`, { body: errText.slice(0, 200) });
      return { reply: "AI service is temporarily unavailable. Try again in a moment." };
    }

    const data = await response.json();
    return await processClaudeResponse(data, ctx, neynarApiKey);
  } catch (err) {
    log.error("[socialb-chat]", "Chat error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { reply: "Something went wrong. Please try again." };
  }
}

// ============================================================================
// Process Claude Response (handle tool calls)
// ============================================================================

async function processClaudeResponse(
  data: any,
  ctx: ChatContext,
  neynarApiKey: string,
): Promise<ChatResult> {
  const content = data.content || [];

  // If no tool use, return the text response
  const textBlocks = content.filter((b: any) => b.type === "text");
  const toolBlocks = content.filter((b: any) => b.type === "tool_use");

  if (!toolBlocks.length) {
    return { reply: textBlocks.map((b: any) => b.text).join("\n") || "I'm not sure how to help with that." };
  }

  // Execute tool calls
  const results: string[] = [];
  for (const tool of toolBlocks) {
    const result = await executeTool(tool.name, tool.input, ctx, neynarApiKey);
    results.push(result);
  }

  // If there was also text, prepend it
  const textPart = textBlocks.map((b: any) => b.text).join("\n");
  const toolPart = results.join("\n");

  return {
    reply: textPart ? `${textPart}\n\n${toolPart}` : toolPart,
    action: toolBlocks[0]?.name,
  };
}

// ============================================================================
// Tool Executors
// ============================================================================

async function executeTool(
  name: string,
  input: any,
  ctx: ChatContext,
  neynarApiKey: string,
): Promise<string> {
  const { config, socialCfg } = ctx;

  switch (name) {
    case "post_now":
      return postNow(input, config, socialCfg);

    case "schedule_post":
      return schedulePost(input, config, socialCfg);

    case "update_config":
      return updateConfig(input, config, socialCfg);

    case "fetch_recent_casts":
      return fetchRecentCasts(input, config, neynarApiKey);

    case "get_accounts":
      return getAccounts(config, socialCfg);

    case "get_activity":
      return getActivity(input, config, socialCfg);

    default:
      return `Unknown action: ${name}`;
  }
}

async function postNow(
  input: { text: string; platforms: string[] },
  config: SocialBConfig,
  socialCfg: SocialPluginConfig,
): Promise<string> {
  const client = await getOrgClient(socialCfg, config.org_id);
  if (!client) return "Failed to connect to posting service.";

  const integrations = await client.listIntegrations();
  const ids = integrations
    .filter((i) => !i.disabled && input.platforms.includes(i.type.toLowerCase()))
    .map((i) => i.id);

  if (!ids.length) return `No connected accounts for: ${input.platforms.join(", ")}`;

  const post = await client.createPost(ids, input.text);
  if (!post) return "Failed to create post. Try again.";

  return `Posted to ${input.platforms.join(", ")}!`;
}

async function schedulePost(
  input: { text: string; platforms: string[]; scheduled_at: string },
  config: SocialBConfig,
  socialCfg: SocialPluginConfig,
): Promise<string> {
  const client = await getOrgClient(socialCfg, config.org_id);
  if (!client) return "Failed to connect to posting service.";

  const integrations = await client.listIntegrations();
  const ids = integrations
    .filter((i) => !i.disabled && input.platforms.includes(i.type.toLowerCase()))
    .map((i) => i.id);

  if (!ids.length) return `No connected accounts for: ${input.platforms.join(", ")}`;

  const post = await client.createPost(ids, input.text, undefined, input.scheduled_at);
  if (!post) return "Failed to schedule post.";

  const time = new Date(input.scheduled_at).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `Scheduled for ${time} on ${input.platforms.join(", ")}!`;
}

async function updateConfig(
  input: Record<string, any>,
  config: SocialBConfig,
  socialCfg: SocialPluginConfig,
): Promise<string> {
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  const changes: string[] = [];

  if (input.enabled !== undefined) {
    updates.enabled = input.enabled;
    changes.push(`Auto-repost ${input.enabled ? "enabled" : "disabled"}`);
  }
  if (input.platforms) {
    updates.platforms = input.platforms;
    changes.push(`Platforms: ${input.platforms.join(", ")}`);
  }
  if (input.exclude_replies !== undefined) {
    updates.exclude_replies = input.exclude_replies;
    changes.push(`Skip replies: ${input.exclude_replies ? "yes" : "no"}`);
  }
  if (input.exclude_recasts !== undefined) {
    updates.exclude_recasts = input.exclude_recasts;
    changes.push(`Skip recasts: ${input.exclude_recasts ? "yes" : "no"}`);
  }
  if (input.daily_limit !== undefined) {
    updates.daily_limit = input.daily_limit;
    changes.push(`Daily limit: ${input.daily_limit || "unlimited"}`);
  }

  await sbPatch(socialCfg, "flowb_socialb_configs", { id: `eq.${config.id}` }, updates);

  return changes.length
    ? `Settings updated:\n${changes.map((c) => `- ${c}`).join("\n")}`
    : "No changes made.";
}

async function fetchRecentCasts(
  input: { limit?: number },
  config: SocialBConfig,
  neynarApiKey: string,
): Promise<string> {
  const limit = Math.min(input.limit || 5, 10);

  try {
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/feed/user/${config.farcaster_fid}?limit=${limit}&include_replies=false`,
      {
        headers: { "x-api-key": neynarApiKey },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!res.ok) return "Couldn't fetch casts right now.";
    const data = await res.json();
    const casts = data.casts || [];

    if (!casts.length) return "No recent casts found.";

    return casts
      .map((c: any, i: number) => {
        const time = new Date(c.timestamp).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
        const text = c.text.length > 100 ? c.text.slice(0, 100) + "..." : c.text;
        return `${i + 1}. ${text} (${time}, ${c.reactions?.likes_count || 0} likes)`;
      })
      .join("\n");
  } catch {
    return "Couldn't fetch casts right now.";
  }
}

async function getAccounts(
  config: SocialBConfig,
  socialCfg: SocialPluginConfig,
): Promise<string> {
  const client = await getOrgClient(socialCfg, config.org_id);
  if (!client) return "Failed to connect to posting service.";

  const integrations = await client.listIntegrations();
  const active = integrations.filter((i) => !i.disabled);

  if (!active.length) return "No connected accounts. Connect platforms in your social settings.";

  return active
    .map((i) => `- ${i.type}: ${i.name || i.identifier}`)
    .join("\n");
}

async function getActivity(
  input: { limit?: number },
  config: SocialBConfig,
  socialCfg: SocialPluginConfig,
): Promise<string> {
  const limit = Math.min(input.limit || 10, 20);

  const activity = await sbQuery<any[]>(socialCfg, "flowb_socialb_activity", {
    select: "cast_text,platforms_succeeded,platforms_failed,created_at",
    config_id: `eq.${config.id}`,
    order: "created_at.desc",
    limit: String(limit),
  });

  if (!activity?.length) return "No repost activity yet.";

  return activity
    .map((a: any) => {
      const time = new Date(a.created_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      const text = (a.cast_text || "").slice(0, 60);
      const ok = (a.platforms_succeeded || []).join(",");
      const fail = (a.platforms_failed || []).length;
      return `${time}: "${text}..." -> ${ok}${fail ? ` (${fail} failed)` : ""}`;
    })
    .join("\n");
}

// ============================================================================
// Helpers
// ============================================================================

function buildSystemPrompt(config: SocialBConfig): string {
  return `You are SocialB, a social media assistant for FlowB.
You help users manage their auto-repost settings and create custom posting flows.

Current user config:
- Auto-repost: ${config.enabled ? "ON" : "OFF"}
- Platforms: ${config.platforms.length ? config.platforms.join(", ") : "none configured"}
- Tier: ${config.tier} (${config.tier === "free" ? "5 reposts/day" : "unlimited"})
- Posts today: ${config.posts_today}
- Skip replies: ${config.exclude_replies ? "yes" : "no"}
- Skip recasts: ${config.exclude_recasts ? "yes" : "no"}
- Daily limit: ${config.daily_limit || "unlimited"}

BEHAVIOR:
- Be concise and helpful.
- Use tools to take actions when the user requests them.
- When they ask to post something, use post_now or schedule_post.
- When they want to see their casts, use fetch_recent_casts.
- When they want to change settings, use update_config.
- Always confirm what you did after taking an action.`;
}

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
