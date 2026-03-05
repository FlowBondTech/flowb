/**
 * FlowB Telegram Bot (Grammy)
 *
 * Runs alongside the Fastify server in the same process.
 * Uses FlowBCore directly for event discovery and action routing.
 */

import { Bot, InlineKeyboard, InputFile, Keyboard } from "grammy";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FlowBCore } from "../core/flowb.js";
import type { EventResult } from "../core/types.js";
import { PrivyClient } from "../services/privy.js";
import { EGatorPlugin } from "../plugins/egator/index.js";
import type { LumaEventDetail, LumaTicketType } from "../plugins/egator/index.js";
import {
  initChatter,
  shouldAnalyze,
  extractSignals,
  storeSignal,
  registerChannel,
  deactivateChannel,
  buildDigest,
  getActiveChannelsWithSignals,
} from "./chatter.js";
import {
  escapeHtml,
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
  // Event link (pasted URL)
  formatEventLinkCardHtml,
  buildEventLinkKeyboard,
  // Meetings
  formatMeetingCreatedHtml,
  formatMeetingDetailHtml,
  formatMeetingListHtml,
  formatMeetingCreatePromptHtml,
  buildMeetingDetailKeyboard,
  buildMeetingListKeyboard,
  buildMeetingRsvpKeyboard,
  buildMeetingCreateKeyboard,
} from "./cards.js";
import { sbQuery } from "../utils/supabase.js";
import { log, fireAndForget } from "../utils/logger.js";
import { signJwt } from "../server/auth.js";
import { alertAdmins } from "../services/admin-alerts.js";

const PAGE_SIZE = 3;
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MOD_BOT_USERNAME = process.env.FLOWB_BOT_USERNAME || "Flow_b_bot";
const MOD_MINIAPP_URL = process.env.FLOWB_MINIAPP_URL || "";
const FLOWB_CHAT_URL = "https://flowb.fly.dev";

const PERSISTENT_KEYBOARD = new Keyboard()
  .text("Events").text("Flow").row()
  .text("Points").text("Menu")
  .resized().persistent();

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
  awaitingCrewName?: boolean;
  awaitingSuggestion?: boolean;
  awaitingBugReport?: boolean;
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>;
}

const sessions = new Map<number, TgSession>();

// ============================================================================
// Onboarding State (in-memory, per-user multi-step flow)
// ============================================================================

interface OnboardingState {
  step: number;  // 1=when, 2=interests, 3=crew, 4=done
  data: {
    arrival_date?: string;
    interest_categories: string[];
  };
}

const onboardingStates = new Map<number, OnboardingState>();

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

/** Save onboarding preferences to Supabase */
function saveOnboardingPrefs(tgId: number, data: OnboardingState["data"]): void {
  if (!supabase || !sessionTableReady) return;
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
    onboarding_complete: true,
  };
  if (data.arrival_date) updates.arrival_date = data.arrival_date;
  if (data.interest_categories?.length) updates.interest_categories = data.interest_categories;

  supabase
    .from("flowb_sessions")
    .update(updates)
    .eq("user_id", `telegram_${tgId}`)
    .then(({ error }: { error: any }) => {
      if (error) console.error("[flowb-telegram] Onboarding save error:", error.message);
    });
}

/** Check if user has completed onboarding */
async function hasCompletedOnboarding(tgId: number): Promise<boolean> {
  if (!supabase || !sessionTableReady) return false;
  try {
    const { data } = await supabase
      .from("flowb_sessions")
      .select("onboarding_complete")
      .eq("user_id", `telegram_${tgId}`)
      .single();
    return data?.onboarding_complete === true;
  } catch {
    return false;
  }
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
    chatHistory: partial.chatHistory ?? existing?.chatHistory ?? [],
    checkinEventId: partial.checkinEventId ?? existing?.checkinEventId,
    awaitingProofPhoto: partial.awaitingProofPhoto ?? existing?.awaitingProofPhoto,
    danceMoveForProof: partial.danceMoveForProof ?? existing?.danceMoveForProof,
    awaitingCrewName: partial.awaitingCrewName ?? existing?.awaitingCrewName,
    awaitingSuggestion: partial.awaitingSuggestion ?? existing?.awaitingSuggestion,
    awaitingBugReport: partial.awaitingBugReport ?? existing?.awaitingBugReport,
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

// ============================================================================
// Onboarding Helpers
// ============================================================================

function buildOnboardingWhenKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Already here!", "onb:when:already_here")
    .text("Feb 15-27", "onb:when:full_week")
    .row()
    .text("Just a few days", "onb:when:few_days")
    .text("Virtually", "onb:when:virtual");
}

function buildOnboardingInterestsKeyboard(selected: string[]): InlineKeyboard {
  const categories = ["DeFi", "AI", "Infra", "Build", "Social", "Wellness"];
  const kb = new InlineKeyboard();

  // Two categories per row
  for (let i = 0; i < categories.length; i += 2) {
    const cat1 = categories[i];
    const cat2 = categories[i + 1];
    const label1 = selected.includes(cat1.toLowerCase()) ? `[${cat1}]` : cat1;
    if (cat2) {
      const label2 = selected.includes(cat2.toLowerCase()) ? `[${cat2}]` : cat2;
      kb.text(label1, `onb:cat:${cat1.toLowerCase()}`).text(label2, `onb:cat:${cat2.toLowerCase()}`).row();
    } else {
      kb.text(label1, `onb:cat:${cat1.toLowerCase()}`).row();
    }
  }

  if (selected.length > 0) {
    kb.text("Done ->", "onb:cat:done");
  }
  return kb;
}

function buildOnboardingCrewKeyboard(botUsername: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("Browse crews", "onb:crew:browse")
    .text("Create a crew", "onb:crew:create")
    .row()
    .text("I have an invite", "onb:crew:invite")
    .text("Skip ->", "onb:crew:skip");
}

function formatOnboardingDoneHtml(name: string): string {
  return [
    `<b>You're in the flow, ${name}!</b>`,
    "",
    "Here's what you can do:",
    "",
    "  Events - discover what's happening",
    "  My Flow - connect with friends & crews",
    "  Points - earn by showing up",
    "  Check In - prove you were there",
    "",
    "Tap a button below to get started.",
  ].join("\n");
}

/** Start onboarding for a new user */
async function startOnboarding(ctx: any, tgId: number): Promise<void> {
  onboardingStates.set(tgId, {
    step: 1,
    data: { interest_categories: [] },
  });

  await ctx.reply(
    [
      "<b>Welcome to FlowB!</b> Let's get you set up.",
      "",
      "What kind of events are you into?",
    ].join("\n"),
    {
      parse_mode: "HTML",
      reply_markup: buildOnboardingWhenKeyboard(),
    },
  );
}

/** Advance onboarding to interests step */
async function sendOnboardingInterests(ctx: any, tgId: number): Promise<void> {
  const state = onboardingStates.get(tgId);
  if (!state) return;

  state.step = 2;

  await ctx.reply(
    "What kind of events are you into? (tap to select, then Done)",
    {
      parse_mode: "HTML",
      reply_markup: buildOnboardingInterestsKeyboard(state.data.interest_categories),
    },
  );
}

/** Advance onboarding to crew step */
async function sendOnboardingCrew(ctx: any, tgId: number, botUsername: string): Promise<void> {
  const state = onboardingStates.get(tgId);
  if (!state) return;

  state.step = 3;

  await ctx.reply(
    "Do you want to find or start a crew?",
    {
      reply_markup: buildOnboardingCrewKeyboard(botUsername),
    },
  );
}

/** Complete onboarding: save prefs, award points, show menu */
async function completeOnboarding(
  ctx: any,
  tgId: number,
  core: FlowBCore,
  miniAppUrl: string,
): Promise<void> {
  const state = onboardingStates.get(tgId);
  if (!state) return;

  state.step = 4;

  // Persist preferences to Supabase
  saveOnboardingPrefs(tgId, state.data);

  // Award onboarding_complete points (10 pts)
  fireAndForget(core.awardPoints(userId(tgId), "telegram", "daily_login"), "award points");

  // Clean up onboarding state
  onboardingStates.delete(tgId);

  const session = getSession(tgId);
  const name = session?.danzUsername || ctx.from?.first_name || "friend";

  await ctx.reply(
    formatOnboardingDoneHtml(name),
    {
      parse_mode: "HTML",
      reply_markup: buildMenuKeyboard(miniAppUrl || undefined),
    },
  );
}

// ============================================================================
// Feature Suggestion & Bug Report Helpers
// ============================================================================

async function handleFeatureSuggestion(
  ctx: any,
  core: FlowBCore,
  tgId: number,
  suggestion: string,
): Promise<void> {
  if (!suggestion) {
    await ctx.reply("Please type your suggestion.");
    return;
  }

  const who = ctx.from?.username
    ? `@${ctx.from.username}`
    : ctx.from?.first_name || `User ${tgId}`;

  // Save to flowb_feedback table
  const sbUrl = process.env.DANZ_SUPABASE_URL;
  const sbKey = process.env.DANZ_SUPABASE_KEY;
  if (sbUrl && sbKey) {
    fetch(`${sbUrl}/rest/v1/flowb_feedback`, {
      method: "POST",
      headers: {
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        user_id: userId(tgId),
        platform: "telegram",
        type: "feature",
        message: suggestion,
      }),
    }).catch((err) => log.warn("[bot]", "feature suggestion save failed", { error: String(err) }));
  }

  // DM admins
  alertAdmins(
    `Feature request from <b>${who}</b>:\n\n${escapeHtml(suggestion)}`,
    "important",
  );

  // Forward to feedback channel too
  const channelId = process.env.FLOWB_FEEDBACK_CHANNEL_ID;
  const botToken = process.env.FLOWB_TELEGRAM_BOT_TOKEN;
  if (channelId && botToken) {
    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: channelId,
        text: `\u{1F4A1} <b>Feature Request</b> (via bot)\n\n${escapeHtml(suggestion)}\n\n<i>From: ${who} (telegram_${tgId})</i>`,
        parse_mode: "HTML",
      }),
    }).catch(() => {});
  }

  // Award points
  fireAndForget(
    core.awardPoints(userId(tgId), "telegram", "feature_suggested"),
    "award feature suggestion points",
  );

  await ctx.reply(
    "\u2705 Thanks! Your suggestion has been sent to the team.",
    { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD },
  );
}

async function handleBugReport(
  ctx: any,
  core: FlowBCore,
  tgId: number,
  report: string,
): Promise<void> {
  if (!report) {
    await ctx.reply("Please describe the bug.");
    return;
  }

  const who = ctx.from?.username
    ? `@${ctx.from.username}`
    : ctx.from?.first_name || `User ${tgId}`;

  // Save to flowb_feedback table
  const sbUrl = process.env.DANZ_SUPABASE_URL;
  const sbKey = process.env.DANZ_SUPABASE_KEY;
  if (sbUrl && sbKey) {
    fetch(`${sbUrl}/rest/v1/flowb_feedback`, {
      method: "POST",
      headers: {
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        user_id: userId(tgId),
        platform: "telegram",
        type: "bug",
        message: report,
      }),
    }).catch((err) => log.warn("[bot]", "bug report save failed", { error: String(err) }));
  }

  // DM admins
  alertAdmins(
    `Bug report from <b>${who}</b>:\n\n${escapeHtml(report)}`,
    "urgent",
  );

  // Forward to feedback channel too
  const channelId = process.env.FLOWB_FEEDBACK_CHANNEL_ID;
  const botToken = process.env.FLOWB_TELEGRAM_BOT_TOKEN;
  if (channelId && botToken) {
    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: channelId,
        text: `\u{1F41B} <b>Bug Report</b> (via bot)\n\n${escapeHtml(report)}\n\n<i>From: ${who} (telegram_${tgId})</i>`,
        parse_mode: "HTML",
      }),
    }).catch(() => {});
  }

  // Award points
  fireAndForget(
    core.awardPoints(userId(tgId), "telegram", "bug_reported"),
    "award bug report points",
  );

  await ctx.reply(
    "\u2705 Thanks for reporting! The team has been notified.",
    { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD },
  );
}

