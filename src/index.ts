import "dotenv/config";
import { loadConfig } from "./config.js";
import { FlowBCore } from "./core/flowb.js";
import { buildApp } from "./server/app.js";

const config = loadConfig();
const core = new FlowBCore(config);

async function main() {
  const app = await buildApp(core);

  const port = parseInt(process.env.PORT || "8080", 10);
  const host = "0.0.0.0";

  app.listen({ port, host }, (err, address) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    console.log(`[flowb] Server listening on ${address}`);
  });

  // Start Telegram bot if token available
  const tgToken = process.env.FLOWB_TELEGRAM_BOT_TOKEN;
  if (tgToken) {
    Promise.all([
      import("./telegram/bot.js"),
      import("./services/privy.js"),
    ]).then(([{ startTelegramBot }, { PrivyClient }]) => {
      const privy = config.plugins?.privy
        ? new PrivyClient(config.plugins.privy)
        : undefined;
      startTelegramBot(tgToken, core, privy);
    }).catch(err => console.error("[flowb-telegram] Failed to start:", err));
  }

  // Graceful shutdown
  function shutdown(signal: string) {
    console.log(`[flowb] ${signal} received, shutting down...`);
    app.close().then(() => {
      console.log("[flowb] Server closed");
      process.exit(0);
    });
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch(err => {
  console.error("[flowb] Fatal startup error:", err);
  process.exit(1);
});
