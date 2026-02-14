/**
 * FlowB Telegram Bot (Grammy)
 *
 * Runs alongside the Fastify server in the same process.
 * Uses FlowBCore directly for event discovery and action routing.
 */

import { Bot, InlineKeyboard } from "grammy";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FlowBCore } from "../core/flowb.js";
import type { EventResult } from "../core/types.js";
import { PrivyClient } from "../services/privy.js";
import {
  formatEventCardsHtml,
  buildEventKeyboard,
  formatMenuHtml,
  buildMenuKeyboard,
  buildConnectKeyboard,
  buildCheckinKeyboard,
  buildDanceMoveKeyboard,
  formatVerifiedGreetingHtml,
  formatConnectPromptHtml,
  formatRewardsHtml,
  buildRewardsKeyboard,
  formatGroupWelcomeHtml,
  buildGroupWelcomeKeyboard,
  formatGroupRegisterHtml,
  buildGroupRegisterKeyboard,
  markdownToHtml,
  DANCE_MOVES,
  // Single-card browser
  formatEventCardHtml,
  buildEventCardKeyboard,
  buildCategoryFilterKeyboard,
  buildDateFilterKeyboard,
  getDateFilterLabel,
  filterEventsByDate,
  filterEventsByCategory,
  parseSearchIntent,
  // Flow
  formatFlowMenuHtml,
  buildFlowMenuKeyboard,
  formatFlowShareHtml,
  buildFlowShareKeyboard,
  formatFlowInviteAcceptedHtml,
  formatCrewJoinedHtml,
  formatCrewMenuHtml,
  buildCrewMenuKeyboard,
  buildCrewDetailKeyboard,
  buildGoingKeyboard,
  formatWhosGoingHtml,
  formatFlowAttendanceBadge,
  // Crew management
  formatCrewSettingsHtml,
  buildCrewSettingsKeyboard,
  formatCrewBrowseHtml,
  buildCrewBrowseKeyboard,
  formatJoinRequestHtml,
  buildJoinRequestKeyboard,
  // UX helpers
  formatVerifiedHookHtml,
  buildBackToMenuKeyboard,
  // Farcaster
  formatFarcasterMenuHtml,
  buildFarcasterMenuKeyboard,
} from "./cards.js";

const PAGE_SIZE = 3;
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MOD_BOT_USERNAME = process.env.FLOWB_BOT_USERNAME || "flow_b_bot";
const MOD_MINIAPP_URL = process.env.FLOWB_MINIAPP_URL || "";

interface TgSession {
  events: EventResult[];        // All fetched events (unfiltered)
  filteredEvents: EventResult[]; // Events after category + date filters
  cardIndex: number;             // Current card position in filteredEvents
  cardMessageId?: number;        // Message ID of the current card (for editing)
  categoryFilter: string;        // "all" | "social" | "class" | etc.
  dateFilter: string;            // "all" | "tonight" | "tomorrow" | etc.
  page: number;
  listType: string;
  query?: string;
  city?: string;
  style?: string;
  lastActive: number;
  privyId?: string;
  danzUsername?: string;
  verified: boolean;
  checkinEventId?: string;
  awaitingProofPhoto?: boolean;
  danceMoveForProof?: string;
}

const sessions = new Map<number, TgSession>();

// Supabase client for persistent session storage (survives restarts)
const supabase: SupabaseClient | null =
  process.env.DANZ_SUPABASE_URL && process.env.DANZ_SUPABASE_KEY
    ? createClient(process.env.DANZ_SUPABASE_URL, process.env.DANZ_SUPABASE_KEY)
    : null;

let sessionTableReady = false;

/** Check if flowb_sessions table exists, create if missing */
async function ensureSessionTable(): Promise<boolean> {
  if (sessionTableReady || !supabase) return sessionTableReady;
  try {
    const { error } = await supabase.from("flowb_sessions").select("user_id").limit(1);
    if (error && (error.message.includes("does not exist") || error.message.includes("Could not find"))) {
      // Try to create via raw REST (works with service role key)
      const url = process.env.DANZ_SUPABASE_URL!;
      const key = process.env.DANZ_SUPABASE_KEY!;
      const res = await fetch(`${url}/rest/v1/rpc/`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      });
      // If RPC endpoint doesn't help, log the SQL for manual creation
      console.warn("[flowb-telegram] flowb_sessions table not found. Create it with:");
      console.warn(`  CREATE TABLE flowb_sessions (user_id TEXT PRIMARY KEY, verified BOOLEAN NOT NULL DEFAULT FALSE, privy_id TEXT, danz_username TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());`);
      return false;
    }
    sessionTableReady = true;
    console.log("[flowb-telegram] Session persistence ready (flowb_sessions)");
  } catch (err) {
    console.warn("[flowb-telegram] Session table check failed, using in-memory only");
  }
  return sessionTableReady;
}

/** Load persistent session fields from Supabase */
async function loadPersistent(tgId: number): Promise<Partial<TgSession> | null> {
  if (!supabase || !sessionTableReady) return null;
  try {
    const { data } = await supabase
      .from("flowb_sessions")
      .select("verified,privy_id,danz_username")
      .eq("user_id", `telegram_${tgId}`)
      .single();
    if (data) {
      return {
        verified: data.verified ?? false,
        privyId: data.privy_id ?? undefined,
        danzUsername: data.danz_username ?? undefined,
      };
    }
  } catch {}
  return null;
}

/** Save persistent session fields to Supabase (fire-and-forget) */
function savePersistent(tgId: number, session: TgSession): void {
  if (!supabase || !sessionTableReady) return;
  supabase
    .from("flowb_sessions")
    .upsert({
      user_id: `telegram_${tgId}`,
      verified: session.verified,
      privy_id: session.privyId || null,
      danz_username: session.danzUsername || null,
      updated_at: new Date().toISOString(),
    })
    .then(({ error }: { error: any }) => {
      if (error) console.error("[flowb-telegram] Session save error:", error.message);
    });
}

function getSession(userId: number): TgSession | undefined {
  const s = sessions.get(userId);
  if (s && Date.now() - s.lastActive > SESSION_TTL_MS) {
    sessions.delete(userId);
    return undefined;
  }
  if (s) s.lastActive = Date.now();
  return s;
}

function setSession(userId: number, partial: Partial<TgSession>): TgSession {
  const existing = getSession(userId);
  const session: TgSession = {
    events: partial.events ?? existing?.events ?? [],
    filteredEvents: partial.filteredEvents ?? existing?.filteredEvents ?? [],
    cardIndex: partial.cardIndex ?? existing?.cardIndex ?? 0,
    cardMessageId: partial.cardMessageId ?? existing?.cardMessageId,
    categoryFilter: partial.categoryFilter ?? existing?.categoryFilter ?? "all",
    dateFilter: partial.dateFilter ?? existing?.dateFilter ?? "all",
    page: partial.page ?? existing?.page ?? 0,
    listType: partial.listType ?? existing?.listType ?? "events",
    query: partial.query ?? existing?.query,
    city: partial.city ?? existing?.city,
    style: partial.style ?? existing?.style,
    lastActive: Date.now(),
    privyId: partial.privyId ?? existing?.privyId,
    danzUsername: partial.danzUsername ?? existing?.danzUsername,
    verified: partial.verified ?? existing?.verified ?? false,
  };
  sessions.set(userId, session);

  // Persist to Supabase when identity/verification fields change
  if (session.verified && (
    partial.verified !== undefined ||
    partial.privyId !== undefined ||
    partial.danzUsername !== undefined
  )) {
    savePersistent(userId, session);
  }

  return session;
}

function userId(tgId: number): string {
  return `telegram_${tgId}`;
}

