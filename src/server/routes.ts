/**
 * Mini App API Routes
 *
 * All routes prefixed with /api/v1/ and requiring auth use the JWT middleware.
 * Auth endpoints issue JWTs for Telegram and Farcaster users.
 */

import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { FlowBCore } from "../core/flowb.js";
import type { FlowPluginConfig } from "../plugins/flow/index.js";
import {
  authMiddleware,
  validateInitData,
  validateFarcasterSignIn,
  signJwt,
  verifyJwt,
  type JWTPayload,
} from "./auth.js";
import { getOrCreateSupabaseUser, verifySupabaseToken } from "../services/supabase-auth.js";
import { isSupabaseAuthEnabled, isPrivyEnabled } from "../config.js";
import {
  upsertNotificationToken,
  disableNotificationToken,
} from "../services/farcaster-notify.js";
import {
  notifyFriendRsvp,
  notifyCrewMemberRsvp,
  notifyCrewJoin,
  notifyCrewCheckin,
  notifyCrewLocate,
  notifyCrewMessage,
  notifyMeetingChat,
  notifyMeetingInvite,
} from "../services/notifications.js";
import { sendWelcomeEmail, sendEmail, resolveUserEmail, wrapInTemplate, escHtml } from "../services/email.js";
import { handleChat, type UserContext } from "../services/ai-chat.js";
import {
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
} from "@farcaster/miniapp-node";
import { resolveCanonicalId, getLinkedIds } from "../services/identity.js";
import { sbFetch, sbPost, sbInsert, sbPatch, sbPatchRaw, sbQuery, sbDelete, type SbConfig } from "../utils/supabase.js";
import { log, fireAndForget } from "../utils/logger.js";
import { alertAdmins, alertNewEvents } from "../services/admin-alerts.js";
import { scanForNewEvents, type ScanResult } from "../services/event-scanner.js";
import { registerAgentRoutes } from "./agent-routes.js";
import { registerFiFlowRoutes } from "./fiflow-routes.js";
import { registerPaymentRoutes } from "./payment-routes.js";
import {
  createProject, listProjects, getProject, updateProject, deleteProject,
  testConnection, getActivityLog, createWebhook, listWebhooks, logActivity,
  dispatchWebhook, type BizProject,
} from "../plugins/websites/index.js";


// ============================================================================
// Route Registration
// ============================================================================

