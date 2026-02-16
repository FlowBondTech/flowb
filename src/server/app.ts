import Fastify from "fastify";
import cors from "@fastify/cors";
import type { FlowBCore } from "../core/flowb.js";
import type { ToolInput } from "../core/types.js";
import {
  verifyTelegramAuth,
  parseTelegramAuthParams,
} from "../services/telegram-auth.js";
import { registerMiniAppRoutes } from "./routes.js";
import { processEventQueue, postDailyDigest, postEveningHighlight } from "../services/farcaster-poster.js";
import { scanForNewEvents } from "../services/event-scanner.js";

export function buildApp(core: FlowBCore) {
  const app = Fastify({ logger: true });

  app.register(cors);

  // Register mini app API routes (auth, events, flow, notifications)
  registerMiniAppRoutes(app, core);

  // ==========================================================================
  // Scheduled Tasks: Farcaster Poster + Event Scanner
  // ==========================================================================

  const supabaseUrl = process.env.DANZ_SUPABASE_URL;
  const supabaseKey = process.env.DANZ_SUPABASE_KEY;

  if (supabaseUrl && supabaseKey) {
    // Event queue processor: every 15 minutes
    setInterval(() => {
      processEventQueue(supabaseUrl, supabaseKey).catch((err) =>
        console.error("[scheduler] Event queue error:", err),
      );
    }, 15 * 60 * 1000);

    // Event scanner: every 4 hours
    setInterval(() => {
      scanForNewEvents(
        { supabaseUrl, supabaseKey },
        (opts) => core.discoverEventsRaw(opts),
      ).catch((err) => console.error("[scheduler] Event scanner error:", err));
    }, 4 * 60 * 60 * 1000);

    // Run initial scan after 30s startup delay
    setTimeout(() => {
      scanForNewEvents(
        { supabaseUrl, supabaseKey },
        (opts) => core.discoverEventsRaw(opts),
      ).catch((err) => console.error("[scheduler] Initial scan error:", err));
    }, 30_000);

    // Time-based casts: check every minute for 9am and 5pm MST
    const firedToday = { morning: "", evening: "" };

    setInterval(async () => {
      try {
        const now = new Date();
        const mstStr = now.toLocaleString("en-US", { timeZone: "America/Denver", hour12: false });
        const parts = mstStr.split(",")[1]?.trim().split(":");
        if (!parts) return;

        const hour = parseInt(parts[0], 10);
        const minute = parseInt(parts[1], 10);
        const dateKey = now.toISOString().slice(0, 10);

        // Morning digest at 9:00 AM MST
        if (hour === 9 && minute < 2 && firedToday.morning !== dateKey) {
          firedToday.morning = dateKey;
          console.log("[scheduler] Firing morning digest");

          const events = await core.discoverEventsRaw({ action: "events", city: "Denver" });
          // Filter to today's events
          const todayStart = new Date(now);
          todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date(todayStart);
          todayEnd.setDate(todayEnd.getDate() + 1);

          const todayEvents = events.filter((e) => {
            const t = new Date(e.startTime).getTime();
            return t >= todayStart.getTime() && t < todayEnd.getTime();
          });

          if (todayEvents.length > 0) {
            const topEvents = todayEvents.slice(0, 5).map((e) => ({
              title: e.title,
              time: new Date(e.startTime).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: "America/Denver",
              }),
            }));
            await postDailyDigest(todayEvents.length, topEvents);
          }
        }

        // Evening highlight at 5:00 PM MST
        if (hour === 17 && minute < 2 && firedToday.evening !== dateKey) {
          firedToday.evening = dateKey;
          console.log("[scheduler] Firing evening highlight");

          const events = await core.discoverEventsRaw({ action: "events", city: "Denver" });
          // Filter to events starting in the next 6 hours (5pm - 11pm)
          const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
          const eveningEvents = events.filter((e) => {
            const t = new Date(e.startTime).getTime();
            return t >= now.getTime() && t <= sixHoursFromNow.getTime();
          });

          if (eveningEvents.length > 0) {
            const picks = eveningEvents.slice(0, 3).map((e) => ({
              title: e.title,
              venue: e.locationName,
            }));
            await postEveningHighlight(picks);
          }
        }
      } catch (err) {
        console.error("[scheduler] Time-based cast error:", err);
      }
    }, 60 * 1000);

    console.log("[scheduler] Farcaster poster + event scanner scheduled");
  } else {
    console.log("[scheduler] Supabase not configured, skipping scheduled tasks");
  }

  // ==========================================================================
  // Public API: Live stats (no auth required)
  // NOTE: Leaderboard route moved to routes.ts (uses core.getGlobalCrewRanking)
  // ==========================================================================

  app.get(
    "/api/v1/stats",
    async () => {
      if (!supabaseUrl || !supabaseKey) {
        return { crewsActive: 0, totalPoints: 0, checkinsToday: 0 };
      }

      try {
        // Count active crews
        const crewsRes = await fetch(
          `${supabaseUrl}/rest/v1/flowb_groups?select=id&limit=1000`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              Prefer: "count=exact",
            },
          },
        );
        const crewCount = parseInt(crewsRes.headers.get("content-range")?.split("/")[1] || "0", 10);

        // Sum total points
        const pointsRes = await fetch(
          `${supabaseUrl}/rest/v1/flowb_user_points?select=total_points`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          },
        );
        const pointsRows = pointsRes.ok ? await pointsRes.json() : [];
        const totalPoints = (pointsRows || []).reduce(
          (sum: number, r: any) => sum + (r.total_points || 0),
          0,
        );

        // Count checkins today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const checkinsRes = await fetch(
          `${supabaseUrl}/rest/v1/flowb_checkins?created_at=gte.${todayStart.toISOString()}&select=id&limit=1000`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              Prefer: "count=exact",
            },
          },
        );
        const checkinCount = parseInt(
          checkinsRes.headers.get("content-range")?.split("/")[1] || "0",
          10,
        );

        return {
          crewsActive: crewCount || 0,
          totalPoints: totalPoints || 0,
          checkinsToday: checkinCount || 0,
        };
      } catch (err) {
        console.error("[stats] Error:", err);
        return { crewsActive: 0, totalPoints: 0, checkinsToday: 0 };
      }
    },
  );

  // ==========================================================================
  // Admin Endpoints
  // ==========================================================================

  app.post<{ Body: { text: string; embeds?: { url: string }[] } }>(
    "/api/v1/admin/cast",
    async (request, reply) => {
      const adminKey = process.env.FLOWB_ADMIN_KEY;
      if (!adminKey || request.headers["x-admin-key"] !== adminKey) {
        return reply.status(403).send({ error: "Unauthorized" });
      }

      const { text, embeds } = request.body || {};
      if (!text) {
        return reply.status(400).send({ error: "Missing text" });
      }

      const signerUuid = process.env.NEYNAR_AGENT_TOKEN;
      const apiKey = process.env.NEYNAR_API_KEY;
      if (!signerUuid || !apiKey) {
        return reply.status(500).send({ error: "NEYNAR_AGENT_TOKEN or NEYNAR_API_KEY not set" });
      }

      try {
        const res = await fetch("https://api.neynar.com/v2/farcaster/cast", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            signer_uuid: signerUuid,
            text,
            embeds: embeds || [],
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          return reply.status(res.status).send({ error: `Neynar error: ${errText}` });
        }

        const result = await res.json();
        return { ok: true, cast: result };
      } catch (err: any) {
        return reply.status(500).send({ error: err.message });
      }
    },
  );

  app.post(
    "/api/v1/admin/scan-events",
    async (request, reply) => {
      const adminKey = process.env.FLOWB_ADMIN_KEY;
      if (!adminKey || request.headers["x-admin-key"] !== adminKey) {
        return reply.status(403).send({ error: "Unauthorized" });
      }

      if (!supabaseUrl || !supabaseKey) {
        return reply.status(500).send({ error: "Supabase not configured" });
      }

      const result = await scanForNewEvents(
        { supabaseUrl, supabaseKey },
        (opts) => core.discoverEventsRaw(opts),
      );

      return { ok: true, ...result };
    },
  );

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
      const botUsername = process.env.FLOWB_BOT_USERNAME || "flow_b_bot";
      if (!botToken) {
        return reply.status(500).send({ error: "Bot token not configured" });
      }

      const params = request.query;
      const authData = parseTelegramAuthParams(params);

      // Verify HMAC-SHA-256
      const { valid, error } = verifyTelegramAuth(authData, botToken);
      if (!valid) {
        app.log.warn(`[auth/telegram] Verification failed: ${error}`);
        return reply.type("text/html").status(403).send(authErrorPage(error || "Verification failed", botUsername));
      }

      // Store the Telegram<->DANZ link
      const linkResult = await core.linkTelegramUser(authData);
      if (!linkResult.success) {
        app.log.error(`[auth/telegram] Link failed: ${linkResult.error}`);
        return reply.type("text/html").status(500).send(authErrorPage(linkResult.error || "Link failed", botUsername));
      }

      app.log.info(
        `[auth/telegram] Linked: telegram_${authData.id} -> ${authData.username || authData.first_name}`,
      );

      // Award verification points
      core
        .awardPoints(`telegram_${authData.id}`, "telegram", "verification_complete")
        .catch(() => {});

      return reply.type("text/html").send(authSuccessPage(authData.first_name, botUsername));
    },
  );

  // Serves the connect page with the Telegram Login Widget embedded
  app.get("/connect", async (request, reply) => {
    const botUsername = process.env.FLOWB_BOT_USERNAME || "flow_b_bot";
    const callbackUrl = process.env.FLOWB_AUTH_CALLBACK_URL || `${request.protocol}://${request.hostname}/auth/telegram`;
    return reply.type("text/html").send(connectPage(botUsername, callbackUrl));
  });

  // ==========================================================================
  // Smart Event Short Links (flowb.me/e/{id})
  //
  // UA-based platform detection:
  //   - Telegram in-app browser -> redirect to tg:// mini app deep link
  //   - Farcaster/Warpcast      -> redirect to Farcaster mini app URL
  //   - Otherwise               -> redirect to flowb.me web with event context
  // ==========================================================================

  app.get<{ Params: { id: string } }>(
    "/e/:id",
    async (request, reply) => {
      const { id } = request.params;
      const ua = (request.headers["user-agent"] || "").toLowerCase();

      const botUser = process.env.FLOWB_BOT_USERNAME || "flow_b_bot";
      const webUrl = process.env.FLOWB_WEB_URL || "https://flowb.me";
      const fcMiniAppUrl = process.env.FLOWB_FC_MINIAPP_URL || "https://flowb-fc.netlify.app";

      // Telegram in-app browser detection
      // Telegram WebView includes "Telegram" or "TelegramBot" in the UA
      if (ua.includes("telegram") || ua.includes("tgweb")) {
        const tgUrl = `https://t.me/${botUser}/flowb?startapp=event_${id}`;
        return reply.redirect(tgUrl);
      }

      // Farcaster / Warpcast detection
      if (ua.includes("warpcast") || ua.includes("farcaster")) {
        const fcUrl = `${fcMiniAppUrl}?event=${encodeURIComponent(id)}`;
        return reply.redirect(fcUrl);
      }

      // Default: redirect to web app with event context
      const eventWebUrl = `${webUrl}?event=${encodeURIComponent(id)}`;
      return reply.redirect(eventWebUrl);
    },
  );

  // ==========================================================================
  // Short link redirects (flowb.me/f/{code} -> t.me deep link)
  //
  // These let us share clean URLs like flowb.me/f/abc123 or flowb.me/ref/xyz
  // that redirect to the Telegram bot deep link.
  // ==========================================================================

  const deepLinkPrefixes: Record<string, string> = {
    f: "f",      // personal flow invite
    g: "g",      // crew join code
    gi: "gi",    // personal tracked crew invite
    ref: "ref",  // referral
  };

  for (const [path, prefix] of Object.entries(deepLinkPrefixes)) {
    app.get<{ Params: { code: string } }>(
      `/${path}/:code`,
      async (request, reply) => {
        const botUser = process.env.FLOWB_BOT_USERNAME || "flow_b_bot";
        const code = request.params.code;
        const telegramUrl = `https://t.me/${botUser}?start=${prefix}_${code}`;
        return reply.redirect(telegramUrl);
      },
    );
  }

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

function authSuccessPage(firstName: string, botUsername: string): string {
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
    <a href="https://t.me/${botUsername}">Open FlowB Bot</a>
  </div>
</body>
</html>`;
}

function authErrorPage(error: string, botUsername: string): string {
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
    <a href="https://t.me/${botUsername}">Try again in the bot</a>
  </div>
</body>
</html>`;
}
