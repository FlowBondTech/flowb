import Fastify from "fastify";
import cors from "@fastify/cors";
import type { FlowBCore } from "../core/flowb.js";
import type { ToolInput } from "../core/types.js";
import {
  verifyTelegramAuth,
  parseTelegramAuthParams,
} from "../services/telegram-auth.js";

export function buildApp(core: FlowBCore) {
  const app = Fastify({ logger: true });

  app.register(cors);

  // Health check + plugin status
  app.get("/health", async () => {
    return {
      status: "ok",
      service: "flowb",
      plugins: core.getPluginStatus(),
      uptime: process.uptime(),
    };
  });

  // Generic action endpoint - preserves the agent/plugin router pattern
  app.post<{ Body: ToolInput }>("/api/v1/action", async (request, reply) => {
    const input = request.body;

    if (!input?.action) {
      return reply.status(400).send({ error: "Missing required field: action" });
    }

    const result = await core.execute(input.action, input);
    return { action: input.action, result };
  });

  // Convenience endpoint for event discovery
  app.post<{ Body: ToolInput }>("/api/v1/events", async (request, reply) => {
    const input = request.body || {};
    const result = await core.discoverEvents({ ...input, action: "events" });
    return { result };
  });

  // Plugin status
  app.get("/api/v1/plugins", async () => {
    return { plugins: core.getPluginStatus() };
  });

  // ==========================================================================
  // Telegram Login Widget callback
  //
  // Flow: User taps "Connect DANZ Account" in bot -> opens this URL ->
  // Telegram widget authenticates -> redirects here with auth params ->
  // we verify HMAC, store the link in Supabase, show success page.
  // ==========================================================================

  app.get<{ Querystring: Record<string, string> }>(
    "/auth/telegram",
    async (request, reply) => {
      const botToken = process.env.FLOWB_TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return reply.status(500).send({ error: "Bot token not configured" });
      }

      const params = request.query;
      const authData = parseTelegramAuthParams(params);

      // Verify HMAC-SHA-256
      const { valid, error } = verifyTelegramAuth(authData, botToken);
      if (!valid) {
        app.log.warn(`[auth/telegram] Verification failed: ${error}`);
        return reply.type("text/html").status(403).send(authErrorPage(error || "Verification failed"));
      }

      // Store the Telegram<->DANZ link
      const linkResult = await core.linkTelegramUser(authData);
      if (!linkResult.success) {
        app.log.error(`[auth/telegram] Link failed: ${linkResult.error}`);
        return reply.type("text/html").status(500).send(authErrorPage(linkResult.error || "Link failed"));
      }

      app.log.info(
        `[auth/telegram] Linked: telegram_${authData.id} -> ${authData.username || authData.first_name}`,
      );

      // Award verification points
      core
        .awardPoints(`telegram_${authData.id}`, "telegram", "verification_complete")
        .catch(() => {});

      return reply.type("text/html").send(authSuccessPage(authData.first_name));
    },
  );

  // Serves the connect page with the Telegram Login Widget embedded
  app.get("/connect", async (request, reply) => {
    const botUsername = process.env.FLOWB_BOT_USERNAME || "Flow_B_bot";
    const callbackUrl = process.env.FLOWB_AUTH_CALLBACK_URL || `${request.protocol}://${request.hostname}/auth/telegram`;
    return reply.type("text/html").send(connectPage(botUsername, callbackUrl));
  });

  return app;
}

// ==========================================================================
// HTML pages (minimal, no deps)
// ==========================================================================

function connectPage(botUsername: string, callbackUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connect to FlowB</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #f5f5f5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 16px;
      padding: 40px;
      max-width: 400px;
      text-align: center;
    }
    .logo { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    p { color: #999; margin-bottom: 24px; line-height: 1.5; }
    .widget { margin: 24px 0; }
    .perks { text-align: left; margin: 20px 0; }
    .perks li {
      color: #ccc;
      padding: 6px 0;
      list-style: none;
    }
    .perks li::before { content: "\\2713 "; color: #22c55e; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">&#x1f916;</div>
    <h1>Connect to FlowB</h1>
    <p>Link your Telegram account to unlock the full experience.</p>
    <ul class="perks">
      <li>Earn points for every interaction</li>
      <li>Track streaks and unlock rewards</li>
      <li>Save events and get recommendations</li>
      <li>Claim USDC rewards</li>
    </ul>
    <div class="widget">
      <script async src="https://telegram.org/js/telegram-widget.js?22"
        data-telegram-login="${botUsername}"
        data-size="large"
        data-radius="8"
        data-auth-url="${callbackUrl}"
        data-request-access="write"></script>
    </div>
    <p style="font-size: 12px; color: #666;">
      Your Telegram info is verified cryptographically. We only store your ID and username.
    </p>
  </div>
</body>
</html>`;
}

function authSuccessPage(firstName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connected!</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #f5f5f5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 16px;
      padding: 40px;
      max-width: 400px;
      text-align: center;
    }
    .check { font-size: 64px; margin-bottom: 16px; }
    h1 { font-size: 24px; margin-bottom: 8px; color: #22c55e; }
    p { color: #999; margin-bottom: 24px; line-height: 1.5; }
    a {
      display: inline-block;
      background: #2563eb;
      color: white;
      padding: 12px 32px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">&#x2705;</div>
    <h1>You're connected!</h1>
    <p>Welcome, <strong>${firstName}</strong>! Your Telegram account is now linked. Head back to the bot to start earning points.</p>
    <a href="https://t.me/Flow_B_bot">Open FlowB Bot</a>
  </div>
</body>
</html>`;
}

function authErrorPage(error: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connection Failed</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #f5f5f5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 16px;
      padding: 40px;
      max-width: 400px;
      text-align: center;
    }
    h1 { font-size: 24px; margin-bottom: 8px; color: #ef4444; }
    p { color: #999; margin-bottom: 24px; line-height: 1.5; }
    a {
      display: inline-block;
      background: #333;
      color: white;
      padding: 12px 32px;
      border-radius: 8px;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Connection Failed</h1>
    <p>${error}</p>
    <a href="https://t.me/Flow_B_bot">Try again in the bot</a>
  </div>
</body>
</html>`;
}
