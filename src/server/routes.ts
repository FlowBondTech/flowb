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
  // AUTH: Farcaster Mini App (SIWF)
  // ------------------------------------------------------------------
  app.post<{ Body: { message: string; signature: string } }>(
    "/api/v1/auth/farcaster",
    async (request, reply) => {
      const neynarKey = process.env.NEYNAR_API_KEY;
      const { message, signature } = request.body || {};

      if (!message || !signature) {
        return reply.status(400).send({ error: "Missing message or signature" });
      }

      const result = await validateFarcasterSignIn(message, signature, neynarKey);
      if (!result.valid) {
        return reply.status(401).send({ error: result.error });
      }

      const { user } = result;
      const userId = `farcaster_${user.fid}`;

      // Ensure user exists in points table
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
        `flowb_sessions?user_id=eq.${jwt.sub}&select=quiet_hours_enabled,timezone,arrival_date,interest_categories,onboarding_complete&limit=1`,
      );

      const pref = rows?.[0] || {};
      return {
        preferences: {
          quiet_hours_enabled: pref.quiet_hours_enabled || false,
          timezone: pref.timezone || "America/Denver",
          arrival_date: pref.arrival_date || null,
          interest_categories: pref.interest_categories || [],
          onboarding_complete: pref.onboarding_complete || false,
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
}

// ============================================================================
// Helpers
// ============================================================================

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
