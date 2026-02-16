/**
 * Mini App API Routes
 *
 * All routes prefixed with /api/v1/ and requiring auth use the JWT middleware.
 * Auth endpoints issue JWTs for Telegram and Farcaster users.
 */

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
import {
  upsertNotificationToken,
  disableNotificationToken,
} from "../services/farcaster-notify.js";
import {
  notifyFriendRsvp,
  notifyCrewMemberRsvp,
  notifyCrewJoin,
} from "../services/notifications.js";
import {
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
} from "@farcaster/miniapp-node";

// ============================================================================
// Supabase helper (reused from flow plugin pattern)
// ============================================================================

interface SbConfig { supabaseUrl: string; supabaseKey: string }

async function sbFetch<T>(cfg: SbConfig, path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: cfg.supabaseKey,
        Authorization: `Bearer ${cfg.supabaseKey}`,
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

async function sbPost(cfg: SbConfig, path: string, body: any, prefer = "return=representation"): Promise<any> {
  try {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${path}`, {
      method: "POST",
      headers: {
        apikey: cfg.supabaseKey,
        Authorization: `Bearer ${cfg.supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: prefer,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    if (prefer === "return=minimal") return true;
    const result = await res.json();
    return Array.isArray(result) ? result[0] : result;
  } catch {
    return null;
  }
}

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
      await core.awardPoints(userId, "telegram", "miniapp_open").catch(() => {});

      const token = signJwt({
        sub: userId,
        platform: "telegram",
        tg_id: user.id,
        username: user.username,
      });

      return {
        token,
        user: {
          id: userId,
          platform: "telegram",
          tg_id: user.id,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          photoUrl: user.photo_url,
        },
      };
    },
  );

  // ------------------------------------------------------------------
  // AUTH: Farcaster Mini App (Quick Auth + legacy SIWF fallback)
  // ------------------------------------------------------------------
  app.post<{ Body: { quickAuthToken?: string; message?: string; signature?: string } }>(
    "/api/v1/auth/farcaster",
    async (request, reply) => {
      const { quickAuthToken, message, signature } = request.body || {};

      // --- Quick Auth path (recommended) ---
      if (quickAuthToken) {
        try {
          const { createClient } = await import("@farcaster/quick-auth");
          const qaClient = createClient();
          const payload = await qaClient.verifyJwt({
            token: quickAuthToken,
            domain: new URL(process.env.FARCASTER_APP_URL || "https://flowb-farcaster.netlify.app").hostname,
          });

          const fid = typeof payload.sub === "string" ? parseInt(payload.sub, 10) : payload.sub;
          if (!fid || isNaN(fid)) {
            return reply.status(401).send({ error: "Invalid Quick Auth token: no FID" });
          }

          const userId = `farcaster_${fid}`;
          await core.awardPoints(userId, "farcaster", "miniapp_open").catch(() => {});

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

          const token = signJwt({
            sub: userId,
            platform: "farcaster",
            fid,
            username,
            ...(privyUserId ? { privyUserId } : {}),
          });

          return {
            token,
            user: {
              id: userId,
              platform: "farcaster",
              fid,
              username,
              displayName,
              pfpUrl,
              ...(privyUserId ? { privyUserId } : {}),
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

      await core.awardPoints(userId, "farcaster", "miniapp_open").catch(() => {});

      const token = signJwt({
        sub: userId,
        platform: "farcaster",
        fid: user.fid,
        username: user.username,
      });

      return {
        token,
        user: {
          id: userId,
          platform: "farcaster",
          fid: user.fid,
          username: user.username,
          displayName: user.displayName,
          pfpUrl: user.pfpUrl,
        },
      };
    },
  );

  // ------------------------------------------------------------------
  // AUTH: Native App (hardcoded users for EthDenver)
  // ------------------------------------------------------------------
  app.post<{ Body: { username: string; password: string } }>(
    "/api/v1/auth/app",
    async (request, reply) => {
      const { username, password } = request.body || {};
      if (!username || !password) {
        return reply.status(400).send({ error: "Missing username or password" });
      }

      const hardcodedUsers: Record<string, { password: string; role: "admin" | "user"; userId: string }> = {
        admin: { password: "admin", role: "admin", userId: "app_admin" },
        user: { password: "user", role: "user", userId: "app_user" },
        user1: { password: "user1", role: "user", userId: "app_user1" },
      };

      const entry = hardcodedUsers[username];
      if (!entry || entry.password !== password) {
        return reply.status(401).send({ error: "Invalid credentials" });
      }

      await core.awardPoints(entry.userId, "app", "miniapp_open").catch(() => {});

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

      // Include admin key for admin users
      if (entry.role === "admin") {
        result.adminKey = process.env.FLOWB_ADMIN_KEY || "flowb-admin-2026";
      }

      return result;
    },
  );

  // ------------------------------------------------------------------
  // AUTH: Web (Privy) - issues a FlowB JWT for web users
  // ------------------------------------------------------------------
  app.post<{ Body: { privyUserId: string; displayName?: string } }>(
    "/api/v1/auth/web",
    async (request, reply) => {
      const { privyUserId, displayName } = request.body || {};
      if (!privyUserId) {
        return reply.status(400).send({ error: "Missing privyUserId" });
      }

      const userId = `web_${privyUserId}`;

      // Ensure user exists in points table
      await core.awardPoints(userId, "web", "miniapp_open").catch(() => {});

      const token = signJwt({
        sub: userId,
        platform: "web" as any,
        username: displayName || "User",
      });

      return {
        token,
        user: {
          id: userId,
          platform: "web",
          username: displayName,
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
  // EVENTS: Discovery (enhanced for mini app)
  // Accepts: ?city=Denver&category=social&categories=defi,ai&limit=20
  // The `categories` param filters by multiple interest categories (comma-separated)
  // ------------------------------------------------------------------
  app.get<{ Querystring: { city?: string; category?: string; categories?: string; limit?: string } }>(
    "/api/v1/events",
    async (request) => {
      const { city, category, categories, limit } = request.query;
      const events = await core.discoverEventsRaw({
        action: "events",
        city: city || "Denver",
        category,
      });

      let filtered = events;

      // Filter by multiple categories if provided (e.g. ?categories=defi,ai,social)
      if (categories) {
        const catList = categories.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
        if (catList.length > 0) {
          filtered = events.filter((e) => {
            // Match against event title, description, and dance styles
            const searchText = [
              e.title,
              e.description || "",
              ...(e.danceStyles || []),
            ].join(" ").toLowerCase();
            return catList.some((cat) => searchText.includes(cat));
          });
        }
      }

      const maxResults = Math.min(parseInt(limit || "20", 10), 50);
      return { events: filtered.slice(0, maxResults) };
    },
  );

  // ------------------------------------------------------------------
  // EVENTS: Single event detail
  // ------------------------------------------------------------------
  app.get<{ Params: { id: string } }>(
    "/api/v1/events/:id",
    async (request, reply) => {
      // Event ID might be from any source - search through cached results
      // For now, search eGator/providers with a broad query and find by ID
      const { id } = request.params;

      // Try to find in recent event results
      const allEvents = await core.discoverEventsRaw({
        action: "events",
        city: "Denver",
      });

      const event = allEvents.find((e) => e.id === id);
      if (!event) {
        return reply.status(404).send({ error: "Event not found" });
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
  app.post<{ Params: { id: string }; Body: { status?: "going" | "maybe" } }>(
    "/api/v1/events/:id/rsvp",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const { id } = request.params;
      const status = request.body?.status || "going";

      if (!flowPlugin || !flowCfg) {
        return { ok: false, error: "Flow plugin not configured" };
      }

      // Get event details for the attendance record
      const allEvents = await core.discoverEventsRaw({ action: "events", city: "Denver" });
      const event = allEvents.find((e) => e.id === id);

      const attendance = await flowPlugin.rsvpWithDetails(
        flowCfg,
        jwt.sub,
        id,
        event?.title || id,
        event?.startTime || null,
        event?.locationName || null,
        status,
      );

      // Also add to the rich schedules table
      if (event) {
        const cfg = getSupabaseConfig();
        if (cfg) {
          await sbPost(cfg, "flowb_schedules?on_conflict=user_id,platform,event_source,event_source_id", {
            user_id: jwt.sub,
            platform: jwt.platform,
            event_title: event.title,
            event_source: event.source,
            event_source_id: event.id,
            event_url: event.url,
            venue_name: event.locationName,
            starts_at: event.startTime,
            ends_at: event.endTime,
            rsvp_status: status,
          }, "return=minimal,resolution=merge-duplicates");

          // Auto-create default reminders for this event
          const prefs = await sbFetch<any[]>(
            cfg,
            `flowb_sessions?user_id=eq.${jwt.sub}&select=reminder_defaults&limit=1`,
          );
          const defaults: number[] = prefs?.[0]?.reminder_defaults || [30];
          for (const mins of defaults) {
            await sbPost(cfg, "flowb_event_reminders?on_conflict=user_id,event_source_id,remind_minutes_before", {
              user_id: jwt.sub,
              event_source_id: event.id,
              remind_minutes_before: mins,
            }, "return=minimal,resolution=merge-duplicates").catch(() => {});
          }
        }
      }

      // Award points
      await core.awardPoints(jwt.sub, jwt.platform, "event_rsvp").catch(() => {});

      // Fire notifications in background
      const notifyCtx = getNotifyContext();
      if (notifyCtx && event) {
        notifyFriendRsvp(notifyCtx, jwt.sub, id, event.title).catch(() => {});
        notifyCrewMemberRsvp(notifyCtx, jwt.sub, id, event.title).catch(() => {});
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
        await fetch(
          `${cfg.supabaseUrl}/rest/v1/flowb_schedules?user_id=eq.${jwt.sub}&event_source_id=eq.${id}`,
          {
            method: "DELETE",
            headers: {
              apikey: cfg.supabaseKey,
              Authorization: `Bearer ${cfg.supabaseKey}`,
            },
          },
        ).catch(() => {});
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

      await fetch(
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
      ).catch(() => {});

      await core.awardPoints(jwt.sub, jwt.platform, "event_checkin").catch(() => {});

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
    { preHandler: authMiddleware },
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

      await core.awardPoints(jwt.sub, jwt.platform, "crew_created").catch(() => {});

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

      await core.awardPoints(jwt.sub, jwt.platform, "crew_joined").catch(() => {});

      // Notify crew members about the new join (background)
      const joinNotifyCtx = getNotifyContext();
      if (joinNotifyCtx) {
        // Try to extract crew info from the result message
        const crewMatch = result.match(/Welcome to (.+?) (.+?)!/);
        const emoji = crewMatch?.[1] || "";
        const name = crewMatch?.[2] || "crew";
        notifyCrewJoin(joinNotifyCtx, jwt.sub, request.params.id, name, emoji).catch(() => {});
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

      return {
        members: members || [],
        checkins: checkins || [],
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

      // Insert checkin
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
      });

      // Award points
      await core.awardPoints(jwt.sub, jwt.platform, "event_checkin").catch(() => {});

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

      await core.awardPoints(jwt.sub, jwt.platform, "flow_accepted").catch(() => {});

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

      const rows = await sbFetch<any[]>(
        cfg,
        `flowb_user_points?user_id=eq.${jwt.sub}&select=total_points,current_streak,longest_streak,milestone_level&limit=1`,
      );

      const row = rows?.[0];
      return {
        points: row?.total_points || 0,
        streak: row?.current_streak || 0,
        longestStreak: row?.longest_streak || 0,
        level: row?.milestone_level || 0,
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

      return { leaderboard: points || [] };
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
        `flowb_sessions?user_id=eq.${jwt.sub}&select=quiet_hours_enabled,timezone,arrival_date,interest_categories,onboarding_complete,reminder_defaults,notify_crew_checkins,notify_friend_rsvps,notify_crew_rsvps,notify_event_reminders,notify_daily_digest,daily_notification_limit,quiet_hours_start,quiet_hours_end&limit=1`,
      );

      const pref = rows?.[0] || {};
      return {
        preferences: {
          quiet_hours_enabled: pref.quiet_hours_enabled || false,
          timezone: pref.timezone || "America/Denver",
          arrival_date: pref.arrival_date || null,
          interest_categories: pref.interest_categories || [],
          onboarding_complete: pref.onboarding_complete || false,
          reminder_defaults: pref.reminder_defaults || [30],
          notify_crew_checkins: pref.notify_crew_checkins ?? true,
          notify_friend_rsvps: pref.notify_friend_rsvps ?? true,
          notify_crew_rsvps: pref.notify_crew_rsvps ?? true,
          notify_event_reminders: pref.notify_event_reminders ?? true,
          notify_daily_digest: pref.notify_daily_digest ?? true,
          daily_notification_limit: pref.daily_notification_limit ?? 10,
          quiet_hours_start: pref.quiet_hours_start ?? 22,
          quiet_hours_end: pref.quiet_hours_end ?? 8,
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
      notify_event_reminders?: boolean;
      notify_daily_digest?: boolean;
      daily_notification_limit?: number;
      quiet_hours_start?: number;
      quiet_hours_end?: number;
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
      if (body.notify_event_reminders !== undefined) updates.notify_event_reminders = body.notify_event_reminders;
      if (body.notify_daily_digest !== undefined) updates.notify_daily_digest = body.notify_daily_digest;
      if (body.daily_notification_limit !== undefined) updates.daily_notification_limit = Math.max(1, Math.min(50, body.daily_notification_limit));
      if (body.quiet_hours_start !== undefined) updates.quiet_hours_start = Math.max(0, Math.min(23, body.quiet_hours_start));
      if (body.quiet_hours_end !== undefined) updates.quiet_hours_end = Math.max(0, Math.min(23, body.quiet_hours_end));

      // Upsert: create session row if it doesn't exist yet
      await fetch(
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
      ).catch(() => {});

      // Award onboarding_complete points (10 pts via daily_login action)
      if (body.onboarding_complete) {
        await core.awardPoints(jwt.sub, jwt.platform, "daily_login").catch(() => {});
      }

      return { ok: true };
    },
  );

  // ------------------------------------------------------------------
  // WHO'S GOING: Social proof for an event (optionally authed)
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

      // If authed, show which friends are going
      const jwt = extractJwt(request);
      if (jwt && flowPlugin && flowCfg) {
        const flowAttendance = await flowPlugin.getFlowAttendanceForEvent(flowCfg, jwt.sub, id);
        result.flowGoing = flowAttendance.going.length;
        result.flowMaybe = flowAttendance.maybe.length;
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
      await fetch(
        `${cfg.supabaseUrl}/rest/v1/flowb_event_reminders?user_id=eq.${jwt.sub}&event_source_id=eq.${id}&remind_minutes_before=not.in.(${valid.join(",")})`,
        {
          method: "DELETE",
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: `Bearer ${cfg.supabaseKey}`,
          },
        },
      ).catch(() => {});

      // Upsert each reminder
      for (const mins of valid) {
        await sbPost(cfg, "flowb_event_reminders?on_conflict=user_id,event_source_id,remind_minutes_before", {
          user_id: jwt.sub,
          event_source_id: id,
          remind_minutes_before: mins,
          sent: false,
        }, "return=minimal,resolution=merge-duplicates").catch(() => {});
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

      await fetch(
        `${cfg.supabaseUrl}/rest/v1/flowb_event_reminders?user_id=eq.${jwt.sub}&event_source_id=eq.${id}`,
        {
          method: "DELETE",
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: `Bearer ${cfg.supabaseKey}`,
          },
        },
      ).catch(() => {});

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

      // Fallback: try event discovery
      if (!startTime) {
        const allEvents = await core.discoverEventsRaw({ action: "events", city: "Denver" });
        const event = allEvents.find((e) => e.id === id);
        if (event) {
          title = event.title || title;
          startTime = event.startTime;
          endTime = event.endTime ?? null;
          venue = event.locationName || "";
          url = event.url || "";
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
        "PRODID:-//FlowB//ETHDenver 2026//EN",
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
    if (!adminKey || adminKey !== (process.env.FLOWB_ADMIN_KEY || "flowb-admin-2026")) {
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
    { preHandler: authMiddleware },
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

      await fetch(
        `${cfg.supabaseUrl}/rest/v1/flowb_discovered_events?id=eq.${request.params.id}`,
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
      ).catch(() => {});

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

      await fetch(
        `${cfg.supabaseUrl}/rest/v1/flowb_discovered_events?id=eq.${request.params.id}`,
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
      ).catch(() => {});

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
  // ADMIN: All events (for curation - includes featured/hidden)
  // ------------------------------------------------------------------
  app.get<{ Querystring: { limit?: string; offset?: string; search?: string } }>(
    "/api/v1/admin/events",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!requireAdmin(request, reply)) return;

      const { limit, offset, search } = request.query;
      const maxResults = Math.min(parseInt(limit || "50", 10), 200);

      const events = await core.discoverEventsRaw({
        action: "events",
        city: "Denver",
      });

      let filtered = events;
      if (search) {
        const q = search.toLowerCase();
        filtered = events.filter(e =>
          e.title?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.locationName?.toLowerCase().includes(q)
        );
      }

      const start = parseInt(offset || "0", 10);
      return {
        events: filtered.slice(start, start + maxResults),
        total: filtered.length,
      };
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
}

// ============================================================================
// Helpers
// ============================================================================

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

function getNotifyContext(): { supabase: SbConfig } | null {
  const cfg = getSupabaseConfig();
  if (!cfg) return null;
  return { supabase: cfg };
}

function getSupabaseConfig(): SbConfig | null {
  const url = process.env.DANZ_SUPABASE_URL;
  const key = process.env.DANZ_SUPABASE_KEY;
  if (!url || !key) return null;
  return { supabaseUrl: url, supabaseKey: key };
}

/** Extract JWT from Authorization header without failing (for optional auth) */
function extractJwt(request: any): JWTPayload | null {
  const auth = request.headers?.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return verifyJwt(auth.slice(7));
}