export function registerMiniAppRoutes(app: FastifyInstance, core: FlowBCore) {
  const flowPlugin = core.getFlowPlugin();
  const flowCfg = core.getFlowConfig();

  // ------------------------------------------------------------------
  // AUTH: Telegram Mini App
  // ------------------------------------------------------------------
  app.post<{ Body: { initData: string } }>(
    "/api/v1/auth/telegram",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        body: { type: "object", required: ["initData"], properties: { initData: { type: "string" } } },
      },
    },
    async (request, reply) => {
      const botToken = process.env.FLOWB_TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return reply.status(500).send({ error: "Bot token not configured" });
      }

      const { initData } = request.body || {};
      if (!initData) {
        return reply.status(400).send({ error: "Missing initData" });
      }

      const result = validateInitData(initData, botToken);
      if (!result.valid) {
        return reply.status(401).send({ error: result.error });
      }

      const { user } = result;
      const userId = `telegram_${user.id}`;

      // Ensure user exists in points table
      fireAndForget(core.awardPoints(userId, "telegram", "miniapp_open"), "award points");

      // Store display name in sessions for leaderboard/member resolution
      const displayName = user.first_name || user.username || `User ${user.id}`;
      const cfg = getSupabaseConfig();
      if (cfg) {
        fireAndForget(sbPost(cfg, "flowb_sessions?on_conflict=user_id", {
          user_id: userId,
          display_name: displayName,
        }, "return=minimal,resolution=merge-duplicates"), "upsert session");
      }

      // Look up locale from session or fallback to Telegram language_code
      let locale = user.language_code || 'en';
      let isNewTgUser = true;
      let onboardingComplete = false;
      if (cfg) {
        const sessions = await sbFetch<any[]>(cfg, `flowb_sessions?user_id=eq.${userId}&select=locale,created_at,onboarding_complete&limit=1`);
        if (sessions?.[0]?.locale) locale = sessions[0].locale;
        if (sessions?.[0]?.onboarding_complete) onboardingComplete = true;
        // If session was created more than 60s ago, it's a returning user
        if (sessions?.[0]?.created_at) {
          const created = new Date(sessions[0].created_at).getTime();
          if (Date.now() - created > 60_000) isNewTgUser = false;
        }
      }

      if (isNewTgUser) {
        const who = user.username
          ? `<a href="https://t.me/${user.username}">@${user.username}</a>`
          : user.first_name || `User ${user.id}`;
        alertAdmins(`New user: <b>${who}</b> on telegram`, "info");
      }

      // Create/link Supabase Auth user (FlowB Passport)
      let supabaseUid: string | undefined;
      if (isSupabaseAuthEnabled()) {
        const sbUser = await getOrCreateSupabaseUser(userId, "telegram", {
          displayName,
        });
        if (sbUser) supabaseUid = sbUser.uid;
      }

      const token = signJwt({
        sub: userId,
        platform: "telegram",
        tg_id: user.id,
        username: user.username,
        ...(supabaseUid ? { supabase_uid: supabaseUid } : {}),
      });

      return {
        token,
        locale,
        onboarding_complete: onboardingComplete,
        user: {
          id: userId,
          platform: "telegram",
          tg_id: user.id,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          photoUrl: user.photo_url,
          ...(supabaseUid ? { supabase_uid: supabaseUid } : {}),
        },
      };
    },
  );

  // ------------------------------------------------------------------
  // AUTH: Farcaster Mini App (Quick Auth + legacy SIWF fallback)
  // ------------------------------------------------------------------
  app.post<{ Body: { quickAuthToken?: string; message?: string; signature?: string } }>(
    "/api/v1/auth/farcaster",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          properties: {
            quickAuthToken: { type: "string" },
            message: { type: "string" },
            signature: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { quickAuthToken, message, signature } = request.body || {};

      // --- Quick Auth path (recommended) ---
      if (quickAuthToken) {
        try {
          const { createClient } = await import("@farcaster/quick-auth");
          const qaClient = createClient();
          const payload = await qaClient.verifyJwt({
            token: quickAuthToken,
            domain: process.env.FARCASTER_APP_DOMAIN || "flowb-farcaster.netlify.app",
          });

          const fid = typeof payload.sub === "string" ? parseInt(payload.sub, 10) : payload.sub;
          if (!fid || isNaN(fid)) {
            return reply.status(401).send({ error: "Invalid Quick Auth token: no FID" });
          }

          const userId = `farcaster_${fid}`;
          fireAndForget(core.awardPoints(userId, "farcaster", "miniapp_open"), "award points");

          // Look up username from Neynar if available
          let username: string | undefined;
          let displayName: string | undefined;
          let pfpUrl: string | undefined;
          const neynarKey = process.env.NEYNAR_API_KEY;
          if (neynarKey) {
            try {
              const res = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
                headers: { "x-api-key": neynarKey },
              });
              if (res.ok) {
                const data = await res.json() as any;
                const u = data?.users?.[0];
                if (u) {
                  username = u.username;
                  displayName = u.display_name;
                  pfpUrl = u.pfp_url;
                }
              }
            } catch {}
          }

          // Check for existing Privy account linked to this FID
          let privyUserId: string | undefined;
          const privyAppId = process.env.PRIVY_APP_ID;
          const privyAppSecret = process.env.PRIVY_APP_SECRET;
          if (privyAppId && privyAppSecret) {
            try {
              const credentials = Buffer.from(`${privyAppId}:${privyAppSecret}`).toString("base64");
              const privyRes = await fetch(`https://auth.privy.io/api/v2/users/farcaster:${fid}`, {
                headers: {
                  Authorization: `Basic ${credentials}`,
                  "privy-app-id": privyAppId,
                  "Content-Type": "application/json",
                },
              });
              if (privyRes.ok) {
                const privyUser = await privyRes.json() as any;
                privyUserId = privyUser?.id;
                console.log(`[auth] Linked Farcaster FID ${fid} to Privy user ${privyUserId}`);
              }
            } catch {}
          }

          // Look up locale + onboarding from session
          let locale = 'en';
          let onboardingComplete = false;
          const fcCfg = getSupabaseConfig();
          if (fcCfg) {
            const sessions = await sbFetch<any[]>(fcCfg, `flowb_sessions?user_id=eq.${userId}&select=locale,onboarding_complete&limit=1`);
            if (sessions?.[0]?.locale) locale = sessions[0].locale;
            if (sessions?.[0]?.onboarding_complete) onboardingComplete = true;
          }

          // Upsert session row for Farcaster users
          {
            const fcCfgSession = getSupabaseConfig();
            if (fcCfgSession) {
              fireAndForget(sbPost(fcCfgSession, "flowb_sessions?on_conflict=user_id", {
                user_id: userId,
                display_name: displayName || username || `FID ${fid}`,
              }, "return=minimal,resolution=merge-duplicates"), "upsert fc session");
            }
          }

          // Alert admins for new Farcaster users
          {
            const fcCfgAlert = getSupabaseConfig();
            let isNewFcUser = true;
            if (fcCfgAlert) {
              const existing = await sbFetch<any[]>(fcCfgAlert, `flowb_sessions?user_id=eq.${userId}&select=created_at&limit=1`);
              if (existing?.[0]?.created_at) {
                const created = new Date(existing[0].created_at).getTime();
                if (Date.now() - created > 60_000) isNewFcUser = false;
              }
            }
            if (isNewFcUser) {
              const who = username
                ? `<a href="https://warpcast.com/${username}">@${username}</a>`
                : displayName || `FID ${fid}`;
              alertAdmins(`New user: <b>${who}</b> on farcaster`, "info");
            }
          }

          // Create/link Supabase Auth user (FlowB Passport)
          let supabaseUid: string | undefined;
          if (isSupabaseAuthEnabled()) {
            const sbUser = await getOrCreateSupabaseUser(userId, "farcaster", {
              displayName: displayName || username,
              avatarUrl: pfpUrl,
            });
            if (sbUser) supabaseUid = sbUser.uid;
          }

          const token = signJwt({
            sub: userId,
            platform: "farcaster",
            fid,
            username,
            ...(privyUserId ? { privyUserId } : {}),
            ...(supabaseUid ? { supabase_uid: supabaseUid } : {}),
          });

          return {
            token,
            locale,
            onboarding_complete: onboardingComplete,
            user: {
              id: userId,
              platform: "farcaster",
              fid,
              username,
              displayName,
              pfpUrl,
              ...(privyUserId ? { privyUserId } : {}),
              ...(supabaseUid ? { supabase_uid: supabaseUid } : {}),
            },
          };
        } catch (err: any) {
          return reply.status(401).send({ error: `Quick Auth failed: ${err.message}` });
        }
      }

      // --- Legacy SIWF path (fallback) ---
      const neynarKey = process.env.NEYNAR_API_KEY;
      if (!message || !signature) {
        return reply.status(400).send({ error: "Missing quickAuthToken or message/signature" });
      }

      const result = await validateFarcasterSignIn(message, signature, neynarKey);
      if (!result.valid) {
        return reply.status(401).send({ error: result.error });
      }

      const { user } = result;
      const userId = `farcaster_${user.fid}`;

      fireAndForget(core.awardPoints(userId, "farcaster", "miniapp_open"), "award points");

      // Look up locale + onboarding from session
      let fcLegacyLocale = 'en';
      let fcLegacyOnboarded = false;
      const fcLegacyCfg = getSupabaseConfig();
      if (fcLegacyCfg) {
        const sessions = await sbFetch<any[]>(fcLegacyCfg, `flowb_sessions?user_id=eq.${userId}&select=locale,onboarding_complete&limit=1`);
        if (sessions?.[0]?.locale) fcLegacyLocale = sessions[0].locale;
        if (sessions?.[0]?.onboarding_complete) fcLegacyOnboarded = true;
      }

      // Create/link Supabase Auth user (FlowB Passport)
      let legacyFcSupabaseUid: string | undefined;
      if (isSupabaseAuthEnabled()) {
        const sbUser = await getOrCreateSupabaseUser(userId, "farcaster", {
          displayName: user.displayName || user.username,
          avatarUrl: user.pfpUrl,
        });
        if (sbUser) legacyFcSupabaseUid = sbUser.uid;
      }

      const token = signJwt({
        sub: userId,
        platform: "farcaster",
        fid: user.fid,
        username: user.username,
        ...(legacyFcSupabaseUid ? { supabase_uid: legacyFcSupabaseUid } : {}),
      });

      return {
        token,
        locale: fcLegacyLocale,
        onboarding_complete: fcLegacyOnboarded,
        user: {
          id: userId,
          platform: "farcaster",
          fid: user.fid,
          username: user.username,
          displayName: user.displayName,
          pfpUrl: user.pfpUrl,
          ...(legacyFcSupabaseUid ? { supabase_uid: legacyFcSupabaseUid } : {}),
        },
      };
    },
  );

  // ------------------------------------------------------------------
  // AUTH: Native App (hardcoded demo users)
  // ------------------------------------------------------------------
  app.post<{ Body: { username: string; password: string } }>(
    "/api/v1/auth/app",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          required: ["username", "password"],
          properties: { username: { type: "string" }, password: { type: "string" } },
        },
      },
    },
    async (request, reply) => {
      const { username, password } = request.body || {};
      if (!username || !password) {
        return reply.status(400).send({ error: "Missing username or password" });
      }

      // Demo users: read from env or use defaults in non-production
      const appUsers: Record<string, { password: string; role: "admin" | "user"; userId: string }> =
        process.env.FLOWB_APP_USERS
          ? JSON.parse(process.env.FLOWB_APP_USERS)
          : process.env.NODE_ENV === "production"
            ? {}
            : {
                admin: { password: "admin", role: "admin", userId: "app_admin" },
                user: { password: "user", role: "user", userId: "app_user" },
                user1: { password: "user1", role: "user", userId: "app_user1" },
              };

      const entry = appUsers[username];
      if (!entry || entry.password !== password) {
        return reply.status(401).send({ error: "Invalid credentials" });
      }

      fireAndForget(core.awardPoints(entry.userId, "app", "miniapp_open"), "award points");

      const token = signJwt({
        sub: entry.userId,
        platform: "app",
        username,
      });

      const result: any = {
        token,
        user: {
          id: entry.userId,
          platform: "app",
          username,
          role: entry.role,
        },
      };

      return result;
    },
  );

  // ------------------------------------------------------------------
  // AUTH: Web (Privy legacy + Supabase Auth dual mode)
  // Accepts { privyUserId } (legacy) OR { supabaseAccessToken } (new)
  // ------------------------------------------------------------------
  app.post<{ Body: { privyUserId?: string; supabaseAccessToken?: string; displayName?: string } }>(
    "/api/v1/auth/web",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          properties: {
            privyUserId: { type: "string" },
            supabaseAccessToken: { type: "string" },
            displayName: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { privyUserId, supabaseAccessToken, displayName } = request.body || {};

      // --- New Supabase Auth path ---
      if (supabaseAccessToken && isSupabaseAuthEnabled()) {
        const verified = await verifySupabaseToken(supabaseAccessToken);
        if (!verified) {
          return reply.status(401).send({ error: "Invalid Supabase Auth token" });
        }
        // Redirect to passport endpoint logic
        const passportRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/v1/auth/passport`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: supabaseAccessToken, displayName }),
        });
        if (!passportRes.ok) {
          return reply.status(passportRes.status).send(await passportRes.json());
        }
        return passportRes.json();
      }

      // --- Legacy Privy path ---
      if (!privyUserId) {
        return reply.status(400).send({ error: "Missing privyUserId or supabaseAccessToken" });
      }

      if (!isPrivyEnabled()) {
        return reply.status(503).send({ error: "Privy auth is disabled. Use /api/v1/auth/passport instead." });
      }

      const userId = `web_${privyUserId}`;

      // Ensure user exists in points table
      fireAndForget(core.awardPoints(userId, "web", "miniapp_open"), "award points");

      // Auto-resolve cross-platform identity on web login
      const cfg = getSupabaseConfig();
      if (cfg) {
        try {
          await resolveCanonicalId(cfg, userId, { displayName: displayName || undefined });
        } catch {}
      }

      // Upsert session row for web users
      {
        const webCfgSession = getSupabaseConfig();
        if (webCfgSession) {
          fireAndForget(sbPost(webCfgSession, "flowb_sessions?on_conflict=user_id", {
            user_id: userId,
            display_name: displayName || privyUserId,
          }, "return=minimal,resolution=merge-duplicates"), "upsert web session");
        }
      }

      // Alert admins for new web users
      {
        const webCfg = getSupabaseConfig();
        let isNewWebUser = true;
        if (webCfg) {
          const existing = await sbFetch<any[]>(webCfg, `flowb_sessions?user_id=eq.${userId}&select=created_at&limit=1`);
          if (existing?.[0]?.created_at) {
            const created = new Date(existing[0].created_at).getTime();
            if (Date.now() - created > 60_000) isNewWebUser = false;
          }
        }
        if (isNewWebUser) {
          const who = displayName || privyUserId;
          alertAdmins(`New user: <b>${who}</b> on web`, "info");
        }
      }

      // Create/link Supabase Auth user in dual mode
      let supabaseUid: string | undefined;
      if (isSupabaseAuthEnabled()) {
        const sbUser = await getOrCreateSupabaseUser(userId, "web", {
          displayName: displayName || undefined,
        });
        if (sbUser) supabaseUid = sbUser.uid;
      }

      const token = signJwt({
        sub: userId,
        platform: "web" as any,
        username: displayName || "User",
        ...(supabaseUid ? { supabase_uid: supabaseUid } : {}),
      });

      return {
        token,
        user: {
          id: userId,
          platform: "web",
          username: displayName,
          ...(supabaseUid ? { supabase_uid: supabaseUid } : {}),
        },
      };
    },
  );

  // ------------------------------------------------------------------
  // AUTH: Privy (Mobile) — verify Privy access token, issue FlowB JWT
  // ------------------------------------------------------------------
  app.post<{ Body: { privyAccessToken: string; displayName?: string; email?: string } }>(
    "/api/v1/auth/privy",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          required: ["privyAccessToken"],
          properties: {
            privyAccessToken: { type: "string" },
            displayName: { type: "string" },
            email: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { privyAccessToken, displayName, email } = request.body || {};
      if (!privyAccessToken) {
        return reply.status(400).send({ error: "Missing privyAccessToken" });
      }

      const privyAppId = process.env.PRIVY_APP_ID;
      const privyAppSecret = process.env.PRIVY_APP_SECRET;
      if (!privyAppId || !privyAppSecret) {
        return reply.status(500).send({ error: "Privy not configured" });
      }

      // Verify the access token with Privy's API
      let privyUserId: string;
      try {
        const credentials = Buffer.from(`${privyAppId}:${privyAppSecret}`).toString("base64");
        const verifyRes = await fetch("https://auth.privy.io/api/v1/token/verify", {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "privy-app-id": privyAppId,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: privyAccessToken }),
        });

        if (!verifyRes.ok) {
          const errText = await verifyRes.text().catch(() => "");
          log.warn("[auth/privy]", `Token verification failed: ${verifyRes.status}`, { errText });
          return reply.status(401).send({ error: "Invalid Privy token" });
        }

        const verifyData = await verifyRes.json() as any;
        privyUserId = verifyData.user_id || verifyData.sub;
        if (!privyUserId) {
          return reply.status(401).send({ error: "Could not extract user ID from Privy token" });
        }
      } catch (err: any) {
        log.error("[auth/privy]", "Token verification error", { error: err.message });
        return reply.status(500).send({ error: "Privy verification failed" });
      }

      const userId = `web_${privyUserId}`;

      // Ensure user exists in points table
      fireAndForget(core.awardPoints(userId, "app", "miniapp_open"), "award points");

      // Upsert session
      const cfg = getSupabaseConfig();
      if (cfg) {
        const sessionData: any = {
          user_id: userId,
          display_name: displayName || privyUserId,
        };
        if (email) sessionData.email = email;
        fireAndForget(sbPost(cfg, "flowb_sessions?on_conflict=user_id", sessionData,
          "return=minimal,resolution=merge-duplicates"), "upsert privy session");
      }

      // Resolve cross-platform identity
      if (cfg) {
        try {
          await resolveCanonicalId(cfg, userId, { displayName: displayName || undefined });
        } catch {}
      }

      const token = signJwt({
        sub: userId,
        platform: "app" as any,
        username: displayName || "User",
      });

      return {
        token,
        user: {
          id: userId,
          platform: "app",
          username: displayName || email || "User",
          displayName: displayName || email || "User",
        },
      };
    },
  );

  // ------------------------------------------------------------------
  // AUTH: WhatsApp Mini App (HMAC-based phone verification)
  // Bot sends CTA URL: wa.flowb.me?phone={phone}&ts={timestamp}&sig={hmac}
  // ------------------------------------------------------------------
  app.post<{ Body: { phone: string; ts: string; sig: string } }>(
    "/api/v1/auth/whatsapp",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          required: ["phone", "ts", "sig"],
          properties: {
            phone: { type: "string" },
            ts: { type: "string" },
            sig: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { phone, ts, sig } = request.body;

      // Verify HMAC signature
      const secret = process.env.WHATSAPP_APP_SECRET || process.env.FLOWB_JWT_SECRET || "";
      if (!secret) {
        return reply.status(500).send({ error: "WhatsApp auth not configured" });
      }

      const crypto = await import("node:crypto");
      const expectedSig = crypto.createHmac("sha256", secret)
        .update(`${phone}:${ts}`)
        .digest("hex");

      if (sig !== expectedSig) {
        return reply.status(401).send({ error: "Invalid signature" });
      }

      // Check timestamp freshness (5 minute window)
      const tsNum = parseInt(ts, 10);
      if (isNaN(tsNum) || Math.abs(Date.now() - tsNum) > 5 * 60 * 1000) {
        return reply.status(401).send({ error: "Link expired" });
      }

      const userId = `whatsapp_${phone}`;

      // Ensure user in points table
      fireAndForget(core.awardPoints(userId, "whatsapp", "miniapp_open"), "award points");

      // Upsert session
      const cfg = getSupabaseConfig();
      if (cfg) {
        fireAndForget(sbPost(cfg, "flowb_sessions?on_conflict=user_id", {
          user_id: userId,
          wa_profile_name: phone,
        }, "return=minimal,resolution=merge-duplicates"), "upsert wa session");
      }

      // Create/link Supabase Auth user (FlowB Passport)
      let waSupabaseUid: string | undefined;
      if (isSupabaseAuthEnabled()) {
        const sbUser = await getOrCreateSupabaseUser(userId, "whatsapp");
        if (sbUser) waSupabaseUid = sbUser.uid;
      }

      const token = signJwt({
        sub: userId,
        platform: "whatsapp",
        username: phone,
        ...(waSupabaseUid ? { supabase_uid: waSupabaseUid } : {}),
      });

      return {
        token,
        user: {
          id: userId,
          platform: "whatsapp",
          username: phone,
          ...(waSupabaseUid ? { supabase_uid: waSupabaseUid } : {}),
        },
      };
    },
  );

  // ------------------------------------------------------------------
  // AUTH: Signal Mini App (HMAC-based, same pattern as WhatsApp)
  // ------------------------------------------------------------------
  app.post<{ Body: { phone: string; ts: string; sig: string } }>(
    "/api/v1/auth/signal",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          required: ["phone", "ts", "sig"],
          properties: {
            phone: { type: "string" },
            ts: { type: "string" },
            sig: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { phone, ts, sig } = request.body;

      const secret = process.env.SIGNAL_WEBHOOK_SECRET || process.env.FLOWB_JWT_SECRET || "";
      if (!secret) {
        return reply.status(500).send({ error: "Signal auth not configured" });
      }

      const crypto = await import("node:crypto");
      const expectedSig = crypto.createHmac("sha256", secret)
        .update(`${phone}:${ts}`)
        .digest("hex");

      if (sig !== expectedSig) {
        return reply.status(401).send({ error: "Invalid signature" });
      }

      const tsNum = parseInt(ts, 10);
      if (isNaN(tsNum) || Math.abs(Date.now() - tsNum) > 5 * 60 * 1000) {
        return reply.status(401).send({ error: "Link expired" });
      }

      const userId = `signal_${phone}`;

      fireAndForget(core.awardPoints(userId, "signal", "miniapp_open"), "award points");

      const cfg = getSupabaseConfig();
      if (cfg) {
        fireAndForget(sbPost(cfg, "flowb_sessions?on_conflict=user_id", {
          user_id: userId,
        }, "return=minimal,resolution=merge-duplicates"), "upsert signal session");
      }

      // Create/link Supabase Auth user (FlowB Passport)
      let sigSupabaseUid: string | undefined;
      if (isSupabaseAuthEnabled()) {
        const sbUser = await getOrCreateSupabaseUser(userId, "signal");
        if (sbUser) sigSupabaseUid = sbUser.uid;
      }

      const token = signJwt({
        sub: userId,
        platform: "signal",
        username: phone,
        ...(sigSupabaseUid ? { supabase_uid: sigSupabaseUid } : {}),
      });

      return {
        token,
        user: {
          id: userId,
          platform: "signal",
          username: phone,
        },
      };
    },
  );

  // ------------------------------------------------------------------
  // AUTH: FlowB Passport (Supabase Auth) — primary new auth endpoint
  // Accepts a Supabase Auth access token, verifies it, and issues a FlowB JWT.
  // Used by web and mobile clients after Supabase Auth login.
  // ------------------------------------------------------------------
  app.post<{ Body: { accessToken: string; displayName?: string } }>(
    "/api/v1/auth/passport",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          required: ["accessToken"],
          properties: {
            accessToken: { type: "string" },
            displayName: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      if (!isSupabaseAuthEnabled()) {
        return reply.status(503).send({ error: "Supabase Auth not enabled" });
      }

      const { accessToken, displayName } = request.body || {};
      if (!accessToken) {
        return reply.status(400).send({ error: "Missing accessToken" });
      }

      // Verify Supabase Auth token
      const verified = await verifySupabaseToken(accessToken);
      if (!verified) {
        return reply.status(401).send({ error: "Invalid Supabase Auth token" });
      }

      const { uid: supabaseUid, email } = verified;

      // Determine canonical user ID: check if this Supabase UID already has a passport
      const cfg = getSupabaseConfig();
      let canonicalId = `web_${supabaseUid}`;

      if (cfg) {
        const existing = await sbFetch<any[]>(
          cfg,
          `flowb_passport?supabase_uid=eq.${supabaseUid}&select=canonical_id&limit=1`,
        );
        if (existing?.[0]?.canonical_id) {
          canonicalId = existing[0].canonical_id;
        } else {
          // Create passport entry
          const sbUser = await getOrCreateSupabaseUser(canonicalId, "web", {
            email: email || undefined,
            displayName: displayName || email?.split("@")[0],
          });
          if (sbUser) {
            canonicalId = `web_${supabaseUid}`;
          }

          // Resolve cross-platform identity
          try {
            await resolveCanonicalId(cfg, canonicalId, {
              displayName: displayName || email?.split("@")[0],
            });
          } catch {}
        }

        // Upsert session
        fireAndForget(sbPost(cfg, "flowb_sessions?on_conflict=user_id", {
          user_id: canonicalId,
          display_name: displayName || email?.split("@")[0] || "User",
          ...(email ? { email } : {}),
        }, "return=minimal,resolution=merge-duplicates"), "upsert passport session");
      }

      // Award points
      fireAndForget(core.awardPoints(canonicalId, "web", "miniapp_open"), "award points");

      const token = signJwt({
        sub: canonicalId,
        platform: "web",
        username: displayName || email?.split("@")[0] || "User",
        supabase_uid: supabaseUid,
        email,
      });

      return {
        token,
        user: {
          id: canonicalId,
          supabase_uid: supabaseUid,
          platform: "web",
          email,
          username: displayName || email?.split("@")[0] || "User",
        },
      };
    },
  );

  // ------------------------------------------------------------------
  // AUTH: Claim pending points (pre-auth actions → backend account)
  // Accepts actions logged in localStorage before the user signed in.
  // Each action is validated: must be a known action, within 24h.
  // Daily caps and one-time checks still enforced by awardPoints.
  // ------------------------------------------------------------------
  app.post<{ Body: { actions: Array<{ action: string; ts: number }> } }>(
    "/api/v1/auth/claim-points",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const { actions } = request.body || {};

      if (!actions?.length) {
        return { claimed: 0, total: 0 };
      }

      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      let claimed = 0;
      let lastTotal = 0;

      for (const entry of actions.slice(0, 100)) {
        if (!entry.action || !entry.ts) continue;
        if (now - entry.ts > maxAge) continue;

        const result = await core.awardPoints(
          jwt.sub,
          jwt.platform,
          entry.action,
          { source: "pending_claim", claimed_at: now },
        );

        if (result.awarded) {
          claimed += result.points;
        }
        lastTotal = result.total;
      }

      return { claimed, total: lastTotal };
    },
  );

  // ------------------------------------------------------------------
  // FEED: Community Farcaster Feed (aggregates posts with keywords)
  // Searches multiple queries and deduplicates by cast hash.
  // Also supports legacy /feed/ethdenver path.
  // ------------------------------------------------------------------
  const communityFeedHandler = async (request: any) => {
      const neynarKey = process.env.NEYNAR_API_KEY;
      if (!neynarKey) {
        return { casts: [], nextCursor: undefined };
      }

      const queries = ["sxsw", "south by southwest", "#sxsw", "sxsw2026", "flowb"];
      const { cursor } = request.query;

      // Fetch from Neynar cast search API for each keyword in parallel
      const NEYNAR_API = "https://api.neynar.com/v2/farcaster";
      const limit = 25;

      const results = await Promise.allSettled(
        queries.map(async (q) => {
          let url = `${NEYNAR_API}/cast/search?q=${encodeURIComponent(q)}&limit=${limit}`;
          if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
          try {
            const res = await fetch(url, {
              headers: { "x-api-key": neynarKey, "Content-Type": "application/json" },
            });
            if (!res.ok) return { casts: [], next: undefined };
            const data = await res.json() as any;
            return {
              casts: data?.result?.casts || [],
              next: data?.result?.next?.cursor,
            };
          } catch {
            return { casts: [], next: undefined };
          }
        }),
      );

      // Merge, deduplicate by hash, filter from Mar 1
      const seen = new Set<string>();
      const allCasts: any[] = [];
      let lastCursor: string | undefined;

      const cutoffDate = new Date("2026-03-01T00:00:00Z").getTime();

      for (const r of results) {
        if (r.status !== "fulfilled") continue;
        const { casts, next } = r.value;
        if (next && !lastCursor) lastCursor = next;
        for (const cast of casts) {
          if (!cast.hash || seen.has(cast.hash)) continue;
          // Filter: only posts from Mar 1 onwards
          const ts = new Date(cast.timestamp).getTime();
          if (ts < cutoffDate) continue;
          seen.add(cast.hash);
          allCasts.push({
            hash: cast.hash,
            text: cast.text || "",
            timestamp: cast.timestamp,
            author: {
              fid: cast.author?.fid,
              username: cast.author?.username || "",
              display_name: cast.author?.display_name || cast.author?.username || "",
              pfp_url: cast.author?.pfp_url,
            },
            reactions: {
              likes_count: cast.reactions?.likes_count || 0,
              recasts_count: cast.reactions?.recasts_count || 0,
            },
            replies: {
              count: cast.replies?.count || 0,
            },
            embeds: cast.embeds || [],
            channel: cast.channel ? { id: cast.channel.id, name: cast.channel.name } : undefined,
          });
        }
      }

      // Sort by timestamp descending (newest first)
      allCasts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return {
        casts: allCasts.slice(0, 50),
        nextCursor: lastCursor,
      };
  };
  app.get("/api/v1/feed/community", communityFeedHandler);
  app.get("/api/v1/feed/ethdenver", communityFeedHandler); // legacy alias

  // ------------------------------------------------------------------
  // FEED: Global activity feed — check-ins, crew messages, hot venues, trending events
  // Optional auth: logged-in users can filter to friends/crew scope
  // ------------------------------------------------------------------
  app.get<{ Querystring: { scope?: string; venue?: string; hours?: string } }>(
    "/api/v1/feed/activity",
    async (request) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { venues: [], timeline: [], trending: [], stats: {} };

      const scope = request.query.scope || "global";
      const hours = Math.min(parseInt(request.query.hours || "4", 10), 168);
      const cutoff = new Date(Date.now() - hours * 3600_000).toISOString();
      const jwt = extractJwt(request);

      let checkins: any[] = [];
      let crewMessages: any[] = [];
      let crewIds: string[] = [];

      if (scope === "friends" && jwt?.sub) {
        const conns = await sbFetch<any[]>(cfg, `flowb_connections?user_id=eq.${jwt.sub}&status=eq.active&select=friend_id`);
        const friendIds = (conns || []).map((c: any) => c.friend_id);
        if (friendIds.length) {
          checkins = await sbFetch<any[]>(cfg,
            `flowb_checkins?user_id=in.(${friendIds.join(",")})&created_at=gte.${cutoff}&order=created_at.desc&limit=40`,
          ) || [];
          crewMessages = await sbFetch<any[]>(cfg,
            `flowb_crew_messages?user_id=in.(${friendIds.join(",")})&created_at=gte.${cutoff}&order=created_at.desc&limit=30`,
          ) || [];
        }
      } else if (scope === "crew" && jwt?.sub) {
        const memberships = await sbFetch<any[]>(cfg, `flowb_group_members?user_id=eq.${jwt.sub}&select=group_id`);
        crewIds = (memberships || []).map((m: any) => m.group_id);
        if (crewIds.length) {
          checkins = await sbFetch<any[]>(cfg,
            `flowb_checkins?crew_id=in.(${crewIds.join(",")})&created_at=gte.${cutoff}&order=created_at.desc&limit=50`,
          ) || [];
          crewMessages = await sbFetch<any[]>(cfg,
            `flowb_crew_messages?crew_id=in.(${crewIds.join(",")})&created_at=gte.${cutoff}&order=created_at.desc&limit=40`,
          ) || [];
        }
      } else {
        // Global: all checkins (crew_id is UUID so no need to filter out strings)
        checkins = await sbFetch<any[]>(cfg,
          `flowb_checkins?created_at=gte.${cutoff}&order=created_at.desc&limit=60`,
        ) || [];
        // Global: recent crew messages from all crews
        crewMessages = await sbFetch<any[]>(cfg,
          `flowb_crew_messages?created_at=gte.${cutoff}&order=created_at.desc&limit=40`,
        ) || [];
      }

      // Venue filter (applies to checkins only)
      if (request.query.venue) {
        const v = request.query.venue.toLowerCase();
        checkins = checkins.filter((c: any) => c.venue_name?.toLowerCase().includes(v));
      }

      // Resolve display names for all users (checkins + messages)
      const allUserIds = [...new Set([
        ...checkins.map((c: any) => c.user_id),
        ...crewMessages.map((m: any) => m.user_id),
      ])] as string[];
      const sessions = allUserIds.length
        ? await sbFetch<any[]>(cfg, `flowb_sessions?user_id=in.(${allUserIds.join(",")})&select=user_id,display_name`)
        : [];
      const nameMap = new Map((sessions || []).map((s: any) => [s.user_id, s.display_name || "Someone"]));

      // Resolve crew names for messages
      const msgCrewIds = [...new Set(crewMessages.map((m: any) => m.crew_id))] as string[];
      const crewRows = msgCrewIds.length
        ? await sbFetch<any[]>(cfg, `flowb_groups?id=in.(${msgCrewIds.join(",")})&select=id,name,emoji`)
        : [];
      const crewNameMap = new Map((crewRows || []).map((c: any) => [c.id, { name: c.name, emoji: c.emoji || "" }]));

      // Aggregate by venue (checkins only)
      const venueMap = new Map<string, { count: number; people: string[]; latest: string }>();
      const seenPerVenue = new Set<string>();
      for (const c of checkins) {
        const venue = c.venue_name || "Unknown";
        const entry = venueMap.get(venue) || { count: 0, people: [] as string[], latest: c.created_at };
        const key = `${c.user_id}:${venue}`;
        if (!seenPerVenue.has(key)) {
          entry.count++;
          if (entry.people.length < 5) entry.people.push(String(nameMap.get(c.user_id) || "Someone"));
          seenPerVenue.add(key);
        }
        venueMap.set(venue, entry);
      }

      const venues = [...venueMap.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, ...data }));

      // Unified timeline: merge checkins + crew messages, sorted by time
      const timelineItems: any[] = [];

      for (const c of checkins) {
        timelineItems.push({
          type: "checkin",
          user: nameMap.get(c.user_id) || "Someone",
          venue: c.venue_name,
          message: c.message || null,
          status: c.status || "here",
          ago: timeSince(c.created_at),
          created_at: c.created_at,
        });
      }

      for (const m of crewMessages) {
        const crew = crewNameMap.get(m.crew_id);
        timelineItems.push({
          type: "crew_message",
          user: m.display_name || nameMap.get(m.user_id) || "Someone",
          crew_name: crew?.name || "a crew",
          crew_emoji: crew?.emoji || "",
          message: m.message,
          ago: timeSince(m.created_at),
          created_at: m.created_at,
        });
      }

      // Sort by time descending and take top 25
      timelineItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const timeline = timelineItems.slice(0, 25);

      // Trending events
      const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
      const recentRsvps = await sbFetch<any[]>(cfg,
        `flowb_event_attendance?created_at=gte.${dayAgo}&select=event_id,event_name&order=created_at.desc&limit=50`,
      );
      const eventCounts = new Map<string, { name: string; count: number }>();
      for (const r of recentRsvps || []) {
        const e = eventCounts.get(r.event_id) || { name: r.event_name, count: 0 };
        e.count++;
        eventCounts.set(r.event_id, e);
      }
      const trending = [...eventCounts.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([id, e]) => ({ id, name: e.name, rsvps: e.count }));

      return {
        venues,
        timeline,
        trending,
        stats: {
          active_people: allUserIds.length,
          active_venues: venues.length,
          total_messages: crewMessages.length,
          scope,
          hours,
        },
      };
    },
  );

  // ------------------------------------------------------------------
  // EVENTS: DB-first discovery
  // Accepts: ?city=&categories=&zone=&type=&date=&from=&to=&featured=&q=&limit=&offset=
  // If no city param but user is authenticated, auto-uses current_city or destination_city
  // ------------------------------------------------------------------
  app.get<{ Querystring: { city?: string; categories?: string; zone?: string; type?: string; date?: string; from?: string; to?: string; featured?: string; free?: string; q?: string; limit?: string; offset?: string } }>(
    "/api/v1/events",
    async (request) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { events: [], total: 0 };

      let { city, categories, zone, type, date, from, to, featured, free: freeOnly, q, limit, offset } = request.query;
      const maxResults = Math.min(parseInt(limit || "50", 10), 200);
      const skip = parseInt(offset || "0", 10);

      // Auto-detect city from user session when not explicitly provided
      let citySource: "param" | "session" | undefined;
      if (city) {
        citySource = "param";
      } else {
        const jwt = extractJwt(request);
        if (jwt?.sub && cfg) {
          const sessions = await sbFetch<any[]>(
            cfg,
            `flowb_sessions?user_id=eq.${jwt.sub}&select=current_city,destination_city&limit=1`,
          );
          const session = sessions?.[0];
          if (session?.current_city) {
            city = session.current_city;
            citySource = "session";
          } else if (session?.destination_city) {
            city = session.destination_city;
            citySource = "session";
          }
        }
      }

      // Build PostgREST query
      let query = `flowb_events?hidden=eq.false&order=starts_at.asc&limit=${maxResults}&offset=${skip}`;

      if (city) query += `&city=ilike.*${encodeURIComponent(city)}*`;
      if (zone) query += `&zone_id=eq.${encodeURIComponent(zone)}`;
      if (type) query += `&event_type=eq.${encodeURIComponent(type)}`;
      if (featured === "true") query += `&featured=eq.true`;
      if (freeOnly === "true") query += `&is_free=eq.true`;
      if (date) {
        const dayStart = `${date}T00:00:00`;
        const dayEnd = `${date}T23:59:59`;
        query += `&starts_at=gte.${dayStart}&starts_at=lte.${dayEnd}`;
      }
      if (from) {
        query += `&starts_at=gte.${encodeURIComponent(from)}`;
      } else if (!date) {
        // Default: only show today and future events
        query += `&starts_at=gte.${new Date().toISOString().slice(0, 10)}T00:00:00`;
      }
      if (to) query += `&starts_at=lte.${encodeURIComponent(to)}`;

      // Full-text search
      if (q) {
        query += `&or=(title.ilike.*${encodeURIComponent(q)}*,description.ilike.*${encodeURIComponent(q)}*,organizer_name.ilike.*${encodeURIComponent(q)}*)`;
      }

      const rows = await sbFetch<any[]>(cfg, query);
      let events = (rows || []).map(dbEventToResult);

      // Category filter (post-query via category map join)
      if (categories) {
        const catSlugs = categories.split(",").map(c => c.trim().toLowerCase()).filter(Boolean);
        if (catSlugs.length > 0) {
          const catRows = await sbFetch<any[]>(
            cfg,
            `flowb_event_categories?slug=in.(${catSlugs.join(",")})&select=id`,
          );
          if (catRows?.length) {
            const catIds = catRows.map(c => c.id);
            const mappings = await sbFetch<any[]>(
              cfg,
              `flowb_event_category_map?category_id=in.(${catIds.join(",")})&select=event_id`,
            );
            if (mappings?.length) {
              const eventIds = new Set(mappings.map(m => m.event_id));
              events = events.filter(e => eventIds.has(e.id));
            } else {
              events = [];
            }
          }
        }
      }

      return {
        events,
        total: events.length,
        ...(city ? { city } : {}),
        ...(citySource ? { citySource } : {}),
      };
    },
  );

  // ------------------------------------------------------------------
  // EVENTS: Distinct cities (for city picker UI)
  // Returns list of cities that have upcoming events
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/events/cities",
    async () => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { cities: [] };

      // Fetch distinct non-null city values from future events
      const rows = await sbFetch<any[]>(
        cfg,
        `flowb_events?hidden=eq.false&starts_at=gte.${new Date().toISOString().slice(0, 10)}T00:00:00&city=not.is.null&select=city&order=city.asc`,
      );

      if (!rows?.length) return { cities: [] };

      // Deduplicate (PostgREST doesn't support DISTINCT on single column easily)
      const citySet = new Set<string>();
      for (const row of rows) {
        if (row.city) citySet.add(row.city.trim());
      }

      const cities = [...citySet].sort((a, b) => a.localeCompare(b));
      return { cities, total: cities.length };
    },
  );

  // ------------------------------------------------------------------
  // TRANSCRIBE: Social media video transcription via Supadata
  // Accepts a video URL from YouTube, TikTok, Instagram, X, Facebook
  // ------------------------------------------------------------------
  app.post<{
    Body: { url: string; lang?: string; mode?: "native" | "generate" | "auto" };
  }>(
    "/api/v1/transcribe",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          required: ["url"],
          properties: {
            url: { type: "string" },
            lang: { type: "string" },
            mode: { type: "string", enum: ["native", "generate", "auto"] },
          },
        },
      },
    },
    async (request, reply) => {
      const egator = core.getEGatorPlugin();
      const supadata = egator?.getSupadataAdapter();
      if (!supadata) {
        return reply.status(503).send({ error: "Transcription service not configured" });
      }

      const { url, lang, mode } = request.body;

      const { SupadataAdapter } = await import("../plugins/egator/sources/supadata.js");
      if (!SupadataAdapter.isSupportedUrl(url)) {
        return reply.status(400).send({
          error: "Unsupported URL",
          supported: ["YouTube", "TikTok", "Instagram", "X/Twitter", "Facebook"],
        });
      }

      try {
        const platform = SupadataAdapter.detectPlatform(url);
        const result = await supadata.transcribe(url, {
          lang,
          mode: mode || "auto",
          text: true,
        });

        return {
          platform,
          url: result.sourceUrl,
          lang: result.lang,
          availableLangs: result.availableLangs,
          transcript: result.content,
          async: result.async,
        };
      } catch (err: any) {
        log.error("transcribe", err.message);
        return reply.status(502).send({ error: `Transcription failed: ${err.message}` });
      }
    },
  );

  // ------------------------------------------------------------------
  // SEARCH: Web search via SerpAPI (Google)
  // ------------------------------------------------------------------
  app.get<{
    Querystring: { q: string; location?: string; num?: string };
  }>(
    "/api/v1/search",
    {
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      schema: {
        querystring: {
          type: "object",
          required: ["q"],
          properties: {
            q: { type: "string" },
            location: { type: "string" },
            num: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const egator = core.getEGatorPlugin();
      const serpapi = egator?.getSerpAPIAdapter();
      if (!serpapi) {
        return reply.status(503).send({ error: "Search service not configured" });
      }

      const { q, location, num } = request.query;

      try {
        const data = await serpapi.search(q, {
          location,
          num: num ? parseInt(num, 10) : 10,
        });

        return {
          query: q,
          results: (data.organic_results || []).map((r: any) => ({
            title: r.title,
            link: r.link,
            snippet: r.snippet,
            position: r.position,
          })),
          knowledge_graph: data.knowledge_graph || null,
          related_questions: data.related_questions || [],
        };
      } catch (err: any) {
        log.error("search", err.message);
        return reply.status(502).send({ error: `Search failed: ${err.message}` });
      }
    },
  );

  // ------------------------------------------------------------------
  // EVENTS: Community submit (anyone can add an event link)
  // ------------------------------------------------------------------
  app.post<{
    Body: {
      url?: string;
      title?: string;
      startTime?: string;
      endTime?: string;
      venue?: string;
      city?: string;
      description?: string;
      isFree?: boolean;
      submitterName?: string;
    };
  }>(
    "/api/v1/events/submit",
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });

      const { url, title, startTime, endTime, venue, city, description, isFree, submitterName } = request.body || {};

      // Require at least a title or URL
      if (!title && !url) {
        return reply.status(400).send({ error: "Please provide an event title or URL" });
      }

      const eventTitle = title || url || "Community Event";
      const titleSlug = eventTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 200);

      // Check for duplicates
      const existing = await sbFetch<any[]>(
        cfg,
        `flowb_events?source=eq.community&title_slug=eq.${encodeURIComponent(titleSlug)}&limit=1`,
      );
      if (existing?.length) {
        return { ok: true, message: "Event already listed!", eventId: existing[0].id };
      }

      // Get user info if authenticated
      const jwt = extractJwt(request);
      const submitter = submitterName || (jwt?.sub ? jwt.sub : "anonymous");

      const inserted = await sbInsert<any>(cfg, "flowb_events", {
        source: "community",
        title: eventTitle,
        title_slug: titleSlug,
        description: description || null,
        url: url || null,
        starts_at: startTime || null,
        ends_at: endTime || null,
        venue_name: venue || null,
        city: city || "Austin",
        is_free: isFree ?? null,
        organizer_name: submitter,
        quality_score: 0.3,
        stale: false,
        tags: ["community-submitted"],
      });

      if (!inserted?.id) {
        return reply.status(500).send({ error: "Failed to save event" });
      }

      // Award points if authenticated
      if (jwt?.sub) {
        fireAndForget(
          core.awardPoints(jwt.sub, jwt.platform || "web", "event_submitted"),
          "award event submit points",
        );
      }

      return { ok: true, message: "Event submitted!", eventId: inserted.id };
    },
  );

  // ------------------------------------------------------------------
  // EVENTS: Single event detail (DB-first)
  // ------------------------------------------------------------------
  app.get<{ Params: { id: string } }>(
    "/api/v1/events/:id",
    async (request, reply) => {
      const { id } = request.params;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });

      // Try by UUID first, then by source_event_id
      let rows = await sbFetch<any[]>(cfg, `flowb_events?id=eq.${encodeURIComponent(id)}&limit=1`);
      if (!rows?.length) {
        rows = await sbFetch<any[]>(cfg, `flowb_events?source_event_id=eq.${encodeURIComponent(id)}&limit=1`);
      }
      if (!rows?.length) {
        return reply.status(404).send({ error: "Event not found" });
      }

      const event = dbEventToResult(rows[0]);

      // Fetch categories for this event
      const catMap = await sbFetch<any[]>(
        cfg,
        `flowb_event_category_map?event_id=eq.${rows[0].id}&select=flowb_event_categories(slug,name)`,
      );
      if (catMap?.length) {
        event.categories = catMap
          .filter(m => m.flowb_event_categories)
          .map(m => m.flowb_event_categories.slug);
      }

      // If authed, include flow social proof
      let flowAttendance: { going: string[]; maybe: string[] } | undefined;
      const jwt = extractJwt(request);
      if (jwt && flowPlugin && flowCfg) {
        flowAttendance = await flowPlugin.getFlowAttendanceForEvent(flowCfg, jwt.sub, id);
      }

      return {
        event,
        flow: flowAttendance || { going: [], maybe: [] },
      };
    },
  );

  // ------------------------------------------------------------------
  // EVENTS: RSVP (requires auth)
  // ------------------------------------------------------------------
  app.post<{
    Params: { id: string };
    Body: {
      status?: "going" | "maybe";
      // Client can send event details so we don't need to discover them
      eventTitle?: string;
      eventSource?: string;
      eventUrl?: string;
      venueName?: string;
      startTime?: string;
      endTime?: string;
    };
  }>(
    "/api/v1/events/:id/rsvp",
    {
      preHandler: authMiddleware,
      schema: {
        body: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["going", "maybe"] },
            eventTitle: { type: "string" },
            eventSource: { type: "string" },
            eventUrl: { type: "string" },
            venueName: { type: "string" },
            startTime: { type: "string" },
            endTime: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const jwt = request.jwtPayload!;
      const { id } = request.params;
      const body = request.body || {};
      const status = body.status || "going";

      if (!flowPlugin || !flowCfg) {
        return { ok: false, error: "Flow plugin not configured" };
      }

      // Look up event from DB, fall back to client-provided data
      const sbCfg = getSupabaseConfig();
      let dbEvent: any = null;
      if (sbCfg) {
        let eRows = await sbFetch<any[]>(sbCfg, `flowb_events?id=eq.${encodeURIComponent(id)}&limit=1`);
        if (!eRows?.length) {
          eRows = await sbFetch<any[]>(sbCfg, `flowb_events?source_event_id=eq.${encodeURIComponent(id)}&limit=1`);
        }
        dbEvent = eRows?.[0] || null;
      }

      // Build event details from DB or client-provided fallback
      const eventTitle = dbEvent?.title || body.eventTitle || id;
      const eventSource = dbEvent?.source || body.eventSource || "web";
      const eventUrl = dbEvent?.url || body.eventUrl || null;
      const venueName = dbEvent?.venue_name || body.venueName || null;
      const startTime = dbEvent?.starts_at || body.startTime || null;
      const endTime = dbEvent?.ends_at || body.endTime || null;

      // Increment rsvp_count on the event
      if (dbEvent && sbCfg) {
        await fetch(
          `${sbCfg.supabaseUrl}/rest/v1/rpc/flowb_increment_rsvp`,
          {
            method: "POST",
            headers: {
              apikey: sbCfg.supabaseKey,
              Authorization: `Bearer ${sbCfg.supabaseKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ event_row_id: dbEvent.id }),
          },
        ).catch(() => {
          // Fallback: direct patch if RPC not available
          fireAndForget(fetch(
            `${sbCfg.supabaseUrl}/rest/v1/flowb_events?id=eq.${dbEvent.id}`,
            {
              method: "PATCH",
              headers: {
                apikey: sbCfg.supabaseKey,
                Authorization: `Bearer ${sbCfg.supabaseKey}`,
                "Content-Type": "application/json",
                Prefer: "return=minimal",
              },
              body: JSON.stringify({ rsvp_count: (dbEvent.rsvp_count || 0) + 1 }),
            },
          ), "increment rsvp count");
        });
      }

      const attendance = await flowPlugin.rsvpWithDetails(
        flowCfg,
        jwt.sub,
        id,
        eventTitle,
        startTime,
        venueName,
        status,
      );

      // Always write to the rich schedules table (using discovered or client data)
      if (eventTitle && eventTitle !== id) {
        const cfg = getSupabaseConfig();
        if (cfg) {
          await sbPost(cfg, "flowb_schedules?on_conflict=user_id,platform,event_source,event_source_id", {
            user_id: jwt.sub,
            platform: jwt.platform,
            event_title: eventTitle,
            event_source: eventSource,
            event_source_id: id,
            event_url: eventUrl,
            venue_name: venueName,
            starts_at: startTime,
            ends_at: endTime,
            rsvp_status: status,
          }, "return=minimal,resolution=merge-duplicates");

          // Auto-create default reminders for this event
          const prefs = await sbFetch<any[]>(
            cfg,
            `flowb_sessions?user_id=eq.${jwt.sub}&select=reminder_defaults&limit=1`,
          );
          const defaults: number[] = prefs?.[0]?.reminder_defaults || [30];
          for (const mins of defaults) {
            fireAndForget(sbPost(cfg, "flowb_event_reminders?on_conflict=user_id,event_source_id,remind_minutes_before", {
              user_id: jwt.sub,
              event_source_id: id,
              remind_minutes_before: mins,
            }, "return=minimal,resolution=merge-duplicates"), "upsert reminder");
          }
        }
      }

      // Award points
      fireAndForget(core.awardPoints(jwt.sub, jwt.platform, "event_rsvp"), "award points");

      // Fire notifications in background
      const notifyCtx = getNotifyContext();
      if (notifyCtx && eventTitle !== id) {
        fireAndForget(notifyFriendRsvp(notifyCtx, jwt.sub, id, eventTitle, undefined, startTime, eventUrl), "notify friend rsvp");
        fireAndForget(notifyCrewMemberRsvp(notifyCtx, jwt.sub, id, eventTitle, undefined, startTime, eventUrl), "notify crew member rsvp");
      }

      return { ok: true, status, attendance };
    },
  );

  // ------------------------------------------------------------------
  // EVENTS: Cancel RSVP (requires auth)
  // ------------------------------------------------------------------
  app.delete<{ Params: { id: string } }>(
    "/api/v1/events/:id/rsvp",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const { id } = request.params;

      if (!flowPlugin || !flowCfg) {
        return { ok: false, error: "Flow plugin not configured" };
      }

      await flowPlugin.cancelRsvp(flowCfg, jwt.sub, { action: "not-going", event_id: id });

      // Also remove from schedules
      const cfg = getSupabaseConfig();
      if (cfg) {
        fireAndForget(fetch(
          `${cfg.supabaseUrl}/rest/v1/flowb_schedules?user_id=eq.${jwt.sub}&event_source_id=eq.${id}`,
          {
            method: "DELETE",
            headers: {
              apikey: cfg.supabaseKey,
              Authorization: `Bearer ${cfg.supabaseKey}`,
            },
          },
        ), "delete schedule");
      }

      return { ok: true };
    },
  );

  // ------------------------------------------------------------------
  // SCHEDULE: Personal schedule (requires auth)
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/me/schedule",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { schedule: [] };

      const now = new Date().toISOString();
      const rows = await sbFetch<any[]>(
        cfg,
        `flowb_schedules?user_id=eq.${jwt.sub}&starts_at=gte.${now}&order=starts_at.asc&limit=50`,
      );

      return { schedule: rows || [] };
    },
  );

  // ------------------------------------------------------------------
  // SCHEDULE: Mark checkin (requires auth)
  // ------------------------------------------------------------------
  app.post<{ Params: { id: string } }>(
    "/api/v1/me/schedule/:id/checkin",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const { id } = request.params;
      const cfg = getSupabaseConfig();
      if (!cfg) return { ok: false };

      fireAndForget(fetch(
        `${cfg.supabaseUrl}/rest/v1/flowb_schedules?id=eq.${id}&user_id=eq.${jwt.sub}`,
        {
          method: "PATCH",
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: `Bearer ${cfg.supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            checked_in: true,
            checked_in_at: new Date().toISOString(),
          }),
        },
      ), "update schedule checkin");

      fireAndForget(core.awardPoints(jwt.sub, jwt.platform, "event_checkin"), "award points");

      return { ok: true };
    },
  );

  // ------------------------------------------------------------------
  // FLOW: Crews list (requires auth)
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/flow/crews",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { crews: [] };

      const memberships = await sbFetch<any[]>(
        cfg,
        `flowb_group_members?user_id=eq.${jwt.sub}&select=group_id,role,joined_at,flowb_groups(id,name,emoji,description,join_code,max_members,event_context,created_at)`,
      );

      const crews = (memberships || [])
        .filter((m) => m.flowb_groups)
        .map((m) => ({
          ...m.flowb_groups,
          role: m.role,
          joinedAt: m.joined_at,
        }));

      return { crews };
    },
  );

  // ------------------------------------------------------------------
  // FLOW: Create crew (requires auth)
  // ------------------------------------------------------------------
  app.post<{ Body: { name: string; emoji?: string; description?: string; eventContext?: string } }>(
    "/api/v1/flow/crews",
    {
      preHandler: authMiddleware,
      schema: {
        body: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string" },
            emoji: { type: "string" },
            description: { type: "string" },
            eventContext: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const jwt = request.jwtPayload!;
      if (!flowPlugin || !flowCfg) {
        return { ok: false, error: "Flow plugin not configured" };
      }

      const result = await flowPlugin.execute("crew-create", {
        action: "crew-create",
        user_id: jwt.sub,
        query: `${request.body.emoji || ""} ${request.body.name}`.trim(),
      }, { userId: jwt.sub, platform: jwt.platform, config: {} as any });

      fireAndForget(core.awardPoints(jwt.sub, jwt.platform, "crew_created"), "award points");

      return { ok: true, message: result };
    },
  );

  // ------------------------------------------------------------------
  // FLOW: Join crew (requires auth)
  // ------------------------------------------------------------------
  app.post<{ Params: { id: string }; Body: { joinCode?: string } }>(
    "/api/v1/flow/crews/:id/join",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      if (!flowPlugin || !flowCfg) {
        return { ok: false, error: "Flow plugin not configured" };
      }

      const code = request.body?.joinCode || request.params.id;

      const result = await flowPlugin.execute("crew-join", {
        action: "crew-join",
        user_id: jwt.sub,
        referral_code: code,
      }, { userId: jwt.sub, platform: jwt.platform, config: {} as any });

      fireAndForget(core.awardPoints(jwt.sub, jwt.platform, "crew_joined"), "award points");

      // Notify crew members about the new join (background)
      const joinNotifyCtx = getNotifyContext();
      if (joinNotifyCtx) {
        // Try to extract crew info from the result message
        const crewMatch = result.match(/Welcome to (.+?) (.+?)!/);
        const emoji = crewMatch?.[1] || "";
        const name = crewMatch?.[2] || "crew";
        fireAndForget(notifyCrewJoin(joinNotifyCtx, jwt.sub, request.params.id, name, emoji), "notify crew join");
      }

      return { ok: true, message: result };
    },
  );

  // ------------------------------------------------------------------
  // FLOW: Crew members + live checkins (requires auth)
  // ------------------------------------------------------------------
  app.get<{ Params: { id: string } }>(
    "/api/v1/flow/crews/:id/members",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const { id } = request.params;
      const cfg = getSupabaseConfig();
      if (!cfg) return { members: [], checkins: [] };

      // Verify caller is a member
      const membership = await sbFetch<any[]>(
        cfg,
        `flowb_group_members?group_id=eq.${id}&user_id=eq.${jwt.sub}&select=role&limit=1`,
      );
      if (!membership?.length) {
        return { error: "Not a member of this crew", members: [], checkins: [] };
      }

      // Get members
      const members = await sbFetch<any[]>(
        cfg,
        `flowb_group_members?group_id=eq.${id}&select=user_id,role,joined_at&order=joined_at.asc`,
      );

      // Get active checkins for this crew
      const now = new Date().toISOString();
      const checkins = await sbFetch<any[]>(
        cfg,
        `flowb_checkins?crew_id=eq.${id}&expires_at=gt.${now}&select=user_id,venue_name,status,message,created_at&order=created_at.desc`,
      );

      // Resolve display names from sessions
      const allUserIds = [
        ...new Set([
          ...(members || []).map((m: any) => m.user_id),
          ...(checkins || []).map((c: any) => c.user_id),
        ]),
      ];
      const sessions = allUserIds.length
        ? await sbFetch<any[]>(cfg, `flowb_sessions?user_id=in.(${allUserIds.join(",")})&select=user_id,display_name`)
        : [];
      const nameMap = new Map((sessions || []).map((s) => [s.user_id, s.display_name]));

      return {
        members: (members || []).map((m: any) => ({ ...m, display_name: nameMap.get(m.user_id) || undefined })),
        checkins: (checkins || []).map((c: any) => ({ ...c, display_name: nameMap.get(c.user_id) || undefined })),
      };
    },
  );

  // ------------------------------------------------------------------
  // FLOW: Crew checkin - broadcast location (requires auth)
  // ------------------------------------------------------------------
  app.post<{
    Params: { id: string };
    Body: {
      venueName: string;
      eventId?: string;
      status?: "here" | "heading" | "leaving";
      message?: string;
      latitude?: number;
      longitude?: number;
    };
  }>(
    "/api/v1/flow/crews/:id/checkin",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const { id } = request.params;
      const { venueName, eventId, status, message, latitude, longitude } = request.body || {};
      const cfg = getSupabaseConfig();

      if (!cfg || !venueName) {
        return { ok: false, error: "Missing venue name" };
      }

      // Verify membership
      const membership = await sbFetch<any[]>(
        cfg,
        `flowb_group_members?group_id=eq.${id}&user_id=eq.${jwt.sub}&select=role&limit=1`,
      );
      if (!membership?.length) {
        return { ok: false, error: "Not a member of this crew" };
      }

      // Resolve location if locationCode provided
      let locationId: string | null = null;
      const locationCode = (request.body as any)?.locationCode;
      if (locationCode) {
        const loc = await sbFetch<any[]>(cfg, `flowb_locations?code=eq.${locationCode}&active=eq.true&limit=1`);
        if (loc?.length) {
          locationId = loc[0].id;
        }
      }

      // Insert checkin with expiry
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const checkin = await sbPost(cfg, "flowb_checkins", {
        user_id: jwt.sub,
        platform: jwt.platform,
        crew_id: id,
        venue_name: venueName,
        event_id: eventId || null,
        status: status || "here",
        message: message || null,
        latitude: latitude || null,
        longitude: longitude || null,
        location_id: locationId,
        expires_at: expiresAt,
      });

      // Award points
      fireAndForget(core.awardPoints(jwt.sub, jwt.platform, "event_checkin"), "award points");

      // Notify crew members (background)
      const checkinNotifyCtx = getNotifyContext();
      if (checkinNotifyCtx) {
        // Look up crew name/emoji
        const crewRow = await sbFetch<any[]>(cfg, `flowb_groups?id=eq.${id}&select=name,emoji&limit=1`);
        const crewName = crewRow?.[0]?.name || "crew";
        const crewEmoji = crewRow?.[0]?.emoji || "";
        fireAndForget(notifyCrewCheckin(checkinNotifyCtx, jwt.sub, id, crewName, crewEmoji, venueName), "notify crew checkin");
      }

      return { ok: true, checkin };
    },
  );

  // ------------------------------------------------------------------
  // FLOW: Friends list (requires auth)
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/flow/friends",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { friends: [] };

      const connections = await sbFetch<any[]>(
        cfg,
        `flowb_connections?user_id=eq.${jwt.sub}&status=eq.active&select=friend_id,accepted_at&order=accepted_at.desc`,
      );

      return { friends: connections || [] };
    },
  );

  // ------------------------------------------------------------------
  // PROFILE: Update own bio, role, tags (requires auth)
  // ------------------------------------------------------------------
  app.patch<{
    Body: {
      bio?: string;
      role?: string;
      tags?: string[];
    };
  }>(
    "/api/v1/me/profile",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { ok: false, error: "Not configured" };

      const body = request.body || {};
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };

      if (body.bio !== undefined) updates.bio = body.bio;
      if (body.role !== undefined) updates.role = body.role;
      if (body.tags !== undefined) {
        // Sanitize: lowercase, trim, deduplicate, max 20 tags
        const cleaned = [...new Set(
          (body.tags || []).map((t: string) => t.trim().toLowerCase()).filter(Boolean),
        )].slice(0, 20);
        updates.tags = cleaned;
      }

      // Upsert session row (POST + merge-duplicates)
      const res = await fetch(
        `${cfg.supabaseUrl}/rest/v1/flowb_sessions`,
        {
          method: "POST",
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: `Bearer ${cfg.supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal,resolution=merge-duplicates",
          },
          body: JSON.stringify({ user_id: jwt.sub, ...updates }),
        },
      );

      if (!res.ok) {
        log.warn("[routes]", "profile update failed", { status: res.status });
        return { ok: false, error: "Update failed" };
      }

      return { ok: true };
    },
  );

  // ------------------------------------------------------------------
  // PROFILE: Get own profile (bio, role, tags) (requires auth)
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/me/profile",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { profile: {} };

      const rows = await sbFetch<any[]>(
        cfg,
        `flowb_sessions?user_id=eq.${jwt.sub}&select=bio,role,tags,display_name&limit=1`,
      );

      const row = rows?.[0] || {};
      return {
        profile: {
          bio: row.bio || null,
          role: row.role || null,
          tags: row.tags || [],
          display_name: row.display_name || null,
        },
      };
    },
  );

  // ------------------------------------------------------------------
  // FLOW: Get detailed friend info (requires auth)
  // ------------------------------------------------------------------
  app.get<{ Params: { friendId: string } }>(
    "/api/v1/flow/friends/:friendId",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const friendId = request.params.friendId;
      const cfg = getSupabaseConfig();
      if (!cfg) return { ok: false, error: "Not configured" };

      // Get the connection row (caller's side)
      const conns = await sbFetch<any[]>(
        cfg,
        `flowb_connections?user_id=eq.${jwt.sub}&friend_id=eq.${friendId}&select=id,status,note,tags,contact_shared,contact_info,accepted_at,met_at_event,met_at_city&limit=1`,
      );

      if (!conns?.length) return { ok: false, error: "Not in your flow" };
      const conn = conns[0];

      // Get friend's profile from sessions
      const sessions = await sbFetch<any[]>(
        cfg,
        `flowb_sessions?user_id=eq.${friendId}&select=display_name,bio,role,tags,home_city,current_city&limit=1`,
      );
      const profile = sessions?.[0] || {};

      // Check if friend has shared contact with us (look at friend's side of connection)
      const friendConn = await sbFetch<any[]>(
        cfg,
        `flowb_connections?user_id=eq.${friendId}&friend_id=eq.${jwt.sub}&select=contact_shared,contact_info&limit=1`,
      );
      const friendShared = friendConn?.[0];

      return {
        friend: {
          user_id: friendId,
          display_name: profile.display_name || null,
          bio: profile.bio || null,
          role: profile.role || null,
          tags: profile.tags || [],
          home_city: profile.home_city || null,
          current_city: profile.current_city || null,
        },
        connection: {
          status: conn.status,
          note: conn.note || null,
          tags: conn.tags || [],
          contact_shared: conn.contact_shared || false,
          accepted_at: conn.accepted_at,
          met_at_event: conn.met_at_event || null,
          met_at_city: conn.met_at_city || null,
        },
        // Contact info the friend shared with you (from their side)
        shared_contact: friendShared?.contact_shared ? (friendShared.contact_info || null) : null,
      };
    },
  );

  // ------------------------------------------------------------------
  // FLOW: Update connection note/tags (requires auth)
  // ------------------------------------------------------------------
  app.patch<{
    Params: { friendId: string };
    Body: {
      note?: string;
      tags?: string[];
    };
  }>(
    "/api/v1/flow/friends/:friendId",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const friendId = request.params.friendId;
      const cfg = getSupabaseConfig();
      if (!cfg) return { ok: false, error: "Not configured" };

      const body = request.body || {};
      const updates: Record<string, any> = {};

      if (body.note !== undefined) updates.note = body.note;
      if (body.tags !== undefined) {
        const cleaned = [...new Set(
          (body.tags || []).map((t: string) => t.trim().toLowerCase()).filter(Boolean),
        )].slice(0, 20);
        updates.tags = cleaned;
      }

      if (Object.keys(updates).length === 0) {
        return { ok: false, error: "Nothing to update" };
      }

      const ok = await sbPatchRaw(
        cfg,
        `flowb_connections?user_id=eq.${jwt.sub}&friend_id=eq.${friendId}`,
        updates,
      );

      if (!ok) return { ok: false, error: "Connection not found or update failed" };
      return { ok: true };
    },
  );

  // ------------------------------------------------------------------
  // FLOW: Share contact info with a friend (requires auth)
  // ------------------------------------------------------------------
  app.post<{
    Params: { friendId: string };
    Body: {
      email?: string;
      twitter?: string;
      telegram?: string;
      farcaster?: string;
      phone?: string;
      website?: string;
      linkedin?: string;
    };
  }>(
    "/api/v1/flow/friends/:friendId/share-contact",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const friendId = request.params.friendId;
      const cfg = getSupabaseConfig();
      if (!cfg) return { ok: false, error: "Not configured" };

      // Verify connection exists
      const conns = await sbFetch<any[]>(
        cfg,
        `flowb_connections?user_id=eq.${jwt.sub}&friend_id=eq.${friendId}&status=eq.active&select=id&limit=1`,
      );

      if (!conns?.length) return { ok: false, error: "Not in your flow or connection not active" };

      const body = request.body || {};
      const contactInfo: Record<string, string> = {};

      // Only include non-empty fields
      if (body.email) contactInfo.email = body.email;
      if (body.twitter) contactInfo.twitter = body.twitter;
      if (body.telegram) contactInfo.telegram = body.telegram;
      if (body.farcaster) contactInfo.farcaster = body.farcaster;
      if (body.phone) contactInfo.phone = body.phone;
      if (body.website) contactInfo.website = body.website;
      if (body.linkedin) contactInfo.linkedin = body.linkedin;

      if (Object.keys(contactInfo).length === 0) {
        return { ok: false, error: "At least one contact field required" };
      }

      // Update caller's side of the connection with shared contact info
      const ok = await sbPatchRaw(
        cfg,
        `flowb_connections?user_id=eq.${jwt.sub}&friend_id=eq.${friendId}`,
        {
          contact_shared: true,
          contact_info: contactInfo,
        },
      );

      if (!ok) return { ok: false, error: "Failed to share contact" };
      return { ok: true, shared: contactInfo };
    },
  );

  // ------------------------------------------------------------------
  // FLOW: Connect / send friend request (requires auth)
  // ------------------------------------------------------------------
  app.post<{ Body: { code: string } }>(
    "/api/v1/flow/connect",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      if (!flowPlugin || !flowCfg) {
        return { ok: false, error: "Flow plugin not configured" };
      }

      const { code } = request.body || {};
      if (!code) return { ok: false, error: "Missing invite code" };

      const result = await flowPlugin.execute("flow-accept", {
        action: "flow-accept",
        user_id: jwt.sub,
        referral_code: code,
      }, { userId: jwt.sub, platform: jwt.platform, config: {} as any });

      fireAndForget(core.awardPoints(jwt.sub, jwt.platform, "flow_accepted"), "award points");

      return { ok: true, message: result };
    },
  );

  // ------------------------------------------------------------------
  // FLOW: Get personal invite link (requires auth)
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/flow/invite",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      if (!flowPlugin || !flowCfg) {
        return { ok: false, error: "Flow plugin not configured" };
      }

      const link = await flowPlugin.getInviteLink(flowCfg, jwt.sub);
      return { link };
    },
  );

  // ------------------------------------------------------------------
  // POINTS: Get user points + streak (requires auth)
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/me/points",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { points: 0, streak: 0 };

      // Resolve canonical ID and get all linked platform user IDs
      const canonicalId = await resolveCanonicalId(cfg, jwt.sub);
      const linkedIds = await getLinkedIds(cfg, canonicalId);

      // Fast path: single identity (no linked accounts)
      if (linkedIds.length <= 1) {
        const rows = await sbFetch<any[]>(
          cfg,
          `flowb_user_points?user_id=eq.${encodeURIComponent(jwt.sub)}&select=total_points,current_streak,longest_streak,milestone_level&limit=1`,
        );
        const row = rows?.[0];
        return {
          points: row?.total_points || 0,
          streak: row?.current_streak || 0,
          longestStreak: row?.longest_streak || 0,
          level: row?.milestone_level || 0,
        };
      }

      // Multi-platform: aggregate points across all linked accounts
      const inList = linkedIds.map(id => encodeURIComponent(id)).join(",");
      const allRows = await sbFetch<any[]>(
        cfg,
        `flowb_user_points?user_id=in.(${inList})&select=user_id,total_points,current_streak,longest_streak,milestone_level`,
      );

      if (!allRows?.length) {
        return { points: 0, streak: 0, longestStreak: 0, level: 0 };
      }

      let totalPoints = 0;
      let maxStreak = 0;
      let maxLongest = 0;
      let maxLevel = 0;
      const breakdown: { platform: string; user_id: string; points: number }[] = [];

      for (const row of allRows) {
        totalPoints += row.total_points || 0;
        maxStreak = Math.max(maxStreak, row.current_streak || 0);
        maxLongest = Math.max(maxLongest, row.longest_streak || 0);
        maxLevel = Math.max(maxLevel, row.milestone_level || 0);
        const platform = row.user_id.split("_")[0] || "unknown";
        breakdown.push({ platform, user_id: row.user_id, points: row.total_points || 0 });
      }

      return {
        points: totalPoints,
        streak: maxStreak,
        longestStreak: maxLongest,
        level: maxLevel,
        breakdown,
      };
    },
  );

  // ------------------------------------------------------------------
  // POINTS: Crew leaderboard (requires auth)
  // ------------------------------------------------------------------
  app.get<{ Params: { id: string } }>(
    "/api/v1/flow/crews/:id/leaderboard",
    { preHandler: authMiddleware },
    async (request) => {
      const { id } = request.params;
      const cfg = getSupabaseConfig();
      if (!cfg) return { leaderboard: [] };

      // Get crew members
      const members = await sbFetch<any[]>(
        cfg,
        `flowb_group_members?group_id=eq.${id}&select=user_id`,
      );
      if (!members?.length) return { leaderboard: [] };

      const userIds = members.map((m) => m.user_id);

      // Get points for all members
      const points = await sbFetch<any[]>(
        cfg,
        `flowb_user_points?user_id=in.(${userIds.join(",")})&select=user_id,total_points,current_streak&order=total_points.desc`,
      );

      // Resolve display names from sessions
      const sessions = await sbFetch<any[]>(
        cfg,
        `flowb_sessions?user_id=in.(${userIds.join(",")})&select=user_id,display_name`,
      );
      const nameMap = new Map((sessions || []).map((s) => [s.user_id, s.display_name]));

      // Fetch verified sponsorship totals per member for sponsor boost
      const sponsorships = await sbFetch<any[]>(
        cfg,
        `flowb_sponsorships?sponsor_user_id=in.(${userIds.join(",")})&status=eq.verified&select=sponsor_user_id,amount_usdc`,
      );
      const sponsorMap = new Map<string, number>();
      for (const s of sponsorships || []) {
        const cur = sponsorMap.get(s.sponsor_user_id) || 0;
        sponsorMap.set(s.sponsor_user_id, cur + (Number(s.amount_usdc) || 0));
      }

      const leaderboard = (points || []).map((p) => {
        const totalSponsored = sponsorMap.get(p.user_id) || 0;
        const sponsorBoost = Math.floor(totalSponsored * 10);
        return {
          ...p,
          display_name: nameMap.get(p.user_id) || undefined,
          sponsor_boost: sponsorBoost > 0 ? sponsorBoost : undefined,
          effective_points: (p.total_points || 0) + sponsorBoost,
        };
      });
      leaderboard.sort((a, b) => b.effective_points - a.effective_points);

      return { leaderboard };
    },
  );

  // ------------------------------------------------------------------
  // POINTS: Global crew leaderboard (no auth required)
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/flow/leaderboard",
    async () => {
      const crews = await core.getGlobalCrewRanking();
      return { crews };
    },
  );

  // ------------------------------------------------------------------
  // POINTS: Global individual leaderboard (no auth required)
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/flow/leaderboard/individuals",
    async () => {
      const individuals = await core.getGlobalIndividualRanking();
      return { individuals };
    },
  );

  // ------------------------------------------------------------------
  // POINTS: Crew missions (requires auth)
  // ------------------------------------------------------------------
  app.get<{ Params: { id: string } }>(
    "/api/v1/flow/crews/:id/missions",
    { preHandler: authMiddleware },
    async (request) => {
      const { id } = request.params;
      const missions = await core.getCrewMissions(id);
      return { missions };
    },
  );

  // ------------------------------------------------------------------
  // FLOW: Leave crew (requires auth)
  // ------------------------------------------------------------------
  app.delete<{ Params: { id: string } }>(
    "/api/v1/flow/crews/:id/leave",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      if (!flowPlugin || !flowCfg) {
        return { ok: false, error: "Flow plugin not configured" };
      }

      const result = await flowPlugin.execute("crew-leave", {
        action: "crew-leave",
        user_id: jwt.sub,
        group_id: request.params.id,
      }, { userId: jwt.sub, platform: jwt.platform, config: {} as any });

      return { ok: true, message: result };
    },
  );

  // ------------------------------------------------------------------
  // FLOW: Discover all crews (public, no auth required)
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/flow/crews/discover",
    async () => {
      if (!flowPlugin || !flowCfg) {
        return { crews: [] };
      }

      const result = await flowPlugin.execute("crew-browse", {
        action: "crew-browse",
      }, { userId: "", platform: "telegram", config: {} as any });

      let crews: any[] = [];
      try {
        crews = JSON.parse(result);
      } catch {
        crews = [];
      }

      // Enrich with member counts
      const cfg = getSupabaseConfig();
      if (cfg && crews.length) {
        for (const crew of crews) {
          const members = await sbFetch<any[]>(
            cfg,
            `flowb_group_members?group_id=eq.${crew.id}&select=user_id`,
          );
          crew.member_count = members?.length || 0;
        }
      }

      return { crews };
    },
  );

  // ------------------------------------------------------------------
  // FLOW: Remove member from crew (admin, requires auth)
  // ------------------------------------------------------------------
  app.delete<{ Params: { id: string; userId: string } }>(
    "/api/v1/flow/crews/:id/members/:userId",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      if (!flowPlugin || !flowCfg) {
        return { ok: false, error: "Flow plugin not configured" };
      }

      const result = await flowPlugin.execute("crew-remove-member", {
        action: "crew-remove-member",
        user_id: jwt.sub,
        group_id: request.params.id,
        friend_id: request.params.userId,
      }, { userId: jwt.sub, platform: jwt.platform, config: {} as any });

      return { ok: true, message: result };
    },
  );

  // ------------------------------------------------------------------
  // FLOW: Update member role (promote/demote, requires auth)
  // ------------------------------------------------------------------
  app.patch<{ Params: { id: string; userId: string }; Body: { role: string } }>(
    "/api/v1/flow/crews/:id/members/:userId",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      if (!flowPlugin || !flowCfg) {
        return { ok: false, error: "Flow plugin not configured" };
      }

      const action = request.body.role === "admin" ? "crew-promote" : "crew-demote";
      const result = await flowPlugin.execute(action, {
        action,
        user_id: jwt.sub,
        group_id: request.params.id,
        friend_id: request.params.userId,
      }, { userId: jwt.sub, platform: jwt.platform, config: {} as any });

      return { ok: true, message: result };
    },
  );

  // ------------------------------------------------------------------
  // FLOW: Edit crew details (requires auth, admin only)
  // ------------------------------------------------------------------
  app.patch<{ Params: { id: string }; Body: { name?: string; emoji?: string; description?: string } }>(
    "/api/v1/flow/crews/:id",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { ok: false, error: "Not configured" };

      // Verify caller is admin/creator
      const membership = await sbFetch<any[]>(
        cfg,
        `flowb_group_members?group_id=eq.${request.params.id}&user_id=eq.${jwt.sub}&select=role&limit=1`,
      );
      if (!membership?.length || !["creator", "admin"].includes(membership[0].role)) {
        return { ok: false, error: "Only crew admins can edit crew details" };
      }

      const updates: Record<string, any> = {};
      if (request.body.name) updates.name = request.body.name;
      if (request.body.emoji) updates.emoji = request.body.emoji;
      if (request.body.description !== undefined) updates.description = request.body.description;

      if (Object.keys(updates).length === 0) {
        return { ok: false, error: "Nothing to update" };
      }

      await sbFetch(cfg, `flowb_groups?id=eq.${request.params.id}`, {
        method: "PATCH",
        headers: {
          apikey: cfg.supabaseKey,
          Authorization: `Bearer ${cfg.supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(updates),
      });

      return { ok: true };
    },
  );

  // ------------------------------------------------------------------
  // FLOW: Crew activity feed - historical checkins (requires auth)
  // ------------------------------------------------------------------
  app.get<{ Params: { id: string } }>(
    "/api/v1/flow/crews/:id/activity",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const { id } = request.params;
      const cfg = getSupabaseConfig();
      if (!cfg) return { activity: [] };

      // Verify membership
      const membership = await sbFetch<any[]>(
        cfg,
        `flowb_group_members?group_id=eq.${id}&user_id=eq.${jwt.sub}&select=role&limit=1`,
      );
      if (!membership?.length) {
        return { activity: [] };
      }

      // Get recent checkins (last 50, including expired)
      const checkins = await sbFetch<any[]>(
        cfg,
        `flowb_checkins?crew_id=eq.${id}&select=user_id,venue_name,status,message,created_at&order=created_at.desc&limit=50`,
      );

      // Resolve display names
      const userIds = [...new Set((checkins || []).map((c: any) => c.user_id))];
      const sessions = userIds.length
        ? await sbFetch<any[]>(cfg, `flowb_sessions?user_id=in.(${userIds.join(",")})&select=user_id,display_name`)
        : [];
      const nameMap = new Map((sessions || []).map((s) => [s.user_id, s.display_name]));

      return {
        activity: (checkins || []).map((c: any) => ({
          ...c,
          display_name: nameMap.get(c.user_id) || undefined,
        })),
      };
    },
  );


  // ------------------------------------------------------------------
  // LOCATIONS: Resolve QR code (no auth)
  // ------------------------------------------------------------------
  app.get<{ Params: { code: string } }>(
    "/api/v1/locations/:code",
    async (request, reply) => {
      const { code } = request.params;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });

      const rows = await sbFetch<any[]>(cfg, `flowb_locations?code=eq.${code}&active=eq.true&limit=1`);
      if (!rows?.length) {
        return reply.status(404).send({ error: "Location not found" });
      }

      const loc = rows[0];
      return {
        code: loc.code,
        name: loc.name,
        description: loc.description || undefined,
        latitude: loc.latitude || undefined,
        longitude: loc.longitude || undefined,
        floor: loc.floor || undefined,
        zone: loc.zone || undefined,
      };
    },
  );

  // ------------------------------------------------------------------
  // FLOW: QR check-in (requires auth)
  // ------------------------------------------------------------------
  app.post<{
    Body: { locationCode: string; crewId?: string };
  }>(
    "/api/v1/flow/checkin/qr",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const { locationCode, crewId } = request.body || {};
      const cfg = getSupabaseConfig();

      if (!cfg || !locationCode) {
        return reply.status(400).send({ error: "Missing locationCode" });
      }

      // Resolve the location
      const locRows = await sbFetch<any[]>(cfg, `flowb_locations?code=eq.${locationCode}&active=eq.true&limit=1`);
      if (!locRows?.length) {
        return reply.status(404).send({ error: "Location not found" });
      }
      const loc = locRows[0];

      // Determine which crews to check into
      let crewIds: string[] = [];
      if (crewId) {
        crewIds = [crewId];
      } else {
        // Auto-check into all user's crews
        const memberships = await sbFetch<any[]>(cfg, `flowb_group_members?user_id=eq.${jwt.sub}&select=group_id`);
        crewIds = (memberships || []).map((m: any) => m.group_id);
      }

      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const checkins: any[] = [];

      for (const cid of crewIds) {
        const checkin = await sbPost(cfg, "flowb_checkins", {
          user_id: jwt.sub,
          platform: jwt.platform,
          crew_id: cid,
          venue_name: loc.name,
          status: "here",
          latitude: loc.latitude || null,
          longitude: loc.longitude || null,
          location_id: loc.id,
          expires_at: expiresAt,
        });
        if (checkin) checkins.push(checkin);

        // Notify crew members (background)
        const notCtx = getNotifyContext();
        if (notCtx) {
          const crewRow = await sbFetch<any[]>(cfg, `flowb_groups?id=eq.${cid}&select=name,emoji&limit=1`);
          const cName = crewRow?.[0]?.name || "crew";
          const cEmoji = crewRow?.[0]?.emoji || "";
          fireAndForget(notifyCrewCheckin(notCtx, jwt.sub, cid, cName, cEmoji, loc.name), "notify crew checkin");
        }
      }

      // Award QR checkin points (10 pts, higher than manual)
      fireAndForget(core.awardPoints(jwt.sub, jwt.platform, "qr_checkin"), "award points");

      return {
        ok: true,
        location: { code: loc.code, name: loc.name },
        checkins: checkins.length,
      };
    },
  );

  // ------------------------------------------------------------------
  // FLOW: Crew member locations (requires auth, member only)
  // ------------------------------------------------------------------
  app.get<{ Params: { id: string } }>(
    "/api/v1/flow/crews/:id/locations",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const { id } = request.params;
      const cfg = getSupabaseConfig();
      if (!cfg) return { locations: [] };

      // Verify membership
      const membership = await sbFetch<any[]>(
        cfg,
        `flowb_group_members?group_id=eq.${id}&user_id=eq.${jwt.sub}&select=role&limit=1`,
      );
      if (!membership?.length) {
        return { locations: [] };
      }

      // Get active checkins (not expired)
      const now = new Date().toISOString();
      const checkins = await sbFetch<any[]>(
        cfg,
        `flowb_checkins?crew_id=eq.${id}&expires_at=gt.${now}&select=user_id,venue_name,status,message,latitude,longitude,created_at&order=created_at.desc`,
      );

      // Resolve display names
      const userIds = [...new Set((checkins || []).map((c: any) => c.user_id))];
      const sessions = userIds.length
        ? await sbFetch<any[]>(cfg, `flowb_sessions?user_id=in.(${userIds.join(",")})&select=user_id,display_name`)
        : [];
      const nameMap = new Map((sessions || []).map((s) => [s.user_id, s.display_name]));

      return {
        locations: (checkins || []).map((c: any) => ({
          user_id: c.user_id,
          display_name: nameMap.get(c.user_id) || undefined,
          venue_name: c.venue_name,
          status: c.status,
          message: c.message || undefined,
          latitude: c.latitude || undefined,
          longitude: c.longitude || undefined,
          created_at: c.created_at,
        })),
      };
    },
  );

  // ------------------------------------------------------------------
  // FLOW: "Where are you?" ping (requires auth, any member)
  // ------------------------------------------------------------------
  app.post<{ Params: { id: string } }>(
    "/api/v1/flow/crews/:id/locate",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const { id } = request.params;
      const cfg = getSupabaseConfig();
      if (!cfg) return { pinged: 0 };

      // Verify membership
      const membership = await sbFetch<any[]>(
        cfg,
        `flowb_group_members?group_id=eq.${id}&user_id=eq.${jwt.sub}&select=role&limit=1`,
      );
      if (!membership?.length) {
        return { pinged: 0 };
      }

      // Get all members
      const members = await sbFetch<any[]>(
        cfg,
        `flowb_group_members?group_id=eq.${id}&select=user_id`,
      );

      // Get members with active checkins
      const now = new Date().toISOString();
      const activeCheckins = await sbFetch<any[]>(
        cfg,
        `flowb_checkins?crew_id=eq.${id}&expires_at=gt.${now}&select=user_id`,
      );
      const activeSet = new Set((activeCheckins || []).map((c: any) => c.user_id));

      // Find members WITHOUT active checkin (excluding self)
      const missingMembers = (members || [])
        .filter((m: any) => m.user_id !== jwt.sub && !activeSet.has(m.user_id))
        .map((m: any) => m.user_id);

      // Send locate ping notifications
      const notCtx = getNotifyContext();
      if (notCtx && missingMembers.length) {
        const crewRow = await sbFetch<any[]>(cfg, `flowb_groups?id=eq.${id}&select=name,emoji&limit=1`);
        const cName = crewRow?.[0]?.name || "crew";
        const cEmoji = crewRow?.[0]?.emoji || "";
        fireAndForget(notifyCrewLocate(notCtx, jwt.sub, id, cName, cEmoji, missingMembers), "notify crew locate");
      }

      return { pinged: missingMembers.length };
    },
  );

  // ------------------------------------------------------------------
  // FLOW: Crew messages - get (requires auth)
  // ------------------------------------------------------------------
  app.get<{ Params: { crewId: string }; Querystring: { limit?: string; before?: string } }>(
    "/api/v1/flow/crews/:crewId/messages",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const { crewId } = request.params;
      const cfg = getSupabaseConfig();
      if (!cfg) return { messages: [] };

      // Verify membership
      const membership = await sbFetch<any[]>(
        cfg,
        `flowb_group_members?group_id=eq.${crewId}&user_id=eq.${jwt.sub}&select=role&limit=1`,
      );
      if (!membership?.length) {
        return reply.status(403).send({ error: "Not a member of this crew" });
      }

      const limit = Math.min(parseInt(request.query.limit || "50", 10), 100);

      // UUID-based cursor pagination: look up the created_at of the cursor message
      let cursorFilter = "";
      if (request.query.before) {
        const cursorRow = await sbFetch<any[]>(
          cfg,
          `flowb_crew_messages?id=eq.${request.query.before}&select=created_at&limit=1`,
        );
        if (cursorRow?.length) {
          cursorFilter = `&created_at=lt.${cursorRow[0].created_at}`;
        }
      }

      const query = `flowb_crew_messages?crew_id=eq.${crewId}&select=id,crew_id,user_id,display_name,message,reply_to,created_at&order=created_at.desc&limit=${limit}${cursorFilter}`;
      const messages = await sbFetch<any[]>(cfg, query);

      // Resolve display names from sessions (supplement stored display_name)
      const userIds = [...new Set((messages || []).map((m: any) => m.user_id))];
      const sessions = userIds.length
        ? await sbFetch<any[]>(cfg, `flowb_sessions?user_id=in.(${userIds.join(",")})&select=user_id,display_name`)
        : [];
      const nameMap = new Map((sessions || []).map((s) => [s.user_id, s.display_name]));

      return {
        messages: (messages || []).map((m: any) => ({
          ...m,
          display_name: m.display_name || nameMap.get(m.user_id) || undefined,
        })),
      };
    },
  );

  // ------------------------------------------------------------------
  // FLOW: Crew messages - send (requires auth)
  // ------------------------------------------------------------------
  app.post<{ Params: { crewId: string }; Body: { message: string; replyTo?: string } }>(
    "/api/v1/flow/crews/:crewId/messages",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const { crewId } = request.params;
      const { message: text, replyTo } = request.body || {};
      const cfg = getSupabaseConfig();

      if (!cfg) {
        return reply.status(500).send({ error: "Not configured" });
      }

      // Validate message length (1-500 chars)
      const trimmed = (text || "").trim();
      if (!trimmed || trimmed.length < 1) {
        return reply.status(400).send({ error: "Message is required" });
      }
      if (trimmed.length > 500) {
        return reply.status(400).send({ error: "Message must be 500 characters or fewer" });
      }

      // Verify membership
      const membership = await sbFetch<any[]>(
        cfg,
        `flowb_group_members?group_id=eq.${crewId}&user_id=eq.${jwt.sub}&select=role&limit=1`,
      );
      if (!membership?.length) {
        return reply.status(403).send({ error: "Not a member of this crew" });
      }

      // Resolve sender display name from profile
      const sessions = await sbFetch<any[]>(
        cfg,
        `flowb_sessions?user_id=eq.${jwt.sub}&select=display_name&limit=1`,
      );
      const displayName = sessions?.[0]?.display_name || undefined;

      // Insert message
      const msg = await sbPost(cfg, "flowb_crew_messages", {
        crew_id: crewId,
        user_id: jwt.sub,
        display_name: displayName || null,
        message: trimmed,
        reply_to: replyTo || null,
      });

      if (!msg) {
        return reply.status(500).send({ error: "Failed to send message" });
      }

      // Award points
      fireAndForget(core.awardPoints(jwt.sub, jwt.platform, "crew_message"), "award points");

      // Notify crew members (background, don't block response)
      const crewRow = await sbFetch<any[]>(cfg, `flowb_groups?id=eq.${crewId}&select=name,emoji&limit=1`);
      if (crewRow?.[0]) {
        const notifyCtx = { supabase: cfg, botToken: process.env.FLOWB_TELEGRAM_BOT_TOKEN };
        fireAndForget(notifyCrewMessage(notifyCtx, jwt.sub, crewId, crewRow[0].name || "Crew", crewRow[0].emoji || "", trimmed), "notify crew message");
      }

      return {
        message: {
          ...msg,
          display_name: msg.display_name || displayName || undefined,
        },
      };
    },
  );

  // ------------------------------------------------------------------
  // CREW BIZ: Get crew biz settings (requires auth, admin)
  // ------------------------------------------------------------------
  app.get<{ Params: { id: string } }>(
    "/api/v1/flow/crews/:id/biz-settings",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const { id } = request.params;
      const cfg = getSupabaseConfig();
      if (!cfg) return { settings: null };

      // Verify membership
      const membership = await sbFetch<any[]>(
        cfg,
        `flowb_group_members?group_id=eq.${id}&user_id=eq.${jwt.sub}&select=role&limit=1`,
      );
      if (!membership?.length) return { error: "Not a member" };

      const crew = await sbFetch<any[]>(
        cfg,
        `flowb_groups?id=eq.${id}&select=biz_enabled,share_locations,share_leads,share_meetings,share_referrals,share_earnings,share_pipeline,notify_lead_updates,notify_meeting_updates,notify_checkins,notify_wins&limit=1`,
      );

      // Also get member's personal settings
      const memberSettings = await sbFetch<any[]>(
        cfg,
        `flowb_crew_member_settings?crew_id=eq.${id}&user_id=eq.${jwt.sub}&limit=1`,
      );

      return {
        settings: crew?.[0] || {},
        memberSettings: memberSettings?.[0] || null,
        role: membership[0].role,
      };
    },
  );

  // ------------------------------------------------------------------
  // CREW BIZ: Update crew biz settings (requires auth, admin/creator)
  // ------------------------------------------------------------------
  app.patch<{ Params: { id: string }; Body: Record<string, any> }>(
    "/api/v1/flow/crews/:id/biz-settings",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const { id } = request.params;
      const cfg = getSupabaseConfig();
      if (!cfg) return { ok: false, error: "Not configured" };

      const membership = await sbFetch<any[]>(
        cfg,
        `flowb_group_members?group_id=eq.${id}&user_id=eq.${jwt.sub}&select=role&limit=1`,
      );
      if (!membership?.length || !["creator", "admin"].includes(membership[0].role)) {
        return { ok: false, error: "Only crew admins can update biz settings" };
      }

      const allowed = [
        "biz_enabled", "share_locations", "share_leads", "share_meetings",
        "share_referrals", "share_earnings", "share_pipeline",
        "notify_lead_updates", "notify_meeting_updates", "notify_checkins", "notify_wins",
      ];
      const updates: Record<string, any> = {};
      for (const key of allowed) {
        if (request.body[key] !== undefined) updates[key] = request.body[key];
      }

      if (Object.keys(updates).length === 0) {
        return { ok: false, error: "Nothing to update" };
      }

      await sbFetch(cfg, `flowb_groups?id=eq.${id}`, {
        method: "PATCH",
        headers: {
          apikey: cfg.supabaseKey,
          Authorization: `Bearer ${cfg.supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(updates),
      });

      return { ok: true };
    },
  );

  // ------------------------------------------------------------------
  // CREW BIZ: Update member personal settings (requires auth)
  // ------------------------------------------------------------------
  app.patch<{ Params: { id: string }; Body: Record<string, any> }>(
    "/api/v1/flow/crews/:id/my-settings",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const { id } = request.params;
      const cfg = getSupabaseConfig();
      if (!cfg) return { ok: false, error: "Not configured" };

      const allowed = ["share_my_location", "share_my_leads", "share_my_meetings", "mute_notifications"];
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      for (const key of allowed) {
        if (request.body[key] !== undefined) updates[key] = request.body[key];
      }

      // Upsert member settings
      await sbFetch(cfg, "flowb_crew_member_settings", {
        method: "POST",
        headers: {
          apikey: cfg.supabaseKey,
          Authorization: `Bearer ${cfg.supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({ crew_id: id, user_id: jwt.sub, ...updates }),
      });

      return { ok: true };
    },
  );

  // ------------------------------------------------------------------
  // CREW BIZ: Share meeting with all crew members
  // ------------------------------------------------------------------
  app.post<{ Params: { id: string; meetingId: string } }>(
    "/api/v1/flow/crews/:id/share-meeting/:meetingId",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const { id, meetingId } = request.params;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });
      if (!meetingPlugin || !meetingCfg) return reply.status(503).send({ error: "Meetings not configured" });

      // Verify membership
      const membership = await sbFetch<any[]>(cfg, `flowb_group_members?group_id=eq.${id}&user_id=eq.${jwt.sub}&select=role&limit=1`);
      if (!membership?.length) return reply.status(403).send({ error: "Not a member" });

      // Check share_meetings setting
      const crew = await sbFetch<any[]>(cfg, `flowb_groups?id=eq.${id}&select=share_meetings&limit=1`);
      if (!crew?.[0]?.share_meetings) return reply.status(403).send({ error: "Meeting sharing is disabled for this crew" });

      // Fetch meeting + build share link
      const meeting = await meetingPlugin.getById(meetingCfg, meetingId);
      if (!meeting) return reply.status(404).send({ error: "Meeting not found" });
      const shareLink = meetingPlugin.getShareLink(meeting.share_code);

      // Get crew member user_ids (excluding sender)
      const members = await sbFetch<any[]>(cfg, `flowb_group_members?group_id=eq.${id}&select=user_id`);
      const memberIds = (members || []).map((m: any) => m.user_id).filter((uid: string) => uid !== jwt.sub);

      // Notify via existing cross-platform notification system
      const notifyCtx = { supabase: cfg, botToken: process.env.FLOWB_TELEGRAM_BOT_TOKEN };
      const sent = await notifyMeetingInvite(notifyCtx, jwt.sub, meetingId, meeting.title, shareLink, memberIds);

      fireAndForget(core.awardPoints(jwt.sub, jwt.platform || "web", "meeting_shared"), "award points");

      return { shared: true, members_notified: sent, share_link: shareLink };
    },
  );

  // ------------------------------------------------------------------
  // CREW BIZ: Get crew activity feed (requires auth, member)
  // ------------------------------------------------------------------
  app.get<{ Params: { id: string }; Querystring: { limit?: string; before?: string; type?: string } }>(
    "/api/v1/flow/crews/:id/biz-feed",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const { id } = request.params;
      const cfg = getSupabaseConfig();
      if (!cfg) return { activities: [] };

      const membership = await sbFetch<any[]>(
        cfg,
        `flowb_group_members?group_id=eq.${id}&user_id=eq.${jwt.sub}&select=role&limit=1`,
      );
      if (!membership?.length) return { error: "Not a member" };

      const limit = Math.min(parseInt(request.query.limit || "30"), 100);
      let query = `flowb_crew_activities?crew_id=eq.${id}&select=id,user_id,display_name,activity_type,title,description,metadata,created_at&order=created_at.desc&limit=${limit}`;

      if (request.query.before) {
        query += `&created_at=lt.${request.query.before}`;
      }
      if (request.query.type) {
        query += `&activity_type=eq.${request.query.type}`;
      }

      const activities = await sbFetch<any[]>(cfg, query);
      return { activities: activities || [] };
    },
  );

  // ------------------------------------------------------------------
  // CREW BIZ: Post activity to crew feed (requires auth, member)
  // ------------------------------------------------------------------
  app.post<{ Params: { id: string }; Body: { activity_type: string; title: string; description?: string; metadata?: Record<string, any> } }>(
    "/api/v1/flow/crews/:id/biz-feed",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const { id } = request.params;
      const cfg = getSupabaseConfig();
      if (!cfg) return { ok: false };

      // Verify membership
      const membership = await sbFetch<any[]>(
        cfg,
        `flowb_group_members?group_id=eq.${id}&user_id=eq.${jwt.sub}&select=role&limit=1`,
      );
      if (!membership?.length) return { error: "Not a member" };

      // Get display name
      const session = await sbFetch<any[]>(
        cfg,
        `flowb_sessions?user_id=eq.${jwt.sub}&select=display_name&limit=1`,
      );

      const activity = await sbPost(cfg, "flowb_crew_activities", {
        crew_id: id,
        user_id: jwt.sub,
        display_name: session?.[0]?.display_name || jwt.sub,
        activity_type: request.body.activity_type,
        title: request.body.title,
        description: request.body.description || null,
        metadata: request.body.metadata || {},
      });

      return { ok: true, activity };
    },
  );

  // ------------------------------------------------------------------
  // CREW BIZ: Share lead with crew (requires auth, member)
  // ------------------------------------------------------------------
  app.post<{ Params: { id: string }; Body: { lead_id: string; visibility?: string } }>(
    "/api/v1/flow/crews/:id/share-lead",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const { id } = request.params;
      const cfg = getSupabaseConfig();
      if (!cfg) return { ok: false };

      // Verify membership
      const membership = await sbFetch<any[]>(
        cfg,
        `flowb_group_members?group_id=eq.${id}&user_id=eq.${jwt.sub}&select=role&limit=1`,
      );
      if (!membership?.length) return { error: "Not a member" };

      // Check crew has share_leads enabled
      const crew = await sbFetch<any[]>(
        cfg,
        `flowb_groups?id=eq.${id}&select=share_leads&limit=1`,
      );
      if (!crew?.[0]?.share_leads) {
        return { ok: false, error: "Lead sharing is not enabled for this crew" };
      }

      await sbFetch(cfg, "flowb_crew_leads", {
        method: "POST",
        headers: {
          apikey: cfg.supabaseKey,
          Authorization: `Bearer ${cfg.supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          crew_id: id,
          lead_id: request.body.lead_id,
          shared_by: jwt.sub,
          visibility: request.body.visibility || "team",
        }),
      });

      // Post activity
      const session = await sbFetch<any[]>(
        cfg,
        `flowb_sessions?user_id=eq.${jwt.sub}&select=display_name&limit=1`,
      );
      const lead = await sbFetch<any[]>(
        cfg,
        `flowb_leads?id=eq.${request.body.lead_id}&select=name,company&limit=1`,
      );

      await sbPost(cfg, "flowb_crew_activities", {
        crew_id: id,
        user_id: jwt.sub,
        display_name: session?.[0]?.display_name || jwt.sub,
        activity_type: "lead_shared",
        title: `Shared lead: ${lead?.[0]?.name || "Unknown"}`,
        description: lead?.[0]?.company ? `Company: ${lead[0].company}` : null,
        metadata: { lead_id: request.body.lead_id },
      });

      return { ok: true };
    },
  );

  // ------------------------------------------------------------------
  // CREW BIZ: Get shared leads for crew (requires auth, member)
  // ------------------------------------------------------------------
  app.get<{ Params: { id: string } }>(
    "/api/v1/flow/crews/:id/shared-leads",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const { id } = request.params;
      const cfg = getSupabaseConfig();
      if (!cfg) return { leads: [] };

      const membership = await sbFetch<any[]>(
        cfg,
        `flowb_group_members?group_id=eq.${id}&user_id=eq.${jwt.sub}&select=role&limit=1`,
      );
      if (!membership?.length) return { error: "Not a member" };

      const sharedLeads = await sbFetch<any[]>(
        cfg,
        `flowb_crew_leads?crew_id=eq.${id}&select=lead_id,shared_by,visibility,created_at,flowb_leads(id,name,email,company,stage,value,created_at,updated_at)&order=created_at.desc`,
      );

      return {
        leads: (sharedLeads || []).map((sl: any) => ({
          ...sl.flowb_leads,
          shared_by: sl.shared_by,
          visibility: sl.visibility,
          shared_at: sl.created_at,
        })),
      };
    },
  );

  // ------------------------------------------------------------------
  // CREW BIZ: Get crew pipeline summary (requires auth, member)
  // ------------------------------------------------------------------
  app.get<{ Params: { id: string } }>(
    "/api/v1/flow/crews/:id/pipeline",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const { id } = request.params;
      const cfg = getSupabaseConfig();
      if (!cfg) return { pipeline: {} };

      const membership = await sbFetch<any[]>(
        cfg,
        `flowb_group_members?group_id=eq.${id}&user_id=eq.${jwt.sub}&select=role&limit=1`,
      );
      if (!membership?.length) return { error: "Not a member" };

      // Check if pipeline sharing enabled
      const crew = await sbFetch<any[]>(
        cfg,
        `flowb_groups?id=eq.${id}&select=share_pipeline&limit=1`,
      );
      if (!crew?.[0]?.share_pipeline) {
        return { ok: false, error: "Pipeline sharing is not enabled for this crew" };
      }

      // Get all members
      const members = await sbFetch<any[]>(
        cfg,
        `flowb_group_members?group_id=eq.${id}&select=user_id`,
      );
      const memberIds = (members || []).map((m: any) => m.user_id);

      if (!memberIds.length) return { pipeline: {}, stats: {} };

      // Get all leads for crew members
      const leads = await sbFetch<any[]>(
        cfg,
        `flowb_leads?user_id=in.(${memberIds.join(",")})&select=id,name,company,stage,value,user_id,created_at,updated_at&order=updated_at.desc`,
      );

      // Group by stage
      const pipeline: Record<string, any[]> = {};
      let totalValue = 0;
      for (const lead of leads || []) {
        if (!pipeline[lead.stage]) pipeline[lead.stage] = [];
        pipeline[lead.stage].push(lead);
        totalValue += lead.value || 0;
      }

      return {
        pipeline,
        stats: {
          total_leads: (leads || []).length,
          total_value: totalValue,
          members: memberIds.length,
        },
      };
    },
  );

  // ------------------------------------------------------------------
  // MEETINGS: CRUD + share links
  // ------------------------------------------------------------------

  const meetingPlugin = core.getMeetingPlugin();
  const meetingCfg = core.getMeetingConfig();

  // Create meeting
  app.post<{ Body: { title: string; description?: string; starts_at: string; duration_min?: number; location?: string; meeting_type?: string; notes?: string } }>(
    "/api/v1/meetings",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!meetingPlugin || !meetingCfg) return reply.status(503).send({ error: "Meetings not configured" });
      const jwt = request.jwtPayload!;
      const { title, description, starts_at, duration_min, location, meeting_type, notes } = request.body || {};
      if (!title || !starts_at) return reply.status(400).send({ error: "title and starts_at required" });

      const result = await meetingPlugin.create(meetingCfg, jwt.sub, {
        action: "meeting-create",
        user_id: jwt.sub,
        meeting_title: title,
        meeting_description: description,
        meeting_starts_at: starts_at,
        meeting_duration: duration_min,
        meeting_location: location,
        meeting_type: meeting_type,
        meeting_notes: notes,
      });

      try {
        const parsed = JSON.parse(result);
        fireAndForget(core.awardPoints(jwt.sub, jwt.platform, "meeting_created"), "award points");
        return parsed;
      } catch {
        return reply.status(500).send({ error: result });
      }
    },
  );

  // List meetings
  app.get<{ Querystring: { filter?: string } }>(
    "/api/v1/meetings",
    { preHandler: authMiddleware },
    async (request) => {
      if (!meetingPlugin || !meetingCfg) return { meetings: [] };
      const jwt = request.jwtPayload!;
      const result = await meetingPlugin.list(meetingCfg, jwt.sub, {
        action: "meeting-list",
        meeting_filter: request.query.filter || "upcoming",
      });
      try {
        return JSON.parse(result);
      } catch {
        return { meetings: [] };
      }
    },
  );

  // Meeting detail
  app.get<{ Params: { id: string } }>(
    "/api/v1/meetings/:id",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!meetingPlugin || !meetingCfg) return reply.status(503).send({ error: "Not configured" });
      const result = await meetingPlugin.detail(meetingCfg, request.params.id);
      try {
        return JSON.parse(result);
      } catch {
        return reply.status(404).send({ error: result });
      }
    },
  );

  // Update meeting
  app.patch<{ Params: { id: string }; Body: { title?: string; description?: string; starts_at?: string; duration_min?: number; location?: string; meeting_type?: string; notes?: string } }>(
    "/api/v1/meetings/:id",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!meetingPlugin || !meetingCfg) return reply.status(503).send({ error: "Not configured" });
      const jwt = request.jwtPayload!;
      const { title, description, starts_at, duration_min, location, meeting_type, notes } = request.body || {};
      const result = await meetingPlugin.update(meetingCfg, jwt.sub, {
        action: "meeting-update",
        user_id: jwt.sub,
        meeting_id: request.params.id,
        meeting_title: title,
        meeting_description: description,
        meeting_starts_at: starts_at,
        meeting_duration: duration_min,
        meeting_location: location,
        meeting_type: meeting_type,
        meeting_notes: notes,
      });
      return { success: result === "Meeting updated.", message: result };
    },
  );

  // Cancel meeting (soft delete)
  app.delete<{ Params: { id: string } }>(
    "/api/v1/meetings/:id",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!meetingPlugin || !meetingCfg) return reply.status(503).send({ error: "Not configured" });
      const jwt = request.jwtPayload!;
      const result = await meetingPlugin.cancel(meetingCfg, jwt.sub, request.params.id);
      return { success: !result.includes("not found"), message: result };
    },
  );

  // Invite attendee
  app.post<{ Params: { id: string }; Body: { user_id?: string; name?: string; email?: string } }>(
    "/api/v1/meetings/:id/invite",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!meetingPlugin || !meetingCfg) return reply.status(503).send({ error: "Not configured" });
      const jwt = request.jwtPayload!;
      const { user_id: inviteeId, name, email } = request.body || {};
      const result = await meetingPlugin.invite(meetingCfg, jwt.sub, {
        action: "meeting-invite",
        user_id: jwt.sub,
        meeting_id: request.params.id,
        friend_id: inviteeId,
        attendee_name: name,
        attendee_email: email,
      });
      try {
        return JSON.parse(result);
      } catch {
        return reply.status(400).send({ error: result });
      }
    },
  );

  // Meeting messages - get
  app.get<{ Params: { id: string }; Querystring: { limit?: string; before?: string } }>(
    "/api/v1/meetings/:id/messages",
    { preHandler: authMiddleware },
    async (request) => {
      if (!meetingCfg) return { messages: [] };
      const cfg = getSupabaseConfig();
      if (!cfg) return { messages: [] };

      const limit = Math.min(parseInt(request.query.limit || "50", 10), 100);
      let cursorFilter = "";
      if (request.query.before) {
        const cursorRow = await sbFetch<any[]>(cfg, `flowb_meeting_messages?id=eq.${request.query.before}&select=created_at&limit=1`);
        if (cursorRow?.length) {
          cursorFilter = `&created_at=lt.${cursorRow[0].created_at}`;
        }
      }

      const query = `flowb_meeting_messages?meeting_id=eq.${request.params.id}&select=id,meeting_id,user_id,display_name,message,created_at&order=created_at.desc&limit=${limit}${cursorFilter}`;
      const messages = await sbFetch<any[]>(cfg, query);
      return { messages: messages || [] };
    },
  );

  // Meeting messages - send
  app.post<{ Params: { id: string }; Body: { message: string } }>(
    "/api/v1/meetings/:id/messages",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!meetingPlugin || !meetingCfg) return reply.status(503).send({ error: "Not configured" });
      const jwt = request.jwtPayload!;
      const { message: text } = request.body || {};
      const trimmed = (text || "").trim();
      if (!trimmed || trimmed.length > 500) {
        return reply.status(400).send({ error: "Message must be 1-500 characters" });
      }

      const result = await meetingPlugin.chat(meetingCfg, jwt.sub, {
        action: "meeting-chat",
        user_id: jwt.sub,
        meeting_id: request.params.id,
        message_content: trimmed,
      });

      try {
        const parsed = JSON.parse(result);
        if (parsed.type === "meeting_message_sent") {
          // Notify meeting attendees
          const cfg = getSupabaseConfig();
          if (cfg) {
            const notifyCtx = { supabase: cfg, botToken: process.env.FLOWB_TELEGRAM_BOT_TOKEN };
            const meeting = await meetingPlugin.getById(meetingCfg, request.params.id);
            if (meeting) {
              fireAndForget(
                notifyMeetingChat(notifyCtx, jwt.sub, request.params.id, meeting.title, trimmed),
                "notify meeting chat",
              );
            }
          }
          return parsed;
        }
        return reply.status(400).send({ error: result });
      } catch {
        return reply.status(400).send({ error: result });
      }
    },
  );

  // Public share link resolve (no auth)
  app.get<{ Params: { code: string } }>(
    "/api/v1/m/:code",
    async (request, reply) => {
      if (!meetingPlugin || !meetingCfg) return reply.status(503).send({ error: "Not configured" });
      const result = await meetingPlugin.resolveLink(meetingCfg, request.params.code);
      try {
        return JSON.parse(result);
      } catch {
        return reply.status(404).send({ error: "Meeting not found" });
      }
    },
  );

  // Public RSVP via share code
  app.post<{ Params: { code: string }; Body: { user_id?: string; name?: string; rsvp_status?: string } }>(
    "/api/v1/m/:code/rsvp",
    async (request, reply) => {
      if (!meetingPlugin || !meetingCfg) return reply.status(503).send({ error: "Not configured" });
      const { user_id: uid, name, rsvp_status } = request.body || {};

      if (uid) {
        const result = await meetingPlugin.rsvpByCode(meetingCfg, uid, request.params.code, rsvp_status || "accepted");
        if (result) {
          return { success: true, meeting: { id: result.meeting.id, title: result.meeting.title } };
        }
      } else if (name) {
        // Anonymous RSVP by name
        const meeting = await meetingPlugin.getByCode(meetingCfg, request.params.code);
        if (meeting) {
          await sbInsert(meetingCfg, "flowb_meeting_attendees", {
            meeting_id: meeting.id,
            name,
            rsvp_status: rsvp_status || "accepted",
          });
          return { success: true, meeting: { id: meeting.id, title: meeting.title } };
        }
      }

      return reply.status(404).send({ error: "Meeting not found or invalid request" });
    },
  );

  // ------------------------------------------------------------------
  // CHAT: AI Chat with tool calling (xAI Grok + FlowB tools)
  //
  // OpenAI-compatible /v1/chat/completions endpoint with function calling.
  // The AI can search events, locate friends/crew, update locations,
  // RSVP to events, share location codes, and check points.
  // Auth optional — logged-in users get full tool access.
  // ------------------------------------------------------------------
  app.post<{ Body: { messages: Array<{ role: string; content: string }>; model?: string; stream?: boolean; user?: string } }>(
    "/v1/chat/completions",
    async (request, reply) => {
      const apiKey = process.env.XAI_API_KEY;
      if (!apiKey) {
        return reply.status(503).send({ error: "Chat not configured" });
      }

      const cfg = getSupabaseConfig();
      const { messages = [] } = request.body || {};
      const model = "grok-3-mini-fast"; // always use valid xAI model
      if (!messages.length) {
        return reply.status(400).send({ error: "Missing messages" });
      }

      // Extract optional JWT for user context (enables location, crew, friend tools)
      const jwt = extractJwt(request);
      const userContext: UserContext = {
        userId: jwt?.sub || null,
        platform: jwt?.platform || null,
        displayName: null,
      };

      // Resolve display name for personalized responses
      if (jwt?.sub && cfg) {
        const sessions = await sbFetch<any[]>(cfg, `flowb_sessions?user_id=eq.${jwt.sub}&select=display_name&limit=1`);
        if (sessions?.[0]) {
          userContext.displayName = sessions[0].display_name || null;
        }
      }

      // Fallback: simple proxy if Supabase not configured (tools won't work)
      if (!cfg) {
        try {
          const res = await fetch("https://api.x.ai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model: model || "grok-3-mini-fast", messages: messages.slice(-25), max_tokens: 1024, temperature: 0.7 }),
          });
          if (!res.ok) return reply.status(502).send({ error: "AI service error" });
          return res.json();
        } catch {
          return reply.status(502).send({ error: "AI service unavailable" });
        }
      }

      try {
        // Map JWT platform to ChatConfig platform for formatting hints
        const chatPlatform = jwt?.platform === "telegram" ? "telegram" as const
          : jwt?.platform === "farcaster" ? "farcaster" as const
          : "web" as const;

        const result = await handleChat(messages, {
          sb: cfg,
          xaiKey: apiKey,
          user: userContext,
          model,
          platform: chatPlatform,
        });

        // Return OpenAI-compatible format for backward compat
        // Include persona metadata when FiFlow or other persona responded
        return {
          id: `chatcmpl-${Date.now()}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: model || "grok-3-mini-fast",
          choices: [{ index: 0, message: { role: result.role, content: result.content }, finish_reason: "stop" }],
          ...(result.persona ? { persona: result.persona } : {}),
        };
      } catch (err: any) {
        console.error("[ai-chat] handler failed:", err.message);
        return reply.status(502).send({ error: "AI service error" });
      }
    },
  );

  // ------------------------------------------------------------------
  // LOCATION: Update personal location (requires auth)
  //
  // Sets the user's current venue so friends/crew can find them.
  // Also broadcasts to all their crews automatically.
  // ------------------------------------------------------------------
  app.post<{ Body: { venue: string; message?: string; latitude?: number; longitude?: number } }>(
    "/api/v1/me/location",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const { venue, message, latitude, longitude } = request.body || {};
      const cfg = getSupabaseConfig();

      if (!cfg || !venue) return { ok: false, error: "Missing venue name" };

      const expiresAt = new Date(Date.now() + 4 * 3600_000).toISOString();

      // Personal check-in
      await sbPost(cfg, "flowb_checkins", {
        user_id: jwt.sub,
        platform: jwt.platform,
        crew_id: "__personal__",
        venue_name: venue,
        status: "here",
        message: message || null,
        latitude: latitude || null,
        longitude: longitude || null,
        expires_at: expiresAt,
      });

      // Broadcast to all user's crews
      const memberships = await sbFetch<any[]>(cfg, `flowb_group_members?user_id=eq.${jwt.sub}&select=group_id`);
      for (const m of memberships || []) {
        await sbPost(cfg, "flowb_checkins", {
          user_id: jwt.sub,
          platform: jwt.platform,
          crew_id: m.group_id,
          venue_name: venue,
          status: "here",
          message: message || null,
          latitude: latitude || null,
          longitude: longitude || null,
          expires_at: expiresAt,
        });

        // Notify crew members
        const notCtx = getNotifyContext();
        if (notCtx) {
          const crewRow = await sbFetch<any[]>(cfg, `flowb_groups?id=eq.${m.group_id}&select=name,emoji&limit=1`);
          const cName = crewRow?.[0]?.name || "crew";
          const cEmoji = crewRow?.[0]?.emoji || "";
          fireAndForget(notifyCrewCheckin(notCtx, jwt.sub, m.group_id, cName, cEmoji, venue), "notify crew checkin");
        }
      }

      return { ok: true, venue, expiresAt };
    },
  );

  // ------------------------------------------------------------------
  // FARCASTER: Notification webhook (verified via @farcaster/miniapp-node)
  // ------------------------------------------------------------------
  app.post(
    "/api/v1/notifications/farcaster/webhook",
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ ok: false });

      try {
        // Verify the webhook signature using Neynar
        const data = await parseWebhookEvent(
          request.body as any,
          verifyAppKeyWithNeynar,
        );

        const { fid, event } = data;

        if (event.event === "miniapp_added" || event.event === "notifications_enabled") {
          // User added the mini app or re-enabled notifications — store token
          const notif = event.notificationDetails;
          if (notif?.token && notif?.url) {
            await upsertNotificationToken(cfg, fid, notif.token, notif.url);
            console.log(`[fc-webhook] Stored notification token for fid=${fid}`);
          }
        } else if (event.event === "miniapp_removed" || event.event === "notifications_disabled") {
          // User removed the app or disabled notifications — invalidate tokens
          await disableNotificationToken(cfg, fid);
          console.log(`[fc-webhook] Disabled notifications for fid=${fid}`);
        }

        return { ok: true };
      } catch (err) {
        console.error("[fc-webhook] Verification/processing error:", err);
        return reply.status(400).send({ ok: false, error: "Invalid webhook" });
      }
    },
  );

  // ------------------------------------------------------------------
  // NEYNAR: Mention webhook (@flowb mentions on Farcaster)
  // ------------------------------------------------------------------
  app.post(
    "/api/v1/webhooks/neynar",
    async (request, reply) => {
      // Verify HMAC-SHA512 signature
      const secret = process.env.NEYNAR_WEBHOOK_SECRET;
      if (!secret) return reply.status(500).send({ ok: false, error: "Webhook secret not configured" });

      const signature = request.headers["x-neynar-signature"] as string;
      if (!signature) return reply.status(401).send({ ok: false, error: "Missing signature" });

      const { createHmac } = await import("node:crypto");
      const body = JSON.stringify(request.body);
      const expectedSig = createHmac("sha512", secret).update(body).digest("hex");

      if (signature !== expectedSig) {
        return reply.status(401).send({ ok: false, error: "Invalid signature" });
      }

      const payload = request.body as any;

      // Handle cast.created events mentioning @flowb
      if (payload?.type === "cast.created") {
        const cast = payload.data;
        if (!cast) return { ok: true };

        const cfg = getSupabaseConfig();
        if (!cfg) return { ok: true };

        const { handleMention } = await import("../services/farcaster-responder.js");

        handleMention({
          authorFid: cast.author?.fid,
          authorUsername: cast.author?.username || "",
          text: cast.text || "",
          castHash: cast.hash || "",
        }, { supabaseUrl: cfg.supabaseUrl, supabaseKey: cfg.supabaseKey }).catch((err: any) => {
          console.error("[neynar-webhook] handleMention error:", err);
        });
      }

      return { ok: true };
    },
  );

  // ------------------------------------------------------------------
  // PUSH TOKENS: Register / unregister Expo push tokens (mobile app)
  // ------------------------------------------------------------------

  app.post<{ Body: { push_token: string; device_type?: string; app_id?: string } }>(
    "/api/v1/me/push-token",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });

      const { push_token, device_type, app_id } = request.body || {};
      if (!push_token) return reply.status(400).send({ error: "Missing push_token" });

      // Upsert token (dedup on user_id + push_token)
      await sbPost(cfg, "flowb_push_tokens?on_conflict=user_id,push_token", {
        user_id: jwt.sub,
        push_token,
        device_type: device_type || "unknown",
        platform: jwt.platform || "app",
        active: true,
        updated_at: new Date().toISOString(),
        ...(app_id ? { app_id } : {}),
      }, "return=minimal,resolution=merge-duplicates");

      return { ok: true };
    },
  );

  app.delete(
    "/api/v1/me/push-token",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });

      const body = request.body as { push_token?: string } | undefined;
      const pushToken = body?.push_token;

      if (pushToken) {
        // Deactivate specific token
        await sbPatch(cfg, "flowb_push_tokens", {
          user_id: `eq.${jwt.sub}`,
          push_token: `eq.${pushToken}`,
        }, { active: false });
      } else {
        // Deactivate all tokens for this user (logout)
        await sbPatch(cfg, "flowb_push_tokens", {
          user_id: `eq.${jwt.sub}`,
        }, { active: false });
      }

      return { ok: true };
    },
  );

  // ------------------------------------------------------------------
  // NOTIFICATION FEED: Paginated notification history for FlowB VIP
  // ------------------------------------------------------------------

  app.get(
    "/api/v1/me/notifications",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });

      const qs = request.query as Record<string, string>;
      const limit = Math.min(parseInt(qs.limit || "50", 10), 100);
      const offset = parseInt(qs.offset || "0", 10);
      const unreadOnly = qs.unread === "true";
      const before = qs.before; // ISO 8601 cursor for keyset pagination

      let path = `flowb_notification_log?recipient_id=eq.${jwt.sub}&order=sent_at.desc&limit=${limit}&select=id,notification_type,reference_id,triggered_by,sent_at,title,body,priority,read_at,data`;
      if (before) {
        // Cursor-based pagination: fetch items older than the cursor
        path += `&sent_at=lt.${before}`;
      } else {
        // Fallback to offset-based pagination for backwards compatibility
        path += `&offset=${offset}`;
      }
      if (unreadOnly) path += "&read_at=is.null";

      const rows = await sbFetch<any[]>(cfg, path);

      // Get unread count
      const unreadRows = await sbFetch<any[]>(cfg, `flowb_notification_log?recipient_id=eq.${jwt.sub}&read_at=is.null&select=id`);

      return {
        notifications: rows || [],
        unread_count: unreadRows?.length || 0,
      };
    },
  );

  app.post(
    "/api/v1/me/notifications/read",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });

      const body = request.body as { ids?: string[]; all?: boolean } | undefined;
      const now = new Date().toISOString();

      if (body?.all) {
        // Mark all unread as read
        await sbPatch(cfg, "flowb_notification_log", {
          recipient_id: `eq.${jwt.sub}`,
          read_at: "is.null",
        }, { read_at: now });
      } else if (body?.ids?.length) {
        // Mark specific IDs as read
        const idList = body.ids.join(",");
        await sbPatchRaw(cfg, `flowb_notification_log?recipient_id=eq.${jwt.sub}&id=in.(${idList})`, { read_at: now });
      } else {
        return reply.status(400).send({ error: "Provide ids[] or all:true" });
      }

      return { ok: true };
    },
  );

  // ------------------------------------------------------------------
  // NOTIFICATION STREAM: SSE real-time notification push for FlowB VIP
  // ------------------------------------------------------------------

  app.get(
    "/api/v1/me/notifications/stream",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) {
        return reply.status(500).send({ error: "Not configured" });
      }

      // Hijack the response from Fastify to write raw SSE
      reply.hijack();

      const headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      };
      reply.raw.writeHead(200, headers);

      const userId = jwt.sub;
      const knownIds = new Set<string>();
      let lastSentAt = new Date().toISOString();
      let alive = true;

      // Send initial unread count
      const unreadRows = await sbFetch<any[]>(
        cfg,
        `flowb_notification_log?recipient_id=eq.${userId}&read_at=is.null&select=id`,
      );
      const initPayload = JSON.stringify({
        unread_count: unreadRows?.length || 0,
      });
      reply.raw.write(`event: init\ndata: ${initPayload}\n\n`);

      // Seed knownIds with recent notifications to avoid re-sending on first poll
      const recentRows = await sbFetch<any[]>(
        cfg,
        `flowb_notification_log?recipient_id=eq.${userId}&order=sent_at.desc&limit=50&select=id,sent_at`,
      );
      if (recentRows) {
        for (const r of recentRows) knownIds.add(r.id);
      }

      // Poll for new notifications every 10 seconds
      const pollInterval = setInterval(async () => {
        if (!alive) return;
        try {
          const newRows = await sbFetch<any[]>(
            cfg,
            `flowb_notification_log?recipient_id=eq.${userId}&sent_at=gt.${lastSentAt}&order=sent_at.asc&limit=50&select=id,notification_type,reference_id,triggered_by,sent_at,title,body,priority,read_at,data`,
          );
          if (newRows && newRows.length > 0) {
            for (const row of newRows) {
              if (!knownIds.has(row.id)) {
                knownIds.add(row.id);
                const payload = JSON.stringify(row);
                reply.raw.write(`event: notification\ndata: ${payload}\n\n`);
              }
            }
            // Advance cursor to the latest sent_at
            lastSentAt = newRows[newRows.length - 1].sent_at;
          }
        } catch {
          // Swallow poll errors to keep the stream alive
        }
      }, 10_000);

      // Send keepalive comment every 30 seconds
      const keepaliveInterval = setInterval(() => {
        if (!alive) return;
        try {
          reply.raw.write(`: keepalive\n\n`);
        } catch {
          // Connection likely closed
        }
      }, 30_000);

      // Clean up on client disconnect
      request.raw.on("close", () => {
        alive = false;
        clearInterval(pollInterval);
        clearInterval(keepaliveInterval);
      });
    },
  );

  // ------------------------------------------------------------------
  // DASHBOARD: Aggregate KPIs for biz dashboard (mobile)
  // ------------------------------------------------------------------

  app.get(
    "/api/v1/me/dashboard",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { meetings_today: 0, total_leads: 0, pipeline_value: 0, tasks_due: 0, recent_activity: [] };

      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      // Run queries in parallel
      const [meetingsToday, leads, recentActivity] = await Promise.all([
        // Count today's meetings
        sbFetch<any[]>(cfg,
          `flowb_meetings?creator_id=eq.${jwt.sub}&starts_at=gte.${todayStart}&starts_at=lt.${todayEnd}&status=neq.cancelled&select=id`,
        ),
        // Get all leads for pipeline value
        sbFetch<any[]>(cfg,
          `flowb_leads?owner_id=eq.${jwt.sub}&status=neq.lost&select=id,value,stage`,
        ),
        // Recent activity (last 10 items from biz feed)
        sbFetch<any[]>(cfg,
          `flowb_biz_activity?user_id=eq.${jwt.sub}&order=created_at.desc&limit=10&select=id,activity_type,title,description,metadata,created_at`,
        ),
      ]);

      const totalLeads = leads?.length || 0;
      const pipelineValue = (leads || []).reduce((sum: number, l: any) => sum + (l.value || 0), 0);

      return {
        meetings_today: meetingsToday?.length || 0,
        total_leads: totalLeads,
        pipeline_value: pipelineValue,
        tasks_due: 0,
        recent_activity: recentActivity || [],
      };
    },
  );

  // ------------------------------------------------------------------
  // USER PREFERENCES (requires auth)
  // Handles: arrival_date, interest_categories, quiet_hours_enabled,
  //          timezone, onboarding_complete
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/me/preferences",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { preferences: {} };

      const rows = await sbFetch<any[]>(
        cfg,
        `flowb_sessions?user_id=eq.${jwt.sub}&select=notifications_enabled,quiet_hours_enabled,timezone,arrival_date,interest_categories,onboarding_complete,reminder_defaults,notify_crew_checkins,notify_friend_rsvps,notify_crew_rsvps,notify_crew_messages,notify_event_reminders,notify_daily_digest,daily_notification_limit,quiet_hours_start,quiet_hours_end,home_city,home_country,current_city,current_country,destination_city,destination_country,locale,location_visibility,location_updated_at,notify_email,notify_email_digest,notify_email_events,notify_email_crew,email&limit=1`,
      );

      const pref = rows?.[0] || {};
      return {
        preferences: {
          notifications_enabled: pref.notifications_enabled ?? true,
          quiet_hours_enabled: pref.quiet_hours_enabled || false,
          timezone: pref.timezone || "America/Denver",
          arrival_date: pref.arrival_date || null,
          interest_categories: pref.interest_categories || [],
          onboarding_complete: pref.onboarding_complete || false,
          reminder_defaults: pref.reminder_defaults || [30],
          notify_crew_checkins: pref.notify_crew_checkins ?? true,
          notify_friend_rsvps: pref.notify_friend_rsvps ?? true,
          notify_crew_rsvps: pref.notify_crew_rsvps ?? true,
          notify_crew_messages: pref.notify_crew_messages ?? true,
          notify_event_reminders: pref.notify_event_reminders ?? true,
          notify_daily_digest: pref.notify_daily_digest ?? true,
          daily_notification_limit: pref.daily_notification_limit ?? 10,
          quiet_hours_start: pref.quiet_hours_start ?? 22,
          quiet_hours_end: pref.quiet_hours_end ?? 8,
          home_city: pref.home_city || null,
          home_country: pref.home_country || null,
          current_city: pref.current_city || null,
          current_country: pref.current_country || null,
          destination_city: pref.destination_city || null,
          destination_country: pref.destination_country || null,
          locale: pref.locale || 'en',
          location_visibility: pref.location_visibility || 'city',
          location_updated_at: pref.location_updated_at || null,
          notify_email: pref.notify_email ?? true,
          notify_email_digest: pref.notify_email_digest ?? true,
          notify_email_events: pref.notify_email_events ?? true,
          notify_email_crew: pref.notify_email_crew ?? true,
          email: pref.email || null,
        },
      };
    },
  );

  app.patch<{
    Body: {
      quiet_hours_enabled?: boolean;
      timezone?: string;
      arrival_date?: string;
      interest_categories?: string[];
      onboarding_complete?: boolean;
      reminder_defaults?: number[];
      notify_crew_checkins?: boolean;
      notify_friend_rsvps?: boolean;
      notify_crew_rsvps?: boolean;
      notify_crew_messages?: boolean;
      notify_event_reminders?: boolean;
      notify_daily_digest?: boolean;
      notifications_enabled?: boolean;
      daily_notification_limit?: number;
      quiet_hours_start?: number;
      quiet_hours_end?: number;
      home_city?: string;
      home_country?: string;
      current_city?: string;
      current_country?: string;
      destination_city?: string;
      destination_country?: string;
      locale?: string;
      location_visibility?: string;
      notify_email?: boolean;
      notify_email_digest?: boolean;
      notify_email_events?: boolean;
      notify_email_crew?: boolean;
      email?: string;
    };
  }>(
    "/api/v1/me/preferences",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { ok: false, error: "Not configured" };

      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      const body = request.body || {};

      if (body.quiet_hours_enabled !== undefined) updates.quiet_hours_enabled = body.quiet_hours_enabled;
      if (body.timezone) updates.timezone = body.timezone;
      if (body.arrival_date) updates.arrival_date = body.arrival_date;
      if (body.interest_categories) updates.interest_categories = body.interest_categories;
      if (body.onboarding_complete !== undefined) updates.onboarding_complete = body.onboarding_complete;
      if (body.reminder_defaults) updates.reminder_defaults = body.reminder_defaults;
      if (body.notify_crew_checkins !== undefined) updates.notify_crew_checkins = body.notify_crew_checkins;
      if (body.notify_friend_rsvps !== undefined) updates.notify_friend_rsvps = body.notify_friend_rsvps;
      if (body.notify_crew_rsvps !== undefined) updates.notify_crew_rsvps = body.notify_crew_rsvps;
      if (body.notify_crew_messages !== undefined) updates.notify_crew_messages = body.notify_crew_messages;
      if (body.notify_event_reminders !== undefined) updates.notify_event_reminders = body.notify_event_reminders;
      if (body.notify_daily_digest !== undefined) updates.notify_daily_digest = body.notify_daily_digest;
      if (body.notifications_enabled !== undefined) updates.notifications_enabled = body.notifications_enabled;
      if (body.daily_notification_limit !== undefined) updates.daily_notification_limit = Math.max(1, Math.min(50, body.daily_notification_limit));
      if (body.quiet_hours_start !== undefined) updates.quiet_hours_start = Math.max(0, Math.min(23, body.quiet_hours_start));
      if (body.quiet_hours_end !== undefined) updates.quiet_hours_end = Math.max(0, Math.min(23, body.quiet_hours_end));
      if (body.home_city !== undefined) updates.home_city = body.home_city;
      if (body.home_country !== undefined) updates.home_country = body.home_country;
      if (body.current_city !== undefined) updates.current_city = body.current_city;
      if (body.current_country !== undefined) updates.current_country = body.current_country;
      if (body.destination_city !== undefined) updates.destination_city = body.destination_city;
      if (body.destination_country !== undefined) updates.destination_country = body.destination_country;
      if (body.locale) updates.locale = body.locale;
      if (body.location_visibility) updates.location_visibility = body.location_visibility;
      if (body.notify_email !== undefined) updates.notify_email = body.notify_email;
      if (body.notify_email_digest !== undefined) updates.notify_email_digest = body.notify_email_digest;
      if (body.notify_email_events !== undefined) updates.notify_email_events = body.notify_email_events;
      if (body.notify_email_crew !== undefined) updates.notify_email_crew = body.notify_email_crew;
      if (body.email) updates.email = body.email;
      // Auto-set location_updated_at when any geo field changes
      if (body.home_city !== undefined || body.current_city !== undefined || body.destination_city !== undefined ||
          body.home_country !== undefined || body.current_country !== undefined || body.destination_country !== undefined) {
        updates.location_updated_at = new Date().toISOString();
      }

      // Upsert: create session row if it doesn't exist yet
      fireAndForget(fetch(
        `${cfg.supabaseUrl}/rest/v1/flowb_sessions`,
        {
          method: "POST",
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: `Bearer ${cfg.supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal,resolution=merge-duplicates",
          },
          body: JSON.stringify({
            user_id: jwt.sub,
            ...updates,
          }),
        },
      ), "upsert session");

      // Award onboarding_complete points (10 pts via daily_login action)
      if (body.onboarding_complete) {
        fireAndForget(core.awardPoints(jwt.sub, jwt.platform, "daily_login"), "award points");
      }

      return { ok: true };
    },
  );

  // ------------------------------------------------------------------
  // DISCOVERY: Location-based friend & user discovery
  // ------------------------------------------------------------------

  // GET /api/v1/flow/friends/map - friends grouped by location
  app.get(
    "/api/v1/flow/friends/map",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { friends: [] };

      // Get friend IDs
      const connections = await sbFetch<any[]>(cfg,
        `flowb_connections?user_id=eq.${jwt.sub}&status=eq.active&select=friend_id`);
      if (!connections?.length) return { friends: [] };

      const friendIds = connections.map((c: any) => c.friend_id);
      const inClause = friendIds.map((id: string) => `"${id}"`).join(",");

      // Get friend locations (respecting privacy)
      const friends = await sbFetch<any[]>(cfg,
        `flowb_sessions?user_id=in.(${inClause})&select=user_id,display_name,home_city,home_country,current_city,current_country,destination_city,destination_country,location_visibility`);

      // Filter by visibility
      const visible = (friends || []).map((f: any) => {
        const vis = f.location_visibility || 'city';
        if (vis === 'hidden') return { user_id: f.user_id, display_name: f.display_name };
        if (vis === 'country') return {
          user_id: f.user_id, display_name: f.display_name,
          home_country: f.home_country, current_country: f.current_country, destination_country: f.destination_country,
        };
        return {
          user_id: f.user_id, display_name: f.display_name,
          home_city: f.home_city, home_country: f.home_country,
          current_city: f.current_city, current_country: f.current_country,
          destination_city: f.destination_city, destination_country: f.destination_country,
        };
      });

      return { friends: visible };
    },
  );

  // GET /api/v1/flow/friends/nearby - friends in same city
  app.get<{ Querystring: { city?: string } }>(
    "/api/v1/flow/friends/nearby",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { nearby: [] };

      // Get user's current city or use query param
      let city = (request.query as any)?.city;
      if (!city) {
        const me = await sbFetch<any[]>(cfg, `flowb_sessions?user_id=eq.${jwt.sub}&select=current_city&limit=1`);
        city = me?.[0]?.current_city;
      }
      if (!city) return { nearby: [], city: null };

      // Get friend IDs
      const connections = await sbFetch<any[]>(cfg,
        `flowb_connections?user_id=eq.${jwt.sub}&status=eq.active&select=friend_id`);
      if (!connections?.length) return { nearby: [], city };

      const friendIds = connections.map((c: any) => c.friend_id);
      const inClause = friendIds.map((id: string) => `"${id}"`).join(",");

      const nearby = await sbFetch<any[]>(cfg,
        `flowb_sessions?user_id=in.(${inClause})&current_city=eq.${encodeURIComponent(city)}&location_visibility=neq.hidden&select=user_id,display_name,current_city,current_country`);

      return { nearby: nearby || [], city };
    },
  );

  // GET /api/v1/discover/people - discover users by location (public discovery)
  app.get<{ Querystring: { city?: string; country?: string; limit?: string } }>(
    "/api/v1/discover/people",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { people: [] };

      const q = request.query as any;
      const limit = Math.min(parseInt(q.limit || "50"), 100);

      let filter = `location_visibility=neq.hidden&user_id=neq.${jwt.sub}`;
      if (q.city) filter += `&or=(current_city.eq.${encodeURIComponent(q.city)},home_city.eq.${encodeURIComponent(q.city)},destination_city.eq.${encodeURIComponent(q.city)})`;
      else if (q.country) filter += `&or=(current_country.eq.${encodeURIComponent(q.country)},home_country.eq.${encodeURIComponent(q.country)},destination_country.eq.${encodeURIComponent(q.country)})`;
      else return { people: [], error: "Provide city or country" };

      const rows = await sbFetch<any[]>(cfg,
        `flowb_sessions?${filter}&select=user_id,display_name,home_city,home_country,current_city,current_country,destination_city,destination_country,location_visibility&limit=${limit}`);

      // Respect privacy: if visibility=country, strip city fields
      const people = (rows || []).map((r: any) => {
        if (r.location_visibility === 'country') {
          return { user_id: r.user_id, display_name: r.display_name, home_country: r.home_country, current_country: r.current_country, destination_country: r.destination_country };
        }
        return { user_id: r.user_id, display_name: r.display_name, home_city: r.home_city, home_country: r.home_country, current_city: r.current_city, current_country: r.current_country, destination_city: r.destination_city, destination_country: r.destination_country };
      });

      return { people };
    },
  );

  // ------------------------------------------------------------------
  // LINKED ACCOUNTS: Show all connected platforms for the user
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/me/linked-accounts",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { accounts: [], canonical_id: null };

      const { resolveCanonicalId, getLinkedIds } = await import("../services/identity.js");
      const canonicalId = await resolveCanonicalId(cfg, jwt.sub);
      const allIds = await getLinkedIds(cfg, canonicalId);

      // Fetch identity rows with display names
      const rows = await sbFetch<any[]>(
        cfg,
        `flowb_identities?canonical_id=eq.${encodeURIComponent(canonicalId)}&select=platform,platform_user_id,display_name,avatar_url,privy_id`,
      );

      const accounts = (rows || []).map((r: any) => ({
        platform: r.platform,
        platform_user_id: r.platform_user_id,
        display_name: r.display_name,
        avatar_url: r.avatar_url,
        is_current: r.platform_user_id === jwt.sub,
      }));

      return { accounts, canonical_id: canonicalId };
    },
  );

  // ------------------------------------------------------------------
  // LINK STATUS: Lightweight check for frontend linking prompt
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/me/link-status",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { has_telegram: false, has_farcaster: false, has_web: false, total_linked: 0, merged_points: 0 };

      const canonicalId = await resolveCanonicalId(cfg, jwt.sub);
      const linkedIds = await getLinkedIds(cfg, canonicalId);

      const has_telegram = linkedIds.some(id => id.startsWith("telegram_"));
      const has_farcaster = linkedIds.some(id => id.startsWith("farcaster_"));
      const has_web = linkedIds.some(id => id.startsWith("web_"));

      // Sum points across all linked accounts
      let merged_points = 0;
      if (linkedIds.length > 0) {
        const inList = linkedIds.map(id => encodeURIComponent(id)).join(",");
        const rows = await sbFetch<any[]>(
          cfg,
          `flowb_user_points?user_id=in.(${inList})&select=total_points`,
        );
        for (const row of rows || []) {
          merged_points += row.total_points || 0;
        }
      }

      return {
        has_telegram,
        has_farcaster,
        has_web,
        total_linked: linkedIds.length,
        merged_points,
      };
    },
  );

  // ------------------------------------------------------------------
  // SYNC LINKED ACCOUNTS: Re-resolve identity after account linking
  // Called from web after user links a new account (Privy or Supabase Auth)
  // ------------------------------------------------------------------
  app.post(
    "/api/v1/me/sync-linked-accounts",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { ok: false, error: "Not configured" };

      // In supabase-only mode, sync from local flowb_identities + flowb_passport
      if (!isPrivyEnabled()) {
        // Just re-resolve canonical ID from local tables
        const canonicalId = await resolveCanonicalId(cfg, jwt.sub);
        const linkedIds = await getLinkedIds(cfg, canonicalId);
        return { ok: true, synced: linkedIds.length, canonical_id: canonicalId, merged_points: 0, platforms_linked: linkedIds.map(id => id.split("_")[0]) };
      }

      // For web users, look up their full Privy profile and sync all linked accounts
      const privyAppId = process.env.PRIVY_APP_ID;
      const privyAppSecret = process.env.PRIVY_APP_SECRET;

      if (!privyAppId || !privyAppSecret) {
        // Fall back to local-only sync
        const canonicalId = await resolveCanonicalId(cfg, jwt.sub);
        return { ok: true, synced: 0, message: "Privy not configured, local sync only", canonical_id: canonicalId };
      }

      // Determine the Privy user ID
      let privyDid: string | undefined;
      if (jwt.sub.startsWith("web_")) {
        privyDid = jwt.sub.replace("web_", "");
      } else if (jwt.privyUserId) {
        privyDid = jwt.privyUserId;
      } else {
        // For telegram/farcaster users, search Privy
        const basicAuth = Buffer.from(`${privyAppId}:${privyAppSecret}`).toString("base64");
        let searchFilter: Record<string, any> | null = null;
        if (jwt.sub.startsWith("telegram_")) {
          searchFilter = { telegram: { subject: jwt.sub.replace("telegram_", "") } };
        } else if (jwt.sub.startsWith("farcaster_")) {
          searchFilter = { farcaster: { subject: jwt.sub.replace("farcaster_", "") } };
        }

        if (searchFilter) {
          try {
            const res = await fetch("https://auth.privy.io/api/v1/users/search", {
              method: "POST",
              headers: {
                Authorization: `Basic ${basicAuth}`,
                "privy-app-id": privyAppId,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ filter: searchFilter, limit: 1 }),
            });
            if (res.ok) {
              const data = await res.json() as any;
              privyDid = data?.data?.[0]?.id || data?.data?.[0]?.did;
            }
          } catch {}
        }
      }

      if (!privyDid) {
        return { ok: true, synced: 0, message: "No Privy account found" };
      }

      // Fetch the full Privy user with all linked accounts
      const basicAuth = Buffer.from(`${privyAppId}:${privyAppSecret}`).toString("base64");
      let privyUser: any;
      try {
        const res = await fetch(`https://auth.privy.io/api/v2/users/${encodeURIComponent(privyDid)}`, {
          headers: {
            Authorization: `Basic ${basicAuth}`,
            "privy-app-id": privyAppId,
          },
        });
        if (!res.ok) {
          return { ok: false, error: `Privy lookup failed: ${res.status}` };
        }
        privyUser = await res.json();
      } catch (err: any) {
        return { ok: false, error: `Privy error: ${err.message}` };
      }

      // Extract all platform user IDs from Privy linked accounts
      const linkedPlatformIds: { platform: string; platformUserId: string; displayName?: string }[] = [];

      // Always include the web/privy identity
      linkedPlatformIds.push({
        platform: "web",
        platformUserId: `web_${privyDid}`,
        displayName: undefined,
      });

      for (const account of privyUser.linked_accounts || []) {
        if (account.type === "telegram" && (account.telegram_user_id || account.telegramUserId)) {
          const tgId = account.telegram_user_id || account.telegramUserId;
          linkedPlatformIds.push({
            platform: "telegram",
            platformUserId: `telegram_${tgId}`,
            displayName: account.username || account.first_name || undefined,
          });
        }
        if (account.type === "farcaster" && account.fid) {
          linkedPlatformIds.push({
            platform: "farcaster",
            platformUserId: `farcaster_${account.fid}`,
            displayName: account.username || undefined,
          });
        }
        if (account.type === "discord_oauth" && account.subject) {
          linkedPlatformIds.push({
            platform: "discord",
            platformUserId: `discord_${account.subject}`,
            displayName: account.username || undefined,
          });
        }
        if (account.type === "twitter_oauth" && account.subject) {
          linkedPlatformIds.push({
            platform: "twitter",
            platformUserId: `twitter_${account.subject}`,
            displayName: account.username || undefined,
          });
        }
        if (account.type === "github_oauth" && account.subject) {
          linkedPlatformIds.push({
            platform: "github",
            platformUserId: `github_${account.subject}`,
            displayName: account.username || undefined,
          });
        }
        if (account.type === "apple_oauth" && account.subject) {
          linkedPlatformIds.push({
            platform: "apple",
            platformUserId: `apple_${account.subject}`,
          });
        }
        if (account.type === "email" && account.address) {
          linkedPlatformIds.push({
            platform: "email",
            platformUserId: `email_${account.address}`,
            displayName: account.address,
          });
        }
        if (account.type === "phone" && account.number) {
          linkedPlatformIds.push({
            platform: "phone",
            platformUserId: `phone_${account.number}`,
          });
        }
      }

      // Determine canonical_id: check if any of these IDs already have one
      let canonicalId: string | null = null;
      for (const entry of linkedPlatformIds) {
        const rows = await sbFetch<any[]>(
          cfg,
          `flowb_identities?platform_user_id=eq.${encodeURIComponent(entry.platformUserId)}&select=canonical_id&limit=1`,
        );
        if (rows?.length) {
          canonicalId = rows[0].canonical_id;
          break;
        }
      }

      // If no existing canonical_id, use the current user's sub
      if (!canonicalId) {
        canonicalId = jwt.sub;
      }

      // Upsert identity rows for all linked accounts
      let synced = 0;
      for (const entry of linkedPlatformIds) {
        try {
          await sbPost(cfg, "flowb_identities?on_conflict=platform_user_id", {
            canonical_id: canonicalId,
            platform: entry.platform,
            platform_user_id: entry.platformUserId,
            privy_id: privyDid,
            display_name: entry.displayName || null,
          }, "return=minimal,resolution=merge-duplicates");
          synced++;
        } catch {}
      }

      // Also ensure points rows exist for key platforms (telegram, farcaster, web)
      for (const entry of linkedPlatformIds) {
        if (["telegram", "farcaster", "web"].includes(entry.platform)) {
          fireAndForget(core.awardPoints(entry.platformUserId, entry.platform, "account_linked"), "award points");
        }
      }

      // Aggregate merged points across all linked accounts
      let mergedPoints = 0;
      const platformsLinked: string[] = [];
      if (linkedPlatformIds.length > 0) {
        const inList = linkedPlatformIds.map(e => encodeURIComponent(e.platformUserId)).join(",");
        const pointRows = await sbFetch<any[]>(
          cfg,
          `flowb_user_points?user_id=in.(${inList})&select=total_points`,
        );
        for (const row of pointRows || []) {
          mergedPoints += row.total_points || 0;
        }
        for (const entry of linkedPlatformIds) {
          if (!platformsLinked.includes(entry.platform)) {
            platformsLinked.push(entry.platform);
          }
        }
      }

      // Store email in session and send welcome email for newly linked emails
      const emailEntry = linkedPlatformIds.find((e) => e.platform === "email");
      if (emailEntry) {
        const emailAddr = emailEntry.displayName; // email address
        if (emailAddr) {
          // Check if we already have this email stored (i.e. not a new link)
          const existing = await sbFetch<any[]>(
            cfg,
            `flowb_sessions?user_id=eq.${encodeURIComponent(jwt.sub)}&select=email&limit=1`,
          );
          const hadEmail = existing?.[0]?.email;

          // Store email in session row
          fireAndForget(
            sbPost(cfg, "flowb_sessions?on_conflict=user_id", {
              user_id: jwt.sub,
              email: emailAddr,
            }, "return=minimal,resolution=merge-duplicates"),
            "store email in session",
          );

          // Send welcome email if this is a newly linked email
          if (!hadEmail || hadEmail !== emailAddr) {
            const displayName = linkedPlatformIds.find((e) => e.displayName && e.platform !== "email")?.displayName || emailAddr.split("@")[0];
            fireAndForget(sendWelcomeEmail(emailAddr, displayName), "send welcome email");
          }
        }
      }

      console.log(`[sync] Synced ${synced} linked accounts for ${jwt.sub} (canonical: ${canonicalId}, merged: ${mergedPoints}pts)`);
      return { ok: true, synced, canonical_id: canonicalId, merged_points: mergedPoints, platforms_linked: platformsLinked };
    },
  );

  // ------------------------------------------------------------------
  // PRIVACY SETTINGS: Control visibility and data sharing
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/me/privacy",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { privacy: {} };

      const rows = await sbFetch<any[]>(
        cfg,
        `flowb_sessions?user_id=eq.${jwt.sub}&select=privacy_profile_visible,privacy_schedule_visible,privacy_crews_visible,privacy_points_visible,privacy_activity_visible,privacy_share_with_crews,privacy_share_cross_platform&limit=1`,
      );

      const p = rows?.[0] || {};
      return {
        privacy: {
          profile_visible: p.privacy_profile_visible ?? "friends",
          schedule_visible: p.privacy_schedule_visible ?? "friends",
          crews_visible: p.privacy_crews_visible ?? "public",
          points_visible: p.privacy_points_visible ?? "public",
          activity_visible: p.privacy_activity_visible ?? "friends",
          share_with_crews: p.privacy_share_with_crews ?? true,
          share_cross_platform: p.privacy_share_cross_platform ?? true,
        },
      };
    },
  );

  app.patch<{
    Body: {
      profile_visible?: string;
      schedule_visible?: string;
      crews_visible?: string;
      points_visible?: string;
      activity_visible?: string;
      share_with_crews?: boolean;
      share_cross_platform?: boolean;
    };
  }>(
    "/api/v1/me/privacy",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { ok: false, error: "Not configured" };

      const valid = ["public", "friends", "crews", "private"];
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      const body = request.body || {};

      if (body.profile_visible && valid.includes(body.profile_visible)) updates.privacy_profile_visible = body.profile_visible;
      if (body.schedule_visible && valid.includes(body.schedule_visible)) updates.privacy_schedule_visible = body.schedule_visible;
      if (body.crews_visible && valid.includes(body.crews_visible)) updates.privacy_crews_visible = body.crews_visible;
      if (body.points_visible && valid.includes(body.points_visible)) updates.privacy_points_visible = body.points_visible;
      if (body.activity_visible && valid.includes(body.activity_visible)) updates.privacy_activity_visible = body.activity_visible;
      if (body.share_with_crews !== undefined) updates.privacy_share_with_crews = body.share_with_crews;
      if (body.share_cross_platform !== undefined) updates.privacy_share_cross_platform = body.share_cross_platform;

      fireAndForget(fetch(
        `${cfg.supabaseUrl}/rest/v1/flowb_sessions`,
        {
          method: "POST",
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: `Bearer ${cfg.supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal,resolution=merge-duplicates",
          },
          body: JSON.stringify({
            user_id: jwt.sub,
            ...updates,
          }),
        },
      ), "upsert session");

      return { ok: true };
    },
  );

  // ------------------------------------------------------------------
  // CREW MEMBERSHIPS: List crews with privacy context
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/me/crew-visibility",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { crews: [] };

      const rows = await sbFetch<any[]>(
        cfg,
        `flowb_crew_members?user_id=eq.${jwt.sub}&select=crew_id,role,flowb_crews(id,name,emoji,member_count)`,
      );

      const crews = (rows || []).map((r: any) => ({
        id: r.flowb_crews?.id || r.crew_id,
        name: r.flowb_crews?.name || "Unknown",
        emoji: r.flowb_crews?.emoji || "",
        role: r.role || "member",
        member_count: r.flowb_crews?.member_count || 0,
      }));

      return { crews };
    },
  );

  // ------------------------------------------------------------------
  // WHO'S GOING: Social proof for an event (optionally authed, cross-platform)
  // ------------------------------------------------------------------
  app.get<{ Params: { id: string } }>(
    "/api/v1/events/:id/social",
    async (request) => {
      const { id } = request.params;
      const cfg = getSupabaseConfig();
      if (!cfg) return { going: 0, maybe: 0 };

      // Total RSVP counts
      const going = await sbFetch<any[]>(
        cfg,
        `flowb_event_attendance?event_id=eq.${id}&status=eq.going&select=user_id`,
      );
      const maybe = await sbFetch<any[]>(
        cfg,
        `flowb_event_attendance?event_id=eq.${id}&status=eq.maybe&select=user_id`,
      );

      const result: any = {
        goingCount: going?.length || 0,
        maybeCount: maybe?.length || 0,
      };

      // If authed, show which friends are going (cross-platform via identity resolution)
      const jwt = extractJwt(request);
      if (jwt && flowPlugin && flowCfg) {
        // Resolve canonical ID for cross-platform matching
        const { resolveCanonicalId, getLinkedIds } = await import("../services/identity.js");
        const canonicalId = await resolveCanonicalId(cfg, jwt.sub);
        const allIds = await getLinkedIds(cfg, canonicalId);

        // Query attendance across all linked IDs
        let totalFlowGoing = 0;
        let totalFlowMaybe = 0;
        for (const uid of allIds) {
          const att = await flowPlugin.getFlowAttendanceForEvent(flowCfg, uid, id);
          totalFlowGoing += att.going.length;
          totalFlowMaybe += att.maybe.length;
        }
        result.flowGoing = totalFlowGoing;
        result.flowMaybe = totalFlowMaybe;
      }

      return result;
    },
  );

  // ------------------------------------------------------------------
  // REMINDERS: Set reminders for a specific event (requires auth)
  // ------------------------------------------------------------------
  app.post<{ Params: { id: string }; Body: { minutes_before: number[] } }>(
    "/api/v1/events/:id/reminders",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const { id } = request.params;
      const { minutes_before } = request.body || {};
      const cfg = getSupabaseConfig();

      if (!cfg || !Array.isArray(minutes_before)) {
        return reply.status(400).send({ error: "Missing minutes_before array" });
      }

      // Validate values
      const valid = minutes_before.filter((m) => Number.isInteger(m) && m > 0 && m <= 10080);
      if (!valid.length) {
        return reply.status(400).send({ error: "No valid reminder times" });
      }

      // Delete existing reminders for this event not in the new list
      fireAndForget(fetch(
        `${cfg.supabaseUrl}/rest/v1/flowb_event_reminders?user_id=eq.${jwt.sub}&event_source_id=eq.${id}&remind_minutes_before=not.in.(${valid.join(",")})`,
        {
          method: "DELETE",
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: `Bearer ${cfg.supabaseKey}`,
          },
        },
      ), "delete reminders");

      // Upsert each reminder
      for (const mins of valid) {
        fireAndForget(sbPost(cfg, "flowb_event_reminders?on_conflict=user_id,event_source_id,remind_minutes_before", {
          user_id: jwt.sub,
          event_source_id: id,
          remind_minutes_before: mins,
          sent: false,
        }, "return=minimal,resolution=merge-duplicates"), "upsert reminder");
      }

      return { ok: true, reminders: valid };
    },
  );

  // ------------------------------------------------------------------
  // REMINDERS: Get reminders for a specific event (requires auth)
  // ------------------------------------------------------------------
  app.get<{ Params: { id: string } }>(
    "/api/v1/events/:id/reminders",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const { id } = request.params;
      const cfg = getSupabaseConfig();
      if (!cfg) return { reminders: [] };

      const rows = await sbFetch<any[]>(
        cfg,
        `flowb_event_reminders?user_id=eq.${jwt.sub}&event_source_id=eq.${id}&select=remind_minutes_before,sent&order=remind_minutes_before.asc`,
      );

      return { reminders: rows || [] };
    },
  );

  // ------------------------------------------------------------------
  // REMINDERS: Delete all reminders for an event (requires auth)
  // ------------------------------------------------------------------
  app.delete<{ Params: { id: string } }>(
    "/api/v1/events/:id/reminders",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const { id } = request.params;
      const cfg = getSupabaseConfig();
      if (!cfg) return { ok: false };

      fireAndForget(fetch(
        `${cfg.supabaseUrl}/rest/v1/flowb_event_reminders?user_id=eq.${jwt.sub}&event_source_id=eq.${id}`,
        {
          method: "DELETE",
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: `Bearer ${cfg.supabaseKey}`,
          },
        },
      ), "delete reminders");

      return { ok: true };
    },
  );

  // ------------------------------------------------------------------
  // CALENDAR: Generate .ics file for an event (no auth, shareable)
  // ------------------------------------------------------------------
  app.get<{ Params: { id: string } }>(
    "/api/v1/events/:id/calendar",
    async (request, reply) => {
      const { id } = request.params;

      // Look up event from schedules first, then fall back to discovery
      const cfg = getSupabaseConfig();
      let title = "Event";
      let startTime: string | null = null;
      let endTime: string | null = null;
      let venue = "";
      let url = "";

      if (cfg) {
        const rows = await sbFetch<any[]>(
          cfg,
          `flowb_schedules?event_source_id=eq.${id}&select=event_title,starts_at,ends_at,venue_name,event_url&limit=1`,
        );
        if (rows?.length) {
          const row = rows[0];
          title = row.event_title || title;
          startTime = row.starts_at;
          endTime = row.ends_at;
          venue = row.venue_name || "";
          url = row.event_url || "";
        }
      }

      // Fallback: try flowb_events DB
      if (!startTime && cfg) {
        let eRows = await sbFetch<any[]>(cfg, `flowb_events?id=eq.${encodeURIComponent(id)}&limit=1`);
        if (!eRows?.length) {
          eRows = await sbFetch<any[]>(cfg, `flowb_events?source_event_id=eq.${encodeURIComponent(id)}&limit=1`);
        }
        if (eRows?.length) {
          const ev = eRows[0];
          title = ev.title || title;
          startTime = ev.starts_at;
          endTime = ev.ends_at ?? null;
          venue = ev.venue_name || "";
          url = ev.url || "";
        }
      }

      if (!startTime) {
        return reply.status(404).send({ error: "Event not found" });
      }

      const dtStart = toIcsDate(startTime);
      const dtEnd = endTime ? toIcsDate(endTime) : toIcsDate(new Date(new Date(startTime).getTime() + 2 * 3600000).toISOString());
      const now = toIcsDate(new Date().toISOString());

      const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//FlowB//SXSW 2026//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `DTSTAMP:${now}`,
        `UID:${id}@flowb.me`,
        `SUMMARY:${escapeIcsText(title)}`,
        venue ? `LOCATION:${escapeIcsText(venue)}` : "",
        url ? `URL:${url}` : "",
        "END:VEVENT",
        "END:VCALENDAR",
      ].filter(Boolean).join("\r\n");

      return reply
        .header("Content-Type", "text/calendar; charset=utf-8")
        .header("Content-Disposition", `attachment; filename="${sanitizeFilename(title)}.ics"`)
        .send(ics);
    },
  );

  // ------------------------------------------------------------------
  // ADMIN: Middleware helper
  // ------------------------------------------------------------------
  function requireAdmin(request: any, reply: any): boolean {
    const adminKey = request.headers["x-admin-key"];
    const expectedKey = process.env.FLOWB_ADMIN_KEY;
    if (!expectedKey || !adminKey || adminKey !== expectedKey) {
      reply.status(403).send({ error: "Admin access required" });
      return false;
    }
    return true;
  }

  // ------------------------------------------------------------------
  // ADMIN: Live dashboard stats
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/admin/stats",
    { preHandler: authMiddleware, config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const cfg = getSupabaseConfig();
      if (!cfg) return { stats: {} };

      const [users, crews, rsvps, points, checkins] = await Promise.all([
        sbFetch<any[]>(cfg, "flowb_user_points?select=user_id&limit=1000"),
        sbFetch<any[]>(cfg, "flowb_groups?select=id&limit=1000"),
        sbFetch<any[]>(cfg, "flowb_event_attendance?select=id&limit=1000"),
        sbFetch<any[]>(cfg, "flowb_user_points?select=total_points&order=total_points.desc&limit=1"),
        sbFetch<any[]>(cfg, "flowb_checkins?select=id&limit=1000"),
      ]);

      return {
        stats: {
          totalUsers: users?.length || 0,
          totalCrews: crews?.length || 0,
          totalRsvps: rsvps?.length || 0,
          totalCheckins: checkins?.length || 0,
          topPoints: points?.[0]?.total_points || 0,
        },
      };
    },
  );

  // ------------------------------------------------------------------
  // ADMIN: List plugins
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/admin/plugins",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;

      const plugins = core.getPluginStatus().map((p: any) => ({
        id: p.id,
        name: p.name,
        description: "",
        enabled: p.configured,
        actions: [],
      }));

      return { plugins };
    },
  );

  // ------------------------------------------------------------------
  // ADMIN: Configure plugin
  // ------------------------------------------------------------------
  app.post<{ Params: { id: string }; Body: { config: Record<string, any> } }>(
    "/api/v1/admin/plugins/:id/configure",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      return { ok: true, message: `Plugin ${request.params.id} configuration updated` };
    },
  );

  // ------------------------------------------------------------------
  // ADMIN: Toggle plugin
  // ------------------------------------------------------------------
  app.post<{ Params: { id: string }; Body: { enabled: boolean } }>(
    "/api/v1/admin/plugins/:id/toggle",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      return { ok: true, enabled: request.body?.enabled ?? true };
    },
  );

  // ------------------------------------------------------------------
  // ADMIN: Feature/unfeature an event
  // ------------------------------------------------------------------
  app.post<{ Params: { id: string }; Body: { featured: boolean } }>(
    "/api/v1/admin/events/:id/feature",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });

      fireAndForget(fetch(
        `${cfg.supabaseUrl}/rest/v1/flowb_events?id=eq.${request.params.id}`,
        {
          method: "PATCH",
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: `Bearer ${cfg.supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ featured: request.body?.featured ?? true }),
        },
      ), "feature event");

      return { ok: true };
    },
  );

  // ------------------------------------------------------------------
  // ADMIN: Hide/show an event
  // ------------------------------------------------------------------
  app.post<{ Params: { id: string }; Body: { hidden: boolean } }>(
    "/api/v1/admin/events/:id/hide",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });

      fireAndForget(fetch(
        `${cfg.supabaseUrl}/rest/v1/flowb_events?id=eq.${request.params.id}`,
        {
          method: "PATCH",
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: `Bearer ${cfg.supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ hidden: request.body?.hidden ?? true }),
        },
      ), "hide event");

      return { ok: true };
    },
  );

  // ------------------------------------------------------------------
  // ADMIN: Award bonus points
  // ------------------------------------------------------------------
  app.post<{ Body: { userId: string; points: number; reason?: string } }>(
    "/api/v1/admin/points",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const { userId, points: bonusPoints, reason } = request.body || {};
      if (!userId || !bonusPoints) {
        return reply.status(400).send({ error: "Missing userId or points" });
      }

      const result = await core.awardPoints(userId, "app", "bonus_awarded", {
        admin_bonus: bonusPoints,
        reason: reason || "Admin bonus",
      });

      return { ok: true, total: result.total };
    },
  );

  // ------------------------------------------------------------------
  // ADMIN: Change user role
  // ------------------------------------------------------------------
  app.post<{ Params: { id: string }; Body: { role: string } }>(
    "/api/v1/admin/users/:id/role",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      return { ok: true, userId: request.params.id, role: request.body?.role || "user" };
    },
  );

  // ------------------------------------------------------------------
  // ADMIN: Send test notification
  // ------------------------------------------------------------------
  app.post<{ Body: { userId: string; title: string; body: string } }>(
    "/api/v1/admin/notifications/test",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const { userId, title, body: notifBody } = request.body || {};
      if (!userId) return reply.status(400).send({ error: "Missing userId" });

      return { ok: true, message: `Test notification queued for ${userId}` };
    },
  );

  // ------------------------------------------------------------------
  // ADMIN: Notification delivery stats
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/admin/notifications/stats",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const cfg = getSupabaseConfig();
      if (!cfg) return { stats: {} };

      const tokens = await sbFetch<any[]>(cfg, "flowb_notification_tokens?select=platform,disabled&limit=5000");
      const pushTokens = await sbFetch<any[]>(cfg, "flowb_push_tokens?select=platform,active&limit=5000");

      const fcActive = (tokens || []).filter(t => !t.disabled).length;
      const fcDisabled = (tokens || []).filter(t => t.disabled).length;
      const pushActive = (pushTokens || []).filter(t => t.active !== false).length;

      return {
        stats: {
          farcasterTokens: { active: fcActive, disabled: fcDisabled },
          pushTokens: { active: pushActive },
        },
      };
    },
  );

  // ------------------------------------------------------------------
  // ADMIN: Trigger email digest manually
  // ------------------------------------------------------------------
  app.post(
    "/api/v1/admin/email-digest",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Supabase not configured" });

      const { runEmailDigest } = await import("../services/email-digest.js");
      const result = await runEmailDigest(cfg);
      return { ok: true, ...result };
    },
  );

  // ------------------------------------------------------------------
  // ADMIN: All events (for curation - includes featured/hidden)
  // ------------------------------------------------------------------
  app.get<{ Querystring: { limit?: string; offset?: string; search?: string } }>(
    "/api/v1/admin/events",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const cfg = getSupabaseConfig();
      if (!cfg) return { events: [], total: 0 };

      const { limit, offset, search } = request.query;
      const maxResults = Math.min(parseInt(limit || "50", 10), 200);
      const skip = parseInt(offset || "0", 10);

      let query = `flowb_events?order=starts_at.desc&limit=${maxResults}&offset=${skip}`;
      if (search) {
        query += `&or=(title.ilike.*${encodeURIComponent(search)}*,description.ilike.*${encodeURIComponent(search)}*,venue_name.ilike.*${encodeURIComponent(search)}*)`;
      }

      const rows = await sbFetch<any[]>(cfg, query);
      return {
        events: (rows || []).map(dbEventToResult),
        total: (rows || []).length,
      };
    },
  );

  // ------------------------------------------------------------------
  // ZONES: List all active zones
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/zones",
    async () => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { zones: [] };
      const rows = await sbFetch<any[]>(cfg, "flowb_zones?active=eq.true&order=sort_order.asc");
      return {
        zones: (rows || []).map((z: any) => ({
          id: z.id,
          slug: z.slug,
          name: z.name,
          description: z.description,
          color: z.color,
          icon: z.icon,
          zoneType: z.zone_type,
          floor: z.floor,
          sortOrder: z.sort_order,
        })),
      };
    },
  );

  // ------------------------------------------------------------------
  // ZONES: Single zone detail + counts
  // ------------------------------------------------------------------
  app.get<{ Params: { slug: string } }>(
    "/api/v1/zones/:slug",
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });

      const rows = await sbFetch<any[]>(cfg, `flowb_zones?slug=eq.${encodeURIComponent(request.params.slug)}&limit=1`);
      if (!rows?.length) return reply.status(404).send({ error: "Zone not found" });
      const zone = rows[0];

      const [eventRows, boothRows] = await Promise.all([
        sbFetch<any[]>(cfg, `flowb_events?zone_id=eq.${zone.id}&hidden=eq.false&select=id&limit=1000`),
        sbFetch<any[]>(cfg, `flowb_booths?zone_id=eq.${zone.id}&active=eq.true&select=id&limit=1000`),
      ]);

      return {
        zone: {
          id: zone.id,
          slug: zone.slug,
          name: zone.name,
          description: zone.description,
          color: zone.color,
          icon: zone.icon,
          zoneType: zone.zone_type,
          floor: zone.floor,
        },
        eventCount: eventRows?.length || 0,
        boothCount: boothRows?.length || 0,
      };
    },
  );

  // ------------------------------------------------------------------
  // VENUES: List venues (optionally by zone)
  // ------------------------------------------------------------------
  app.get<{ Querystring: { zone?: string } }>(
    "/api/v1/venues",
    async (request) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { venues: [] };
      let query = "flowb_venues?active=eq.true&order=is_main_venue.desc,name.asc";
      if (request.query.zone) {
        query += `&zone_id=eq.${encodeURIComponent(request.query.zone)}`;
      }
      const rows = await sbFetch<any[]>(cfg, query);
      return {
        venues: (rows || []).map((v: any) => ({
          id: v.id,
          slug: v.slug,
          name: v.name,
          shortName: v.short_name,
          address: v.address,
          city: v.city,
          latitude: v.latitude,
          longitude: v.longitude,
          venueType: v.venue_type,
          capacity: v.capacity,
          websiteUrl: v.website_url,
          imageUrl: v.image_url,
          zoneId: v.zone_id,
          isMainVenue: v.is_main_venue,
        })),
      };
    },
  );

  // ------------------------------------------------------------------
  // CATEGORIES: All categories for filter UI
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/categories",
    async () => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { categories: [] };
      const rows = await sbFetch<any[]>(cfg, "flowb_event_categories?active=eq.true&order=sort_order.asc");
      return {
        categories: (rows || []).map((c: any) => ({
          id: c.id,
          slug: c.slug,
          name: c.name,
          description: c.description,
          icon: c.icon,
          color: c.color,
          parentId: c.parent_id,
          sortOrder: c.sort_order,
        })),
      };
    },
  );

  // ------------------------------------------------------------------
  // BOOTHS: List booths (filterable by zone, tier, tags, search)
  // ------------------------------------------------------------------
  app.get<{ Querystring: { zone?: string; tier?: string; tags?: string; q?: string; limit?: string } }>(
    "/api/v1/booths",
    async (request) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { booths: [] };

      const { zone, tier, tags, q, limit } = request.query;
      const maxResults = Math.min(parseInt(limit || "50", 10), 200);
      let query = `flowb_booths?active=eq.true&order=sort_order.asc,name.asc&limit=${maxResults}`;
      if (zone) query += `&zone_id=eq.${encodeURIComponent(zone)}`;
      if (tier) query += `&sponsor_tier=eq.${encodeURIComponent(tier)}`;
      if (q) query += `&or=(name.ilike.*${encodeURIComponent(q)}*,description.ilike.*${encodeURIComponent(q)}*)`;
      if (tags) {
        const tagList = tags.split(",").map(t => t.trim()).filter(Boolean);
        for (const t of tagList) {
          query += `&tags=cs.{${encodeURIComponent(t)}}`;
        }
      }

      const rows = await sbFetch<any[]>(cfg, query);
      return { booths: (rows || []).map(dbBoothToResult) };
    },
  );

  // ------------------------------------------------------------------
  // BOOTHS: Featured booths (sponsors)
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/booths/featured",
    async () => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { booths: [] };
      const rows = await sbFetch<any[]>(cfg, "flowb_booths?active=eq.true&featured=eq.true&order=sort_order.asc");
      return { booths: (rows || []).map(dbBoothToResult) };
    },
  );

  // ------------------------------------------------------------------
  // BOOTHS: Single booth detail
  // ------------------------------------------------------------------
  app.get<{ Params: { slug: string } }>(
    "/api/v1/booths/:slug",
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });
      const rows = await sbFetch<any[]>(cfg, `flowb_booths?slug=eq.${encodeURIComponent(request.params.slug)}&active=eq.true&limit=1`);
      if (!rows?.length) return reply.status(404).send({ error: "Booth not found" });
      return { booth: dbBoothToResult(rows[0]) };
    },
  );

  // ------------------------------------------------------------------
  // ADMIN: Create booth
  // ------------------------------------------------------------------
  app.post<{ Body: Record<string, any> }>(
    "/api/v1/admin/booths",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });
      const b: Record<string, any> = request.body || {};
      const slug = b.slug || (b.name as string)?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const result = await sbPost(cfg, "flowb_booths", { ...b, slug });
      return { ok: !!result, booth: result ? dbBoothToResult(result) : null };
    },
  );

  // ------------------------------------------------------------------
  // ADMIN: Update booth
  // ------------------------------------------------------------------
  app.patch<{ Params: { id: string }; Body: Record<string, any> }>(
    "/api/v1/admin/booths/:id",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });
      const updates: Record<string, any> = { ...(request.body || {}), updated_at: new Date().toISOString() };
      fireAndForget(fetch(
        `${cfg.supabaseUrl}/rest/v1/flowb_booths?id=eq.${request.params.id}`,
        {
          method: "PATCH",
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: `Bearer ${cfg.supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify(updates),
        },
      ), "update booth");
      return { ok: true };
    },
  );

  // ------------------------------------------------------------------
  // ADMIN: Assign categories to an event
  // ------------------------------------------------------------------
  app.post<{ Params: { id: string }; Body: { categories: string[] } }>(
    "/api/v1/admin/events/:id/categorize",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });

      const { categories: catSlugs } = request.body || {};
      if (!catSlugs?.length) return reply.status(400).send({ error: "Missing categories array" });

      const catRows = await sbFetch<any[]>(cfg, `flowb_event_categories?slug=in.(${catSlugs.join(",")})&select=id,slug`);
      if (!catRows?.length) return reply.status(400).send({ error: "No valid categories" });

      for (const cat of catRows) {
        fireAndForget(sbPost(cfg, "flowb_event_category_map?on_conflict=event_id,category_id", {
          event_id: request.params.id,
          category_id: cat.id,
          confidence: 1.0,
          source: "admin",
        }, "return=minimal,resolution=merge-duplicates"), "upsert category map");
      }

      return { ok: true, assigned: catRows.map(c => c.slug) };
    },
  );

  // ------------------------------------------------------------------
  // ADMIN: Create venue
  // ------------------------------------------------------------------
  app.post<{ Body: Record<string, any> }>(
    "/api/v1/admin/venues",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });
      const v: Record<string, any> = request.body || {};
      const slug = v.slug || (v.name as string)?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const result = await sbPost(cfg, "flowb_venues", { ...v, slug });
      return { ok: !!result, venue: result };
    },
  );

  // ------------------------------------------------------------------
  // ADMIN: All users (for user manager)
  // ------------------------------------------------------------------
  app.get<{ Querystring: { search?: string; limit?: string } }>(
    "/api/v1/admin/users",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const cfg = getSupabaseConfig();
      if (!cfg) return { users: [] };

      const { search, limit } = request.query;
      const maxResults = Math.min(parseInt(limit || "50", 10), 200);

      let query = `flowb_user_points?select=user_id,total_points,current_streak,longest_streak,milestone_level&order=total_points.desc&limit=${maxResults}`;
      if (search) {
        query += `&user_id=ilike.*${search}*`;
      }

      const users = await sbFetch<any[]>(cfg, query);
      return { users: users || [] };
    },
  );

  // ==================================================================
  // SPONSOR: Helpers
  // ==================================================================

  const BASE_RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";
  // Base USDC contract address
  const USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  // ERC-20 Transfer event topic
  const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

  async function verifyUSDCTransfer(
    txHash: string,
    expectedRecipient: string,
    minAmount: number,
  ): Promise<{ valid: boolean; amount?: number; error?: string }> {
    try {
      const res = await fetch(BASE_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getTransactionReceipt",
          params: [txHash],
        }),
      });
      const data = await res.json() as any;
      const receipt = data?.result;
      if (!receipt || receipt.status !== "0x1") {
        return { valid: false, error: "Transaction not found or failed" };
      }

      // Find USDC Transfer log to our recipient
      const recipientPadded = "0x" + expectedRecipient.slice(2).toLowerCase().padStart(64, "0");
      const transferLog = (receipt.logs || []).find((log: any) =>
        log.address?.toLowerCase() === USDC_CONTRACT.toLowerCase() &&
        log.topics?.[0] === TRANSFER_TOPIC &&
        log.topics?.[2]?.toLowerCase() === recipientPadded
      );

      if (!transferLog) {
        return { valid: false, error: "No USDC transfer to FlowB wallet found" };
      }

      // USDC has 6 decimals
      const rawAmount = BigInt(transferLog.data);
      const amount = Number(rawAmount) / 1e6;

      if (amount < minAmount) {
        return { valid: false, error: `Amount $${amount} below minimum $${minAmount}` };
      }

      return { valid: true, amount };
    } catch (err: any) {
      return { valid: false, error: `RPC error: ${err.message}` };
    }
  }

  function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ==================================================================
  // SPONSOR: Get wallet address
  // ==================================================================
  app.get(
    "/api/v1/sponsor/wallet",
    async () => {
      const address = process.env.CDP_ACCOUNT_ADDRESS || "";
      return { address };
    },
  );

  // ==================================================================
  // SPONSOR: Create sponsorship (requires auth)
  // ==================================================================
  app.post<{ Body: { targetType: string; targetId: string; amountUsdc: number; txHash: string } }>(
    "/api/v1/sponsor",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const { targetType, targetId, amountUsdc, txHash } = request.body || {};
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });

      if (!targetType || !targetId || !txHash) {
        return reply.status(400).send({ error: "Missing targetType, targetId, or txHash" });
      }
      if (!["event", "location", "featured_event"].includes(targetType)) {
        return reply.status(400).send({ error: "targetType must be event, location, or featured_event" });
      }
      if (!amountUsdc || amountUsdc < 0.10) {
        return reply.status(400).send({ error: "Minimum sponsorship is $0.10 USDC" });
      }

      // Insert pending sponsorship
      const row = await sbPost(cfg, "flowb_sponsorships", {
        sponsor_user_id: jwt.sub,
        target_type: targetType,
        target_id: targetId,
        amount_usdc: amountUsdc,
        tx_hash: txHash,
        status: "pending",
      });

      if (!row) {
        return reply.status(500).send({ error: "Failed to create sponsorship" });
      }

      // Award sponsor_created points
      fireAndForget(core.awardPoints(jwt.sub, jwt.platform, "sponsor_created"), "award points");

      // Kick off async verification
      const sponsorId = row.id;
      const walletAddress = process.env.CDP_ACCOUNT_ADDRESS || "";
      (async () => {
        try {
          const result = await verifyUSDCTransfer(txHash, walletAddress, amountUsdc);
          if (result.valid) {
            // Mark verified
            await fetch(`${cfg.supabaseUrl}/rest/v1/flowb_sponsorships?id=eq.${sponsorId}`, {
              method: "PATCH",
              headers: {
                apikey: cfg.supabaseKey,
                Authorization: `Bearer ${cfg.supabaseKey}`,
                "Content-Type": "application/json",
                Prefer: "return=minimal",
              },
              body: JSON.stringify({
                status: "verified",
                verified_at: new Date().toISOString(),
              }),
            });

            // Update location sponsor_amount if target is location
            if (targetType === "location") {
              const locs = await sbFetch<any[]>(cfg, `flowb_locations?id=eq.${targetId}&select=sponsor_amount&limit=1`);
              const currentAmount = Number(locs?.[0]?.sponsor_amount || 0);
              await fetch(`${cfg.supabaseUrl}/rest/v1/flowb_locations?id=eq.${targetId}`, {
                method: "PATCH",
                headers: {
                  apikey: cfg.supabaseKey,
                  Authorization: `Bearer ${cfg.supabaseKey}`,
                  "Content-Type": "application/json",
                  Prefer: "return=minimal",
                },
                body: JSON.stringify({
                  sponsor_amount: currentAmount + (result.amount || amountUsdc),
                }),
              });
            }

            // Award sponsor_verified points
            fireAndForget(core.awardPoints(jwt.sub, jwt.platform, "sponsor_verified"), "award points");
          } else {
            await fetch(`${cfg.supabaseUrl}/rest/v1/flowb_sponsorships?id=eq.${sponsorId}`, {
              method: "PATCH",
              headers: {
                apikey: cfg.supabaseKey,
                Authorization: `Bearer ${cfg.supabaseKey}`,
                "Content-Type": "application/json",
                Prefer: "return=minimal",
              },
              body: JSON.stringify({ status: "rejected" }),
            });
          }
        } catch (err) {
          console.error("[sponsor] Verification error:", err);
        }
      })();

      return { ok: true, sponsorship: row };
    },
  );

  // ==================================================================
  // SPONSOR: Manual verify (internal)
  // ==================================================================
  app.post<{ Params: { id: string } }>(
    "/api/v1/sponsor/:id/verify",
    async (request, reply) => {
      const { id } = request.params;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });

      const rows = await sbFetch<any[]>(cfg, `flowb_sponsorships?id=eq.${id}&select=*&limit=1`);
      if (!rows?.length) return reply.status(404).send({ error: "Sponsorship not found" });

      const sp = rows[0];
      const walletAddress = process.env.CDP_ACCOUNT_ADDRESS || "";
      const result = await verifyUSDCTransfer(sp.tx_hash, walletAddress, Number(sp.amount_usdc));

      if (!result.valid) {
        await fetch(`${cfg.supabaseUrl}/rest/v1/flowb_sponsorships?id=eq.${id}`, {
          method: "PATCH",
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: `Bearer ${cfg.supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ status: "rejected" }),
        });
        return { ok: false, error: result.error };
      }

      await fetch(`${cfg.supabaseUrl}/rest/v1/flowb_sponsorships?id=eq.${id}`, {
        method: "PATCH",
        headers: {
          apikey: cfg.supabaseKey,
          Authorization: `Bearer ${cfg.supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ status: "verified", verified_at: new Date().toISOString() }),
      });

      if (sp.target_type === "location") {
        const locs = await sbFetch<any[]>(cfg, `flowb_locations?id=eq.${sp.target_id}&select=sponsor_amount&limit=1`);
        const currentAmount = Number(locs?.[0]?.sponsor_amount || 0);
        await fetch(`${cfg.supabaseUrl}/rest/v1/flowb_locations?id=eq.${sp.target_id}`, {
          method: "PATCH",
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: `Bearer ${cfg.supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ sponsor_amount: currentAmount + (result.amount || Number(sp.amount_usdc)) }),
        });
      }

      fireAndForget(core.awardPoints(sp.sponsor_user_id, "telegram", "sponsor_verified"), "award points");
      return { ok: true, amount: result.amount };
    },
  );

  // ==================================================================
  // SPONSOR: Rankings
  // ==================================================================
  app.get<{ Querystring: { targetType?: string } }>(
    "/api/v1/sponsor/rankings",
    async (request) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { rankings: [] };

      let query = "flowb_sponsorships?status=eq.verified&select=target_id,amount_usdc,target_type";
      if (request.query.targetType) {
        query += `&target_type=eq.${request.query.targetType}`;
      }

      const rows = await sbFetch<any[]>(cfg, query);
      if (!rows?.length) return { rankings: [] };

      // Aggregate by target_id
      const agg = new Map<string, { total_usdc: number; sponsor_count: number }>();
      for (const r of rows) {
        const existing = agg.get(r.target_id) || { total_usdc: 0, sponsor_count: 0 };
        existing.total_usdc += Number(r.amount_usdc) || 0;
        existing.sponsor_count += 1;
        agg.set(r.target_id, existing);
      }

      const rankings = Array.from(agg.entries())
        .map(([target_id, data]) => ({ target_id, ...data }))
        .sort((a, b) => b.total_usdc - a.total_usdc);

      return { rankings };
    },
  );

  // ==================================================================
  // SPONSOR: Ranked locations (Top Booths)
  // ==================================================================
  app.get(
    "/api/v1/locations/ranked",
    async () => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { locations: [] };

      const rows = await sbFetch<any[]>(
        cfg,
        "flowb_locations?sponsor_amount=gt.0&active=eq.true&order=sponsor_amount.desc&select=id,code,name,sponsor_amount,sponsor_label,latitude,longitude&limit=20",
      );

      return { locations: rows || [] };
    },
  );

  // ==================================================================
  // SPONSOR: Featured event boost (highest verified boost for featured spot)
  // ==================================================================
  app.get(
    "/api/v1/sponsor/featured-event",
    async () => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { featured: null };

      // Get all verified featured_event sponsorships, ordered by amount desc
      const rows = await sbFetch<any[]>(
        cfg,
        "flowb_sponsorships?target_type=eq.featured_event&status=eq.verified&order=amount_usdc.desc&limit=1",
      );

      if (!rows?.length) return { featured: null };

      const top = rows[0];
      return {
        featured: {
          target_id: top.target_id,
          amount_usdc: Number(top.amount_usdc),
          sponsor_user_id: top.sponsor_user_id,
          created_at: top.created_at,
          expires_at: top.expires_at,
        },
      };
    },
  );

  // ==================================================================
  // SPONSOR: Proximity auto-checkin (requires auth)
  // ==================================================================
  app.post<{ Body: { latitude: number; longitude: number; crewId?: string } }>(
    "/api/v1/flow/checkin/proximity",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const { latitude, longitude, crewId } = request.body || {};
      const cfg = getSupabaseConfig();

      if (!cfg || latitude == null || longitude == null) {
        return reply.status(400).send({ error: "Missing latitude/longitude" });
      }

      // Get all active locations with coordinates
      const locations = await sbFetch<any[]>(
        cfg,
        "flowb_locations?active=eq.true&select=id,code,name,latitude,longitude,proximity_radius_m,sponsor_amount",
      );

      if (!locations?.length) return { matched: [] };

      // Find locations within proximity radius
      const matched: any[] = [];
      for (const loc of locations) {
        if (!loc.latitude || !loc.longitude) continue;
        const dist = haversineMeters(latitude, longitude, Number(loc.latitude), Number(loc.longitude));
        const radius = loc.proximity_radius_m || 100;
        if (dist <= radius) {
          matched.push({ ...loc, distance_m: Math.round(dist) });
        }
      }

      if (matched.length === 0) return { matched: [] };

      // Get user's crews for auto-checkin
      let crewIds: string[] = [];
      if (crewId) {
        crewIds = [crewId];
      } else {
        const memberships = await sbFetch<any[]>(cfg, `flowb_group_members?user_id=eq.${jwt.sub}&select=group_id`);
        crewIds = (memberships || []).map((m: any) => m.group_id);
      }

      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const checkins: any[] = [];

      for (const loc of matched) {
        for (const cid of crewIds) {
          // Check for duplicate checkin (same user, crew, location in last 30 min)
          const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
          const existing = await sbFetch<any[]>(
            cfg,
            `flowb_checkins?user_id=eq.${jwt.sub}&crew_id=eq.${cid}&location_id=eq.${loc.id}&created_at=gt.${thirtyMinAgo}&limit=1`,
          );
          if (existing?.length) continue;

          const checkin = await sbPost(cfg, "flowb_checkins", {
            user_id: jwt.sub,
            platform: jwt.platform,
            crew_id: cid,
            venue_name: loc.name,
            status: "here",
            latitude: loc.latitude,
            longitude: loc.longitude,
            location_id: loc.id,
            expires_at: expiresAt,
          });
          if (checkin) checkins.push(checkin);
        }

        // Award points: sponsored_checkin if sponsored, proximity_checkin otherwise
        const isSponsored = Number(loc.sponsor_amount) > 0;
        const action = isSponsored ? "sponsored_checkin" : "proximity_checkin";
        fireAndForget(core.awardPoints(jwt.sub, jwt.platform, action), "award points");
      }

      return {
        matched: matched.map((l) => ({
          id: l.id,
          code: l.code,
          name: l.name,
          distance_m: l.distance_m,
          sponsored: Number(l.sponsor_amount) > 0,
        })),
        checkins: checkins.length,
      };
    },
  );

  // ============================================================================
  // BIZ PROJECTS — FlowB EC managed websites
  // ============================================================================

  // Create project
  app.post<{ Body: any }>("/api/v1/biz/projects", async (request, reply) => {
    const jwt = extractJwt(request);
    if (!jwt?.sub) return reply.status(401).send({ error: "Unauthorized" });
    const sb = getSupabaseConfig();
    if (!sb) return reply.status(500).send({ error: "DB not configured" });

    const { name, slug, domain, platform, supabase_url, supabase_anon_key, supabase_service_key,
            netlify_site_id, netlify_build_hook, stripe_account_id, tg_channel_id, settings } = (request.body || {}) as any;
    if (!name || !slug) return reply.status(400).send({ error: "name and slug required" });
    if (!/^[a-z0-9-]+$/.test(slug)) return reply.status(400).send({ error: "slug must be lowercase alphanumeric with hyphens" });

    const project = await createProject(sb, jwt.sub, {
      name, slug, domain, platform, supabase_url, supabase_anon_key, supabase_service_key,
      netlify_site_id, netlify_build_hook, stripe_account_id, tg_channel_id, settings,
    });
    if (!project) return reply.status(500).send({ error: "Failed to create project" });
    return { ok: true, project };
  });

  // List projects
  app.get("/api/v1/biz/projects", async (request, reply) => {
    const jwt = extractJwt(request);
    if (!jwt?.sub) return reply.status(401).send({ error: "Unauthorized" });
    const sb = getSupabaseConfig();
    if (!sb) return reply.status(500).send({ error: "DB not configured" });
    const projects = await listProjects(sb, jwt.sub);
    return { projects };
  });

  // Get project details
  app.get<{ Params: { slug: string } }>("/api/v1/biz/projects/:slug", async (request, reply) => {
    const jwt = extractJwt(request);
    if (!jwt?.sub) return reply.status(401).send({ error: "Unauthorized" });
    const sb = getSupabaseConfig();
    if (!sb) return reply.status(500).send({ error: "DB not configured" });
    const project = await getProject(sb, request.params.slug);
    if (!project) return reply.status(404).send({ error: "Not found" });
    if (project.owner_id !== jwt.sub) return reply.status(403).send({ error: "Forbidden" });
    // Strip encrypted keys from response
    const { supabase_service_key_enc, ...safe } = project;
    return { project: { ...safe, has_service_key: !!supabase_service_key_enc } };
  });

  // Update project
  app.patch<{ Params: { slug: string }; Body: any }>("/api/v1/biz/projects/:slug", async (request, reply) => {
    const jwt = extractJwt(request);
    if (!jwt?.sub) return reply.status(401).send({ error: "Unauthorized" });
    const sb = getSupabaseConfig();
    if (!sb) return reply.status(500).send({ error: "DB not configured" });
    const ok = await updateProject(sb, request.params.slug, jwt.sub, request.body || {});
    if (!ok) return reply.status(400).send({ error: "Update failed" });
    return { ok: true };
  });

  // Delete project
  app.delete<{ Params: { slug: string } }>("/api/v1/biz/projects/:slug", async (request, reply) => {
    const jwt = extractJwt(request);
    if (!jwt?.sub) return reply.status(401).send({ error: "Unauthorized" });
    const sb = getSupabaseConfig();
    if (!sb) return reply.status(500).send({ error: "DB not configured" });
    const ok = await deleteProject(sb, request.params.slug, jwt.sub);
    if (!ok) return reply.status(400).send({ error: "Delete failed" });
    return { ok: true };
  });

  // Test connection
  app.post<{ Params: { slug: string } }>("/api/v1/biz/projects/:slug/test", async (request, reply) => {
    const jwt = extractJwt(request);
    if (!jwt?.sub) return reply.status(401).send({ error: "Unauthorized" });
    const sb = getSupabaseConfig();
    if (!sb) return reply.status(500).send({ error: "DB not configured" });
    const result = await testConnection(sb, request.params.slug);
    return result;
  });

  // Activity log
  app.get<{ Params: { slug: string }; Querystring: { limit?: string } }>(
    "/api/v1/biz/projects/:slug/activity",
    async (request, reply) => {
      const jwt = extractJwt(request);
      if (!jwt?.sub) return reply.status(401).send({ error: "Unauthorized" });
      const sb = getSupabaseConfig();
      if (!sb) return reply.status(500).send({ error: "DB not configured" });
      const project = await getProject(sb, request.params.slug);
      if (!project) return reply.status(404).send({ error: "Not found" });
      if (project.owner_id !== jwt.sub) return reply.status(403).send({ error: "Forbidden" });
      const limit = parseInt(request.query.limit || "50", 10);
      const activity = await getActivityLog(sb, project.id, limit);
      return { activity };
    },
  );

  // Configure webhook
  app.post<{ Body: { project_slug: string; event_type: string; target: string; target_config?: Record<string, any> } }>(
    "/api/v1/biz/webhooks",
    async (request, reply) => {
      const jwt = extractJwt(request);
      if (!jwt?.sub) return reply.status(401).send({ error: "Unauthorized" });
      const sb = getSupabaseConfig();
      if (!sb) return reply.status(500).send({ error: "DB not configured" });
      const { project_slug, event_type, target, target_config } = request.body || {};
      if (!project_slug || !event_type) return reply.status(400).send({ error: "project_slug and event_type required" });
      const project = await getProject(sb, project_slug);
      if (!project || project.owner_id !== jwt.sub) return reply.status(403).send({ error: "Forbidden" });
      const hook = await createWebhook(sb, project.id, event_type, target || "telegram", target_config || {});
      return { ok: true, webhook: hook };
    },
  );

  // List webhooks
  app.get<{ Params: { projectSlug: string } }>("/api/v1/biz/webhooks/:projectSlug", async (request, reply) => {
    const jwt = extractJwt(request);
    if (!jwt?.sub) return reply.status(401).send({ error: "Unauthorized" });
    const sb = getSupabaseConfig();
    if (!sb) return reply.status(500).send({ error: "DB not configured" });
    const project = await getProject(sb, request.params.projectSlug);
    if (!project || project.owner_id !== jwt.sub) return reply.status(403).send({ error: "Forbidden" });
    const webhooks = await listWebhooks(sb, project.id);
    return { webhooks };
  });

  // Inbound webhook (receives events FROM managed sites)
  app.post<{ Body: { project_slug: string; api_key: string; event: string; data?: any } }>(
    "/api/v1/biz/inbound-webhook",
    async (request, reply) => {
      const sb = getSupabaseConfig();
      if (!sb) return reply.status(500).send({ error: "DB not configured" });
      const { project_slug, api_key, event, data } = request.body || {};
      if (!project_slug || !api_key || !event) return reply.status(400).send({ error: "Missing required fields" });

      const project = await getProject(sb, project_slug);
      if (!project) return reply.status(404).send({ error: "Unknown project" });

      // Verify API key matches stored (encrypted) service key
      if (!project.supabase_service_key_enc) return reply.status(403).send({ error: "No key configured" });
      try {
        const { decrypt } = await import("../plugins/websites/vault.js");
        const stored = decrypt(project.supabase_service_key_enc);
        if (stored !== api_key) return reply.status(403).send({ error: "Invalid API key" });
      } catch {
        return reply.status(403).send({ error: "Key verification failed" });
      }

      // Log activity
      await logActivity(sb, project.id, "site", event, data?.entity_type, data?.entity_id, data);

      // Dispatch to configured webhooks
      await dispatchWebhook(sb, project.id, event, { project_slug, event, ...data });

      // Notify TG channel
      if (project.tg_channel_id) {
        try {
          const { notifyBizChannel } = await import("../services/biz-notifications.js");
          await notifyBizChannel(project, event, data || {});
        } catch (err) {
          console.error("[biz-webhook] notification error:", err);
        }
      }

      return { ok: true };
    },
  );

  // ============================================================================
  // AGENTS — see agent-routes.ts
  // ============================================================================
  registerAgentRoutes(app, core);
  registerFiFlowRoutes(app, core);

  // ------------------------------------------------------------------
  // Payment Routes (checkout, subscriptions, wallets)
  // ------------------------------------------------------------------
  registerPaymentRoutes(app);

  // ------------------------------------------------------------------
  // FEEDBACK: Submit bug reports, feature requests, feedback
  // ------------------------------------------------------------------
  app.post<{
    Body: { type?: string; message: string; contact?: string; screen?: string };
  }>(
    "/api/v1/feedback",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          required: ["message"],
          properties: {
            type: { type: "string", enum: ["bug", "feature", "feedback"] },
            message: { type: "string", minLength: 1, maxLength: 2000 },
            contact: { type: "string", maxLength: 200 },
            screen: { type: "string", maxLength: 100 },
          },
        },
      },
    },
    async (request, reply) => {
      const { type = "feedback", message, contact, screen } = request.body;

      // Optional auth -- feedback works for logged-in and anonymous users
      const jwt = extractJwt(request);
      const userId = jwt?.sub || null;
      const platform = jwt?.platform || "web";

      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Database not configured" });

      // 1. Save to DB
      const { sbInsert } = await import("../utils/supabase.js");
      const row = await sbInsert(cfg, "flowb_feedback", {
        user_id: userId,
        platform,
        type,
        message,
        contact: contact || null,
        screen: screen || null,
        user_agent: request.headers["user-agent"] || null,
      });

      // 2. Forward to Telegram feedback channel
      const channelId = process.env.FLOWB_FEEDBACK_CHANNEL_ID;
      const botToken = process.env.FLOWB_TELEGRAM_BOT_TOKEN;
      if (channelId && botToken) {
        const typeEmoji = type === "bug" ? "\u{1F41B}" : type === "feature" ? "\u{1F4A1}" : "\u{1F4AC}";
        const label = type === "bug" ? "Bug Report" : type === "feature" ? "Feature Request" : "Feedback";
        const who = userId || "anonymous";
        const contactLine = contact ? `\nContact: ${contact}` : "";
        const screenLine = screen ? `\nScreen: ${screen}` : "";

        const text = `${typeEmoji} <b>${label}</b>\n\n${message}\n\n<i>From: ${who} (${platform})${contactLine}${screenLine}</i>`;

        fireAndForget(
          fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: channelId,
              text,
              parse_mode: "HTML",
            }),
          }).catch((err) => log.warn("[feedback]", "TG channel send failed", { error: String(err) })),
          "feedback-channel",
        );
      }

      // 3. Alert admins for feature requests and bug reports
      if (type === "feature" || type === "bug") {
        const who = userId || "anonymous";
        const preview = message.length > 200 ? message.slice(0, 197) + "..." : message;
        const label = type === "bug" ? "Bug report" : "Feature request";
        alertAdmins(`${label} from <b>${who}</b> (${platform}):\n\n${preview}`, type === "bug" ? "urgent" : "important");
      }

      // 4. Award points for giving feedback
      if (userId) {
        fireAndForget(core.awardPoints(userId, platform, "feedback_submitted"), "award feedback points");
      }

      return { ok: true, id: row?.id || null };
    },
  );

  // ------------------------------------------------------------------
  // SOCIAL: Organization & multi-platform posting
  // ------------------------------------------------------------------

  const socialPlugin = core.getSocialPlugin();
  const socialCfg = core.getSocialConfig();

  // GET /api/v1/social/providers (public)
  app.get("/api/v1/social/providers", async () => {
    const { SOCIAL_PROVIDERS } = await import("../plugins/social/types.js");
    return { providers: SOCIAL_PROVIDERS };
  });

  // POST /api/v1/social/orgs - Create a social org
  app.post<{ Body: { name: string } }>(
    "/api/v1/social/orgs",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      preHandler: [authMiddleware],
      schema: {
        body: {
          type: "object",
          required: ["name"],
          properties: { name: { type: "string", minLength: 1, maxLength: 100 } },
        },
      },
    },
    async (request, reply) => {
      const jwt = (request as any).jwt as JWTPayload;
      if (!socialPlugin || !socialCfg) {
        return reply.status(503).send({ error: "Social plugin not available" });
      }

      const result = await socialPlugin.createOrg(socialCfg, jwt.sub, request.body.name);
      if (!result) {
        return reply.status(500).send({ error: "Failed to create organization" });
      }

      fireAndForget(core.awardPoints(jwt.sub, jwt.platform, "social_org_created"), "award social org points");

      return result;
    },
  );

  // POST /api/v1/social/orgs/:orgId/members - Add a team member
  app.post<{ Params: { orgId: string }; Body: { userId: string; role: string } }>(
    "/api/v1/social/orgs/:orgId/members",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      preHandler: [authMiddleware],
      schema: {
        body: {
          type: "object",
          required: ["userId", "role"],
          properties: {
            userId: { type: "string" },
            role: { type: "string", enum: ["admin", "member"] },
          },
        },
      },
    },
    async (request, reply) => {
      const jwt = (request as any).jwt as JWTPayload;
      if (!socialPlugin || !socialCfg) {
        return reply.status(503).send({ error: "Social plugin not available" });
      }

      const { orgId } = request.params;
      if (!await socialPlugin.checkOrgAccess(socialCfg, jwt.sub, orgId, "owner")) {
        return reply.status(403).send({ error: "Only org owners can add members" });
      }

      const { sbInsert: sbIns } = await import("../utils/supabase.js");
      const member = await sbIns(socialCfg, "flowb_social_org_members", {
        org_id: orgId,
        user_id: request.body.userId,
        role: request.body.role,
      });

      if (!member) {
        return reply.status(500).send({ error: "Failed to add member" });
      }

      return { ok: true, member };
    },
  );

  // POST /api/v1/social/connect - Get Postiz connect URL
  app.post<{ Body: { orgId?: string } }>(
    "/api/v1/social/connect",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      const jwt = (request as any).jwt as JWTPayload;
      if (!socialPlugin || !socialCfg) {
        return reply.status(503).send({ error: "Social plugin not available" });
      }

      const result = await socialPlugin.execute("social-connect", {
        action: "social-connect",
        user_id: jwt.sub,
        org_id: request.body?.orgId,
      }, { userId: jwt.sub, platform: jwt.platform, config: core["config"] });

      return JSON.parse(result);
    },
  );

  // GET /api/v1/social/accounts - List connected social accounts
  app.get<{ Querystring: { orgId?: string } }>(
    "/api/v1/social/accounts",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      const jwt = (request as any).jwt as JWTPayload;
      if (!socialPlugin || !socialCfg) {
        return reply.status(503).send({ error: "Social plugin not available" });
      }

      const result = await socialPlugin.execute("social-accounts", {
        action: "social-accounts",
        user_id: jwt.sub,
        org_id: request.query.orgId,
      }, { userId: jwt.sub, platform: jwt.platform, config: core["config"] });

      return JSON.parse(result);
    },
  );

  // POST /api/v1/social/post - Post to platforms immediately
  app.post<{
    Body: { orgId?: string; text: string; platforms: string[]; mediaUrls?: string[] };
  }>(
    "/api/v1/social/post",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      preHandler: [authMiddleware],
      schema: {
        body: {
          type: "object",
          required: ["text", "platforms"],
          properties: {
            orgId: { type: "string" },
            text: { type: "string", minLength: 1, maxLength: 5000 },
            platforms: { type: "array", items: { type: "string" }, minItems: 1 },
            mediaUrls: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
    async (request, reply) => {
      const jwt = (request as any).jwt as JWTPayload;
      if (!socialPlugin || !socialCfg) {
        return reply.status(503).send({ error: "Social plugin not available" });
      }

      const { orgId, text, platforms, mediaUrls } = request.body;

      const result = await socialPlugin.execute("social-post", {
        action: "social-post",
        user_id: jwt.sub,
        query: text,
        org_id: orgId,
        platforms,
        media_urls: mediaUrls,
      }, { userId: jwt.sub, platform: jwt.platform, config: core["config"] });

      const parsed = JSON.parse(result);
      if (parsed.success) {
        fireAndForget(core.awardPoints(jwt.sub, jwt.platform, "social_post"), "award social post points");
      }

      return parsed;
    },
  );

  // POST /api/v1/social/schedule - Schedule a post
  app.post<{
    Body: { orgId?: string; text: string; platforms: string[]; scheduledAt: string; mediaUrls?: string[] };
  }>(
    "/api/v1/social/schedule",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      preHandler: [authMiddleware],
      schema: {
        body: {
          type: "object",
          required: ["text", "platforms", "scheduledAt"],
          properties: {
            orgId: { type: "string" },
            text: { type: "string", minLength: 1, maxLength: 5000 },
            platforms: { type: "array", items: { type: "string" }, minItems: 1 },
            scheduledAt: { type: "string" },
            mediaUrls: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
    async (request, reply) => {
      const jwt = (request as any).jwt as JWTPayload;
      if (!socialPlugin || !socialCfg) {
        return reply.status(503).send({ error: "Social plugin not available" });
      }

      const { orgId, text, platforms, scheduledAt, mediaUrls } = request.body;

      const result = await socialPlugin.execute("social-schedule", {
        action: "social-schedule",
        user_id: jwt.sub,
        query: text,
        org_id: orgId,
        platforms,
        scheduled_at: scheduledAt,
        media_urls: mediaUrls,
      }, { userId: jwt.sub, platform: jwt.platform, config: core["config"] });

      const parsed = JSON.parse(result);
      if (parsed.success) {
        fireAndForget(core.awardPoints(jwt.sub, jwt.platform, "social_scheduled"), "award social schedule points");
      }

      return parsed;
    },
  );

  // DELETE /api/v1/social/posts/:id - Cancel a post
  app.delete<{ Params: { id: string } }>(
    "/api/v1/social/posts/:id",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      const jwt = (request as any).jwt as JWTPayload;
      if (!socialPlugin || !socialCfg) {
        return reply.status(503).send({ error: "Social plugin not available" });
      }

      const result = await socialPlugin.execute("social-cancel", {
        action: "social-cancel",
        user_id: jwt.sub,
        post_id: request.params.id,
      }, { userId: jwt.sub, platform: jwt.platform, config: core["config"] });

      return { ok: true, message: result };
    },
  );

  // GET /api/v1/social/posts - List post history
  app.get<{ Querystring: { orgId?: string; limit?: string; offset?: string } }>(
    "/api/v1/social/posts",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      const jwt = (request as any).jwt as JWTPayload;
      if (!socialPlugin || !socialCfg) {
        return reply.status(503).send({ error: "Social plugin not available" });
      }

      const result = await socialPlugin.execute("social-history", {
        action: "social-history",
        user_id: jwt.sub,
        org_id: request.query.orgId,
      } as any, { userId: jwt.sub, platform: jwt.platform, config: core["config"] });

      return JSON.parse(result);
    },
  );

  // ------------------------------------------------------------------
  // SOCIALB: Auto-repost Farcaster casts to all platforms
  // ------------------------------------------------------------------

  // GET /api/v1/socialb/config
  app.get(
    "/api/v1/socialb/config",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = (request as any).jwtPayload as JWTPayload;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(503).send({ error: "Database not configured" });

      const { sbQuery } = await import("../utils/supabase.js");
      const configs = await sbQuery<any[]>(cfg, "flowb_socialb_configs", {
        select: "*",
        user_id: `eq.${jwt.sub}`,
        limit: "1",
      });

      if (!configs?.length) return { config: null };
      return { config: configs[0] };
    },
  );

  // POST /api/v1/socialb/config
  app.post<{
    Body: {
      farcaster_fid: number;
      org_id: string;
      enabled?: boolean;
      platforms?: string[];
      auto_media?: boolean;
      include_links?: boolean;
      exclude_replies?: boolean;
      exclude_recasts?: boolean;
      daily_limit?: number;
    };
  }>(
    "/api/v1/socialb/config",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = (request as any).jwtPayload as JWTPayload;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(503).send({ error: "Database not configured" });

      const { sbQuery, sbInsert, sbPatch } = await import("../utils/supabase.js");
      const body = request.body;

      // Check if config exists
      const existing = await sbQuery<any[]>(cfg, "flowb_socialb_configs", {
        select: "id",
        user_id: `eq.${jwt.sub}`,
        limit: "1",
      });

      if (existing?.length) {
        // Update
        const updates: Record<string, any> = { updated_at: new Date().toISOString() };
        if (body.enabled !== undefined) updates.enabled = body.enabled;
        if (body.platforms) updates.platforms = body.platforms;
        if (body.auto_media !== undefined) updates.auto_media = body.auto_media;
        if (body.include_links !== undefined) updates.include_links = body.include_links;
        if (body.exclude_replies !== undefined) updates.exclude_replies = body.exclude_replies;
        if (body.exclude_recasts !== undefined) updates.exclude_recasts = body.exclude_recasts;
        if (body.daily_limit !== undefined) updates.daily_limit = body.daily_limit;

        await sbPatch(cfg, "flowb_socialb_configs", { id: `eq.${existing[0].id}` }, updates);

        const updated = await sbQuery<any[]>(cfg, "flowb_socialb_configs", {
          select: "*",
          id: `eq.${existing[0].id}`,
          limit: "1",
        });

        return { config: updated?.[0] || null, updated: true };
      }

      // Create
      if (!body.farcaster_fid || !body.org_id) {
        return reply.status(400).send({ error: "farcaster_fid and org_id required" });
      }

      const row = await sbInsert(cfg, "flowb_socialb_configs", {
        user_id: jwt.sub,
        org_id: body.org_id,
        farcaster_fid: body.farcaster_fid,
        enabled: body.enabled ?? false,
        platforms: body.platforms || [],
        auto_media: body.auto_media ?? true,
        include_links: body.include_links ?? true,
        exclude_replies: body.exclude_replies ?? true,
        exclude_recasts: body.exclude_recasts ?? true,
        daily_limit: body.daily_limit ?? 10,
      });

      if (!row) return reply.status(500).send({ error: "Failed to create config" });

      // Award points for enabling SocialB
      fireAndForget(core.awardPoints(jwt.sub, jwt.platform, "socialb_enabled"), "socialb-points");

      return { config: row, created: true };
    },
  );

  // POST /api/v1/socialb/config/toggle
  app.post(
    "/api/v1/socialb/config/toggle",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = (request as any).jwtPayload as JWTPayload;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(503).send({ error: "Database not configured" });

      const { sbQuery, sbPatch } = await import("../utils/supabase.js");
      const configs = await sbQuery<any[]>(cfg, "flowb_socialb_configs", {
        select: "id,enabled",
        user_id: `eq.${jwt.sub}`,
        limit: "1",
      });

      if (!configs?.length) return reply.status(404).send({ error: "No SocialB config found" });

      const newEnabled = !configs[0].enabled;
      await sbPatch(cfg, "flowb_socialb_configs", { id: `eq.${configs[0].id}` }, {
        enabled: newEnabled,
        updated_at: new Date().toISOString(),
      });

      return { enabled: newEnabled };
    },
  );

  // DELETE /api/v1/socialb/config
  app.delete(
    "/api/v1/socialb/config",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = (request as any).jwtPayload as JWTPayload;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(503).send({ error: "Database not configured" });

      const { sbPatch } = await import("../utils/supabase.js");
      await sbPatch(cfg, "flowb_socialb_configs", { user_id: `eq.${jwt.sub}` }, {
        enabled: false,
        updated_at: new Date().toISOString(),
      });

      return { ok: true, disabled: true };
    },
  );

  // GET /api/v1/socialb/activity
  app.get<{ Querystring: { limit?: string } }>(
    "/api/v1/socialb/activity",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = (request as any).jwtPayload as JWTPayload;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(503).send({ error: "Database not configured" });

      const limit = Math.min(parseInt(request.query.limit || "20", 10), 50);
      const { sbQuery } = await import("../utils/supabase.js");

      // Get config ID
      const configs = await sbQuery<any[]>(cfg, "flowb_socialb_configs", {
        select: "id",
        user_id: `eq.${jwt.sub}`,
        limit: "1",
      });

      if (!configs?.length) return { activity: [] };

      const activity = await sbQuery<any[]>(cfg, "flowb_socialb_activity", {
        select: "*",
        config_id: `eq.${configs[0].id}`,
        order: "created_at.desc",
        limit: String(limit),
      });

      return { activity: activity || [] };
    },
  );

  // POST /api/v1/socialb/webhook — Neynar cast.created webhook
  app.post<{ Body: any }>(
    "/api/v1/socialb/webhook",
    {
      config: { rateLimit: { max: 100, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      // Verify HMAC signature from Neynar
      const signature = request.headers["x-neynar-signature"] as string;
      const webhookSecret = process.env.NEYNAR_WEBHOOK_SECRET;

      if (webhookSecret && signature) {
        const { createHmac } = await import("crypto");
        const body = JSON.stringify(request.body);
        const expected = createHmac("sha512", webhookSecret).update(body).digest("hex");
        if (signature !== expected) {
          return reply.status(401).send({ error: "Invalid signature" });
        }
      }

      const event = request.body as any;
      if (event?.type !== "cast.created") {
        return { ok: true, skipped: true };
      }

      const cast = event.data;
      if (!cast?.author?.fid) return { ok: true, skipped: true };

      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(503).send({ error: "Database not configured" });

      const { sbQuery: sq } = await import("../utils/supabase.js");
      const configs = await sq<any[]>(cfg, "flowb_socialb_configs", {
        select: "*",
        farcaster_fid: `eq.${cast.author.fid}`,
        enabled: "eq.true",
        limit: "1",
      });

      if (!configs?.length) return { ok: true, skipped: true, reason: "no config" };

      const config = configs[0];

      if (!socialCfg) return reply.status(503).send({ error: "Social plugin not configured" });

      const { handleNewCast } = await import("../services/socialb-repost.js");
      const result = await handleNewCast(cast, config, socialCfg);

      if (result.success) {
        fireAndForget(core.awardPoints(config.user_id, "farcaster", "socialb_repost"), "socialb-points");
      }

      return { ok: true, ...result };
    },
  );

  // POST /api/v1/socialb/chat — AI chat for custom flows
  app.post<{ Body: { message: string } }>(
    "/api/v1/socialb/chat",
    {
      preHandler: authMiddleware,
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const jwt = (request as any).jwtPayload as JWTPayload;
      const { message } = request.body || {};

      if (!message) return reply.status(400).send({ error: "Message required" });

      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(503).send({ error: "Database not configured" });

      const { sbQuery: sq } = await import("../utils/supabase.js");
      const configs = await sq<any[]>(cfg, "flowb_socialb_configs", {
        select: "*",
        user_id: `eq.${jwt.sub}`,
        limit: "1",
      });

      if (!configs?.length) {
        return reply.status(404).send({ error: "Set up SocialB first" });
      }

      if (!socialCfg) return reply.status(503).send({ error: "Social plugin not configured" });

      const neynarApiKey = process.env.NEYNAR_API_KEY;
      if (!neynarApiKey) return reply.status(503).send({ error: "Neynar not configured" });

      const { handleSocialBChat } = await import("../services/socialb-chat.js");
      const result = await handleSocialBChat(jwt.sub, message, {
        config: configs[0],
        socialCfg,
        neynarApiKey,
      });

      return result;
    },
  );


  // ------------------------------------------------------------------
  // SOCIAL AWARENESS: What's happening (contextual dashboard)
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/flow/whats-happening",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { friends_nearby: 0, crew_nearby: 0, friend_events: [], crew_checkins: [] };

      // 1. Get user's current city
      const meRows = await sbFetch<any[]>(cfg,
        `flowb_sessions?user_id=eq.${jwt.sub}&select=current_city&limit=1`);
      const myCity = meRows?.[0]?.current_city || null;

      // 2. Get friend IDs
      const connections = await sbFetch<any[]>(cfg,
        `flowb_connections?user_id=eq.${jwt.sub}&status=eq.active&select=friend_id`);
      const friendIds = (connections || []).map((c: any) => c.friend_id);

      // 3. Get crew member IDs (via group_members)
      const myMemberships = await sbFetch<any[]>(cfg,
        `flowb_group_members?user_id=eq.${jwt.sub}&select=group_id`);
      const crewIds = (myMemberships || []).map((m: any) => m.group_id);

      let crewMemberIds: string[] = [];
      if (crewIds.length) {
        const crewMembers = await sbFetch<any[]>(cfg,
          `flowb_group_members?group_id=in.(${crewIds.join(",")})&user_id=neq.${jwt.sub}&select=user_id`);
        crewMemberIds = [...new Set((crewMembers || []).map((m: any) => m.user_id))];
      }

      // 4. Count friends in my current city
      let friendsNearby = 0;
      if (myCity && friendIds.length) {
        const inClause = friendIds.map((id: string) => `"${id}"`).join(",");
        const nearbyRows = await sbFetch<any[]>(cfg,
          `flowb_sessions?user_id=in.(${inClause})&current_city=eq.${encodeURIComponent(myCity)}&location_visibility=neq.hidden&select=user_id`);
        friendsNearby = nearbyRows?.length || 0;
      }

      // 5. Count crew members in my current city
      let crewNearby = 0;
      if (myCity && crewMemberIds.length) {
        const inClause = crewMemberIds.map((id: string) => `"${id}"`).join(",");
        const nearbyCrewRows = await sbFetch<any[]>(cfg,
          `flowb_sessions?user_id=in.(${inClause})&current_city=eq.${encodeURIComponent(myCity)}&location_visibility=neq.hidden&select=user_id`);
        crewNearby = nearbyCrewRows?.length || 0;
      }

      // 6. Upcoming events friends are RSVPed to (next 48h)
      const soon = new Date(Date.now() + 48 * 3600_000).toISOString();
      const now = new Date().toISOString();
      let friendEvents: any[] = [];
      if (friendIds.length) {
        const inClause = friendIds.map((id: string) => `"${id}"`).join(",");
        const attendance = await sbFetch<any[]>(cfg,
          `flowb_event_attendance?user_id=in.(${inClause})&status=eq.going&select=user_id,event_id`);

        if (attendance?.length) {
          // Get unique event IDs and look them up
          const eventIds = [...new Set(attendance.map((a: any) => a.event_id))];
          const eventIdClause = eventIds.map((id: string) => `"${id}"`).join(",");
          const events = await sbFetch<any[]>(cfg,
            `flowb_events?id=in.(${eventIdClause})&starts_at=gte.${now}&starts_at=lte.${soon}&select=id,title,starts_at,venue_name&order=starts_at.asc&limit=10`);

          // Resolve display names
          const nameRows = friendIds.length
            ? await sbFetch<any[]>(cfg, `flowb_sessions?user_id=in.(${inClause})&select=user_id,display_name`)
            : [];
          const nameMap = new Map((nameRows || []).map((r: any) => [r.user_id, r.display_name || "Someone"]));

          // Match friends to events
          const attendanceByEvent = new Map<string, string[]>();
          for (const a of attendance) {
            const list = attendanceByEvent.get(a.event_id) || [];
            const name = nameMap.get(a.user_id) || "Someone";
            if (!list.includes(name)) list.push(name);
            attendanceByEvent.set(a.event_id, list);
          }

          friendEvents = (events || []).map((e: any) => ({
            event_id: e.id,
            title: e.title,
            starts_at: e.starts_at,
            venue: e.venue_name,
            friends_going: attendanceByEvent.get(e.id) || [],
          }));
        }
      }

      // 7. Recent crew check-ins (last 24h)
      const cutoff24h = new Date(Date.now() - 24 * 3600_000).toISOString();
      let crewCheckins: any[] = [];
      if (crewIds.length) {
        const checkins = await sbFetch<any[]>(cfg,
          `flowb_checkins?crew_id=in.(${crewIds.join(",")})&created_at=gte.${cutoff24h}&user_id=neq.${jwt.sub}&order=created_at.desc&select=user_id,venue_name,status,message,created_at,crew_id&limit=20`);

        if (checkins?.length) {
          // Resolve names
          const checkinUserIds = [...new Set(checkins.map((c: any) => c.user_id))];
          const checkinNameRows = await sbFetch<any[]>(cfg,
            `flowb_sessions?user_id=in.(${checkinUserIds.map((id: string) => `"${id}"`).join(",")})&select=user_id,display_name`);
          const checkinNameMap = new Map((checkinNameRows || []).map((r: any) => [r.user_id, r.display_name || "Someone"]));

          // Resolve crew names
          const crewRows = await sbFetch<any[]>(cfg,
            `flowb_groups?id=in.(${crewIds.join(",")})&select=id,name,emoji`);
          const crewNameMap = new Map((crewRows || []).map((c: any) => [c.id, { name: c.name, emoji: c.emoji || "" }]));

          crewCheckins = checkins.map((c: any) => ({
            user: checkinNameMap.get(c.user_id) || "Someone",
            venue: c.venue_name,
            status: c.status,
            message: c.message,
            crew: crewNameMap.get(c.crew_id) || { name: "Unknown", emoji: "" },
            when: c.created_at,
          }));
        }
      }

      return {
        city: myCity,
        friends_nearby: friendsNearby,
        crew_nearby: crewNearby,
        friend_events: friendEvents,
        crew_checkins: crewCheckins,
      };
    },
  );

  // ------------------------------------------------------------------
  // SOCIAL AWARENESS: After party — where is everyone heading next?
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/flow/after-party",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { destinations: [], upcoming_events: [] };

      // 1. Get friend + crew member IDs
      const connections = await sbFetch<any[]>(cfg,
        `flowb_connections?user_id=eq.${jwt.sub}&status=eq.active&select=friend_id`);
      const friendIds = (connections || []).map((c: any) => c.friend_id);

      const myMemberships = await sbFetch<any[]>(cfg,
        `flowb_group_members?user_id=eq.${jwt.sub}&select=group_id`);
      const crewIds = (myMemberships || []).map((m: any) => m.group_id);

      let crewMemberIds: string[] = [];
      if (crewIds.length) {
        const crewMembers = await sbFetch<any[]>(cfg,
          `flowb_group_members?group_id=in.(${crewIds.join(",")})&user_id=neq.${jwt.sub}&select=user_id`);
        crewMemberIds = (crewMembers || []).map((m: any) => m.user_id);
      }

      const allPeopleIds = [...new Set([...friendIds, ...crewMemberIds])];
      if (!allPeopleIds.length) return { destinations: [], upcoming_events: [] };

      const inClause = allPeopleIds.map((id: string) => `"${id}"`).join(",");

      // 2. Look at destination_city values
      const sessions = await sbFetch<any[]>(cfg,
        `flowb_sessions?user_id=in.(${inClause})&destination_city=not.is.null&location_visibility=neq.hidden&select=user_id,display_name,destination_city`);

      // Group by destination city
      const destMap = new Map<string, string[]>();
      for (const s of sessions || []) {
        if (!s.destination_city) continue;
        const list = destMap.get(s.destination_city) || [];
        list.push(s.display_name || "Someone");
        destMap.set(s.destination_city, list);
      }

      const destinations = [...destMap.entries()]
        .map(([city, people]) => ({ city, people, count: people.length }))
        .sort((a, b) => b.count - a.count);

      // 3. Events happening later today or tomorrow that friends/crew are going to
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      const tomorrowEnd = new Date(todayEnd.getTime() + 24 * 3600_000);
      const now = new Date().toISOString();

      const attendance = await sbFetch<any[]>(cfg,
        `flowb_event_attendance?user_id=in.(${inClause})&status=eq.going&select=user_id,event_id`);

      let upcomingEvents: any[] = [];
      if (attendance?.length) {
        const eventIds = [...new Set(attendance.map((a: any) => a.event_id))];
        const eventIdClause = eventIds.map((id: string) => `"${id}"`).join(",");
        const events = await sbFetch<any[]>(cfg,
          `flowb_events?id=in.(${eventIdClause})&starts_at=gte.${now}&starts_at=lte.${tomorrowEnd.toISOString()}&select=id,title,starts_at,venue_name&order=starts_at.asc&limit=15`);

        // Resolve names
        const nameRows = await sbFetch<any[]>(cfg,
          `flowb_sessions?user_id=in.(${inClause})&select=user_id,display_name`);
        const nameMap = new Map((nameRows || []).map((r: any) => [r.user_id, r.display_name || "Someone"]));

        const attendanceByEvent = new Map<string, string[]>();
        for (const a of attendance) {
          const list = attendanceByEvent.get(a.event_id) || [];
          const name = nameMap.get(a.user_id) || "Someone";
          if (!list.includes(name)) list.push(name);
          attendanceByEvent.set(a.event_id, list);
        }

        upcomingEvents = (events || [])
          .filter((e: any) => (attendanceByEvent.get(e.id)?.length || 0) > 0)
          .map((e: any) => ({
            event_id: e.id,
            title: e.title,
            starts_at: e.starts_at,
            venue: e.venue_name,
            people_going: attendanceByEvent.get(e.id) || [],
          }));
      }

      return {
        destinations,
        upcoming_events: upcomingEvents,
      };
    },
  );

  // ------------------------------------------------------------------
  // SOCIAL AWARENESS: Who's here — at an event or in a city
  // ------------------------------------------------------------------
  app.get<{ Querystring: { event_id?: string; city?: string } }>(
    "/api/v1/flow/whos-here",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { crew: [], friends: [], others: [] };

      const q = request.query as any;
      const eventId = q.event_id;
      let city = q.city;

      // Get friend IDs
      const connections = await sbFetch<any[]>(cfg,
        `flowb_connections?user_id=eq.${jwt.sub}&status=eq.active&select=friend_id`);
      const friendIdSet = new Set((connections || []).map((c: any) => c.friend_id));

      // Get crew member IDs
      const myMemberships = await sbFetch<any[]>(cfg,
        `flowb_group_members?user_id=eq.${jwt.sub}&select=group_id`);
      const crewIds = (myMemberships || []).map((m: any) => m.group_id);

      const crewMemberIdSet = new Set<string>();
      if (crewIds.length) {
        const crewMembers = await sbFetch<any[]>(cfg,
          `flowb_group_members?group_id=in.(${crewIds.join(",")})&user_id=neq.${jwt.sub}&select=user_id`);
        for (const m of crewMembers || []) crewMemberIdSet.add(m.user_id);
      }

      // --- Event mode: who RSVPed or checked in ---
      if (eventId) {
        const goingRows = await sbFetch<any[]>(cfg,
          `flowb_event_attendance?event_id=eq.${encodeURIComponent(eventId)}&status=in.(going,maybe)&select=user_id,status`);

        // Also check for recent check-ins at this event's venue
        let eventVenue: string | null = null;
        const eventRows = await sbFetch<any[]>(cfg,
          `flowb_events?id=eq.${encodeURIComponent(eventId)}&select=title,venue_name&limit=1`);
        eventVenue = eventRows?.[0]?.venue_name || null;

        const cutoff2h = new Date(Date.now() - 2 * 3600_000).toISOString();
        let venueCheckins: any[] = [];
        if (eventVenue) {
          venueCheckins = await sbFetch<any[]>(cfg,
            `flowb_checkins?venue_name=eq.${encodeURIComponent(eventVenue)}&created_at=gte.${cutoff2h}&select=user_id`) || [];
        }

        // Merge attendees and check-in users
        const allUserIds = new Set<string>();
        const statusMap = new Map<string, string>();
        for (const r of goingRows || []) {
          allUserIds.add(r.user_id);
          statusMap.set(r.user_id, r.status);
        }
        for (const c of venueCheckins) {
          allUserIds.add(c.user_id);
          if (!statusMap.has(c.user_id)) statusMap.set(c.user_id, "checked-in");
        }
        allUserIds.delete(jwt.sub);

        // Resolve names
        const userIdArr = [...allUserIds];
        let nameMap = new Map<string, string>();
        if (userIdArr.length) {
          const nameRows = await sbFetch<any[]>(cfg,
            `flowb_sessions?user_id=in.(${userIdArr.map((id) => `"${id}"`).join(",")})&select=user_id,display_name`);
          nameMap = new Map((nameRows || []).map((r: any) => [r.user_id, r.display_name || "Someone"]));
        }

        // Group by relationship
        const crew: any[] = [];
        const friends: any[] = [];
        const others: any[] = [];
        for (const uid of userIdArr) {
          const person = {
            user_id: uid,
            display_name: nameMap.get(uid) || "Someone",
            status: statusMap.get(uid) || "going",
          };
          if (crewMemberIdSet.has(uid)) crew.push(person);
          else if (friendIdSet.has(uid)) friends.push(person);
          else others.push(person);
        }

        return {
          mode: "event",
          event_id: eventId,
          event_title: eventRows?.[0]?.title || null,
          venue: eventVenue,
          crew,
          friends,
          others,
        };
      }

      // --- City mode: who's in this city ---
      if (!city) {
        // Auto-detect from session
        const meRows = await sbFetch<any[]>(cfg,
          `flowb_sessions?user_id=eq.${jwt.sub}&select=current_city&limit=1`);
        city = meRows?.[0]?.current_city;
      }
      if (!city) return { mode: "city", city: null, crew: [], friends: [], others: [] };

      const cityEncoded = encodeURIComponent(city);
      const allPeopleIds = [...new Set([...friendIdSet, ...crewMemberIdSet])];
      if (!allPeopleIds.length) return { mode: "city", city, crew: [], friends: [], others: [] };

      const inClause = allPeopleIds.map((id: string) => `"${id}"`).join(",");
      const cityPeople = await sbFetch<any[]>(cfg,
        `flowb_sessions?user_id=in.(${inClause})&current_city=eq.${cityEncoded}&location_visibility=neq.hidden&select=user_id,display_name`);

      const crew: any[] = [];
      const friends: any[] = [];
      for (const p of cityPeople || []) {
        if (p.user_id === jwt.sub) continue;
        const person = { user_id: p.user_id, display_name: p.display_name || "Someone" };
        if (crewMemberIdSet.has(p.user_id)) crew.push(person);
        else if (friendIdSet.has(p.user_id)) friends.push(person);
      }

      return {
        mode: "city",
        city,
        crew,
        friends,
        others: [], // City mode doesn't show non-friends for privacy
      };
    },
  );

  // ==================================================================
  // TODOS: Project task tracking (admin + authenticated users)
  // ==================================================================

  // GET /api/v1/todos - List todos with optional filters
  app.get<{
    Querystring: {
      status?: string;
      category?: string;
      priority?: string;
      assigned_to?: string;
      limit?: string;
    };
  }>(
    "/api/v1/todos",
    async (request) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { todos: [] };

      const { status, category, priority, assigned_to, limit } = request.query;

      let query = "flowb_todos?select=*&order=created_at.desc";
      if (status) query += `&status=eq.${status}`;
      else query += `&status=neq.wontfix`; // default: hide wontfix
      if (category) query += `&category=eq.${category}`;
      if (priority) query += `&priority=eq.${priority}`;
      if (assigned_to) query += `&assigned_to=eq.${encodeURIComponent(assigned_to)}`;
      query += `&limit=${limit || "50"}`;

      const rows = await sbFetch<any[]>(cfg, query);
      return { todos: rows || [] };
    },
  );

  // POST /api/v1/todos - Create a todo (admin key or authenticated user)
  app.post<{
    Body: {
      title: string;
      description?: string;
      category?: string;
      priority?: string;
      assigned_to?: string;
      file_ref?: string;
      source?: string;
    };
  }>(
    "/api/v1/todos",
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "DB not configured" });

      // Allow admin key OR JWT auth
      const adminKey = process.env.FLOWB_ADMIN_KEY;
      const isAdmin = adminKey && request.headers["x-admin-key"] === adminKey;
      const jwt = extractJwt(request);

      if (!isAdmin && !jwt) {
        return reply.status(401).send({ error: "Auth required" });
      }

      const { title, description, category, priority, assigned_to, file_ref, source } = request.body;
      if (!title) return reply.status(400).send({ error: "title required" });

      const createdBy = jwt?.sub || "admin";

      const res = await fetch(`${cfg.supabaseUrl}/rest/v1/flowb_todos`, {
        method: "POST",
        headers: {
          apikey: cfg.supabaseKey,
          Authorization: `Bearer ${cfg.supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          title,
          description: description || null,
          category: category || "general",
          priority: priority || "medium",
          status: "open",
          assigned_to: assigned_to || null,
          created_by: createdBy,
          source: source || "api",
          file_ref: file_ref || null,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return reply.status(res.status).send({ error: errText });
      }

      const created = await res.json();
      const todo = Array.isArray(created) ? created[0] : created;

      // Alert admins about new todo
      alertAdmins(
        `New TODO [${(priority || "medium").toUpperCase()}]: <b>${title}</b>${category ? ` (${category})` : ""}${assigned_to ? `\nAssigned: ${assigned_to}` : ""}`,
        priority === "critical" || priority === "high" ? "important" : "info",
      );

      return { todo };
    },
  );

  // PATCH /api/v1/todos/:id - Update a todo
  app.patch<{
    Params: { id: string };
    Body: {
      status?: string;
      priority?: string;
      assigned_to?: string;
      title?: string;
      description?: string;
      category?: string;
    };
  }>(
    "/api/v1/todos/:id",
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "DB not configured" });

      const adminKey = process.env.FLOWB_ADMIN_KEY;
      const isAdmin = adminKey && request.headers["x-admin-key"] === adminKey;
      const jwt = extractJwt(request);

      if (!isAdmin && !jwt) {
        return reply.status(401).send({ error: "Auth required" });
      }

      const { id } = request.params;
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };

      for (const field of ["status", "priority", "assigned_to", "title", "description", "category"] as const) {
        if (request.body[field] !== undefined) {
          updates[field] = request.body[field];
        }
      }

      // Auto-set completed_at
      if (updates.status === "done") {
        updates.completed_at = new Date().toISOString();
      }

      const res = await fetch(
        `${cfg.supabaseUrl}/rest/v1/flowb_todos?id=eq.${id}`,
        {
          method: "PATCH",
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: `Bearer ${cfg.supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(updates),
        },
      );

      if (!res.ok) {
        const errText = await res.text();
        return reply.status(res.status).send({ error: errText });
      }

      const patched = await res.json();
      const todo = Array.isArray(patched) ? patched[0] : patched;

      // Alert admins when todo is completed
      if (updates.status === "done" && todo) {
        alertAdmins(
          `TODO completed: <b>${todo.title}</b>`,
          "info",
        );
      }

      return { todo };
    },
  );

  // ============================================================================
  // ADMIN: eGator Stats & Scan
  // ============================================================================

  app.get(
    "/api/v1/admin/egator/stats",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Supabase not configured" });

      const [
        allEvents,
        staleEvents,
        featuredEvents,
        recentEvents,
      ] = await Promise.all([
        sbFetch<any[]>(cfg, "flowb_events?select=id,source,city,quality_score,image_url,description,venue_name,price,organizer_name,is_free,stale,featured,created_at,last_seen&limit=50000"),
        sbFetch<any[]>(cfg, "flowb_events?stale=eq.true&select=id&limit=50000"),
        sbFetch<any[]>(cfg, "flowb_events?featured=eq.true&select=id&limit=50000"),
        sbFetch<any[]>(cfg, "flowb_events?select=id,title,source,city,quality_score,image_url,created_at&order=created_at.desc&limit=20"),
      ]);

      const events = allEvents || [];
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // By source
      const bySource: Record<string, { count: number; avgQuality: number; qualitySum: number; lastSeen: string }> = {};
      for (const e of events) {
        const src = e.source || "unknown";
        if (!bySource[src]) bySource[src] = { count: 0, avgQuality: 0, qualitySum: 0, lastSeen: "" };
        bySource[src].count++;
        bySource[src].qualitySum += Number(e.quality_score) || 0;
        if (e.last_seen && e.last_seen > (bySource[src].lastSeen || "")) {
          bySource[src].lastSeen = e.last_seen;
        }
      }
      for (const src of Object.keys(bySource)) {
        bySource[src].avgQuality = bySource[src].count > 0
          ? Math.round((bySource[src].qualitySum / bySource[src].count) * 100) / 100
          : 0;
      }

      // By city
      const byCity: Record<string, number> = {};
      for (const e of events) {
        const city = e.city || "unknown";
        byCity[city] = (byCity[city] || 0) + 1;
      }

      // Quality audit
      const withImage = events.filter((e: any) => e.image_url).length;
      const withDescription = events.filter((e: any) => e.description && e.description.length > 10).length;
      const withVenue = events.filter((e: any) => e.venue_name).length;
      const withPrice = events.filter((e: any) => e.price != null || e.is_free != null).length;
      const withOrganizer = events.filter((e: any) => e.organizer_name).length;
      const total = events.length;
      const qualityScores = events.map((e: any) => Number(e.quality_score) || 0);
      const avgQuality = total > 0
        ? Math.round((qualityScores.reduce((a: number, b: number) => a + b, 0) / total) * 100) / 100
        : 0;

      // Freshness
      const createdToday = events.filter((e: any) => e.created_at >= todayStart).length;
      const createdThisWeek = events.filter((e: any) => e.created_at >= weekAgo).length;
      const lastScanTimes = events.map((e: any) => e.last_seen).filter(Boolean).sort();
      const lastScanTime = lastScanTimes.length ? lastScanTimes[lastScanTimes.length - 1] : null;

      // Free events
      const freeCount = events.filter((e: any) => e.is_free === true).length;

      return {
        totals: {
          active: total - (staleEvents?.length || 0),
          stale: staleEvents?.length || 0,
          featured: featuredEvents?.length || 0,
          free: freeCount,
          total,
        },
        bySource,
        byCity,
        quality: {
          avgScore: avgQuality,
          withImage,
          withDescription,
          withVenue,
          withPrice,
          withOrganizer,
          pctImage: total > 0 ? Math.round((withImage / total) * 100) : 0,
          pctDescription: total > 0 ? Math.round((withDescription / total) * 100) : 0,
          pctVenue: total > 0 ? Math.round((withVenue / total) * 100) : 0,
          pctPrice: total > 0 ? Math.round((withPrice / total) * 100) : 0,
          pctOrganizer: total > 0 ? Math.round((withOrganizer / total) * 100) : 0,
        },
        freshness: {
          staleCount: staleEvents?.length || 0,
          lastScanTime,
          createdToday,
          createdThisWeek,
        },
        recentEvents: (recentEvents || []).map((e: any) => ({
          id: e.id,
          title: e.title,
          source: e.source,
          city: e.city,
          qualityScore: e.quality_score,
          hasImage: !!e.image_url,
          createdAt: e.created_at,
        })),
      };
    },
  );

  app.post<{ Body: { city?: string; cities?: string[] } }>(
    "/api/v1/admin/egator/scan",
    { config: { rateLimit: { max: 2, timeWindow: "5 minutes" } } },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Supabase not configured" });

      const body = request.body || {};
      let cities: string[];
      if (body.cities?.length) {
        cities = body.cities;
      } else if (body.city) {
        cities = [body.city];
      } else {
        // Read enabled cities from DB, fall back to env var
        const dbCities = await sbFetch<any[]>(cfg, "flowb_scan_cities?enabled=eq.true&select=city&order=created_at.asc");
        cities = dbCities?.length
          ? dbCities.map((r: any) => r.city)
          : (process.env.SCRAPER_CITIES || "austin,denver").split(",").map((c) => c.trim()).filter(Boolean);
      }

      try {
        const results: ScanResult[] = [];
        for (const city of cities) {
          const result = await scanForNewEvents(
            cfg,
            (opts) => core.discoverEventsRaw(opts),
            city,
          );
          results.push(result);
          // Update last_scan_* on the city row
          sbPatchRaw(cfg, `flowb_scan_cities?city=eq.${encodeURIComponent(city)}`, {
            last_scan_at: new Date().toISOString(),
            last_scan_status: "ok",
            last_scan_new: result.newCount,
            last_scan_updated: result.updatedCount,
          });
        }
        alertNewEvents(results, cities);

        const totals = results.reduce(
          (acc, r) => ({
            newCount: acc.newCount + r.newCount,
            updatedCount: acc.updatedCount + r.updatedCount,
            skippedCount: acc.skippedCount + r.skippedCount,
          }),
          { newCount: 0, updatedCount: 0, skippedCount: 0 },
        );
        return { ok: true, cities, ...totals };
      } catch (err) {
        return reply.status(500).send({
          error: "Scan failed",
          detail: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  // ------------------------------------------------------------------
  // ADMIN: eGator Scan City Management
  // ------------------------------------------------------------------

  // GET /api/v1/admin/egator/cities — list all scan cities
  app.get(
    "/api/v1/admin/egator/cities",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Supabase not configured" });

      const rows = await sbFetch<any[]>(cfg, "flowb_scan_cities?select=*&order=created_at.asc");
      return { cities: rows || [] };
    },
  );

  // POST /api/v1/admin/egator/cities — add a scan city
  app.post<{ Body: { city: string } }>(
    "/api/v1/admin/egator/cities",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Supabase not configured" });

      const city = (request.body?.city || "").trim().toLowerCase();
      if (!city) return reply.status(400).send({ error: "city is required" });

      const row = await sbInsert(cfg, "flowb_scan_cities", { city });
      if (!row) return reply.status(409).send({ error: "City already exists or insert failed" });
      return { ok: true, city: row };
    },
  );

  // POST /api/v1/admin/egator/cities/:city/toggle — toggle enabled
  app.post<{ Params: { city: string } }>(
    "/api/v1/admin/egator/cities/:city/toggle",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Supabase not configured" });

      const city = request.params.city.toLowerCase();
      // Fetch current state
      const rows = await sbFetch<any[]>(cfg, `flowb_scan_cities?city=eq.${encodeURIComponent(city)}&select=enabled&limit=1`);
      if (!rows?.length) return reply.status(404).send({ error: "City not found" });

      const newEnabled = !rows[0].enabled;
      await sbPatch(cfg, "flowb_scan_cities", { city: `eq.${city}` }, { enabled: newEnabled });
      return { ok: true, city, enabled: newEnabled };
    },
  );

  // DELETE /api/v1/admin/egator/cities/:city — remove a city
  app.delete<{ Params: { city: string } }>(
    "/api/v1/admin/egator/cities/:city",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Supabase not configured" });

      const city = request.params.city.toLowerCase();
      const ok = await sbDelete(cfg, "flowb_scan_cities", { city: `eq.${city}` });
      if (!ok) return reply.status(404).send({ error: "City not found or delete failed" });
      return { ok: true, city };
    },
  );

  // ------------------------------------------------------------------
  // ADMIN: eGator Event Management (list, bulk, stale purge, feature, hide)
  // ------------------------------------------------------------------

  // GET /api/v1/admin/egator/events — paginated event list with filters
  app.get<{
    Querystring: {
      page?: string; limit?: string; search?: string;
      city?: string; source?: string; stale?: string;
      featured?: string; hidden?: string; free?: string;
      quality_min?: string; quality_max?: string;
      from?: string; to?: string; sort?: string; order?: string;
    };
  }>(
    "/api/v1/admin/egator/events",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Supabase not configured" });

      const q = request.query;
      const page = Math.max(1, parseInt(q.page || "1", 10));
      const limit = Math.min(100, Math.max(1, parseInt(q.limit || "50", 10)));
      const offset = (page - 1) * limit;

      // Build filter string
      const filters: string[] = [];
      if (q.city) filters.push(`city=eq.${encodeURIComponent(q.city)}`);
      if (q.source) filters.push(`source=eq.${encodeURIComponent(q.source)}`);
      if (q.stale === "true") filters.push("stale=eq.true");
      if (q.stale === "false") filters.push("stale=eq.false");
      if (q.featured === "true") filters.push("featured=eq.true");
      if (q.featured === "false") filters.push("featured=eq.false");
      if (q.hidden === "true") filters.push("hidden=eq.true");
      if (q.hidden === "false") filters.push("hidden=eq.false");
      if (q.free === "true") filters.push("is_free=eq.true");
      if (q.free === "false") filters.push("is_free=eq.false");
      if (q.quality_min) filters.push(`quality_score=gte.${q.quality_min}`);
      if (q.quality_max) filters.push(`quality_score=lte.${q.quality_max}`);
      if (q.from) filters.push(`starts_at=gte.${encodeURIComponent(q.from)}`);
      if (q.to) filters.push(`starts_at=lte.${encodeURIComponent(q.to)}`);

      // Search (title or description)
      if (q.search) {
        filters.push(`or=(title.ilike.*${encodeURIComponent(q.search)}*,description.ilike.*${encodeURIComponent(q.search)}*,venue_name.ilike.*${encodeURIComponent(q.search)}*)`);
      }

      const sortCol = q.sort || "created_at";
      const sortDir = q.order === "asc" ? "asc" : "desc";
      const filterStr = filters.length ? "&" + filters.join("&") : "";

      const selectFields = "id,title,title_slug,source,city,starts_at,ends_at,venue_name,is_free,price,image_url,quality_score,stale,featured,hidden,url,organizer_name,description,tags,created_at,last_seen";

      // Fetch with count header
      const url = `${cfg.supabaseUrl}/rest/v1/flowb_events?select=${selectFields}&order=${sortCol}.${sortDir}&limit=${limit}&offset=${offset}${filterStr}`;
      try {
        const res = await fetch(url, {
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: `Bearer ${cfg.supabaseKey}`,
            Prefer: "count=exact",
          },
        });
        if (!res.ok) return reply.status(res.status).send({ error: "Query failed" });

        const events = await res.json();
        const total = parseInt(res.headers.get("content-range")?.split("/")[1] || "0", 10);
        return { events, total, page, limit, pages: Math.ceil(total / limit) };
      } catch (err) {
        return reply.status(500).send({ error: "Query failed" });
      }
    },
  );

  // POST /api/v1/admin/egator/events/bulk — bulk feature/hide/delete
  app.post<{ Body: { ids: string[]; action: string } }>(
    "/api/v1/admin/egator/events/bulk",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Supabase not configured" });

      const { ids, action } = request.body || {};
      if (!ids?.length || !action) {
        return reply.status(400).send({ error: "Missing ids or action" });
      }
      if (ids.length > 200) {
        return reply.status(400).send({ error: "Max 200 IDs per request" });
      }

      const idFilter = `id=in.(${ids.join(",")})`;

      try {
        if (action === "feature") {
          await sbPatchRaw(cfg, `flowb_events?${idFilter}`, { featured: true });
        } else if (action === "unfeature") {
          await sbPatchRaw(cfg, `flowb_events?${idFilter}`, { featured: false });
        } else if (action === "hide") {
          await sbPatchRaw(cfg, `flowb_events?${idFilter}`, { hidden: true });
        } else if (action === "unhide") {
          await sbPatchRaw(cfg, `flowb_events?${idFilter}`, { hidden: false });
        } else if (action === "delete") {
          await fetch(`${cfg.supabaseUrl}/rest/v1/flowb_events?${idFilter}`, {
            method: "DELETE",
            headers: {
              apikey: cfg.supabaseKey,
              Authorization: `Bearer ${cfg.supabaseKey}`,
            },
          });
        } else {
          return reply.status(400).send({ error: `Unknown action: ${action}` });
        }
        return { ok: true, action, count: ids.length };
      } catch (err) {
        return reply.status(500).send({ error: "Bulk action failed" });
      }
    },
  );

  // DELETE /api/v1/admin/egator/events/stale — purge stale events older than N days
  app.delete<{ Querystring: { days?: string } }>(
    "/api/v1/admin/egator/events/stale",
    { config: { rateLimit: { max: 5, timeWindow: "5 minutes" } } },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Supabase not configured" });

      const days = Math.max(1, parseInt(request.query.days || "7", 10));
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      try {
        const res = await fetch(
          `${cfg.supabaseUrl}/rest/v1/flowb_events?stale=eq.true&created_at=lt.${encodeURIComponent(cutoff)}`,
          {
            method: "DELETE",
            headers: {
              apikey: cfg.supabaseKey,
              Authorization: `Bearer ${cfg.supabaseKey}`,
              Prefer: "count=exact",
            },
          },
        );
        const deleted = parseInt(res.headers.get("content-range")?.split("/")[1] || "0", 10);
        return { ok: true, deleted, days };
      } catch (err) {
        return reply.status(500).send({ error: "Purge failed" });
      }
    },
  );

  // POST /api/v1/admin/egator/events/:id/feature — toggle featured
  app.post<{ Params: { id: string } }>(
    "/api/v1/admin/egator/events/:id/feature",
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });

      const existing = await sbFetch<any[]>(cfg, `flowb_events?id=eq.${request.params.id}&select=featured&limit=1`);
      if (!existing?.length) return reply.status(404).send({ error: "Event not found" });

      const newVal = !existing[0].featured;
      await sbPatchRaw(cfg, `flowb_events?id=eq.${request.params.id}`, { featured: newVal });
      return { ok: true, featured: newVal };
    },
  );

  // POST /api/v1/admin/egator/events/:id/hide — toggle hidden
  app.post<{ Params: { id: string } }>(
    "/api/v1/admin/egator/events/:id/hide",
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });

      const existing = await sbFetch<any[]>(cfg, `flowb_events?id=eq.${request.params.id}&select=hidden&limit=1`);
      if (!existing?.length) return reply.status(404).send({ error: "Event not found" });

      const newVal = !existing[0].hidden;
      await sbPatchRaw(cfg, `flowb_events?id=eq.${request.params.id}`, { hidden: newVal });
      return { ok: true, hidden: newVal };
    },
  );

  // ==================================================================
  // SHARED RESULTS: Public shareable event result pages
  // ==================================================================

  // GET /api/v1/shared-results/:code — fetch shared results (public)
  app.get<{ Params: { code: string } }>(
    "/api/v1/shared-results/:code",
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "DB not configured" });

      const { code } = request.params;
      const rows = await sbFetch<any[]>(cfg, `flowb_shared_results?code=eq.${encodeURIComponent(code)}&limit=1`);
      if (!rows?.length) return reply.status(404).send({ error: "Not found" });

      const row = rows[0];

      // Check expiry
      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        return reply.status(410).send({ error: "This shared link has expired" });
      }

      // Increment view count (fire-and-forget)
      fireAndForget(sbPatch(cfg, "flowb_shared_results", { code: `eq.${code}` }, {
        view_count: (row.view_count || 0) + 1,
      }), "increment share view count");

      // Log view interaction with IP hash
      const ip = request.ip || "unknown";
      const ipHash = createHash("sha256").update(ip + code).digest("hex").slice(0, 16);
      fireAndForget(sbPost(cfg, "flowb_share_interactions", {
        result_code: code,
        viewer_ip_hash: ipHash,
        interaction_type: "view",
        referrer: (request.headers.referer as string) || null,
      }), "log share view interaction");

      return {
        title: row.title,
        results: row.results,
        sharerDisplayName: row.sharer_display_name,
        queryContext: row.query_context,
        createdAt: row.created_at,
        viewCount: (row.view_count || 0) + 1,
      };
    },
  );

  // POST /api/v1/shared-results/:code/interact — log interactions (public)
  app.post<{ Params: { code: string }; Body: { type: string; eventId?: string } }>(
    "/api/v1/shared-results/:code/interact",
    {
      schema: {
        body: {
          type: "object",
          required: ["type"],
          properties: {
            type: { type: "string", enum: ["csv_download", "reshare", "event_click"] },
            eventId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "DB not configured" });

      const { code } = request.params;
      const { type, eventId } = request.body;

      const ip = request.ip || "unknown";
      const ipHash = createHash("sha256").update(ip + code).digest("hex").slice(0, 16);

      // Log interaction
      await sbPost(cfg, "flowb_share_interactions", {
        result_code: code,
        viewer_ip_hash: ipHash,
        interaction_type: type,
        event_id: eventId || null,
        referrer: (request.headers.referer as string) || null,
      });

      // Update counters
      if (type === "csv_download") {
        const rows = await sbFetch<any[]>(cfg, `flowb_shared_results?code=eq.${encodeURIComponent(code)}&select=csv_downloads&limit=1`);
        if (rows?.length) {
          fireAndForget(sbPatch(cfg, "flowb_shared_results", { code: `eq.${code}` }, {
            csv_downloads: (rows[0].csv_downloads || 0) + 1,
          }), "increment csv downloads");
        }
      } else if (type === "reshare") {
        const rows = await sbFetch<any[]>(cfg, `flowb_shared_results?code=eq.${encodeURIComponent(code)}&select=share_count&limit=1`);
        if (rows?.length) {
          fireAndForget(sbPatch(cfg, "flowb_shared_results", { code: `eq.${code}` }, {
            share_count: (rows[0].share_count || 0) + 1,
          }), "increment share count");
        }
      }

      return { ok: true };
    },
  );

  // POST /api/v1/shared-results — create shared results (auth optional)
  app.post<{ Body: { results: any[]; title?: string; queryContext?: any } }>(
    "/api/v1/shared-results",
    {
      schema: {
        body: {
          type: "object",
          required: ["results"],
          properties: {
            results: { type: "array" },
            title: { type: "string" },
            queryContext: { type: "object" },
          },
        },
      },
    },
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "DB not configured" });

      const { results, title, queryContext } = request.body;
      const jwt = extractJwt(request);

      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
      let code = "";
      for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];

      const row = await sbPost(cfg, "flowb_shared_results", {
        code,
        title: title || `${results.length} events`,
        results,
        query_context: queryContext || {},
        sharer_user_id: jwt?.sub || null,
        sharer_display_name: jwt?.username || null,
      });

      if (!row) return reply.status(500).send({ error: "Failed to create share" });

      // Award points if authenticated
      if (jwt?.sub) {
        fireAndForget(core.awardPoints(jwt.sub, jwt.platform || "web", "results_shared"), "award share points");
      }

      return { code, url: `https://flowb.me/r/${code}` };
    },
  );

  // ==================================================================
  // LEADS: Full CRUD + pipeline + timeline
  // ==================================================================

  // Create lead
  app.post<{ Body: { name: string; email?: string; phone?: string; company?: string; source?: string; value?: number; notes?: string; tags?: string[] } }>(
    "/api/v1/leads",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "DB not configured" });
      const jwt = (request as any).user as JWTPayload;
      const { name, email, phone, company, source, value, notes, tags } = request.body;
      if (!name) return reply.status(400).send({ error: "name required" });

      const lead = await sbInsert(cfg, "flowb_leads", {
        name, email, phone, company, source, value, notes,
        tags: tags || [],
        created_by: jwt.sub,
        assigned_to: jwt.sub,
      });
      if (!lead) return reply.status(500).send({ error: "Failed to create lead" });

      // Log activity
      fireAndForget(sbInsert(cfg, "flowb_lead_activities", {
        lead_id: lead.id, user_id: jwt.sub,
        activity_type: "created",
        description: `Lead created: ${name}`,
      }), "log lead creation");

      fireAndForget(core.awardPoints(jwt.sub, jwt.platform || "web", "lead_created"), "award points");

      // Fire lead_stage automations for new lead (user-owned + global)
      const automationPlugin = core.getAutomationPlugin();
      if (automationPlugin) {
        const triggerData = {
          lead_id: lead.id, from_stage: null, to_stage: "new",
          name, email, phone, company, value, source,
        };
        fireAndForget(automationPlugin.processTrigger(cfg, jwt.sub, "lead_stage", triggerData), "fire user lead_stage automations");
        fireAndForget(automationPlugin.processTrigger(cfg, "web_system", "lead_stage", triggerData), "fire global lead_stage automations");
      }

      return lead;
    },
  );

  // List leads
  app.get<{ Querystring: { stage?: string; limit?: string; offset?: string; q?: string } }>(
    "/api/v1/leads",
    { preHandler: [authMiddleware] },
    async (request) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { leads: [] };
      const jwt = (request as any).user as JWTPayload;
      const { stage, limit, offset, q } = request.query;

      const params: Record<string, string> = {
        select: "*",
        or: `(created_by.eq.${jwt.sub},assigned_to.eq.${jwt.sub})`,
        order: "updated_at.desc",
        limit: limit || "50",
      };
      if (stage) params.stage = `eq.${stage}`;
      if (offset) params.offset = offset;

      let leads = await sbQuery<any[]>(cfg, "flowb_leads", params) || [];

      if (q) {
        const lower = q.toLowerCase();
        leads = leads.filter((l: any) =>
          l.name?.toLowerCase().includes(lower) ||
          l.company?.toLowerCase().includes(lower) ||
          l.email?.toLowerCase().includes(lower)
        );
      }

      return { leads, total: leads.length };
    },
  );

  // Lead detail
  app.get<{ Params: { id: string } }>(
    "/api/v1/leads/:id",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "DB not configured" });
      const rows = await sbQuery<any[]>(cfg, "flowb_leads", {
        select: "*", id: `eq.${request.params.id}`, limit: "1",
      });
      if (!rows?.length) return reply.status(404).send({ error: "Lead not found" });
      return rows[0];
    },
  );

  // Update lead
  app.patch<{ Params: { id: string }; Body: Record<string, any> }>(
    "/api/v1/leads/:id",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "DB not configured" });
      const jwt = (request as any).user as JWTPayload;
      const { name, email, phone, company, stage, source, value, notes, tags, score } = request.body || {};

      // Get current lead for stage change tracking
      const current = await sbQuery<any[]>(cfg, "flowb_leads", {
        select: "stage", id: `eq.${request.params.id}`, limit: "1",
      });

      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;
      if (phone !== undefined) updates.phone = phone;
      if (company !== undefined) updates.company = company;
      if (stage !== undefined) updates.stage = stage;
      if (source !== undefined) updates.source = source;
      if (value !== undefined) updates.value = value;
      if (notes !== undefined) updates.notes = notes;
      if (tags !== undefined) updates.tags = tags;
      if (score !== undefined) updates.score = score;

      if (Object.keys(updates).length === 0) return reply.status(400).send({ error: "No updates" });

      await sbPatch(cfg, "flowb_leads", { id: `eq.${request.params.id}` }, updates);

      // Log stage change + fire automations
      if (stage && current?.[0]?.stage !== stage) {
        fireAndForget(sbInsert(cfg, "flowb_lead_activities", {
          lead_id: request.params.id, user_id: jwt.sub,
          activity_type: "stage_change",
          description: `Stage: ${current?.[0]?.stage || "?"} → ${stage}`,
          metadata: { from_stage: current?.[0]?.stage, to_stage: stage },
        }), "log stage change");

        // Fire lead_stage automations (user-owned + global)
        const automationPlugin = core.getAutomationPlugin();
        if (automationPlugin) {
          const triggerData = {
            lead_id: request.params.id, from_stage: current?.[0]?.stage, to_stage: stage,
            name, email, phone, company, value, source,
          };
          fireAndForget(automationPlugin.processTrigger(cfg, jwt.sub, "lead_stage", triggerData), "fire user lead_stage automations");
          fireAndForget(automationPlugin.processTrigger(cfg, "web_system", "lead_stage", triggerData), "fire global lead_stage automations");
        }
      }

      return { success: true };
    },
  );

  // Delete lead
  app.delete<{ Params: { id: string } }>(
    "/api/v1/leads/:id",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "DB not configured" });
      const ok = await sbPatchRaw(cfg, `flowb_leads?id=eq.${request.params.id}`, { stage: "lost" });
      return { success: ok };
    },
  );

  // Pipeline summary
  app.get("/api/v1/leads/pipeline",
    { preHandler: [authMiddleware] },
    async (request) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { pipeline: {} };
      const jwt = (request as any).user as JWTPayload;

      const leads = await sbQuery<any[]>(cfg, "flowb_leads", {
        select: "id,name,company,stage,value,updated_at",
        or: `(created_by.eq.${jwt.sub},assigned_to.eq.${jwt.sub})`,
        order: "updated_at.desc",
      }) || [];

      const pipeline: Record<string, any[]> = {};
      for (const lead of leads) {
        const stage = lead.stage || "new";
        if (!pipeline[stage]) pipeline[stage] = [];
        pipeline[stage].push(lead);
      }

      return { pipeline, total: leads.length };
    },
  );

  // Lead timeline
  app.get<{ Params: { id: string } }>(
    "/api/v1/leads/:id/timeline",
    { preHandler: [authMiddleware] },
    async (request) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { activities: [] };

      const activities = await sbQuery<any[]>(cfg, "flowb_lead_activities", {
        select: "*",
        lead_id: `eq.${request.params.id}`,
        order: "created_at.desc",
        limit: "50",
      });

      return { activities: activities || [] };
    },
  );

  // Schedule meeting from lead
  app.post<{ Params: { id: string } }>(
    "/api/v1/leads/:id/schedule-meeting",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      if (!meetingPlugin || !meetingCfg) return reply.status(503).send({ error: "Meetings not configured" });
      const jwt = (request as any).user as JWTPayload;

      // Fetch lead to check contact info for auto_shared flag
      const leadCfg = getSupabaseConfig();
      const leads = leadCfg ? await sbQuery<any[]>(leadCfg, "flowb_leads", { select: "email,phone,platform_id", id: `eq.${request.params.id}`, limit: "1" }) : null;
      const lead = leads?.[0];

      const meeting = await meetingPlugin.createFromLead(meetingCfg, jwt.sub, request.params.id);
      if (!meeting) return reply.status(500).send({ error: "Failed to create meeting from lead" });

      fireAndForget(core.awardPoints(jwt.sub, jwt.platform || "web", "meeting_from_lead"), "award points");

      return {
        meeting_id: meeting.id,
        title: meeting.title,
        share_code: meeting.share_code,
        share_link: meetingPlugin.getShareLink(meeting.share_code),
        auto_shared: !!(lead?.email || lead?.phone || lead?.platform_id),
      };
    },
  );

  // ==================================================================
  // MEETINGS: Extended routes (briefing, follow-up, notes, iCal, suggest)
  // ==================================================================

  // Complete meeting with notes
  app.post<{ Params: { id: string }; Body: { outcome_notes?: string; action_items?: string[] } }>(
    "/api/v1/meetings/:id/complete",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      if (!meetingPlugin || !meetingCfg) return reply.status(503).send({ error: "Not configured" });
      const jwt = (request as any).user as JWTPayload;
      const { outcome_notes, action_items } = request.body || {};
      const result = await meetingPlugin.completeWithNotes(meetingCfg, jwt.sub, request.params.id, outcome_notes, action_items);
      fireAndForget(core.awardPoints(jwt.sub, jwt.platform || "web", "meeting_completed"), "award points");
      return { success: !result.includes("not found"), message: result };
    },
  );

  // Generate briefing
  app.post<{ Params: { id: string } }>(
    "/api/v1/meetings/:id/briefing",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      if (!meetingPlugin || !meetingCfg) return reply.status(503).send({ error: "Not configured" });
      const briefing = await meetingPlugin.generateBriefing(meetingCfg, request.params.id);
      return { briefing };
    },
  );

  // Draft follow-up
  app.post<{ Params: { id: string } }>(
    "/api/v1/meetings/:id/follow-up",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      if (!meetingPlugin || !meetingCfg) return reply.status(503).send({ error: "Not configured" });
      const followUp = await meetingPlugin.draftFollowUp(meetingCfg, request.params.id);
      return { follow_up: followUp };
    },
  );

  // Meeting notes
  app.get<{ Params: { id: string } }>(
    "/api/v1/meetings/:id/notes",
    { preHandler: [authMiddleware] },
    async (request) => {
      if (!meetingCfg) return { notes: [] };
      const notes = await meetingPlugin!.getNotes(meetingCfg, request.params.id);
      return { notes };
    },
  );

  app.post<{ Params: { id: string }; Body: { content: string; note_type?: string } }>(
    "/api/v1/meetings/:id/notes",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      if (!meetingPlugin || !meetingCfg) return reply.status(503).send({ error: "Not configured" });
      const jwt = (request as any).user as JWTPayload;
      const { content, note_type } = request.body || {};
      if (!content) return reply.status(400).send({ error: "content required" });
      const note = await meetingPlugin.addNote(meetingCfg, request.params.id, jwt.sub, content, note_type);
      return note || { error: "Failed to add note" };
    },
  );

  // AI meeting suggestions
  app.get("/api/v1/meetings/suggest",
    { preHandler: [authMiddleware] },
    async (request) => {
      if (!meetingPlugin || !meetingCfg) return { suggestions: [] };
      const jwt = (request as any).user as JWTPayload;
      const suggestions = await meetingPlugin.suggestMeetings(meetingCfg, jwt.sub);
      return { suggestions };
    },
  );

  // Create meeting from lead
  app.post<{ Params: { leadId: string } }>(
    "/api/v1/meetings/from-lead/:leadId",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      if (!meetingPlugin || !meetingCfg) return reply.status(503).send({ error: "Not configured" });
      const jwt = (request as any).user as JWTPayload;
      const leadCfg = getSupabaseConfig();
      const leads = leadCfg ? await sbQuery<any[]>(leadCfg, "flowb_leads", { select: "email,phone,platform_id", id: `eq.${request.params.leadId}`, limit: "1" }) : null;
      const lead = leads?.[0];
      const meeting = await meetingPlugin.createFromLead(meetingCfg, jwt.sub, request.params.leadId);
      if (!meeting) return reply.status(500).send({ error: "Failed" });
      return { meeting_id: meeting.id, title: meeting.title, share_link: meetingPlugin.getShareLink(meeting.share_code), auto_shared: !!(lead?.email || lead?.phone || lead?.platform_id) };
    },
  );

  // iCal download
  app.get<{ Params: { code: string } }>(
    "/api/v1/m/:code/ical",
    async (request, reply) => {
      if (!meetingPlugin || !meetingCfg) return reply.status(503).send({ error: "Not configured" });
      const meeting = await meetingPlugin.getByCode(meetingCfg, request.params.code);
      if (!meeting) return reply.status(404).send({ error: "Not found" });
      const ical = meetingPlugin.generateICal(meeting);
      return reply
        .header("Content-Type", "text/calendar; charset=utf-8")
        .header("Content-Disposition", `attachment; filename="${meeting.title.replace(/[^a-zA-Z0-9 ]/g, "")}.ics"`)
        .send(ical);
    },
  );

  // Messages since timestamp (polling)
  app.get<{ Params: { id: string; ts: string } }>(
    "/api/v1/meetings/:id/messages/since/:ts",
    { preHandler: [authMiddleware] },
    async (request) => {
      if (!meetingPlugin || !meetingCfg) return { messages: [] };
      const messages = await meetingPlugin.getMessages(meetingCfg, request.params.id, request.params.ts);
      return { messages };
    },
  );

  // Share meeting with a guest (non-user contact)
  app.post<{ Params: { id: string }; Body: { name?: string; email?: string; phone?: string; platform?: string; platform_id?: string; message?: string } }>(
    "/api/v1/meetings/:id/share",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      if (!meetingPlugin || !meetingCfg) return reply.status(503).send({ error: "Not configured" });
      const jwt = (request as any).user as JWTPayload;
      const { name, email, phone, platform, platform_id, message } = request.body || {};
      if (!email && !phone && !platform_id) return reply.status(400).send({ error: "At least one of email, phone, or platform_id required" });

      const result = await meetingPlugin.shareMeetingToGuest(meetingCfg, request.params.id, jwt.sub, { name, email, phone, platform, platform_id }, { message });
      if (result.sent) {
        fireAndForget(core.awardPoints(jwt.sub, jwt.platform || "web", "meeting_shared"), "award points");
      }
      const mtg = await meetingPlugin.getById(meetingCfg, request.params.id);
      return { ...result, share_link: mtg ? meetingPlugin.getShareLink(mtg.share_code) : undefined };
    },
  );

  // ==================================================================
  // REFERRAL & COMMISSIONS
  // ==================================================================

  // Create referral program
  app.post<{ Body: { event_id: string; commission_rate?: number; max_commission_per_ticket?: number; max_total_payout?: number } }>(
    "/api/v1/referral/programs",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "DB not configured" });
      const jwt = (request as any).user as JWTPayload;
      const { event_id, commission_rate, max_commission_per_ticket, max_total_payout } = request.body;
      if (!event_id) return reply.status(400).send({ error: "event_id required" });

      const program = await sbInsert(cfg, "flowb_referral_programs", {
        event_id, organizer_id: jwt.sub,
        commission_rate: commission_rate || 0.10,
        max_commission_per_ticket, max_total_payout,
      });
      return program || reply.status(500).send({ error: "Failed" });
    },
  );

  // Get referral program for event
  app.get<{ Params: { eventId: string } }>(
    "/api/v1/referral/programs/:eventId",
    async (request) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { program: null };
      const rows = await sbQuery<any[]>(cfg, "flowb_referral_programs", {
        select: "*", event_id: `eq.${request.params.eventId}`, is_active: "eq.true", limit: "1",
      });
      return { program: rows?.[0] || null };
    },
  );

  // Get/create referral link
  app.get<{ Params: { eventId: string }; Querystring: { crew_id?: string } }>(
    "/api/v1/referral/links/:eventId",
    { preHandler: [authMiddleware] },
    async (request) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { link: null };
      const jwt = (request as any).user as JWTPayload;
      const { crew_id } = request.query;

      // Check if link already exists
      const existing = await sbQuery<any[]>(cfg, "flowb_referral_links", {
        select: "*",
        event_id: `eq.${request.params.eventId}`,
        creator_id: `eq.${jwt.sub}`,
        limit: "1",
      });

      if (existing?.length) {
        return { link: existing[0], url: `https://flowb.me/e/${existing[0].short_code}` };
      }

      // Create new link
      const chars = "abcdefghjkmnpqrstuvwxyz23456789";
      let code = "";
      for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];

      const link = await sbInsert(cfg, "flowb_referral_links", {
        event_id: request.params.eventId,
        creator_id: jwt.sub,
        crew_id: crew_id || null,
        short_code: code,
        link_type: "event",
      });

      return { link, url: `https://flowb.me/e/${code}` };
    },
  );

  // Track referral engagement
  app.post<{ Body: { event_id: string; action: string; crew_id?: string; metadata?: any } }>(
    "/api/v1/referral/engagement",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "DB not configured" });
      const jwt = (request as any).user as JWTPayload;
      const { event_id, action, crew_id, metadata } = request.body;

      const weights: Record<string, number> = {
        rsvp_going: 5, invite: 5, share: 4, social_post: 4,
        rsvp_maybe: 3, chat_mention: 3, checkin: 3, comment: 2, view: 1,
      };

      const weight = weights[action] || 1;

      const engagement = await sbInsert(cfg, "flowb_referral_engagement", {
        user_id: jwt.sub, event_id, crew_id: crew_id || null,
        action, weight, metadata: metadata || {},
      });

      return engagement || reply.status(500).send({ error: "Failed" });
    },
  );

  // My earnings
  app.get("/api/v1/referral/earnings",
    { preHandler: [authMiddleware] },
    async (request) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { total: 0, pending: 0 };
      const jwt = (request as any).user as JWTPayload;

      const splits = await sbQuery<any[]>(cfg, "flowb_referral_splits", {
        select: "amount,status",
        user_id: `eq.${jwt.sub}`,
      }) || [];

      const total = splits.reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
      const pending = splits.filter((s: any) => s.status === "pending")
        .reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
      const credited = splits.filter((s: any) => s.status === "credited")
        .reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);

      return { total: Math.round(total * 100) / 100, pending: Math.round(pending * 100) / 100, credited: Math.round(credited * 100) / 100 };
    },
  );

  // Crew earnings
  app.get<{ Params: { crewId: string } }>(
    "/api/v1/referral/earnings/crew/:crewId",
    { preHandler: [authMiddleware] },
    async (request) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { earnings: [] };

      const commissions = await sbQuery<any[]>(cfg, "flowb_referral_commissions", {
        select: "id,event_id,ticket_price,total_commission,status",
        source_crew_id: `eq.${request.params.crewId}`,
        order: "created_at.desc",
      }) || [];

      const total = commissions.reduce((sum: number, c: any) => sum + Number(c.total_commission || 0), 0);

      return { commissions, total: Math.round(total * 100) / 100 };
    },
  );

  // Commission history
  app.get<{ Querystring: { limit?: string } }>(
    "/api/v1/referral/commissions",
    { preHandler: [authMiddleware] },
    async (request) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { commissions: [] };
      const jwt = (request as any).user as JWTPayload;

      const splits = await sbQuery<any[]>(cfg, "flowb_referral_splits", {
        select: "id,commission_id,amount,share_percentage,status,created_at",
        user_id: `eq.${jwt.sub}`,
        order: "created_at.desc",
        limit: request.query.limit || "25",
      });

      return { commissions: splits || [] };
    },
  );

  // Request payout
  app.post<{ Body: { amount: number; payment_method: string } }>(
    "/api/v1/referral/payouts",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "DB not configured" });
      const jwt = (request as any).user as JWTPayload;
      const { amount, payment_method } = request.body;

      if (!amount || amount <= 0) return reply.status(400).send({ error: "Invalid amount" });
      if (!["usdc_wallet", "stripe", "points_conversion", "flowb_credit"].includes(payment_method)) {
        return reply.status(400).send({ error: "Invalid payment method" });
      }

      const payout = await sbInsert(cfg, "flowb_referral_payouts", {
        user_id: jwt.sub, amount, payment_method,
      });

      return payout || reply.status(500).send({ error: "Failed" });
    },
  );

  // Payout history
  app.get("/api/v1/referral/payouts",
    { preHandler: [authMiddleware] },
    async (request) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { payouts: [] };
      const jwt = (request as any).user as JWTPayload;

      const payouts = await sbQuery<any[]>(cfg, "flowb_referral_payouts", {
        select: "*",
        user_id: `eq.${jwt.sub}`,
        order: "created_at.desc",
      });

      return { payouts: payouts || [] };
    },
  );

  // Referral link resolver (public)
  app.get<{ Params: { code: string } }>(
    "/api/v1/e/:code",
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "DB not configured" });

      const links = await sbQuery<any[]>(cfg, "flowb_referral_links", {
        select: "*", short_code: `eq.${request.params.code}`, limit: "1",
      });

      if (!links?.length) return reply.status(404).send({ error: "Link not found" });

      const link = links[0];
      // Increment clicks
      fireAndForget(sbPatch(cfg, "flowb_referral_links", { id: `eq.${link.id}` }, {
        clicks: (link.clicks || 0) + 1,
      }), "increment referral clicks");

      // Log click
      const ip = request.ip || "unknown";
      const fpHash = createHash("sha256").update(ip + request.params.code).digest("hex").slice(0, 16);
      fireAndForget(sbInsert(cfg, "flowb_referral_clicks", {
        link_id: link.id,
        visitor_fingerprint: fpHash,
        referrer_url: (request.headers.referer as string) || null,
      }), "log referral click");

      return { event_id: link.event_id, crew_id: link.crew_id, creator_id: link.creator_id };
    },
  );

  // Luma webhook (ticket purchased)
  app.post("/api/v1/webhooks/luma/ticket", async (request, reply) => {
    const cfg = getSupabaseConfig();
    if (!cfg) return reply.status(500).send({ error: "DB not configured" });

    const body = request.body as any;
    const eventId = body?.event_id || body?.event?.api_id;
    const ticketRef = body?.ticket_id || body?.guest?.api_id || `luma_${Date.now()}`;
    const ticketPrice = Number(body?.price || body?.ticket_price || 0);
    const buyerEmail = body?.email || body?.guest?.email;

    if (!eventId) return reply.status(400).send({ error: "event_id required" });

    // Find referral program
    const programs = await sbQuery<any[]>(cfg, "flowb_referral_programs", {
      select: "*", event_id: `eq.${eventId}`, is_active: "eq.true", limit: "1",
    });

    if (!programs?.length) return { ok: true, message: "No referral program for this event" };

    const program = programs[0];
    const commission = ticketPrice * Number(program.commission_rate);
    const cappedCommission = program.max_commission_per_ticket
      ? Math.min(commission, Number(program.max_commission_per_ticket))
      : commission;

    if (cappedCommission <= 0) return { ok: true, message: "No commission to distribute" };

    // Create commission record
    const commissionRecord = await sbInsert(cfg, "flowb_referral_commissions", {
      program_id: program.id, event_id: eventId,
      ticket_ref: ticketRef, ticket_price: ticketPrice,
      total_commission: cappedCommission, status: "pending",
    });

    if (!commissionRecord) return reply.status(500).send({ error: "Failed to create commission" });

    // Get all engagement for this event and calculate splits
    const engagement = await sbQuery<any[]>(cfg, "flowb_referral_engagement", {
      select: "user_id,weight", event_id: `eq.${eventId}`,
    }) || [];

    if (engagement.length === 0) return { ok: true, commission_id: commissionRecord.id, message: "Commission created, no engagement to split" };

    // Aggregate weights per user
    const userWeights: Record<string, number> = {};
    for (const e of engagement) {
      userWeights[e.user_id] = (userWeights[e.user_id] || 0) + e.weight;
    }

    const totalWeight = Object.values(userWeights).reduce((a, b) => a + b, 0);

    // Create splits
    for (const [userId, weight] of Object.entries(userWeights)) {
      const share = weight / totalWeight;
      const amount = Math.round(cappedCommission * share * 100) / 100;
      if (amount > 0) {
        fireAndForget(sbInsert(cfg, "flowb_referral_splits", {
          commission_id: commissionRecord.id,
          user_id: userId,
          engagement_weight: weight,
          share_percentage: share,
          amount,
        }), "create referral split");
      }
    }

    return { ok: true, commission_id: commissionRecord.id, splits: Object.keys(userWeights).length };
  });

  // ==================================================================
  // AUTOMATIONS
  // ==================================================================

  // List automations
  app.get("/api/v1/automations",
    { preHandler: [authMiddleware] },
    async (request) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { automations: [] };
      const jwt = (request as any).user as JWTPayload;

      const automations = await sbQuery<any[]>(cfg, "flowb_automations", {
        select: "id,name,trigger_type,action_type,is_active,run_count,last_run_at,created_at",
        user_id: `eq.${jwt.sub}`,
        order: "created_at.desc",
      });

      return { automations: automations || [] };
    },
  );

  // Create automation
  app.post<{ Body: { name: string; trigger_type: string; trigger_config: any; action_type: string; action_config: any; max_per_day?: number } }>(
    "/api/v1/automations",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "DB not configured" });
      const jwt = (request as any).user as JWTPayload;
      const { name, trigger_type, trigger_config, action_type, action_config, max_per_day } = request.body;

      if (!name || !trigger_type || !action_type) {
        return reply.status(400).send({ error: "name, trigger_type, action_type required" });
      }

      const automation = await sbInsert(cfg, "flowb_automations", {
        user_id: jwt.sub, name, trigger_type, trigger_config: trigger_config || {},
        action_type, action_config: action_config || {},
        max_per_day: max_per_day || 5,
      });

      return automation || reply.status(500).send({ error: "Failed" });
    },
  );

  // Update automation
  app.patch<{ Params: { id: string }; Body: Record<string, any> }>(
    "/api/v1/automations/:id",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "DB not configured" });
      const jwt = (request as any).user as JWTPayload;

      // Verify ownership
      const existing = await sbQuery<any[]>(cfg, "flowb_automations", {
        select: "user_id", id: `eq.${request.params.id}`, limit: "1",
      });
      if (!existing?.length) return reply.status(404).send({ error: "Not found" });
      if (existing[0].user_id !== jwt.sub) return reply.status(403).send({ error: "Not owner" });

      const { name, trigger_type, trigger_config, action_type, action_config, max_per_day } = request.body || {};
      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (trigger_type !== undefined) updates.trigger_type = trigger_type;
      if (trigger_config !== undefined) updates.trigger_config = trigger_config;
      if (action_type !== undefined) updates.action_type = action_type;
      if (action_config !== undefined) updates.action_config = action_config;
      if (max_per_day !== undefined) updates.max_per_day = max_per_day;

      await sbPatch(cfg, "flowb_automations", { id: `eq.${request.params.id}` }, updates);
      return { success: true };
    },
  );

  // Delete automation
  app.delete<{ Params: { id: string } }>(
    "/api/v1/automations/:id",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "DB not configured" });
      const jwt = (request as any).user as JWTPayload;

      const existing = await sbQuery<any[]>(cfg, "flowb_automations", {
        select: "user_id", id: `eq.${request.params.id}`, limit: "1",
      });
      if (!existing?.length) return reply.status(404).send({ error: "Not found" });
      if (existing[0].user_id !== jwt.sub) return reply.status(403).send({ error: "Not owner" });

      await sbPatchRaw(cfg, `flowb_automations?id=eq.${request.params.id}`, { is_active: false });
      return { success: true };
    },
  );

  // Toggle automation
  app.post<{ Params: { id: string } }>(
    "/api/v1/automations/:id/toggle",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "DB not configured" });
      const jwt = (request as any).user as JWTPayload;

      const existing = await sbQuery<any[]>(cfg, "flowb_automations", {
        select: "user_id,is_active", id: `eq.${request.params.id}`, limit: "1",
      });
      if (!existing?.length) return reply.status(404).send({ error: "Not found" });
      if (existing[0].user_id !== jwt.sub) return reply.status(403).send({ error: "Not owner" });

      const newState = !existing[0].is_active;
      await sbPatch(cfg, "flowb_automations", { id: `eq.${request.params.id}` }, { is_active: newState });
      return { is_active: newState };
    },
  );

  // Automation log
  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    "/api/v1/automations/:id/log",
    { preHandler: [authMiddleware] },
    async (request) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { log: [] };

      const entries = await sbQuery<any[]>(cfg, "flowb_automation_log", {
        select: "*",
        automation_id: `eq.${request.params.id}`,
        order: "created_at.desc",
        limit: request.query.limit || "25",
      });

      return { log: entries || [] };
    },
  );

  // ==================================================================
  // BILLING / SUBSCRIPTIONS
  // ==================================================================

  // Get current subscription
  app.get("/api/v1/billing/subscription",
    { preHandler: [authMiddleware] },
    async (request) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { tier: "free" };
      const jwt = (request as any).user as JWTPayload;

      const subs = await sbQuery<any[]>(cfg, "flowb_subscriptions", {
        select: "*", user_id: `eq.${jwt.sub}`, limit: "1",
      });

      if (!subs?.length) {
        return { tier: "free", status: "active" };
      }

      return subs[0];
    },
  );

  // Get usage stats
  app.get("/api/v1/billing/usage",
    { preHandler: [authMiddleware] },
    async (request) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { usage: {} };
      const jwt = (request as any).user as JWTPayload;

      const today = new Date().toISOString().split("T")[0];
      const usage = await sbQuery<any[]>(cfg, "flowb_usage_tracking", {
        select: "feature,count",
        user_id: `eq.${jwt.sub}`,
        period_start: `eq.${today}`,
      }) || [];

      const usageMap: Record<string, number> = {};
      for (const u of usage) {
        usageMap[u.feature] = u.count;
      }

      // Get tier limits
      const subs = await sbQuery<any[]>(cfg, "flowb_subscriptions", {
        select: "tier", user_id: `eq.${jwt.sub}`, limit: "1",
      });
      const tier = subs?.[0]?.tier || "free";

      const limits: Record<string, Record<string, number>> = {
        free: { ai_chat: 10, meetings: 3, automations: 2, leads: 10, boards: 1 },
        pro: { ai_chat: -1, meetings: -1, automations: -1, leads: -1, boards: -1 },
        team: { ai_chat: -1, meetings: -1, automations: -1, leads: -1, boards: -1 },
        business: { ai_chat: -1, meetings: -1, automations: -1, leads: -1, boards: -1 },
      };

      return { tier, usage: usageMap, limits: limits[tier] || limits.free };
    },
  );

  // Create checkout session (stub)
  app.post<{ Body: { tier: string } }>(
    "/api/v1/billing/checkout",
    { preHandler: [authMiddleware] },
    async (request, reply) => {
      const { tier } = request.body;
      if (!["pro", "team", "business"].includes(tier)) {
        return reply.status(400).send({ error: "Invalid tier" });
      }

      // TODO: integrate Stripe when STRIPE_SECRET_KEY is set
      return { url: `https://flowb.me/upgrade?tier=${tier}`, message: "Stripe integration pending" };
    },
  );

  // Customer portal (stub)
  app.post("/api/v1/billing/portal",
    { preHandler: [authMiddleware] },
    async () => {
      return { url: "https://flowb.me/billing", message: "Stripe portal integration pending" };
    },
  );

  // POST /api/v1/chat/email-results — email event results (auth required)
  app.post<{ Body: { results: any[]; title?: string; email?: string } }>(
    "/api/v1/chat/email-results",
    {
      preHandler: [authMiddleware],
      schema: {
        body: {
          type: "object",
          required: ["results"],
          properties: {
            results: { type: "array" },
            title: { type: "string" },
            email: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "DB not configured" });

      const jwt = (request as any).user as JWTPayload;
      const { results, title, email: providedEmail } = request.body;

      const email = providedEmail || await resolveUserEmail(cfg, jwt.sub);
      if (!email) return reply.status(400).send({ error: "No email on file. Provide one in the request body." });

      const eventsHtml = results.map((e: any) => {
        const time = e.starts_at || e.startTime
          ? new Date(e.starts_at || e.startTime).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Denver" })
          : "TBD";
        const venue = e.venue_name || e.locationName || "TBD";
        const price = e.is_free || e.isFree ? "FREE" : e.price ? `$${e.price}` : "";
        const link = e.ticket_url || e.ticketUrl || e.url || "";
        const titleHtml = link
          ? `<a href="${escHtml(link)}" style="color:#6366f1;text-decoration:none;">${escHtml(e.title)}</a>`
          : escHtml(e.title || "Untitled");
        return `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #222;">${titleHtml}</td>
          <td style="padding:8px 0;border-bottom:1px solid #222;color:#888;">${escHtml(time)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #222;color:#888;">${escHtml(venue)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #222;color:#888;">${escHtml(price)}</td>
        </tr>`;
      }).join("");

      const emailTitle = title || `${results.length} events`;
      const html = wrapInTemplate(
        `Your FlowB Events: ${emailTitle}`,
        `<p>Here are the events you requested:</p>
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr>
            <th style="text-align:left;padding:8px 0;border-bottom:2px solid #333;color:#a78bfa;">Event</th>
            <th style="text-align:left;padding:8px 0;border-bottom:2px solid #333;color:#a78bfa;">When</th>
            <th style="text-align:left;padding:8px 0;border-bottom:2px solid #333;color:#a78bfa;">Where</th>
            <th style="text-align:left;padding:8px 0;border-bottom:2px solid #333;color:#a78bfa;">Price</th>
          </tr></thead>
          <tbody>${eventsHtml}</tbody>
        </table>
        <div style="margin-top:20px;text-align:center;">
          <a href="https://flowb.me" style="display:inline-block;padding:10px 24px;background:#6366f1;color:#fff;border-radius:24px;text-decoration:none;font-weight:600;">Explore more on FlowB</a>
        </div>`,
      );

      const sent = await sendEmail({
        to: email,
        subject: `FlowB Events: ${emailTitle}`,
        html,
        tags: [
          { name: "type", value: "chat_results" },
          { name: "user_id", value: jwt.sub },
        ],
      });

      if (!sent) return reply.status(500).send({ error: "Failed to send email" });

      // Award points
      fireAndForget(core.awardPoints(jwt.sub, jwt.platform || "web", "results_emailed"), "award email points");

      return { ok: true, sentTo: email };
    },
  );

  // ------------------------------------------------------------------
  // QUESTIONNAIRE: Gate-pass notification (unauthenticated)
  // ------------------------------------------------------------------
  app.post<{ Body: { userAgent?: string; referrer?: string } }>(
    "/api/v1/questionnaire/gate-pass",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    },
    async (request) => {
      const ua = (request.body as any)?.userAgent || request.headers["user-agent"] || "unknown";
      const ref = (request.body as any)?.referrer || request.headers.referer || "direct";
      const ip = request.ip || "unknown";

      alertAdmins(
        `<b>Biz Onboard: Gate Passed</b>\nIP: ${ip}\nRef: ${ref}\nUA: ${ua.slice(0, 80)}`,
        "info",
      );

      return { ok: true };
    },
  );

  // ------------------------------------------------------------------
  // QUESTIONNAIRE: Submit (unauthenticated)
  // ------------------------------------------------------------------
  app.post<{ Body: Record<string, any> }>(
    "/api/v1/questionnaire",
    {
      config: { rateLimit: { max: 3, timeWindow: "1 minute" } },
    },
    async (request) => {
      const data = request.body as Record<string, any>;
      const cfg = getSupabaseConfig();

      // Store in Supabase if configured
      if (cfg) {
        try {
          await sbInsert(cfg, "flowb_questionnaire_submissions", {
            name: data.userName || null,
            biz_name: data.bizName || null,
            email: data.email || null,
            phone: data.phone || null,
            data: data,
            created_at: new Date().toISOString(),
          });
        } catch (err) {
          log.warn("[questionnaire]", "Failed to store submission", {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // Build admin notification
      const name = data.userName || "Unknown";
      const biz = data.bizName || "N/A";
      const email = data.email || "N/A";
      const needs = Array.isArray(data.needs) ? data.needs.join(", ") : "none";
      const pricing = data._pricing || {};
      const setup = pricing.setupTotal ? `$${pricing.setupTotal.toLocaleString()}` : "N/A";
      const monthly = pricing.monthlyFinal ? `$${pricing.monthlyFinal.toLocaleString()}/mo` : "N/A";
      const timeline = data.timeline || "N/A";

      alertAdmins(
        [
          `<b>New Biz Questionnaire Submitted</b>`,
          ``,
          `Name: <b>${name}</b>`,
          `Biz: ${biz}`,
          `Email: ${email}`,
          `Services: ${needs}`,
          `Investment: ${setup} setup + ${monthly}`,
          `Timeline: ${timeline}`,
          ``,
          `<a href="https://biz.flowb.me">View in Biz Dashboard</a>`,
        ].join("\n"),
        "important",
      );

      return { ok: true };
    },
  );

} // end registerMiniAppRoutes

// ============================================================================
// Helpers
// ============================================================================

/** Human-readable time-since string */
function timeSince(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

/** Convert ISO date to ICS format (YYYYMMDDTHHmmssZ) */
function toIcsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escape text for ICS fields */
function escapeIcsText(text: string): string {
  return text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}

/** Sanitize filename for Content-Disposition */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9 _-]/g, "").trim().substring(0, 60) || "event";
}

/** Map a DB row from flowb_events to the EventResult-like shape the frontend expects */
function dbEventToResult(row: any): any {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    startTime: row.starts_at || "",
    endTime: row.ends_at || undefined,
    allDay: row.all_day || false,
    locationName: row.venue_name || undefined,
    locationCity: row.city || undefined,
    venueId: row.venue_id || undefined,
    latitude: row.latitude || undefined,
    longitude: row.longitude || undefined,
    price: row.price != null ? Number(row.price) : undefined,
    isFree: row.is_free ?? undefined,
    isVirtual: row.is_virtual || false,
    virtualUrl: row.virtual_url || undefined,
    ticketUrl: row.ticket_url || undefined,
    source: row.source,
    sourceEventId: row.source_event_id || undefined,
    url: row.url || undefined,
    imageUrl: row.image_url || undefined,
    coverUrl: row.cover_url || undefined,
    organizerName: row.organizer_name || undefined,
    organizerUrl: row.organizer_url || undefined,
    eventType: row.event_type || undefined,
    tags: row.tags || [],
    zoneSlug: undefined, // populated by join if needed
    zoneName: undefined,
    rsvpCount: row.rsvp_count || 0,
    featured: row.featured || false,
    qualityScore: row.quality_score != null ? Number(row.quality_score) : undefined,
    categories: [],
  };
}

