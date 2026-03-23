import type { Bot, Context } from "grammy";
import { query } from "../db.js";
import { getSession } from "../bot.js";
import { PERSISTENT_KEYBOARD } from "../ui/keyboards.js";
import { escapeHtml } from "../ui/cards.js";

export function registerBonds(bot: Bot): void {
  bot.command("bonds", async (ctx) => {
    const tgId = ctx.from!.id;
    await ctx.replyWithChatAction("typing");

    const session = getSession(tgId);
    if (!session?.verified || !session?.privyId) {
      await ctx.reply("You need to connect your DANZ account first. Use /start to get set up!", {
        reply_markup: PERSISTENT_KEYBOARD,
      });
      return;
    }

    const privyId = session.privyId;

    // Get bonds where user is user1
    const bonds1 = await query<any[]>("dance_bonds", {
      select: "id,user2_id,bond_level,shared_sessions,created_at,users!dance_bonds_user2_id_fkey(username,display_name)",
      user1_id: `eq.${privyId}`,
      order: "bond_level.desc",
      limit: "20",
    });

    // Get bonds where user is user2
    const bonds2 = await query<any[]>("dance_bonds", {
      select: "id,user1_id,bond_level,shared_sessions,created_at,users!dance_bonds_user1_id_fkey(username,display_name)",
      user2_id: `eq.${privyId}`,
      order: "bond_level.desc",
      limit: "20",
    });

    const allBonds = [
      ...(bonds1 || []).map((b) => ({
        name: b.users?.display_name || b.users?.username || "Dancer",
        level: b.bond_level || 1,
        sessions: b.shared_sessions || 0,
        since: b.created_at,
      })),
      ...(bonds2 || []).map((b) => ({
        name: b.users?.display_name || b.users?.username || "Dancer",
        level: b.bond_level || 1,
        sessions: b.shared_sessions || 0,
        since: b.created_at,
      })),
    ];

    // Sort by bond level desc
    allBonds.sort((a, b) => b.level - a.level);

    if (!allBonds.length) {
      await ctx.reply(
        [
          "<b>Dance Bonds</b>",
          "",
          "You haven't made any dance bonds yet!",
          "",
          "Bonds form when you attend events with the same people.",
          "Check in to events with /checkin to start building connections.",
        ].join("\n"),
        { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD },
      );
      return;
    }

    const lines: string[] = [
      `<b>${escapeHtml(session.danzUsername || "Your")} Dance Bonds</b>`,
      `<i>${allBonds.length} connection${allBonds.length !== 1 ? "s" : ""}</i>`,
      "",
    ];

    for (const bond of allBonds.slice(0, 15)) {
      const bar = bondBar(bond.level);
      const sessionsText = bond.sessions > 0 ? ` | ${bond.sessions} shared sessions` : "";
      lines.push(`<b>${escapeHtml(bond.name)}</b>`);
      lines.push(`  ${bar} Lv${bond.level}${sessionsText}`);
    }

    if (allBonds.length > 15) {
      lines.push("");
      lines.push(`<i>...and ${allBonds.length - 15} more bonds</i>`);
    }

    lines.push("");
    lines.push("Dance together more to strengthen your bonds!");

    await ctx.reply(lines.join("\n"), {
      parse_mode: "HTML",
      reply_markup: PERSISTENT_KEYBOARD,
    });
  });
}

function bondBar(level: number): string {
  const max = 100;
  const filled = Math.round((level / max) * 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}
