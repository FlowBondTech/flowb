/**
 * AI Chat Service — Tool-augmented chat using xAI Grok
 *
 * Gives FlowB's AI assistant real access to events, crews, friends,
 * locations, points, and the full platform via function calling.
 * Each tool maps to existing Supabase tables.
 */

// ─── Types ───────────────────────────────────────────────────────────

interface SbConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export interface UserContext {
  userId: string | null;
  platform: string | null;
  displayName: string | null;
}

export interface ChatConfig {
  sb: SbConfig;
  xaiKey: string;
  user: UserContext;
  model?: string;
}

export interface ChatMessage {
  role: string;
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
}

// ─── Supabase helpers (matches routes.ts patterns) ───────────────────

async function sbFetch<T>(cfg: SbConfig, path: string): Promise<T | null> {
  try {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${path}`, {
      headers: {
        apikey: cfg.supabaseKey,
        Authorization: `Bearer ${cfg.supabaseKey}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

async function sbPost(cfg: SbConfig, path: string, body: any): Promise<any> {
  try {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${path}`, {
      method: "POST",
      headers: {
        apikey: cfg.supabaseKey,
        Authorization: `Bearer ${cfg.supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const result = await res.json();
    return Array.isArray(result) ? result[0] : result;
  } catch {
    return null;
  }
}

// ─── Tool definitions (OpenAI function-calling format) ───────────────

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_events",
      description:
        "Search ETHDenver 2026 events by keyword, category, date, or venue. Use when user asks about events, parties, meetups, hackathons, or what's happening.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keyword (event name, topic, etc.)" },
          category: { type: "string", description: "Category slug: defi, nft, social, music, hackathon, workshop, networking" },
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
          free_only: { type: "boolean", description: "Only free events" },
          limit: { type: "number", description: "Max results (default 5)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_my_schedule",
      description: "Get the user's RSVP'd events and personal schedule.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "find_person",
      description:
        "Find a person by name and their current location. Use when someone asks 'where is [name]?' or just '[name]?'. Only works for friends or shared crew members.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Person's name or username" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "locate_my_crew",
      description:
        "Get all crew members' latest locations. Use when user asks 'where's my crew?' or 'where is everyone?'.",
      parameters: {
        type: "object",
        properties: {
          crew_name: { type: "string", description: "Specific crew name (optional — shows all crews if omitted)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_my_location",
      description:
        "Update the user's current location so friends/crew can find them. Use when user says 'I'm at [place]' or 'check me in at [place]'.",
      parameters: {
        type: "object",
        properties: {
          venue: { type: "string", description: "Venue or location name" },
          message: { type: "string", description: "Optional status message" },
        },
        required: ["venue"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "share_location_code",
      description:
        "Generate a short 4-character code a friend can use to find the user. Expires in 4 hours. Use when user wants to share their location with someone specific.",
      parameters: {
        type: "object",
        properties: {
          venue: { type: "string", description: "Where the user currently is" },
          message: { type: "string", description: "Optional note for the friend" },
        },
        required: ["venue"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "lookup_location_code",
      description:
        "Look up a location-sharing code to find where someone is. Use when user enters a 4-char code or says 'find code XYZ'.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "The 4-character location code" },
        },
        required: ["code"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "rsvp_event",
      description: "RSVP the user to an event (going or maybe).",
      parameters: {
        type: "object",
        properties: {
          event_id: { type: "string", description: "Event ID" },
          status: { type: "string", enum: ["going", "maybe"], description: "RSVP status (default going)" },
        },
        required: ["event_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_my_points",
      description: "Check the user's FlowB points, streak, level, and ranking.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "who_is_going",
      description: "See who (friends, crew) is attending a specific event.",
      parameters: {
        type: "object",
        properties: {
          event_id: { type: "string", description: "Event ID to check attendance" },
        },
        required: ["event_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_my_crews",
      description:
        "Get the user's crews with member lists and join codes. Use when user asks about their crews, crew info, crew members, or wants to invite someone.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_activity_feed",
      description:
        "Get a live global feed of recent activity — check-ins, RSVPs, trending venues, hot events. Use when user asks 'what's happening?', 'where is everyone?', 'what's popping?', 'any action?', or wants a vibe check.",
      parameters: {
        type: "object",
        properties: {
          scope: {
            type: "string",
            enum: ["global", "friends", "crew"],
            description: "Feed scope: global (all public), friends (friends only), crew (crew only). Default global.",
          },
          venue: { type: "string", description: "Filter to a specific venue name" },
        },
      },
    },
  },
];

// ─── Tool executors ──────────────────────────────────────────────────

async function searchEvents(args: any, cfg: SbConfig): Promise<string> {
  const limit = Math.min(args.limit || 5, 10);
  let path = `flowb_events?hidden=eq.false&order=starts_at.asc&limit=${limit}`;
  path += "&select=id,title,description,venue_name,starts_at,ends_at,is_free,url,source";

  if (args.query) {
    const q = encodeURIComponent(args.query);
    path += `&or=(title.ilike.*${q}*,description.ilike.*${q}*)`;
  }
  if (args.date) {
    path += `&starts_at=gte.${args.date}T00:00:00&starts_at=lte.${args.date}T23:59:59`;
  } else {
    path += `&starts_at=gte.${new Date().toISOString()}`;
  }
  if (args.free_only) path += "&is_free=eq.true";

  const events = await sbFetch<any[]>(cfg, path);
  if (!events?.length) return "No events found matching that search.";

  return events
    .map((e: any) => {
      const t = fmtTime(e.starts_at);
      return `- ${e.title} | ${t} | ${e.venue_name || "TBD"} ${e.is_free ? "(FREE)" : ""} [id:${e.id}]`;
    })
    .join("\n");
}

async function getMySchedule(user: UserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Not logged in.";
  const now = new Date().toISOString();
  const rows = await sbFetch<any[]>(
    cfg,
    `flowb_schedules?user_id=eq.${user.userId}&starts_at=gte.${now}&order=starts_at.asc&limit=20`,
  );
  if (!rows?.length) return "Schedule is empty — RSVP to some events!";
  return rows
    .map((s: any) => `- ${s.event_title} | ${fmtTime(s.starts_at)} | ${s.venue_name || "TBD"} (${s.rsvp_status})`)
    .join("\n");
}

async function findPerson(args: any, user: UserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to find people.";
  const name = (args.name || "").trim();
  if (!name) return "Who are you looking for?";

  const q = encodeURIComponent(name);
  const sessions = await sbFetch<any[]>(
    cfg,
    `flowb_sessions?or=(display_name.ilike.*${q}*,danz_username.ilike.*${q}*)&select=user_id,display_name,danz_username&limit=5`,
  );
  if (!sessions?.length) return `Couldn't find anyone named "${name}".`;

  // Get requester's friends list + crew memberships once
  const [friends, myCrews] = await Promise.all([
    sbFetch<any[]>(cfg, `flowb_connections?user_id=eq.${user.userId}&status=eq.active&select=friend_id`),
    sbFetch<any[]>(cfg, `flowb_group_members?user_id=eq.${user.userId}&select=group_id`),
  ]);
  const friendIds = new Set((friends || []).map((f: any) => f.friend_id));
  const myCrewIds = (myCrews || []).map((m: any) => m.group_id);

  const results: string[] = [];

  for (const s of sessions) {
    const targetId = s.user_id;
    if (targetId === user.userId) continue;
    const displayName = s.display_name || s.danz_username || targetId;

    // Check access: friend OR shared crew
    let hasAccess = friendIds.has(targetId);
    if (!hasAccess && myCrewIds.length) {
      const shared = await sbFetch<any[]>(
        cfg,
        `flowb_group_members?user_id=eq.${targetId}&group_id=in.(${myCrewIds.join(",")})&limit=1`,
      );
      hasAccess = !!shared?.length;
    }
    if (!hasAccess) continue;

    // Latest check-in (any type)
    const checkins = await sbFetch<any[]>(
      cfg,
      `flowb_checkins?user_id=eq.${targetId}&order=created_at.desc&limit=1`,
    );

    if (checkins?.length) {
      const c = checkins[0];
      const ago = timeAgo(c.created_at);
      const expired = c.expires_at && new Date(c.expires_at) < new Date();
      const verb = expired ? "was at" : "is at";
      results.push(`${displayName} ${verb} ${c.venue_name} (${ago})${c.message ? ` — "${c.message}"` : ""}`);
    } else {
      results.push(`${displayName} hasn't checked in yet.`);
    }
  }

  if (!results.length) return `Found "${name}" but they're not your friend or crewmate. Connect first!`;
  return results.join("\n");
}

async function locateCrewMembers(args: any, user: UserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to locate your crew.";

  const memberships = await sbFetch<any[]>(
    cfg,
    `flowb_group_members?user_id=eq.${user.userId}&select=group_id,flowb_groups(id,name,emoji)&order=joined_at.desc`,
  );
  if (!memberships?.length) return "You're not in any crews yet.";

  const out: string[] = [];

  for (const m of memberships) {
    const crew = m.flowb_groups;
    if (!crew) continue;
    if (args.crew_name && !crew.name.toLowerCase().includes(args.crew_name.toLowerCase())) continue;

    const members = await sbFetch<any[]>(cfg, `flowb_group_members?group_id=eq.${crew.id}&select=user_id`);
    const otherIds = (members || []).map((x: any) => x.user_id).filter((id: string) => id !== user.userId);
    if (!otherIds.length) {
      out.push(`${crew.emoji || ""} ${crew.name}: just you!`);
      continue;
    }

    // Batch: latest checkins + display names
    const [checkins, sessions] = await Promise.all([
      sbFetch<any[]>(cfg, `flowb_checkins?user_id=in.(${otherIds.join(",")})&order=created_at.desc`),
      sbFetch<any[]>(cfg, `flowb_sessions?user_id=in.(${otherIds.join(",")})&select=user_id,display_name,danz_username`),
    ]);

    const nameMap = new Map((sessions || []).map((s: any) => [s.user_id, s.display_name || s.danz_username || s.user_id]));
    const latest = new Map<string, any>();
    for (const c of checkins || []) {
      if (!latest.has(c.user_id)) latest.set(c.user_id, c);
    }

    const lines = otherIds.map((id: string) => {
      const n = nameMap.get(id) || id;
      const c = latest.get(id);
      if (!c) return `  ${n}: no check-in`;
      const ago = timeAgo(c.created_at);
      const expired = c.expires_at && new Date(c.expires_at) < new Date();
      return `  ${n}: ${expired ? "was at " : ""}${c.venue_name} (${ago})${c.message ? ` — "${c.message}"` : ""}`;
    });

    out.push(`${crew.emoji || ""} ${crew.name}:\n${lines.join("\n")}`);
  }

  return out.length ? out.join("\n\n") : "No crew activity found.";
}

async function updateMyLocation(args: any, user: UserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to update your location.";

  const expiresAt = new Date(Date.now() + 4 * 3600_000).toISOString();
  const checkin = await sbPost(cfg, "flowb_checkins", {
    user_id: user.userId,
    platform: user.platform || "web",
    crew_id: "__personal__",
    venue_name: args.venue,
    status: "here",
    message: args.message || null,
    expires_at: expiresAt,
  });

  if (!checkin) return "Failed to update location. Try again.";
  return `Location updated: ${args.venue}. Friends and crew can now find you here.${args.message ? ` Status: "${args.message}"` : ""}`;
}

async function shareLocationCode(args: any, user: UserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to share your location.";

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];

  const expiresAt = new Date(Date.now() + 4 * 3600_000).toISOString();
  const row = await sbPost(cfg, "flowb_checkins", {
    user_id: user.userId,
    platform: user.platform || "web",
    crew_id: `__share_${code}__`,
    venue_name: args.venue,
    status: "here",
    message: args.message || null,
    expires_at: expiresAt,
  });

  if (!row) return "Failed to generate code. Try again.";
  return `Your location code is: **${code}**\nShare it with a friend — they can enter it to find you at ${args.venue}. Expires in 4 hours.`;
}

async function lookupLocationCode(args: any, cfg: SbConfig): Promise<string> {
  const code = (args.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!code) return "Enter a location code.";

  const now = new Date().toISOString();
  const rows = await sbFetch<any[]>(
    cfg,
    `flowb_checkins?crew_id=eq.__share_${code}__&expires_at=gte.${now}&order=created_at.desc&limit=1`,
  );
  if (!rows?.length) return `Code "${code}" not found or expired.`;

  const c = rows[0];
  const sessions = await sbFetch<any[]>(cfg, `flowb_sessions?user_id=eq.${c.user_id}&select=display_name,danz_username&limit=1`);
  const name = sessions?.[0]?.display_name || sessions?.[0]?.danz_username || "Someone";
  return `${name} is at ${c.venue_name} (shared ${timeAgo(c.created_at)})${c.message ? ` — "${c.message}"` : ""}`;
}

async function rsvpEvent(args: any, user: UserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to RSVP.";
  if (!args.event_id) return "Which event? Give me an event ID or name.";

  const status = args.status || "going";
  const events = await sbFetch<any[]>(cfg, `flowb_events?id=eq.${args.event_id}&limit=1`);
  if (!events?.length) return `Event not found (${args.event_id}).`;
  const e = events[0];

  await Promise.all([
    sbPost(cfg, "flowb_event_attendance", {
      user_id: user.userId,
      event_id: args.event_id,
      event_name: e.title,
      event_date: e.starts_at,
      venue_name: e.venue_name,
      status,
      visibility: "friends",
    }),
    sbPost(cfg, "flowb_schedules", {
      user_id: user.userId,
      event_source_id: args.event_id,
      event_title: e.title,
      venue_name: e.venue_name,
      starts_at: e.starts_at,
      ends_at: e.ends_at,
      rsvp_status: status,
    }),
  ]);

  return `You're ${status} for **${e.title}**! +5 Flow points.`;
}

async function getMyPoints(user: UserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to see your points.";

  const rows = await sbFetch<any[]>(
    cfg,
    `flowb_user_points?user_id=eq.${user.userId}&select=total_points,current_streak,longest_streak,milestone_level&limit=1`,
  );
  if (!rows?.length) return "No points yet! Explore events and connect with people to earn.";

  const p = rows[0];
  const levels = ["Explorer", "Mover", "Groover", "Dancer", "Star", "Legend"];
  const level = levels[Math.min(p.milestone_level || 0, levels.length - 1)];
  return `Points: ${p.total_points || 0} | Level: ${level} | Streak: ${p.current_streak || 0} days (best: ${p.longest_streak || 0})`;
}

async function whoIsGoing(args: any, user: UserContext, cfg: SbConfig): Promise<string> {
  if (!args.event_id) return "Which event?";

  const attendance = await sbFetch<any[]>(
    cfg,
    `flowb_event_attendance?event_id=eq.${args.event_id}&select=user_id,status&limit=50`,
  );
  if (!attendance?.length) return "No RSVPs yet — be the first!";

  const userIds = attendance.map((a: any) => a.user_id);
  const sessions = await sbFetch<any[]>(
    cfg,
    `flowb_sessions?user_id=in.(${userIds.join(",")})&select=user_id,display_name,danz_username`,
  );
  const nameMap = new Map((sessions || []).map((s: any) => [s.user_id, s.display_name || s.danz_username || "Someone"]));

  let friendIds = new Set<string>();
  if (user.userId) {
    const conns = await sbFetch<any[]>(cfg, `flowb_connections?user_id=eq.${user.userId}&status=eq.active&select=friend_id`);
    friendIds = new Set((conns || []).map((c: any) => c.friend_id));
  }

  const going = attendance.filter((a: any) => a.status === "going");
  const maybe = attendance.filter((a: any) => a.status === "maybe");
  let out = `${going.length} going, ${maybe.length} maybe\n`;

  for (const a of going.slice(0, 10)) {
    const n = nameMap.get(a.user_id) || "Someone";
    out += `  - ${n}${friendIds.has(a.user_id) ? " (friend)" : ""}\n`;
  }
  if (going.length > 10) out += `  ... and ${going.length - 10} more\n`;
  return out;
}

async function getMyCrews(user: UserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to see your crews.";

  const memberships = await sbFetch<any[]>(
    cfg,
    `flowb_group_members?user_id=eq.${user.userId}&select=group_id,role,flowb_groups(id,name,emoji,join_code,created_by)&order=joined_at.desc`,
  );
  if (!memberships?.length) return "You're not in any crews yet. Create one or join with a code!";

  const out: string[] = [];
  for (const m of memberships) {
    const crew = m.flowb_groups;
    if (!crew) continue;

    const members = await sbFetch<any[]>(cfg, `flowb_group_members?group_id=eq.${crew.id}&select=user_id,role`);
    const memberCount = members?.length || 1;

    // Get member names
    const memberIds = (members || []).map((x: any) => x.user_id);
    const sessions = await sbFetch<any[]>(
      cfg,
      `flowb_sessions?user_id=in.(${memberIds.join(",")})&select=user_id,display_name,danz_username`,
    );
    const names = (sessions || [])
      .map((s: any) => s.display_name || s.danz_username || s.user_id)
      .slice(0, 10);

    const isOwner = crew.created_by === user.userId || m.role === "admin";
    out.push(
      `**${crew.emoji || ""} ${crew.name}** (${memberCount} members${isOwner ? ", you're admin" : ""})\n` +
      `  Members: ${names.join(", ")}${memberCount > 10 ? "..." : ""}\n` +
      `  Join code: ${crew.join_code || "none"}`,
    );
  }

  return out.join("\n\n");
}

async function getActivityFeed(args: any, user: UserContext, cfg: SbConfig): Promise<string> {
  const scope = args.scope || "global";
  const cutoff = new Date(Date.now() - 4 * 3600_000).toISOString(); // last 4 hours

  let checkins: any[] = [];

  if (scope === "friends" && user.userId) {
    // Friends' recent check-ins
    const conns = await sbFetch<any[]>(cfg, `flowb_connections?user_id=eq.${user.userId}&status=eq.active&select=friend_id`);
    const friendIds = (conns || []).map((c: any) => c.friend_id);
    if (!friendIds.length) return "No friends connected yet. Add some to see their activity!";
    checkins = await sbFetch<any[]>(
      cfg,
      `flowb_checkins?user_id=in.(${friendIds.join(",")})&created_at=gte.${cutoff}&crew_id=neq.__personal__&order=created_at.desc&limit=30`,
    ) || [];
  } else if (scope === "crew" && user.userId) {
    // Crew members' check-ins
    const memberships = await sbFetch<any[]>(cfg, `flowb_group_members?user_id=eq.${user.userId}&select=group_id`);
    const crewIds = (memberships || []).map((m: any) => m.group_id);
    if (!crewIds.length) return "You're not in any crews yet.";
    checkins = await sbFetch<any[]>(
      cfg,
      `flowb_checkins?crew_id=in.(${crewIds.join(",")})&created_at=gte.${cutoff}&order=created_at.desc&limit=40`,
    ) || [];
  } else {
    // Global: all recent non-personal, non-share check-ins
    checkins = await sbFetch<any[]>(
      cfg,
      `flowb_checkins?created_at=gte.${cutoff}&crew_id=not.like.__*&order=created_at.desc&limit=50`,
    ) || [];
  }

  // Filter by venue if specified
  if (args.venue) {
    const v = args.venue.toLowerCase();
    checkins = checkins.filter((c: any) => c.venue_name?.toLowerCase().includes(v));
  }

  if (!checkins.length) return scope === "global" ? "Pretty quiet right now. Be the first to check in!" : "No recent activity in this scope.";

  // Resolve display names
  const userIds = [...new Set(checkins.map((c: any) => c.user_id))] as string[];
  const sessions = userIds.length
    ? await sbFetch<any[]>(cfg, `flowb_sessions?user_id=in.(${userIds.join(",")})&select=user_id,display_name,danz_username`)
    : [];
  const nameMap = new Map((sessions || []).map((s: any) => [s.user_id, s.display_name || s.danz_username || "Someone"]));

  // Aggregate: count people per venue + recent names
  const venues = new Map<string, { count: number; names: string[]; latest: string }>();
  const seenUsers = new Set<string>();

  for (const c of checkins) {
    const venue = c.venue_name || "Unknown";
    const entry = venues.get(venue) || { count: 0, names: [] as string[], latest: c.created_at };
    if (!seenUsers.has(`${c.user_id}:${venue}`)) {
      entry.count++;
      if (entry.names.length < 3) entry.names.push(String(nameMap.get(c.user_id) || "Someone"));
      seenUsers.add(`${c.user_id}:${venue}`);
    }
    venues.set(venue, entry);
  }

  // Sort by count (most active first)
  const sorted = [...venues.entries()].sort((a, b) => b[1].count - a[1].count);

  // Recent individual check-ins (timeline)
  const timeline = checkins.slice(0, 8).map((c: any) => {
    const name = nameMap.get(c.user_id) || "Someone";
    const ago = timeAgo(c.created_at);
    return `  ${name} → ${c.venue_name} (${ago})${c.message ? ` "${c.message}"` : ""}`;
  });

  // Get trending events (most RSVPs in last 24h)
  const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
  const recentRsvps = await sbFetch<any[]>(
    cfg,
    `flowb_event_attendance?created_at=gte.${dayAgo}&select=event_id,event_name&order=created_at.desc&limit=50`,
  );

  const eventCounts = new Map<string, { name: string; count: number }>();
  for (const r of recentRsvps || []) {
    const e = eventCounts.get(r.event_id) || { name: r.event_name, count: 0 };
    e.count++;
    eventCounts.set(r.event_id, e);
  }
  const trendingEvents = [...eventCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3);

  // Build output
  let out = `**HOT VENUES** (last 4h):\n`;
  for (const [venue, data] of sorted.slice(0, 5)) {
    out += `- ${venue}: ${data.count} ${data.count === 1 ? "person" : "people"} (${data.names.join(", ")}${data.count > 3 ? "..." : ""})\n`;
  }

  out += `\n**RECENT ACTIVITY**:\n${timeline.join("\n")}\n`;

  if (trendingEvents.length) {
    out += `\n**TRENDING EVENTS** (most RSVPs today):\n`;
    for (const [id, e] of trendingEvents) {
      out += `- ${e.name}: ${e.count} RSVPs [id:${id}]\n`;
    }
  }

  out += `\nTotal: ${userIds.length} active people at ${venues.size} venues`;
  return out;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Denver",
  });
}

// ─── System prompt ───────────────────────────────────────────────────

function buildSystemPrompt(user: UserContext): string {
  const now = new Date().toLocaleString("en-US", {
    timeZone: "America/Denver",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return `You are FlowB, the ETHDenver 2026 crew coordinator AI (Feb 15–27 in Denver, CO).

You help people find events, locate friends & crew, manage crews, RSVP, share locations, and check points.

BEHAVIOR:
- Be brief and friendly. One concise message, no walls of text.
- ALWAYS use tools to get real data — never fabricate events or locations.
- When someone asks "what's happening?", "where is everyone?", "what's popping?", "any action?", or wants a vibe check, call get_activity_feed.
- When someone asks about their crews, call get_my_crews.
- When someone asks "where is [name]?" or just "[name]?", call find_person.
- When someone says "I'm at [place]", call update_my_location.
- When someone mentions a 4-char code, call lookup_location_code.
- When listing events, include the event ID so users can RSVP.
- After actions (RSVP, check-in), mention points earned.
- If you can't find something, suggest checking flowb.me.

FORMAT:
- Use **bold** for emphasis and event names.
- Use bullet lists with "- " for event listings.
- Keep responses scannable with clear sections.

Current time: ${now} MST
${user.userId ? `User: ${user.displayName || user.userId} (${user.platform || "web"})` : "User: not logged in (limited features)"}`;
}

// ─── Main chat handler ───────────────────────────────────────────────

const MAX_TOOL_ROUNDS = 5;

export async function handleChat(
  messages: ChatMessage[],
  config: ChatConfig,
): Promise<{ role: string; content: string }> {
  const { sb, xaiKey, user, model } = config;

  // Always use server-side system prompt (has tools awareness + user context)
  const userMessages = messages.filter((m) => m.role !== "system").slice(-24);
  const chatMessages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(user) },
    ...userMessages,
  ];

  // Limit tools for unauthenticated users
  const tools = user.userId
    ? TOOLS
    : TOOLS.filter((t) => ["search_events", "lookup_location_code", "get_activity_feed"].includes(t.function.name));

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${xaiKey}`,
      },
      body: JSON.stringify({
        model: model || "grok-3-mini-fast",
        messages: chatMessages,
        tools,
        tool_choice: "auto",
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[ai-chat] xAI error ${res.status}:`, errText);
      return { role: "assistant", content: "Having trouble connecting right now. Try again in a moment." };
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    if (!choice) {
      return { role: "assistant", content: "Something went wrong. Try again." };
    }

    const msg = choice.message;

    // No tool calls → return final answer
    if (!msg.tool_calls?.length) {
      return { role: "assistant", content: msg.content || "" };
    }

    // Execute tool calls
    chatMessages.push(msg);

    for (const tc of msg.tool_calls) {
      const fn = tc.function.name;
      const args = JSON.parse(tc.function.arguments || "{}");
      console.log(`[ai-chat] tool: ${fn}(${JSON.stringify(args)})`);

      let result: string;
      try {
        switch (fn) {
          case "search_events":
            result = await searchEvents(args, sb);
            break;
          case "get_my_schedule":
            result = await getMySchedule(user, sb);
            break;
          case "find_person":
            result = await findPerson(args, user, sb);
            break;
          case "locate_my_crew":
            result = await locateCrewMembers(args, user, sb);
            break;
          case "update_my_location":
            result = await updateMyLocation(args, user, sb);
            break;
          case "share_location_code":
            result = await shareLocationCode(args, user, sb);
            break;
          case "lookup_location_code":
            result = await lookupLocationCode(args, sb);
            break;
          case "rsvp_event":
            result = await rsvpEvent(args, user, sb);
            break;
          case "get_my_points":
            result = await getMyPoints(user, sb);
            break;
          case "who_is_going":
            result = await whoIsGoing(args, user, sb);
            break;
          case "get_my_crews":
            result = await getMyCrews(user, sb);
            break;
          case "get_activity_feed":
            result = await getActivityFeed(args, user, sb);
            break;
          default:
            result = `Unknown tool: ${fn}`;
        }
      } catch (err: any) {
        console.error(`[ai-chat] tool error (${fn}):`, err.message);
        result = `Error: ${err.message}`;
      }

      chatMessages.push({ role: "tool", tool_call_id: tc.id, content: result });
    }
  }

  return { role: "assistant", content: "Got a bit lost. Can you rephrase?" };
}