export function startTelegramBot(
  token: string,
  core: FlowBCore,
  privy?: PrivyClient,
): void {
  const bot = new Bot(token);
  const botUsername = process.env.FLOWB_BOT_USERNAME || "Flow_b_bot";
  const miniAppUrl = process.env.FLOWB_MINIAPP_URL || "";
  // Prefer FlowB's own /connect page (serves Telegram Login Widget).
  // Falls back to external DANZ connect URL or localhost for dev.
  const danzConnectUrl =
    process.env.DANZ_CONNECT_URL ||
    process.env.FLOWB_CONNECT_URL ||
    `http://localhost:${process.env.PORT || "8080"}/connect`;

  // Check persistent session table on startup
  ensureSessionTable().catch(err => log.error("[bot]", "session table init", { error: err instanceof Error ? err.message : String(err) }));

  // Initialize chatter capture system
  initChatter();

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
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "flow_accepted"), "award points");
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
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "crew_joined"), "award points");
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
          fireAndForget(core.awardPoints(userId(tgId), "telegram", "crew_joined"), "award points");

          // Track invite attribution
          const attr = flowPlugin._lastInviteAttribution;
          if (attr) {
            flowPlugin._lastInviteAttribution = null;
            // Determine inviter role for tiered rewards
            const inviterRole = await flowPlugin.getCrewRole(flowCfg, attr.inviterId, attr.groupId);
            const convertAction = inviterRole === "admin" || inviterRole === "creator"
              ? "crew_invite_converted_admin"
              : "crew_invite_converted";
            fireAndForget(core.awardPoints(attr.inviterId, "telegram", convertAction), "award points");
          }
        }
      }
      return;
    }

    // --- Meeting deep link: m_{code} ---
    if (args?.startsWith("m_")) {
      const meetingCode = args.slice(2);
      const meetingPlugin = core.getMeetingPlugin();
      const meetingCfg = core.getMeetingConfig();
      if (meetingPlugin && meetingCfg) {
        try {
          const meeting = await meetingPlugin.getByCode(meetingCfg, meetingCode);
          if (meeting) {
            const attendees = await meetingPlugin.getAttendees(meetingCfg, meeting.id);
            const isCreator = meeting.creator_id === userId(tgId);
            await ctx.reply(
              formatMeetingDetailHtml(
                meeting.title,
                meeting.starts_at,
                meeting.duration_min,
                meeting.meeting_type,
                meeting.status,
                meeting.location,
                meeting.description,
                attendees.length,
              ),
              {
                parse_mode: "HTML",
                reply_markup: buildMeetingDetailKeyboard(meeting.id, isCreator, meeting.share_code),
              },
            );
            return;
          }
        } catch (err) {
          console.error("[start] m_ deep link error:", err);
        }
      }
      await ctx.reply("Meeting not found or expired.");
      return;
    }

    // --- QR checkin fallback: checkin_{code} ---
    if (args?.startsWith("checkin_")) {
      const locCode = args.slice(8);
      try {
        // Look up location
        const sbUrl = process.env.DANZ_SUPABASE_URL;
        const sbKey = process.env.DANZ_SUPABASE_KEY;
        if (sbUrl && sbKey) {
          const locRes = await fetch(`${sbUrl}/rest/v1/flowb_locations?code=eq.${locCode}&active=eq.true&limit=1`, {
            headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
          });
          const locs = locRes.ok ? await locRes.json() as any[] : [];
          if (locs.length) {
            const loc = locs[0];
            // Get user's crews and auto-checkin to all
            const memRes = await fetch(`${sbUrl}/rest/v1/flowb_group_members?user_id=eq.telegram_${tgId}&select=group_id`, {
              headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
            });
            const memberships = memRes.ok ? await memRes.json() as any[] : [];
            const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

            for (const m of memberships) {
              fireAndForget(fetch(`${sbUrl}/rest/v1/flowb_checkins`, {
                method: "POST",
                headers: {
                  apikey: sbKey, Authorization: `Bearer ${sbKey}`,
                  "Content-Type": "application/json", Prefer: "return=minimal",
                },
                body: JSON.stringify({
                  user_id: `telegram_${tgId}`,
                  platform: "telegram",
                  crew_id: m.group_id,
                  venue_name: loc.name,
                  status: "here",
                  latitude: loc.latitude || null,
                  longitude: loc.longitude || null,
                  location_id: loc.id,
                  expires_at: expiresAt,
                }),
              }), "checkin upsert");
            }

            fireAndForget(core.awardPoints(userId(tgId), "telegram", "qr_checkin"), "award points");

            const crewCount = memberships.length;
            await ctx.reply(
              `<b>\uD83D\uDCCD Checked in at ${escapeHtml(loc.name)}!</b>\n\n` +
              (loc.floor ? `Floor: ${escapeHtml(loc.floor)}\n` : "") +
              (loc.zone ? `Zone: ${escapeHtml(loc.zone)}\n` : "") +
              `\nYour ${crewCount} crew${crewCount !== 1 ? "s" : ""} can now see where you are.\n<i>+10 points</i>`,
              {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard()
                  .webApp("Open FlowB", miniAppUrl || `https://t.me/${botUsername}/app`),
              },
            );
            return;
          }
        }
        await ctx.reply("Location not found. The QR code may have expired.");
      } catch (err) {
        console.error("[start] checkin_ error:", err);
        await ctx.reply("Check-in failed. Please try again.");
      }
      return;
    }

    if (args?.startsWith("ref_")) {
      const refCode = args.slice(4);
      fireAndForget(core.awardPoints(userId(tgId), "telegram", "referral_signup", { referral_code: refCode }), "award points");
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
      // Check if user has completed onboarding - if not, start it
      const onboarded = await hasCompletedOnboarding(tgId);
      if (!onboarded && !onboardingStates.has(tgId)) {
        await startOnboarding(ctx, tgId);
        return;
      }

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
        { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD },
      );
    } else {
      // Not verified yet - start onboarding for preferences collection
      const onboarded = await hasCompletedOnboarding(tgId);
      if (!onboarded && !onboardingStates.has(tgId)) {
        await startOnboarding(ctx, tgId);
        return;
      }

      await ctx.reply(formatConnectPromptHtml(), {
        parse_mode: "HTML",
        reply_markup: buildConnectKeyboard(danzConnectUrl),
      });
    }
  });

  bot.command("menu", async (ctx) => {
    await ctx.reply(formatMenuHtml(), {
      parse_mode: "HTML",
      reply_markup: buildCompactMenuKeyboard(miniAppUrl || undefined),
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
    fireAndForget(core.awardPoints(userId(tgId), "telegram", "search"), "award points");
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
    fireAndForget(core.awardPoints(userId(tgId), "telegram", "flow_invite_sent"), "award points");
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

    // /crew create Salsa Wolves  (or just /crew create)
    if (args === "create" || args?.startsWith("create ")) {
      const name = args === "create" ? "" : args.slice(7).trim();
      if (!name) {
        setSession(tgId, { awaitingCrewName: true });
        await ctx.reply(
          [
            "\ud83d\ude80 <b>Create a Crew</b>",
            "",
            "What would you like to name your crew?",
            "",
            "Tip: start with an emoji for flair! e.g. <b>\ud83d\udc3a Salsa Wolves</b>",
          ].join("\n"),
          { parse_mode: "HTML" },
        );
        return;
      }
      const result = await core.execute("crew-create", {
        action: "crew-create",
        user_id: userId(tgId),
        platform: "telegram",
        query: name,
      });
      await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
      fireAndForget(core.awardPoints(userId(tgId), "telegram", "crew_created"), "award points");
      {
        const crewCreator = ctx.from?.username || ctx.from?.first_name || String(tgId);
        alertAdmins(`New crew created: <b>${name}</b> by @${crewCreator}`, "info");
      }
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
          fireAndForget(core.awardPoints(userId(tgId), "telegram", "event_rsvp"), "award points");

          // Fire notifications in background
          fireAndForget(notifyFlowAboutRsvp(core, userId(tgId), currentEvent.id, currentEvent.title, bot), "notify flow about rsvp");
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

  // /wheremycrew - show crew member locations
  bot.command("wheremycrew", async (ctx) => {
    const tgId = ctx.from!.id;
    const uid = userId(tgId);
    const sbUrl = process.env.DANZ_SUPABASE_URL;
    const sbKey = process.env.DANZ_SUPABASE_KEY;
    if (!sbUrl || !sbKey) { await ctx.reply("Not configured"); return; }

    // Get user's crews
    const memRes = await fetch(`${sbUrl}/rest/v1/flowb_group_members?user_id=eq.${uid}&select=group_id,flowb_groups(id,name,emoji)`, {
      headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
    });
    const memberships = memRes.ok ? await memRes.json() as any[] : [];
    if (!memberships.length) {
      await ctx.reply("You're not in any crews yet! Use /crew to create or join one.");
      return;
    }

    const now = new Date().toISOString();
    const lines: string[] = [];

    for (const m of memberships) {
      const crew = m.flowb_groups;
      if (!crew) continue;

      // Get active checkins for this crew
      const chRes = await fetch(
        `${sbUrl}/rest/v1/flowb_checkins?crew_id=eq.${crew.id}&expires_at=gt.${now}&select=user_id,venue_name,status,created_at&order=created_at.desc`,
        { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } },
      );
      const checkins = chRes.ok ? await chRes.json() as any[] : [];

      // Resolve display names
      const uids = [...new Set(checkins.map((c: any) => c.user_id))];
      let nameMap = new Map<string, string>();
      if (uids.length) {
        const sRes = await fetch(`${sbUrl}/rest/v1/flowb_sessions?user_id=in.(${uids.join(",")})&select=user_id,danz_username`, {
          headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
        });
        const sessions = sRes.ok ? await sRes.json() as any[] : [];
        nameMap = new Map(sessions.map((s) => [s.user_id, s.danz_username]));
      }

      const crewLabel = `${crew.emoji || ""} <b>${escapeHtml(crew.name)}</b>`;
      if (!checkins.length) {
        lines.push(`${crewLabel}: No one checked in`);
      } else {
        const memberLines = checkins.map((c: any) => {
          const name = nameMap.get(c.user_id) || c.user_id.replace(/^(telegram_|farcaster_)/, "@");
          const ago = Math.floor((Date.now() - new Date(c.created_at).getTime()) / 60000);
          const agoStr = ago < 1 ? "just now" : ago < 60 ? `${ago}m ago` : `${Math.floor(ago / 60)}h ago`;
          const statusIcon = c.status === "here" ? "\uD83D\uDFE2" : c.status === "heading" ? "\uD83D\uDFE1" : "\uD83D\uDD34";
          return `  ${statusIcon} ${escapeHtml(name)} at ${escapeHtml(c.venue_name)} (${agoStr})`;
        });
        lines.push(`${crewLabel}:\n${memberLines.join("\n")}`);
      }
    }

    const keyboard = new InlineKeyboard()
      .webApp("Open in App", miniAppUrl || `https://t.me/${botUsername}/app`);

    await ctx.reply(
      `\uD83D\uDCCD <b>Where is my crew?</b>\n\n${lines.join("\n\n")}`,
      { parse_mode: "HTML", reply_markup: keyboard },
    );
  });

  // /onbooths - admin only, create QR booth locations
  bot.command("onbooths", async (ctx) => {
    const tgId = ctx.from!.id;
    const sbUrl = process.env.DANZ_SUPABASE_URL;
    const sbKey = process.env.DANZ_SUPABASE_KEY;
    if (!sbUrl || !sbKey) { await ctx.reply("Not configured"); return; }

    // Parse: /onbooths <name> [floor] [zone]
    const args = ctx.match?.trim();
    if (!args) {
      await ctx.reply(
        "<b>Create a QR check-in location</b>\n\n" +
        "Usage: <code>/onbooths Location Name | floor | zone</code>\n" +
        "Example: <code>/onbooths Main Stage | Ground | Hall A</code>\n\n" +
        "The QR code will be generated automatically.",
        { parse_mode: "HTML" },
      );
      return;
    }

    const parts = args.split("|").map((p) => p.trim());
    const name = parts[0];
    const floor = parts[1] || null;
    const zone = parts[2] || null;

    // Generate a short code
    const code = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 20) +
      "-" + Math.random().toString(36).slice(2, 6);

    // Insert into flowb_locations
    const insertRes = await fetch(`${sbUrl}/rest/v1/flowb_locations`, {
      method: "POST",
      headers: {
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        code,
        name,
        floor,
        zone,
        created_by: `telegram_${tgId}`,
      }),
    });

    if (!insertRes.ok) {
      await ctx.reply("Failed to create location. Please try again.");
      return;
    }

    const qrUrl = `https://flowb.me/c/${code}`;

    // Generate QR code image
    try {
      const QRCode = await import("qrcode");
      const qrBuffer = await QRCode.default.toBuffer(qrUrl, {
        width: 400,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });

      await ctx.replyWithPhoto(
        new InputFile(qrBuffer, "checkin-qr.png"),
        {
          caption:
            `\uD83D\uDCCD <b>${escapeHtml(name)}</b>\n` +
            (floor ? `Floor: ${escapeHtml(floor)}\n` : "") +
            (zone ? `Zone: ${escapeHtml(zone)}\n` : "") +
            `\nQR URL: <code>${qrUrl}</code>\n` +
            `Code: <code>${code}</code>\n\n` +
            `<i>Print this QR code and display at the booth. When scanned, users auto-check in and earn 10 points.</i>`,
          parse_mode: "HTML",
        },
      );
    } catch (err) {
      console.error("[onbooths] QR generation error:", err);
      // Fallback: send text-only
      await ctx.reply(
        `\uD83D\uDCCD <b>${escapeHtml(name)}</b> created!\n\n` +
        `QR URL: <code>${qrUrl}</code>\n` +
        `Code: <code>${code}</code>\n\n` +
        `<i>Generate a QR code for this URL and display at the booth.</i>`,
        { parse_mode: "HTML" },
      );
    }
  });

  // /sponsor - view your sponsorships or get wallet address
  bot.command("sponsor", async (ctx) => {
    const tgId = ctx.from!.id;
    const sbUrl = process.env.DANZ_SUPABASE_URL;
    const sbKey = process.env.DANZ_SUPABASE_KEY;
    if (!sbUrl || !sbKey) { await ctx.reply("Not configured"); return; }

    // Fetch user's sponsorships
    const rows = await sbQuery<any[]>(
      { supabaseUrl: sbUrl, supabaseKey: sbKey },
      "flowb_sponsorships",
      {
        select: "id,target_type,target_id,amount_usdc,status,created_at",
        sponsor_user_id: `eq.telegram_${tgId}`,
        order: "created_at.desc",
        limit: "10",
      },
    );

    const walletAddr = process.env.CDP_ACCOUNT_ADDRESS || "Not configured";
    const lines: string[] = [
      "<b>Your Sponsorships</b>",
      "",
    ];

    if (rows && rows.length > 0) {
      for (const r of rows) {
        const statusEmoji = r.status === "verified" ? "\u2705" : r.status === "pending" ? "\u23f3" : "\u274c";
        lines.push(`${statusEmoji} <b>$${Number(r.amount_usdc).toFixed(2)}</b> \u2192 ${r.target_type}:${r.target_id.slice(0, 8)} (${r.status})`);
      }
    } else {
      lines.push("<i>No sponsorships yet.</i>");
    }

    lines.push(
      "",
      "<b>Sponsor a booth or event:</b>",
      `1. Send USDC (Base) to:`,
      `<code>${walletAddr}</code>`,
      `2. Copy the transaction hash`,
      `3. Open the FlowB miniapp and tap "Sponsor"`,
      "",
      "<i>Min $0.10 USDC. Sponsorships boost leaderboard rankings!</i>",
    );

    await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
  });

  // /topsponsor - public leaderboard of top sponsored items
  bot.command("topsponsor", async (ctx) => {
    const sbUrl = process.env.DANZ_SUPABASE_URL;
    const sbKey = process.env.DANZ_SUPABASE_KEY;
    if (!sbUrl || !sbKey) { await ctx.reply("Not configured"); return; }

    // Get top sponsored locations (booths)
    const locations = await sbQuery<any[]>(
      { supabaseUrl: sbUrl, supabaseKey: sbKey },
      "flowb_locations",
      {
        select: "name,sponsor_amount,sponsor_label",
        sponsor_amount: "gt.0",
        order: "sponsor_amount.desc",
        limit: "5",
      },
    );

    const lines: string[] = [
      "<b>\ud83c\udfc6 Top Sponsored</b>",
      "",
    ];

    if (locations && locations.length > 0) {
      lines.push("<b>Booths</b>");
      locations.forEach((loc: any, i: number) => {
        const medal = i === 0 ? "\ud83e\udd47" : i === 1 ? "\ud83e\udd48" : i === 2 ? "\ud83e\udd49" : `${i + 1}.`;
        const label = loc.sponsor_label ? ` (${loc.sponsor_label})` : "";
        lines.push(`${medal} <b>${escapeHtml(loc.name)}</b>${label} \u2014 $${Number(loc.sponsor_amount).toFixed(2)} USDC`);
      });
    } else {
      lines.push("<i>No sponsorships yet. Be the first! Use /sponsor</i>");
    }

    await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
  });

  // /leaderboard - global points leaderboard (crews + individuals)
  bot.command("leaderboard", async (ctx) => {
    await ctx.replyWithChatAction("typing");
    const crews = await core.getGlobalCrewRanking();
    const individuals = await core.getGlobalIndividualRanking();

    const lines: string[] = ["<b>\ud83c\udfc6 FlowB Leaderboard</b>", ""];

    // Crew rankings
    lines.push("<b>Top Crews</b>");
    if (crews.length > 0) {
      crews.slice(0, 10).forEach((c, i) => {
        const medal = i === 0 ? "\ud83e\udd47" : i === 1 ? "\ud83e\udd48" : i === 2 ? "\ud83e\udd49" : `${i + 1}.`;
        const emoji = c.emoji ? `${c.emoji} ` : "";
        lines.push(`${medal} ${emoji}<b>${escapeHtml(c.name)}</b> \u2014 ${c.totalPoints} pts (${c.memberCount} members)`);
      });
    } else {
      lines.push("<i>No crews yet. Create one with /crew</i>");
    }

    lines.push("");

    // Individual rankings
    lines.push("<b>Top Individuals</b>");
    if (individuals.length > 0) {
      individuals.slice(0, 10).forEach((p, i) => {
        const medal = i === 0 ? "\ud83e\udd47" : i === 1 ? "\ud83e\udd48" : i === 2 ? "\ud83e\udd49" : `${i + 1}.`;
        const streak = p.currentStreak > 0 ? ` \ud83d\udd25${p.currentStreak}` : "";
        lines.push(`${medal} <b>${escapeHtml(p.displayName)}</b> \u2014 ${p.totalPoints} pts${streak} (${p.milestoneTitle})`);
      });
    } else {
      lines.push("<i>No points earned yet. Start exploring!</i>");
    }

    await ctx.reply(lines.join("\n"), { parse_mode: "HTML", reply_markup: buildBackToMenuKeyboard() });
  });

  // ==========================================================================
  // Meeting Commands
  // ==========================================================================

  bot.command("meet", async (ctx) => {
    const tgId = ctx.from?.id;
    if (!tgId) return;
    await ensureVerified(tgId);

    const text = ctx.match?.trim();
    if (!text) {
      await ctx.reply(formatMeetingCreatePromptHtml(), {
        parse_mode: "HTML",
        reply_markup: buildMeetingCreateKeyboard(),
      });
      return;
    }

    const meetingPlugin = core.getMeetingPlugin();
    const meetingCfg = core.getMeetingConfig();
    if (!meetingPlugin || !meetingCfg) {
      await ctx.reply("Meetings are not configured.");
      return;
    }

    const meeting = await meetingPlugin.createFromNaturalLanguage(meetingCfg, userId(tgId), text);
    if (!meeting) {
      await ctx.reply("Failed to create meeting. Try again.");
      return;
    }

    const shareLink = meetingPlugin.getShareLink(meeting.share_code);
    await ctx.reply(
      formatMeetingCreatedHtml(
        meeting.title,
        meeting.starts_at,
        meeting.duration_min,
        meeting.meeting_type,
        meeting.location,
        shareLink,
      ),
      {
        parse_mode: "HTML",
        reply_markup: buildMeetingDetailKeyboard(meeting.id, true, meeting.share_code),
      },
    );

    fireAndForget(core.awardPoints(userId(tgId), "telegram", "meeting_created"), "award points");
  });

  bot.command("meetings", async (ctx) => {
    const tgId = ctx.from?.id;
    if (!tgId) return;
    await ensureVerified(tgId);

    const meetingPlugin = core.getMeetingPlugin();
    const meetingCfg = core.getMeetingConfig();
    if (!meetingPlugin || !meetingCfg) {
      await ctx.reply("Meetings are not configured.");
      return;
    }

    const result = await meetingPlugin.list(meetingCfg, userId(tgId), {
      action: "meeting-list",
      meeting_filter: "upcoming",
    });

    try {
      const parsed = JSON.parse(result);
      if (parsed.type === "meeting_list") {
        await ctx.reply(
          formatMeetingListHtml(parsed.meetings, parsed.filter),
          {
            parse_mode: "HTML",
            reply_markup: buildMeetingListKeyboard(parsed.meetings),
          },
        );
        return;
      }
    } catch {
      // fallback
    }
    await ctx.reply(result);
  });

  bot.command("help", async (ctx) => {
    const help = [
      "<b>FlowB Commands</b>",
      "",
      "<b>Events</b>",
      "/events - Browse upcoming events",
      "/search <i>keyword</i> - Search events",
      "/checkin - Check in at an event",
      "/going - RSVP or view your schedule",
      "/schedule - Your event schedule",
      "",
      "<b>Flow & Crews</b>",
      "/flow - Your connections & crews",
      "/crew - Manage your crews",
      "/share - Share your invite link",
      "/whosgoing - See who's going",
      "/wheremycrew - See where your crew is",
      "",
      "<b>Meetings</b>",
      "/meet <i>description</i> - Create a meeting",
      "/meetings - View upcoming meetings",
      "",
      "<b>Social</b>",
      "/whatsup - What's happening in your flow",
      "/whoshere - Who's checked in nearby",
      "/afterparty - After-party info & vibes",
      "",
      "<b>Points & Rewards</b>",
      "/points - View your points",
      "/rewards - Rewards & claim tokens",
      "/challenges - Active challenges & quests",
      "/referral - Your referral link & stats",
      "/wallet <i>0x...</i> - Link your Base wallet",
      "",
      "<b>More</b>",
      "/moves - Browse dance moves",
      "/sponsor - View or create sponsorships",
      "/topsponsor - Top sponsored leaderboard",
      "/leaderboard - Global points leaderboard",
      "/todo - View or add project todos",
      "",
      "<b>Account</b>",
      "/register - Connect your account",
      "/app - Open the FlowB mini app",
      "/menu - Main menu",
      "",
      "<b>Feedback</b>",
      "/suggestfeature - Suggest a feature",
      "/reportbug - Report a bug",
    ];
    await ctx.reply(help.join("\n"), {
      parse_mode: "HTML",
      reply_markup: buildBackToMenuKeyboard(),
    });
  });

  // /todo - View and manage project todos
  // Usage: /todo (list) | /todo add <title> | /todo done <number>
  bot.command("todo", async (ctx) => {
    const tgId = ctx.from!.id;
    const session = await ensureVerified(tgId);
    const text = ctx.match?.trim() || "";

    const sbUrl = process.env.DANZ_SUPABASE_URL;
    const sbKey = process.env.DANZ_SUPABASE_KEY;

    if (!sbUrl || !sbKey) {
      await ctx.reply("Todo system not configured.", { parse_mode: "HTML" });
      return;
    }

    // /todo add <title> — create a new todo
    if (text.startsWith("add ")) {
      const title = text.slice(4).trim();
      if (!title) {
        await ctx.reply("Usage: <code>/todo add Fix the login bug</code>", { parse_mode: "HTML" });
        return;
      }

      try {
        const res = await fetch(`${sbUrl}/rest/v1/flowb_todos`, {
          method: "POST",
          headers: {
            apikey: sbKey,
            Authorization: `Bearer ${sbKey}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            title,
            status: "open",
            priority: "medium",
            category: "general",
            created_by: userId(tgId),
            source: "bot",
          }),
        });

        if (!res.ok) {
          await ctx.reply("Failed to create todo. Try again.", { parse_mode: "HTML" });
          return;
        }

        const created = await res.json();
        const todo = Array.isArray(created) ? created[0] : created;
        const who = session.danzUsername || ctx.from?.first_name || `${tgId}`;

        alertAdmins(
          `New TODO from <b>${who}</b>: ${title}`,
          "info",
        );

        await ctx.reply(
          `\u2705 Todo added: <b>${title}</b>`,
          { parse_mode: "HTML" },
        );

        fireAndForget(core.awardPoints(userId(tgId), "telegram", "todo_added"), "award points");
      } catch {
        await ctx.reply("Error creating todo.", { parse_mode: "HTML" });
      }
      return;
    }

    // /todo done <number> — mark a todo as completed
    if (text.startsWith("done ")) {
      const num = parseInt(text.replace("done ", ""), 10);
      if (isNaN(num) || num < 1) {
        await ctx.reply("Usage: <code>/todo done 3</code>", { parse_mode: "HTML" });
        return;
      }

      try {
        // Fetch open todos to find the one by index
        const listRes = await fetch(
          `${sbUrl}/rest/v1/flowb_todos?status=eq.open&order=priority.desc,created_at.desc&limit=20&select=id,title`,
          { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } },
        );
        const todos: any[] = listRes.ok ? await listRes.json() : [];

        if (num > todos.length) {
          await ctx.reply(`Only ${todos.length} open todos. Use <code>/todo</code> to see the list.`, { parse_mode: "HTML" });
          return;
        }

        const target = todos[num - 1];
        await fetch(`${sbUrl}/rest/v1/flowb_todos?id=eq.${target.id}`, {
          method: "PATCH",
          headers: {
            apikey: sbKey,
            Authorization: `Bearer ${sbKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            status: "done",
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });

        const who = session.danzUsername || ctx.from?.first_name || `${tgId}`;
        alertAdmins(`TODO completed by <b>${who}</b>: ${target.title}`, "info");

        await ctx.reply(
          `\u2705 Done: <b>${target.title}</b>`,
          { parse_mode: "HTML" },
        );
      } catch {
        await ctx.reply("Error updating todo.", { parse_mode: "HTML" });
      }
      return;
    }

    // /todo — list open todos
    try {
      const listRes = await fetch(
        `${sbUrl}/rest/v1/flowb_todos?status=eq.open&order=priority.desc,created_at.desc&limit=20&select=id,title,priority,category,assigned_to`,
        { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } },
      );
      const todos: any[] = listRes.ok ? await listRes.json() : [];

      if (!todos.length) {
        await ctx.reply("\u2705 No open todos! All clear.", { parse_mode: "HTML" });
        return;
      }

      const priorityIcon: Record<string, string> = {
        critical: "\ud83d\udea8",
        high: "\ud83d\udd34",
        medium: "\ud83d\udfe1",
        low: "\u26aa",
      };

      const lines = [
        `<b>Open Todos</b> (${todos.length})`,
        "",
      ];

      for (let i = 0; i < todos.length; i++) {
        const t = todos[i];
        const icon = priorityIcon[t.priority] || "\u26aa";
        const cat = t.category && t.category !== "general" ? ` [${t.category}]` : "";
        const assigned = t.assigned_to ? ` \u2192 ${t.assigned_to}` : "";
        lines.push(`${i + 1}. ${icon} ${t.title}${cat}${assigned}`);
      }

      lines.push("");
      lines.push("<code>/todo add &lt;title&gt;</code> \u2014 add");
      lines.push("<code>/todo done &lt;number&gt;</code> \u2014 complete");

      await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
    } catch {
      await ctx.reply("Error loading todos.", { parse_mode: "HTML" });
    }
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
  // Social awareness commands
  // ========================================================================

  bot.command("whatsup", async (ctx) => {
    const tgId = ctx.from!.id;
    await ensureVerified(tgId);
    await ctx.replyWithChatAction("typing");

    try {
      const res = await fetch(`${FLOWB_CHAT_URL}/api/v1/flow/whats-happening`, {
        headers: { Authorization: `Bearer ${signJwtForBot(tgId)}` },
      });
      if (!res.ok) {
        await ctx.reply("Could not load social feed right now. Try again later!", { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD });
        return;
      }
      const data = await res.json() as any;
      await ctx.reply(formatWhatsHappeningHtml(data), { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD });
    } catch (err: any) {
      console.error("[flowb-telegram] /whatsup error:", err.message);
      await ctx.reply("Something went wrong fetching updates. Try again!", { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD });
    }
  });

  bot.command("afterparty", async (ctx) => {
    const tgId = ctx.from!.id;
    await ensureVerified(tgId);
    await ctx.replyWithChatAction("typing");

    try {
      const res = await fetch(`${FLOWB_CHAT_URL}/api/v1/flow/after-party`, {
        headers: { Authorization: `Bearer ${signJwtForBot(tgId)}` },
      });
      if (!res.ok) {
        await ctx.reply("Could not load after-party info right now. Try again later!", { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD });
        return;
      }
      const data = await res.json() as any;
      await ctx.reply(formatAfterPartyHtml(data), { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD });
    } catch (err: any) {
      console.error("[flowb-telegram] /afterparty error:", err.message);
      await ctx.reply("Something went wrong. Try again!", { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD });
    }
  });

  bot.command("whoshere", async (ctx) => {
    const tgId = ctx.from!.id;
    await ensureVerified(tgId);
    await ctx.replyWithChatAction("typing");

    try {
      const res = await fetch(`${FLOWB_CHAT_URL}/api/v1/flow/whos-here`, {
        headers: { Authorization: `Bearer ${signJwtForBot(tgId)}` },
      });
      if (!res.ok) {
        await ctx.reply("Could not check who's here. Try again later!", { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD });
        return;
      }
      const data = await res.json() as any;
      await ctx.reply(formatWhosHereHtml(data), { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD });
    } catch (err: any) {
      console.error("[flowb-telegram] /whoshere error:", err.message);
      await ctx.reply("Something went wrong. Try again!", { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD });
    }
  });

  // ========================================================================
  // Feedback & Bug Report commands
  // ========================================================================

  bot.command(["suggestfeature", "addfeature"], async (ctx) => {
    const tgId = ctx.from!.id;
    const args = ctx.match?.trim();

    if (args) {
      // Inline suggestion: /suggestfeature <text>
      await handleFeatureSuggestion(ctx, core, tgId, args);
      return;
    }

    setSession(tgId, { awaitingSuggestion: true, awaitingBugReport: false });
    await ctx.reply(
      "\u{1F4A1} <b>Feature Suggestion</b>\n\nWhat feature would you like to see? Type your suggestion:",
      { parse_mode: "HTML" },
    );
  });

  bot.command("reportbug", async (ctx) => {
    const tgId = ctx.from!.id;
    const args = ctx.match?.trim();

    if (args) {
      // Inline bug report: /reportbug <text>
      await handleBugReport(ctx, core, tgId, args);
      return;
    }

    setSession(tgId, { awaitingBugReport: true, awaitingSuggestion: false });
    await ctx.reply(
      "\u{1F41B} <b>Bug Report</b>\n\nDescribe the bug you found:",
      { parse_mode: "HTML" },
    );
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
      fireAndForget(core.awardPoints(userId(member.id), "telegram", "group_joined"), "award points");

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
  // Bot added/removed from group (channel registration)
  // ========================================================================

  bot.on("my_chat_member", async (ctx) => {
    const update = ctx.myChatMember;
    const chat = update.chat;
    const newStatus = update.new_chat_member.status;

    if (newStatus === "member" || newStatus === "administrator") {
      await registerChannel(chat.id, chat.type, (chat as any).title, update.from.id);
      console.log(`[flowb-chatter] Bot added to ${(chat as any).title || chat.id} (${chat.id})`);
    } else if (newStatus === "left" || newStatus === "kicked") {
      await deactivateChannel(chat.id);
      console.log(`[flowb-chatter] Bot removed from ${(chat as any).title || chat.id}`);
    }
  });

  // ========================================================================
  // Channel post reactions (track engagement)
  // ========================================================================

  bot.on("message_reaction", async (ctx) => {
    const tgId = ctx.messageReaction.user?.id;
    if (!tgId) return;

    fireAndForget(core.awardPoints(userId(tgId), "telegram", "channel_reaction"), "award points");
  });

  // ========================================================================
  // Callback queries (button clicks)
  // ========================================================================

  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const tgId = ctx.from.id;

    // ---- Onboarding callbacks: onb:* ----
    if (data.startsWith("onb:")) {
      const parts = data.split(":");
      const category = parts[1]; // "when", "cat", "crew"
      const value = parts[2];
      const state = onboardingStates.get(tgId);

      if (!state) {
        await ctx.answerCallbackQuery({ text: "Onboarding expired. Tap /start again." });
        return;
      }

      // --- Step 1: When ---
      if (category === "when") {
        state.data.arrival_date = value;
        await ctx.answerCallbackQuery({ text: "Got it!" });
        await sendOnboardingInterests(ctx, tgId);
        return;
      }

      // --- Step 2: Interests (multi-select) ---
      if (category === "cat") {
        if (value === "done") {
          // Move to crew step
          await ctx.answerCallbackQuery();
          await sendOnboardingCrew(ctx, tgId, botUsername);
          return;
        }

        // Toggle category selection
        const cats = state.data.interest_categories;
        const idx = cats.indexOf(value);
        if (idx >= 0) {
          cats.splice(idx, 1);
        } else {
          cats.push(value);
        }

        // Update the keyboard to show selected state
        try {
          await ctx.editMessageReplyMarkup({
            reply_markup: buildOnboardingInterestsKeyboard(cats),
          });
        } catch {
          // Message may not be editable, send new one
        }
        await ctx.answerCallbackQuery({ text: cats.length ? `Selected: ${cats.join(", ")}` : "Tap categories you like" });
        return;
      }

      // --- Step 3: Crew ---
      if (category === "crew") {
        await ctx.answerCallbackQuery();

        if (value === "browse") {
          // Complete onboarding first, then show crew browse
          await completeOnboarding(ctx, tgId, core, miniAppUrl);
          // Trigger crew browse
          const flowPlugin = core.getFlowPlugin();
          const flowCfg = core.getFlowConfig();
          if (flowPlugin && flowCfg) {
            try {
              const browseResult = await flowPlugin.crewBrowse(flowCfg);
              const crews = JSON.parse(browseResult);
              if (Array.isArray(crews) && crews.length > 0) {
                await ctx.reply(
                  formatCrewBrowseHtml(crews),
                  { parse_mode: "HTML", reply_markup: buildCrewBrowseKeyboard(crews) },
                );
              } else {
                await ctx.reply("No public crews yet. Be the first to create one!", {
                  parse_mode: "HTML",
                  reply_markup: new InlineKeyboard().text("\ud83d\ude80 Create Crew", "fl:crew-create"),
                });
              }
            } catch {
              await ctx.reply("No public crews found.", {
                parse_mode: "HTML",
                reply_markup: new InlineKeyboard().text("\ud83d\ude80 Create Crew", "fl:crew-create"),
              });
            }
          }
          return;
        }

        if (value === "create") {
          await completeOnboarding(ctx, tgId, core, miniAppUrl);
          setSession(tgId, { awaitingCrewName: true });
          await ctx.reply(
            [
              "\ud83d\ude80 <b>Create a Crew</b>",
              "",
              "What would you like to name your crew?",
              "",
              "Tip: start with an emoji for flair! e.g. <b>\ud83d\udc3a Salsa Wolves</b>",
            ].join("\n"),
            { parse_mode: "HTML" },
          );
          return;
        }

        if (value === "invite") {
          await completeOnboarding(ctx, tgId, core, miniAppUrl);
          await ctx.reply(
            "Paste your crew invite link or use /start with the link your friend shared.",
          );
          return;
        }

        if (value === "skip") {
          await completeOnboarding(ctx, tgId, core, miniAppUrl);
          return;
        }
      }

      await ctx.answerCallbackQuery();
      return;
    }

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

      // --- Luma Event Details (full description + tickets + guest count) ---
      if (action === "luma") {
        if (!event) {
          await ctx.answerCallbackQuery({ text: "Event not found." });
          return;
        }

        const egator = core.getEGatorPlugin();
        const luma = egator?.getLumaAdapter();
        if (!luma) {
          await ctx.answerCallbackQuery({ text: "Luma not configured." });
          return;
        }

        await ctx.answerCallbackQuery({ text: "Loading Luma details..." });
        await ctx.replyWithChatAction("typing");

        const lumaId = (event.sourceEventId || event.id).replace(/^luma_/, "");
        const [detail, tickets, guestsResult] = await Promise.all([
          luma.getEventDetail(lumaId),
          luma.getTicketTypes(lumaId),
          luma.getGuests(lumaId, { status: "approved", limit: 5 }),
        ]);

        const lines: string[] = [];

        // Title
        lines.push(`<b>${escapeHtml(event.title)}</b>`);
        lines.push("");

        // Full description from Luma
        if (detail?.descriptionMd) {
          const desc = detail.descriptionMd.length > 800
            ? detail.descriptionMd.slice(0, 797) + "..."
            : detail.descriptionMd;
          lines.push(escapeHtml(desc));
          lines.push("");
        }

        // Location
        if (detail?.geoAddress) {
          lines.push(`<b>Location:</b> ${escapeHtml(detail.geoAddress)}`);
        } else if (event.locationName) {
          lines.push(`<b>Location:</b> ${escapeHtml(event.locationName)}`);
        }

        // Time
        if (detail?.startAt) {
          const start = new Date(detail.startAt);
          const timeStr = start.toLocaleString("en-US", {
            weekday: "short", month: "short", day: "numeric",
            hour: "numeric", minute: "2-digit", timeZone: "America/Denver",
          });
          lines.push(`<b>When:</b> ${timeStr} MST`);
        }

        // Tickets
        if (tickets.length > 0) {
          lines.push("");
          lines.push("<b>Tickets:</b>");
          for (const t of tickets) {
            if (t.isHidden) continue;
            const price = t.type === "free" || !t.cents ? "Free" : `$${(t.cents / 100).toFixed(2)}`;
            const cap = t.maxCapacity ? ` (${t.maxCapacity} spots)` : "";
            const tokenGate = t.tokenRequirements ? " [Token Gated]" : "";
            lines.push(`  ${escapeHtml(t.name)} - ${price}${cap}${tokenGate}`);
          }
        }

        // Guests
        if (guestsResult.total > 0) {
          lines.push("");
          lines.push(`<b>${guestsResult.total} attending</b>`);
          if (guestsResult.guests.length > 0) {
            const names = guestsResult.guests
              .filter((g) => g.userName)
              .map((g) => g.userName!)
              .slice(0, 5);
            if (names.length) {
              lines.push(`Including: ${names.join(", ")}${guestsResult.total > 5 ? "..." : ""}`);
            }
          }
        }

        // Virtual link
        if (detail?.meetingUrl) {
          lines.push("");
          lines.push(`<b>Virtual:</b> <a href="${escapeHtml(detail.meetingUrl)}">Join online</a>`);
        }

        const kb = new InlineKeyboard();
        if (event.url) {
          kb.url("Open on Luma", event.url);
        }
        kb.text("Back", `ec:back`);

        await ctx.reply(lines.join("\n"), {
          parse_mode: "HTML",
          reply_markup: kb,
          link_preview_options: { is_disabled: true },
        });
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

    // ---- Event Link callbacks: el:share:ID, el:going:ID, el:save:ID ----
    if (data.startsWith("el:")) {
      const parts = data.split(":");
      const action = parts[1];
      const eventIdShort = parts[2];

      const session = getSession(tgId);
      const event = session?.filteredEvents?.find((e) => e.id.startsWith(eventIdShort || ""));

      if (!event) {
        await ctx.answerCallbackQuery({ text: "Event not found. Try pasting the link again." });
        return;
      }

      const flowPlugin = core.getFlowPlugin();
      const flowCfg = core.getFlowConfig();

      if (action === "share") {
        // RSVP as going + share with flow + award points
        if (flowPlugin && flowCfg) {
          await flowPlugin.rsvpWithDetails(
            flowCfg, userId(tgId), event.id, event.title,
            event.startTime, event.locationName || null, "going",
          );
        }
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "event_link_shared"), "award points");
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "event_rsvp"), "award points");

        // Notify flow in background
        fireAndForget(notifyFlowAboutRsvp(core, userId(tgId), event.id, event.title, bot), "notify flow about rsvp");

        await ctx.answerCallbackQuery({ text: "Shared with your flow!" });
        await ctx.reply(
          `<b>\ud83d\udce4 Shared!</b> ${escapeHtml(event.title)}\n\nSent to your friends &amp; crews.`,
          { parse_mode: "HTML" },
        );
        return;
      }

      if (action === "going") {
        // RSVP only
        if (flowPlugin && flowCfg) {
          await flowPlugin.rsvpWithDetails(
            flowCfg, userId(tgId), event.id, event.title,
            event.startTime, event.locationName || null, "going",
          );
        }
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "event_rsvp"), "award points");

        // Notify flow in background
        fireAndForget(notifyFlowAboutRsvp(core, userId(tgId), event.id, event.title, bot), "notify flow about rsvp");

        await ctx.answerCallbackQuery({ text: `\u2705 ${event.title}` });
        await ctx.reply(
          `<b>\u2705 You're going!</b> ${escapeHtml(event.title)}`,
          { parse_mode: "HTML" },
        );
        return;
      }

      if (action === "save") {
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
          await ctx.answerCallbackQuery({ text: `\u2b50 Saved: ${event.title}`, show_alert: false });
        }
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
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "flow_invite_sent"), "award points");
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
        setSession(tgId, { awaitingCrewName: true });
        await ctx.reply(
          [
            "\ud83d\ude80 <b>Create a Crew</b>",
            "",
            "What would you like to name your crew?",
            "",
            "Tip: start with an emoji for flair! e.g. <b>\ud83d\udc3a Salsa Wolves</b>",
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
          fireAndForget(core.awardPoints(userId(tgId), "telegram", pointAction), "award points");
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

          fireAndForget(core.awardPoints(userId(tgId), "telegram", "event_rsvp"), "award points");

          // Notify flow in background
          if (action === "going") {
            fireAndForget(notifyFlowAboutRsvp(core, userId(tgId), event.id, event.title, bot), "notify flow about rsvp");
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

        await ctx.answerCallbackQuery();
        await ctx.replyWithChatAction("typing");

        const flowPlugin = core.getFlowPlugin();
        const flowCfg = core.getFlowConfig();

        // Get FlowB attendance
        let goingNames: string[] = [];
        let maybeNames: string[] = [];
        if (flowPlugin && flowCfg) {
          const attendance = await flowPlugin.getFlowAttendanceForEvent(flowCfg, userId(tgId), event.id);
          goingNames = attendance.going.map((id: string) => id.replace("telegram_", "@"));
          maybeNames = attendance.maybe.map((id: string) => id.replace("telegram_", "@"));
        }

        // Also pull from Luma guest list
        const egator = core.getEGatorPlugin();
        const luma = egator?.getLumaAdapter();
        let lumaGuestCount = 0;
        let lumaGuestNames: string[] = [];

        if (luma) {
          const lumaId = (event.sourceEventId || event.id).replace(/^luma_/, "");
          const result = await luma.getGuests(lumaId, { status: "approved", limit: 10 });
          lumaGuestCount = result.total;
          lumaGuestNames = result.guests
            .filter((g) => g.userName)
            .map((g) => g.userName!)
            .slice(0, 10);
        }

        // Build combined response
        const lines: string[] = [];
        lines.push(`<b>${escapeHtml(event.title)}</b>`);
        lines.push("");

        if (goingNames.length || maybeNames.length) {
          lines.push("<b>From your flow:</b>");
          if (goingNames.length) lines.push(`Going: ${goingNames.join(", ")}`);
          if (maybeNames.length) lines.push(`Maybe: ${maybeNames.join(", ")}`);
          lines.push("");
        }

        if (lumaGuestCount > 0) {
          lines.push(`<b>On Luma: ${lumaGuestCount} registered</b>`);
          if (lumaGuestNames.length) {
            lines.push(lumaGuestNames.join(", ") + (lumaGuestCount > 10 ? "..." : ""));
          }
        } else if (!goingNames.length && !maybeNames.length) {
          lines.push("No one yet - be the first!");
        }

        await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
        return;
      }

      await ctx.answerCallbackQuery();
      return;
    }

    // Crew management callbacks: cr:approve, cr:deny, cr:settings, cr:toggle-public, cr:join-mode, cr:promote, cr:demote, cr:browse, cr:join-request
    // ---- Meeting callbacks: mt:* ----
    if (data.startsWith("mt:")) {
      const parts = data.split(":");
      const action = parts[1];
      const meetingPlugin = core.getMeetingPlugin();
      const meetingCfg = core.getMeetingConfig();

      if (!meetingPlugin || !meetingCfg) {
        await ctx.answerCallbackQuery({ text: "Meetings not configured" });
        return;
      }

      // mt:view:{id8} - view meeting detail
      if (action === "view") {
        const id8 = parts[2];
        // Find meeting by id prefix
        const result = await meetingPlugin.execute("meeting-list", {
          action: "meeting-list",
          user_id: userId(tgId),
          meeting_filter: "upcoming",
        }, { userId: userId(tgId), platform: "telegram", config: {} as any });
        try {
          const parsed = JSON.parse(result);
          const match = (parsed.meetings || []).find((m: any) => m.id.startsWith(id8));
          if (match) {
            const meeting = await meetingPlugin.getById(meetingCfg, match.id);
            if (meeting) {
              const attendees = await meetingPlugin.getAttendees(meetingCfg, meeting.id);
              const isCreator = meeting.creator_id === userId(tgId);
              await ctx.editMessageText(
                formatMeetingDetailHtml(
                  meeting.title, meeting.starts_at, meeting.duration_min,
                  meeting.meeting_type, meeting.status, meeting.location,
                  meeting.description, attendees.length,
                ),
                {
                  parse_mode: "HTML",
                  reply_markup: buildMeetingDetailKeyboard(meeting.id, isCreator, meeting.share_code),
                },
              );
            }
          }
        } catch { /* ignore */ }
        await ctx.answerCallbackQuery();
        return;
      }

      // mt:rsvp:{id8}:{status} - RSVP to a meeting
      if (action === "rsvp") {
        const id8 = parts[2];
        const rsvpStatus = parts[3] || "accepted";
        // Find full meeting ID
        const sbUrl = process.env.DANZ_SUPABASE_URL;
        const sbKey = process.env.DANZ_SUPABASE_KEY;
        if (sbUrl && sbKey) {
          const meetings = await sbQuery<any[]>({ supabaseUrl: sbUrl, supabaseKey: sbKey }, "flowb_meetings", {
            select: "id,share_code",
            id: `like.${id8}%`,
            limit: "1",
          });
          if (meetings?.length) {
            const result = await meetingPlugin.rsvpByCode(meetingCfg, userId(tgId), meetings[0].share_code, rsvpStatus);
            if (result) {
              const statusText = rsvpStatus === "accepted" ? "accepted" : rsvpStatus === "maybe" ? "tentatively accepted" : "declined";
              await ctx.answerCallbackQuery({ text: `Meeting ${statusText}!` });
              // Refresh the meeting detail
              const attendees = await meetingPlugin.getAttendees(meetingCfg, result.meeting.id);
              const isCreator = result.meeting.creator_id === userId(tgId);
              await ctx.editMessageText(
                formatMeetingDetailHtml(
                  result.meeting.title, result.meeting.starts_at, result.meeting.duration_min,
                  result.meeting.meeting_type, result.meeting.status, result.meeting.location,
                  result.meeting.description, attendees.length,
                ),
                {
                  parse_mode: "HTML",
                  reply_markup: buildMeetingDetailKeyboard(result.meeting.id, isCreator, result.meeting.share_code),
                },
              );
              fireAndForget(core.awardPoints(userId(tgId), "telegram", "meeting_rsvp"), "award points");
              return;
            }
          }
        }
        await ctx.answerCallbackQuery({ text: "Meeting not found" });
        return;
      }

      // mt:share:{id8} - share meeting link
      if (action === "share") {
        const id8 = parts[2];
        const sbUrl = process.env.DANZ_SUPABASE_URL;
        const sbKey = process.env.DANZ_SUPABASE_KEY;
        if (sbUrl && sbKey) {
          const meetings = await sbQuery<any[]>({ supabaseUrl: sbUrl, supabaseKey: sbKey }, "flowb_meetings", {
            select: "id,title,share_code",
            id: `like.${id8}%`,
            limit: "1",
          });
          if (meetings?.length) {
            const link = meetingPlugin.getShareLink(meetings[0].share_code);
            await ctx.answerCallbackQuery();
            await ctx.reply(
              `<b>Share this meeting</b>\n\n${escapeHtml(meetings[0].title)}\n\n${link}`,
              { parse_mode: "HTML" },
            );
            return;
          }
        }
        await ctx.answerCallbackQuery({ text: "Meeting not found" });
        return;
      }

      // mt:complete:{id8} - complete a meeting
      if (action === "complete") {
        const id8 = parts[2];
        const sbUrl = process.env.DANZ_SUPABASE_URL;
        const sbKey = process.env.DANZ_SUPABASE_KEY;
        if (sbUrl && sbKey) {
          const meetings = await sbQuery<any[]>({ supabaseUrl: sbUrl, supabaseKey: sbKey }, "flowb_meetings", {
            select: "id",
            id: `like.${id8}%`,
            limit: "1",
          });
          if (meetings?.length) {
            const result = await meetingPlugin.complete(meetingCfg, userId(tgId), meetings[0].id);
            await ctx.answerCallbackQuery({ text: result });
            return;
          }
        }
        await ctx.answerCallbackQuery({ text: "Meeting not found" });
        return;
      }

      // mt:cancel:{id8} - cancel a meeting
      if (action === "cancel") {
        const id8 = parts[2];
        const sbUrl = process.env.DANZ_SUPABASE_URL;
        const sbKey = process.env.DANZ_SUPABASE_KEY;
        if (sbUrl && sbKey) {
          const meetings = await sbQuery<any[]>({ supabaseUrl: sbUrl, supabaseKey: sbKey }, "flowb_meetings", {
            select: "id",
            id: `like.${id8}%`,
            limit: "1",
          });
          if (meetings?.length) {
            const result = await meetingPlugin.cancel(meetingCfg, userId(tgId), meetings[0].id);
            await ctx.answerCallbackQuery({ text: result });
            return;
          }
        }
        await ctx.answerCallbackQuery({ text: "Meeting not found" });
        return;
      }

      // mt:new - show create prompt
      if (action === "new") {
        await ctx.answerCallbackQuery();
        await ctx.reply(formatMeetingCreatePromptHtml(), {
          parse_mode: "HTML",
          reply_markup: buildMeetingCreateKeyboard(),
        });
        return;
      }

      // mt:chat:{id8} - placeholder for chat
      if (action === "chat") {
        await ctx.answerCallbackQuery({ text: "Send a message with /meet chat <meetingId> <message>" });
        return;
      }

      await ctx.answerCallbackQuery();
      return;
    }

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
            fireAndForget(core.awardPoints(parsed.userId, "telegram", "crew_joined"), "award points");
            fireAndForget(core.awardPoints(parsed.userId, "telegram", "crew_request_approved"), "award points");

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
          const members = await sbQuery<any[]>(flowCfg, "flowb_group_members", {
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
          const members = await sbQuery<any[]>(flowCfg, "flowb_group_members", {
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

          const members = await sbQuery<any[]>(flowCfg, "flowb_group_members", {
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
            fireAndForget(core.awardPoints(userId(tgId), "telegram", "crew_joined"), "award points");
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
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "farcaster_viewed"), "award points");
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
      fireAndForget(core.awardPoints(userId(tgId), "telegram", action), "award points");

      // Chatter capture (fire-and-forget, never blocks response)
      if (shouldAnalyze(ctx.message.text)) {
        (async () => {
          try {
            const signal = await extractSignals(ctx.message.text);
            if (signal && signal.confidence >= 0.6) {
              const senderName = ctx.from?.first_name || ctx.from?.username || "Unknown";
              await storeSignal(
                ctx.chat.id,
                ctx.message.message_id,
                tgId,
                senderName,
                signal,
                ctx.message.text,
              );
              fireAndForget(core.awardPoints(userId(tgId), "telegram", "chatter_signal"), "award points");
              console.log(`[flowb-chatter] Signal stored: "${signal.event_title}" (${signal.confidence})`);
            }
          } catch (err: any) {
            console.error("[flowb-chatter] extraction error:", err.message);
          }
        })();
      }

      const textLower = ctx.message.text.toLowerCase();
      const isReplyToBot = ctx.message.reply_to_message?.from?.id === bot.botInfo?.id;
      const mentioned = textLower.includes("flowb")
        || textLower.includes(`@${botUsername.toLowerCase()}`)
        || isReplyToBot;
      if (!mentioned) return;
    }

    await ensureVerified(tgId);
    if (!isGroup) {
      fireAndForget(core.awardPoints(userId(tgId), "telegram", "message_sent"), "award points");
    }

    // Strip leading bot mention so natural text triggers work in group chats
    // e.g. "@FlowB_bot leaderboard" → "leaderboard", "flowb leaderboard" → "leaderboard"
    const rawText = ctx.message.text.trim();
    const text = rawText
      .replace(new RegExp(`^@?${botUsername}[,:]?\\s*`, "i"), "")
      .replace(/^flowb[,:]?\s*/i, "")
      .trim() || rawText;
    const lower = text.toLowerCase();

    // ---- Event URL detection (Luma) ----
    const EVENT_URL_REGEX = /https?:\/\/(?:lu\.ma|luma\.com)\/[^\s]+/gi;
    const eventUrlMatch = text.match(EVENT_URL_REGEX);
    if (eventUrlMatch && !isGroup) {
      const url = eventUrlMatch[0];
      try {
        await ctx.replyWithChatAction("typing");
        const result = await core.execute("event-link", {
          action: "event-link",
          url,
          user_id: userId(tgId),
          platform: "telegram",
        });

        const parsed = JSON.parse(result);
        if (!parsed.error) {
          const event = parsed as EventResult;
          // Store in session for callback handlers
          const session = getSession(tgId) || setSession(tgId, {});
          if (!session.filteredEvents) session.filteredEvents = [];
          // Add to front of list (dedup by id)
          if (!session.filteredEvents.some((e) => e.id === event.id)) {
            session.filteredEvents.unshift(event);
          }

          await ctx.reply(formatEventLinkCardHtml(event), {
            parse_mode: "HTML",
            reply_markup: buildEventLinkKeyboard(event.id, event.url),
          });

          // Event discovered (no-op for now)
          return;
        }
        // If extraction failed, fall through to normal text handling
      } catch {
        // Fall through to normal text handling
      }
    }

    // ---- Natural text command router ----
    // Matches plain words, phrases, and conversational triggers so users
    // never need slash commands. Order matters: more specific first.

    // Menu
    if (/^(menu|home|start|hi|hey|hello|yo|sup)$/i.test(lower)) {
      await ctx.reply(formatMenuHtml(), {
        parse_mode: "HTML",
        reply_markup: buildCompactMenuKeyboard(miniAppUrl || undefined),
      });
      return;
    }

    // Events / browse
    if (/^(events|browse|whats on|what's on|show events|browse events|find events)$/i.test(lower)) {
      await sendEventCards(ctx, core, {});
      return;
    }

    // Search events (freeform: "search X", "find X events", "looking for X")
    const searchMatch = lower.match(/^(?:search|find|looking for|show me)\s+(.+)/i);
    if (searchMatch) {
      await ensureVerified(tgId);
      const intent = parseSearchIntent(searchMatch[1]);
      await sendEventCards(ctx, core, { city: intent.city, style: intent.style, query: intent.query });
      fireAndForget(core.awardPoints(userId(tgId), "telegram", "search"), "award points");
      return;
    }

    // Flow menu
    if (/^(flow|my flow)$/i.test(lower)) {
      await ctx.reply(formatFlowMenuHtml(), {
        parse_mode: "HTML",
        reply_markup: buildFlowMenuKeyboard(botUsername),
      });
      return;
    }

    // Points / score
    if (/^(points|my points|score|my score|how many points|xp)$/i.test(lower)) {
      await ensureVerified(tgId);
      await sendCoreAction(ctx, core, "my-points");
      return;
    }

    // Leaderboard
    if (/^(leaderboard|lb|rankings|top crews|top players|scoreboard|who.?s winning|who.?s on top)$/i.test(lower)) {
      await ctx.replyWithChatAction("typing");
      const crews = await core.getGlobalCrewRanking();
      const individuals = await core.getGlobalIndividualRanking();
      const lines: string[] = ["<b>\ud83c\udfc6 FlowB Leaderboard</b>", ""];
      lines.push("<b>Top Crews</b>");
      if (crews.length > 0) {
        crews.slice(0, 10).forEach((c, i) => {
          const medal = i === 0 ? "\ud83e\udd47" : i === 1 ? "\ud83e\udd48" : i === 2 ? "\ud83e\udd49" : `${i + 1}.`;
          const emoji = c.emoji ? `${c.emoji} ` : "";
          lines.push(`${medal} ${emoji}<b>${escapeHtml(c.name)}</b> \u2014 ${c.totalPoints} pts (${c.memberCount} members)`);
        });
      } else {
        lines.push("<i>No crews yet. Create one with /crew</i>");
      }
      lines.push("");
      lines.push("<b>Top Individuals</b>");
      if (individuals.length > 0) {
        individuals.slice(0, 10).forEach((p, i) => {
          const medal = i === 0 ? "\ud83e\udd47" : i === 1 ? "\ud83e\udd48" : i === 2 ? "\ud83e\udd49" : `${i + 1}.`;
          const streak = p.currentStreak > 0 ? ` \ud83d\udd25${p.currentStreak}` : "";
          lines.push(`${medal} <b>${escapeHtml(p.displayName)}</b> \u2014 ${p.totalPoints} pts${streak} (${p.milestoneTitle})`);
        });
      } else {
        lines.push("<i>No points earned yet. Start exploring!</i>");
      }
      await ctx.reply(lines.join("\n"), { parse_mode: "HTML", reply_markup: buildBackToMenuKeyboard() });
      return;
    }

    // Share / invite
    if (/^(share|invite|invite link|share link|referral|my link|get link)$/i.test(lower)) {
      await ensureVerified(tgId);
      const flowPlugin = core.getFlowPlugin();
      const flowCfg = core.getFlowConfig();
      if (!flowPlugin || !flowCfg) { await ctx.reply("Flow not configured."); return; }
      const link = await flowPlugin.getInviteLink(flowCfg, userId(tgId));
      await ctx.reply(formatFlowShareHtml(link), {
        parse_mode: "HTML",
        reply_markup: buildFlowShareKeyboard(link),
      });
      fireAndForget(core.awardPoints(userId(tgId), "telegram", "flow_invite_sent"), "award points");
      return;
    }

    // Crew (with sub-commands via natural text)
    if (/^(crew|my crew|crews|team|squad)$/i.test(lower)) {
      const session = await ensureVerified(tgId);
      if (!session.verified) {
        await ctx.reply(formatConnectPromptHtml(), { parse_mode: "HTML", reply_markup: buildConnectKeyboard(danzConnectUrl) });
        return;
      }
      const result = await core.execute("crew-list", { action: "crew-list", user_id: userId(tgId), platform: "telegram" });
      await ctx.reply(markdownToHtml(result), { parse_mode: "HTML", reply_markup: buildCrewMenuKeyboard(botUsername) });
      return;
    }

    // Create crew: "create crew X", "new crew X", "make crew X"
    const crewCreateMatch = lower.match(/^(?:create|new|make)\s+(?:crew|team|squad)\s+(.+)/i);
    if (crewCreateMatch) {
      const session = await ensureVerified(tgId);
      if (!session.verified) {
        await ctx.reply(formatConnectPromptHtml(), { parse_mode: "HTML", reply_markup: buildConnectKeyboard(danzConnectUrl) });
        return;
      }
      const name = crewCreateMatch[1].trim();
      const result = await core.execute("crew-create", { action: "crew-create", user_id: userId(tgId), platform: "telegram", query: name });
      await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
      fireAndForget(core.awardPoints(userId(tgId), "telegram", "crew_created"), "award points");
      {
        const crewCreator = ctx.from?.username || ctx.from?.first_name || String(tgId);
        alertAdmins(`New crew created: <b>${name}</b> by @${crewCreator}`, "info");
      }
      return;
    }

    // Join crew: "join XXXX"
    const joinMatch = lower.match(/^join\s+([a-z0-9_-]+)/i);
    if (joinMatch) {
      await ensureVerified(tgId);
      const result = await core.execute("crew-join", { action: "crew-join", user_id: userId(tgId), platform: "telegram", query: joinMatch[1] });
      await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
      return;
    }

    // Check in: "check in", "checkin", "check in at X", "im at X", "i'm at X"
    const checkinMatch = lower.match(/^(?:check\s*in|checkin)(?:\s+(?:at\s+)?(.+))?$/i)
      || lower.match(/^(?:i'?m at|im at|at)\s+(.+)/i);
    if (checkinMatch) {
      const session = await ensureVerified(tgId);
      if (!session.verified) {
        await ctx.reply(formatConnectPromptHtml(), { parse_mode: "HTML", reply_markup: buildConnectKeyboard(danzConnectUrl) });
        return;
      }
      const venue = checkinMatch[1]?.trim();
      if (venue) {
        // Direct check-in to a venue via chat API
        await ctx.replyWithChatAction("typing");
        const chatSession = getSession(tgId) || setSession(tgId, {});
        const response = await sendFlowBChat(chatSession.chatHistory, `I'm at ${venue}`, userId(tgId));
        setSession(tgId, { chatHistory: [...chatSession.chatHistory, { role: "user" as const, content: `I'm at ${venue}` }, { role: "assistant" as const, content: response }].slice(-20) });
        await ctx.reply(markdownToHtml(response), { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD });
        return;
      }
      // No venue specified — show checkin UI
      const result = await core.execute("checkin", { action: "checkin", user_id: userId(tgId), platform: "telegram" });
      const rawEvents = await core.discoverEventsRaw({ action: "events", user_id: userId(tgId), platform: "telegram" });
      const now = new Date();
      const todayEvents = rawEvents.filter((e) => Math.abs(new Date(e.startTime).getTime() - now.getTime()) < 24 * 60 * 60 * 1000);
      if (todayEvents.length > 0) {
        await ctx.reply(markdownToHtml(result), { parse_mode: "HTML", reply_markup: buildCheckinKeyboard(todayEvents.slice(0, 5).map((e) => ({ id: e.id, title: e.title }))) });
      } else {
        await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
      }
      return;
    }

    // Schedule / my schedule
    if (/^(schedule|my schedule|my events|my list|saved|saved events)$/i.test(lower)) {
      await ensureVerified(tgId);
      const result = await core.execute("my-schedule", { action: "my-schedule", user_id: userId(tgId), platform: "telegram" });
      await ctx.reply(markdownToHtml(result), { parse_mode: "HTML", reply_markup: buildFlowMenuKeyboard(botUsername) });
      return;
    }

    // Where's my crew
    if (/^(where.?s? my crew|where.?s? (?:the )?crew|where is (?:my )?crew|find (?:my )?crew|locate crew)$/i.test(lower)) {
      await ctx.replyWithChatAction("typing");
      const chatSession = getSession(tgId) || setSession(tgId, {});
      const response = await sendFlowBChat(chatSession.chatHistory, "where's my crew?", userId(tgId));
      setSession(tgId, { chatHistory: [...chatSession.chatHistory, { role: "user" as const, content: "where's my crew?" }, { role: "assistant" as const, content: response }].slice(-20) });
      await ctx.reply(markdownToHtml(response), { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD });
      return;
    }

    // Who's going
    if (/^(who.?s going|whos going|who is going|who.?s? attending)$/i.test(lower)) {
      await ensureVerified(tgId);
      const result = await core.execute("whos-going", { action: "whos-going", user_id: userId(tgId), platform: "telegram" });
      await ctx.reply(markdownToHtml(result), { parse_mode: "HTML", reply_markup: buildFlowMenuKeyboard(botUsername) });
      return;
    }

    // Rewards / challenges
    if (/^(rewards|my rewards|challenges|quests|missions)$/i.test(lower)) {
      await ensureVerified(tgId);
      await sendCoreAction(ctx, core, "my-rewards");
      return;
    }

    // Feature suggestion triggers
    if (/^(suggest a feature|feature request|i wish|it would be cool if|feature idea|i have a suggestion)/i.test(lower)) {
      setSession(tgId, { awaitingSuggestion: true, awaitingBugReport: false });
      await ctx.reply(
        "\u{1F4A1} <b>Feature Suggestion</b>\n\nGreat, I'd love to hear it! Type your suggestion:",
        { parse_mode: "HTML" },
      );
      return;
    }

    // Bug report triggers
    if (/^(report a bug|found a bug|something.?s broken|there.?s a bug|bug report)/i.test(lower)) {
      setSession(tgId, { awaitingBugReport: true, awaitingSuggestion: false });
      await ctx.reply(
        "\u{1F41B} <b>Bug Report</b>\n\nSorry about that! Please describe what went wrong:",
        { parse_mode: "HTML" },
      );
      return;
    }

    // Help
    if (/^(help|commands|what can you do|how does this work)$/i.test(lower)) {
      await ctx.reply(
        `<b>FlowB</b> — your crew coordinator and event guide\n\n` +
        `Just type naturally! Here's what I can do:\n\n` +
        `<b>Events</b> — browse events\n` +
        `<b>Search defi</b> — find specific events\n` +
        `<b>Schedule</b> — your saved events\n` +
        `<b>Crew</b> — see your crews\n` +
        `<b>Create crew Wolfpack</b> — start a crew\n` +
        `<b>Join ABC123</b> — join with a code\n` +
        `<b>Check in at Venue</b> — check in somewhere\n` +
        `<b>Where's my crew</b> — locate crew members\n` +
        `<b>Share</b> — get your invite link\n` +
        `<b>Points</b> — see your score\n` +
        `<b>Rewards</b> — view challenges\n` +
        `<b>What's up</b> — social feed from your crew\n` +
        `<b>After party</b> — where is everyone heading\n` +
        `<b>Who's here</b> — who's at this event or city\n` +
        `<b>Suggest a feature</b> — send us an idea\n` +
        `<b>Report a bug</b> — let us know what's broken\n\n` +
        `Or just ask me anything — I'll look up events, find people, and help you plan your day!`,
        { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD },
      );
      return;
    }

    // What's happening / what's up
    if (/^(what.?s happening|what.?s up|whats going on|what.?s? new|what.?s? the vibe)$/i.test(lower)) {
      await ensureVerified(tgId);
      await ctx.replyWithChatAction("typing");
      try {
        const res = await fetch(`${FLOWB_CHAT_URL}/api/v1/flow/whats-happening`, {
          headers: { Authorization: `Bearer ${signJwtForBot(tgId)}` },
        });
        if (res.ok) {
          const data = await res.json() as any;
          await ctx.reply(formatWhatsHappeningHtml(data), { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD });
        } else {
          await ctx.reply("Could not load updates right now. Try again!", { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD });
        }
      } catch {
        await ctx.reply("Something went wrong. Try again!", { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD });
      }
      return;
    }

    // After party / where's everyone going
    if (/^(after ?party|where.?s everyone going|what.?s next|where did everyone go|where.?s? the party|next moves?)$/i.test(lower)) {
      await ensureVerified(tgId);
      await ctx.replyWithChatAction("typing");
      try {
        const res = await fetch(`${FLOWB_CHAT_URL}/api/v1/flow/after-party`, {
          headers: { Authorization: `Bearer ${signJwtForBot(tgId)}` },
        });
        if (res.ok) {
          const data = await res.json() as any;
          await ctx.reply(formatAfterPartyHtml(data), { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD });
        } else {
          await ctx.reply("Could not load after-party info. Try again!", { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD });
        }
      } catch {
        await ctx.reply("Something went wrong. Try again!", { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD });
      }
      return;
    }

    // Who's here / anyone here / anyone around
    if (/^(who.?s here|who is here|anyone here|anyone around|who.?s? nearby|who.?s? around)$/i.test(lower)) {
      await ensureVerified(tgId);
      await ctx.replyWithChatAction("typing");
      try {
        const res = await fetch(`${FLOWB_CHAT_URL}/api/v1/flow/whos-here`, {
          headers: { Authorization: `Bearer ${signJwtForBot(tgId)}` },
        });
        if (res.ok) {
          const data = await res.json() as any;
          await ctx.reply(formatWhosHereHtml(data), { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD });
        } else {
          await ctx.reply("Could not check who's around. Try again!", { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD });
        }
      } catch {
        await ctx.reply("Something went wrong. Try again!", { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD });
      }
      return;
    }


    // ---- Awaiting feature suggestion ----
    {
      const session = getSession(tgId);
      if (session?.awaitingSuggestion) {
        setSession(tgId, { awaitingSuggestion: false });
        await handleFeatureSuggestion(ctx, core, tgId, text.trim());
        return;
      }
    }

    // ---- Awaiting bug report ----
    {
      const session = getSession(tgId);
      if (session?.awaitingBugReport) {
        setSession(tgId, { awaitingBugReport: false });
        await handleBugReport(ctx, core, tgId, text.trim());
        return;
      }
    }

    // ---- Awaiting crew name (conversational crew creation) ----
    {
      const session = getSession(tgId);
      if (session?.awaitingCrewName) {
        setSession(tgId, { awaitingCrewName: false });
        const name = text.trim();
        if (!name) {
          await ctx.reply("Please send a crew name.");
          return;
        }
        await ctx.replyWithChatAction("typing");
        const result = await core.execute("crew-create", {
          action: "crew-create",
          user_id: userId(tgId),
          platform: "telegram",
          query: name,
        });
        await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
        core.awardPoints(userId(tgId), "telegram", "crew_created").catch(() => {});
        const crewCreator = ctx.from?.username || ctx.from?.first_name || String(tgId);
        alertAdmins(`New crew created: <b>${name}</b> by @${crewCreator}`, "info");
        return;
      }
    }

    // ---- LLM Chat (everything else) ----
    await ctx.replyWithChatAction("typing");

    const session = getSession(tgId) || setSession(tgId, {});
    const response = await sendFlowBChat(session.chatHistory, text, userId(tgId));

    // Update chat history (keep last 20 messages = 10 turns)
    const updatedHistory = [
      ...session.chatHistory,
      { role: "user" as const, content: text },
      { role: "assistant" as const, content: response },
    ].slice(-20);

    setSession(tgId, { chatHistory: updatedHistory });

    await ctx.reply(markdownToHtml(response), {
      parse_mode: "HTML",
      reply_markup: PERSISTENT_KEYBOARD,
    });
    fireAndForget(core.awardPoints(userId(tgId), "telegram", "chat"), "award points");
  });

  // ========================================================================
  // Register command menu with Telegram
  // ========================================================================

  bot.api.setMyCommands([
    { command: "menu", description: "Open the main menu" },
    { command: "events", description: "Browse upcoming events" },
    { command: "search", description: "Search events by keyword" },
    { command: "flow", description: "Your flow - connections & crews" },
    { command: "crew", description: "Manage your crews" },
    { command: "share", description: "Share your invite link" },
    { command: "going", description: "RSVP or view your schedule" },
    { command: "whosgoing", description: "See who's going to events" },
    { command: "schedule", description: "View your event schedule" },
    { command: "wheremycrew", description: "See where your crew is" },
    { command: "checkin", description: "Check in at an event" },
    { command: "points", description: "View your points" },
    { command: "rewards", description: "View rewards & claim tokens" },
    { command: "challenges", description: "Active challenges & quests" },
    { command: "referral", description: "Your referral link & stats" },
    { command: "wallet", description: "Link your Base wallet" },
    { command: "moves", description: "Browse dance moves" },
    { command: "whatsup", description: "What's happening in your flow" },
    { command: "whoshere", description: "See who's checked in nearby" },
    { command: "afterparty", description: "After-party info & vibes" },
    { command: "todo", description: "View or add project todos" },
    { command: "sponsor", description: "View or create sponsorships" },
    { command: "topsponsor", description: "Top sponsored leaderboard" },
    { command: "leaderboard", description: "Global points leaderboard" },
    { command: "suggestfeature", description: "Suggest a new feature" },
    { command: "reportbug", description: "Report a bug" },
    { command: "register", description: "Connect your account" },
    { command: "app", description: "Open the FlowB mini app" },
    { command: "help", description: "Show all commands & info" },
  ]).catch((err) => console.error("[flowb-telegram] Failed to set commands:", err.message || err));

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
    // Also clean up stale onboarding states (older than 30 min)
    for (const [id] of onboardingStates) {
      const session = sessions.get(id);
      if (!session || now - session.lastActive > SESSION_TTL_MS) {
        onboardingStates.delete(id);
      }
    }
  }, 5 * 60 * 1000);

  // Chatter digest: post event digests to active channels every 4 hours
  const DIGEST_INTERVAL_MS = 4 * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      const chatIds = await getActiveChannelsWithSignals();
      for (const chatId of chatIds) {
        const digest = await buildDigest(chatId);
        if (digest) {
          await bot.api.sendMessage(chatId, digest, { parse_mode: "HTML" });
          console.log(`[flowb-chatter] Digest sent to ${chatId}`);
        }
      }
    } catch (err: any) {
      console.error("[flowb-chatter] Digest scheduler error:", err.message);
    }
  }, DIGEST_INTERVAL_MS);

  console.log("[flowb-telegram] Bot initialized");
}