export function startTelegramBot(
  token: string,
  core: FlowBCore,
  privy?: PrivyClient,
): void {
  const bot = new Bot(token);
  const botUsername = process.env.FLOWB_BOT_USERNAME || "flow_b_bot";
  const miniAppUrl = process.env.FLOWB_MINIAPP_URL || "";
  // Prefer FlowB's own /connect page (serves Telegram Login Widget).
  // Falls back to external DANZ connect URL or localhost for dev.
  const danzConnectUrl =
    process.env.DANZ_CONNECT_URL ||
    process.env.FLOWB_CONNECT_URL ||
    `http://localhost:${process.env.PORT || "8080"}/connect`;

  // Check persistent session table on startup
  ensureSessionTable().catch(() => {});

  // ========================================================================
  // Privy auto-verify
  // ========================================================================

  async function ensureVerified(tgId: number): Promise<TgSession> {
    const existing = getSession(tgId);
    if (existing?.verified) return existing;

    // Strategy 0: Load from DB (survives restarts)
    const persisted = await loadPersistent(tgId);
    if (persisted?.verified) {
      console.log(`[flowb-telegram] Restored session from DB: ${persisted.danzUsername} (tg: ${tgId})`);
      return setSession(tgId, persisted);
    }

    // Strategy 1: Check Privy (if configured)
    if (privy) {
      try {
        const privyUser = await privy.lookupByTelegramId(String(tgId));
        if (privyUser) {
          const tgAccount = PrivyClient.getLinkedAccount(privyUser, "telegram");
          const danzUsername = tgAccount?.username || tgAccount?.first_name || "DANZer";

          const session = setSession(tgId, {
            verified: true,
            privyId: privyUser.id,
            danzUsername,
          });

          await core.awardPoints(userId(tgId), "telegram", "verification_complete");
          console.log(`[flowb-telegram] Auto-verified via Privy: ${danzUsername} (privy: ${privyUser.id})`);
          return session;
        }
      } catch (err) {
        console.error("[flowb-telegram] Privy lookup error:", err);
      }
    }

    // Strategy 2: Check pending_verifications (Telegram Login Widget flow)
    try {
      const verified = await core.checkTelegramVerification(String(tgId));
      if (verified) {
        const session = setSession(tgId, {
          verified: true,
          danzUsername: verified.username || verified.displayName || "DANZer",
        });

        await core.awardPoints(userId(tgId), "telegram", "verification_complete");
        console.log(`[flowb-telegram] Auto-verified via widget: ${session.danzUsername} (tg: ${tgId})`);
        return session;
      }
    } catch (err) {
      console.error("[flowb-telegram] Verification check error:", err);
    }

    return setSession(tgId, { verified: false });
  }

  // ========================================================================
  // Verification hook - send "Verified!" when user completes widget auth
  // ========================================================================

  core.onTelegramVerified(async (tgId, username) => {
    try {
      setSession(tgId, { verified: true, danzUsername: username });
      await bot.api.sendMessage(
        tgId,
        formatVerifiedHookHtml(username),
        { parse_mode: "HTML", reply_markup: buildMenuKeyboard(miniAppUrl || undefined) },
      );
      console.log(`[flowb-telegram] Sent Verified! to ${tgId} (${username})`);
    } catch (err) {
      console.error(`[flowb-telegram] Failed to send Verified! to ${tgId}:`, err);
    }
  });

  // ========================================================================
  // Commands
  // ========================================================================

  bot.command("start", async (ctx) => {
    const tgId = ctx.from!.id;
    const session = await ensureVerified(tgId);

    // Parse deep link arguments: /start ref_CODE, /start f_CODE, /start g_CODE, /start points
    const args = ctx.match?.trim();

    // --- Personal flow invite: f_{code} ---
    if (args?.startsWith("f_")) {
      const flowCode = args.slice(2);
      const flowPlugin = core.getFlowPlugin();
      const flowCfg = core.getFlowConfig();
      if (flowPlugin && flowCfg) {
        const result = await flowPlugin.flowAccept(flowCfg, userId(tgId), { action: "flow-accept", referral_code: flowCode });
        await ctx.reply(markdownToHtml(result), {
          parse_mode: "HTML",
          reply_markup: buildFlowMenuKeyboard(botUsername),
        });
        core.awardPoints(userId(tgId), "telegram", "flow_accepted").catch(() => {});
      }
      return;
    }

    // --- Group flow invite: g_{code} ---
    if (args?.startsWith("g_")) {
      const crewCode = args.slice(2);
      const flowPlugin = core.getFlowPlugin();
      const flowCfg = core.getFlowConfig();
      if (flowPlugin && flowCfg) {
        const result = await flowPlugin.crewJoin(flowCfg, userId(tgId), { action: "crew-join", referral_code: crewCode });
        // Check if the result is a JSON join_request_created
        if (result.includes('"join_request_created"')) {
          await handleJoinRequestCreated(result, core, flowPlugin, flowCfg, bot, tgId);
        } else {
          await ctx.reply(markdownToHtml(result), {
            parse_mode: "HTML",
            reply_markup: buildFlowMenuKeyboard(botUsername),
          });
        }
        core.awardPoints(userId(tgId), "telegram", "crew_joined").catch(() => {});
      }
      return;
    }

    // --- Personal tracked crew invite: gi_{code} ---
    if (args?.startsWith("gi_")) {
      const inviteCode = args.slice(3);
      const flowPlugin = core.getFlowPlugin();
      const flowCfg = core.getFlowConfig();
      if (flowPlugin && flowCfg) {
        const result = await flowPlugin.crewJoin(flowCfg, userId(tgId), { action: "crew-join", referral_code: inviteCode });

        if (result.includes('"join_request_created"')) {
          await handleJoinRequestCreated(result, core, flowPlugin, flowCfg, bot, tgId);
        } else {
          await ctx.reply(markdownToHtml(result), {
            parse_mode: "HTML",
            reply_markup: buildFlowMenuKeyboard(botUsername),
          });

          // Award points for joining + invite conversion
          core.awardPoints(userId(tgId), "telegram", "crew_joined").catch(() => {});

          // Track invite attribution
          const attr = flowPlugin._lastInviteAttribution;
          if (attr) {
            flowPlugin._lastInviteAttribution = null;
            // Determine inviter role for tiered rewards
            const inviterRole = await flowPlugin.getCrewRole(flowCfg, attr.inviterId, attr.groupId);
            const convertAction = inviterRole === "admin" || inviterRole === "creator"
              ? "crew_invite_converted_admin"
              : "crew_invite_converted";
            core.awardPoints(attr.inviterId, "telegram", convertAction).catch(() => {});
          }
        }
      }
      return;
    }

    if (args?.startsWith("ref_")) {
      const refCode = args.slice(4);
      core.awardPoints(userId(tgId), "telegram", "referral_signup", { referral_code: refCode }).catch(() => {});
    }
    if (args === "points") {
      // Deep link from group "Check Points" button -> show points directly
      await ensureVerified(tgId);
      await sendCoreAction(ctx, core, "my-points");
      return;
    }

    // Update daily streak
    const streakResult = await core.updateStreak(userId(tgId), "telegram");

    if (session.verified && session.danzUsername) {
      // Fetch current points for greeting
      const pointsResult = await core.execute("my-points", {
        action: "my-points",
        user_id: userId(tgId),
        platform: "telegram",
      });

      // Extract total from response (simple parse)
      const pointsMatch = pointsResult.match(/\*\*(\d+)\*\*/);
      const totalPoints = pointsMatch ? parseInt(pointsMatch[1], 10) : 0;

      await ctx.reply(
        formatVerifiedGreetingHtml(session.danzUsername, totalPoints, streakResult.streak),
        { parse_mode: "HTML", reply_markup: buildMenuKeyboard(miniAppUrl || undefined) },
      );
    } else {
      await ctx.reply(formatConnectPromptHtml(), {
        parse_mode: "HTML",
        reply_markup: buildConnectKeyboard(danzConnectUrl),
      });
    }
  });

  bot.command("menu", async (ctx) => {
    await ctx.reply(formatMenuHtml(), {
      parse_mode: "HTML",
      reply_markup: buildMenuKeyboard(miniAppUrl || undefined),
    });
  });

  bot.command("app", async (ctx) => {
    if (!miniAppUrl) {
      await ctx.reply("Mini app not configured yet. Try /menu for inline options.");
      return;
    }
    const kb = new InlineKeyboard().webApp("\u26a1 Open FlowB", miniAppUrl);
    await ctx.reply("Tap to open the full FlowB experience:", { reply_markup: kb });
  });

  bot.command("events", async (ctx) => {
    const tgId = ctx.from!.id;
    await ensureVerified(tgId);
    const args = ctx.match?.trim();
    // Parse intent from args (e.g. "/events salsa in Denver")
    if (args) {
      const intent = parseSearchIntent(args);
      await sendEventCards(ctx, core, {
        city: intent.city || args,
        style: intent.style,
        query: intent.query,
      });
    } else {
      await sendEventCards(ctx, core, {});
    }
  });

  bot.command("search", async (ctx) => {
    const tgId = ctx.from!.id;
    await ensureVerified(tgId);
    const query = ctx.match?.trim();
    if (!query) {
      await ctx.reply(
        "\ud83d\udd0d <b>Search for events</b>\n\nJust type what you're looking for!\n\nExamples:\n\u2022 <i>salsa in Denver</i>\n\u2022 <i>workshops this weekend</i>\n\u2022 <i>dance events tonight</i>",
        { parse_mode: "HTML" },
      );
      return;
    }
    const intent = parseSearchIntent(query);
    await sendEventCards(ctx, core, {
      city: intent.city,
      style: intent.style,
      query: intent.query,
    });
    core.awardPoints(userId(tgId), "telegram", "search").catch(() => {});
  });

  bot.command("mylist", async (ctx) => {
    await sendCoreAction(ctx, core, "my-list");
  });

  bot.command("checkin", async (ctx) => {
    const tgId = ctx.from!.id;
    const session = await ensureVerified(tgId);
    if (!session.verified) {
      await ctx.reply(formatConnectPromptHtml(), {
        parse_mode: "HTML",
        reply_markup: buildConnectKeyboard(danzConnectUrl),
      });
      return;
    }

    // Get today's events for check-in
    const result = await core.execute("checkin", {
      action: "checkin",
      user_id: userId(tgId),
      platform: "telegram",
    });

    // Parse event IDs from the raw event query for keyboard
    const now = new Date();
    const rawEvents = await core.discoverEventsRaw({
      action: "events",
      user_id: userId(tgId),
      platform: "telegram",
    });

    // Filter to today's events only
    const todayEvents = rawEvents.filter((e) => {
      const start = new Date(e.startTime);
      const diff = Math.abs(start.getTime() - now.getTime());
      return diff < 24 * 60 * 60 * 1000; // within 24 hours
    });

    if (todayEvents.length > 0) {
      const keyboard = buildCheckinKeyboard(
        todayEvents.slice(0, 5).map((e) => ({ id: e.id, title: e.title })),
      );
      await ctx.reply(markdownToHtml(result), { parse_mode: "HTML", reply_markup: keyboard });
    } else {
      await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
    }
    await core.awardPoints(userId(tgId), "telegram", "events_viewed");
  });

  bot.command("moves", async (ctx) => {
    const result = await core.execute("dance-moves", {
      action: "dance-moves",
      user_id: userId(ctx.from!.id),
      platform: "telegram",
    });
    await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
  });

  bot.command("points", async (ctx) => {
    await ensureVerified(ctx.from!.id);
    await sendCoreAction(ctx, core, "my-points");
  });

  bot.command("referral", async (ctx) => {
    await ensureVerified(ctx.from!.id);
    await sendCoreAction(ctx, core, "my-referral");
  });

  bot.command("wallet", async (ctx) => {
    const tgId = ctx.from!.id;
    const session = await ensureVerified(tgId);
    if (!session.verified) {
      await ctx.reply(formatConnectPromptHtml(), {
        parse_mode: "HTML",
        reply_markup: buildConnectKeyboard(danzConnectUrl),
      });
      return;
    }

    const address = ctx.match?.trim();
    if (!address) {
      await ctx.reply(
        "Send your Base network wallet address:\n\nExample: <code>/wallet 0x1234...abcd</code>",
        { parse_mode: "HTML" },
      );
      return;
    }

    const result = await core.execute("link-wallet", {
      action: "link-wallet",
      user_id: userId(tgId),
      platform: "telegram",
      wallet_address: address,
    });
    await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
  });

  bot.command("rewards", async (ctx) => {
    const tgId = ctx.from!.id;
    const session = await ensureVerified(tgId);
    if (!session.verified) {
      await ctx.reply(formatConnectPromptHtml(), {
        parse_mode: "HTML",
        reply_markup: buildConnectKeyboard(danzConnectUrl),
      });
      return;
    }

    // Check if user has a wallet linked
    const historyResult = await core.execute("reward-history", {
      action: "reward-history",
      user_id: userId(tgId),
      platform: "telegram",
    });
    const hasWallet = !historyResult.includes("link a wallet") && !historyResult.includes("signup");

    await ctx.reply(formatRewardsHtml(hasWallet), {
      parse_mode: "HTML",
      reply_markup: buildRewardsKeyboard(hasWallet),
    });
  });

  bot.command("challenges", async (ctx) => {
    await ensureVerified(ctx.from!.id);
    await sendCoreAction(ctx, core, "challenges");
  });


  // ========================================================================
  // Flow Commands
  // ========================================================================

  bot.command("flow", async (ctx) => {
    const tgId = ctx.from!.id;
    const session = await ensureVerified(tgId);
    if (!session.verified) {
      await ctx.reply(formatConnectPromptHtml(), {
        parse_mode: "HTML",
        reply_markup: buildConnectKeyboard(danzConnectUrl),
      });
      return;
    }

    await ctx.reply(formatFlowMenuHtml(), {
      parse_mode: "HTML",
      reply_markup: buildFlowMenuKeyboard(botUsername),
    });
  });

  bot.command("share", async (ctx) => {
    const tgId = ctx.from!.id;
    await ensureVerified(tgId);
    const flowPlugin = core.getFlowPlugin();
    const flowCfg = core.getFlowConfig();
    if (!flowPlugin || !flowCfg) {
      await ctx.reply("Flow not configured.");
      return;
    }
    const link = await flowPlugin.getInviteLink(flowCfg, userId(tgId));
    await ctx.reply(formatFlowShareHtml(link), {
      parse_mode: "HTML",
      reply_markup: buildFlowShareKeyboard(link),
    });
    core.awardPoints(userId(tgId), "telegram", "flow_invite_sent").catch(() => {});
  });

  bot.command("crew", async (ctx) => {
    const tgId = ctx.from!.id;
    const session = await ensureVerified(tgId);
    if (!session.verified) {
      await ctx.reply(formatConnectPromptHtml(), {
        parse_mode: "HTML",
        reply_markup: buildConnectKeyboard(danzConnectUrl),
      });
      return;
    }

    const args = ctx.match?.trim();

    // /crew create Salsa Wolves
    if (args?.startsWith("create ")) {
      const name = args.slice(7).trim();
      if (!name) {
        await ctx.reply("Usage: <code>/crew create Crew Name</code>", { parse_mode: "HTML" });
        return;
      }
      const result = await core.execute("crew-create", {
        action: "crew-create",
        user_id: userId(tgId),
        platform: "telegram",
        query: name,
      });
      await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
      core.awardPoints(userId(tgId), "telegram", "crew_created").catch(() => {});
      return;
    }

    // /crew list
    if (!args || args === "list") {
      const result = await core.execute("crew-list", {
        action: "crew-list",
        user_id: userId(tgId),
        platform: "telegram",
      });
      await ctx.reply(markdownToHtml(result), {
        parse_mode: "HTML",
        reply_markup: buildCrewMenuKeyboard(botUsername),
      });
      return;
    }

    // /crew members GROUPID
    if (args.startsWith("members ")) {
      const groupId = args.slice(8).trim();
      const result = await core.execute("crew-members", {
        action: "crew-members",
        user_id: userId(tgId),
        platform: "telegram",
        group_id: groupId,
      });
      await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
      return;
    }

    // /crew invite GROUPID
    if (args.startsWith("invite ")) {
      const groupId = args.slice(7).trim();
      const result = await core.execute("crew-invite", {
        action: "crew-invite",
        user_id: userId(tgId),
        platform: "telegram",
        group_id: groupId,
      });
      await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
      return;
    }

    // /crew leave GROUPID
    if (args.startsWith("leave ")) {
      const groupId = args.slice(6).trim();
      const result = await core.execute("crew-leave", {
        action: "crew-leave",
        user_id: userId(tgId),
        platform: "telegram",
        group_id: groupId,
      });
      await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
      return;
    }

    // Default: show crew menu
    await ctx.reply(formatCrewMenuHtml(), {
      parse_mode: "HTML",
      reply_markup: buildCrewMenuKeyboard(botUsername),
    });
  });

  bot.command("going", async (ctx) => {
    const tgId = ctx.from!.id;
    const session = await ensureVerified(tgId);
    if (!session.verified) {
      await ctx.reply(formatConnectPromptHtml(), {
        parse_mode: "HTML",
        reply_markup: buildConnectKeyboard(danzConnectUrl),
      });
      return;
    }

    // If no args, show current schedule
    const args = ctx.match?.trim();
    if (!args) {
      await sendCoreAction(ctx, core, "my-schedule");
      return;
    }

    // If viewing a card, RSVP to the current event
    const eventSession = getSession(tgId);
    if (eventSession?.filteredEvents?.length) {
      const currentEvent = eventSession.filteredEvents[eventSession.cardIndex];
      if (currentEvent) {
        const flowPlugin = core.getFlowPlugin();
        const flowCfg = core.getFlowConfig();
        if (flowPlugin && flowCfg) {
          await flowPlugin.rsvpWithDetails(
            flowCfg, userId(tgId), currentEvent.id, currentEvent.title,
            currentEvent.startTime, currentEvent.locationName || null,
          );
          await ctx.reply(
            `<b>You're going!</b> ${currentEvent.title}\n\nYour flow will see this.`,
            { parse_mode: "HTML", reply_markup: buildFlowMenuKeyboard(botUsername) },
          );
          core.awardPoints(userId(tgId), "telegram", "event_rsvp").catch(() => {});

          // Fire notifications in background
          notifyFlowAboutRsvp(core, userId(tgId), currentEvent.id, currentEvent.title, bot).catch(() => {});
          return;
        }
      }
    }

    await ctx.reply("Browse events first, then tap Going!", { reply_markup: buildFlowMenuKeyboard(botUsername) });
  });

  bot.command("whosgoing", async (ctx) => {
    const tgId = ctx.from!.id;
    await ensureVerified(tgId);

    const result = await core.execute("whos-going", {
      action: "whos-going",
      user_id: userId(tgId),
      platform: "telegram",
    });
    await ctx.reply(markdownToHtml(result), {
      parse_mode: "HTML",
      reply_markup: buildFlowMenuKeyboard(botUsername),
    });
  });

  bot.command("schedule", async (ctx) => {
    const tgId = ctx.from!.id;
    await ensureVerified(tgId);

    const result = await core.execute("my-schedule", {
      action: "my-schedule",
      user_id: userId(tgId),
      platform: "telegram",
    });
    await ctx.reply(markdownToHtml(result), {
      parse_mode: "HTML",
      reply_markup: buildFlowMenuKeyboard(botUsername),
    });
  });

  bot.command("help", async (ctx) => {
    await sendCoreAction(ctx, core, "help");
  });

  // /register - works in groups & DMs, shows connect button
  bot.command("register", async (ctx) => {
    const tgId = ctx.from!.id;
    const session = await ensureVerified(tgId);

    if (session.verified) {
      const pts = await core.awardPoints(userId(tgId), "telegram", "daily_login");
      const ptsText = pts.awarded ? ` (+${pts.points} pts)` : "";
      await ctx.reply(
        `\u2705 You're already connected, <b>${session.danzUsername}</b>!${ptsText}`,
        { parse_mode: "HTML" },
      );
      return;
    }

    await ctx.reply(formatGroupRegisterHtml(), {
      parse_mode: "HTML",
      reply_markup: buildGroupRegisterKeyboard(danzConnectUrl, botUsername),
    });
  });

  // ========================================================================
  // New member welcome (auto-detect group joins)
  // ========================================================================

  bot.on("message:new_chat_members", async (ctx) => {
    const newMembers = ctx.message.new_chat_members;
    const groupName = ctx.chat.title || "this group";

    for (const member of newMembers) {
      // Skip if the bot itself was added
      if (member.is_bot) continue;

      const firstName = member.first_name || "there";

      // Award group_joined points (fire-and-forget, works even if not connected)
      core.awardPoints(userId(member.id), "telegram", "group_joined").catch(() => {});

      await ctx.reply(
        formatGroupWelcomeHtml(firstName, groupName),
        {
          parse_mode: "HTML",
          reply_markup: buildGroupWelcomeKeyboard(danzConnectUrl, botUsername),
        },
      );

      console.log(`[flowb-telegram] New member in ${groupName}: ${firstName} (${member.id})`);
    }
  });

  // ========================================================================
  // Channel post reactions (track engagement)
  // ========================================================================

  bot.on("message_reaction", async (ctx) => {
    const tgId = ctx.messageReaction.user?.id;
    if (!tgId) return;

    core.awardPoints(userId(tgId), "telegram", "channel_reaction").catch(() => {});
  });

  // ========================================================================
  // Callback queries (button clicks)
  // ========================================================================

  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const tgId = ctx.from.id;

    // Menu navigation
    if (data.startsWith("mn:")) {
      const target = data.slice(3);
      await handleMenu(ctx, core, target);
      return;
    }

    // Event card browser: ec:next, ec:prev, ec:save:ID, ec:share:ID, ec:fcat, ec:fdate, ec:setcat:X, ec:setdate:X, ec:back
    if (data.startsWith("ec:")) {
      const parts = data.split(":");
      const action = parts[1];

      const session = getSession(tgId);
      if (!session || !session.filteredEvents.length) {
        // For noop or nav actions on expired session
        if (action === "noop") {
          await ctx.answerCallbackQuery();
          return;
        }
        await ctx.answerCallbackQuery({ text: "Session expired. Search again!" });
        return;
      }

      // --- Navigation: next / prev ---
      if (action === "next" || action === "prev") {
        const newIndex = action === "next"
          ? Math.min(session.cardIndex + 1, session.filteredEvents.length - 1)
          : Math.max(session.cardIndex - 1, 0);
        session.cardIndex = newIndex;
        session.lastActive = Date.now();

        const event = session.filteredEvents[newIndex];
        await ctx.editMessageText(
          formatEventCardHtml(event, newIndex, session.filteredEvents.length, session.categoryFilter, session.dateFilter),
          {
            parse_mode: "HTML",
            reply_markup: buildEventCardKeyboard(
              event.id, newIndex, session.filteredEvents.length,
              event.url, session.categoryFilter, session.dateFilter, botUsername,
            ),
          },
        );
        await ctx.answerCallbackQuery();
        return;
      }

      // --- Show category filter menu ---
      if (action === "fcat") {
        await ctx.editMessageText(
          `\ud83c\udfad <b>Filter by Category</b>\n\nCurrently showing: <b>${session.categoryFilter === "all" ? "All Events" : session.categoryFilter}</b>\n${session.filteredEvents.length} events`,
          {
            parse_mode: "HTML",
            reply_markup: buildCategoryFilterKeyboard(session.categoryFilter),
          },
        );
        await ctx.answerCallbackQuery();
        return;
      }

      // --- Show date filter menu ---
      if (action === "fdate") {
        await ctx.editMessageText(
          `\ud83d\udcc5 <b>Filter by Date</b>\n\nCurrently showing: <b>${getDateFilterLabel(session.dateFilter)}</b>\n${session.filteredEvents.length} events`,
          {
            parse_mode: "HTML",
            reply_markup: buildDateFilterKeyboard(session.dateFilter),
          },
        );
        await ctx.answerCallbackQuery();
        return;
      }

      // --- Apply category filter ---
      if (action === "setcat") {
        const category = parts[2] || "all";
        session.categoryFilter = category;
        // Re-apply both filters from raw events
        let filtered = filterEventsByCategory(session.events, category);
        filtered = filterEventsByDate(filtered, session.dateFilter);
        session.filteredEvents = filtered;
        session.cardIndex = 0;
        session.lastActive = Date.now();

        if (!filtered.length) {
          await ctx.editMessageText(
            `No events found for <b>${category}</b>. Try a different filter.`,
            {
              parse_mode: "HTML",
              reply_markup: buildCategoryFilterKeyboard(category),
            },
          );
          await ctx.answerCallbackQuery();
          return;
        }

        const event = filtered[0];
        await ctx.editMessageText(
          formatEventCardHtml(event, 0, filtered.length, category, session.dateFilter),
          {
            parse_mode: "HTML",
            reply_markup: buildEventCardKeyboard(
              event.id, 0, filtered.length, event.url, category, session.dateFilter, botUsername,
            ),
          },
        );
        await ctx.answerCallbackQuery({ text: `Showing ${filtered.length} ${category} events` });
        return;
      }

      // --- Apply date filter ---
      if (action === "setdate") {
        const dateFilter = parts[2] || "all";
        session.dateFilter = dateFilter;
        // Re-apply both filters from raw events
        let filtered = filterEventsByCategory(session.events, session.categoryFilter);
        filtered = filterEventsByDate(filtered, dateFilter);
        session.filteredEvents = filtered;
        session.cardIndex = 0;
        session.lastActive = Date.now();

        if (!filtered.length) {
          await ctx.editMessageText(
            `No events found for <b>${getDateFilterLabel(dateFilter)}</b>. Try a different date.`,
            {
              parse_mode: "HTML",
              reply_markup: buildDateFilterKeyboard(dateFilter),
            },
          );
          await ctx.answerCallbackQuery();
          return;
        }

        const event = filtered[0];
        await ctx.editMessageText(
          formatEventCardHtml(event, 0, filtered.length, session.categoryFilter, dateFilter),
          {
            parse_mode: "HTML",
            reply_markup: buildEventCardKeyboard(
              event.id, 0, filtered.length, event.url, session.categoryFilter, dateFilter, botUsername,
            ),
          },
        );
        await ctx.answerCallbackQuery({ text: `Showing ${filtered.length} events for ${getDateFilterLabel(dateFilter)}` });
        return;
      }

      // --- Back to current card from filter menu ---
      if (action === "back") {
        const event = session.filteredEvents[session.cardIndex];
        if (!event) {
          await ctx.answerCallbackQuery({ text: "No events to show." });
          return;
        }
        await ctx.editMessageText(
          formatEventCardHtml(event, session.cardIndex, session.filteredEvents.length, session.categoryFilter, session.dateFilter),
          {
            parse_mode: "HTML",
            reply_markup: buildEventCardKeyboard(
              event.id, session.cardIndex, session.filteredEvents.length,
              event.url, session.categoryFilter, session.dateFilter, botUsername,
            ),
          },
        );
        await ctx.answerCallbackQuery();
        return;
      }

      // --- Save event ---
      const eventIdShort = parts[2];
      const event = session.filteredEvents.find((e) => e.id.startsWith(eventIdShort || ""));

      if (action === "save") {
        if (!event) {
          await ctx.answerCallbackQuery({ text: "Event not found." });
          return;
        }
        try {
          await core.execute("save-event", {
            action: "save-event",
            user_id: userId(tgId),
            platform: "telegram",
            query: event.title,
          });
          const pts = await core.awardPoints(userId(tgId), "telegram", "event_saved");
          const ptsText = pts.awarded ? ` (+${pts.points} pts)` : "";
          await ctx.answerCallbackQuery({ text: `\u2b50 Saved: ${event.title}${ptsText}`, show_alert: false });
        } catch {
          await ctx.answerCallbackQuery({ text: `\u2b50 Saved: ${event?.title || "event"}`, show_alert: false });
        }
        return;
      }

      // --- Share event ---
      if (action === "share") {
        if (!event) {
          await ctx.answerCallbackQuery({ text: "Event not found." });
          return;
        }
        const shareText = `Check out: ${event.title}\n${event.url || ""}`;
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(event.url || "")}&text=${encodeURIComponent(shareText)}`;
        await ctx.answerCallbackQuery();
        await ctx.reply(
          `\ud83d\udce4 <a href="${shareUrl}">Share "${event.title}"</a>`,
          { parse_mode: "HTML" },
        );
        return;
      }

      // --- Noop (position indicator tap) ---
      if (action === "noop") {
        await ctx.answerCallbackQuery();
        return;
      }

      await ctx.answerCallbackQuery();
      return;
    }

    // Pagination: ev:p:N or sr:p:N
    const pageMatch = data.match(/^(ev|sr):p:(\d+)$/);
    if (pageMatch) {
      const session = getSession(tgId);
      if (!session || !session.events.length) {
        await ctx.answerCallbackQuery({ text: "Session expired. Tap Events again." });
        return;
      }
      session.page = parseInt(pageMatch[2], 10);
      session.lastActive = Date.now();

      const totalPages = Math.ceil(session.events.length / PAGE_SIZE);
      const start = session.page * PAGE_SIZE;
      const eventsOnPage = Math.min(PAGE_SIZE, session.events.length - start);

      const prefix = pageMatch[1];
      await ctx.editMessageText(
        formatEventCardsHtml(session.events, session.page, PAGE_SIZE),
        {
          parse_mode: "HTML",
          reply_markup: buildEventKeyboard(eventsOnPage, session.page, totalPages, prefix),
        },
      );
      await ctx.answerCallbackQuery();
      return;
    }

    // Save: ev:s:N or sr:s:N
    const saveMatch = data.match(/^(ev|sr):s:(\d+)$/);
    if (saveMatch) {
      const session = getSession(tgId);
      if (!session || !session.events.length) {
        await ctx.answerCallbackQuery({ text: "Session expired." });
        return;
      }
      const slotIdx = parseInt(saveMatch[2], 10) - 1;
      const eventIdx = session.page * PAGE_SIZE + slotIdx;
      const event = session.events[eventIdx];

      if (!event) {
        await ctx.answerCallbackQuery({ text: "Event not found." });
        return;
      }

      try {
        await core.execute("save-event", {
          action: "save-event",
          user_id: userId(tgId),
          platform: "telegram",
          query: event.title,
        });
        const pts = await core.awardPoints(userId(tgId), "telegram", "event_saved");
        const ptsText = pts.awarded ? ` (+${pts.points} pts)` : "";
        await ctx.answerCallbackQuery({ text: `Saved: ${event.title}${ptsText}`, show_alert: false });
      } catch {
        await ctx.answerCallbackQuery({ text: `Saved: ${event.title}`, show_alert: false });
      }
      return;
    }

    // Check-in: ci:EVENTID (first 8 chars of UUID)
    if (data.startsWith("ci:")) {
      const eventIdShort = data.slice(3);
      await ctx.answerCallbackQuery({ text: "Checking in..." });

      // Find full event ID from recent events
      const session = getSession(tgId);
      const rawEvents = await core.discoverEventsRaw({
        action: "events",
        user_id: userId(tgId),
        platform: "telegram",
      });
      const matchedEvent = rawEvents.find((e) => e.id.startsWith(eventIdShort));

      if (!matchedEvent) {
        await ctx.reply("Could not find that event. Try /checkin again.");
        return;
      }

      const result = await core.execute("checkin", {
        action: "checkin",
        user_id: userId(tgId),
        platform: "telegram",
        event_id: matchedEvent.id,
      });

      const pts = await core.awardPoints(userId(tgId), "telegram", "events_viewed");

      // Store the event ID for proof submission
      setSession(tgId, { checkinEventId: matchedEvent.id });

      await ctx.reply(markdownToHtml(result), {
        parse_mode: "HTML",
        reply_markup: buildDanceMoveKeyboard(eventIdShort),
      });
      return;
    }

    // Rewards: rw:claim or rw:history
    if (data.startsWith("rw:")) {
      const action = data.slice(3);
      if (action === "claim") {
        await ctx.answerCallbackQuery({ text: "Processing claims..." });
        const result = await core.execute("claim-reward", {
          action: "claim-reward",
          user_id: userId(tgId),
          platform: "telegram",
        });
        await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
        return;
      }

      if (action === "history") {
        await ctx.answerCallbackQuery();
        await sendCoreAction(ctx, core, "reward-history");
        return;
      }
    }

    // Flow callbacks: fl:share, fl:list, fl:crew-create, fl:crew-list, fl:going:ID, fl:maybe:ID, fl:whos:ID, etc.
    if (data.startsWith("fl:")) {
      const parts = data.split(":");
      const action = parts[1];

      if (action === "share") {
        await ctx.answerCallbackQuery();
        const flowPlugin = core.getFlowPlugin();
        const flowCfg = core.getFlowConfig();
        if (flowPlugin && flowCfg) {
          const link = await flowPlugin.getInviteLink(flowCfg, userId(tgId));
          await ctx.reply(formatFlowShareHtml(link), {
            parse_mode: "HTML",
            reply_markup: buildFlowShareKeyboard(link),
          });
        }
        core.awardPoints(userId(tgId), "telegram", "flow_invite_sent").catch(() => {});
        return;
      }

      if (action === "copy-link") {
        const flowPlugin = core.getFlowPlugin();
        const flowCfg = core.getFlowConfig();
        if (flowPlugin && flowCfg) {
          const link = await flowPlugin.getInviteLink(flowCfg, userId(tgId));
          await ctx.answerCallbackQuery();
          await ctx.reply(link);
        } else {
          await ctx.answerCallbackQuery({ text: "Flow not configured." });
        }
        return;
      }

      if (action === "menu") {
        await ctx.answerCallbackQuery();
        await ctx.reply(formatFlowMenuHtml(), {
          parse_mode: "HTML",
          reply_markup: buildFlowMenuKeyboard(botUsername),
        });
        return;
      }

      if (action === "list") {
        await ctx.answerCallbackQuery();
        const result = await core.execute("flow-list", {
          action: "flow-list",
          user_id: userId(tgId),
          platform: "telegram",
        });
        await ctx.reply(markdownToHtml(result), {
          parse_mode: "HTML",
          reply_markup: buildFlowMenuKeyboard(botUsername),
        });
        return;
      }

      if (action === "schedule") {
        await ctx.answerCallbackQuery();
        const result = await core.execute("my-schedule", {
          action: "my-schedule",
          user_id: userId(tgId),
          platform: "telegram",
        });
        await ctx.reply(markdownToHtml(result), {
          parse_mode: "HTML",
          reply_markup: buildFlowMenuKeyboard(botUsername),
        });
        return;
      }

      if (action === "whos-going") {
        await ctx.answerCallbackQuery();
        const result = await core.execute("whos-going", {
          action: "whos-going",
          user_id: userId(tgId),
          platform: "telegram",
        });
        await ctx.reply(markdownToHtml(result), {
          parse_mode: "HTML",
          reply_markup: buildFlowMenuKeyboard(botUsername),
        });
        return;
      }

      if (action === "crew-create") {
        await ctx.answerCallbackQuery();
        await ctx.reply(
          [
            "\ud83d\ude80 <b>Create a Crew</b>",
            "",
            "Send the command with your crew name:",
            "",
            "<code>/crew create Salsa Wolves</code>",
            "",
            "Tip: start with an emoji for flair!",
            "<code>/crew create \ud83d\udc3a Salsa Wolves</code>",
          ].join("\n"),
          { parse_mode: "HTML" },
        );
        return;
      }

      if (action === "crew-list") {
        await ctx.answerCallbackQuery();
        const result = await core.execute("crew-list", {
          action: "crew-list",
          user_id: userId(tgId),
          platform: "telegram",
        });
        await ctx.reply(markdownToHtml(result), {
          parse_mode: "HTML",
          reply_markup: buildCrewMenuKeyboard(botUsername),
        });
        return;
      }

      if (action === "crew-invite") {
        const groupIdShort = parts[2];
        await ctx.answerCallbackQuery();
        const result = await core.execute("crew-invite", {
          action: "crew-invite",
          user_id: userId(tgId),
          platform: "telegram",
          group_id: groupIdShort,
        });
        await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
        // Award tiered invite points
        const flowPlugin = core.getFlowPlugin();
        const flowCfg = core.getFlowConfig();
        if (flowPlugin && flowCfg) {
          const role = await flowPlugin.getCrewRole(flowCfg, userId(tgId), groupIdShort);
          const pointAction = role === "admin" || role === "creator"
            ? "crew_invite_sent_admin"
            : "crew_invite_sent_member";
          core.awardPoints(userId(tgId), "telegram", pointAction).catch(() => {});
        }
        return;
      }

      if (action === "crew-members") {
        const groupIdShort = parts[2];
        await ctx.answerCallbackQuery();
        const result = await core.execute("crew-members", {
          action: "crew-members",
          user_id: userId(tgId),
          platform: "telegram",
          group_id: groupIdShort,
        });
        await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
        return;
      }

      if (action === "crew-leave") {
        const groupIdShort = parts[2];
        await ctx.answerCallbackQuery({ text: "Leaving crew..." });
        const result = await core.execute("crew-leave", {
          action: "crew-leave",
          user_id: userId(tgId),
          platform: "telegram",
          group_id: groupIdShort,
        });
        await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
        return;
      }

      // RSVP from event card: fl:going:EVENTID_SHORT or fl:maybe:EVENTID_SHORT
      if (action === "going" || action === "maybe") {
        const eventIdShort = parts[2];
        const session = getSession(tgId);
        const event = session?.filteredEvents?.find((e) => e.id.startsWith(eventIdShort || ""));

        if (!event) {
          await ctx.answerCallbackQuery({ text: "Event not found." });
          return;
        }

        const flowPlugin = core.getFlowPlugin();
        const flowCfg = core.getFlowConfig();
        if (flowPlugin && flowCfg) {
          const status = action as "going" | "maybe";
          await flowPlugin.rsvpWithDetails(
            flowCfg, userId(tgId), event.id, event.title,
            event.startTime, event.locationName || null, status,
          );
          const emoji = action === "going" ? "\u2705" : "\ud83e\udd14";
          await ctx.answerCallbackQuery({ text: `${emoji} ${event.title}` });

          // Check who else from flow is going
          const attendance = await flowPlugin.getFlowAttendanceForEvent(flowCfg, userId(tgId), event.id);
          const badge = formatFlowAttendanceBadge(attendance.going.length, attendance.maybe.length);

          await ctx.reply(
            `<b>${emoji} ${action === "going" ? "You're going!" : "Marked as maybe."}</b> ${event.title}${badge}`,
            { parse_mode: "HTML" },
          );

          core.awardPoints(userId(tgId), "telegram", "event_rsvp").catch(() => {});

          // Notify flow in background
          if (action === "going") {
            notifyFlowAboutRsvp(core, userId(tgId), event.id, event.title, bot).catch(() => {});
          }
        }
        return;
      }

      // Who's going to specific event: fl:whos:EVENTID_SHORT
      if (action === "whos") {
        const eventIdShort = parts[2];
        const session = getSession(tgId);
        const event = session?.filteredEvents?.find((e) => e.id.startsWith(eventIdShort || ""));

        if (!event) {
          await ctx.answerCallbackQuery({ text: "Event not found." });
          return;
        }

        const flowPlugin = core.getFlowPlugin();
        const flowCfg = core.getFlowConfig();
        if (flowPlugin && flowCfg) {
          const attendance = await flowPlugin.getFlowAttendanceForEvent(flowCfg, userId(tgId), event.id);
          const goingNames = attendance.going.map((id) => id.replace("telegram_", "@"));
          const maybeNames = attendance.maybe.map((id) => id.replace("telegram_", "@"));

          await ctx.answerCallbackQuery();
          await ctx.reply(
            formatWhosGoingHtml(event.title, goingNames, maybeNames),
            { parse_mode: "HTML" },
          );
        }
        return;
      }

      await ctx.answerCallbackQuery();
      return;
    }

    // Crew management callbacks: cr:approve, cr:deny, cr:settings, cr:toggle-public, cr:join-mode, cr:promote, cr:demote, cr:browse, cr:join-request
    if (data.startsWith("cr:")) {
      const parts = data.split(":");
      const action = parts[1];
      const flowPlugin = core.getFlowPlugin();
      const flowCfg = core.getFlowConfig();

      if (!flowPlugin || !flowCfg) {
        await ctx.answerCallbackQuery({ text: "Flow not configured." });
        return;
      }

      // --- Approve join request ---
      if (action === "approve") {
        const requestIdShort = parts[2];
        await ctx.answerCallbackQuery({ text: "Approving..." });

        // Look up full request ID
        const fullRequestId = await resolveRequestId(flowCfg, requestIdShort);
        if (!fullRequestId) {
          await ctx.reply("Request not found or already processed.");
          return;
        }

        const result = await flowPlugin.crewApprove(flowCfg, userId(tgId), {
          action: "crew-approve",
          referral_code: fullRequestId,
        });

        try {
          const parsed = JSON.parse(result);
          if (parsed.type === "join_request_approved") {
            // Notify the requester
            const requesterTgId = parsed.userId.replace("telegram_", "");
            if (requesterTgId && !isNaN(Number(requesterTgId))) {
              try {
                await bot.api.sendMessage(
                  Number(requesterTgId),
                  `<b>You're in!</b> Your request to join <b>${parsed.groupName}</b> was approved.`,
                  { parse_mode: "HTML", reply_markup: buildFlowMenuKeyboard(botUsername) },
                );
              } catch {}
            }

            // Award points
            core.awardPoints(parsed.userId, "telegram", "crew_joined").catch(() => {});
            core.awardPoints(parsed.userId, "telegram", "crew_request_approved").catch(() => {});

            // Update the admin's message
            await ctx.editMessageText(
              `<b>Approved</b> \u2014 ${parsed.userId.replace("telegram_", "@")} has been added to ${parsed.groupName}.`,
              { parse_mode: "HTML" },
            );
          } else {
            await ctx.reply(result);
          }
        } catch {
          await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
        }
        return;
      }

      // --- Deny join request ---
      if (action === "deny") {
        const requestIdShort = parts[2];
        await ctx.answerCallbackQuery({ text: "Denying..." });

        const fullRequestId = await resolveRequestId(flowCfg, requestIdShort);
        if (!fullRequestId) {
          await ctx.reply("Request not found or already processed.");
          return;
        }

        const result = await flowPlugin.crewDeny(flowCfg, userId(tgId), {
          action: "crew-deny",
          referral_code: fullRequestId,
        });

        try {
          const parsed = JSON.parse(result);
          if (parsed.type === "join_request_denied") {
            // Notify the requester
            const requesterTgId = parsed.userId.replace("telegram_", "");
            if (requesterTgId && !isNaN(Number(requesterTgId))) {
              try {
                await bot.api.sendMessage(
                  Number(requesterTgId),
                  `Your request to join <b>${parsed.groupName}</b> was not approved this time. Keep exploring!`,
                  { parse_mode: "HTML", reply_markup: buildFlowMenuKeyboard(botUsername) },
                );
              } catch {}
            }

            await ctx.editMessageText(
              `<b>Denied</b> \u2014 ${parsed.userId.replace("telegram_", "@")}'s request for ${parsed.groupName}.`,
              { parse_mode: "HTML" },
            );
          } else {
            await ctx.reply(result);
          }
        } catch {
          await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
        }
        return;
      }

      // --- Crew settings panel ---
      if (action === "settings") {
        const groupIdShort = parts[2];
        await ctx.answerCallbackQuery();

        const result = await flowPlugin.crewSettings(flowCfg, userId(tgId), {
          action: "crew-settings",
          group_id: groupIdShort,
        });

        try {
          const settings = JSON.parse(result);
          // Count members
          const members = await sbQueryBot(flowCfg, "flowb_group_members", {
            select: "user_id",
            group_id: `eq.${settings.id}`,
          });
          const memberCount = members?.length || 0;

          await ctx.reply(
            formatCrewSettingsHtml(settings.name, settings.emoji, memberCount, settings.is_public, settings.join_mode),
            {
              parse_mode: "HTML",
              reply_markup: buildCrewSettingsKeyboard(settings.id, settings.is_public, settings.join_mode),
            },
          );
        } catch {
          await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
        }
        return;
      }

      // --- Toggle public visibility ---
      if (action === "toggle-public") {
        const groupIdShort = parts[2];
        await ctx.answerCallbackQuery({ text: "Toggling..." });

        // Get current state first
        const currentResult = await flowPlugin.crewSettings(flowCfg, userId(tgId), {
          action: "crew-settings",
          group_id: groupIdShort,
        });

        try {
          const current = JSON.parse(currentResult);
          const newVisibility = current.is_public ? "private" : "public";

          await flowPlugin.crewSettings(flowCfg, userId(tgId), {
            action: "crew-settings",
            group_id: groupIdShort,
            visibility: newVisibility,
          });

          const newPublic = !current.is_public;
          const members = await sbQueryBot(flowCfg, "flowb_group_members", {
            select: "user_id",
            group_id: `eq.${current.id}`,
          });
          const memberCount = members?.length || 0;

          await ctx.editMessageText(
            formatCrewSettingsHtml(current.name, current.emoji, memberCount, newPublic, current.join_mode),
            {
              parse_mode: "HTML",
              reply_markup: buildCrewSettingsKeyboard(current.id, newPublic, current.join_mode),
            },
          );
        } catch {
          await ctx.reply("Failed to update settings.");
        }
        return;
      }

      // --- Set join mode ---
      if (action === "join-mode") {
        const groupIdShort = parts[2];
        const newMode = parts[3];
        await ctx.answerCallbackQuery({ text: `Join mode: ${newMode}` });

        const currentResult = await flowPlugin.crewSettings(flowCfg, userId(tgId), {
          action: "crew-settings",
          group_id: groupIdShort,
        });

        try {
          const current = JSON.parse(currentResult);

          await flowPlugin.crewSettings(flowCfg, userId(tgId), {
            action: "crew-settings",
            group_id: groupIdShort,
            query: newMode,
          });

          const members = await sbQueryBot(flowCfg, "flowb_group_members", {
            select: "user_id",
            group_id: `eq.${current.id}`,
          });
          const memberCount = members?.length || 0;

          await ctx.editMessageText(
            formatCrewSettingsHtml(current.name, current.emoji, memberCount, current.is_public, newMode),
            {
              parse_mode: "HTML",
              reply_markup: buildCrewSettingsKeyboard(current.id, current.is_public, newMode),
            },
          );
        } catch {
          await ctx.reply("Failed to update join mode.");
        }
        return;
      }

      // --- Promote member ---
      if (action === "promote") {
        const groupIdShort = parts[2];
        const targetIdShort = parts[3];
        await ctx.answerCallbackQuery({ text: "Promoting..." });

        const result = await core.execute("crew-promote", {
          action: "crew-promote",
          user_id: userId(tgId),
          platform: "telegram",
          group_id: groupIdShort,
          friend_id: `telegram_${targetIdShort}`,
        });

        await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
        return;
      }

      // --- Demote admin ---
      if (action === "demote") {
        const groupIdShort = parts[2];
        const targetIdShort = parts[3];
        await ctx.answerCallbackQuery({ text: "Demoting..." });

        const result = await core.execute("crew-demote", {
          action: "crew-demote",
          user_id: userId(tgId),
          platform: "telegram",
          group_id: groupIdShort,
          friend_id: `telegram_${targetIdShort}`,
        });

        await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
        return;
      }

      // --- Browse public crews ---
      if (action === "browse") {
        await ctx.answerCallbackQuery();
        const result = await flowPlugin.crewBrowse(flowCfg);

        try {
          const crews = JSON.parse(result);
          if (Array.isArray(crews)) {
            await ctx.reply(
              formatCrewBrowseHtml(crews),
              {
                parse_mode: "HTML",
                reply_markup: buildCrewBrowseKeyboard(crews),
              },
            );
          } else {
            await ctx.reply(result, { parse_mode: "HTML" });
          }
        } catch {
          await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
        }
        return;
      }

      // --- Join request from browse ---
      if (action === "join-request") {
        const groupIdShort = parts[2];
        await ctx.answerCallbackQuery({ text: "Processing..." });

        const result = await flowPlugin.crewRequestJoin(flowCfg, userId(tgId), groupIdShort);

        if (result.includes('"join_request_created"')) {
          await handleJoinRequestCreated(result, core, flowPlugin, flowCfg, bot, tgId);
        } else {
          await ctx.reply(markdownToHtml(result), {
            parse_mode: "HTML",
            reply_markup: buildFlowMenuKeyboard(botUsername),
          });
          // If it's a direct join (open mode), award points
          if (result.includes("Welcome to")) {
            core.awardPoints(userId(tgId), "telegram", "crew_joined").catch(() => {});
          }
        }
        return;
      }

      await ctx.answerCallbackQuery();
      return;
    }

    // Dance move: dm:EVENTID:MOVEID
    if (data.startsWith("dm:")) {
      const parts = data.split(":");
      const eventIdShort = parts[1];
      const moveId = parts.slice(2).join(":");

      if (moveId === "photo") {
        // User wants to send a photo as proof
        setSession(tgId, { awaitingProofPhoto: true });
        await ctx.answerCallbackQuery();
        await ctx.reply("Send a photo of your dance move! I'll record it as proof.");
        return;
      }

      await ctx.answerCallbackQuery({ text: "Recording your move..." });

      // Find the move name
      const move = DANCE_MOVES.find((m) => m.id === moveId);
      const moveName = move?.label || moveId;

      // Find full event ID
      const session = getSession(tgId);
      let fullEventId = session?.checkinEventId;
      if (!fullEventId) {
        const rawEvents = await core.discoverEventsRaw({
          action: "events",
          user_id: userId(tgId),
          platform: "telegram",
        });
        const matched = rawEvents.find((e) => e.id.startsWith(eventIdShort));
        fullEventId = matched?.id;
      }

      const result = await core.execute("dance-proof", {
        action: "dance-proof",
        user_id: userId(tgId),
        platform: "telegram",
        event_id: fullEventId,
        dance_move: moveName,
      });

      const pts = await core.awardPoints(userId(tgId), "telegram", "event_saved");
      const ptsText = pts.awarded ? `\n\n+${pts.points} FlowB points!` : "";

      await ctx.reply(markdownToHtml(result) + ptsText, { parse_mode: "HTML" });
      return;
    }

    // Farcaster callbacks: fc:trending, fc:profile
    if (data.startsWith("fc:")) {
      const action = data.slice(3);

      if (action === "trending") {
        await ctx.answerCallbackQuery();
        await ctx.replyWithChatAction("typing");
        const result = await core.execute("farcaster-feed", {
          action: "farcaster-feed",
          user_id: userId(tgId),
          platform: "telegram",
        });
        await ctx.reply(markdownToHtml(result), {
          parse_mode: "HTML",
          reply_markup: buildFarcasterMenuKeyboard(),
        });
        core.awardPoints(userId(tgId), "telegram", "farcaster_viewed").catch(() => {});
        return;
      }

      if (action === "profile") {
        await ctx.answerCallbackQuery();
        await ctx.reply(
          "Who do you want to look up?\n\n<i>Type a Farcaster username, e.g. <b>dwr</b> or <b>vitalik.eth</b></i>",
          { parse_mode: "HTML" },
        );
        return;
      }

      await ctx.answerCallbackQuery();
      return;
    }

    await ctx.answerCallbackQuery();
  });

  // ========================================================================
  // Photo handler (for dance proof)
  // ========================================================================

  bot.on("message:photo", async (ctx) => {
    const tgId = ctx.from!.id;
    const session = getSession(tgId);

    if (!session?.awaitingProofPhoto && !session?.checkinEventId) {
      return; // Not expecting a photo
    }

    const photo = ctx.message.photo;
    const largestPhoto = photo[photo.length - 1]; // Get highest resolution
    const fileId = largestPhoto.file_id;

    const result = await core.execute("dance-proof", {
      action: "dance-proof",
      user_id: userId(tgId),
      platform: "telegram",
      event_id: session.checkinEventId,
      dance_move: session.danceMoveForProof || "freestyle",
      photo_file_id: fileId,
    });

    const pts = await core.awardPoints(userId(tgId), "telegram", "event_saved");
    const ptsText = pts.awarded ? `\n\n+${pts.points} FlowB points!` : "";

    setSession(tgId, { awaitingProofPhoto: false });

    await ctx.reply(markdownToHtml(result) + ptsText, { parse_mode: "HTML" });
  });

  // ========================================================================
  // Free-text handler
  // ========================================================================

  bot.on("message:text", async (ctx) => {
    const tgId = ctx.from!.id;
    const isGroup = ctx.chat.type !== "private";
    console.log(`[flowb-telegram] Text from ${tgId} (${isGroup ? "group" : "dm"}): ${ctx.message.text.slice(0, 80)}`);

    // In groups: always track points, but only respond to commands/mentions
    if (isGroup) {
      const isReply = !!ctx.message.reply_to_message;
      const action = isReply ? "group_reply" : "group_message";
      core.awardPoints(userId(tgId), "telegram", action).catch(() => {});

      const textLower = ctx.message.text.toLowerCase();
      const isReplyToBot = ctx.message.reply_to_message?.from?.id === bot.botInfo?.id;
      const mentioned = textLower.includes("flowb")
        || textLower.includes(`@${botUsername.toLowerCase()}`)
        || isReplyToBot;
      if (!mentioned) return;
    }

    await ensureVerified(tgId);
    if (!isGroup) {
      core.awardPoints(userId(tgId), "telegram", "message_sent").catch(() => {});
    }

    const text = ctx.message.text.trim();
    const lower = text.toLowerCase();

    // Direct menu/help triggers
    if (lower === "menu" || lower === "/menu" || lower === "help" || lower === "hi" || lower === "hello") {
      await ctx.reply(formatMenuHtml(), {
        parse_mode: "HTML",
        reply_markup: buildMenuKeyboard(miniAppUrl || undefined),
      });
      return;
    }

    // Strip "flowb" / "hey flowb" / "@flow_b_bot" prefix for intent matching
    const cleaned = lower
      .replace(new RegExp(`@${botUsername.toLowerCase()}`, "g"), "")
      .replace(/^(?:hey\s+)?flowb[,!.\s]*/i, "")
      .trim();

    // ---- Flow intents ----
    // "flow", "my flow", "friends", "crew", "crews", "who's going", "whos going", "schedule"
    if (/^(?:my\s+)?(?:flow|friends|crew|crews|squad)$/.test(cleaned)) {
      await ctx.reply(formatFlowMenuHtml(), {
        parse_mode: "HTML",
        reply_markup: buildFlowMenuKeyboard(botUsername),
      });
      return;
    }

    if (/^(?:who(?:'?s| is)\s+going|whos\s+going)/.test(cleaned)) {
      const result = await core.execute("whos-going", {
        action: "whos-going",
        user_id: userId(tgId),
        platform: "telegram",
      });
      await ctx.reply(markdownToHtml(result), {
        parse_mode: "HTML",
        reply_markup: buildFlowMenuKeyboard(botUsername),
      });
      return;
    }

    if (/^(?:my\s+)?schedule$/.test(cleaned)) {
      const result = await core.execute("my-schedule", {
        action: "my-schedule",
        user_id: userId(tgId),
        platform: "telegram",
      });
      await ctx.reply(markdownToHtml(result), {
        parse_mode: "HTML",
        reply_markup: buildFlowMenuKeyboard(botUsername),
      });
      return;
    }

    if (/^(?:share|invite|share\s+(?:my\s+)?(?:flow|link))$/.test(cleaned)) {
      const flowPlugin = core.getFlowPlugin();
      const flowCfg = core.getFlowConfig();
      if (flowPlugin && flowCfg) {
        const link = await flowPlugin.getInviteLink(flowCfg, userId(tgId));
        await ctx.reply(formatFlowShareHtml(link), {
          parse_mode: "HTML",
          reply_markup: buildFlowShareKeyboard(link),
        });
      }
      return;
    }

    // ---- Farcaster intents ----
    // "farcaster", "fc", "trending casts", "fc trending"
    if (/^(?:farcaster|fc|casts?)$/.test(cleaned)) {
      await ctx.reply(formatFarcasterMenuHtml(), {
        parse_mode: "HTML",
        reply_markup: buildFarcasterMenuKeyboard(),
      });
      return;
    }

    // "fc trending", "trending casts", "trending on farcaster"
    if (/^(?:(?:fc\s+)?trending(?:\s+casts?)?|trending\s+on\s+farcaster)$/.test(cleaned)) {
      await ctx.replyWithChatAction("typing");
      const result = await core.execute("farcaster-feed", {
        action: "farcaster-feed",
        user_id: userId(tgId),
        platform: "telegram",
      });
      await ctx.reply(markdownToHtml(result), {
        parse_mode: "HTML",
        reply_markup: buildFarcasterMenuKeyboard(),
      });
      core.awardPoints(userId(tgId), "telegram", "farcaster_viewed").catch(() => {});
      return;
    }

    // "fc profile @vitalik", "farcaster profile dwr", "who is @jessepollak on fc"
    const fcProfileMatch = cleaned.match(
      /^(?:fc\s+(?:profile\s+)?|farcaster\s+(?:profile\s+)?|who\s+is\s+)@?(\w[\w.]+)(?:\s+on\s+(?:fc|farcaster))?$/,
    );
    if (fcProfileMatch) {
      await ctx.replyWithChatAction("typing");
      const result = await core.execute("farcaster-profile", {
        action: "farcaster-profile",
        user_id: userId(tgId),
        platform: "telegram",
        farcaster_username: fcProfileMatch[1],
      });
      await ctx.reply(markdownToHtml(result), {
        parse_mode: "HTML",
        reply_markup: buildFarcasterMenuKeyboard(),
      });
      core.awardPoints(userId(tgId), "telegram", "farcaster_viewed").catch(() => {});
      return;
    }

    // Try to parse as an event search intent
    const intent = parseSearchIntent(text);

    if (intent.isEventQuery) {
      // Conversational card-based response
      await sendEventCards(ctx, core, {
        city: intent.city,
        style: intent.style,
        query: intent.query,
      });
      core.awardPoints(userId(tgId), "telegram", "search").catch(() => {});
      return;
    }

    // Not recognized - show menu with all options
    await ctx.reply(
      [
        `I can help with events, crews &amp; more! Try:`,
        ``,
        `\u2022 <i>"events in Denver"</i> \u2014 find events`,
        `\u2022 <i>"who's going"</i> \u2014 see your crew's plans`,
        `\u2022 <i>"my schedule"</i> \u2014 your RSVP'd events`,
        `\u2022 <i>"my crew"</i> \u2014 crew coordination`,
        `\u2022 <i>"fc profile dwr"</i> \u2014 look up a profile`,
        ``,
        `Or tap a button below:`,
      ].join("\n"),
      {
        parse_mode: "HTML",
        reply_markup: buildMenuKeyboard(miniAppUrl || undefined),
      },
    );
  });

  // ========================================================================
  // Start polling
  // ========================================================================

  bot.catch((err) => {
    console.error("[flowb-telegram] Bot error:", err.message || err);
  });

  bot.start({
    allowed_updates: [
      "message", "edited_message", "channel_post",
      "callback_query", "inline_query",
      "chat_member", "my_chat_member", "chat_join_request",
      "message_reaction",
    ],
    onStart: () => console.log("[flowb-telegram] Bot started (long-polling)"),
  });

  // Cleanup expired sessions periodically
  setInterval(() => {
    const now = Date.now();
    for (const [id, s] of sessions) {
      if (now - s.lastActive > SESSION_TTL_MS) sessions.delete(id);
    }
  }, 5 * 60 * 1000);

  console.log("[flowb-telegram] Bot initialized");
}

// ==========================================================================
// Helpers
// ==========================================================================

/** Send a single event card with navigation (swipe-style browser) */
async function sendEventCards(
  ctx: any,
  core: FlowBCore,
  opts: { city?: string; style?: string; query?: string },
): Promise<void> {
  const tgId = ctx.from!.id;

  // Show typing indicator while searching
  await ctx.replyWithChatAction("typing");

  const events = await core.discoverEventsRaw({
    action: "events",
    user_id: userId(tgId),
    platform: "telegram",
    city: opts.city,
    dance_style: opts.style,
    query: opts.query,
  });

  if (!events.length) {
    const parts: string[] = [];
    if (opts.style) parts.push(opts.style);
    if (opts.city) parts.push(`in ${opts.city}`);
    const note = parts.length ? ` ${parts.join(" ")}` : "";
    await ctx.reply(`nothing yet${note} \u2014 check back soon or try something different`, {
      reply_markup: new InlineKeyboard()
        .text("search again", "mn:search")
        .text("menu", "mn:menu"),
    });
    return;
  }

  // Store full events and set index to 0
  setSession(tgId, {
    events,
    filteredEvents: events,
    cardIndex: 0,
    categoryFilter: "all",
    dateFilter: "all",
    city: opts.city,
    style: opts.style,
    query: opts.query,
    listType: "cards",
  });

  // Send first card
  const event = events[0];
  const msg = await ctx.reply(
    formatEventCardHtml(event, 0, events.length),
    {
      parse_mode: "HTML",
      reply_markup: buildEventCardKeyboard(event.id, 0, events.length, event.url, undefined, undefined, MOD_BOT_USERNAME),
    },
  );

  // Store message ID for future edits
  setSession(tgId, { cardMessageId: msg.message_id });

  // Award points
  core.awardPoints(userId(tgId), "telegram", "events_viewed").catch(() => {});
}

async function sendCoreAction(ctx: any, core: FlowBCore, action: string): Promise<void> {
  const tgId = ctx.from!.id;
  const result = await core.execute(action, {
    action,
    user_id: userId(tgId),
    platform: "telegram",
  });

  await ctx.reply(markdownToHtml(result), {
    parse_mode: "HTML",
    reply_markup: buildBackToMenuKeyboard(),
  });
}

/**
 * Notify flow friends & crew members when someone RSVPs to an event.
 * Runs in background (fire-and-forget from the command handler).
 */
async function notifyFlowAboutRsvp(
  core: FlowBCore,
  uid: string,
  eventId: string,
  eventName: string,
  bot: Bot,
): Promise<void> {
  const flowPlugin = core.getFlowPlugin();
  const flowCfg = core.getFlowConfig();
  if (!flowPlugin || !flowCfg) return;

  const targets = await flowPlugin.computeNotifyTargets(flowCfg, uid, eventId);
  const senderName = uid.replace("telegram_", "@");

  // Notify friends
  for (const friendId of targets.friends) {
    const tgId = friendId.replace("telegram_", "");
    if (!tgId || isNaN(Number(tgId))) continue;

    try {
      await bot.api.sendMessage(
        Number(tgId),
        `<b>${senderName}</b> is going to <b>${eventName}</b>! You in?`,
        {
          parse_mode: "HTML",
          reply_markup: new InlineKeyboard()
            .text("\u2705 I'm going too", `fl:going:${eventId.slice(0, 8)}`)
            .text("\ud83e\udd14 Maybe", `fl:maybe:${eventId.slice(0, 8)}`),
        },
      );
      await flowPlugin.logNotification(flowCfg, friendId, "friend_rsvp", eventId, uid);
    } catch (err) {
      // User may have blocked the bot - skip silently
    }
  }

  // Notify crew members
  for (const crew of targets.crews) {
    const crewLabel = `${crew.groupEmoji} ${crew.groupName}`;
    for (const memberId of crew.userIds) {
      const tgId = memberId.replace("telegram_", "");
      if (!tgId || isNaN(Number(tgId))) continue;

      try {
        await bot.api.sendMessage(
          Number(tgId),
          `<b>${senderName}</b> from <b>${crewLabel}</b> is going to <b>${eventName}</b>!`,
          {
            parse_mode: "HTML",
            reply_markup: new InlineKeyboard()
              .text("\u2705 I'm going too", `fl:going:${eventId.slice(0, 8)}`)
              .text("\ud83e\udd14 Maybe", `fl:maybe:${eventId.slice(0, 8)}`),
          },
        );
        await flowPlugin.logNotification(flowCfg, memberId, "crew_rsvp", eventId, uid);
      } catch (err) {
        // User may have blocked the bot - skip silently
      }
    }
  }
}

/**
 * Handle a join_request_created JSON result: notify admin DMs and reply to requester.
 */
async function handleJoinRequestCreated(
  result: string,
  core: FlowBCore,
  flowPlugin: import("../plugins/flow/index.js").FlowPlugin,
  flowCfg: import("../plugins/flow/index.js").FlowPluginConfig,
  bot: Bot,
  requesterTgId: number,
): Promise<void> {
  try {
    const data = JSON.parse(result);
    const requestId = data.requestId;
    const groupId = data.groupId;

    // Notify the requester
    await bot.api.sendMessage(
      requesterTgId,
      `Your request to join <b>${data.groupEmoji} ${data.groupName}</b> has been submitted. An admin will review it soon!`,
      { parse_mode: "HTML" },
    );

    // DM all admins/creators
    const admins = await flowPlugin.getCrewAdmins(flowCfg, groupId);
    const requesterName = userId(requesterTgId).replace("telegram_", "@");

    for (const adminId of admins) {
      const adminTgId = adminId.replace("telegram_", "");
      if (!adminTgId || isNaN(Number(adminTgId))) continue;

      try {
        await bot.api.sendMessage(
          Number(adminTgId),
          formatJoinRequestHtml(requesterName, data.groupEmoji, data.groupName),
          {
            parse_mode: "HTML",
            reply_markup: buildJoinRequestKeyboard(requestId),
          },
        );
      } catch {
        // Admin may have blocked the bot
      }
    }
  } catch (err) {
    console.error("[flowb-telegram] handleJoinRequestCreated error:", err);
  }
}

/** Resolve a short request ID (first 8 chars) to the full UUID via Supabase */
async function resolveRequestId(
  cfg: { supabaseUrl: string; supabaseKey: string },
  shortId: string,
): Promise<string | null> {
  const rows = await sbQueryBot(cfg, "flowb_crew_join_requests", {
    select: "id",
    status: "eq.pending",
    limit: "10",
  });

  if (!rows?.length) return null;
  const match = rows.find((r: any) => r.id.startsWith(shortId));
  return match?.id || null;
}

/** Simple Supabase query helper for bot-level queries */
async function sbQueryBot(
  cfg: { supabaseUrl: string; supabaseKey: string },
  table: string,
  params: Record<string, string>,
): Promise<any[] | null> {
  const url = new URL(`${cfg.supabaseUrl}/rest/v1/${table}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: {
      apikey: cfg.supabaseKey,
      Authorization: `Bearer ${cfg.supabaseKey}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) return null;
  return res.json();
}

async function handleMenu(ctx: any, core: FlowBCore, target: string): Promise<void> {
  const tgId = ctx.from!.id;

  switch (target) {
    case "menu":
      await ctx.editMessageText(formatMenuHtml(), {
        parse_mode: "HTML",
        reply_markup: buildMenuKeyboard(MOD_MINIAPP_URL || undefined),
      });
      break;

    case "events":
      await ctx.answerCallbackQuery();
      await sendEventCards(ctx, core, {});
      break;

    case "search":
      await ctx.answerCallbackQuery();
      await ctx.reply("what are you looking for?\n\n<i>try: salsa in Austin, defi workshop, yoga this weekend</i>", {
        parse_mode: "HTML",
      });
      break;

    case "mylist":
      await ctx.answerCallbackQuery();
      await sendCoreAction(ctx, core, "my-list");
      break;

    case "sched":
      await ctx.answerCallbackQuery();
      await sendCoreAction(ctx, core, "my-schedule");
      break;

    case "rec":
      await ctx.answerCallbackQuery();
      await sendCoreAction(ctx, core, "recommend");
      break;

    case "danz":
      await ctx.answerCallbackQuery();
      await sendCoreAction(ctx, core, "join");
      break;

    case "points":
      await ctx.answerCallbackQuery();
      await sendCoreAction(ctx, core, "my-points");
      break;

    case "referral":
      await ctx.answerCallbackQuery();
      await sendCoreAction(ctx, core, "my-referral");
      break;

    case "checkin":
      await ctx.answerCallbackQuery();
      await sendCoreAction(ctx, core, "checkin");
      break;

    case "moves":
      await ctx.answerCallbackQuery();
      await sendCoreAction(ctx, core, "dance-moves");
      break;

    case "rewards": {
      await ctx.answerCallbackQuery();
      // Check wallet status for this user
      const rwResult = await core.execute("reward-history", {
        action: "reward-history",
        user_id: userId(tgId),
        platform: "telegram",
      });
      const hasWallet = !rwResult.includes("link a wallet") && !rwResult.includes("signup");
      await ctx.reply(formatRewardsHtml(hasWallet), {
        parse_mode: "HTML",
        reply_markup: buildRewardsKeyboard(hasWallet),
      });
      break;
    }

    case "flow":
      await ctx.answerCallbackQuery();
      await ctx.reply(formatFlowMenuHtml(), {
        parse_mode: "HTML",
        reply_markup: buildFlowMenuKeyboard(MOD_BOT_USERNAME),
      });
      break;

    case "farcaster":
      await ctx.answerCallbackQuery();
      await ctx.reply(formatFarcasterMenuHtml(), {
        parse_mode: "HTML",
        reply_markup: buildFarcasterMenuKeyboard(),
      });
      break;

    case "challenges":
      await ctx.answerCallbackQuery();
      await sendCoreAction(ctx, core, "challenges");
      break;

    case "help":
      await ctx.answerCallbackQuery();
      await sendCoreAction(ctx, core, "help");
      break;

    default:
      await ctx.answerCallbackQuery({ text: "Unknown action" });
  }
}
