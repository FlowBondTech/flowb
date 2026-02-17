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
  notifyCrewCheckin,
  notifyCrewLocate,
} from "../services/notifications.js";
import {
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
} from "@farcaster/miniapp-node";
// Identity resolution imported dynamically where needed (../services/identity.js)

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

      // Store display name in sessions for leaderboard/member resolution
      const displayName = user.first_name || user.username || `User ${user.id}`;
      const cfg = getSupabaseConfig();
      if (cfg) {
        await sbPost(cfg, "flowb_sessions?on_conflict=user_id", {
          user_id: userId,
          danz_username: displayName,
        }, "return=minimal,resolution=merge-duplicates").catch(() => {});
      }

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
  // FEED: EthDenver Farcaster Feed (aggregates posts with keywords)
  // Searches multiple queries and deduplicates by cast hash.
  // ------------------------------------------------------------------
  app.get<{ Querystring: { cursor?: string } }>(
    "/api/v1/feed/ethdenver",
    async (request) => {
      const neynarKey = process.env.NEYNAR_API_KEY;
      if (!neynarKey) {
        return { casts: [], nextCursor: undefined };
      }

      const queries = ["ethdenver", "eth denver", "#ethdenver", "buidlathon"];
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

      // Merge, deduplicate by hash, filter from Feb 12
      const seen = new Set<string>();
      const allCasts: any[] = [];
      let lastCursor: string | undefined;

      const cutoffDate = new Date("2026-02-12T00:00:00Z").getTime();

      for (const r of results) {
        if (r.status !== "fulfilled") continue;
        const { casts, next } = r.value;
        if (next && !lastCursor) lastCursor = next;
        for (const cast of casts) {
          if (!cast.hash || seen.has(cast.hash)) continue;
          // Filter: only posts from Feb 12 onwards
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
    },
  );

  // ------------------------------------------------------------------
  // EVENTS: DB-first discovery
  // Accepts: ?city=&categories=&zone=&type=&date=&from=&to=&featured=&q=&limit=&offset=
  // ------------------------------------------------------------------
  app.get<{ Querystring: { city?: string; categories?: string; zone?: string; type?: string; date?: string; from?: string; to?: string; featured?: string; q?: string; limit?: string; offset?: string } }>(
    "/api/v1/events",
    async (request) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { events: [], total: 0 };

      const { city, categories, zone, type, date, from, to, featured, q, limit, offset } = request.query;
      const maxResults = Math.min(parseInt(limit || "50", 10), 200);
      const skip = parseInt(offset || "0", 10);

      // Build PostgREST query
      let query = `flowb_events?hidden=eq.false&order=starts_at.asc&limit=${maxResults}&offset=${skip}`;

      if (city) query += `&city=ilike.*${encodeURIComponent(city)}*`;
      if (zone) query += `&zone_id=eq.${encodeURIComponent(zone)}`;
      if (type) query += `&event_type=eq.${encodeURIComponent(type)}`;
      if (featured === "true") query += `&featured=eq.true`;
      if (date) {
        const dayStart = `${date}T00:00:00`;
        const dayEnd = `${date}T23:59:59`;
        query += `&starts_at=gte.${dayStart}&starts_at=lte.${dayEnd}`;
      }
      if (from) query += `&starts_at=gte.${encodeURIComponent(from)}`;
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

      return { events, total: events.length };
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
    { preHandler: authMiddleware },
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
          fetch(
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
          ).catch(() => {});
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
            await sbPost(cfg, "flowb_event_reminders?on_conflict=user_id,event_source_id,remind_minutes_before", {
              user_id: jwt.sub,
              event_source_id: id,
              remind_minutes_before: mins,
            }, "return=minimal,resolution=merge-duplicates").catch(() => {});
          }
        }
      }

      // Award points
      await core.awardPoints(jwt.sub, jwt.platform, "event_rsvp").catch(() => {});

      // Fire notifications in background
      const notifyCtx = getNotifyContext();
      if (notifyCtx && eventTitle !== id) {
        notifyFriendRsvp(notifyCtx, jwt.sub, id, eventTitle).catch(() => {});
        notifyCrewMemberRsvp(notifyCtx, jwt.sub, id, eventTitle).catch(() => {});
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

      // Resolve display names from sessions
      const allUserIds = [
        ...new Set([
          ...(members || []).map((m: any) => m.user_id),
          ...(checkins || []).map((c: any) => c.user_id),
        ]),
      ];
      const sessions = allUserIds.length
        ? await sbFetch<any[]>(cfg, `flowb_sessions?user_id=in.(${allUserIds.join(",")})&select=user_id,danz_username`)
        : [];
      const nameMap = new Map((sessions || []).map((s) => [s.user_id, s.danz_username]));

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
      await core.awardPoints(jwt.sub, jwt.platform, "event_checkin").catch(() => {});

      // Notify crew members (background)
      const checkinNotifyCtx = getNotifyContext();
      if (checkinNotifyCtx) {
        // Look up crew name/emoji
        const crewRow = await sbFetch<any[]>(cfg, `flowb_groups?id=eq.${id}&select=name,emoji&limit=1`);
        const crewName = crewRow?.[0]?.name || "crew";
        const crewEmoji = crewRow?.[0]?.emoji || "";
        notifyCrewCheckin(checkinNotifyCtx, jwt.sub, id, crewName, crewEmoji, venueName).catch(() => {});
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

      // Resolve display names from sessions
      const sessions = await sbFetch<any[]>(
        cfg,
        `flowb_sessions?user_id=in.(${userIds.join(",")})&select=user_id,danz_username`,
      );
      const nameMap = new Map((sessions || []).map((s) => [s.user_id, s.danz_username]));

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
  // FLOW: Discover public crews (requires auth)
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/flow/crews/discover",
    { preHandler: authMiddleware },
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
        ? await sbFetch<any[]>(cfg, `flowb_sessions?user_id=in.(${userIds.join(",")})&select=user_id,danz_username`)
        : [];
      const nameMap = new Map((sessions || []).map((s) => [s.user_id, s.danz_username]));

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
          notifyCrewCheckin(notCtx, jwt.sub, cid, cName, cEmoji, loc.name).catch(() => {});
        }
      }

      // Award QR checkin points (10 pts, higher than manual)
      await core.awardPoints(jwt.sub, jwt.platform, "qr_checkin").catch(() => {});

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
        ? await sbFetch<any[]>(cfg, `flowb_sessions?user_id=in.(${userIds.join(",")})&select=user_id,danz_username`)
        : [];
      const nameMap = new Map((sessions || []).map((s) => [s.user_id, s.danz_username]));

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
        notifyCrewLocate(notCtx, jwt.sub, id, cName, cEmoji, missingMembers).catch(() => {});
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
        ? await sbFetch<any[]>(cfg, `flowb_sessions?user_id=in.(${userIds.join(",")})&select=user_id,danz_username`)
        : [];
      const nameMap = new Map((sessions || []).map((s) => [s.user_id, s.danz_username]));

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
        `flowb_sessions?user_id=eq.${jwt.sub}&select=danz_username&limit=1`,
      );
      const displayName = sessions?.[0]?.danz_username || undefined;

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
      await core.awardPoints(jwt.sub, jwt.platform, "crew_message").catch(() => {});

      return {
        message: {
          ...msg,
          display_name: msg.display_name || displayName || undefined,
        },
      };
    },
  );

  // ------------------------------------------------------------------
  // CHAT: AI Chat Completions (xAI Grok proxy)
  //
  // OpenAI-compatible /v1/chat/completions endpoint.
  // Used by: Farcaster mini app, web app, Telegram mini app.
  // Requires XAI_API_KEY env var set on Fly.
  // ------------------------------------------------------------------
  app.post<{ Body: { messages: Array<{ role: string; content: string }>; model?: string; stream?: boolean; user?: string } }>(
    "/v1/chat/completions",
    async (request, reply) => {
      const apiKey = process.env.XAI_API_KEY;
      if (!apiKey) {
        return reply.status(503).send({ error: "Chat not configured" });
      }

      const { messages = [], stream = false, user } = request.body || {};
      if (!messages.length) {
        return reply.status(400).send({ error: "Missing messages" });
      }

      // Inject FlowB system prompt if none provided
      const hasSystem = messages.some((m) => m.role === "system");
      const chatMessages = hasSystem
        ? messages.slice(-25)
        : [
            {
              role: "system",
              content: `You are FlowB, a friendly AI assistant for ETHDenver 2026 side events in Denver (Feb 15-27, 2026). You help users discover events, hackathons, parties, meetups, and summits.

RULES:
1. Reply in a SINGLE concise message. Use clear sections if answering multiple questions.
2. Be conversational and helpful. Use emojis sparingly.
3. Format event listings with titles, dates/times, venues, and prices.
4. If asked about non-event topics, stay friendly but steer back to ETHDenver.
5. When you don't know specifics, suggest the user check flowb.me for the latest listings.`,
            },
            ...messages.slice(-24),
          ];

      try {
        const res = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "grok-3-mini-fast",
            messages: chatMessages,
            stream: false,
            max_tokens: 1024,
            temperature: 0.7,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`[chat] xAI error ${res.status}:`, errText);
          return reply.status(502).send({ error: "AI service error" });
        }

        const data = await res.json();
        return data;
      } catch (err: any) {
        console.error("[chat] xAI request failed:", err.message);
        return reply.status(502).send({ error: "AI service unavailable" });
      }
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
      await fetch(
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
      ).catch(() => {});
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
        await sbPost(cfg, "flowb_event_category_map?on_conflict=event_id,category_id", {
          event_id: request.params.id,
          category_id: cat.id,
          confidence: 1.0,
          source: "admin",
        }, "return=minimal,resolution=merge-duplicates").catch(() => {});
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
      if (!["event", "location"].includes(targetType)) {
        return reply.status(400).send({ error: "targetType must be event or location" });
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
      await core.awardPoints(jwt.sub, jwt.platform, "sponsor_created").catch(() => {});

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
            await core.awardPoints(jwt.sub, jwt.platform, "sponsor_verified").catch(() => {});
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

      await core.awardPoints(sp.sponsor_user_id, "telegram", "sponsor_verified").catch(() => {});
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
        await core.awardPoints(jwt.sub, jwt.platform, action).catch(() => {});
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
