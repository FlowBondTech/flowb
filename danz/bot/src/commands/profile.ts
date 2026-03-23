import type { Bot, Context } from "grammy";
import { query } from "../db.js";
import { getSession, setSession, userId } from "../bot.js";
import { PERSISTENT_KEYBOARD } from "../ui/keyboards.js";
import { formatProfileHtml } from "../ui/cards.js";

export function registerProfile(bot: Bot): void {
  bot.command("profile", async (ctx) => {
    await sendProfile(ctx);
  });
}

export async function sendProfile(ctx: Context): Promise<void> {
  const tgId = ctx.from!.id;
  await ctx.replyWithChatAction("typing");

  const session = getSession(tgId);
  if (!session?.verified || !session?.privyId) {
    await ctx.reply(
      "You haven't connected your DANZ account yet.\n\nUse /start to get set up!",
      { reply_markup: PERSISTENT_KEYBOARD },
    );
    return;
  }

  const users = await query<any[]>("users", {
    select: "username,display_name,xp,level,total_sessions,total_dance_time,longest_streak,current_streak,total_events_attended,dance_bonds_count,total_achievements,dance_styles,skill_level,subscription_tier",
    privy_id: `eq.${session.privyId}`,
    limit: "1",
  });

  if (!users?.length) {
    await ctx.reply("Could not load your profile. Try again later.", {
      reply_markup: PERSISTENT_KEYBOARD,
    });
    return;
  }

  const u = users[0];

  // Get achievement count
  const achievements = await query<any[]>("achievements", {
    select: "id",
    user_id: `eq.${session.privyId}`,
  });

  // Get bonds count
  const bonds1 = await query<any[]>("dance_bonds", {
    select: "id",
    user1_id: `eq.${session.privyId}`,
  });
  const bonds2 = await query<any[]>("dance_bonds", {
    select: "id",
    user2_id: `eq.${session.privyId}`,
  });
  const bondsCount = (bonds1?.length || 0) + (bonds2?.length || 0);

  await ctx.reply(
    formatProfileHtml({
      name: u.username || u.display_name || session.danzUsername || "Dancer",
      level: u.level || 1,
      xp: u.xp || 0,
      totalDanceTime: u.total_dance_time || 0,
      totalSessions: u.total_sessions || 0,
      currentStreak: u.current_streak || 0,
      longestStreak: u.longest_streak || 0,
      eventsAttended: u.total_events_attended || 0,
      bondsCount,
      achievementCount: achievements?.length || u.total_achievements || 0,
      danceStyles: u.dance_styles || [],
      skillLevel: u.skill_level || "all",
      tier: u.subscription_tier || "free",
    }),
    { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD },
  );
}