// ==========================================================================
// Helpers
// ==========================================================================

/** Call FlowB chat completions API (same backend as Farcaster miniapp) */

// ============================================================================
// Social awareness helpers
// ============================================================================

/** Sign a JWT for bot-originated API calls (same-process, same secret) */
function signJwtForBot(tgId: number): string {
  return signJwt({
    sub: `telegram_${tgId}`,
    platform: "telegram",
    tg_id: tgId,
  });
}

/** Format the "what's happening" response for Telegram HTML */
function formatWhatsHappeningHtml(data: any): string {
  const lines: string[] = [];
  lines.push("<b>What's Happening</b>");
  lines.push("");

  if (data.city) {
    const friendCount = data.friends_nearby || 0;
    const crewCount = data.crew_nearby || 0;
    if (friendCount > 0 || crewCount > 0) {
      lines.push(`In <b>${escapeHtml(data.city)}</b>:`);
      if (friendCount > 0) lines.push(`  ${friendCount} friend${friendCount === 1 ? "" : "s"} nearby`);
      if (crewCount > 0) lines.push(`  ${crewCount} crew member${crewCount === 1 ? "" : "s"} nearby`);
      lines.push("");
    } else {
      lines.push(`You're in <b>${escapeHtml(data.city)}</b> — no friends or crew spotted yet.`);
      lines.push("");
    }
  }

  if (data.friend_events?.length) {
    lines.push("<b>Friends' upcoming events:</b>");
    for (const e of data.friend_events.slice(0, 5)) {
      const time = formatShortTime(e.starts_at);
      const who = (e.friends_going || []).slice(0, 3).join(", ");
      const extra = (e.friends_going?.length || 0) > 3 ? ` +${e.friends_going.length - 3} more` : "";
      lines.push(`  ${escapeHtml(e.title)}`);
      lines.push(`  ${time}${e.venue ? " @ " + escapeHtml(e.venue) : ""}`);
      lines.push(`  ${escapeHtml(who)}${extra}`);
      lines.push("");
    }
  }

  if (data.crew_checkins?.length) {
    lines.push("<b>Recent crew activity:</b>");
    for (const c of data.crew_checkins.slice(0, 5)) {
      const crewLabel = c.crew?.emoji ? `${c.crew.emoji} ${c.crew.name}` : c.crew?.name || "";
      lines.push(`  ${escapeHtml(c.user)} checked in at <b>${escapeHtml(c.venue || "somewhere")}</b>`);
      if (crewLabel) lines.push(`  ${escapeHtml(crewLabel)} — ${formatShortTime(c.when)}`);
      lines.push("");
    }
  }

  if (!data.friend_events?.length && !data.crew_checkins?.length && !data.friends_nearby && !data.crew_nearby) {
    lines.push("Nothing to report yet. Connect with friends and join a crew to see the vibe!");
  }

  return lines.join("\n");
}

