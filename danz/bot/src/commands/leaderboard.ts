import type { Bot, Context } from "grammy";
import { query } from "../db.js";
import { PERSISTENT_KEYBOARD } from "../ui/keyboards.js";
import { escapeHtml } from "../ui/cards.js";

export function registerLeaderboard(bot: Bot): void {
  bot.command("leaderboard", async (ctx) => {
    await sendLeaderboard(ctx);
  });
}

export async function sendLeaderboard(ctx: Context): Promise<void> {
  await ctx.replyWithChatAction("typing");

  const users = await query<any[]>("users", {
    select: "username,display_name,xp,level,current_streak",
    order: "xp.desc",
    limit: "10",
  });

  if (!users?.length) {
    await ctx.reply("No leaderboard data yet. Be the first!", {
      reply_markup: PERSISTENT_KEYBOARD,
    });
    return;
  }

  const medals = ["1.", "2.", "3."];
  const lines: string[] = ["<b>DANZ Leaderboard</b>\n"];

  users.forEach((u, i) => {
    const rank = medals[i] || `${i + 1}.`;
    const name = escapeHtml(u.display_name || u.username || "Dancer");
    const streak = u.current_streak > 0 ? ` | ${u.current_streak}d streak` : "";
    lines.push(`${rank} <b>${name}</b> - Lv${u.level || 1} (${u.xp || 0} XP)${streak}`);
  });

  lines.push("\nKeep dancing to climb the ranks!");

  await ctx.reply(lines.join("\n"), {
    parse_mode: "HTML",
    reply_markup: PERSISTENT_KEYBOARD,
  });
}
