/**
 * FlowB Telegram Bot (Grammy)
 *
 * Runs alongside the Fastify server in the same process.
 * Uses FlowBCore directly for event search and action routing.
 */

import { Bot, InlineKeyboard, InputFile, Keyboard } from "grammy";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FlowBCore } from "../core/flowb.js";
import type { EventResult } from "../core/types.js";

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
  // Event submission
  formatEventSubmitPromptHtml,
  formatEventSubmitConfirmHtml,
  buildEventSubmitConfirmKeyboard,
  buildEventSubmitSkipKeyboard,
  formatEventSubmittedHtml,
  formatEventSubmitGroupReplyHtml,
  formatEventSubmitDmFollowupHtml,
  buildEventSubmitDmFollowupKeyboard,
  type PendingEvent,
  // Leads / CRM
  formatLeadDetailHtml,
  formatLeadListHtml,
  formatPipelineHtml,
  formatLeadCreatedHtml,
  formatLeadUpdatedHtml,
  buildLeadDetailKeyboard,
  buildLeadListKeyboard,
  buildLeadStageKeyboard,
  buildPipelineKeyboard,
  type LeadData,
  type LeadStage,
  // Task Lists
  formatTaskListHtml,
  buildTaskListKeyboard,
  formatTaskListIndexHtml,
  buildTaskListIndexKeyboard,
  type TaskListData,
  type TaskListItem,
} from "./cards.js";
import { sbQuery, sbFetch, sbInsert, sbDelete, sbPatch, sbPatchRaw } from "../utils/supabase.js";
import { log, fireAndForget } from "../utils/logger.js";
import { signJwt } from "../server/auth.js";
import { alertAdmins, getAdminIds } from "../services/admin-alerts.js";
import { isFlowBAdmin } from "../utils/admin.js";
import { handleChat, type ChatConfig, type ChatMessage, type ChatPersona } from "../services/ai-chat.js";
import { generateDraftReply, sendReply, updateTicketStatus, getTicket, type SupportTicket } from "../services/support.js";
// TEMPORARILY DISABLED: Group intelligence feature not fully implemented
// import { ... } from "../services/group-intelligence.js";

// Stub implementations for disabled group intelligence
const SIGNAL_EMOJI: Record<string, string> = {
  lead: "💼", question: "❓", announcement: "📢", action: "✅",
  urgent: "🚨", idea: "💡", feedback: "💬", decision: "🎯",
};

interface GroupIntelConfig {
  is_active: boolean;
}

async function getGroupIntelConfig(_chatId: number, _sb: any): Promise<GroupIntelConfig | null> {
  return null; // Feature disabled
}

async function processGroupMessage(
  _chatId: number,
  _messageId: number,
  _senderId: number,
  _senderName: string,
  _text: string,
  _config: any,
  _sb: any,
  _awardPointsFn: (uid: string, plat: string, action: string) => Promise<any>,
  _reactFn: (emoji: string) => Promise<void>
): Promise<null> {
  return null; // Feature disabled
}

async function enableGroupIntel(_chatId: number, _userId: string, _config: any): Promise<boolean> {
  return false; // Feature disabled
}

async function disableGroupIntel(_chatId: number, _config: any): Promise<boolean> {
  return false; // Feature disabled
}

const PAGE_SIZE = 3;
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MOD_BOT_USERNAME = process.env.FLOWB_BOT_USERNAME || "Flow_b_bot";
const MOD_MINIAPP_URL = process.env.FLOWB_MINIAPP_URL || "";
const FLOWB_CHAT_URL = "https://flowb.fly.dev";

/** When true, unmatched text goes to handleChat() directly with full tool set. */
const LLM_PRIMARY = process.env.FLOWB_LLM_PRIMARY === "true";

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
  displayName?: string;
  tgUsername?: string;
  verified: boolean;
  checkinEventId?: string;
  awaitingProofPhoto?: boolean;
  danceMoveForProof?: string;
  awaitingCrewName?: boolean;
  awaitingSuggestion?: boolean;
  awaitingBugReport?: boolean;
  awaitingEventStep?: "title" | "date" | "time" | "venue" | "url" | "description" | "confirm";
  pendingEvent?: PendingEvent;
  awaitingLeadName?: boolean;
  awaitingLeadDetails?: string; // lead ID being edited
  leadCache?: LeadData[];       // cached leads for callback resolution
  awaitingTaskListItems?: string; // task list UUID when waiting for items to add
  taskListPage?: number;
  taskListFilter?: "all" | "active" | "pending_review" | "completed";
  taskListCache?: TaskListData[];
  taskListCacheTime?: number;
  awaitingSupReply?: string;      // support ticket ID waiting for manual reply text
  awaitingSupEdit?: string;       // support ticket ID waiting for edited AI draft
  pendingDraft?: string;          // AI-generated draft text for current support ticket
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>;
}

const sessions = new Map<number, TgSession>();

// ============================================================================
// Onboarding State (in-memory, per-user multi-step flow)
// ============================================================================

interface OnboardingState {
  step: number;  // 2=interests, 3=crew, 4=done
  data: {
    interest_categories: string[];
  };
}

const onboardingStates = new Map<number, OnboardingState>();

// ============================================================================
// Event Reaction Tracking (in-memory, tracks messages bot flagged with 🎉)
// ============================================================================

interface EventReactedMessage {
  chatId: number;
  messageId: number;
  senderId: number;
  senderName: string;
  eventTitle: string | null;
  eventUrl: string | null;
  eventDate: string | null;
  eventVenue: string | null;
  rawText: string;
  createdAt: number;
  dmSentTo: Set<number>; // track who already got the DM
}

const EVENT_REACT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const eventReactedMessages = new Map<string, EventReactedMessage>();

function eventReactKey(chatId: number, messageId: number): string {
  return `${chatId}:${messageId}`;
}

// Supabase client for persistent session storage (survives restarts)
const supabase: SupabaseClient | null =
  process.env.SUPABASE_URL && process.env.SUPABASE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
    : null;

let sessionTableReady = false;