/** Format the "after party" response for Telegram HTML */
function formatAfterPartyHtml(data: any): string {
  const lines: string[] = [];
  lines.push("<b>Where's everyone heading?</b>");
  lines.push("");

  if (data.destinations?.length) {
    lines.push("<b>Destinations:</b>");
    for (const d of data.destinations.slice(0, 5)) {
      const who = d.people.slice(0, 3).join(", ");
      const extra = d.people.length > 3 ? ` +${d.people.length - 3} more` : "";
      lines.push(`  <b>${escapeHtml(d.city)}</b> — ${d.count} ${d.count === 1 ? "person" : "people"}`);
      lines.push(`  ${escapeHtml(who)}${extra}`);
      lines.push("");
    }
  }

  if (data.upcoming_events?.length) {
    lines.push("<b>Next up:</b>");
    for (const e of data.upcoming_events.slice(0, 5)) {
      const time = formatShortTime(e.starts_at);
      const who = (e.people_going || []).slice(0, 3).join(", ");
      const extra = (e.people_going?.length || 0) > 3 ? ` +${e.people_going.length - 3} more` : "";
      lines.push(`  ${escapeHtml(e.title)}`);
      lines.push(`  ${time}${e.venue ? " @ " + escapeHtml(e.venue) : ""}`);
      lines.push(`  ${escapeHtml(who)}${extra}`);
      lines.push("");
    }
  }

  if (!data.destinations?.length && !data.upcoming_events?.length) {
    lines.push("No movement yet. Check back later to see where the crew is heading!");
  }

  return lines.join("\n");
}

