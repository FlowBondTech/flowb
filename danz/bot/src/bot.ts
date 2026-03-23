/**
 * Grammy bot setup, session management, command + callback routing.
 */

import { Bot, type Context } from "grammy";
import type { BotConfig } from "./config.js";

import { registerStart } from "./commands/start.js";
import { registerEvents, sendEventCards } from "./commands/events.js";
import { registerProfile, sendProfile } from "./commands/profile.js";
import { registerChallenges, sendChallenges } from "./commands/challenges.js";
import { registerLeaderboard, sendLeaderboard } from "./commands/leaderboard.js";
import { registerCheckin } from "./commands/checkin.js";
import { registerWallet } from "./commands/wallet.js";
import { registerBonds } from "./commands/bonds.js";
import { PERSISTENT_KEYBOARD, buildMenuKeyboard } from "./ui/keyboards.js";
import { formatMenuHtml } from "./ui/cards.js";

// ============================================================================
// Session
// ============================================================================

export interface BotSession {
  verified: boolean;
  privyId?: string;
  danzUsername?: string;
  // event card browsing
  events: any[];
  filteredEvents: any[];
  cardIndex: number;
  cardMessageId?: number;
  categoryFilter: string;
  dateFilter: string;
  // checkin state
  checkinEventId?: string;
  awaitingProofPhoto?: boolean;
  danceMoveForProof?: string;
  // meta
  lastActive: number;
}

const sessions = new Map<number, BotSession>();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min

export function getSession(tgId: number): BotSession | undefined {
  const s = sessions.get(tgId);
  if (s && Date.now() - s.lastActive > SESSION_TTL_MS) {
    sessions.delete(tgId);
    return undefined;
  }
  if (s) s.lastActive = Date.now();
  return s;
}

export function setSession(tgId: number, partial: Partial<BotSession>): BotSession {
  const existing = getSession(tgId);
  const session: BotSession = {
    verified: partial.verified ?? existing?.verified ?? false,
    privyId: partial.privyId ?? existing?.privyId,
    danzUsername: partial.danzUsername ?? existing?.danzUsername,
    events: partial.events ?? existing?.events ?? [],
    filteredEvents: partial.filteredEvents ?? existing?.filteredEvents ?? [],
    cardIndex: partial.cardIndex ?? existing?.cardIndex ?? 0,
    cardMessageId: partial.cardMessageId ?? existing?.cardMessageId,
    categoryFilter: partial.categoryFilter ?? existing?.categoryFilter ?? "all",
    dateFilter: partial.dateFilter ?? existing?.dateFilter ?? "all",
    checkinEventId: partial.checkinEventId ?? existing?.checkinEventId,
    awaitingProofPhoto: partial.awaitingProofPhoto ?? existing?.awaitingProofPhoto ?? false,
    danceMoveForProof: partial.danceMoveForProof ?? existing?.danceMoveForProof,
    lastActive: Date.now(),
  };
  sessions.set(tgId, session);
  return session;
}

/** telegram_<tgId> user identifier */
export function userId(tgId: number): string {
  return `telegram_${tgId}`;
}

// ============================================================================
// Bot creation
// ============================================================================

export function createBot(config: BotConfig): Bot {
  const bot = new Bot(config.botToken);

  // Global error handler - log and don't crash
  bot.catch((err) => {
    console.error("[danznow-bot] Error:", err.message || err);
  });

  // Register slash commands
  registerStart(bot, config);
  registerEvents(bot);
  registerProfile(bot);
  registerChallenges(bot);
  registerLeaderboard(bot);
  registerCheckin(bot);
  registerWallet(bot);
  registerBonds(bot);

  // /menu - show main menu
  bot.command("menu", async (ctx) => {
    await ctx.reply(formatMenuHtml(), {
      parse_mode: "HTML",
      reply_markup: buildMenuKeyboard(config.miniAppUrl),
    });
  });

  // /help
  bot.command("help", async (ctx) => {
    await ctx.reply(
      [
        "<b>DANZ.Now Bot</b>\n",
        "/start - Welcome & onboarding",
        "/events - Discover upcoming events",
        "/profile - Your dance stats",
        "/challenges - Active challenges",
        "/leaderboard - Top dancers",
        "/checkin - Check in to an event",
        "/wallet - DANZ balance & transactions",
        "/bonds - Your dance connections",
        "/menu - Main menu",
        "/help - This message",
      ].join("\n"),
      { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD },
    );
  });

  // ---- Callback query router ----
  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;

    // Menu navigation: mn:events, mn:profile, etc.
    if (data.startsWith("mn:")) {
      const target = data.slice(3);
      switch (target) {
        case "events":
          await sendEventCards(ctx);
          break;
        case "profile":
          await sendProfile(ctx);
          break;
        case "challenges":
          await sendChallenges(ctx);
          break;
        case "leaderboard":
          await sendLeaderboard(ctx);
          break;
        case "checkin":
          // Trigger the checkin flow
          await ctx.reply("Use /checkin to check in to today's events!", {
            reply_markup: PERSISTENT_KEYBOARD,
          });
          break;
        case "wallet":
          await ctx.reply("Use /wallet to view your balance!", {
            reply_markup: PERSISTENT_KEYBOARD,
          });
          break;
        case "bonds":
          await ctx.reply("Use /bonds to view your dance connections!", {
            reply_markup: PERSISTENT_KEYBOARD,
          });
          break;
        case "menu":
          await ctx.editMessageText(formatMenuHtml(), {
            parse_mode: "HTML",
            reply_markup: buildMenuKeyboard(config.miniAppUrl),
          });
          break;
      }
      await ctx.answerCallbackQuery();
      return;
    }

    // Event card navigation
    if (data.startsWith("ec:")) {
      const { handleEventCallback } = await import("./commands/events.js");
      await handleEventCallback(ctx);
      await ctx.answerCallbackQuery();
      return;
    }

    // Checkin callbacks: ci:EVENT_ID, dm:EVENT_ID:MOVE
    if (data.startsWith("ci:") || data.startsWith("dm:")) {
      const { handleCheckinCallback } = await import("./commands/checkin.js");
      await handleCheckinCallback(ctx);
      await ctx.answerCallbackQuery();
      return;
    }

    await ctx.answerCallbackQuery();
  });

  // ---- Photo handler for dance proof ----
  bot.on("message:photo", async (ctx) => {
    const tgId = ctx.from!.id;
    const session = getSession(tgId);

    if (!session?.awaitingProofPhoto || !session?.checkinEventId) return;

    const { handleDanceProofPhoto } = await import("./commands/checkin.js");
    await handleDanceProofPhoto(ctx, session);
  });

  // ---- Catch-all text for natural language routing ----
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text.trim().toLowerCase();

    if (/^(menu|home)$/i.test(text)) {
      await ctx.reply(formatMenuHtml(), {
        parse_mode: "HTML",
        reply_markup: buildMenuKeyboard(config.miniAppUrl),
      });
      return;
    }
    if (/^(events|browse|whats on)$/i.test(text)) {
      await sendEventCards(ctx);
      return;
    }
    if (/^(profile|stats|my stats)$/i.test(text)) {
      await sendProfile(ctx);
      return;
    }
    if (/^(challenges)$/i.test(text)) {
      await sendChallenges(ctx);
      return;
    }
    if (/^(leaderboard|top|ranking)$/i.test(text)) {
      await sendLeaderboard(ctx);
      return;
    }
  });

  return bot;
}