/** Map a DB row from flowb_booths to a frontend-friendly shape */
function dbBoothToResult(row: any): any {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    boothNumber: row.booth_number,
    zoneId: row.zone_id,
    venueId: row.venue_id,
    sponsorTier: row.sponsor_tier,
    companyUrl: row.company_url,
    logoUrl: row.logo_url,
    bannerUrl: row.banner_url,
    twitterUrl: row.twitter_url,
    farcasterUrl: row.farcaster_url,
    discordUrl: row.discord_url,
    telegramUrl: row.telegram_url,
    floor: row.floor,
    latitude: row.latitude,
    longitude: row.longitude,
    hasSwag: row.has_swag || false,
    hasDemo: row.has_demo || false,
    hasHiring: row.has_hiring || false,
    tags: row.tags || [],
    featured: row.featured || false,
  };
}

function getNotifyContext(): { supabase: SbConfig } | null {
  const cfg = getSupabaseConfig();
  if (!cfg) return null;
  return { supabase: cfg };
}

function getSupabaseConfig(): SbConfig | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) return null;
  return { supabaseUrl: url, supabaseKey: key };
}

/** Extract JWT from Authorization header without failing (for optional auth) */
function extractJwt(request: any): JWTPayload | null {
  const auth = request.headers?.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return verifyJwt(auth.slice(7));
}