/** Format the "who's here" response for Telegram HTML */
function formatWhosHereHtml(data: any): string {
  const lines: string[] = [];

  if (data.mode === "event") {
    lines.push(`<b>Who's at ${escapeHtml(data.event_title || "this event")}?</b>`);
    if (data.venue) lines.push(`@ ${escapeHtml(data.venue)}`);
  } else {
    lines.push(`<b>Who's in ${escapeHtml(data.city || "your city")}?</b>`);
  }
  lines.push("");

  const crewList = data.crew || [];
  const friendList = data.friends || [];
  const otherList = data.others || [];

  if (crewList.length) {
    lines.push(`<b>Crew</b> (${crewList.length}):`);
    for (const p of crewList.slice(0, 10)) {
      const status = p.status && p.status !== "going" ? ` (${p.status})` : "";
      lines.push(`  ${escapeHtml(p.display_name)}${status}`);
    }
    if (crewList.length > 10) lines.push(`  +${crewList.length - 10} more`);
    lines.push("");
  }

  if (friendList.length) {
    lines.push(`<b>Friends</b> (${friendList.length}):`);
    for (const p of friendList.slice(0, 10)) {
      const status = p.status && p.status !== "going" ? ` (${p.status})` : "";
      lines.push(`  ${escapeHtml(p.display_name)}${status}`);
    }
    if (friendList.length > 10) lines.push(`  +${friendList.length - 10} more`);
    lines.push("");
  }

  if (otherList.length) {
    lines.push(`<b>Others</b> (${otherList.length}):`);
    for (const p of otherList.slice(0, 8)) {
      const status = p.status && p.status !== "going" ? ` (${p.status})` : "";
      lines.push(`  ${escapeHtml(p.display_name)}${status}`);
    }
    if (otherList.length > 8) lines.push(`  +${otherList.length - 8} more`);
    lines.push("");
  }

  if (!crewList.length && !friendList.length && !otherList.length) {
    if (data.mode === "event") {
      lines.push("No friends or crew spotted at this event yet.");
    } else if (!data.city) {
      lines.push("Set your current city in settings to see who's around!");
    } else {
      lines.push("No friends or crew in this city right now.");
    }
  }

  return lines.join("\n");
}

