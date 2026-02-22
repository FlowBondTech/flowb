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
  notifyCrewMessage,
} from "../services/notifications.js";
import { handleChat, type UserContext } from "../services/ai-chat.js";
import {
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
} from "@farcaster/miniapp-node";
import { resolveCanonicalId, getLinkedIds } from "../services/identity.js";
import { sbFetch, sbPost, type SbConfig } from "../utils/supabase.js";
import { log, fireAndForget } from "../utils/logger.js";


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
          danz_username: displayName,
        }, "return=minimal,resolution=merge-duplicates"), "upsert session");
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

      fireAndForget(core.awardPoints(userId, "farcaster", "miniapp_open"), "award points");

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
  // AUTH: Web (Privy) - issues a FlowB JWT for web users
  // ------------------------------------------------------------------
  app.post<{ Body: { privyUserId: string; displayName?: string } }>(
    "/api/v1/auth/web",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          required: ["privyUserId"],
          properties: { privyUserId: { type: "string" }, displayName: { type: "string" } },
        },
      },
    },
    async (request, reply) => {
      const { privyUserId, displayName } = request.body || {};
      if (!privyUserId) {
        return reply.status(400).send({ error: "Missing privyUserId" });
      }

      const userId = `web_${privyUserId}`;

      // Ensure user exists in points table
      fireAndForget(core.awardPoints(userId, "web", "miniapp_open"), "award points");

      // Auto-resolve cross-platform identity on web login
      const cfg = getSupabaseConfig();
      if (cfg) {
        try {
          const { resolveCanonicalId } = await import("../services/identity.js");
          await resolveCanonicalId(cfg, userId, { displayName: displayName || undefined });
        } catch {}
      }

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
        ? await sbFetch<any[]>(cfg, `flowb_sessions?user_id=in.(${allUserIds.join(",")})&select=user_id,display_name,danz_username`)
        : [];
      const nameMap = new Map((sessions || []).map((s: any) => [s.user_id, s.display_name || s.danz_username || "Someone"]));

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
  // ------------------------------------------------------------------
  app.get<{ Querystring: { city?: string; categories?: string; zone?: string; type?: string; date?: string; from?: string; to?: string; featured?: string; free?: string; q?: string; limit?: string; offset?: string } }>(
    "/api/v1/events",
    async (request) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { events: [], total: 0 };

      const { city, categories, zone, type, date, from, to, featured, free: freeOnly, q, limit, offset } = request.query;
      const maxResults = Math.min(parseInt(limit || "50", 10), 200);
      const skip = parseInt(offset || "0", 10);

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
        fireAndForget(notifyFriendRsvp(notifyCtx, jwt.sub, id, eventTitle), "notify friend rsvp");
        fireAndForget(notifyCrewMemberRsvp(notifyCtx, jwt.sub, id, eventTitle), "notify crew member rsvp");
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
        const sessions = await sbFetch<any[]>(cfg, `flowb_sessions?user_id=eq.${jwt.sub}&select=display_name,danz_username&limit=1`);
        if (sessions?.[0]) {
          userContext.displayName = sessions[0].display_name || sessions[0].danz_username || null;
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
        const result = await handleChat(messages, {
          sb: cfg,
          xaiKey: apiKey,
          user: userContext,
          model,
        });

        // Return OpenAI-compatible format for backward compat
        return {
          id: `chatcmpl-${Date.now()}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: model || "grok-3-mini-fast",
          choices: [{ index: 0, message: result, finish_reason: "stop" }],
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
        `flowb_sessions?user_id=eq.${jwt.sub}&select=quiet_hours_enabled,timezone,arrival_date,interest_categories,onboarding_complete,reminder_defaults,notify_crew_checkins,notify_friend_rsvps,notify_crew_rsvps,notify_crew_messages,notify_event_reminders,notify_daily_digest,daily_notification_limit,quiet_hours_start,quiet_hours_end&limit=1`,
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
          notify_crew_messages: pref.notify_crew_messages ?? true,
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
      notify_crew_messages?: boolean;
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
      if (body.notify_crew_messages !== undefined) updates.notify_crew_messages = body.notify_crew_messages;
      if (body.notify_event_reminders !== undefined) updates.notify_event_reminders = body.notify_event_reminders;
      if (body.notify_daily_digest !== undefined) updates.notify_daily_digest = body.notify_daily_digest;
      if (body.daily_notification_limit !== undefined) updates.daily_notification_limit = Math.max(1, Math.min(50, body.daily_notification_limit));
      if (body.quiet_hours_start !== undefined) updates.quiet_hours_start = Math.max(0, Math.min(23, body.quiet_hours_start));
      if (body.quiet_hours_end !== undefined) updates.quiet_hours_end = Math.max(0, Math.min(23, body.quiet_hours_end));

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
  // SYNC LINKED ACCOUNTS: Re-resolve identity after Privy account linking
  // Called from web after user links a new account via Privy UI
  // ------------------------------------------------------------------
  app.post(
    "/api/v1/me/sync-linked-accounts",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { ok: false, error: "Not configured" };

      // For web users, look up their full Privy profile and sync all linked accounts
      const privyAppId = process.env.PRIVY_APP_ID;
      const privyAppSecret = process.env.PRIVY_APP_SECRET;

      if (!privyAppId || !privyAppSecret) {
        return { ok: false, error: "Privy not configured" };
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
  // AGENTS: Personal AI Agents + x402 Micropayments
  // ============================================================================

  // ------------------------------------------------------------------
  // AGENTS: List all agent slots (public)
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/agents",
    async () => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { agents: [], skills: [] };

      const agents = await sbFetch<any[]>(
        cfg,
        `flowb_agents?select=slot_number,user_id,agent_name,status,reserved_for,skills,usdc_balance,total_earned,total_spent,claimed_at&order=slot_number.asc`,
      );

      const skills = await sbFetch<any[]>(
        cfg,
        `flowb_agent_skills?active=eq.true&select=slug,name,description,price_usdc,category,capabilities&order=price_usdc.asc`,
      );

      // Resolve display names for claimed agents
      const claimedIds = (agents || []).filter((a) => a.user_id).map((a) => a.user_id);
      let nameMap = new Map<string, string>();
      if (claimedIds.length) {
        const sessions = await sbFetch<any[]>(
          cfg,
          `flowb_sessions?user_id=in.(${claimedIds.join(",")})&select=user_id,danz_username`,
        );
        nameMap = new Map((sessions || []).map((s) => [s.user_id, s.danz_username]));
      }

      return {
        agents: (agents || []).map((a) => ({
          slot: a.slot_number,
          userId: a.user_id || null,
          displayName: a.user_id ? nameMap.get(a.user_id) || null : null,
          agentName: a.agent_name || null,
          status: a.status,
          reservedFor: a.reserved_for || null,
          skills: a.skills || [],
          balance: Number(a.usdc_balance) || 0,
          totalEarned: Number(a.total_earned) || 0,
          totalSpent: Number(a.total_spent) || 0,
          claimedAt: a.claimed_at || null,
        })),
        skills: skills || [],
        stats: {
          total: 10,
          claimed: (agents || []).filter((a) => a.status === "claimed" || a.status === "active").length,
          open: (agents || []).filter((a) => a.status === "open").length,
          reserved: (agents || []).filter((a) => a.status === "reserved").length,
        },
      };
    },
  );

  // ------------------------------------------------------------------
  // AGENTS: Get my agent (requires auth)
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/agents/me",
    { preHandler: authMiddleware },
    async (request) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return { agent: null };

      const rows = await sbFetch<any[]>(
        cfg,
        `flowb_agents?user_id=eq.${jwt.sub}&select=*&limit=1`,
      );

      const agent = rows?.[0];
      if (!agent) return { agent: null };

      // Get transaction history
      const txs = await sbFetch<any[]>(
        cfg,
        `flowb_agent_transactions?or=(from_agent_id.eq.${agent.id},to_agent_id.eq.${agent.id})&select=*&order=created_at.desc&limit=20`,
      );

      return {
        agent: {
          id: agent.id,
          slot: agent.slot_number,
          name: agent.agent_name,
          walletAddress: agent.wallet_address,
          status: agent.status,
          skills: agent.skills || [],
          balance: Number(agent.usdc_balance) || 0,
          totalEarned: Number(agent.total_earned) || 0,
          totalSpent: Number(agent.total_spent) || 0,
          metadata: agent.metadata || {},
          claimedAt: agent.claimed_at,
        },
        transactions: (txs || []).map((tx) => ({
          id: tx.id,
          type: tx.tx_type,
          amount: Number(tx.amount_usdc),
          skillSlug: tx.skill_slug,
          eventId: tx.event_id,
          txHash: tx.tx_hash,
          status: tx.status,
          direction: tx.from_agent_id === agent.id ? "out" : "in",
          createdAt: tx.created_at,
        })),
      };
    },
  );

  // ------------------------------------------------------------------
  // AGENTS: Claim an open agent slot (requires auth)
  // ------------------------------------------------------------------
  app.post<{ Body: { agentName?: string } }>(
    "/api/v1/agents/claim",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });

      // Check if user already has an agent
      const existing = await sbFetch<any[]>(
        cfg,
        `flowb_agents?user_id=eq.${jwt.sub}&select=id,slot_number&limit=1`,
      );
      if (existing?.length) {
        return reply.status(409).send({ error: "You already have an agent", slot: existing[0].slot_number });
      }

      // Find first open slot
      const openSlots = await sbFetch<any[]>(
        cfg,
        `flowb_agents?status=eq.open&select=id,slot_number&order=slot_number.asc&limit=1`,
      );
      if (!openSlots?.length) {
        return reply.status(410).send({ error: "No agent slots available" });
      }

      const slot = openSlots[0];
      const agentName = (request.body?.agentName || `${jwt.sub.replace(/^(telegram_|farcaster_)/, "")}'s Agent`).slice(0, 50);

      // Claim the slot
      const res = await fetch(
        `${cfg.supabaseUrl}/rest/v1/flowb_agents?id=eq.${slot.id}&status=eq.open`,
        {
          method: "PATCH",
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: `Bearer ${cfg.supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            user_id: jwt.sub,
            agent_name: agentName,
            status: "claimed",
            claimed_at: new Date().toISOString(),
            usdc_balance: 0.50, // seed balance
            skills: ["basic-search"], // starter skill
            metadata: { platform: jwt.platform, claimedFrom: "app" },
            updated_at: new Date().toISOString(),
          }),
        },
      );

      if (!res.ok) {
        return reply.status(500).send({ error: "Failed to claim agent" });
      }

      const claimed = await res.json();
      const agent = Array.isArray(claimed) ? claimed[0] : claimed;

      // Log the seed transaction
      await sbPost(cfg, "flowb_agent_transactions", {
        to_agent_id: agent.id,
        to_user_id: jwt.sub,
        amount_usdc: 0.50,
        tx_type: "seed",
        status: "completed",
        metadata: { reason: "EthDenver launch seed" },
      }, "return=minimal");

      // Award points for claiming
      try {
        await core.awardPoints(jwt.sub, jwt.platform, "agent_claimed");
      } catch {}

      console.log(`[agents] ${jwt.sub} claimed slot #${slot.slot_number} as "${agentName}"`);

      return {
        ok: true,
        agent: {
          id: agent.id,
          slot: agent.slot_number,
          name: agent.agent_name,
          status: "claimed",
          balance: 0.50,
          skills: ["basic-search"],
        },
      };
    },
  );

  // ------------------------------------------------------------------
  // AGENTS: Purchase a skill (x402-style flow)
  // ------------------------------------------------------------------
  app.post<{ Body: { skillSlug: string } }>(
    "/api/v1/agents/skills/purchase",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });

      const { skillSlug } = request.body || {};
      if (!skillSlug) return reply.status(400).send({ error: "skillSlug required" });

      // Get user's agent
      const agents = await sbFetch<any[]>(
        cfg,
        `flowb_agents?user_id=eq.${jwt.sub}&select=*&limit=1`,
      );
      const agent = agents?.[0];
      if (!agent) return reply.status(404).send({ error: "No agent found. Claim one first." });

      // Check if already has this skill
      const currentSkills: string[] = agent.skills || [];
      if (currentSkills.includes(skillSlug)) {
        return reply.status(409).send({ error: "Agent already has this skill" });
      }

      // Get skill details
      const skills = await sbFetch<any[]>(
        cfg,
        `flowb_agent_skills?slug=eq.${skillSlug}&active=eq.true&select=*&limit=1`,
      );
      const skill = skills?.[0];
      if (!skill) return reply.status(404).send({ error: "Skill not found" });

      const price = Number(skill.price_usdc);
      const balance = Number(agent.usdc_balance);

      // x402-style: if no payment header, return 402 with price info
      const paymentHeader = request.headers["x-402-payment"] || request.headers["payment"];
      if (!paymentHeader && balance < price) {
        return reply
          .status(402)
          .header("X-402-Price", price.toString())
          .header("X-402-Currency", "USDC")
          .header("X-402-Network", "base")
          .header("X-402-PayTo", process.env.CDP_ACCOUNT_ADDRESS || "")
          .send({
            error: "Payment required",
            price: price,
            currency: "USDC",
            network: "base",
            payTo: process.env.CDP_ACCOUNT_ADDRESS || "",
            skill: { slug: skill.slug, name: skill.name, description: skill.description },
          });
      }

      // Deduct from agent balance (or accept x402 payment)
      const newBalance = balance - price;
      const updatedSkills = [...currentSkills, skillSlug];

      await fetch(
        `${cfg.supabaseUrl}/rest/v1/flowb_agents?id=eq.${agent.id}`,
        {
          method: "PATCH",
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: `Bearer ${cfg.supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            skills: updatedSkills,
            usdc_balance: newBalance,
            total_spent: (Number(agent.total_spent) || 0) + price,
            updated_at: new Date().toISOString(),
          }),
        },
      );

      // Log transaction
      await sbPost(cfg, "flowb_agent_transactions", {
        from_agent_id: agent.id,
        from_user_id: jwt.sub,
        amount_usdc: price,
        tx_type: "skill_purchase",
        skill_slug: skillSlug,
        status: "completed",
        metadata: { skillName: skill.name },
      }, "return=minimal");

      // Award points
      try {
        await core.awardPoints(jwt.sub, jwt.platform, "skill_purchased");
      } catch {}

      console.log(`[agents] ${jwt.sub} purchased skill "${skillSlug}" for $${price}`);

      return {
        ok: true,
        skill: { slug: skill.slug, name: skill.name, capabilities: skill.capabilities },
        agent: {
          balance: newBalance,
          skills: updatedSkills,
          totalSpent: (Number(agent.total_spent) || 0) + price,
        },
      };
    },
  );

  // ------------------------------------------------------------------
  // AGENTS: Boost an event (x402 micropayment)
  // ------------------------------------------------------------------
  app.post<{ Body: { eventId: string; durationHours?: number } }>(
    "/api/v1/agents/boost-event",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });

      const { eventId, durationHours } = request.body || {};
      if (!eventId) return reply.status(400).send({ error: "eventId required" });

      const agents = await sbFetch<any[]>(
        cfg,
        `flowb_agents?user_id=eq.${jwt.sub}&select=*&limit=1`,
      );
      const agent = agents?.[0];
      if (!agent) return reply.status(404).send({ error: "No agent found" });

      const price = 0.50;
      const balance = Number(agent.usdc_balance);
      const hours = durationHours || 24;

      // x402-style 402 response if insufficient balance
      if (balance < price) {
        return reply
          .status(402)
          .header("X-402-Price", price.toString())
          .header("X-402-Currency", "USDC")
          .send({
            error: "Payment required",
            price,
            currency: "USDC",
            network: "base",
            eventId,
          });
      }

      const expiresAt = new Date(Date.now() + hours * 3600_000).toISOString();

      // Create boost
      await sbPost(cfg, "flowb_event_boosts", {
        event_id: eventId,
        agent_id: agent.id,
        user_id: jwt.sub,
        amount_usdc: price,
        agent_name: agent.agent_name,
        expires_at: expiresAt,
        active: true,
      }, "return=minimal");

      // Deduct balance
      await fetch(
        `${cfg.supabaseUrl}/rest/v1/flowb_agents?id=eq.${agent.id}`,
        {
          method: "PATCH",
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: `Bearer ${cfg.supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            usdc_balance: balance - price,
            total_spent: (Number(agent.total_spent) || 0) + price,
            updated_at: new Date().toISOString(),
          }),
        },
      );

      // Log transaction
      await sbPost(cfg, "flowb_agent_transactions", {
        from_agent_id: agent.id,
        from_user_id: jwt.sub,
        amount_usdc: price,
        tx_type: "event_boost",
        event_id: eventId,
        status: "completed",
        metadata: { durationHours: hours },
      }, "return=minimal");

      try {
        await core.awardPoints(jwt.sub, jwt.platform, "event_boosted");
      } catch {}

      console.log(`[agents] ${jwt.sub} boosted event "${eventId}" for $${price}`);

      return {
        ok: true,
        boost: { eventId, expiresAt, price, agentName: agent.agent_name },
        agent: { balance: balance - price },
      };
    },
  );

  // ------------------------------------------------------------------
  // AGENTS: Agent-to-agent recommendation (x402)
  // ------------------------------------------------------------------
  app.post<{ Body: { targetUserId: string; context?: string; preferences?: string[] } }>(
    "/api/v1/agents/recommend",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });

      const { targetUserId, context, preferences } = request.body || {};
      if (!targetUserId) return reply.status(400).send({ error: "targetUserId required" });

      // Get requester's agent
      const myAgents = await sbFetch<any[]>(
        cfg,
        `flowb_agents?user_id=eq.${jwt.sub}&select=*&limit=1`,
      );
      const myAgent = myAgents?.[0];
      if (!myAgent) return reply.status(404).send({ error: "You need an agent to request recommendations" });

      // Get target's agent
      const targetAgents = await sbFetch<any[]>(
        cfg,
        `flowb_agents?user_id=eq.${targetUserId}&select=*&limit=1`,
      );
      const targetAgent = targetAgents?.[0];
      if (!targetAgent) return reply.status(404).send({ error: "Target user has no agent" });

      const price = 0.02;
      const balance = Number(myAgent.usdc_balance);

      if (balance < price) {
        return reply
          .status(402)
          .header("X-402-Price", price.toString())
          .send({ error: "Payment required", price, currency: "USDC" });
      }

      // Get target user's recent activity for recommendations
      const targetSchedule = await sbFetch<any[]>(
        cfg,
        `flowb_schedules?user_id=eq.${targetUserId}&rsvp_status=eq.going&select=event_title,event_source_id,venue_name,starts_at&order=starts_at.asc&limit=5`,
      );

      const targetCheckins = await sbFetch<any[]>(
        cfg,
        `flowb_checkins?user_id=eq.${targetUserId}&select=venue_name,status,created_at&order=created_at.desc&limit=3`,
      );

      // Build recommendations from target's social graph
      const recommendations = (targetSchedule || []).map((s) => ({
        event: s.event_title,
        eventId: s.event_source_id,
        venue: s.venue_name,
        startsAt: s.starts_at,
        reason: `${targetAgent.agent_name} is going`,
      }));

      if (targetCheckins?.length) {
        recommendations.unshift({
          event: `${targetAgent.agent_name} is at ${targetCheckins[0].venue_name}`,
          eventId: null as any,
          venue: targetCheckins[0].venue_name,
          startsAt: targetCheckins[0].created_at,
          reason: "Currently checked in",
        });
      }

      // Deduct from requester, credit to target
      await Promise.all([
        fetch(`${cfg.supabaseUrl}/rest/v1/flowb_agents?id=eq.${myAgent.id}`, {
          method: "PATCH",
          headers: { apikey: cfg.supabaseKey, Authorization: `Bearer ${cfg.supabaseKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ usdc_balance: balance - price, total_spent: (Number(myAgent.total_spent) || 0) + price, updated_at: new Date().toISOString() }),
        }),
        fetch(`${cfg.supabaseUrl}/rest/v1/flowb_agents?id=eq.${targetAgent.id}`, {
          method: "PATCH",
          headers: { apikey: cfg.supabaseKey, Authorization: `Bearer ${cfg.supabaseKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ usdc_balance: Number(targetAgent.usdc_balance) + price, total_earned: (Number(targetAgent.total_earned) || 0) + price, updated_at: new Date().toISOString() }),
        }),
      ]);

      // Log transaction
      await sbPost(cfg, "flowb_agent_transactions", {
        from_agent_id: myAgent.id,
        to_agent_id: targetAgent.id,
        from_user_id: jwt.sub,
        to_user_id: targetUserId,
        amount_usdc: price,
        tx_type: "recommendation",
        status: "completed",
        metadata: { context, preferences },
      }, "return=minimal");

      console.log(`[agents] ${jwt.sub} got recommendations from ${targetUserId}'s agent for $${price}`);

      return {
        ok: true,
        from: { agentName: targetAgent.agent_name, userId: targetUserId },
        recommendations,
        price,
        myBalance: balance - price,
      };
    },
  );

  // ------------------------------------------------------------------
  // AGENTS: Send a tip to another user/agent
  // ------------------------------------------------------------------
  app.post<{ Body: { recipientUserId: string; amount: number; eventId?: string; message?: string } }>(
    "/api/v1/agents/tip",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });

      const { recipientUserId, amount, eventId, message } = request.body || {};
      if (!recipientUserId || !amount || amount <= 0) {
        return reply.status(400).send({ error: "recipientUserId and positive amount required" });
      }
      if (amount > 10) return reply.status(400).send({ error: "Max tip is $10" });

      const myAgents = await sbFetch<any[]>(cfg, `flowb_agents?user_id=eq.${jwt.sub}&select=*&limit=1`);
      const myAgent = myAgents?.[0];
      if (!myAgent) return reply.status(404).send({ error: "You need an agent" });

      const balance = Number(myAgent.usdc_balance);
      if (balance < amount) {
        return reply.status(402).send({ error: "Insufficient balance", balance, required: amount });
      }

      // Get or create recipient context
      const recipientAgents = await sbFetch<any[]>(cfg, `flowb_agents?user_id=eq.${recipientUserId}&select=*&limit=1`);
      const recipientAgent = recipientAgents?.[0];

      // Deduct from sender
      await fetch(`${cfg.supabaseUrl}/rest/v1/flowb_agents?id=eq.${myAgent.id}`, {
        method: "PATCH",
        headers: { apikey: cfg.supabaseKey, Authorization: `Bearer ${cfg.supabaseKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ usdc_balance: balance - amount, total_spent: (Number(myAgent.total_spent) || 0) + amount, updated_at: new Date().toISOString() }),
      });

      // Credit recipient agent (if they have one)
      if (recipientAgent) {
        await fetch(`${cfg.supabaseUrl}/rest/v1/flowb_agents?id=eq.${recipientAgent.id}`, {
          method: "PATCH",
          headers: { apikey: cfg.supabaseKey, Authorization: `Bearer ${cfg.supabaseKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ usdc_balance: Number(recipientAgent.usdc_balance) + amount, total_earned: (Number(recipientAgent.total_earned) || 0) + amount, updated_at: new Date().toISOString() }),
        });
      }

      // Log transaction
      await sbPost(cfg, "flowb_agent_transactions", {
        from_agent_id: myAgent.id,
        to_agent_id: recipientAgent?.id || null,
        from_user_id: jwt.sub,
        to_user_id: recipientUserId,
        amount_usdc: amount,
        tx_type: "tip",
        event_id: eventId || null,
        status: "completed",
        metadata: { message: message || null },
      }, "return=minimal");

      try {
        await core.awardPoints(jwt.sub, jwt.platform, "tip_sent");
      } catch {}

      console.log(`[agents] ${jwt.sub} tipped ${recipientUserId} $${amount}`);

      return {
        ok: true,
        tip: { recipient: recipientUserId, amount, eventId },
        myBalance: balance - amount,
      };
    },
  );

  // ------------------------------------------------------------------
  // AGENTS: Get active event boosts (for feed ranking)
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/agents/boosts",
    async () => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { boosts: [] };

      const now = new Date().toISOString();
      const boosts = await sbFetch<any[]>(
        cfg,
        `flowb_event_boosts?active=eq.true&expires_at=gt.${now}&select=event_id,agent_name,user_id,amount_usdc,expires_at&order=created_at.desc`,
      );

      return { boosts: boosts || [] };
    },
  );

  // ------------------------------------------------------------------
  // AGENTS: Transaction history (public, for demo)
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/agents/transactions",
    async (request) => {
      const cfg = getSupabaseConfig();
      if (!cfg) return { transactions: [] };

      const query = request.query as any;
      const limit = Math.min(parseInt(query.limit) || 20, 50);

      const txs = await sbFetch<any[]>(
        cfg,
        `flowb_agent_transactions?select=id,from_user_id,to_user_id,amount_usdc,tx_type,skill_slug,event_id,status,created_at&order=created_at.desc&limit=${limit}`,
      );

      return { transactions: txs || [] };
    },
  );

  // ------------------------------------------------------------------
  // AGENTS: Award top points user (admin endpoint)
  // ------------------------------------------------------------------
  app.post<{ Body: { adminKey: string } }>(
    "/api/v1/agents/award-top-scorer",
    async (request, reply) => {
      const { adminKey } = request.body || {};
      if (adminKey !== process.env.FLOWB_ADMIN_KEY) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });

      // Get top scorer from points table
      const topUsers = await sbFetch<any[]>(
        cfg,
        `flowb_user_points?select=user_id,platform,total_points&order=total_points.desc&limit=1`,
      );

      if (!topUsers?.length) return reply.status(404).send({ error: "No users with points" });

      const topUser = topUsers[0];

      // Assign reserved slots 9 and 10 to top scorer
      for (const slot of [9, 10]) {
        await fetch(
          `${cfg.supabaseUrl}/rest/v1/flowb_agents?slot_number=eq.${slot}&status=eq.reserved`,
          {
            method: "PATCH",
            headers: {
              apikey: cfg.supabaseKey,
              Authorization: `Bearer ${cfg.supabaseKey}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({
              user_id: topUser.user_id,
              agent_name: slot === 9 ? `${topUser.user_id.replace(/^(telegram_|farcaster_)/, "")}'s Champion` : `${topUser.user_id.replace(/^(telegram_|farcaster_)/, "")}'s Gift`,
              status: "active",
              claimed_at: new Date().toISOString(),
              usdc_balance: slot === 9 ? 25 : 0.50, // $25 USDC prize for slot 9
              skills: ["basic-search", "event-discovery", "social-connector"],
              metadata: { awardedFor: "top_points", points: topUser.total_points },
              updated_at: new Date().toISOString(),
            }),
          },
        );
      }

      // Log prize transaction
      await sbPost(cfg, "flowb_agent_transactions", {
        to_user_id: topUser.user_id,
        amount_usdc: 25,
        tx_type: "prize",
        status: "completed",
        metadata: { reason: "Top points scorer - 2 agents + $25 USDC", points: topUser.total_points },
      }, "return=minimal");

      console.log(`[agents] Awarded slots 9+10 to top scorer: ${topUser.user_id} (${topUser.total_points} pts)`);

      return {
        ok: true,
        winner: { userId: topUser.user_id, points: topUser.total_points },
        awarded: { slots: [9, 10], usdcPrize: 25 },
      };
    },
  );

  // ------------------------------------------------------------------
  // AGENTS: Notification blast to all users (admin)
  // ------------------------------------------------------------------
  app.post<{ Body: { adminKey: string; message?: string } }>(
    "/api/v1/agents/blast",
    async (request, reply) => {
      const { adminKey, message } = request.body || {};
      if (adminKey !== process.env.FLOWB_ADMIN_KEY) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const cfg = getSupabaseConfig();
      if (!cfg) return reply.status(500).send({ error: "Not configured" });

      const blastMessage = message || `First Flow, First Bond

FlowB is giving away 8 personal AI agents at EthDenver!

Your agent gets a wallet, discovers events, earns USDC, and trades skills with other agents.

Top points scorer gets 2 agents + $25 USDC!

Claim yours in the app now. Only 8 slots available.`;

      // Get all users from sessions and points tables
      const sessions = await sbFetch<any[]>(cfg, `flowb_sessions?select=user_id`);
      const points = await sbFetch<any[]>(cfg, `flowb_user_points?select=user_id`);

      const allUserIds = new Set<string>();
      for (const s of sessions || []) allUserIds.add(s.user_id);
      for (const p of points || []) allUserIds.add(p.user_id);

      const botToken = process.env.FLOWB_TELEGRAM_BOT_TOKEN;
      let tgSent = 0;
      let fcSent = 0;
      let errors = 0;

      for (const userId of allUserIds) {
        try {
          if (userId.startsWith("telegram_") && botToken) {
            const chatId = parseInt(userId.replace("telegram_", ""), 10);
            if (!isNaN(chatId)) {
              const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: chatId, text: blastMessage, parse_mode: "HTML" }),
              });
              if (res.ok) tgSent++;
              else errors++;
            }
          }

          if (userId.startsWith("farcaster_")) {
            const fid = parseInt(userId.replace("farcaster_", ""), 10);
            if (!isNaN(fid)) {
              const { sendFarcasterNotification: sendFcNotif } = await import("../services/farcaster-notify.js");
              const appUrl = process.env.FLOWB_FC_APP_URL || "https://farcaster.xyz/miniapps/oCHuaUqL5dRT/flowb";
              const ok = await sendFcNotif(cfg, fid, "FlowB Agents — Claim Yours", blastMessage.slice(0, 120), appUrl);
              if (ok) fcSent++;
              else errors++;
            }
          }
        } catch {
          errors++;
        }
      }

      console.log(`[agents] Blast sent: TG=${tgSent}, FC=${fcSent}, errors=${errors}, total_users=${allUserIds.size}`);

      return {
        ok: true,
        sent: { telegram: tgSent, farcaster: fcSent, total: tgSent + fcSent },
        errors,
        totalUsers: allUserIds.size,
      };
    },
  );

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

      // 3. Award points for giving feedback
      if (userId) {
        fireAndForget(core.awardPoints(userId, platform, "feedback_submitted"), "award feedback points");
      }

      return { ok: true, id: row?.id || null };
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
