import type { Bot, Context } from "grammy";
import type { BotConfig } from "../config.js";
import { query } from "../db.js";
import { getSession, setSession, userId } from "../bot.js";
import { PERSISTENT_KEYBOARD, buildMenuKeyboard } from "../ui/keyboards.js";
import { escapeHtml } from "../ui/cards.js";

export function registerStart(bot: Bot, config: BotConfig): void {
  bot.command("start", async (ctx) => {
    const tgId = ctx.from!.id;
    const tgUsername = ctx.from!.username;
    const firstName = ctx.from!.first_name || "Dancer";

    // Try to auto-verify: check if this telegram user already has a DANZ account
    let session = getSession(tgId);
    if (!session?.verified) {
      const verified = await tryAutoVerify(tgId, tgUsername);
      if (verified) {
        session = setSession(tgId, {
          verified: true,
          privyId: verified.privyId,
          danzUsername: verified.username,
        });
      } else {
        session = setSession(tgId, {});
      }
    }

    if (session.verified && session.danzUsername) {
      // Existing verified user
      const users = await query<any[]>("users", {
        select: "xp,level,current_streak",
        privy_id: `eq.${session.privyId}`,
        limit: "1",
      });
      const u = users?.[0];
      const xp = u?.xp || 0;
      const level = u?.level || 1;
      const streak = u?.current_streak || 0;
      const streakBadge = streak > 0 ? `  |  ${streak}-day streak` : "";

      await ctx.reply(
        [
          `gm <b>${escapeHtml(session.danzUsername)}</b>`,
          "",
          `<b>Level ${level}</b>  |  ${xp} XP${streakBadge}`,
          "",
          "ready to dance?",
        ].join("\n"),
        { parse_mode: "HTML", reply_markup: buildMenuKeyboard(config.miniAppUrl) },
      );
    } else {
      // New user - welcome message
      await ctx.reply(
        [
          "<b>DANZ.Now</b>  <i>Move. Connect. Earn.</i>",
          "",
          `Welcome, <b>${escapeHtml(firstName)}</b>!`,
          "",
          "Discover dance events, earn XP, complete challenges, and build bonds with other dancers.",
          "",
          "Get started:",
          "  /events - Find events near you",
          "  /challenges - See what's active",
          "  /profile - Check your stats",
          "",
          "<i>Tap the menu below to explore.</i>",
        ].join("\n"),
        { parse_mode: "HTML", reply_markup: buildMenuKeyboard(config.miniAppUrl) },
      );
    }
  });
}

async function tryAutoVerify(
  tgId: number,
  tgUsername?: string,
): Promise<{ privyId: string; username: string } | null> {
  // Check pending_verifications for this telegram user
  const verifications = await query<any[]>("pending_verifications", {
    select: "danz_privy_id",
    platform_user_id: `eq.${userId(tgId)}`,
    platform: "eq.telegram",
    verified_at: "not.is.null",
    order: "verified_at.desc",
    limit: "1",
  });

  if (verifications?.length && verifications[0].danz_privy_id) {
    const privyId = verifications[0].danz_privy_id;
    const users = await query<any[]>("users", {
      select: "privy_id,username,display_name",
      privy_id: `eq.${privyId}`,
      limit: "1",
    });
    const user = users?.[0];
    if (user) {
      return {
        privyId: user.privy_id,
        username: user.username || user.display_name || "Dancer",
      };
    }
  }

  // Fallback: try matching by telegram username -> DANZ username
  if (tgUsername) {
    const users = await query<any[]>("users", {
      select: "privy_id,username,display_name",
      username: `eq.${tgUsername.toLowerCase()}`,
      limit: "1",
    });
    if (users?.length) {
      return {
        privyId: users[0].privy_id,
        username: users[0].username || users[0].display_name || tgUsername,
      };
    }
  }

  return null;
}
