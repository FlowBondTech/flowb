import type { Bot, Context } from "grammy";
import { query } from "../db.js";
import { getSession } from "../bot.js";
import { PERSISTENT_KEYBOARD } from "../ui/keyboards.js";
import { escapeHtml } from "../ui/cards.js";

export function registerWallet(bot: Bot): void {
  bot.command("wallet", async (ctx) => {
    const tgId = ctx.from!.id;
    await ctx.replyWithChatAction("typing");

    const session = getSession(tgId);
    if (!session?.verified || !session?.privyId) {
      await ctx.reply("You need to connect your DANZ account first. Use /start to get set up!", {
        reply_markup: PERSISTENT_KEYBOARD,
      });
      return;
    }

    // Get wallet info
    const wallets = await query<any[]>("user_wallets", {
      select: "wallet_address,chain,linked_at",
      privy_id: `eq.${session.privyId}`,
      limit: "5",
    });

    // Get reward claims
    const claims = await query<any[]>("payout_claims", {
      select: "amount_usdc,status,claimed_at",
      privy_id: `eq.${session.privyId}`,
      order: "claimed_at.desc",
      limit: "10",
    });

    // Get user XP/level for DANZ token equivalent
    const users = await query<any[]>("users", {
      select: "xp,level",
      privy_id: `eq.${session.privyId}`,
      limit: "1",
    });

    const u = users?.[0];
    const xp = u?.xp || 0;

    const lines: string[] = [
      `<b>${escapeHtml(session.danzUsername || "Dancer")}'s Wallet</b>`,
      "",
      `<b>DANZ Points:</b> ${xp} XP`,
    ];

    // Linked wallets
    if (wallets?.length) {
      lines.push("");
      lines.push("<b>Linked Wallets</b>");
      for (const w of wallets) {
        const addr = w.wallet_address;
        const short = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
        lines.push(`  ${w.chain || "base"}: <code>${short}</code>`);
      }
    } else {
      lines.push("");
      lines.push("<i>No wallet linked yet.</i>");
      lines.push("Link your Base wallet to claim USDC rewards.");
    }

    // Recent rewards
    if (claims?.length) {
      let totalPaid = 0;
      let totalPending = 0;

      for (const c of claims) {
        if (c.status === "paid") totalPaid += Number(c.amount_usdc);
        if (c.status === "pending" || c.status === "approved") totalPending += Number(c.amount_usdc);
      }

      lines.push("");
      lines.push("<b>Rewards</b>");
      lines.push(`  Total Earned: $${totalPaid.toFixed(2)} USDC`);
      if (totalPending > 0) {
        lines.push(`  Pending: $${totalPending.toFixed(2)} USDC`);
      }

      lines.push("");
      lines.push("<b>Recent Transactions</b>");
      for (const c of claims.slice(0, 5)) {
        const date = new Date(c.claimed_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        const statusLabel = c.status === "paid" ? "Paid" : c.status === "pending" ? "Pending" : c.status;
        lines.push(`  ${date} | $${Number(c.amount_usdc).toFixed(2)} | ${statusLabel}`);
      }
    } else {
      lines.push("");
      lines.push("<i>No reward transactions yet.</i>");
      lines.push("Complete challenges to start earning!");
    }

    await ctx.reply(lines.join("\n"), {
      parse_mode: "HTML",
      reply_markup: PERSISTENT_KEYBOARD,
    });
  });
}