/** Check if flowb_sessions table exists, create if missing */
async function ensureSessionTable(): Promise<boolean> {
  if (sessionTableReady || !supabase) return sessionTableReady;
  try {
    const { error } = await supabase.from("flowb_sessions").select("user_id").limit(1);
    if (error && (error.message.includes("does not exist") || error.message.includes("Could not find"))) {
      // Try to create via raw REST (works with service role key)
      const url = process.env.SUPABASE_URL!;
      const key = process.env.SUPABASE_KEY!;
      const res = await fetch(`${url}/rest/v1/rpc/`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      });
      // If RPC endpoint doesn't help, log the SQL for manual creation
      console.warn("[flowb-telegram] flowb_sessions table not found. Create it with:");
      console.warn(`  CREATE TABLE flowb_sessions (user_id TEXT PRIMARY KEY, verified BOOLEAN NOT NULL DEFAULT FALSE, display_name TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());`);
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
      .select("verified,display_name,tg_username")
      .eq("user_id", `telegram_${tgId}`)
      .single();
    if (data) {
      return {
        verified: data.verified ?? false,
        displayName: data.display_name ?? undefined,
        tgUsername: data.tg_username ?? undefined,
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
      display_name: session.displayName || null,
      tg_username: session.tgUsername || null,
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
    displayName: partial.displayName ?? existing?.displayName,
    tgUsername: partial.tgUsername ?? existing?.tgUsername,
    verified: partial.verified ?? existing?.verified ?? false,
    chatHistory: partial.chatHistory ?? existing?.chatHistory ?? [],
    checkinEventId: partial.checkinEventId ?? existing?.checkinEventId,
    awaitingProofPhoto: partial.awaitingProofPhoto ?? existing?.awaitingProofPhoto,
    danceMoveForProof: partial.danceMoveForProof ?? existing?.danceMoveForProof,
    awaitingCrewName: partial.awaitingCrewName ?? existing?.awaitingCrewName,
    awaitingSuggestion: partial.awaitingSuggestion ?? existing?.awaitingSuggestion,
    awaitingBugReport: partial.awaitingBugReport ?? existing?.awaitingBugReport,
    awaitingEventStep: partial.awaitingEventStep ?? existing?.awaitingEventStep,
    pendingEvent: partial.pendingEvent ?? existing?.pendingEvent,
    awaitingLeadName: partial.awaitingLeadName ?? existing?.awaitingLeadName,
    awaitingLeadDetails: partial.awaitingLeadDetails ?? existing?.awaitingLeadDetails,
    leadCache: partial.leadCache ?? existing?.leadCache,
    awaitingTaskListItems: partial.awaitingTaskListItems ?? existing?.awaitingTaskListItems,
    taskListPage: partial.taskListPage ?? existing?.taskListPage,
    taskListFilter: partial.taskListFilter ?? existing?.taskListFilter,
    taskListCache: partial.taskListCache ?? existing?.taskListCache,
    taskListCacheTime: partial.taskListCacheTime ?? existing?.taskListCacheTime,
    awaitingSupReply: partial.awaitingSupReply ?? existing?.awaitingSupReply,
    awaitingSupEdit: partial.awaitingSupEdit ?? existing?.awaitingSupEdit,
    pendingDraft: partial.pendingDraft ?? existing?.pendingDraft,
  };
  sessions.set(userId, session);

  // Persist to Supabase when identity fields change (always, not just verified users)
  if (
    partial.verified !== undefined ||
    partial.displayName !== undefined ||
    partial.tgUsername !== undefined
  ) {
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
    step: 2,
    data: { interest_categories: [] },
  });

  await ctx.reply(
    [
      "<b>Welcome to FlowB!</b> Let's get you set up.",
      "",
      "What kind of events are you into? (tap to select, then Done)",
    ].join("\n"),
    {
      parse_mode: "HTML",
      reply_markup: buildOnboardingInterestsKeyboard([]),
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
  const name = session?.displayName || ctx.from?.first_name || "friend";

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
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_KEY;
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
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_KEY;
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
): void {
  const bot = new Bot(token);
  const botUsername = process.env.FLOWB_BOT_USERNAME || "Flow_b_bot";
  const miniAppUrl = process.env.FLOWB_MINIAPP_URL || "";
  // Prefer FlowB's own /connect page (serves Telegram Login Widget).
  // Falls back to FLOWB_CONNECT_URL env var or localhost for dev.
  const connectUrl =
    process.env.FLOWB_CONNECT_URL ||
    `http://localhost:${process.env.PORT || "8080"}/connect`;

  // Check persistent session table on startup
  ensureSessionTable().catch(err => log.error("[bot]", "session table init", { error: err instanceof Error ? err.message : String(err) }));

  // Initialize chatter capture system
  initChatter();

  // ========================================================================
  // Auto-verify user session
  // ========================================================================

  async function ensureVerified(tgId: number): Promise<TgSession> {
    const existing = getSession(tgId);
    if (existing?.verified) return existing;

    // Strategy 0: Load from DB (survives restarts)
    const persisted = await loadPersistent(tgId);
    if (persisted?.verified) {
      console.log(`[flowb-telegram] Restored session from DB: ${persisted.displayName} (tg: ${tgId})`);
      return setSession(tgId, persisted);
    }

    // Strategy 1: Check pending_verifications (Telegram Login Widget flow)
    try {
      const verified = await core.checkTelegramVerification(String(tgId));
      if (verified) {
        const session = setSession(tgId, {
          verified: true,
          displayName: verified.username || verified.displayName || "Anon",
        });

        await core.awardPoints(userId(tgId), "telegram", "verification_complete");
        console.log(`[flowb-telegram] Auto-verified via widget: ${session.displayName} (tg: ${tgId})`);
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
      setSession(tgId, { verified: true, displayName: username });
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

    // Always persist TG identity so admin tools can find this user
    const fromName = ctx.from?.first_name || ctx.from?.username || undefined;
    const fromUsername = ctx.from?.username || undefined;
    if (fromName && !session.displayName || fromUsername && session.tgUsername !== fromUsername) {
      setSession(tgId, {
        displayName: session.displayName || fromName,
        tgUsername: fromUsername,
      });
    }

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
        const sbUrl = process.env.SUPABASE_URL;
        const sbKey = process.env.SUPABASE_KEY;
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

    // --- Crew deep link via bot: /start crew_CODE → auto-join + open mini app ---
    if (args?.startsWith("crew_")) {
      const crewCode = args.slice(5);
      const flowPlugin = core.getFlowPlugin();
      const flowCfg = core.getFlowConfig();
      let joinMsg = "";
      if (flowPlugin && flowCfg) {
        try {
          const result = await flowPlugin.crewJoin(flowCfg, userId(tgId), { action: "crew-join", referral_code: crewCode });
          if (result.includes('"join_request_created"')) {
            await handleJoinRequestCreated(result, core, flowPlugin, flowCfg, bot, tgId);
            return;
          }
          joinMsg = result;
          fireAndForget(core.awardPoints(userId(tgId), "telegram", "crew_joined"), "award points");
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          if (errMsg.includes("already")) {
            joinMsg = "You're already in this crew!";
          } else {
            joinMsg = `Couldn't join: ${errMsg}`;
          }
        }
      } else {
        joinMsg = "Crew system is not available right now.";
      }
      await ctx.reply(
        `${markdownToHtml(joinMsg)}\n\n<i>Tap below to open your crew.</i>`,
        {
          parse_mode: "HTML",
          reply_markup: new InlineKeyboard()
            .webApp("Open Crew", miniAppUrl ? `${miniAppUrl}?startapp=crew_${crewCode}` : `https://tg.flowb.me`)
            .row()
            .url("Share Link", `https://t.me/${botUsername}/flowb?startapp=crew_${crewCode}`),
        },
      );
      return;
    }

    // --- Mini app deep link params received by bot (redirect to mini app) ---
    // These happen when ?startapp= links somehow reach the bot, or user manually types them
    const miniAppParams = ["event_", "checkin_"];
    const miniAppScreens = ["schedule", "chat", "socialb", "addevent", "home"];
    if (args && (miniAppParams.some((p) => args.startsWith(p)) || miniAppScreens.includes(args))) {
      await ctx.reply(
        "<b>Opening FlowB...</b>\n\nTap the button below to continue.",
        {
          parse_mode: "HTML",
          reply_markup: new InlineKeyboard().url("Open FlowB", `https://t.me/${botUsername}/flowb?startapp=${args}`),
        },
      );
      return;
    }

    // Update daily streak
    const streakResult = await core.updateStreak(userId(tgId), "telegram");

    if (session.verified && session.displayName) {
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
        formatVerifiedGreetingHtml(session.displayName, totalPoints, streakResult.streak),
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
        reply_markup: buildConnectKeyboard(connectUrl),
      });
    }
  });

  bot.command("menu", async (ctx) => {
    const tgId = ctx.from!.id;
    fireAndForget(core.awardPoints(userId(tgId), "telegram", "menu_opened"), "award points");
    await ctx.reply(formatMenuHtml(), {
      parse_mode: "HTML",
      reply_markup: buildCompactMenuKeyboard(miniAppUrl || undefined),
    });
  });

  bot.command("app", async (ctx) => {
    const tgId = ctx.from!.id;
    fireAndForget(core.awardPoints(userId(tgId), "telegram", "app_opened"), "award points");
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
    const tgId = ctx.from!.id;
    fireAndForget(core.awardPoints(userId(tgId), "telegram", "mylist_viewed"), "award points");
    await sendCoreAction(ctx, core, "my-list");
  });

  bot.command("checkin", async (ctx) => {
    const tgId = ctx.from!.id;
    const session = await ensureVerified(tgId);
    if (!session.verified) {
      await ctx.reply(formatConnectPromptHtml(), {
        parse_mode: "HTML",
        reply_markup: buildConnectKeyboard(connectUrl),
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
        reply_markup: buildConnectKeyboard(connectUrl),
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
    fireAndForget(core.awardPoints(userId(tgId), "telegram", "wallet_linked"), "award points");
    await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
  });

  bot.command("rewards", async (ctx) => {
    const tgId = ctx.from!.id;
    const session = await ensureVerified(tgId);
    if (!session.verified) {
      await ctx.reply(formatConnectPromptHtml(), {
        parse_mode: "HTML",
        reply_markup: buildConnectKeyboard(connectUrl),
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

    fireAndForget(core.awardPoints(userId(tgId), "telegram", "rewards_viewed"), "award points");
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
        reply_markup: buildConnectKeyboard(connectUrl),
      });
      return;
    }

    fireAndForget(core.awardPoints(userId(tgId), "telegram", "flow_viewed"), "award points");
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
        reply_markup: buildConnectKeyboard(connectUrl),
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
        reply_markup: buildConnectKeyboard(connectUrl),
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
          fireAndForget(notifyFlowAboutRsvp(core, userId(tgId), currentEvent.id, currentEvent.title, bot, currentEvent.startTime, currentEvent.url), "notify flow about rsvp");
          return;
        }
      }
    }

    await ctx.reply("Browse events first, then tap Going!", { reply_markup: buildFlowMenuKeyboard(botUsername) });
  });

  bot.command("whosgoing", async (ctx) => {
    const tgId = ctx.from!.id;
    await ensureVerified(tgId);
    fireAndForget(core.awardPoints(userId(tgId), "telegram", "schedule_viewed"), "award points");

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
    fireAndForget(core.awardPoints(userId(tgId), "telegram", "schedule_viewed"), "award points");

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
    fireAndForget(core.awardPoints(uid, "telegram", "wheremycrew_used"), "award points");
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_KEY;
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
        const sRes = await fetch(`${sbUrl}/rest/v1/flowb_sessions?user_id=in.(${uids.join(",")})&select=user_id,display_name`, {
          headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
        });
        const sessions = sRes.ok ? await sRes.json() as any[] : [];
        nameMap = new Map(sessions.map((s) => [s.user_id, s.display_name]));
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
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_KEY;
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
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_KEY;
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
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_KEY;
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

  // ==========================================================================
  // Lead / CRM Commands
  // ==========================================================================

  // Helper: fetch leads from Supabase for this TG user
  async function fetchLeads(tgId: number, stage?: string): Promise<LeadData[]> {
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_KEY;
    if (!sbUrl || !sbKey) return [];
    let filter = `flowb_leads?created_by=eq.${encodeURIComponent(userId(tgId))}&order=updated_at.desc&limit=20`;
    if (stage) filter += `&stage=eq.${encodeURIComponent(stage)}`;
    const res = await fetch(`${sbUrl}/rest/v1/${filter}`, {
      headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
    });
    if (!res.ok) return [];
    return (await res.json()) as LeadData[];
  }

  // Helper: fetch single lead by short ID prefix
  async function fetchLeadByShort(tgId: number, short: string): Promise<LeadData | null> {
    const leads = await fetchLeads(tgId);
    return leads.find((l) => l.id.startsWith(short)) || null;
  }

  // Helper: create lead in Supabase
  async function createLead(
    tgId: number,
    data: { name: string; company?: string; email?: string; phone?: string; notes?: string; source?: string; value?: number },
  ): Promise<LeadData | null> {
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_KEY;
    if (!sbUrl || !sbKey) return null;
    const res = await fetch(`${sbUrl}/rest/v1/flowb_leads`, {
      method: "POST",
      headers: {
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        name: data.name,
        company: data.company || null,
        email: data.email || null,
        phone: data.phone || null,
        notes: data.notes || null,
        source: data.source || "telegram",
        value: data.value ?? null,
        stage: "new",
        created_by: userId(tgId),
        assigned_to: userId(tgId),
      }),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? rows[0] : rows;
  }

  // Helper: update lead stage
  async function updateLeadStage(tgId: number, leadId: string, stage: LeadStage): Promise<LeadData | null> {
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_KEY;
    if (!sbUrl || !sbKey) return null;
    const res = await fetch(
      `${sbUrl}/rest/v1/flowb_leads?id=eq.${encodeURIComponent(leadId)}&created_by=eq.${encodeURIComponent(userId(tgId))}`,
      {
        method: "PATCH",
        headers: {
          apikey: sbKey,
          Authorization: `Bearer ${sbKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ stage }),
      },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? rows[0] : rows;
  }

  // Helper: delete lead
  async function deleteLead(tgId: number, leadId: string): Promise<boolean> {
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_KEY;
    if (!sbUrl || !sbKey) return false;
    const res = await fetch(
      `${sbUrl}/rest/v1/flowb_leads?id=eq.${encodeURIComponent(leadId)}&created_by=eq.${encodeURIComponent(userId(tgId))}`,
      {
        method: "DELETE",
        headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
      },
    );
    return res.ok;
  }

  // Helper: get pipeline counts
  async function fetchPipeline(tgId: number): Promise<{ pipeline: Record<LeadStage, number>; total: number }> {
    const leads = await fetchLeads(tgId);
    const pipeline: Record<LeadStage, number> = { new: 0, contacted: 0, qualified: 0, proposal: 0, won: 0, lost: 0 };
    for (const l of leads) {
      if (pipeline[l.stage as LeadStage] !== undefined) pipeline[l.stage as LeadStage]++;
    }
    return { pipeline, total: leads.length };
  }

  // Helper: advance lead to next stage
  const STAGE_ORDER: LeadStage[] = ["new", "contacted", "qualified", "proposal", "won"];
  function nextStage(current: LeadStage): LeadStage | null {
    const idx = STAGE_ORDER.indexOf(current);
    if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
    return STAGE_ORDER[idx + 1];
  }

  // Helper: parse "add lead" natural language
  // Handles many formats:
  //   "Sarah CEO at StartupX"
  //   "Mike from Acme mike@acme.com"
  //   "John Smith (TechCorp) - interested in partnership"
  //   "met Sarah at the conference, she runs a DeFi startup"
  function parseLeadInput(text: string): { name: string; company?: string; email?: string; phone?: string; notes?: string } {
    let name = text;
    let company: string | undefined;
    let email: string | undefined;
    let phone: string | undefined;
    let notes: string | undefined;

    // Extract email
    const emailMatch = text.match(/[\w.+-]+@[\w.-]+\.\w{2,}/);
    if (emailMatch) {
      email = emailMatch[0];
      name = name.replace(emailMatch[0], "").trim();
    }

    // Extract phone number
    const phoneMatch = name.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) {
      phone = phoneMatch[0];
      name = name.replace(phoneMatch[0], "").trim();
    }

    // Extract trailing notes after dash, comma-clause, or "about/interested/wants"
    const notesMatch = name.match(/^(.+?)\s*(?:[-–—]\s*(.+)|,\s*(interested in .+|wants .+|looking for .+|needs .+|she .+|he .+|they .+))$/i);
    if (notesMatch) {
      name = notesMatch[1].trim();
      notes = (notesMatch[2] || notesMatch[3])?.trim();
    }

    // Extract company with "at", "@", or "from" + parentheses
    const atMatch = name.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
    const fromMatch = name.match(/^(.+?)\s+from\s+(.+)$/i);
    const parenMatch = name.match(/^(.+?)\s*\((.+?)\)\s*$/);
    if (atMatch) {
      name = atMatch[1].trim();
      company = atMatch[2].trim();
    } else if (fromMatch) {
      name = fromMatch[1].trim();
      company = fromMatch[2].trim();
    } else if (parenMatch) {
      name = parenMatch[1].trim();
      company = parenMatch[2].trim();
    }

    // Extract role/title before the name
    const titleWords = ["ceo", "cto", "cfo", "coo", "vp", "director", "manager", "founder", "cofounder", "head", "lead", "engineer", "designer", "partner", "president", "chief"];
    const nameParts = name.split(/\s+/);
    if (nameParts.length > 1) {
      const firstLower = nameParts[0].toLowerCase();
      if (titleWords.includes(firstLower)) {
        const title = nameParts[0];
        name = nameParts.slice(1).join(" ");
        notes = notes ? `${title}. ${notes}` : title;
      }
    }

    // Clean up trailing punctuation and filler words
    name = name.replace(/[,;.!]+$/, "").trim();

    return { name: name.trim(), company, email, phone, notes };
  }

  // ==========================================================================
  // Task List Helpers
  // ==========================================================================

  const MAX_TASK_ITEMS = 25;
  const MAX_ITEM_LEN = 200;
  const MAX_TITLE_LEN = 100;

  function parseTaskListInput(text: string): { title: string; items: string[] } {
    // Remove the trigger phrase
    let body = text
      .replace(/^(?:make|create|new)\s+(?:task\s*list|checklist|to-?do\s*list)[:\s]*/i, "")
      .trim();

    // Split title from items: first line may be the title if followed by newlines with items
    const lines = body.split(/\n/).map((l) => l.trim()).filter(Boolean);
    let title = "Task List";
    let itemLines: string[];

    if (lines.length > 1 && !lines[0].includes(",")) {
      // First line is title, rest are items
      title = lines[0].replace(/^[:#-]\s*/, "").slice(0, MAX_TITLE_LEN);
      itemLines = lines.slice(1);
    } else if (lines.length === 1 && lines[0].includes(",")) {
      // Single line comma-separated
      itemLines = lines[0].split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      itemLines = lines;
    }

    // Strip numbering, bullets, dashes
    const items = itemLines
      .map((l) => l.replace(/^(?:\d+[.)]\s*|[-*\u2022]\s*)/, "").trim())
      .filter(Boolean)
      .slice(0, MAX_TASK_ITEMS)
      .map((t) => t.slice(0, MAX_ITEM_LEN));

    return { title, items };
  }

  async function createTaskList(
    chatId: number,
    tgId: number,
    creatorName: string,
    title: string,
    items: TaskListItem[],
  ): Promise<TaskListData | null> {
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_KEY;
    if (!sbUrl || !sbKey) return null;
    return sbInsert<TaskListData>(
      { supabaseUrl: sbUrl, supabaseKey: sbKey },
      "flowb_tasklists",
      {
        chat_id: chatId,
        creator_id: userId(tgId),
        creator_name: creatorName,
        title: title.slice(0, MAX_TITLE_LEN),
        items: JSON.stringify(items),
      },
    );
  }

  async function fetchTaskListByShort(chatId: number, short: string): Promise<TaskListData | null> {
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_KEY;
    if (!sbUrl || !sbKey) return null;
    const rows = await sbQuery<TaskListData[]>(
      { supabaseUrl: sbUrl, supabaseKey: sbKey },
      "flowb_tasklists",
      {
        chat_id: `eq.${chatId}`,
        is_active: "eq.true",
        order: "created_at.desc",
        limit: "50",
      },
    );
    if (!rows) return null;
    const match = rows.find((r) => r.id.startsWith(short));
    if (!match) return null;
    return { ...match, items: typeof match.items === "string" ? JSON.parse(match.items) : match.items };
  }

  async function updateTaskListItems(listId: string, items: TaskListItem[]): Promise<boolean> {
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_KEY;
    if (!sbUrl || !sbKey) return false;
    return sbPatch(
      { supabaseUrl: sbUrl, supabaseKey: sbKey },
      "flowb_tasklists",
      { id: `eq.${listId}` },
      { items: JSON.stringify(items) },
    );
  }

  async function updateTaskListMessageId(listId: string, msgId: number): Promise<boolean> {
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_KEY;
    if (!sbUrl || !sbKey) return false;
    return sbPatch(
      { supabaseUrl: sbUrl, supabaseKey: sbKey },
      "flowb_tasklists",
      { id: `eq.${listId}` },
      { message_id: msgId },
    );
  }

  async function softDeleteTaskList(listId: string): Promise<boolean> {
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_KEY;
    if (!sbUrl || !sbKey) return false;
    return sbPatch(
      { supabaseUrl: sbUrl, supabaseKey: sbKey },
      "flowb_tasklists",
      { id: `eq.${listId}` },
      { is_active: false },
    );
  }

  async function fetchTaskLists(opts: {
    creatorId?: string;
    chatId?: number;
    status?: string;
    search?: string;
  }): Promise<TaskListData[]> {
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_KEY;
    if (!sbUrl || !sbKey) return [];
    const params: Record<string, string> = {
      is_active: "eq.true",
      order: "updated_at.desc",
      limit: "50",
    };
    if (opts.creatorId) params.creator_id = `eq.${opts.creatorId}`;
    if (opts.chatId) params.chat_id = `eq.${opts.chatId}`;
    if (opts.status && opts.status !== "all") params.status = `eq.${opts.status}`;
    if (opts.search) params.title = `ilike.*${opts.search}*`;
    const rows = await sbQuery<TaskListData[]>(
      { supabaseUrl: sbUrl, supabaseKey: sbKey },
      "flowb_tasklists",
      params,
    );
    return (rows || []).map((r) => ({
      ...r,
      items: typeof r.items === "string" ? JSON.parse(r.items) : r.items,
    }));
  }

  async function fetchTaskListById(listId: string): Promise<TaskListData | null> {
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_KEY;
    if (!sbUrl || !sbKey) return null;
    const rows = await sbQuery<TaskListData[]>(
      { supabaseUrl: sbUrl, supabaseKey: sbKey },
      "flowb_tasklists",
      { id: `eq.${listId}`, is_active: "eq.true" },
    );
    if (!rows?.length) return null;
    const r = rows[0];
    return { ...r, items: typeof r.items === "string" ? JSON.parse(r.items) : r.items };
  }

  /** Show the task list index for a user (DM) or group */
  async function showTaskListIndex(
    ctx: any,
    tgId: number,
    chatId: number,
    isPrivate: boolean,
    page: number = 0,
    filter: string = "all",
    search?: string,
  ): Promise<void> {
    const session = getSession(tgId);
    const cacheAge = session?.taskListCacheTime ? Date.now() - session.taskListCacheTime : Infinity;
    const sameFilter = session?.taskListFilter === filter;

    let lists: TaskListData[];
    if (sameFilter && session?.taskListCache && cacheAge < 5 * 60 * 1000 && !search) {
      lists = session.taskListCache;
    } else {
      lists = await fetchTaskLists(
        isPrivate
          ? { creatorId: userId(tgId), status: filter, search }
          : { chatId, status: filter, search },
      );
      setSession(tgId, {
        taskListCache: lists,
        taskListCacheTime: Date.now(),
        taskListFilter: filter as any,
        taskListPage: page,
      });
    }

    // If single list and not searching, jump to detail
    if (lists.length === 1 && !search && page === 0) {
      const list = lists[0];
      try {
        await ctx.reply(formatTaskListHtml(list), {
          parse_mode: "HTML",
          reply_markup: buildTaskListKeyboard(list),
        });
      } catch { /* parse error fallback */ }
      return;
    }

    const TL_PAGE_SIZE = 5;
    const totalPages = Math.max(1, Math.ceil(lists.length / TL_PAGE_SIZE));
    const safePage = Math.min(page, totalPages - 1);
    const pageItems = lists.slice(safePage * TL_PAGE_SIZE, (safePage + 1) * TL_PAGE_SIZE);

    setSession(tgId, { taskListPage: safePage });

    const html = formatTaskListIndexHtml(lists, safePage, filter);
    const kb = buildTaskListIndexKeyboard(pageItems, safePage, totalPages, filter);

    try {
      await ctx.reply(html, { parse_mode: "HTML", reply_markup: kb });
    } catch { /* fallback */ }
  }

  // /lead — lead CRUD
  bot.command("lead", async (ctx) => {
    const tgId = ctx.from!.id;
    await ensureVerified(tgId);
    const text = ctx.match?.trim() || "";

    if (!text) {
      await ctx.replyWithChatAction("typing");
      const { pipeline, total } = await fetchPipeline(tgId);
      if (total === 0) {
        await ctx.reply(
          [
            "<b>\ud83d\udcbc Leads</b>",
            "",
            "No leads yet. Add one:",
            "",
            "<code>/lead add Sarah CEO at StartupX</code>",
            "<code>/lead add Mike mike@example.com</code>",
            "",
            "Or just type: <i>add lead Sarah</i>",
          ].join("\n"),
          { parse_mode: "HTML", reply_markup: buildPipelineKeyboard() },
        );
      } else {
        await ctx.reply(formatPipelineHtml(pipeline, total), {
          parse_mode: "HTML",
          reply_markup: buildPipelineKeyboard(),
        });
      }
      return;
    }

    // /lead add <details>
    if (text.toLowerCase().startsWith("add ")) {
      const input = text.slice(4).trim();
      if (!input) {
        await ctx.reply("Usage: <code>/lead add Sarah CEO at StartupX</code>", { parse_mode: "HTML" });
        return;
      }
      await ctx.replyWithChatAction("typing");
      const parsed = parseLeadInput(input);
      const lead = await createLead(tgId, parsed);
      if (!lead) {
        await ctx.reply("Failed to create lead. Try again.");
        return;
      }
      setSession(tgId, { leadCache: [lead, ...(getSession(tgId)?.leadCache || [])] });
      await ctx.reply(formatLeadCreatedHtml(lead.name, lead.stage as LeadStage), {
        parse_mode: "HTML",
        reply_markup: buildLeadDetailKeyboard(lead.id),
      });
      fireAndForget(core.awardPoints(userId(tgId), "telegram", "lead_created"), "award points");
      alertAdmins(`New lead: <b>${lead.name}</b> by ${ctx.from?.username || tgId}`, "info");
      return;
    }

    // /lead update <name> <stage>
    if (text.toLowerCase().startsWith("update ")) {
      const rest = text.slice(7).trim();
      const validStages: LeadStage[] = ["new", "contacted", "qualified", "proposal", "won", "lost"];
      const parts = rest.split(/\s+/);
      const lastWord = parts[parts.length - 1]?.toLowerCase() as LeadStage;
      if (parts.length >= 2 && validStages.includes(lastWord)) {
        const nameQuery = parts.slice(0, -1).join(" ").toLowerCase();
        await ctx.replyWithChatAction("typing");
        const leads = await fetchLeads(tgId);
        const match = leads.find((l) => l.name.toLowerCase().includes(nameQuery));
        if (!match) {
          await ctx.reply(`No lead matching "${escapeHtml(nameQuery)}".`, { parse_mode: "HTML" });
          return;
        }
        const updated = await updateLeadStage(tgId, match.id, lastWord);
        if (!updated) {
          await ctx.reply("Failed to update lead.");
          return;
        }
        await ctx.reply(formatLeadUpdatedHtml(updated.name, updated.stage as LeadStage), {
          parse_mode: "HTML",
          reply_markup: buildLeadDetailKeyboard(updated.id),
        });
        return;
      }
      await ctx.reply("Usage: <code>/lead update Sarah qualified</code>", { parse_mode: "HTML" });
      return;
    }

    // /lead <name> — search and show detail
    await ctx.replyWithChatAction("typing");
    const leads = await fetchLeads(tgId);
    const match = leads.find((l) => l.name.toLowerCase().includes(text.toLowerCase()));
    if (match) {
      await ctx.reply(formatLeadDetailHtml(match), {
        parse_mode: "HTML",
        reply_markup: buildLeadDetailKeyboard(match.id),
      });
    } else {
      await ctx.reply(
        `No lead matching "<b>${escapeHtml(text)}</b>". Create one?\n\n<code>/lead add ${escapeHtml(text)}</code>`,
        { parse_mode: "HTML" },
      );
    }
  });

  // /leads — list all leads
  bot.command("leads", async (ctx) => {
    const tgId = ctx.from!.id;
    await ensureVerified(tgId);
    await ctx.replyWithChatAction("typing");
    const leads = await fetchLeads(tgId);
    setSession(tgId, { leadCache: leads });
    await ctx.reply(formatLeadListHtml(leads), {
      parse_mode: "HTML",
      reply_markup: buildLeadListKeyboard(leads),
    });
  });

  // /pipeline — pipeline view
  bot.command("pipeline", async (ctx) => {
    const tgId = ctx.from!.id;
    await ensureVerified(tgId);
    await ctx.replyWithChatAction("typing");
    const { pipeline, total } = await fetchPipeline(tgId);
    await ctx.reply(formatPipelineHtml(pipeline, total), {
      parse_mode: "HTML",
      reply_markup: buildPipelineKeyboard(),
    });
  });

  // /biz — business dashboard
  bot.command("biz", async (ctx) => {
    const tgId = ctx.from!.id;
    await ensureVerified(tgId);
    await ctx.reply(
      [
        "<b>\u{1F4BC} FlowB Business</b>",
        "",
        "\u{1F4CA} <b>Quick Actions</b>",
        "\u{2022} <i>add lead Sarah at Acme</i> — save a lead",
        "\u{2022} <i>met Mike from TechCo</i> — log a contact",
        "\u{2022} <i>leads</i> — view your pipeline",
        "\u{2022} <i>schedule coffee with Sarah tomorrow</i> — book a meeting",
        "\u{2022} <i>meetings</i> — view upcoming",
        "",
        "\u{1F517} <a href=\"https://kanban.flowb.me\">Open Kanban Board</a>",
        "\u{1F517} <a href=\"https://flowb.me/biz\">Open Business Dashboard</a>",
      ].join("\n"),
      { parse_mode: "HTML", reply_markup: buildPipelineKeyboard() },
    );
  });

  // /earnings — commission summary
  bot.command("earnings", async (ctx) => {
    const tgId = ctx.from!.id;
    await ensureVerified(tgId);
    await ctx.reply(
      [
        "<b>\u{1F4B0} Earnings</b>",
        "",
        "Commission tracking is coming soon!",
        "",
        "When referral programs are active, you'll see:",
        "\u{2022} Referral commissions earned",
        "\u{2022} Pending payouts",
        "\u{2022} Top referring events",
        "",
        "In the meantime, keep building your pipeline:",
        "<code>/leads</code> — view your leads",
        "<code>met Sarah at Acme</code> — log new contacts",
      ].join("\n"),
      { parse_mode: "HTML", reply_markup: buildPipelineKeyboard() },
    );
  });

  bot.command("help", async (ctx) => {
    const tgId = ctx.from!.id;
    fireAndForget(core.awardPoints(userId(tgId), "telegram", "help_viewed"), "award points");
    const help = [
      "<b>FlowB Commands</b>",
      "",
      "<b>Events</b>",
      "/events - Browse upcoming events",
      "/search <i>keyword</i> - Search events",
      "/checkin - Check in at an event",
      "/going - RSVP or view your schedule",
      "/schedule - Your event schedule",
      "<i>Keyword alerts: set via flowb.me/settings to get notified on new events matching your topics</i>",
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
      "<i>schedule coffee with Sarah tomorrow</i>",
      "<i>book call with Mike on Friday 2pm</i>",
      "",
      "<b>Leads / CRM</b>",
      "/lead - Pipeline overview",
      "/lead add <i>name details</i> - Add a lead",
      "/leads - List all leads",
      "/pipeline - Pipeline summary",
      "",
      "Or just type naturally:",
      "<i>met Sarah at the conference</i>",
      "<i>talked to Mike from Acme</i>",
      "<i>save contact John john@acme.com</i>",
      "<i>move sarah to qualified</i>",
      "<i>advance mike</i>",
      "",
      "<b>Business</b>",
      "<i>biz</i> - Business dashboard",
      "<i>earnings</i> - Commission summary",
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
      "<b>Business</b>",
      "/earnings - Referral earnings & commissions",
      "/automations - View your automations",
      "/biz - Business tier & plan info",
      "",
      "<b>More</b>",
      "/moves - Browse dance moves",
      "/sponsor - View or create sponsorships",
      "/topsponsor - Top sponsored leaderboard",
      "/leaderboard - Global points leaderboard",
      "/whatsnew - What's new this week",
      "/whatsnew today - Today's updates",
      "/whatsnew <i>keyword</i> - Search updates",
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

    // Show admin section only for admins
    const sbUrlHelp = process.env.SUPABASE_URL;
    const sbKeyHelp = process.env.SUPABASE_KEY;
    if (sbUrlHelp && sbKeyHelp) {
      const isAdminHelp = await isFlowBAdmin({ supabaseUrl: sbUrlHelp, supabaseKey: sbKeyHelp }, userId(tgId));
      if (isAdminHelp) {
        help.push(
          "",
          "<b>Admin</b>",
          "/admin id - Chat/group/user IDs",
          "/admin user <i>name</i> - Lookup user",
          "/admin active [1d|7d|30d] - Active users",
          "/admin stats - User overview",
        );
      }
    }

    await ctx.reply(help.join("\n"), {
      parse_mode: "HTML",
      reply_markup: buildBackToMenuKeyboard(),
    });
  });

  // ========================================================================
  // /whatsnew, /changelog - Show recent development updates from GitHub
  // ========================================================================

  async function fetchGitChangelog(period: "today" | "week" | "month" | "all" = "week", query?: string): Promise<string> {
    const repo = "FlowBondTech/flowb";
    const perPage = period === "today" ? 20 : period === "week" ? 50 : 30;
    const since = period === "today"
      ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      : period === "week"
        ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        : period === "month"
          ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    try {
      const url = `https://api.github.com/repos/${repo}/commits?sha=main&since=${since}&per_page=${perPage}`;
      const ghToken = process.env.GITHUB_TOKEN;
      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "FlowB-Bot",
      };
      if (ghToken) headers.Authorization = `Bearer ${ghToken}`;

      const res = await fetch(url, { headers });
      if (!res.ok) return "Couldn't fetch updates right now. Try again later.";

      const commits = (await res.json()) as any[];

      // Filter out auto-generated docs commits
      const meaningful = commits.filter((c: any) => {
        const msg = c.commit?.message || "";
        return !msg.startsWith("docs: auto-generate");
      });

      // Filter by search query if provided
      const filtered = query
        ? meaningful.filter((c: any) => {
            const msg = (c.commit?.message || "").toLowerCase();
            return msg.includes(query.toLowerCase());
          })
        : meaningful;

      if (filtered.length === 0) {
        return query
          ? `No commits matching "${query}" found in the ${period} period.`
          : `No meaningful updates in the ${period} period.`;
      }

      // Categorize commits
      const categories: Record<string, string[]> = {};
      for (const c of filtered) {
        const msg = (c.commit?.message || "").split("\n")[0];
        const lower = msg.toLowerCase();
        let cat = "Other";
        if (lower.startsWith("fix") || lower.includes("bug")) cat = "Bug Fixes";
        else if (lower.startsWith("add") || lower.startsWith("feat") || lower.startsWith("new")) cat = "New Features";
        else if (lower.startsWith("improve") || lower.startsWith("update") || lower.startsWith("enhance")) cat = "Improvements";
        else if (lower.startsWith("refactor")) cat = "Refactoring";
        else if (lower.startsWith("remove") || lower.startsWith("delete")) cat = "Removed";
        else if (lower.startsWith("switch") || lower.startsWith("change")) cat = "Changes";
        else if (lower.startsWith("close") || lower.startsWith("polish")) cat = "Improvements";
        else cat = "Updates";

        if (!categories[cat]) categories[cat] = [];
        const date = new Date(c.commit?.author?.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        categories[cat].push(`  \u2022 ${escapeHtml(msg)} <i>(${date})</i>`);
      }

      const periodLabel = period === "today" ? "Today" : period === "week" ? "This Week" : period === "month" ? "This Month" : "Recent";
      const lines = [`<b>\u{1F4CB} FlowB ${periodLabel}${query ? ` — "${escapeHtml(query)}"` : ""}</b>`, `<i>${filtered.length} update${filtered.length !== 1 ? "s" : ""}</i>`, ""];

      const order = ["New Features", "Improvements", "Bug Fixes", "Changes", "Refactoring", "Removed", "Updates"];
      const icons: Record<string, string> = {
        "New Features": "\u2728", "Improvements": "\uD83D\uDD3C", "Bug Fixes": "\uD83D\uDC1B",
        "Changes": "\uD83D\uDD04", "Refactoring": "\u267B\uFE0F", "Removed": "\uD83D\uDDD1\uFE0F", "Updates": "\uD83D\uDCE6",
      };

      for (const cat of order) {
        if (categories[cat]?.length) {
          lines.push(`${icons[cat] || "\uD83D\uDCE6"} <b>${cat}</b>`);
          lines.push(...categories[cat].slice(0, 10));
          if (categories[cat].length > 10) lines.push(`  <i>...and ${categories[cat].length - 10} more</i>`);
          lines.push("");
        }
      }

      return lines.join("\n");
    } catch (err) {
      console.error("[changelog] fetch error:", err);
      return "Couldn't fetch updates right now. Try again later.";
    }
  }

  bot.command(["whatsnew", "changelog", "updates"], async (ctx) => {
    const tgId = ctx.from!.id;
    fireAndForget(core.awardPoints(userId(tgId), "telegram", "changelog_viewed"), "award points");

    const args = ctx.match?.trim().toLowerCase() || "";
    let period: "today" | "week" | "month" | "all" = "week";
    let query: string | undefined;

    if (args === "today" || args === "day") period = "today";
    else if (args === "week" || args === "") period = "week";
    else if (args === "month") period = "month";
    else if (args === "all") period = "all";
    else query = ctx.match?.trim(); // Treat as search query

    // CuFlow plugin disabled - using raw GitHub fetch
    const changelog = await fetchGitChangelog(period, query);

    const keyboard = new InlineKeyboard()
      .text("Today", "changelog_today")
      .text("This Week", "changelog_week")
      .text("This Month", "changelog_month");

    await ctx.reply(changelog, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  });

  // Callback buttons for changelog time periods
  bot.callbackQuery(/^changelog_(today|week|month)$/, async (ctx) => {
    const period = ctx.match![1] as "today" | "week" | "month";
    // CuFlow plugin disabled - using raw GitHub fetch
    const changelog = await fetchGitChangelog(period);

    await ctx.editMessageText(changelog, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[
          { text: period === "today" ? "\u2705 Today" : "Today", callback_data: "changelog_today" },
          { text: period === "week" ? "\u2705 This Week" : "This Week", callback_data: "changelog_week" },
          { text: period === "month" ? "\u2705 This Month" : "This Month", callback_data: "changelog_month" },
        ]],
      },
    });
    await ctx.answerCallbackQuery();
  });

  // /todo - View and manage project todos
  // Usage: /todo (list) | /todo add <title> | /todo done <number>
  bot.command("todo", async (ctx) => {
    const tgId = ctx.from!.id;
    const session = await ensureVerified(tgId);
    const text = ctx.match?.trim() || "";

    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_KEY;

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
        const who = session.displayName || ctx.from?.first_name || `${tgId}`;

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

        const who = session.displayName || ctx.from?.first_name || `${tgId}`;
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
        `\u2705 You're already connected, <b>${session.displayName}</b>!${ptsText}`,
        { parse_mode: "HTML" },
      );
      return;
    }

    await ctx.reply(formatGroupRegisterHtml(), {
      parse_mode: "HTML",
      reply_markup: buildGroupRegisterKeyboard(connectUrl, botUsername),
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
  // Add My Event command
  // ========================================================================

  bot.command(["addmyevent", "addevent", "submitevent", "listevent", "addthisevent"], async (ctx) => {
    const tgId = ctx.from!.id;
    const args = ctx.match?.trim();

    if (args) {
      // Inline: /addmyevent Cool Party
      await submitEventQuick(ctx, core, tgId, args);
      return;
    }

    // Start multi-step flow
    setSession(tgId, {
      awaitingEventStep: "title",
      pendingEvent: {},
      awaitingSuggestion: false,
      awaitingBugReport: false,
      awaitingCrewName: false,
    });
    await ctx.reply(
      formatEventSubmitPromptHtml("title", {}),
      { parse_mode: "HTML" },
    );
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

  // ==========================================================================
  // Referral Earnings Commands
  // ==========================================================================

  bot.command("earnings", async (ctx) => {
    const tgId = ctx.from?.id;
    if (!tgId) return;
    await ensureVerified(tgId);
    await ctx.replyWithChatAction("typing");

    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_KEY;
    if (!sbUrl || !sbKey) {
      await ctx.reply("Earnings not configured.");
      return;
    }
    const cfg = { supabaseUrl: sbUrl, supabaseKey: sbKey };
    const uid = userId(tgId);

    // Fetch commissions
    const commissions = await sbQuery<any[]>(cfg, "flowb_referral_commissions", {
      select: "amount,status,created_at",
      referrer_id: `eq.${uid}`,
      order: "created_at.desc",
      limit: "20",
    }) || [];

    const totalEarned = commissions.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
    const pending = commissions.filter((c: any) => c.status === "pending").reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
    const paid = commissions.filter((c: any) => c.status === "paid").reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

    // Fetch referral links
    const links = await sbQuery<any[]>(cfg, "flowb_referral_links", {
      select: "short_code,clicks,conversions",
      creator_id: `eq.${uid}`,
      order: "created_at.desc",
      limit: "10",
    }) || [];

    const totalClicks = links.reduce((sum: number, l: any) => sum + (l.clicks || 0), 0);
    const totalConversions = links.reduce((sum: number, l: any) => sum + (l.conversions || 0), 0);

    const lines = [
      "<b>Referral Earnings</b>",
      "",
      `Total earned: <b>$${totalEarned.toFixed(2)}</b>`,
      `Pending: $${pending.toFixed(2)}`,
      `Paid out: $${paid.toFixed(2)}`,
      "",
      `Referral links: <b>${links.length}</b>`,
      `Total clicks: ${totalClicks}`,
      `Conversions: ${totalConversions}`,
    ];

    if (commissions.length > 0) {
      lines.push("", "<b>Recent commissions:</b>");
      for (const c of commissions.slice(0, 5)) {
        const date = new Date(c.created_at).toLocaleDateString();
        const icon = c.status === "paid" ? "\u2705" : "\u23f3";
        lines.push(`${icon} $${c.amount.toFixed(2)} - ${date}`);
      }
    }

    if (links.length === 0) {
      lines.push("", "No referral links yet. Create one from an event page!");
    }

    await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
  });

  // ==========================================================================
  // Business Tier Command
  // ==========================================================================

  bot.command("biz", async (ctx) => {
    const tgId = ctx.from?.id;
    if (!tgId) return;
    await ensureVerified(tgId);

    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_KEY;
    if (!sbUrl || !sbKey) {
      await ctx.reply("Business features not configured.");
      return;
    }
    const cfg = { supabaseUrl: sbUrl, supabaseKey: sbKey };
    const uid = userId(tgId);

    // Check subscription
    const subs = await sbQuery<any[]>(cfg, "flowb_subscriptions", {
      select: "*",
      user_id: `eq.${uid}`,
      limit: "1",
    }) || [];

    const sub = subs[0];
    const tier = sub?.tier || "free";
    const status = sub?.status || "none";

    const tierFeatures: Record<string, string[]> = {
      free: ["5 AI chats/day", "3 meetings/month", "10 leads", "1 automation"],
      pro: ["50 AI chats/day", "Unlimited meetings", "100 leads", "10 automations"],
      team: ["200 AI chats/day", "Unlimited meetings", "500 leads", "50 automations", "5 team members"],
      business: ["Unlimited AI chats", "Unlimited meetings", "Unlimited leads", "Unlimited automations", "Unlimited team"],
    };

    const features = tierFeatures[tier] || tierFeatures.free;

    const lines = [
      "<b>FlowB Business</b>",
      "",
      `Current plan: <b>${tier.toUpperCase()}</b>`,
      `Status: ${status === "active" ? "\u2705 Active" : status === "none" ? "Free tier" : status}`,
      "",
      "<b>Your plan includes:</b>",
      ...features.map((f) => `  \u2022 ${f}`),
      "",
    ];

    if (tier === "free") {
      lines.push(
        "<b>Upgrade to Pro</b> for more power:",
        "  \u2022 50 AI chats/day",
        "  \u2022 Unlimited meetings & leads",
        "  \u2022 10 automations",
        "",
        "Visit flowb.me/biz to upgrade",
      );
    }

    if (sub?.current_period_end) {
      const renewDate = new Date(sub.current_period_end).toLocaleDateString();
      lines.push(`Renews: ${renewDate}`);
    }

    await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
  });

  // ==========================================================================
  // Automations Command
  // ==========================================================================

  bot.command("automations", async (ctx) => {
    const tgId = ctx.from?.id;
    if (!tgId) return;
    await ensureVerified(tgId);
    await ctx.replyWithChatAction("typing");

    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_KEY;
    if (!sbUrl || !sbKey) {
      await ctx.reply("Automations not configured.");
      return;
    }
    const cfg = { supabaseUrl: sbUrl, supabaseKey: sbKey };
    const uid = userId(tgId);

    const automations = await sbQuery<any[]>(cfg, "flowb_automations", {
      select: "id,name,trigger_type,action_type,is_active,run_count,last_run_at",
      user_id: `eq.${uid}`,
      order: "created_at.desc",
    }) || [];

    if (automations.length === 0) {
      await ctx.reply(
        [
          "<b>Automations</b>",
          "",
          "No automations set up yet.",
          "",
          "Automations let you:",
          "  \u2022 Auto-follow-up after meetings",
          "  \u2022 Nurture leads through stages",
          "  \u2022 Get reminders before meetings",
          "  \u2022 Send notifications on events",
          "",
          "Set them up at <b>flowb.me/biz</b>",
        ].join("\n"),
        { parse_mode: "HTML" },
      );
      return;
    }

    const active = automations.filter((a: any) => a.is_active).length;
    const lines = [
      "<b>Your Automations</b>",
      `${active} active / ${automations.length} total`,
      "",
    ];

    for (const a of automations) {
      const icon = a.is_active ? "\u2705" : "\u23f8\ufe0f";
      const runs = a.run_count || 0;
      lines.push(`${icon} <b>${escapeHtml(a.name)}</b>`);
      lines.push(`   ${a.trigger_type} \u2192 ${a.action_type} (${runs} runs)`);
    }

    await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
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
  // Admin: /egator — event scanner stats, scan, health
  // ========================================================================

  bot.command("egator", async (ctx) => {
    const tgId = ctx.from!.id;
    const adminIds = getAdminIds();
    if (!adminIds.includes(tgId)) {
      await ctx.reply("Admin only.");
      return;
    }

    const sub = (ctx.match?.trim() || "stats").toLowerCase();
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_KEY;

    if (!sbUrl || !sbKey) {
      await ctx.reply("Supabase not configured.");
      return;
    }

    const cfg = { supabaseUrl: sbUrl, supabaseKey: sbKey };

    // --- cities: list all scan cities ---
    if (sub === "cities") {
      await ctx.replyWithChatAction("typing");
      try {
        const rows = await sbFetch<any[]>(cfg, "flowb_scan_cities?select=*&order=created_at.asc");
        if (!rows?.length) {
          await ctx.reply("No scan cities configured.");
          return;
        }
        const lines = ["<b>Scan Cities</b>", ""];
        for (const r of rows) {
          const status = r.enabled ? "\u2705" : "\u274C";
          const lastScan = r.last_scan_at
            ? new Date(r.last_scan_at).toLocaleString("en-US", { timeZone: "America/Denver", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
            : "never";
          const scanInfo = r.last_scan_status === "ok"
            ? `+${r.last_scan_new || 0} new, ${r.last_scan_updated || 0} upd`
            : (r.last_scan_status || "—");
          lines.push(`${status} <b>${r.city}</b> — last: ${lastScan} (${scanInfo})`);
        }
        lines.push("", "<i>/egator addcity &lt;name&gt; | rmcity | toggle</i>");
        await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
      } catch (err) {
        await ctx.reply(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }

    // --- addcity <name> ---
    if (sub.startsWith("addcity")) {
      const cityName = sub.replace("addcity", "").trim().toLowerCase();
      if (!cityName) {
        await ctx.reply("Usage: /egator addcity <city>");
        return;
      }
      const row = await sbInsert(cfg, "flowb_scan_cities", { city: cityName });
      if (!row) {
        await ctx.reply(`Failed to add "${cityName}" — may already exist.`);
      } else {
        await ctx.reply(`\u2705 Added <b>${cityName}</b> (enabled)`, { parse_mode: "HTML" });
      }
      return;
    }

    // --- rmcity <name> ---
    if (sub.startsWith("rmcity")) {
      const cityName = sub.replace("rmcity", "").trim().toLowerCase();
      if (!cityName) {
        await ctx.reply("Usage: /egator rmcity <city>");
        return;
      }
      const ok = await sbDelete(cfg, "flowb_scan_cities", { city: `eq.${cityName}` });
      if (!ok) {
        await ctx.reply(`Failed to remove "${cityName}" — not found.`);
      } else {
        await ctx.reply(`\u{1F5D1} Removed <b>${cityName}</b>`, { parse_mode: "HTML" });
      }
      return;
    }

    // --- toggle <name> ---
    if (sub.startsWith("toggle")) {
      const cityName = sub.replace("toggle", "").trim().toLowerCase();
      if (!cityName) {
        await ctx.reply("Usage: /egator toggle <city>");
        return;
      }
      const rows = await sbFetch<any[]>(cfg, `flowb_scan_cities?city=eq.${encodeURIComponent(cityName)}&select=enabled&limit=1`);
      if (!rows?.length) {
        await ctx.reply(`City "${cityName}" not found.`);
        return;
      }
      const newEnabled = !rows[0].enabled;
      await sbPatch(cfg, "flowb_scan_cities", { city: `eq.${cityName}` }, { enabled: newEnabled });
      await ctx.reply(
        `${newEnabled ? "\u2705" : "\u274C"} <b>${cityName}</b> is now <b>${newEnabled ? "enabled" : "disabled"}</b>`,
        { parse_mode: "HTML" },
      );
      return;
    }

    // --- scan [city] ---
    if (sub === "scan" || sub.startsWith("scan ")) {
      const scanArg = sub.replace("scan", "").trim().toLowerCase();
      await ctx.replyWithChatAction("typing");
      try {
        const { scanForNewEvents } = await import("../services/event-scanner.js");
        let cities: string[];
        if (scanArg) {
          cities = [scanArg];
        } else {
          const dbCities = await sbFetch<any[]>(cfg, "flowb_scan_cities?enabled=eq.true&select=city&order=created_at.asc");
          cities = dbCities?.length
            ? dbCities.map((r: any) => r.city)
            : ["austin", "denver"];
        }
        const results: any[] = [];
        for (const city of cities) {
          const result = await scanForNewEvents(
            { supabaseUrl: sbUrl, supabaseKey: sbKey },
            (opts) => core.discoverEventsRaw(opts),
            city,
          );
          results.push({ city, ...result });
          // Update last_scan_* (fire-and-forget)
          sbPatchRaw(cfg, `flowb_scan_cities?city=eq.${encodeURIComponent(city)}`, {
            last_scan_at: new Date().toISOString(),
            last_scan_status: "ok",
            last_scan_new: result.newCount,
            last_scan_updated: result.updatedCount,
          });
        }
        const lines = ["<b>Scan Complete</b>", ""];
        for (const r of results) {
          lines.push(`<b>${r.city}</b>: +${r.newCount} new, ${r.updatedCount} upd, ${r.skippedCount} skip`);
        }
        await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
      } catch (err) {
        await ctx.reply(`Scan failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }

    if (sub === "health") {
      await ctx.replyWithChatAction("typing");
      try {
        const healthRes = await fetch("https://flowb.fly.dev/api/v1/health/luma");
        const health = healthRes.ok ? await healthRes.json() : null;
        const lines = ["<b>eGator Health</b>", ""];
        if (health) {
          lines.push(`Luma Discover: <b>${health.discover?.status || "?"}</b> (${health.discover?.latency || 0}ms)`);
          lines.push(`Luma Official: <b>${health.official?.status || "?"}</b> (${health.official?.latency || 0}ms)`);
          lines.push(`Checked: ${health.checkedAt || "?"}`);
        } else {
          lines.push("Could not fetch health endpoint.");
        }
        await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
      } catch (err) {
        await ctx.reply(`Health check failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }

    // Default: stats
    await ctx.replyWithChatAction("typing");
    try {
      const [allEvents, staleRows] = await Promise.all([
        sbFetch<any[]>(cfg, "flowb_events?select=source,city,quality_score,image_url,description,venue_name,stale,is_free,created_at&limit=50000"),
        sbFetch<any[]>(cfg, "flowb_events?stale=eq.true&select=id&limit=50000"),
      ]);

      const events = allEvents || [];
      const total = events.length;
      const staleCount = staleRows?.length || 0;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      // By source
      const srcMap: Record<string, number> = {};
      for (const e of events) srcMap[e.source || "?"] = (srcMap[e.source || "?"] || 0) + 1;
      const srcLines = Object.entries(srcMap)
        .sort((a, b) => b[1] - a[1])
        .map(([s, c]) => `  ${s}: <b>${c}</b>`)
        .join("\n");

      // By city (top 10)
      const cityMap: Record<string, number> = {};
      for (const e of events) cityMap[e.city || "?"] = (cityMap[e.city || "?"] || 0) + 1;
      const cityLines = Object.entries(cityMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([c, n]) => `  ${c}: <b>${n}</b>`)
        .join("\n");

      // Quality
      const withImg = events.filter((e: any) => e.image_url).length;
      const withDesc = events.filter((e: any) => e.description?.length > 10).length;
      const withVenue = events.filter((e: any) => e.venue_name).length;
      const scores = events.map((e: any) => Number(e.quality_score) || 0);
      const avg = total > 0 ? (scores.reduce((a: number, b: number) => a + b, 0) / total).toFixed(2) : "0";

      // Freshness
      const todayCount = events.filter((e: any) => e.created_at >= todayStart).length;
      const freeCount = events.filter((e: any) => e.is_free === true).length;

      const msg = [
        `<b>eGator Stats</b>`,
        ``,
        `<b>Totals</b>`,
        `  Active: <b>${total - staleCount}</b> / Stale: <b>${staleCount}</b> / Total: <b>${total}</b>`,
        `  Free: <b>${freeCount}</b> / Today: <b>${todayCount}</b>`,
        ``,
        `<b>By Source</b>`,
        srcLines,
        ``,
        `<b>Top Cities</b>`,
        cityLines,
        ``,
        `<b>Quality</b>`,
        `  Avg score: <b>${avg}</b>`,
        `  Images: <b>${total > 0 ? Math.round((withImg / total) * 100) : 0}%</b> (${withImg}/${total})`,
        `  Descriptions: <b>${total > 0 ? Math.round((withDesc / total) * 100) : 0}%</b> (${withDesc}/${total})`,
        `  Venues: <b>${total > 0 ? Math.round((withVenue / total) * 100) : 0}%</b> (${withVenue}/${total})`,
      ];

      await ctx.reply(msg.join("\n"), { parse_mode: "HTML" });
    } catch (err) {
      await ctx.reply(`Stats failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // ========================================================================
  // Admin: /admin — admin-only utilities (chat ID, user lookup, active users)
  // ========================================================================

  bot.command("admin", async (ctx) => {
    const tgId = ctx.from!.id;
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_KEY;
    if (!sbUrl || !sbKey) { await ctx.reply("Supabase not configured."); return; }
    const cfg = { supabaseUrl: sbUrl, supabaseKey: sbKey };

    // Check admin via DB
    const admin = await isFlowBAdmin(cfg, userId(tgId));
    if (!admin) {
      await ctx.reply("Admin only.");
      return;
    }

    const args = (ctx.match?.trim() || "help").toLowerCase();

    // --- /admin id — show chat & user IDs ---
    if (args === "id" || args === "chatid" || args === "chat") {
      const chatId = ctx.chat.id;
      const chatType = ctx.chat.type;
      const chatTitle = (ctx.chat as any).title || "(DM)";
      const lines = [
        "<b>Chat Info</b>",
        "",
        `Chat ID: <code>${chatId}</code>`,
        `Type: <b>${chatType}</b>`,
        `Title: ${escapeHtml(chatTitle)}`,
        "",
        `Your TG ID: <code>${tgId}</code>`,
        `Your user_id: <code>${userId(tgId)}</code>`,
      ];
      await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
      return;
    }

    // --- /admin user <name or tg_id> — lookup user across all platforms ---
    if (args.startsWith("user ") || args.startsWith("whois ") || args.startsWith("lookup ") || args.startsWith("info ")) {
      const query = args.replace(/^(user|whois|lookup|info)\s+/, "").trim();
      if (!query) { await ctx.reply("Usage: /admin user <name or tg_id>"); return; }
      await ctx.replyWithChatAction("typing");
      await adminUserLookup(ctx, cfg, query);
      return;
    }

    // --- /admin active [1d|7d|30d] — list active users ---
    if (args === "active" || args.startsWith("active ")) {
      const periodArg = args.replace("active", "").trim() || "7d";
      await ctx.replyWithChatAction("typing");
      await adminActiveUsers(ctx, cfg, periodArg);
      return;
    }

    // --- /admin stats — quick user/session stats ---
    if (args === "stats" || args === "userstats") {
      await ctx.replyWithChatAction("typing");
      await adminUserStats(ctx, cfg);
      return;
    }

    // --- help ---
    const help = [
      "<b>Admin Commands</b>",
      "",
      "/admin id — Chat ID, type, your TG ID",
      "/admin user <i>name or tg_id</i> — Lookup user info",
      "/admin active [1d|7d|30d] — Active users",
      "/admin stats — User/session overview",
      "",
      "Or ask naturally:",
      '<i>"flowb what\'s the chat id"</i>',
      '<i>"flowb who is steph"</i>',
      '<i>"flowb active users last 7 days"</i>',
    ];
    await ctx.reply(help.join("\n"), { parse_mode: "HTML" });
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
          reply_markup: buildGroupWelcomeKeyboard(connectUrl, botUsername),
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

    // Check if this reaction is on an event-flagged message
    const chatId = ctx.messageReaction.chat.id;
    const messageId = ctx.messageReaction.message_id;
    const key = eventReactKey(chatId, messageId);
    const tracked = eventReactedMessages.get(key);

    if (tracked && !tracked.dmSentTo.has(tgId)) {
      // Don't DM the bot itself
      if (tgId === bot.botInfo?.id) return;

      tracked.dmSentTo.add(tgId);

      const title = tracked.eventTitle || "an event";
      const isSender = tgId === tracked.senderId;
      const prompt = isSender
        ? `You shared <b>${escapeHtml(title)}</b> — nice find!`
        : `<b>${escapeHtml(tracked.senderName)}</b> shared <b>${escapeHtml(title)}</b> in the group.`;

      const details: string[] = [];
      if (tracked.eventDate) details.push(`📅 ${escapeHtml(tracked.eventDate)}`);
      if (tracked.eventVenue) details.push(`📍 ${escapeHtml(tracked.eventVenue)}`);
      if (tracked.eventUrl) details.push(`🔗 <a href="${tracked.eventUrl}">Event link</a>`);

      const html = `🎉 ${prompt}\n\n${details.length ? details.join("\n") + "\n\n" : ""}Would you like to add it to your RSVP or send it to your crew?`;

      const kb = new InlineKeyboard()
        .text("✅ RSVP Going", `evr:rsvp:${chatId}:${messageId}`)
        .text("📤 Send to Crew", `evr:crew:${chatId}:${messageId}`);

      try {
        await bot.api.sendMessage(tgId, html, {
          parse_mode: "HTML",
          reply_markup: kb,
        });
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "event_reaction_dm"), "award points");
        console.log(`[flowb-chatter] DM sent to ${tgId} for event reaction in ${chatId}`);
      } catch (dmErr: any) {
        // User hasn't started a DM with the bot — can't message them
        console.warn(`[flowb-chatter] Could not DM ${tgId}: ${dmErr.message}`);
      }
    }
  });

  // ========================================================================
  // Callback queries (button clicks)
  // ========================================================================

  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const tgId = ctx.from.id;

    // ---- Event reaction callbacks: evr:rsvp:chatId:msgId, evr:crew:chatId:msgId ----
    if (data.startsWith("evr:")) {
      const parts = data.split(":");
      const action = parts[1]; // "rsvp" or "crew"
      const chatId = parseInt(parts[2]);
      const messageId = parseInt(parts[3]);
      const key = eventReactKey(chatId, messageId);
      const tracked = eventReactedMessages.get(key);

      if (!tracked) {
        await ctx.answerCallbackQuery({ text: "This event has expired. Try sharing it again!" });
        return;
      }

      const title = tracked.eventTitle || "this event";
      const flowPlugin = core.getFlowPlugin();
      const flowCfg = core.getFlowConfig();

      if (action === "rsvp") {
        // RSVP the user as going
        const eventId = tracked.eventUrl || `signal_${chatId}_${messageId}`;
        if (flowPlugin && flowCfg) {
          try {
            await flowPlugin.rsvpWithDetails(
              flowCfg, userId(tgId), eventId, title,
              tracked.eventDate || null, tracked.eventVenue || null, "going",
            );
          } catch {
            // best-effort
          }
        }
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "event_rsvp"), "award points");
        await ctx.answerCallbackQuery({ text: "You're going! 🎉" });
        await ctx.editMessageText(
          `✅ <b>RSVP'd!</b> You're going to <b>${escapeHtml(title)}</b>\n\nCheck /events to see your upcoming plans.`,
          { parse_mode: "HTML" },
        );
        return;
      }

      if (action === "crew") {
        // Share event with user's crews via flow notify
        fireAndForget(
          notifyFlowAboutRsvp(core, userId(tgId), title, title, bot, tracked.eventDate, tracked.eventUrl),
          "notify flow about event share",
        );
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "event_shared_crew"), "award points");
        await ctx.answerCallbackQuery({ text: "Sent to your crew! 📤" });
        await ctx.editMessageText(
          `📤 <b>Shared!</b> <b>${escapeHtml(title)}</b> sent to your crew.\n\nYour friends will get a heads up about this event.`,
          { parse_mode: "HTML" },
        );
        return;
      }

      await ctx.answerCallbackQuery();
      return;
    }

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
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "event_navigated"), "award points");
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
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "event_filtered"), "award points");
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
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "event_filtered"), "award points");
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
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "event_shared"), "award points");
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
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "event_details_viewed"), "award points");
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
        fireAndForget(notifyFlowAboutRsvp(core, userId(tgId), event.id, event.title, bot, event.startTime, event.url), "notify flow about rsvp");

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
        fireAndForget(notifyFlowAboutRsvp(core, userId(tgId), event.id, event.title, bot, event.startTime, event.url), "notify flow about rsvp");

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
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "reward_claimed"), "award points");
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
            fireAndForget(notifyFlowAboutRsvp(core, userId(tgId), event.id, event.title, bot, event.startTime, event.url), "notify flow about rsvp");
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
        const sbUrl = process.env.SUPABASE_URL;
        const sbKey = process.env.SUPABASE_KEY;
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
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "meeting_shared"), "award points");
        const id8 = parts[2];
        const sbUrl = process.env.SUPABASE_URL;
        const sbKey = process.env.SUPABASE_KEY;
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
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "meeting_completed"), "award points");
        const id8 = parts[2];
        const sbUrl = process.env.SUPABASE_URL;
        const sbKey = process.env.SUPABASE_KEY;
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
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "meeting_cancelled"), "award points");
        const id8 = parts[2];
        const sbUrl = process.env.SUPABASE_URL;
        const sbKey = process.env.SUPABASE_KEY;
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

    // ---- Lead callbacks: ld:* ----
    if (data.startsWith("ld:")) {
      const parts = data.split(":");
      const action = parts[1];

      // ld:view:{short} - view lead detail
      if (action === "view") {
        const short = parts[2];
        await ctx.replyWithChatAction("typing");
        const lead = await fetchLeadByShort(tgId, short);
        if (lead) {
          await ctx.editMessageText(formatLeadDetailHtml(lead), {
            parse_mode: "HTML",
            reply_markup: buildLeadDetailKeyboard(lead.id),
          });
        } else {
          await ctx.answerCallbackQuery({ text: "Lead not found" });
          return;
        }
        await ctx.answerCallbackQuery();
        return;
      }

      // ld:advance:{short} - advance to next pipeline stage
      if (action === "advance") {
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "lead_advanced"), "award points");
        const short = parts[2];
        const lead = await fetchLeadByShort(tgId, short);
        if (lead) {
          const next = nextStage(lead.stage);
          if (!next) {
            await ctx.answerCallbackQuery({ text: "Already at final stage" });
            return;
          }
          const updated = await updateLeadStage(tgId, lead.id, next);
          if (updated) {
            await ctx.editMessageText(formatLeadDetailHtml(updated), {
              parse_mode: "HTML",
              reply_markup: buildLeadDetailKeyboard(updated.id),
            });
            await ctx.answerCallbackQuery({ text: `Moved to ${next}` });
            fireAndForget(core.awardPoints(userId(tgId), "telegram", "lead_updated"), "award points");
          } else {
            await ctx.answerCallbackQuery({ text: "Update failed" });
          }
        } else {
          await ctx.answerCallbackQuery({ text: "Lead not found" });
        }
        return;
      }

      // ld:stage:{short} - show stage picker
      if (action === "stage") {
        const short = parts[2];
        const specificStage = parts[3] as LeadStage | undefined; // if present, set that stage directly
        if (specificStage) {
          const lead = await fetchLeadByShort(tgId, short);
          if (lead) {
            const updated = await updateLeadStage(tgId, lead.id, specificStage);
            if (updated) {
              await ctx.editMessageText(formatLeadDetailHtml(updated), {
                parse_mode: "HTML",
                reply_markup: buildLeadDetailKeyboard(updated.id),
              });
              await ctx.answerCallbackQuery({ text: `Stage: ${specificStage}` });
              fireAndForget(core.awardPoints(userId(tgId), "telegram", "lead_updated"), "award points");
            } else {
              await ctx.answerCallbackQuery({ text: "Update failed" });
            }
          } else {
            await ctx.answerCallbackQuery({ text: "Lead not found" });
          }
          return;
        }
        // Show stage picker keyboard
        const lead = await fetchLeadByShort(tgId, short);
        if (lead) {
          await ctx.editMessageText(
            `<b>Move "${escapeHtml(lead.name)}" to which stage?</b>`,
            { parse_mode: "HTML", reply_markup: buildLeadStageKeyboard(lead.id) },
          );
        } else {
          await ctx.answerCallbackQuery({ text: "Lead not found" });
        }
        await ctx.answerCallbackQuery();
        return;
      }

      // ld:meet:{short} - create meeting from lead
      if (action === "meet") {
        const short = parts[2];
        const lead = await fetchLeadByShort(tgId, short);
        if (lead) {
          const meetingPlugin = core.getMeetingPlugin();
          const meetingCfg = core.getMeetingConfig();
          if (meetingPlugin && meetingCfg) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);
            const resultStr = await meetingPlugin.create(meetingCfg, userId(tgId), {
              action: "meeting-create",
              user_id: userId(tgId),
              meeting_title: `Meeting with ${lead.name}`,
              meeting_starts_at: tomorrow.toISOString(),
              meeting_duration: 30,
              meeting_type: "one_on_one",
              meeting_description: lead.company ? `Lead: ${lead.name} (${lead.company})` : `Lead: ${lead.name}`,
            });
            try {
              const parsed = JSON.parse(resultStr);
              if (parsed.type === "meeting_created" && parsed.id) {
                await ctx.answerCallbackQuery({ text: "Meeting created!" });
                const attendees = await meetingPlugin.getAttendees(meetingCfg, parsed.id);
                await ctx.editMessageText(
                  formatMeetingDetailHtml(
                    parsed.title, parsed.starts_at, parsed.duration_min || 30,
                    parsed.meeting_type || "one_on_one", "scheduled", parsed.location,
                    parsed.description, attendees.length,
                  ),
                  { parse_mode: "HTML", reply_markup: buildMeetingDetailKeyboard(parsed.id, true, parsed.share_code) },
                );
                fireAndForget(core.awardPoints(userId(tgId), "telegram", "meeting_created"), "award points");
              } else {
                await ctx.answerCallbackQuery({ text: "Could not create meeting" });
              }
            } catch {
              await ctx.answerCallbackQuery({ text: "Could not create meeting" });
            }
          } else {
            await ctx.answerCallbackQuery({ text: "Meetings not configured" });
          }
        } else {
          await ctx.answerCallbackQuery({ text: "Lead not found" });
        }
        return;
      }

      // ld:edit:{short} - edit lead (show stage picker for now)
      if (action === "edit") {
        const short = parts[2];
        const lead = await fetchLeadByShort(tgId, short);
        if (lead) {
          await ctx.editMessageText(
            `<b>Move "${escapeHtml(lead.name)}" to which stage?</b>`,
            { parse_mode: "HTML", reply_markup: buildLeadStageKeyboard(lead.id) },
          );
        } else {
          await ctx.answerCallbackQuery({ text: "Lead not found" });
        }
        await ctx.answerCallbackQuery();
        return;
      }

      // ld:del:{short} - delete lead
      if (action === "del") {
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "lead_deleted"), "award points");
        const short = parts[2];
        const lead = await fetchLeadByShort(tgId, short);
        if (lead) {
          const ok = await deleteLead(tgId, lead.id);
          if (ok) {
            await ctx.answerCallbackQuery({ text: `Deleted: ${lead.name}` });
            // Show updated list
            const leads = await fetchLeads(tgId);
            setSession(tgId, { leadCache: leads });
            await ctx.editMessageText(formatLeadListHtml(leads), {
              parse_mode: "HTML",
              reply_markup: buildLeadListKeyboard(leads),
            });
          } else {
            await ctx.answerCallbackQuery({ text: "Delete failed" });
          }
        } else {
          await ctx.answerCallbackQuery({ text: "Lead not found" });
        }
        return;
      }

      // ld:add - prompt to add new lead
      if (action === "add") {
        await ctx.answerCallbackQuery();
        setSession(tgId, { awaitingLeadName: true });
        await ctx.reply(
          "<b>Add a new lead</b>\n\nSend the lead info in any format:\n• <i>Sarah CEO at StartupX</i>\n• <i>Mike mike@email.com</i>\n• <i>John Smith (Acme Corp)</i>",
          { parse_mode: "HTML" },
        );
        return;
      }

      // ld:pipeline - show pipeline
      if (action === "pipeline") {
        await ctx.replyWithChatAction("typing");
        const { pipeline, total } = await fetchPipeline(tgId);
        await ctx.editMessageText(formatPipelineHtml(pipeline, total), {
          parse_mode: "HTML",
          reply_markup: buildPipelineKeyboard(),
        });
        await ctx.answerCallbackQuery();
        return;
      }

      // ld:list - show lead list
      if (action === "list") {
        await ctx.replyWithChatAction("typing");
        const leads = await fetchLeads(tgId);
        setSession(tgId, { leadCache: leads });
        await ctx.editMessageText(formatLeadListHtml(leads), {
          parse_mode: "HTML",
          reply_markup: buildLeadListKeyboard(leads),
        });
        await ctx.answerCallbackQuery();
        return;
      }

      await ctx.answerCallbackQuery();
      return;
    }

    // ---- Event submission callbacks: evt:* ----
    if (data.startsWith("evt:")) {
      const parts = data.split(":");
      const action = parts[1]; // submit or edit
      const subAction = parts[2]; // confirm, edit, cancel, skip, or field name

      if (action === "submit" && subAction === "confirm") {
        await ctx.answerCallbackQuery({ text: "Submitting..." });
        const session = getSession(tgId);
        const pending = session?.pendingEvent;
        if (!pending?.title) {
          await ctx.reply("No event to submit. Start over with /addmyevent");
          return;
        }
        await submitEventFromPending(ctx, core, tgId, pending);
        setSession(tgId, { awaitingEventStep: undefined, pendingEvent: undefined });
        return;
      }

      if (action === "submit" && subAction === "edit") {
        await ctx.answerCallbackQuery();
        // Restart from title
        const session = getSession(tgId);
        setSession(tgId, { awaitingEventStep: "title", pendingEvent: session?.pendingEvent || {} });
        await ctx.reply(
          formatEventSubmitPromptHtml("title", session?.pendingEvent || {}),
          { parse_mode: "HTML" },
        );
        return;
      }

      if (action === "submit" && subAction === "cancel") {
        await ctx.answerCallbackQuery({ text: "Cancelled" });
        setSession(tgId, { awaitingEventStep: undefined, pendingEvent: undefined });
        await ctx.reply("Event submission cancelled.", { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD });
        return;
      }

      if (action === "submit" && subAction === "skip") {
        await ctx.answerCallbackQuery();
        const session = getSession(tgId);
        if (session?.awaitingEventStep) {
          advanceEventStep(ctx, tgId, session.awaitingEventStep, session.pendingEvent || {});
        }
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
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "crew_settings_changed"), "award points");
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
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "crew_settings_changed"), "award points");
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
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "crew_member_promoted"), "award points");
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

        try {
          const parsed = JSON.parse(result);
          if (parsed.type === "role_changed") {
            await ctx.reply(
              `<b>Promoted</b> ${parsed.targetId.replace("telegram_", "@")} to admin.`,
              { parse_mode: "HTML" },
            );
            // Notify the promoted user
            const targetTgId = targetIdShort;
            if (targetTgId && !isNaN(Number(targetTgId))) {
              try {
                const crewRow = await sbQuery<any[]>(flowCfg, "flowb_groups", {
                  select: "name,emoji",
                  id: `eq.${parsed.groupId}`,
                  limit: "1",
                });
                const crewName = crewRow?.[0] ? `${crewRow[0].emoji} ${crewRow[0].name}` : "the crew";
                await bot.api.sendMessage(
                  Number(targetTgId),
                  `You've been promoted to <b>admin</b> in <b>${crewName}</b>! You can now approve join requests, remove members, and manage crew settings.`,
                  { parse_mode: "HTML" },
                );
              } catch {}
            }
          } else {
            await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
          }
        } catch {
          await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
        }
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

        try {
          const parsed = JSON.parse(result);
          if (parsed.type === "role_changed") {
            await ctx.reply(
              `<b>Demoted</b> ${parsed.targetId.replace("telegram_", "@")} to member.`,
              { parse_mode: "HTML" },
            );
            // Notify the demoted user
            const targetTgId = targetIdShort;
            if (targetTgId && !isNaN(Number(targetTgId))) {
              try {
                const crewRow = await sbQuery<any[]>(flowCfg, "flowb_groups", {
                  select: "name,emoji",
                  id: `eq.${parsed.groupId}`,
                  limit: "1",
                });
                const crewName = crewRow?.[0] ? `${crewRow[0].emoji} ${crewRow[0].name}` : "the crew";
                await bot.api.sendMessage(
                  Number(targetTgId),
                  `Your role in <b>${crewName}</b> has been changed to <b>member</b>.`,
                  { parse_mode: "HTML" },
                );
              } catch {}
            }
          } else {
            await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
          }
        } catch {
          await ctx.reply(markdownToHtml(result), { parse_mode: "HTML" });
        }
        return;
      }

      // --- Browse public crews ---
      if (action === "browse") {
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "crew_browsed"), "award points");
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
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "farcaster_profile"), "award points");
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

    // ---- Support callbacks: sup:* ----
    if (data.startsWith("sup:")) {
      const parts = data.split(":");
      const action = parts[1];
      const ticketId = parts[2];

      if (!ticketId) {
        await ctx.answerCallbackQuery({ text: "Invalid ticket" });
        return;
      }

      // Permission check: admin only
      const sbUrl = process.env.SUPABASE_URL;
      const sbKey = process.env.SUPABASE_KEY;
      if (!sbUrl || !sbKey) {
        await ctx.answerCallbackQuery({ text: "DB unavailable" });
        return;
      }
      const isAdmin = await isFlowBAdmin({ supabaseUrl: sbUrl, supabaseKey: sbKey }, userId(tgId));
      if (!isAdmin) {
        await ctx.answerCallbackQuery({ text: "Admin only" });
        return;
      }

      // sup:ai:{ticketId} — Generate AI draft
      if (action === "ai") {
        await ctx.answerCallbackQuery({ text: "Generating AI draft..." });
        const ticket = await getTicket(ticketId);
        if (!ticket) {
          await ctx.reply("Ticket not found.");
          return;
        }
        await ctx.replyWithChatAction("typing");
        const draft = await generateDraftReply(ticket);
        setSession(tgId, { pendingDraft: draft });

        const draftMsg = [
          `🤖 <b>AI Draft Reply</b>`,
          `<b>Ticket:</b> ${escapeHtml(ticket.subject || "(no subject)")}`,
          `<b>To:</b> ${escapeHtml(ticket.from_address)}`,
          "",
          escapeHtml(draft),
        ].join("\n");

        await ctx.reply(draftMsg, {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "📤 Send", callback_data: `sup:send:${ticketId}` },
                { text: "✏️ Edit", callback_data: `sup:edit:${ticketId}` },
              ],
              [
                { text: "🔄 Regenerate", callback_data: `sup:regen:${ticketId}` },
                { text: "❌ Cancel", callback_data: `sup:cancel:${ticketId}` },
              ],
            ],
          },
        });
        return;
      }

      // sup:reply:{ticketId} — Manual reply prompt
      if (action === "reply") {
        await ctx.answerCallbackQuery();
        setSession(tgId, { awaitingSupReply: ticketId });
        const ticket = await getTicket(ticketId);
        await ctx.reply(
          `✍️ <b>Reply to ticket</b>\n<b>From:</b> ${escapeHtml(ticket?.from_address || "?")}\n<b>Subject:</b> ${escapeHtml(ticket?.subject || "?")}\n\nType your reply below:`,
          { parse_mode: "HTML" },
        );
        return;
      }

      // sup:assign:{ticketId} — Assign to clicking admin
      if (action === "assign") {
        await updateTicketStatus(ticketId, "in_progress", userId(tgId));
        const adminName = ctx.from?.username || ctx.from?.first_name || String(tgId);
        await ctx.answerCallbackQuery({ text: `Assigned to @${adminName}` });

        // Update the original message to show assignment
        try {
          const ticket = await getTicket(ticketId);
          if (ticket && ctx.callbackQuery.message) {
            const updatedText = ctx.callbackQuery.message.text + `\n\n👤 <b>Assigned to:</b> @${escapeHtml(adminName)}`;
            await ctx.editMessageText(updatedText, {
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: "🤖 AI Draft", callback_data: `sup:ai:${ticketId}` },
                    { text: "✍️ Reply", callback_data: `sup:reply:${ticketId}` },
                  ],
                  [
                    { text: "✅ Close", callback_data: `sup:close:${ticketId}` },
                  ],
                ],
              },
            });
          }
        } catch { /* message unchanged */ }
        return;
      }

      // sup:close:{ticketId} — Close ticket
      if (action === "close") {
        await updateTicketStatus(ticketId, "closed");
        const adminName = ctx.from?.username || ctx.from?.first_name || String(tgId);
        await ctx.answerCallbackQuery({ text: "Ticket closed" });

        try {
          if (ctx.callbackQuery.message) {
            const text = ctx.callbackQuery.message.text || "";
            await ctx.editMessageText(
              text + `\n\n✅ <b>Closed</b> by @${escapeHtml(adminName)}`,
              { parse_mode: "HTML" },
            );
          }
        } catch { /* message unchanged */ }
        return;
      }

      // sup:send:{ticketId} — Send AI draft as-is
      if (action === "send") {
        const session = getSession(tgId);
        const draft = session?.pendingDraft;
        if (!draft) {
          await ctx.answerCallbackQuery({ text: "No draft available. Generate one first." });
          return;
        }

        await ctx.answerCallbackQuery({ text: "Sending..." });
        const ok = await sendReply(ticketId, userId(tgId), draft, { aiGenerated: true });
        setSession(tgId, { pendingDraft: undefined });

        if (ok) {
          try {
            await ctx.editMessageText("📤 <b>Reply sent!</b>\n\n" + escapeHtml(draft), { parse_mode: "HTML" });
          } catch { /* fallback */ }
        } else {
          await ctx.reply("Failed to send reply. Check logs.");
        }
        return;
      }

      // sup:edit:{ticketId} — Edit AI draft before sending
      if (action === "edit") {
        await ctx.answerCallbackQuery();
        setSession(tgId, { awaitingSupEdit: ticketId });
        await ctx.reply(
          "✏️ <b>Edit the draft</b>\n\nType your edited version below. It will be sent as the reply.",
          { parse_mode: "HTML" },
        );
        return;
      }

      // sup:regen:{ticketId} — Regenerate AI draft
      if (action === "regen") {
        await ctx.answerCallbackQuery({ text: "Regenerating..." });
        const ticket = await getTicket(ticketId);
        if (!ticket) {
          await ctx.reply("Ticket not found.");
          return;
        }
        await ctx.replyWithChatAction("typing");
        const draft = await generateDraftReply(ticket);
        setSession(tgId, { pendingDraft: draft });

        const draftMsg = [
          `🤖 <b>AI Draft Reply (regenerated)</b>`,
          `<b>To:</b> ${escapeHtml(ticket.from_address)}`,
          "",
          escapeHtml(draft),
        ].join("\n");

        try {
          await ctx.editMessageText(draftMsg, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "📤 Send", callback_data: `sup:send:${ticketId}` },
                  { text: "✏️ Edit", callback_data: `sup:edit:${ticketId}` },
                ],
                [
                  { text: "🔄 Regenerate", callback_data: `sup:regen:${ticketId}` },
                  { text: "❌ Cancel", callback_data: `sup:cancel:${ticketId}` },
                ],
              ],
            },
          });
        } catch {
          await ctx.reply(draftMsg, {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "📤 Send", callback_data: `sup:send:${ticketId}` },
                  { text: "✏️ Edit", callback_data: `sup:edit:${ticketId}` },
                ],
                [
                  { text: "🔄 Regenerate", callback_data: `sup:regen:${ticketId}` },
                  { text: "❌ Cancel", callback_data: `sup:cancel:${ticketId}` },
                ],
              ],
            },
          });
        }
        return;
      }

      // sup:cancel:{ticketId} — Cancel draft
      if (action === "cancel") {
        setSession(tgId, { pendingDraft: undefined });
        await ctx.answerCallbackQuery({ text: "Draft cancelled" });
        try {
          await ctx.editMessageText("❌ Draft cancelled.", { parse_mode: "HTML" });
        } catch { /* message unchanged */ }
        return;
      }

      await ctx.answerCallbackQuery();
      return;
    }

    // ---- Task List callbacks: tl:* ----
    if (data.startsWith("tl:")) {
      const parts = data.split(":");
      const action = parts[1];
      const short = parts[2];
      const chatId = ctx.callbackQuery.message?.chat.id;
      if (!chatId) { await ctx.answerCallbackQuery({ text: "Error" }); return; }

      // tl:t:SHORT:IDX — toggle item
      if (action === "t") {
        const idx = parseInt(parts[3], 10);
        const list = await fetchTaskListByShort(chatId, short);
        if (!list || idx < 0 || idx >= list.items.length) {
          await ctx.answerCallbackQuery({ text: "Item not found" });
          return;
        }
        const item = list.items[idx];
        const togglerName = ctx.from?.first_name || ctx.from?.username || String(tgId);
        if (item.done) {
          item.done = false;
          item.done_by = undefined;
          item.done_by_name = undefined;
          item.done_at = undefined;
        } else {
          item.done = true;
          item.done_by = userId(tgId);
          item.done_by_name = togglerName;
          item.done_at = new Date().toISOString();
        }
        await updateTaskListItems(list.id, list.items);
        try {
          await ctx.editMessageText(formatTaskListHtml(list), {
            parse_mode: "HTML",
            reply_markup: buildTaskListKeyboard(list),
          });
        } catch { /* message unchanged */ }
        await ctx.answerCallbackQuery({ text: item.done ? `\u2713 ${item.text.slice(0, 30)}` : `\u2610 ${item.text.slice(0, 30)}` });
        return;
      }

      // tl:a:SHORT — add items
      if (action === "a") {
        const list = await fetchTaskListByShort(chatId, short);
        if (!list) { await ctx.answerCallbackQuery({ text: "List not found" }); return; }
        if (list.items.length >= MAX_TASK_ITEMS) {
          await ctx.answerCallbackQuery({ text: `Max ${MAX_TASK_ITEMS} items reached` });
          return;
        }
        setSession(tgId, { awaitingTaskListItems: list.id });
        await ctx.answerCallbackQuery();
        await ctx.reply(
          `Send items to add to <b>${escapeHtml(list.title)}</b> (comma or newline separated):`,
          { parse_mode: "HTML" },
        );
        return;
      }

      // tl:d:SHORT — delete list (creator or group admin only)
      if (action === "d") {
        const list = await fetchTaskListByShort(chatId, short);
        if (!list) { await ctx.answerCallbackQuery({ text: "List not found" }); return; }

        // Check permission: creator or group admin
        const isCreator = list.creator_id === userId(tgId);
        let isAdmin = false;
        if (!isCreator) {
          try {
            const member = await ctx.api.getChatMember(chatId, tgId);
            isAdmin = member.status === "creator" || member.status === "administrator";
          } catch { /* not admin */ }
        }
        if (!isCreator && !isAdmin) {
          await ctx.answerCallbackQuery({ text: "Only the creator or an admin can delete" });
          return;
        }

        await softDeleteTaskList(list.id);
        try {
          await ctx.editMessageText(
            `<b>\ud83d\uddd1 Task list "${escapeHtml(list.title)}" deleted</b>`,
            { parse_mode: "HTML" },
          );
        } catch { /* message unchanged */ }
        await ctx.answerCallbackQuery({ text: "List deleted" });
        return;
      }

      // tl:v:SHORT — view detail
      if (action === "v") {
        const list = await fetchTaskListByShort(chatId, short);
        if (!list) { await ctx.answerCallbackQuery({ text: "Not found" }); return; }
        try {
          await ctx.editMessageText(formatTaskListHtml(list), {
            parse_mode: "HTML",
            reply_markup: buildTaskListKeyboard(list),
          });
        } catch { /* message unchanged */ }
        await ctx.answerCallbackQuery();
        return;
      }

      // tl:idx:N — paginate index
      if (action === "idx") {
        const page = parseInt(short, 10) || 0;
        const session = getSession(tgId);
        const filter = session?.taskListFilter || "all";
        const isPrivate = ctx.callbackQuery.message?.chat.type === "private";
        const lists = await fetchTaskLists(
          isPrivate ? { creatorId: userId(tgId), status: filter } : { chatId, status: filter },
        );
        setSession(tgId, { taskListCache: lists, taskListCacheTime: Date.now(), taskListPage: page });
        const TL_PS = 5;
        const totalPages = Math.max(1, Math.ceil(lists.length / TL_PS));
        const safePage = Math.min(page, totalPages - 1);
        const pageItems = lists.slice(safePage * TL_PS, (safePage + 1) * TL_PS);
        try {
          await ctx.editMessageText(formatTaskListIndexHtml(lists, safePage, filter), {
            parse_mode: "HTML",
            reply_markup: buildTaskListIndexKeyboard(pageItems, safePage, totalPages, filter),
          });
        } catch { /* unchanged */ }
        await ctx.answerCallbackQuery();
        return;
      }

      // tl:back — back to index
      if (action === "back") {
        const session = getSession(tgId);
        const page = session?.taskListPage || 0;
        const filter = session?.taskListFilter || "all";
        const isPrivate = ctx.callbackQuery.message?.chat.type === "private";
        const lists = await fetchTaskLists(
          isPrivate ? { creatorId: userId(tgId), status: filter } : { chatId, status: filter },
        );
        setSession(tgId, { taskListCache: lists, taskListCacheTime: Date.now() });
        const TL_PS = 5;
        const totalPages = Math.max(1, Math.ceil(lists.length / TL_PS));
        const safePage = Math.min(page, totalPages - 1);
        const pageItems = lists.slice(safePage * TL_PS, (safePage + 1) * TL_PS);
        try {
          await ctx.editMessageText(formatTaskListIndexHtml(lists, safePage, filter), {
            parse_mode: "HTML",
            reply_markup: buildTaskListIndexKeyboard(pageItems, safePage, totalPages, filter),
          });
        } catch { /* unchanged */ }
        await ctx.answerCallbackQuery();
        return;
      }

      // tl:f:cycle — cycle through filters
      if (action === "f" && short === "cycle") {
        const session = getSession(tgId);
        const filters: Array<"all" | "active" | "pending_review" | "completed"> = ["all", "active", "pending_review", "completed"];
        const current = session?.taskListFilter || "all";
        const nextIdx = (filters.indexOf(current) + 1) % filters.length;
        const nextFilter = filters[nextIdx];
        const isPrivate = ctx.callbackQuery.message?.chat.type === "private";
        const lists = await fetchTaskLists(
          isPrivate ? { creatorId: userId(tgId), status: nextFilter } : { chatId, status: nextFilter },
        );
        setSession(tgId, { taskListCache: lists, taskListCacheTime: Date.now(), taskListFilter: nextFilter, taskListPage: 0 });
        const TL_PS = 5;
        const totalPages = Math.max(1, Math.ceil(lists.length / TL_PS));
        const pageItems = lists.slice(0, TL_PS);
        try {
          await ctx.editMessageText(formatTaskListIndexHtml(lists, 0, nextFilter), {
            parse_mode: "HTML",
            reply_markup: buildTaskListIndexKeyboard(pageItems, 0, totalPages, nextFilter),
          });
        } catch { /* unchanged */ }
        await ctx.answerCallbackQuery({ text: `Filter: ${nextFilter === "all" ? "All" : nextFilter}` });
        return;
      }

      // tl:share:SHORT — generate share link
      if (action === "share") {
        const list = await fetchTaskListByShort(chatId, short);
        if (!list) { await ctx.answerCallbackQuery({ text: "Not found" }); return; }
        let code = list.share_code;
        if (!code) {
          code = list.id.replace(/-/g, "").slice(0, 8);
          const sbUrl = process.env.SUPABASE_URL;
          const sbKey = process.env.SUPABASE_KEY;
          if (sbUrl && sbKey) {
            await sbPatch(
              { supabaseUrl: sbUrl, supabaseKey: sbKey },
              "flowb_tasklists",
              { id: `eq.${list.id}` },
              { share_code: code },
            );
          }
        }
        const link = `https://flowb.me/cl/${code}`;
        await ctx.answerCallbackQuery();
        await ctx.reply(
          `<b>\ud83d\udd17 Share Checklist</b>\n\n<code>${link}</code>\n\nAnyone with this link can view <b>${escapeHtml(list.title)}</b>.`,
          { parse_mode: "HTML" },
        );
        return;
      }

      // tl:kanban:SHORT — link to kanban (placeholder for Phase 2)
      if (action === "kanban") {
        await ctx.answerCallbackQuery({ text: "Kanban sync coming soon!" });
        return;
      }

      // tl:new — create new checklist prompt
      if (action === "new") {
        await ctx.answerCallbackQuery();
        await ctx.reply(
          "Create a new checklist:\n\n<code>create checklist Shopping\nMilk\nEggs\nBread</code>",
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

              // React with 🎉 and track for user interaction
              try {
                await ctx.api.setMessageReaction(ctx.chat.id, ctx.message.message_id, [
                  { type: "emoji", emoji: "🎉" },
                ]);
                const key = eventReactKey(ctx.chat.id, ctx.message.message_id);
                eventReactedMessages.set(key, {
                  chatId: ctx.chat.id,
                  messageId: ctx.message.message_id,
                  senderId: tgId,
                  senderName,
                  eventTitle: signal.event_title || null,
                  eventUrl: signal.event_url || null,
                  eventDate: signal.event_date || null,
                  eventVenue: signal.venue_name || null,
                  rawText: ctx.message.text.slice(0, 300),
                  createdAt: Date.now(),
                  dmSentTo: new Set(),
                });
                console.log(`[flowb-chatter] Reacted 🎉 to event message in ${ctx.chat.id}`);
              } catch (reactErr: any) {
                // Bot may not have permission to react — that's ok
                console.warn(`[flowb-chatter] Could not react: ${reactErr.message}`);
              }
            }
          } catch (err: any) {
            console.error("[flowb-chatter] extraction error:", err.message);
          }
        })();
      }

      // Group Intelligence (fire-and-forget, never blocks response)
      const sbUrl = process.env.SUPABASE_URL;
      const sbKey = process.env.SUPABASE_KEY;
      if (sbUrl && sbKey) {
        const sb = { supabaseUrl: sbUrl, supabaseKey: sbKey };
        (async () => {
          try {
            const intelConfig = await getGroupIntelConfig(ctx.chat.id, sb);
            if (intelConfig?.is_active) {
              const senderName = ctx.from?.first_name || ctx.from?.username || "Unknown";
              await processGroupMessage(
                ctx.chat.id,
                ctx.message!.message_id,
                tgId,
                senderName,
                ctx.message!.text,
                intelConfig,
                sb,
                (uid, plat, action) => core.awardPoints(uid, plat, action),
                async (emoji) => {
                  await ctx.api.setMessageReaction(ctx.chat.id, ctx.message!.message_id, [
                    { type: "emoji", emoji: emoji as any },
                  ]);
                },
              );
            }
          } catch (err: any) {
            console.error("[group-intel] error:", err.message);
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

    // ---- Group intelligence commands ----
    if (isGroup && (lower === "listen" || lower === "start listening")) {
      try {
        const member = await ctx.api.getChatMember(ctx.chat.id, tgId);
        if (member.status === "creator" || member.status === "administrator") {
          const sbUrlCmd = process.env.SUPABASE_URL;
          const sbKeyCmd = process.env.SUPABASE_KEY;
          if (sbUrlCmd && sbKeyCmd) {
            const ok = await enableGroupIntel(ctx.chat.id, userId(tgId), { supabaseUrl: sbUrlCmd, supabaseKey: sbKeyCmd });
            if (ok) {
              await ctx.reply("Group intelligence enabled. I'll extract leads, todos, meetings, and more from messages here.", { reply_to_message_id: ctx.message.message_id });
            } else {
              await ctx.reply("Failed to enable group intelligence. Try again.", { reply_to_message_id: ctx.message.message_id });
            }
          }
        } else {
          await ctx.reply("Only group admins can enable intelligence.", { reply_to_message_id: ctx.message.message_id });
        }
      } catch (err: any) {
        console.error("[group-intel] enable error:", err.message);
      }
      return;
    }

    if (isGroup && (lower === "stop listening" || lower === "stop intel" || lower === "disable listening")) {
      try {
        const member = await ctx.api.getChatMember(ctx.chat.id, tgId);
        if (member.status === "creator" || member.status === "administrator") {
          const sbUrlCmd = process.env.SUPABASE_URL;
          const sbKeyCmd = process.env.SUPABASE_KEY;
          if (sbUrlCmd && sbKeyCmd) {
            const ok = await disableGroupIntel(ctx.chat.id, { supabaseUrl: sbUrlCmd, supabaseKey: sbKeyCmd });
            if (ok) {
              await ctx.reply("Group intelligence disabled.", { reply_to_message_id: ctx.message.message_id });
            }
          }
        } else {
          await ctx.reply("Only group admins can disable intelligence.", { reply_to_message_id: ctx.message.message_id });
        }
      } catch (err: any) {
        console.error("[group-intel] disable error:", err.message);
      }
      return;
    }

    // ---- Group one-liner: "add event <title>" ----
    if (isGroup) {
      const groupAddMatch = lower.match(/^add (?:my )?event\s+(.+)/i)
        || lower.match(/^add this event\s+(.+)/i)
        || lower.match(/^list (?:my )?event\s+(.+)/i)
        || lower.match(/^new event\s+(.+)/i);
      if (groupAddMatch) {
        const title = text.slice(text.length - groupAddMatch[1].length).trim();
        await submitEventFromGroup(ctx, core, bot, tgId, title);
        return;
      }
    }

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

    // ---- Admin natural language queries (admin-only) ----
    const adminNlMatch =
      lower.match(/^(?:what(?:'?s| is) (?:the )?(?:chat ?id|id|group ?id)|chat ?id|group ?id|this (?:group|chat)(?:'?s)? id)/) ||
      lower.match(/^(?:who ?is|what(?:'?s| is) |look ?up |info (?:on |about )?)(\w[\w\s]{0,30})(?:'s info)?$/i) ||
      lower.match(/^(?:active users?|who(?:'?s| is) active|list (?:active )?users?)(?:\s+(?:last |past )?(\d+)\s*d(?:ays?)?)?/i);

    if (adminNlMatch) {
      const sbUrlNl = process.env.SUPABASE_URL;
      const sbKeyNl = process.env.SUPABASE_KEY;
      if (sbUrlNl && sbKeyNl) {
        const cfgNl = { supabaseUrl: sbUrlNl, supabaseKey: sbKeyNl };
        const isAdminUser = await isFlowBAdmin(cfgNl, userId(tgId));
        if (isAdminUser) {
          await ctx.replyWithChatAction("typing");

          // Chat ID queries
          if (/(?:chat ?id|group ?id|(?:this )?(?:group|chat)(?:'?s)? id)/i.test(lower)) {
            const chatId = ctx.chat.id;
            const chatType = ctx.chat.type;
            const chatTitle = (ctx.chat as any).title || "(DM)";
            await ctx.reply(
              `<b>Chat Info</b>\n\nChat ID: <code>${chatId}</code>\nType: <b>${chatType}</b>\nTitle: ${escapeHtml(chatTitle)}\n\nYour TG ID: <code>${tgId}</code>\nuser_id: <code>${userId(tgId)}</code>`,
              { parse_mode: "HTML" },
            );
            return;
          }

          // Active users queries
          if (/active|who(?:'?s| is) active|list.*users?/i.test(lower)) {
            const daysMatch = lower.match(/(\d+)\s*d/);
            const period = daysMatch ? `${daysMatch[1]}d` : "7d";
            await adminActiveUsers(ctx, cfgNl, period);
            return;
          }

          // User lookup ("who is steph", "what's steph's info", "lookup mike")
          const nameMatch = lower.match(/^(?:who ?is|what(?:'?s| is) |look ?up |info (?:on |about )?)\s*(.+?)(?:'s info)?$/i);
          if (nameMatch) {
            const name = nameMatch[1].trim();
            if (name.length >= 2) {
              await adminUserLookup(ctx, cfgNl, name);
              return;
            }
          }
        }
        // Non-admins: fall through silently to normal handling
      }
    }

    // ---- Natural text command router ----
    // Matches plain words, phrases, and conversational triggers so users
    // never need slash commands. Order matters: more specific first.

    // Menu
    if (/^(menu|home|start|hi|hey|hello|yo|sup)$/i.test(lower)) {
      fireAndForget(core.awardPoints(userId(tgId), "telegram", "menu_opened"), "award points");
      await ctx.reply(formatMenuHtml(), {
        parse_mode: "HTML",
        reply_markup: buildCompactMenuKeyboard(miniAppUrl || undefined),
      });
      return;
    }

    // Events / browse
    if (/^(events|browse|whats on|what's on|show events|browse events|find events)$/i.test(lower)) {
      fireAndForget(core.awardPoints(userId(tgId), "telegram", "events_viewed"), "award points");
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
      fireAndForget(core.awardPoints(userId(tgId), "telegram", "flow_viewed"), "award points");
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

    // Changelog / what's new
    const changelogMatch = lower.match(/^(?:what'?s?\s*new|changelog|updates|changes|new features?|recent updates?|what changed|what'?s?\s*been (?:done|shipped|built|added)|ship ?log)(?:\s+(.+))?$/i);
    if (changelogMatch) {
      await ctx.replyWithChatAction("typing");
      const arg = (changelogMatch[1] || "").trim().toLowerCase();
      let period: "today" | "week" | "month" | "all" = "week";
      let query: string | undefined;
      if (arg === "today" || arg === "day") period = "today";
      else if (arg === "week" || arg === "this week") period = "week";
      else if (arg === "month" || arg === "this month") period = "month";
      else if (arg === "all") period = "all";
      else if (arg) query = arg;
      const changelog = await fetchGitChangelog(period, query);
      fireAndForget(core.awardPoints(userId(tgId), "telegram", "changelog_viewed"), "award points");
      await ctx.reply(changelog, {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .text("Today", "changelog_today")
          .text("This Week", "changelog_week")
          .text("This Month", "changelog_month"),
      });
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
        await ctx.reply(formatConnectPromptHtml(), { parse_mode: "HTML", reply_markup: buildConnectKeyboard(connectUrl) });
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
        await ctx.reply(formatConnectPromptHtml(), { parse_mode: "HTML", reply_markup: buildConnectKeyboard(connectUrl) });
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

    // Leads: "leads", "my leads", "pipeline", "show pipeline", "crm"
    if (/^(leads|my leads|pipeline|show pipeline|crm|show leads|deal|deals)$/i.test(lower)) {
      await ensureVerified(tgId);
      await ctx.replyWithChatAction("typing");
      const leads = await fetchLeads(tgId);
      setSession(tgId, { leadCache: leads });
      await ctx.reply(formatLeadListHtml(leads), {
        parse_mode: "HTML",
        reply_markup: buildLeadListKeyboard(leads),
      });
      return;
    }

    // Add lead: "add lead Sarah CEO at StartupX", "new lead Mike"
    const addLeadMatch = lower.match(/^(?:add|new|create)\s+lead\s+(.+)/i);
    if (addLeadMatch) {
      await ensureVerified(tgId);
      await ctx.replyWithChatAction("typing");
      const parsed = parseLeadInput(text.slice(text.length - addLeadMatch[1].length).trim());
      const lead = await createLead(tgId, parsed);
      if (!lead) {
        await ctx.reply("Failed to create lead. Try again.");
        return;
      }
      setSession(tgId, { leadCache: [lead, ...(getSession(tgId)?.leadCache || [])] });
      await ctx.reply(formatLeadCreatedHtml(lead.name, lead.stage as LeadStage), {
        parse_mode: "HTML",
        reply_markup: buildLeadDetailKeyboard(lead.id),
      });
      fireAndForget(core.awardPoints(userId(tgId), "telegram", "lead_created"), "award points");
      alertAdmins(`New lead: <b>${lead.name}</b> by ${ctx.from?.username || tgId}`, "info");
      return;
    }

    // Conversational lead creation:
    //   "met Sarah at the conference"
    //   "talked to Mike from Acme"
    //   "just chatted with John CEO at TechCo"
    //   "ran into Lisa, she's interested in partnering"
    //   "connected with Dave from Polygon"
    //   "save contact Sarah sarah@acme.com"
    //   "remember Sarah from Acme"
    const conversationalLeadMatch = lower.match(
      /^(?:met|talked to|spoke (?:to|with)|chatted with|just (?:met|talked to|spoke (?:to|with)|chatted with)|ran into|connected with|save contact|remember|log|note)\s+(.+)/i,
    );
    if (conversationalLeadMatch) {
      await ensureVerified(tgId);
      await ctx.replyWithChatAction("typing");
      const rawInput = text.slice(text.length - conversationalLeadMatch[1].length).trim();
      const parsed = parseLeadInput(rawInput);
      // Only create if we got a reasonable name (at least 2 chars, not just filler)
      if (parsed.name.length >= 2) {
        const lead = await createLead(tgId, parsed);
        if (lead) {
          setSession(tgId, { leadCache: [lead, ...(getSession(tgId)?.leadCache || [])] });
          await ctx.reply(
            `\u{2705} <b>Lead saved!</b>\n\n` + formatLeadDetailHtml(lead),
            { parse_mode: "HTML", reply_markup: buildLeadDetailKeyboard(lead.id) },
          );
          fireAndForget(core.awardPoints(userId(tgId), "telegram", "lead_created"), "award points");
          alertAdmins(`New lead: <b>${lead.name}</b> by ${ctx.from?.username || tgId}`, "info");
          return;
        }
      }
      // Fall through to LLM chat if parsing fails
    }

    // Natural lead stage updates:
    //   "move sarah to qualified"
    //   "mark mike as won"
    //   "sarah is now a proposal"
    //   "update john contacted"
    //   "advance sarah"
    const moveLeadMatch = lower.match(
      /^(?:move|update|set|change|mark)\s+(.+?)\s+(?:to|as|→)\s+(new|contacted|qualified|proposal|won|lost)$/i,
    );
    const isNowMatch = lower.match(
      /^(.+?)\s+(?:is now|is|moved to|→)\s+(?:a\s+)?(new|contacted|qualified|proposal|won|lost)$/i,
    );
    const advanceMatch = lower.match(/^advance\s+(.+)/i);
    const stageUpdateMatch = moveLeadMatch || isNowMatch;
    if (stageUpdateMatch) {
      await ensureVerified(tgId);
      await ctx.replyWithChatAction("typing");
      const nameQuery = stageUpdateMatch[1].trim().toLowerCase();
      const newStage = stageUpdateMatch[2].toLowerCase() as LeadStage;
      const leads = await fetchLeads(tgId);
      const match = leads.find((l) => l.name.toLowerCase().includes(nameQuery));
      if (match) {
        const updated = await updateLeadStage(tgId, match.id, newStage);
        if (updated) {
          await ctx.reply(formatLeadUpdatedHtml(updated.name, updated.stage as LeadStage), {
            parse_mode: "HTML",
            reply_markup: buildLeadDetailKeyboard(updated.id),
          });
          fireAndForget(core.awardPoints(userId(tgId), "telegram", "lead_updated"), "award points");
          return;
        }
      }
      await ctx.reply(`No lead matching "<b>${escapeHtml(nameQuery)}</b>".`, { parse_mode: "HTML" });
      return;
    }
    if (advanceMatch) {
      await ensureVerified(tgId);
      await ctx.replyWithChatAction("typing");
      const nameQuery = advanceMatch[1].trim().toLowerCase();
      const leads = await fetchLeads(tgId);
      const match = leads.find((l) => l.name.toLowerCase().includes(nameQuery));
      if (match) {
        const next = nextStage(match.stage);
        if (!next) {
          await ctx.reply(`<b>${escapeHtml(match.name)}</b> is already at the final stage.`, { parse_mode: "HTML" });
          return;
        }
        const updated = await updateLeadStage(tgId, match.id, next);
        if (updated) {
          await ctx.reply(formatLeadUpdatedHtml(updated.name, updated.stage as LeadStage), {
            parse_mode: "HTML",
            reply_markup: buildLeadDetailKeyboard(updated.id),
          });
          fireAndForget(core.awardPoints(userId(tgId), "telegram", "lead_updated"), "award points");
          return;
        }
      }
      await ctx.reply(`No lead matching "<b>${escapeHtml(nameQuery)}</b>".`, { parse_mode: "HTML" });
      return;
    }

    // Natural meeting triggers:
    //   "schedule coffee with sarah tomorrow"
    //   "set up a call with mike on friday"
    //   "book a meeting with john next week"
    //   "coffee with lisa tomorrow at 2pm"
    const meetingNlMatch = lower.match(
      /^(?:schedule|set up|book|plan|arrange)\s+(?:a\s+)?(?:meeting|call|coffee|lunch|demo|chat|catch ?up|sync|1:1|one.on.one)\s+(?:with\s+)?(.+)/i,
    ) || lower.match(
      /^(?:coffee|call|lunch|demo|chat|catch ?up|sync|1:1|one.on.one)\s+with\s+(.+)/i,
    );
    if (meetingNlMatch) {
      await ensureVerified(tgId);
      const meetingPlugin = core.getMeetingPlugin();
      const meetingCfg = core.getMeetingConfig();
      if (!meetingPlugin || !meetingCfg) {
        await ctx.reply("Meetings are not configured.");
        return;
      }
      await ctx.replyWithChatAction("typing");
      const meetingText = text.trim();
      const meeting = await meetingPlugin.createFromNaturalLanguage(meetingCfg, userId(tgId), meetingText);
      if (meeting) {
        const shareLink = meetingPlugin.getShareLink(meeting.share_code);
        await ctx.reply(
          formatMeetingCreatedHtml(meeting.title, meeting.starts_at, meeting.duration_min, meeting.meeting_type, meeting.location, shareLink),
          { parse_mode: "HTML", reply_markup: buildMeetingDetailKeyboard(meeting.id, true, meeting.share_code) },
        );
        fireAndForget(core.awardPoints(userId(tgId), "telegram", "meeting_created"), "award points");
        return;
      }
      await ctx.reply("Couldn't parse that meeting. Try: <code>schedule coffee with Sarah tomorrow 2pm</code>", { parse_mode: "HTML" });
      return;
    }

    // Natural meeting list: "meetings", "my meetings", "upcoming meetings", "upcoming"
    if (/^(meetings|my meetings|upcoming meetings|upcoming|show meetings|next meetings)$/i.test(lower)) {
      await ensureVerified(tgId);
      const meetingPlugin = core.getMeetingPlugin();
      const meetingCfg = core.getMeetingConfig();
      if (!meetingPlugin || !meetingCfg) { await ctx.reply("Meetings not configured."); return; }
      const result = await meetingPlugin.list(meetingCfg, userId(tgId), { action: "meeting-list", meeting_filter: "upcoming" });
      try {
        const parsed = JSON.parse(result);
        if (parsed.type === "meeting_list") {
          await ctx.reply(formatMeetingListHtml(parsed.meetings, parsed.filter), {
            parse_mode: "HTML",
            reply_markup: buildMeetingListKeyboard(parsed.meetings),
          });
          return;
        }
      } catch { /* fallback */ }
      await ctx.reply(result);
      return;
    }

    // ---- Task List: natural language creation ----
    if (/^(?:make|create|new)\s+(?:task\s*list|checklist|to-?do\s*list)/i.test(lower)) {
      const creatorName = ctx.from?.first_name || ctx.from?.username || String(tgId);
      const { title, items } = parseTaskListInput(text);

      if (items.length === 0) {
        // No items provided - create empty list and await items
        const list = await createTaskList(ctx.chat.id, tgId, creatorName, title, []);
        if (!list) {
          await ctx.reply("Failed to create task list. Try again.");
          return;
        }
        setSession(tgId, { awaitingTaskListItems: list.id });
        await ctx.reply(
          `<b>\ud83d\udccb ${escapeHtml(title)}</b> created!\n\nSend me the items (comma or newline separated):`,
          { parse_mode: "HTML" },
        );
        return;
      }

      // Items provided inline
      const taskItems: TaskListItem[] = items.map((t) => ({ text: t, done: false }));
      const list = await createTaskList(ctx.chat.id, tgId, creatorName, title, taskItems);
      if (!list) {
        await ctx.reply("Failed to create task list. Try again.");
        return;
      }
      const msg = await ctx.reply(formatTaskListHtml(list), {
        parse_mode: "HTML",
        reply_markup: buildTaskListKeyboard(list),
      });
      fireAndForget(updateTaskListMessageId(list.id, msg.message_id), "store msg id");
      return;
    }

    // ---- Task List: browse / index ----
    if (/^(?:my\s+)?(?:checklists?|task\s*lists?|to-?do\s*lists?|todos?)$/i.test(lower)) {
      const isPrivate = ctx.chat.type === "private";
      await showTaskListIndex(ctx, tgId, ctx.chat.id, isPrivate);
      return;
    }

    // ---- Task List: search ----
    {
      const searchMatch = lower.match(/^(?:find|search)\s+(?:checklist|task\s*list|todo)\s+(.+)/i);
      if (searchMatch) {
        const term = searchMatch[1].trim();
        const isPrivate = ctx.chat.type === "private";
        await showTaskListIndex(ctx, tgId, ctx.chat.id, isPrivate, 0, "all", term);
        return;
      }
    }

    // /biz — open biz dashboard
    if (/^(biz|business|dashboard|command center|hq)$/i.test(lower)) {
      await ctx.reply(
        [
          "<b>\u{1F4BC} FlowB Business</b>",
          "",
          "\u{1F4CA} <b>Quick Actions</b>",
          "\u{2022} <i>add lead Sarah at Acme</i> — save a lead",
          "\u{2022} <i>met Mike from TechCo</i> — log a contact",
          "\u{2022} <i>leads</i> — view your pipeline",
          "\u{2022} <i>schedule coffee with Sarah tomorrow</i> — book a meeting",
          "\u{2022} <i>meetings</i> — view upcoming",
          "",
          "\u{1F517} <a href=\"https://kanban.flowb.me\">Open Kanban Board</a>",
          "\u{1F517} <a href=\"https://flowb.me/biz\">Open Business Dashboard</a>",
        ].join("\n"),
        { parse_mode: "HTML", reply_markup: buildPipelineKeyboard() },
      );
      return;
    }

    // /earnings — commission summary (placeholder until referral system is wired)
    if (/^(earnings|commissions?|my earnings|my commissions?|revenue|income)$/i.test(lower)) {
      await ensureVerified(tgId);
      await ctx.reply(
        [
          "<b>\u{1F4B0} Earnings</b>",
          "",
          "Commission tracking is coming soon!",
          "",
          "When referral programs are active, you'll see:",
          "\u{2022} Referral commissions earned",
          "\u{2022} Pending payouts",
          "\u{2022} Top referring events",
          "",
          "In the meantime, keep building your pipeline:",
          "<code>leads</code> — view your leads",
          "<code>met Sarah at Acme</code> — log new contacts",
        ].join("\n"),
        { parse_mode: "HTML", reply_markup: buildPipelineKeyboard() },
      );
      return;
    }

    // Check in: "check in", "checkin", "check in at X", "im at X", "i'm at X"
    const checkinMatch = lower.match(/^(?:check\s*in|checkin)(?:\s+(?:at\s+)?(.+))?$/i)
      || lower.match(/^(?:i'?m at|im at|at)\s+(.+)/i);
    if (checkinMatch) {
      const session = await ensureVerified(tgId);
      if (!session.verified) {
        await ctx.reply(formatConnectPromptHtml(), { parse_mode: "HTML", reply_markup: buildConnectKeyboard(connectUrl) });
        return;
      }
      const venue = checkinMatch[1]?.trim();
      if (venue) {
        // Direct check-in to a venue via chat API
        await ctx.replyWithChatAction("typing");
        const chatSession = getSession(tgId) || setSession(tgId, {});
        const dn = ctx.from?.first_name || ctx.from?.username || undefined;
        const checkinResult = LLM_PRIMARY
          ? await sendFlowBChatDirect(chatSession.chatHistory, `I'm at ${venue}`, tgId, dn)
          : { content: await sendFlowBChat(chatSession.chatHistory, `I'm at ${venue}`, userId(tgId)) };
        const response = checkinResult.content;
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
      const dn2 = ctx.from?.first_name || ctx.from?.username || undefined;
      const crewResult = LLM_PRIMARY
        ? await sendFlowBChatDirect(chatSession.chatHistory, "where's my crew?", tgId, dn2)
        : { content: await sendFlowBChat(chatSession.chatHistory, "where's my crew?", userId(tgId)) };
      const response = crewResult.content;
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

    // Add my event triggers (DM)
    if (/^(add (?:my )?event|add this event|list (?:my )?event|submit (?:an? )?event|i have an event|post (?:my )?event|new event|create (?:an? )?event)$/i.test(lower)) {
      setSession(tgId, {
        awaitingEventStep: "title",
        pendingEvent: {},
        awaitingSuggestion: false,
        awaitingBugReport: false,
        awaitingCrewName: false,
      });
      await ctx.reply(
        formatEventSubmitPromptHtml("title", {}),
        { parse_mode: "HTML" },
      );
      return;
    }

    // Add event with inline title: "add event Cool Party" / "list event My Meetup"
    {
      const addEventMatch = lower.match(/^(?:add (?:my )?event|add this event|list (?:my )?event|submit (?:an? )?event|post (?:my )?event|new event|create (?:an? )?event)\s+(.+)/i);
      if (addEventMatch) {
        const title = text.slice(text.length - addEventMatch[1].length); // preserve original casing
        await submitEventQuick(ctx, core, tgId, title.trim());
        return;
      }
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
        `<b>Met Sarah at Acme</b> — save a lead instantly\n` +
        `<b>Schedule coffee with Mike</b> — book a meeting\n` +
        `<b>Meetings</b> — view upcoming meetings\n` +
        `<b>Move sarah to qualified</b> — update pipeline\n` +
        `<b>Biz</b> — business dashboard\n` +
        `<b>Add my event</b> — list your own event\n` +
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


    // ---- Awaiting event submission step ----
    {
      const session = getSession(tgId);
      if (session?.awaitingEventStep && session.awaitingEventStep !== "confirm") {
        await handleEventStep(ctx, core, tgId, text.trim(), session);
        return;
      }
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

    // ---- Awaiting support reply (manual) ----
    {
      const session = getSession(tgId);
      if (session?.awaitingSupReply) {
        const ticketId = session.awaitingSupReply;
        setSession(tgId, { awaitingSupReply: undefined });
        await ctx.replyWithChatAction("typing");
        const ok = await sendReply(ticketId, userId(tgId), text.trim(), { aiGenerated: false });
        if (ok) {
          await ctx.reply("📤 <b>Reply sent!</b>", { parse_mode: "HTML" });
        } else {
          await ctx.reply("Failed to send reply. Check logs.");
        }
        return;
      }
    }

    // ---- Awaiting support edit (edited AI draft) ----
    {
      const session = getSession(tgId);
      if (session?.awaitingSupEdit) {
        const ticketId = session.awaitingSupEdit;
        setSession(tgId, { awaitingSupEdit: undefined, pendingDraft: undefined });
        await ctx.replyWithChatAction("typing");
        const ok = await sendReply(ticketId, userId(tgId), text.trim(), { aiGenerated: true, aiEdited: true });
        if (ok) {
          await ctx.reply("📤 <b>Edited reply sent!</b>", { parse_mode: "HTML" });
        } else {
          await ctx.reply("Failed to send reply. Check logs.");
        }
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

    // ---- Awaiting task list items ----
    {
      const session = getSession(tgId);
      if (session?.awaitingTaskListItems) {
        const listId = session.awaitingTaskListItems;
        setSession(tgId, { awaitingTaskListItems: undefined });

        // Parse items from text (comma or newline separated)
        const newItems = text
          .split(/[,\n]/)
          .map((s) => s.replace(/^(?:\d+[.)]\s*|[-*\u2022]\s*)/, "").trim())
          .filter(Boolean)
          .slice(0, MAX_TASK_ITEMS)
          .map((t): TaskListItem => ({ text: t.slice(0, MAX_ITEM_LEN), done: false }));

        if (newItems.length === 0) {
          await ctx.reply("No items found. Send items separated by commas or newlines.");
          setSession(tgId, { awaitingTaskListItems: listId }); // re-set awaiting
          return;
        }

        // Fetch the list, append items, update
        const sbUrl = process.env.SUPABASE_URL;
        const sbKey = process.env.SUPABASE_KEY;
        if (!sbUrl || !sbKey) { await ctx.reply("Database unavailable."); return; }

        const rows = await sbQuery<TaskListData[]>(
          { supabaseUrl: sbUrl, supabaseKey: sbKey },
          "flowb_tasklists",
          { id: `eq.${listId}`, is_active: "eq.true" },
        );
        const list = rows?.[0];
        if (!list) { await ctx.reply("Task list not found or deleted."); return; }

        const combined = [...list.items, ...newItems].slice(0, MAX_TASK_ITEMS);
        list.items = combined;
        await updateTaskListItems(list.id, combined);

        // Edit original message if it exists, otherwise post new
        if (list.message_id) {
          try {
            await ctx.api.editMessageText(ctx.chat.id, list.message_id, formatTaskListHtml(list), {
              parse_mode: "HTML",
              reply_markup: buildTaskListKeyboard(list),
            });
          } catch {
            // Original message may be too old to edit, post fresh
            const msg = await ctx.reply(formatTaskListHtml(list), {
              parse_mode: "HTML",
              reply_markup: buildTaskListKeyboard(list),
            });
            fireAndForget(updateTaskListMessageId(list.id, msg.message_id), "store msg id");
          }
        } else {
          const msg = await ctx.reply(formatTaskListHtml(list), {
            parse_mode: "HTML",
            reply_markup: buildTaskListKeyboard(list),
          });
          fireAndForget(updateTaskListMessageId(list.id, msg.message_id), "store msg id");
        }
        return;
      }
    }

    // ---- Awaiting lead name (conversational lead creation) ----
    {
      const session = getSession(tgId);
      if (session?.awaitingLeadName) {
        setSession(tgId, { awaitingLeadName: false });
        await ctx.replyWithChatAction("typing");
        const parsed = parseLeadInput(text.trim());
        const lead = await createLead(tgId, parsed);
        if (lead) {
          setSession(tgId, { leadCache: undefined }); // invalidate cache
          await ctx.reply(formatLeadCreatedHtml(lead.name, lead.stage), {
            parse_mode: "HTML",
            reply_markup: buildLeadDetailKeyboard(lead.id),
          });
          fireAndForget(core.awardPoints(userId(tgId), "telegram", "lead_created"), "award points");
        } else {
          await ctx.reply("Failed to create lead. Try again or use /lead <name>", { parse_mode: "HTML" });
        }
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
    const displayName = ctx.from?.first_name || ctx.from?.username || undefined;
    // Backfill display name + tg_username on every message so admin tools can find users
    const tgUsername = ctx.from?.username || undefined;
    const needsUpdate = (tgUsername && session.tgUsername !== tgUsername) ||
                        (displayName && !session.displayName);
    if (needsUpdate) {
      setSession(tgId, {
        displayName: session.displayName || displayName,
        tgUsername: tgUsername || session.tgUsername,
      });
    }
    const chatResult = LLM_PRIMARY
      ? await sendFlowBChatDirect(session.chatHistory, text, tgId, displayName)
      : { content: await sendFlowBChat(session.chatHistory, text, userId(tgId)) };
    const response = chatResult.content;

    // Update chat history (keep last 20 messages = 10 turns)
    const updatedHistory = [
      ...session.chatHistory,
      { role: "user" as const, content: text },
      { role: "assistant" as const, content: response },
    ].slice(-20);

    setSession(tgId, { chatHistory: updatedHistory });

    // Add persona attribution header for FiFlow responses
    const personaHeader = chatResult.persona?.id === "fiflow"
      ? `<b>\u{1f4ca} ${chatResult.persona.name}</b> <i>${chatResult.persona.label}</i>\n\n`
      : "";

    await ctx.reply(personaHeader + markdownToHtml(response), {
      parse_mode: "HTML",
      reply_markup: PERSISTENT_KEYBOARD,
    });
    fireAndForget(core.awardPoints(userId(tgId), "telegram", "chat"), "award points");
  });

  // ========================================================================
  // Inline query: share crews/events in any Telegram chat
  // ========================================================================

  bot.on("inline_query", async (ctx) => {
    const query = (ctx.inlineQuery.query || "").trim().toLowerCase();
    const tgId = ctx.from.id;

    try {
      const sbUrl = process.env.SUPABASE_URL;
      const sbKey = process.env.SUPABASE_KEY;
      if (!sbUrl || !sbKey) {
        await ctx.answerInlineQuery([]);
        return;
      }

      // Get user's crews
      const memRes = await fetch(
        `${sbUrl}/rest/v1/flowb_group_members?user_id=eq.telegram_${tgId}&select=group_id,role,flowb_groups(id,name,emoji,description,join_code,max_members)`,
        { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } },
      );
      const memberships = memRes.ok ? (await memRes.json()) as any[] : [];

      const results = memberships
        .filter((m: any) => m.flowb_groups)
        .filter((m: any) => {
          if (!query) return true;
          const g = m.flowb_groups;
          return (g.name || "").toLowerCase().includes(query) ||
                 (g.description || "").toLowerCase().includes(query);
        })
        .slice(0, 10)
        .map((m: any) => {
          const g = m.flowb_groups;
          const joinLink = `https://t.me/${botUsername}/flowb?startapp=crew_${g.join_code}`;
          const desc = g.description ? `${g.description}\n` : "";
          return {
            type: "article" as const,
            id: g.id,
            title: `${g.emoji || "\uD83D\uDC65"} ${g.name}`,
            description: g.description || "Tap to share crew invite",
            input_message_content: {
              message_text:
                `<b>${escapeHtml(g.emoji || "\uD83D\uDC65")} ${escapeHtml(g.name)}</b>\n` +
                (desc ? `${escapeHtml(desc)}\n` : "") +
                `Join my crew on FlowB!\n` +
                `\u{1F449} <a href="${joinLink}">Tap here to join</a>`,
              parse_mode: "HTML" as const,
            },
            reply_markup: {
              inline_keyboard: [[
                { text: "Join Crew", url: joinLink },
              ]],
            },
          };
        });

      await ctx.answerInlineQuery(results as any, {
        cache_time: 30,
        is_personal: true,
      });
    } catch (err) {
      console.error("[inline_query] error:", err);
      await ctx.answerInlineQuery([]);
    }
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
    { command: "meet", description: "Schedule a meeting" },
    { command: "meetings", description: "View upcoming meetings" },
    { command: "lead", description: "Add or view a lead" },
    { command: "leads", description: "View your lead pipeline" },
    { command: "pipeline", description: "Pipeline overview by stage" },
    { command: "biz", description: "Business dashboard & tools" },
    { command: "whatsnew", description: "What's new - recent updates & features" },
    { command: "changelog", description: "Development changelog" },
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
    // Clean up expired event reaction tracking (24h TTL)
    for (const [key, tracked] of eventReactedMessages) {
      if (now - tracked.createdAt > EVENT_REACT_TTL_MS) {
        eventReactedMessages.delete(key);
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
    // Sign a JWT so the server can identify the user for memory + biz tools
    const token = signJwt({ sub: userIdStr, platform: "telegram" });
    const res = await fetch(`${FLOWB_CHAT_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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

/**
 * Direct in-process chat via handleChat() — tool-augmented LLM with
 * full access to leads, meetings, settings, admin, events, etc.
 * Used when LLM_PRIMARY is enabled.
 */
async function sendFlowBChatDirect(
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string,
  tgId: number,
  displayName?: string,
): Promise<{ content: string; persona?: ChatPersona }> {
  const xaiKey = process.env.XAI_API_KEY;
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_KEY;
  if (!xaiKey || !sbUrl || !sbKey) {
    console.error("[flowb-telegram] Missing XAI_API_KEY or Supabase config for direct chat");
    const content = await sendFlowBChat(chatHistory, userMessage, userId(tgId));
    return { content };
  }

  const messages: ChatMessage[] = [
    ...chatHistory.slice(-20).map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  try {
    const result = await handleChat(messages, {
      sb: { supabaseUrl: sbUrl, supabaseKey: sbKey },
      xaiKey,
      user: {
        userId: userId(tgId),
        platform: "telegram",
        displayName: displayName || null,
      },
      platform: "telegram",
    });
    return { content: result.content || "Sorry, I couldn't process that.", persona: result.persona };
  } catch (err: any) {
    console.error("[flowb-telegram] Direct chat error:", err.message);
    return { content: "Sorry, something went wrong. Try again!" };
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
  eventStartTime?: string | null,
  eventUrl?: string | null,
): Promise<void> {
  const flowPlugin = core.getFlowPlugin();
  const flowCfg = core.getFlowConfig();
  if (!flowPlugin || !flowCfg) return;

  const targets = await flowPlugin.computeNotifyTargets(flowCfg, uid, eventId);
  const senderName = uid.replace("telegram_", "@");

  // Build event detail lines
  const details: string[] = [];
  if (eventStartTime) {
    const d = new Date(eventStartTime);
    const timeStr = d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Denver" });
    details.push(`\ud83d\udcc5 ${timeStr} MST`);
  }
  if (eventUrl) {
    details.push(`\ud83d\udd17 <a href="${eventUrl}">${eventUrl}</a>`);
  }
  const detailBlock = details.length ? "\n" + details.join("\n") : "";

  // Notify friends
  for (const friendId of targets.friends) {
    const tgId = friendId.replace("telegram_", "");
    if (!tgId || isNaN(Number(tgId))) continue;

    try {
      await bot.api.sendMessage(
        Number(tgId),
        `<b>${senderName}</b> is going to <b>${eventName}</b>!${detailBlock}\n\nYou in?`,
        {
          parse_mode: "HTML",
          link_preview_options: { is_disabled: true },
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
          `<b>${senderName}</b> from <b>${crewLabel}</b> is going to <b>${eventName}</b>!${detailBlock}`,
          {
            parse_mode: "HTML",
            link_preview_options: { is_disabled: true },
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
    id: `like.${shortId}*`,
    status: "eq.pending",
    limit: "1",
  });

  return rows?.[0]?.id || null;
}

/**
 * Fire-and-forget upsert of a linked event into flowb_events.
 * Uses the same slug dedup pattern as event-scanner.ts.
 */
async function saveEventToDiscovered(event: EventResult): Promise<void> {
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_KEY;
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

// ============================================================================
// Event Submission Helpers
// ============================================================================

/** Handle each step of the multi-step event submission flow */
async function handleEventStep(
  ctx: any,
  core: FlowBCore,
  tgId: number,
  input: string,
  session: TgSession,
): Promise<void> {
  const step = session.awaitingEventStep!;
  const pending = { ...session.pendingEvent } as PendingEvent;

  switch (step) {
    case "title":
      pending.title = input;
      setSession(tgId, { pendingEvent: pending, awaitingEventStep: "date" });
      await ctx.reply(
        formatEventSubmitPromptHtml("date", pending),
        { parse_mode: "HTML" },
      );
      return;

    case "date":
      pending.date = input;
      setSession(tgId, { pendingEvent: pending, awaitingEventStep: "time" });
      await ctx.reply(
        formatEventSubmitPromptHtml("time", pending),
        { parse_mode: "HTML", reply_markup: buildEventSubmitSkipKeyboard() },
      );
      return;

    case "time":
      pending.time = input;
      setSession(tgId, { pendingEvent: pending, awaitingEventStep: "venue" });
      await ctx.reply(
        formatEventSubmitPromptHtml("venue", pending),
        { parse_mode: "HTML", reply_markup: buildEventSubmitSkipKeyboard() },
      );
      return;

    case "venue":
      pending.venue = input;
      setSession(tgId, { pendingEvent: pending, awaitingEventStep: "url" });
      await ctx.reply(
        formatEventSubmitPromptHtml("url", pending),
        { parse_mode: "HTML", reply_markup: buildEventSubmitSkipKeyboard() },
      );
      return;

    case "url":
      pending.url = input;
      setSession(tgId, { pendingEvent: pending, awaitingEventStep: "description" });
      await ctx.reply(
        formatEventSubmitPromptHtml("description", pending),
        { parse_mode: "HTML", reply_markup: buildEventSubmitSkipKeyboard() },
      );
      return;

    case "description":
      pending.description = input;
      setSession(tgId, { pendingEvent: pending, awaitingEventStep: "confirm" });
      await ctx.reply(
        formatEventSubmitConfirmHtml(pending),
        { parse_mode: "HTML", reply_markup: buildEventSubmitConfirmKeyboard() },
      );
      return;
  }
}

/** Advance to the next step when user taps "Skip" */
function advanceEventStep(
  ctx: any,
  tgId: number,
  currentStep: string,
  pending: PendingEvent,
): void {
  const stepOrder: Array<TgSession["awaitingEventStep"]> = ["title", "date", "time", "venue", "url", "description", "confirm"];
  const idx = stepOrder.indexOf(currentStep as any);
  const nextStep = stepOrder[idx + 1];

  if (!nextStep || nextStep === "confirm") {
    setSession(tgId, { pendingEvent: pending, awaitingEventStep: "confirm" });
    ctx.reply(
      formatEventSubmitConfirmHtml(pending),
      { parse_mode: "HTML", reply_markup: buildEventSubmitConfirmKeyboard() },
    );
    return;
  }

  setSession(tgId, { pendingEvent: pending, awaitingEventStep: nextStep });

  const isOptional = ["time", "venue", "url", "description"].includes(nextStep);
  ctx.reply(
    formatEventSubmitPromptHtml(nextStep as any, pending),
    { parse_mode: "HTML", reply_markup: isOptional ? buildEventSubmitSkipKeyboard() : undefined },
  );
}

/** Build a startTime ISO string from date + time text */
function parseEventDateTime(date?: string, time?: string): string | null {
  if (!date) return null;
  // Try to parse natural date text
  const now = new Date();
  let target: Date | null = null;

  const lower = date.toLowerCase().trim();
  if (lower === "today") {
    target = now;
  } else if (lower === "tomorrow") {
    target = new Date(now);
    target.setDate(target.getDate() + 1);
  } else {
    // Try direct Date parse
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      target = parsed;
    } else {
      // Try "Mar 15" style
      const parsed2 = new Date(`${date} ${now.getFullYear()}`);
      if (!isNaN(parsed2.getTime())) {
        target = parsed2;
      }
    }
  }

  if (!target) return null;

  if (time) {
    // Parse time like "7pm", "2:00 PM", "14:00"
    const timeMatch = time.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const mins = parseInt(timeMatch[2] || "0", 10);
      const ampm = timeMatch[3]?.toLowerCase();
      if (ampm === "pm" && hours < 12) hours += 12;
      if (ampm === "am" && hours === 12) hours = 0;
      target.setHours(hours, mins, 0, 0);
    }
  }

  return target.toISOString();
}

/** Submit event from the pending state (multi-step or confirm) */
async function submitEventFromPending(
  ctx: any,
  core: FlowBCore,
  tgId: number,
  pending: PendingEvent,
): Promise<void> {
  const startTime = parseEventDateTime(pending.date, pending.time);
  const session = getSession(tgId);

  try {
    const res = await fetch(`${FLOWB_CHAT_URL}/api/v1/events/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${signJwtForBot(tgId)}`,
      },
      body: JSON.stringify({
        title: pending.title,
        startTime: startTime || undefined,
        venue: pending.venue || undefined,
        url: pending.url || undefined,
        description: pending.description || undefined,
        city: session?.city || "Austin",
        isFree: pending.isFree ?? undefined,
      }),
    });

    const data = await res.json() as any;
    if (data.ok) {
      fireAndForget(core.awardPoints(userId(tgId), "telegram", "event_submitted"), "award points");
      await ctx.reply(
        formatEventSubmittedHtml(pending.title || "Event", data.eventId),
        { parse_mode: "HTML", reply_markup: buildBackToMenuKeyboard() },
      );
      const submitter = ctx.from?.username || ctx.from?.first_name || String(tgId);
      alertAdmins(`New community event: <b>${escapeHtml(pending.title || "")}</b> by @${submitter}`, "info");
    } else {
      await ctx.reply(
        `\u2139\ufe0f ${escapeHtml(data.message || data.error || "Something went wrong.")}`,
        { parse_mode: "HTML", reply_markup: buildBackToMenuKeyboard() },
      );
    }
  } catch (err: any) {
    console.error("[flowb-telegram] event submit error:", err.message);
    await ctx.reply("Something went wrong submitting your event. Try again!", { parse_mode: "HTML" });
  }
}

/** Quick submit — just a title, used for inline /addmyevent <title> or DM one-liner */
async function submitEventQuick(
  ctx: any,
  core: FlowBCore,
  tgId: number,
  title: string,
): Promise<void> {
  await ctx.replyWithChatAction("typing");
  const session = getSession(tgId);

  try {
    const res = await fetch(`${FLOWB_CHAT_URL}/api/v1/events/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${signJwtForBot(tgId)}`,
      },
      body: JSON.stringify({
        title,
        city: session?.city || "Austin",
      }),
    });

    const data = await res.json() as any;
    if (data.ok) {
      fireAndForget(core.awardPoints(userId(tgId), "telegram", "event_submitted"), "award points");
      await ctx.reply(
        formatEventSubmittedHtml(title, data.eventId),
        { parse_mode: "HTML", reply_markup: buildBackToMenuKeyboard() },
      );
      const submitter = ctx.from?.username || ctx.from?.first_name || String(tgId);
      alertAdmins(`New community event: <b>${escapeHtml(title)}</b> by @${submitter}`, "info");
    } else {
      await ctx.reply(
        `\u2139\ufe0f ${escapeHtml(data.message || data.error || "Something went wrong.")}`,
        { parse_mode: "HTML", reply_markup: buildBackToMenuKeyboard() },
      );
    }
  } catch (err: any) {
    console.error("[flowb-telegram] event quick submit error:", err.message);
    await ctx.reply("Something went wrong. Try again!", { parse_mode: "HTML" });
  }
}

/** Group one-liner: submit and reply in group, DM user with followup */
async function submitEventFromGroup(
  ctx: any,
  core: FlowBCore,
  bot: any,
  tgId: number,
  title: string,
): Promise<void> {
  const session = getSession(tgId) || setSession(tgId, {});

  try {
    const res = await fetch(`${FLOWB_CHAT_URL}/api/v1/events/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${signJwtForBot(tgId)}`,
      },
      body: JSON.stringify({
        title,
        city: session.city || "Austin",
      }),
    });

    const data = await res.json() as any;
    if (data.ok) {
      fireAndForget(core.awardPoints(userId(tgId), "telegram", "event_submitted"), "award points");
      // Reply in group
      await ctx.reply(
        formatEventSubmitGroupReplyHtml(title),
        { parse_mode: "HTML" },
      );

      // DM user with followup
      try {
        // Store the event in pending so user can add details via DM buttons
        setSession(tgId, { pendingEvent: { title } });
        await bot.api.sendMessage(
          tgId,
          formatEventSubmitDmFollowupHtml(title),
          { parse_mode: "HTML", reply_markup: buildEventSubmitDmFollowupKeyboard() },
        );
      } catch {
        // User may not have started DM with bot — that's ok
      }

      const submitter = ctx.from?.username || ctx.from?.first_name || String(tgId);
      alertAdmins(`New community event (group): <b>${escapeHtml(title)}</b> by @${submitter}`, "info");
    } else {
      await ctx.reply(
        `\u2139\ufe0f ${escapeHtml(data.message || data.error || "Could not list event.")}`,
        { parse_mode: "HTML" },
      );
    }
  } catch (err: any) {
    console.error("[flowb-telegram] group event submit error:", err.message);
    await ctx.reply("Something went wrong. Try again!", { parse_mode: "HTML" });
  }
}

// ============================================================================
// Admin helper functions
// ============================================================================

interface SbCfg { supabaseUrl: string; supabaseKey: string }

async function adminUserLookup(ctx: any, cfg: SbCfg, query: string): Promise<void> {
  try {
    // Search by tg_id (numeric), display_name (ilike), or tg_username (ilike)
    const isNumeric = /^\d+$/.test(query);
    let sessions: any[] = [];

    if (isNumeric) {
      // Exact user_id match
      sessions = await sbFetch<any[]>(
        cfg,
        `flowb_sessions?user_id=eq.telegram_${query}&select=user_id,display_name,tg_username,verified,created_at,updated_at`,
      ) || [];
    }

    if (!sessions.length) {
      // Search by display_name or tg_username (case-insensitive)
      sessions = await sbFetch<any[]>(
        cfg,
        `flowb_sessions?or=(display_name.ilike.*${encodeURIComponent(query)}*,tg_username.ilike.*${encodeURIComponent(query)}*)&select=user_id,display_name,tg_username,verified,created_at,updated_at&limit=10`,
      ) || [];
    }

    if (!sessions.length) {
      await ctx.reply(`No users found matching "${escapeHtml(query)}".`, { parse_mode: "HTML" });
      return;
    }

    const lines: string[] = [`<b>User Lookup: "${escapeHtml(query)}"</b>`, `Found ${sessions.length} result(s)`, ""];

    for (const s of sessions) {
      const uid = s.user_id || "?";
      const tgIdStr = uid.replace("telegram_", "");
      const name = s.display_name || "—";
      const username = s.tg_username ? `@${s.tg_username}` : "—";
      const verified = s.verified ? "\u2705" : "\u274C";

      lines.push(`<b>${escapeHtml(name)}</b> ${verified}`);
      lines.push(`  TG: <code>${tgIdStr}</code> | ${username}`);
      lines.push(`  user_id: <code>${uid}</code>`);

      // Fetch points
      const points = await sbFetch<any[]>(
        cfg,
        `flowb_points_ledger?user_id=eq.${encodeURIComponent(uid)}&select=points&limit=50000`,
      );
      const totalPts = points?.reduce((sum: number, p: any) => sum + (p.points || 0), 0) || 0;

      // Fetch connections count
      const conns = await sbFetch<any[]>(
        cfg,
        `flowb_connections?or=(user_id.eq.${encodeURIComponent(uid)},friend_id.eq.${encodeURIComponent(uid)})&status=eq.accepted&select=id&limit=50000`,
      );

      // Fetch crew memberships
      const crews = await sbFetch<any[]>(
        cfg,
        `flowb_crew_members?user_id=eq.${encodeURIComponent(uid)}&select=crew_id&limit=50`,
      );

      // Check if admin
      const isAdmin = await isFlowBAdmin(cfg, uid);

      lines.push(`  Points: <b>${totalPts}</b> | Connections: <b>${conns?.length || 0}</b> | Crews: <b>${crews?.length || 0}</b>`);
      if (isAdmin) lines.push(`  Role: <b>Admin</b>`);

      const joined = s.created_at ? new Date(s.created_at).toLocaleDateString() : "?";
      const lastSeen = s.updated_at ? timeAgo(new Date(s.updated_at)) : "?";
      lines.push(`  Joined: ${joined} | Last seen: ${lastSeen}`);
      lines.push("");
    }

    await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
  } catch (err: any) {
    console.error("[admin] user lookup error:", err.message);
    await ctx.reply(`Lookup failed: ${err.message}`);
  }
}

async function adminActiveUsers(ctx: any, cfg: SbCfg, periodArg: string): Promise<void> {
  try {
    // Parse period
    const match = periodArg.match(/^(\d+)\s*d/);
    const days = match ? parseInt(match[1], 10) : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const sessions = await sbFetch<any[]>(
      cfg,
      `flowb_sessions?updated_at=gte.${since}&select=user_id,display_name,tg_username,verified,updated_at&order=updated_at.desc&limit=50`,
    ) || [];

    if (!sessions.length) {
      await ctx.reply(`No active users in the last ${days} day(s).`);
      return;
    }

    const lines: string[] = [
      `<b>Active Users (last ${days}d)</b>`,
      `<i>${sessions.length}${sessions.length === 50 ? "+" : ""} users</i>`,
      "",
    ];

    for (const s of sessions) {
      const name = s.display_name || "Anon";
      const username = s.tg_username ? ` @${s.tg_username}` : "";
      const verified = s.verified ? "\u2705" : "";
      const lastSeen = timeAgo(new Date(s.updated_at));
      const tgIdStr = (s.user_id || "").replace("telegram_", "");
      lines.push(`${verified} <b>${escapeHtml(name)}</b>${username} — ${lastSeen} <code>${tgIdStr}</code>`);
    }

    await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
  } catch (err: any) {
    console.error("[admin] active users error:", err.message);
    await ctx.reply(`Failed: ${err.message}`);
  }
}

async function adminUserStats(ctx: any, cfg: SbCfg): Promise<void> {
  try {
    const [allSessions, verifiedSessions] = await Promise.all([
      sbFetch<any[]>(cfg, "flowb_sessions?select=user_id&limit=50000"),
      sbFetch<any[]>(cfg, "flowb_sessions?verified=eq.true&select=user_id&limit=50000"),
    ]);

    const total = allSessions?.length || 0;
    const verified = verifiedSessions?.length || 0;

    // Active in periods
    const now = Date.now();
    const day1 = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString();
    const day7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const day30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [a1, a7, a30] = await Promise.all([
      sbFetch<any[]>(cfg, `flowb_sessions?updated_at=gte.${day1}&select=user_id&limit=50000`),
      sbFetch<any[]>(cfg, `flowb_sessions?updated_at=gte.${day7}&select=user_id&limit=50000`),
      sbFetch<any[]>(cfg, `flowb_sessions?updated_at=gte.${day30}&select=user_id&limit=50000`),
    ]);

    // Admin count
    const admins = await sbFetch<any[]>(cfg, "flowb_admins?select=user_id,label&limit=100");

    const lines = [
      "<b>User Stats</b>",
      "",
      `Total users: <b>${total}</b>`,
      `Verified: <b>${verified}</b> (${total > 0 ? Math.round((verified / total) * 100) : 0}%)`,
      "",
      "<b>Active Users</b>",
      `  24h: <b>${a1?.length || 0}</b>`,
      `  7d:  <b>${a7?.length || 0}</b>`,
      `  30d: <b>${a30?.length || 0}</b>`,
      "",
      `<b>Admins</b> (${admins?.length || 0})`,
    ];

    if (admins?.length) {
      for (const a of admins) {
        lines.push(`  ${a.label || a.user_id}`);
      }
    }

    await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
  } catch (err: any) {
    console.error("[admin] stats error:", err.message);
    await ctx.reply(`Failed: ${err.message}`);
  }
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