/** Format a short time string from ISO (e.g. "Today 7pm", "Tomorrow 2pm") */
function formatShortTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400_000);
  const eventDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  let dayLabel: string;
  if (eventDay.getTime() === today.getTime()) dayLabel = "Today";
  else if (eventDay.getTime() === tomorrow.getTime()) dayLabel = "Tomorrow";
  else dayLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const hours = d.getHours();
  const mins = d.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  const h12 = hours % 12 || 12;
  const timeStr = mins > 0 ? `${h12}:${String(mins).padStart(2, "0")}${ampm}` : `${h12}${ampm}`;

  return `${dayLabel} ${timeStr}`;
}

async function sendFlowBChat(
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string,
  userIdStr: string,
): Promise<string> {
  const systemMessage = {
    role: "system",
    content: `You are FlowB, a friendly AI assistant for discovering side events. You help users discover events, hackathons, parties, meetups, and summits happening in your city.

You have access to a tool called "flowb" that can search events, browse categories, check tonight's events, find free events, and more. Use it when users ask about events.

CRITICAL RULES:
1. ALWAYS reply in a SINGLE message. If the user asks multiple questions, address ALL of them in ONE cohesive response with clear sections.
2. Be conversational, helpful, and concise. Use emojis sparingly.
3. Format event listings clearly with titles, dates, venues, and prices.
4. The user's platform is "telegram" (bot).
5. Keep responses under 2000 characters when possible — Telegram messages have length limits.
6. Use markdown formatting (bold, italic, links) — it will be converted to HTML.`,
  };

  const messages = [
    systemMessage,
    ...chatHistory.slice(-20), // Keep last 20 messages (10 turns)
    { role: "user", content: userMessage },
  ];

  try {
    const res = await fetch(`${FLOWB_CHAT_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "flowb",
        messages,
        stream: false,
        user: userIdStr,
      }),
    });

    if (!res.ok) {
      console.error(`[flowb-telegram] Chat API returned ${res.status}`);
      return "Sorry, I'm having trouble connecting right now. Try again in a moment!";
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "Sorry, I couldn't process that.";
  } catch (err: any) {
    console.error("[flowb-telegram] Chat API error:", err.message);
    return "Sorry, something went wrong. Try again!";
  }
}

/** Compact inline menu for secondary actions */
function buildCompactMenuKeyboard(miniAppUrl?: string): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text("\u2705 Check In", "mn:checkin")
    .text("\ud83c\udfc6 Rewards", "mn:rewards")
    .row()
    .text("\ud83d\udc65 Crew", "fl:crew")
    .text("\ud83d\udcf2 Share", "fl:share")
    .row()
    .text("\ud83d\udfe3 Farcaster", "mn:farcaster");
  if (miniAppUrl) {
    kb.row().webApp("\u26a1 Open FlowB App", miniAppUrl);
  }
  return kb;
}

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
  fireAndForget(core.awardPoints(userId(tgId), "telegram", "events_viewed"), "award points");
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
  const rows = await sbQuery<any[]>(cfg, "flowb_crew_join_requests", {
    select: "id",
    status: "eq.pending",
    limit: "10",
  });

  if (!rows?.length) return null;
  const match = rows.find((r: any) => r.id.startsWith(shortId));
  return match?.id || null;
}

/**
 * Fire-and-forget upsert of a linked event into flowb_events.
 * Uses the same slug dedup pattern as event-scanner.ts.
 */
async function saveEventToDiscovered(event: EventResult): Promise<void> {
  const sbUrl = process.env.DANZ_SUPABASE_URL;
  const sbKey = process.env.DANZ_SUPABASE_KEY;
  if (!sbUrl || !sbKey) return;

  const titleSlug = event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 200);
  if (!titleSlug) return;

  const source = event.source || "tavily";
  const headers = {
    apikey: sbKey,
    Authorization: `Bearer ${sbKey}`,
    "Content-Type": "application/json",
  };

  // Check if already exists
  const checkRes = await fetch(
    `${sbUrl}/rest/v1/flowb_events?source=eq.${encodeURIComponent(source)}&title_slug=eq.${encodeURIComponent(titleSlug)}&select=id&limit=1`,
    { headers },
  );

  const existing = checkRes.ok ? await checkRes.json() : [];

  if (existing?.length) {
    // Update last_seen + additional data
    await fetch(
      `${sbUrl}/rest/v1/flowb_events?id=eq.${existing[0].id}`,
      {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({
          last_seen: new Date().toISOString(),
          description: event.description || null,
          image_url: event.imageUrl || null,
          stale: false,
        }),
      },
    );
  } else {
    // Insert new with full available data
    await fetch(
      `${sbUrl}/rest/v1/flowb_events`,
      {
        method: "POST",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({
          source,
          source_event_id: event.id,
          title: event.title,
          title_slug: titleSlug,
          description: event.description || null,
          starts_at: event.startTime || null,
          ends_at: event.endTime || null,
          venue_name: event.locationName || null,
          city: event.locationCity || "Austin",
          is_free: event.isFree ?? null,
          is_virtual: event.isVirtual || false,
          image_url: event.imageUrl || null,
          url: event.url || null,
        }),
      },
    );
  }
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
