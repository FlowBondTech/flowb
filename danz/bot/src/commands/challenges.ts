import type { Bot, Context } from "grammy";
import { query } from "../db.js";
import { getSession } from "../bot.js";
import { PERSISTENT_KEYBOARD } from "../ui/keyboards.js";
import { escapeHtml } from "../ui/cards.js";

export function registerChallenges(bot: Bot): void {
  bot.command("challenges", async (ctx) => {
    await sendChallenges(ctx);
  });
}

export async function sendChallenges(ctx: Context): Promise<void> {
  await ctx.replyWithChatAction("typing");

  const now = new Date().toISOString();
  const challenges = await query<any[]>("challenges", {
    select: "*",
    is_active: "eq.true",
    order: "challenge_type.asc",
    limit: "15",
  });

  if (!challenges?.length) {
    await ctx.reply("No active challenges right now. Check back soon!", {
      reply_markup: PERSISTENT_KEYBOARD,
    });
    return;
  }

  const byType: Record<string, any[]> = {};
  for (const c of challenges) {
    const type = c.challenge_type || "OTHER";
    if (!byType[type]) byType[type] = [];
    byType[type].push(c);
  }

  const typeLabel: Record<string, string> = {
    DAILY: "Daily Challenges",
    WEEKLY: "Weekly Challenges",
    SPECIAL: "Special Challenges",
    EVENT: "Event Challenges",
    STREAK: "Streak Challenges",
    SOCIAL: "Social Challenges",
  };

  const lines: string[] = ["<b>Active Challenges</b>\n"];

  for (const [type, items] of Object.entries(byType)) {
    lines.push(`<b>${typeLabel[type] || type}</b>`);
    for (const c of items.slice(0, 5)) {
      lines.push(`  <b>${escapeHtml(c.title)}</b> - ${c.xp_reward || 0} XP`);
      if (c.description) {
        lines.push(`  <i>${escapeHtml(c.description.slice(0, 80))}</i>`);
      }
    }
    lines.push("");
  }

  lines.push("Complete challenges to earn XP and level up!");

  // Check user progress if verified
  const tgId = ctx.from!.id;
  const session = getSession(tgId);
  if (session?.verified && session?.privyId) {
    const progress = await query<any[]>("user_challenges", {
      select: "challenge_id,status,progress",
      user_id: `eq.${session.privyId}`,
      status: "neq.completed",
      limit: "10",
    });

    if (progress?.length) {
      lines.push("\n<b>Your Progress</b>");
      for (const p of progress) {
        const challenge = challenges.find((c) => c.id === p.challenge_id);
        if (challenge) {
          const pct = p.progress ? `${Math.round(p.progress * 100)}%` : "started";
          lines.push(`  ${escapeHtml(challenge.title)} - ${pct}`);
        }
      }
    }
  }

  await ctx.reply(lines.join("\n"), {
    parse_mode: "HTML",
    reply_markup: PERSISTENT_KEYBOARD,
  });
}
