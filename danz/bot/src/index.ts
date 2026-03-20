/**
 * DANZ.Now Telegram Bots
 *   @DanzNowBot - main bot (full features)
 *   @danznow_bot - redirect bot (points to main)
 */

import { Bot, InlineKeyboard } from "grammy";
import { loadConfig } from "./config.js";
import { initDb } from "./db.js";
import { createBot } from "./bot.js";

async function main() {
  const config = loadConfig();
  initDb({ supabaseUrl: config.supabaseUrl, supabaseKey: config.supabaseKey });

  // ---- Main bot: @DanzNowBot ----
  const bot = createBot(config);

  await bot.api.setMyCommands([
    { command: "start", description: "Welcome & onboarding" },
    { command: "events", description: "Discover upcoming events" },
    { command: "profile", description: "Your dance stats" },
    { command: "challenges", description: "Active challenges" },
    { command: "leaderboard", description: "Top dancers" },
    { command: "checkin", description: "Check in to an event" },
    { command: "wallet", description: "DANZ balance & transactions" },
    { command: "bonds", description: "Your dance connections" },
    { command: "menu", description: "Main menu" },
    { command: "help", description: "Help & commands" },
  ]);

  console.log("[danznow-bot] starting @DanzNowBot...");
  bot.start({
    onStart: () => console.log("[danznow-bot] @DanzNowBot is live!"),
  });

  // ---- Redirect bot: @danznow_bot ----
  const redirectToken = process.env.DANZNOW_REDIRECT_BOT_TOKEN;
  if (redirectToken) {
    const redirect = new Bot(redirectToken);
    const mainBotUrl = `https://t.me/${config.botUsername}`;
    const kb = new InlineKeyboard().url("Open @DanzNowBot", mainBotUrl);
    const msg = [
      "<b>DANZ.Now</b>  <i>Move. Connect. Earn.</i>",
      "",
      "Head to our main bot for the full experience:",
    ].join("\n");

    redirect.on("message", async (ctx) => {
      await ctx.reply(msg, { parse_mode: "HTML", reply_markup: kb });
    });

    redirect.start({
      onStart: () => console.log("[danznow-bot] @danznow_bot redirect is live!"),
    });
  }
}

main().catch((err) => {
  console.error("[danznow-bot] Fatal:", err);
  process.exit(1);
});
