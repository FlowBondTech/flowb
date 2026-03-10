/**
 * AI Chat Service — Tool-augmented chat
 *
 * Gives FlowB's AI assistant real access to events, crews, friends,
 * locations, points, and the full platform via function calling.
 * Each tool maps to existing Supabase tables.
 *
 * Business tools (leads, meetings, settings, admin, billing) are in
 * chat-tools-biz.ts and wired into the executor switch below.
 */
import { sbFetch, sbPost, sbPatch, type SbConfig } from "../utils/supabase.js";
import { sendEmail, resolveUserEmail, wrapInTemplate, escHtml } from "./email.js";
import {
  createLead, listLeads, updateLead, getPipeline, getLeadTimeline,
  createMeeting, listMeetings, completeMeeting,
  getMySettings, updateMySettings, getCrewSettings, updateCrewSettings,
  adminCrewAction,
  listAutomations, createAutomation, toggleAutomation,
  getMyPlan,
  fetchUserBizContext,
  type BizUserContext,
} from "./chat-tools-biz.js";

// ─── Types ───────────────────────────────────────────────────────────

export interface UserContext {
  userId: string | null;
  platform: string | null;
  displayName: string | null;
}

export type Platform = "telegram" | "web" | "farcaster" | "openclaw";

export interface ChatConfig {
  sb: SbConfig;
  xaiKey: string;
  user: UserContext;
  model?: string;
  /** Platform hint for formatting. Defaults to "web". */
  platform?: Platform;
}

export interface ChatMessage {
  role: string;
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
}

// ─── Tool definitions (OpenAI function-calling format) ───────────────

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_events",
      description:
        "Search FlowB's event database for events, parties, meetups, hackathons, workshops, conferences. Supports city, date ranges, categories, free/paid, and keyword search. Use this for ANY question about events or what's happening.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Keyword search (title, description, organizer name)" },
          city: { type: "string", description: "City name (e.g. 'Austin', 'Denver', 'New York'). If omitted, uses user's current city." },
          from: { type: "string", description: "Start date YYYY-MM-DD (e.g. '2026-03-02')" },
          to: { type: "string", description: "End date YYYY-MM-DD (e.g. '2026-03-28')" },
          date: { type: "string", description: "Single day YYYY-MM-DD (shortcut instead of from+to)" },
          categories: { type: "string", description: "Comma-separated category slugs: defi, nft, ai, social, music, hackathon, workshop, networking, party, conference, meetup, gaming, dao, infrastructure, identity, privacy, payments, art, health, education, community" },
          free_only: { type: "boolean", description: "Only show free events" },
          event_type: { type: "string", description: "Event type filter: main_stage, side_event, party, workshop, hackathon, meetup, activation" },
          limit: { type: "number", description: "Max results (default 20, max 50)" },
          offset: { type: "number", description: "Pagination offset for 'show more' requests" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_available_cities",
      description:
        "Get a list of cities that have upcoming events, with event counts. Use when user asks 'what cities have events?', 'where can I find events?', or to help them pick a city.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_event_categories",
      description:
        "Get all event categories with counts of upcoming events. Use when user asks about types of events, what categories are available, or to help them filter.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "Optional city to get category counts for" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_event_summary",
      description:
        "Get a high-level summary of events for a city and date range — counts by day and by category. Use BEFORE search_events for broad queries like 'how many events this week?' or 'what's the scene like in Austin?'. Gives an overview without listing every event.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_event_details",
      description:
        "Get full details for a single event by ID — description, ticket link, venue, organizer, categories, attendee count. Use when user wants more info about a specific event.",
      parameters: {
        type: "object",
        properties: {
          event_id: { type: "string", description: "Event ID" },
        },
        required: ["event_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_trending_events",
      description:
        "Get the most popular upcoming events by RSVP count and shares. Use when user asks 'what's popular?', 'what's trending?', 'what should I go to?', or wants recommendations.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name (optional)" },
          limit: { type: "number", description: "Max results (default 10)" },
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
  {
    type: "function" as const,
    function: {
      name: "email_results",
      description:
        "Email the last search results to the user. Use when user says 'email me these', 'send to my email', 'email these results', etc. Requires a prior search_events or get_trending_events call in this conversation.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "Email address to send to (optional — uses user's email on file if not provided)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "share_results",
      description:
        "Create a shareable flowb.me/r/{code} link from the last search results. Use when user says 'share these', 'send me a link', 'create a shareable link', etc. Requires a prior search_events or get_trending_events call in this conversation.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Optional title for the shared results page" },
        },
      },
    },
  },
];

// ─── Business tool definitions ───────────────────────────────────────

const BIZ_TOOLS = [
  // Lead tools
  {
    type: "function" as const,
    function: {
      name: "create_lead",
      description: "Create a new business lead/contact. Use when user says 'met [name]', 'add lead', 'new contact'. Extracts name, company, email, phone, notes from natural language.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Person's name" },
          company: { type: "string", description: "Company or organization name" },
          email: { type: "string", description: "Email address" },
          phone: { type: "string", description: "Phone number" },
          notes: { type: "string", description: "Notes about the lead (context, interests, follow-up)" },
          tags: { type: "string", description: "Comma-separated tags" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_leads",
      description: "List the user's leads/contacts. Use when user says 'my leads', 'show leads', 'contacts'. Supports stage filtering and search.",
      parameters: {
        type: "object",
        properties: {
          stage: { type: "string", enum: ["new", "contacted", "qualified", "proposal", "won", "lost"], description: "Filter by pipeline stage" },
          search: { type: "string", description: "Search by name, company, or notes" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_lead",
      description: "Update a lead's stage, notes, or contact info. Use when user says 'move [name] to qualified', 'update [name]', 'add notes to [name]'.",
      parameters: {
        type: "object",
        properties: {
          name_query: { type: "string", description: "Lead name to search for (partial match)" },
          lead_id: { type: "string", description: "Lead ID (if known)" },
          new_stage: { type: "string", enum: ["new", "contacted", "qualified", "proposal", "won", "lost"], description: "New pipeline stage" },
          notes: { type: "string", description: "New or additional notes" },
          company: { type: "string", description: "Update company" },
          email: { type: "string", description: "Update email" },
          phone: { type: "string", description: "Update phone" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_pipeline",
      description: "Get pipeline summary with lead counts per stage. Use when user says 'pipeline', 'my pipeline', 'lead summary', 'how many leads'.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_lead_timeline",
      description: "Get full details and activity history for a specific lead. Use when user asks about a specific person or lead.",
      parameters: {
        type: "object",
        properties: {
          name_query: { type: "string", description: "Lead name to search for" },
          lead_id: { type: "string", description: "Lead ID (if known)" },
        },
      },
    },
  },
  // Meeting tools
  {
    type: "function" as const,
    function: {
      name: "create_meeting",
      description: "Schedule a meeting. Use when user says 'schedule coffee with [name]', 'meet with [name]', 'book a meeting'. Parses natural language for time, type, and attendees.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Meeting title or description" },
          attendee_name: { type: "string", description: "Name of the person to meet" },
          starts_at: { type: "string", description: "ISO date-time string for when the meeting starts" },
          duration: { type: "number", description: "Duration in minutes (default 30)" },
          type: { type: "string", enum: ["coffee", "call", "lunch", "workshop", "demo", "general"], description: "Meeting type" },
          location: { type: "string", description: "Meeting location or venue" },
          description: { type: "string", description: "Meeting description or agenda" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_meetings",
      description: "List meetings. Use when user says 'my meetings', 'upcoming meetings', 'meetings today'.",
      parameters: {
        type: "object",
        properties: {
          filter: { type: "string", enum: ["upcoming", "past", "today"], description: "Time filter (default upcoming)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "complete_meeting",
      description: "Mark a meeting as completed with optional notes and action items.",
      parameters: {
        type: "object",
        properties: {
          meeting_id: { type: "string", description: "Meeting ID" },
          notes: { type: "string", description: "Meeting notes or action items" },
        },
        required: ["meeting_id"],
      },
    },
  },
  // Settings tools
  {
    type: "function" as const,
    function: {
      name: "get_my_settings",
      description: "Get the user's FlowB settings (biz mode, DND, quiet hours, digest frequency). Use when user asks 'my settings', 'what are my settings'.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_my_settings",
      description: "Update a user setting. Use when user says 'turn on biz mode', 'set quiet hours', 'enable DND', 'change digest to weekly'.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "Setting key: biz_mode, dnd, quiet_hours_start, quiet_hours_end, notification_limit, digest" },
          value: { type: "string", description: "New value (on/off for booleans, time string for hours, frequency for digest)" },
        },
        required: ["key", "value"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_crew_settings",
      description: "View crew settings (sharing, notifications, privacy). Use when user asks 'crew settings', 'show settings for [crew]'.",
      parameters: {
        type: "object",
        properties: {
          crew_id: { type: "string", description: "Crew name or ID" },
        },
        required: ["crew_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_crew_settings",
      description: "Change a crew setting (admin-only). Use when user says 'turn on lead sharing for my crew', 'make crew private', 'enable notifications'.",
      parameters: {
        type: "object",
        properties: {
          crew_id: { type: "string", description: "Crew name or ID" },
          key: { type: "string", description: "Setting: share_leads, share_meetings, share_locations, is_public, join_mode, notify_lead_updates, etc." },
          value: { type: "string", description: "New value" },
        },
        required: ["crew_id", "key", "value"],
      },
    },
  },
  // Admin/Crew tools
  {
    type: "function" as const,
    function: {
      name: "admin_crew_action",
      description: "Perform an admin action on a crew member (promote, demote, remove, approve, deny join request). Requires admin role. Use when user says 'promote [name]', 'remove [name] from crew', 'approve [name]'.",
      parameters: {
        type: "object",
        properties: {
          crew_id: { type: "string", description: "Crew name or ID" },
          action: { type: "string", enum: ["promote", "demote", "remove", "approve", "deny"], description: "Admin action to perform" },
          target_name: { type: "string", description: "Name of the person to act on" },
        },
        required: ["crew_id", "action", "target_name"],
      },
    },
  },
  // Automation tools
  {
    type: "function" as const,
    function: {
      name: "list_automations",
      description: "List the user's automations. Use when user asks 'my automations', 'show automations'.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_automation",
      description: "Create a new automation rule (tier-gated). Use when user says 'automate [something]', 'create automation'.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Automation name" },
          trigger_type: { type: "string", description: "Trigger: checkin, rsvp, lead_stage_change, schedule, manual" },
          trigger_config: { type: "object", description: "Trigger configuration (event-specific)" },
          action_type: { type: "string", description: "Action: notification, email, webhook, lead_update" },
          action_config: { type: "object", description: "Action configuration" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "toggle_automation",
      description: "Enable or disable an automation by ID.",
      parameters: {
        type: "object",
        properties: {
          automation_id: { type: "string", description: "Automation ID" },
        },
        required: ["automation_id"],
      },
    },
  },
  // Billing tool
  {
    type: "function" as const,
    function: {
      name: "get_my_plan",
      description: "Get the user's current plan, tier, usage stats, and upgrade link. Use when user asks 'my plan', 'what plan am I on', 'usage', 'how many leads left'.",
      parameters: { type: "object", properties: {} },
    },
  },
];

// ─── Tool executors ──────────────────────────────────────────────────

interface SearchResult { text: string; events: any[]; context: any }

async function searchEvents(args: any, cfg: SbConfig, userCity?: string): Promise<SearchResult> {
  const limit = Math.min(args.limit || 20, 50);
  const offset = args.offset || 0;

  try {
    // Build PostgREST query against local flowb_events table
    let query = `flowb_events?hidden=eq.false&order=starts_at.asc&limit=${limit}&offset=${offset}`;

    // City filter — use arg, fall back to user's city
    const city = args.city || userCity;
    if (city) query += `&city=ilike.*${encodeURIComponent(city)}*`;

    // Date filters
    if (args.date) {
      query += `&starts_at=gte.${args.date}T00:00:00&starts_at=lte.${args.date}T23:59:59`;
    } else {
      if (args.from) {
        query += `&starts_at=gte.${encodeURIComponent(args.from)}T00:00:00`;
      } else {
        // Default: today and future only
        query += `&starts_at=gte.${new Date().toISOString().slice(0, 10)}T00:00:00`;
      }
      if (args.to) {
        query += `&starts_at=lte.${encodeURIComponent(args.to)}T23:59:59`;
      }
    }

    // Type filter
    if (args.event_type) query += `&event_type=eq.${encodeURIComponent(args.event_type)}`;

    // Free filter
    if (args.free_only) query += `&is_free=eq.true`;

    // Keyword search
    if (args.query) {
      const q = encodeURIComponent(args.query);
      query += `&or=(title.ilike.*${q}*,description.ilike.*${q}*,organizer_name.ilike.*${q}*)`;
    }

    let events = await sbFetch<any[]>(cfg, query) || [];

    // Category filter (post-query via join table)
    if (args.categories) {
      const catSlugs = args.categories.split(",").map((c: string) => c.trim().toLowerCase()).filter(Boolean);
      if (catSlugs.length) {
        const catRows = await sbFetch<any[]>(cfg, `flowb_event_categories?slug=in.(${catSlugs.join(",")})&select=id`);
        if (catRows?.length) {
          const catIds = catRows.map((c: any) => c.id);
          const mappings = await sbFetch<any[]>(cfg, `flowb_event_category_map?category_id=in.(${catIds.join(",")})&select=event_id`);
          if (mappings?.length) {
            const eventIds = new Set(mappings.map((m: any) => m.event_id));
            events = events.filter((e: any) => eventIds.has(e.id));
          } else {
            events = [];
          }
        }
      }
    }

    if (!events.length) {
      const hints: string[] = [];
      if (city) hints.push(`city "${city}"`);
      if (args.categories) hints.push(`categories "${args.categories}"`);
      if (args.from && args.to) hints.push(`${args.from} to ${args.to}`);
      return { text: `No events found${hints.length ? ` for ${hints.join(", ")}` : ""}. Try broadening your search (wider dates, different city, or fewer filters).`, events: [], context: {} };
    }

    const searchContext = { city, from: args.from, to: args.to, categories: args.categories, query: args.query, title: `${events.length} events${city ? ` in ${city}` : ""}` };

    // Group events by day for readability
    const dayMap = new Map<string, any[]>();
    for (const e of events) {
      const day = e.starts_at ? new Date(e.starts_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/Denver" }) : "TBD";
      if (!dayMap.has(day)) dayMap.set(day, []);
      dayMap.get(day)!.push(e);
    }

    // Count header
    let out = `Found ${events.length} event${events.length !== 1 ? "s" : ""}`;
    if (city) out += ` in ${city}`;
    if (args.from && args.to) out += ` (${args.from} to ${args.to})`;
    if (offset > 0) out += ` (page ${Math.floor(offset / limit) + 1})`;
    out += ":\n\n";

    for (const [day, dayEvents] of dayMap) {
      out += `**${day}**\n`;
      for (const e of dayEvents) {
        const time = e.starts_at ? new Date(e.starts_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Denver" }) : "";
        const venue = e.venue_name || "TBD";
        const org = e.organizer_name ? ` by ${e.organizer_name}` : "";
        const free = e.is_free ? " (FREE)" : e.price ? ` ($${e.price})` : "";
        const rsvp = e.rsvp_count ? ` (${e.rsvp_count} going)` : "";
        const url = e.ticket_url || (e.source === "luma" && e.source_event_id ? `https://lu.ma/${e.source_event_id}` : "");
        const title = url ? `[${e.title}](${url})` : e.title;
        out += `- **${title}**${org} | ${time} | ${venue}${free}${rsvp} <!-- ${e.id} -->\n`;
      }
      out += "\n";
    }

    if (events.length >= limit) {
      out += `_Showing ${limit} results. Ask "show more" for the next page._`;
    }

    return { text: out, events, context: searchContext };
  } catch (err: any) {
    console.error("[ai-chat] search_events error:", err.message);
    return { text: "Couldn't search events right now. Try again in a moment.", events: [], context: {} };
  }
}

async function getAvailableCities(cfg: SbConfig): Promise<string> {
  try {
    const now = new Date().toISOString().slice(0, 10);
    const rows = await sbFetch<any[]>(cfg, `flowb_events?hidden=eq.false&starts_at=gte.${now}T00:00:00&select=city`);
    if (!rows?.length) return "No upcoming events found in any city.";

    // Normalize city names (case-insensitive grouping, keep most common casing)
    const rawCounts = new Map<string, { display: string; count: number }>();
    for (const r of rows) {
      const c = (r.city || "Unknown").trim();
      const key = c.toLowerCase();
      const existing = rawCounts.get(key);
      if (existing) {
        existing.count++;
        // Keep the capitalized version as display name
        if (c[0] === c[0].toUpperCase() && existing.display[0] !== existing.display[0].toUpperCase()) {
          existing.display = c;
        }
      } else {
        rawCounts.set(key, { display: c, count: 1 });
      }
    }
    const counts = new Map<string, number>();
    for (const [, v] of rawCounts) {
      counts.set(v.display, v.count);
    }

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    let out = `**Cities with upcoming events** (${sorted.length} cities):\n`;
    for (const [city, count] of sorted.slice(0, 20)) {
      out += `- **${city}**: ${count} event${count !== 1 ? "s" : ""}\n`;
    }
    if (sorted.length > 20) out += `_...and ${sorted.length - 20} more cities_\n`;
    return out;
  } catch (err: any) {
    console.error("[ai-chat] get_available_cities error:", err.message);
    return "Couldn't fetch cities right now.";
  }
}

async function getEventCategories(args: any, cfg: SbConfig): Promise<string> {
  try {
    const cats = await sbFetch<any[]>(cfg, `flowb_event_categories?select=id,slug,name,icon&order=name.asc`);
    if (!cats?.length) return "No categories found.";

    // Get counts of upcoming events per category
    const now = new Date().toISOString().slice(0, 10);
    let eventQuery = `flowb_events?hidden=eq.false&starts_at=gte.${now}T00:00:00&select=id`;
    if (args.city) eventQuery += `&city=ilike.*${encodeURIComponent(args.city)}*`;
    const events = await sbFetch<any[]>(cfg, eventQuery) || [];
    const eventIds = new Set(events.map((e: any) => e.id));

    const mappings = await sbFetch<any[]>(cfg, `flowb_event_category_map?select=event_id,category_id`) || [];
    const catCounts = new Map<string, number>();
    for (const m of mappings) {
      if (eventIds.has(m.event_id)) {
        catCounts.set(m.category_id, (catCounts.get(m.category_id) || 0) + 1);
      }
    }

    let out = `**Event categories**${args.city ? ` in ${args.city}` : ""}:\n`;
    const sorted = cats.sort((a: any, b: any) => (catCounts.get(b.id) || 0) - (catCounts.get(a.id) || 0));
    for (const cat of sorted) {
      const count = catCounts.get(cat.id) || 0;
      if (count > 0) out += `- ${cat.icon || ""} **${cat.name}** (\`${cat.slug}\`): ${count} events\n`;
    }
    const zeroCats = sorted.filter((c: any) => !catCounts.get(c.id));
    if (zeroCats.length) {
      out += `\n_Categories with no upcoming events: ${zeroCats.map((c: any) => c.slug).join(", ")}_`;
    }
    return out;
  } catch (err: any) {
    console.error("[ai-chat] get_event_categories error:", err.message);
    return "Couldn't fetch categories right now.";
  }
}

async function getEventSummary(args: any, cfg: SbConfig, userCity?: string): Promise<string> {
  try {
    const city = args.city || userCity;
    const now = new Date().toISOString().slice(0, 10);
    const from = args.from || now;
    const to = args.to || new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);

    let query = `flowb_events?hidden=eq.false&starts_at=gte.${from}T00:00:00&starts_at=lte.${to}T23:59:59&select=id,starts_at,is_free,event_type,city`;
    if (city) query += `&city=ilike.*${encodeURIComponent(city)}*`;

    const events = await sbFetch<any[]>(cfg, query) || [];
    if (!events.length) return `No events found${city ? ` in ${city}` : ""} from ${from} to ${to}.`;

    // Count by day
    const dayMap = new Map<string, number>();
    const typeMap = new Map<string, number>();
    let freeCount = 0;
    for (const e of events) {
      const day = e.starts_at ? e.starts_at.slice(0, 10) : "unknown";
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
      if (e.event_type) typeMap.set(e.event_type, (typeMap.get(e.event_type) || 0) + 1);
      if (e.is_free) freeCount++;
    }

    // Count by category
    const eventIds = events.map((e: any) => e.id);
    const batchSize = 200;
    const catCounts = new Map<string, number>();
    for (let i = 0; i < eventIds.length; i += batchSize) {
      const batch = eventIds.slice(i, i + batchSize);
      const mappings = await sbFetch<any[]>(cfg, `flowb_event_category_map?event_id=in.(${batch.join(",")})&select=category_id`);
      for (const m of mappings || []) {
        catCounts.set(m.category_id, (catCounts.get(m.category_id) || 0) + 1);
      }
    }

    // Resolve category names
    const catIds = [...catCounts.keys()];
    let catNames = new Map<string, string>();
    if (catIds.length) {
      const cats = await sbFetch<any[]>(cfg, `flowb_event_categories?id=in.(${catIds.join(",")})&select=id,name`);
      catNames = new Map((cats || []).map((c: any) => [c.id, c.name]));
    }

    let out = `**Event Summary${city ? ` — ${city}` : ""}** (${from} to ${to})\n`;
    out += `Total: **${events.length}** events (${freeCount} free)\n\n`;

    out += `**By Day:**\n`;
    const sortedDays = [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    for (const [day, count] of sortedDays) {
      const dayLabel = new Date(day + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      out += `- ${dayLabel}: ${count} event${count !== 1 ? "s" : ""}\n`;
    }

    if (catCounts.size) {
      out += `\n**By Category:**\n`;
      const sortedCats = [...catCounts.entries()].sort((a, b) => b[1] - a[1]);
      for (const [catId, count] of sortedCats.slice(0, 10)) {
        out += `- ${catNames.get(catId) || catId}: ${count}\n`;
      }
    }

    if (typeMap.size) {
      out += `\n**By Type:**\n`;
      for (const [type, count] of [...typeMap.entries()].sort((a, b) => b[1] - a[1])) {
        out += `- ${type.replace(/_/g, " ")}: ${count}\n`;
      }
    }

    out += `\n_Use search_events for detailed listings._`;
    return out;
  } catch (err: any) {
    console.error("[ai-chat] get_event_summary error:", err.message);
    return "Couldn't generate summary right now.";
  }
}

async function getEventDetails(args: any, cfg: SbConfig): Promise<string> {
  if (!args.event_id) return "Which event would you like details for?";

  try {
    const events = await sbFetch<any[]>(cfg, `flowb_events?id=eq.${args.event_id}&limit=1`);
    if (!events?.length) return `Event not found (${args.event_id}).`;

    const e = events[0];

    // Get categories
    const mappings = await sbFetch<any[]>(cfg, `flowb_event_category_map?event_id=eq.${e.id}&select=category_id`);
    let categories: string[] = [];
    if (mappings?.length) {
      const catIds = mappings.map((m: any) => m.category_id);
      const cats = await sbFetch<any[]>(cfg, `flowb_event_categories?id=in.(${catIds.join(",")})&select=name`);
      categories = (cats || []).map((c: any) => c.name);
    }

    // Get RSVP count
    const attendance = await sbFetch<any[]>(cfg, `flowb_event_attendance?event_id=eq.${e.id}&select=status`);
    const goingCount = (attendance || []).filter((a: any) => a.status === "going").length;
    const maybeCount = (attendance || []).filter((a: any) => a.status === "maybe").length;

    let out = `**${e.title}**\n`;
    if (e.organizer_name) out += `by ${e.organizer_name}\n`;
    out += "\n";
    out += `**When:** ${fmtTime(e.starts_at)}`;
    if (e.ends_at) out += ` — ${fmtTime(e.ends_at)}`;
    out += "\n";
    out += `**Where:** ${e.venue_name || "TBD"}${e.city ? `, ${e.city}` : ""}\n`;
    if (e.is_free) out += `**Price:** FREE\n`;
    else if (e.price) out += `**Price:** $${e.price} ${e.price_currency || "USD"}\n`;
    if (categories.length) out += `**Categories:** ${categories.join(", ")}\n`;
    if (e.event_type) out += `**Type:** ${e.event_type.replace(/_/g, " ")}\n`;
    out += `**RSVPs:** ${goingCount} going, ${maybeCount} maybe\n`;
    if (e.description) {
      const desc = e.description.length > 500 ? e.description.slice(0, 500) + "..." : e.description;
      out += `\n${desc}\n`;
    }
    if (e.ticket_url) out += `\n**Tickets:** ${e.ticket_url}`;
    else if (e.source === "luma" && e.source_event_id) out += `\n**Link:** https://lu.ma/${e.source_event_id}`;

    return out;
  } catch (err: any) {
    console.error("[ai-chat] get_event_details error:", err.message);
    return "Couldn't fetch event details right now.";
  }
}

async function getTrendingEvents(args: any, cfg: SbConfig, userCity?: string): Promise<SearchResult> {
  const limit = Math.min(args.limit || 10, 20);
  const city = args.city || userCity;

  try {
    const now = new Date().toISOString().slice(0, 10);
    let query = `flowb_events?hidden=eq.false&starts_at=gte.${now}T00:00:00&order=rsvp_count.desc.nullslast,share_count.desc.nullslast&limit=${limit}`;
    if (city) query += `&city=ilike.*${encodeURIComponent(city)}*`;

    const events = await sbFetch<any[]>(cfg, query) || [];
    if (!events.length) return { text: `No trending events found${city ? ` in ${city}` : ""}.`, events: [], context: {} };

    let out = `**Trending Events${city ? ` in ${city}` : ""}** (by popularity):\n\n`;
    for (const e of events) {
      const time = fmtTime(e.starts_at);
      const venue = e.venue_name || "TBD";
      const rsvp = e.rsvp_count ? `${e.rsvp_count} going` : "";
      const shares = e.share_count ? `${e.share_count} shares` : "";
      const stats = [rsvp, shares].filter(Boolean).join(", ");
      const free = e.is_free ? " (FREE)" : "";
      const url = e.ticket_url || (e.source === "luma" && e.source_event_id ? `https://lu.ma/${e.source_event_id}` : "");
      const title = url ? `[${e.title}](${url})` : e.title;
      out += `- **${title}** | ${time} | ${venue}${free} <!-- ${e.id} -->\n`;
      if (stats) out += `  ${stats}\n`;
    }
    const trendContext = { city, title: `Trending events${city ? ` in ${city}` : ""}` };
    return { text: out, events, context: trendContext };
  } catch (err: any) {
    console.error("[ai-chat] get_trending_events error:", err.message);
    return { text: "Couldn't fetch trending events right now.", events: [], context: {} };
  }
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
    `flowb_sessions?display_name=ilike.*${q}*&select=user_id,display_name&limit=5`,
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
    const displayName = s.display_name || targetId;

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
      sbFetch<any[]>(cfg, `flowb_sessions?user_id=in.(${otherIds.join(",")})&select=user_id,display_name`),
    ]);

    const nameMap = new Map((sessions || []).map((s: any) => [s.user_id, s.display_name || s.user_id]));
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
  const sessions = await sbFetch<any[]>(cfg, `flowb_sessions?user_id=eq.${c.user_id}&select=display_name&limit=1`);
  const name = sessions?.[0]?.display_name || "Someone";
  return `${name} is at ${c.venue_name} (shared ${timeAgo(c.created_at)})${c.message ? ` — "${c.message}"` : ""}`;
}

async function rsvpEvent(args: any, user: UserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to RSVP.";
  if (!args.event_id) return "Which event would you like to RSVP to?";

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
    `flowb_sessions?user_id=in.(${userIds.join(",")})&select=user_id,display_name`,
  );
  const nameMap = new Map((sessions || []).map((s: any) => [s.user_id, s.display_name || "Someone"]));

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
      `flowb_sessions?user_id=in.(${memberIds.join(",")})&select=user_id,display_name`,
    );
    const names = (sessions || [])
      .map((s: any) => s.display_name || s.user_id)
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
    ? await sbFetch<any[]>(cfg, `flowb_sessions?user_id=in.(${userIds.join(",")})&select=user_id,display_name`)
    : [];
  const nameMap = new Map((sessions || []).map((s: any) => [s.user_id, s.display_name || "Someone"]));

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
      out += `- ${e.name}: ${e.count} RSVPs\n`;
    }
  }

  out += `\nTotal: ${userIds.length} active people at ${venues.size} venues`;
  return out;
}

// ─── Email/Share tool executors ──────────────────────────────────────

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
function genCode(len = 8): string {
  let code = "";
  for (let i = 0; i < len; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

async function emailResults(
  args: any,
  user: UserContext,
  cfg: SbConfig,
  capturedEvents: any[],
  capturedContext: any,
): Promise<string> {
  if (!user.userId) return "You need to be logged in to email results. Sign in first!";
  if (!capturedEvents.length) return "No search results to email. Search for events first, then ask me to email them.";

  const email = args.email || await resolveUserEmail(cfg, user.userId);
  if (!email) return "I don't have your email on file. Please provide one — e.g. \"email these to me@example.com\"";

  const eventsHtml = capturedEvents.map((e: any) => {
    const time = e.starts_at
      ? new Date(e.starts_at).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Denver" })
      : "TBD";
    const venue = e.venue_name || "TBD";
    const price = e.is_free ? "FREE" : e.price ? `$${e.price}` : "";
    const link = e.ticket_url || (e.source === "luma" && e.source_event_id ? `https://lu.ma/${e.source_event_id}` : "");
    const titleHtml = link
      ? `<a href="${escHtml(link)}" style="color:#6366f1;text-decoration:none;">${escHtml(e.title)}</a>`
      : escHtml(e.title);
    return `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #222;">${titleHtml}</td>
      <td style="padding:8px 0;border-bottom:1px solid #222;color:#888;">${escHtml(time)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #222;color:#888;">${escHtml(venue)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #222;color:#888;">${escHtml(price)}</td>
    </tr>`;
  }).join("");

  const title = capturedContext.title || `${capturedEvents.length} events`;
  const html = wrapInTemplate(
    `Your FlowB Events: ${title}`,
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
    subject: `FlowB Events: ${title}`,
    html,
    tags: [
      { name: "type", value: "chat_results" },
      { name: "user_id", value: user.userId },
    ],
  });

  if (!sent) return "Couldn't send the email right now. Try again in a moment.";
  return `Sent ${capturedEvents.length} events to ${email}! Check your inbox.`;
}

async function shareResults(
  args: any,
  user: UserContext,
  cfg: SbConfig,
  capturedEvents: any[],
  capturedContext: any,
): Promise<string> {
  if (!capturedEvents.length) return "No search results to share. Search for events first, then ask me to share them.";

  const code = genCode();
  const title = args.title || capturedContext.title || `${capturedEvents.length} events`;

  const row = await sbPost(cfg, "flowb_shared_results", {
    code,
    title,
    results: capturedEvents,
    query_context: capturedContext,
    sharer_user_id: user.userId || null,
    sharer_display_name: user.displayName || null,
  });

  if (!row) return "Couldn't create the share link right now. Try again.";
  return `Here's your shareable link:\n\n**https://flowb.me/r/${code}**\n\nAnyone with this link can see ${capturedEvents.length} events. The link expires in 30 days.`;
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

interface BizContext {
  tier: string;
  crewRoles: Array<{ name: string; role: string; id: string }>;
  usageSummary: string;
}

function buildSystemPrompt(user: UserContext, userCity?: string, biz?: BizContext, platform?: Platform): string {
  const now = new Date();
  const nowStr = now.toLocaleString("en-US", {
    timeZone: "America/Denver",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const today = now.toISOString().slice(0, 10);

  // Compute "this weekend" and "next week" for date reasoning
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
  const daysToSat = (6 - dayOfWeek + 7) % 7 || 7;
  const saturday = new Date(now.getTime() + daysToSat * 86400_000);
  const sunday = new Date(saturday.getTime() + 86400_000);
  const nextMonday = new Date(sunday.getTime() + 86400_000);
  const nextSunday = new Date(nextMonday.getTime() + 6 * 86400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  return `You are FlowB, your go-with-the-flow assistant for events, crews, and good vibes.

You help people stay in the flow -- find events anywhere, link up with friends & crew, manage crews, RSVP, share locations, and check points. You have access to a database of events across multiple cities from sources including Luma, EventBrite, Meetup, and community submissions.

EVENT SEARCH STRATEGY:
- For broad queries ("what's happening in Austin this month?"), call get_event_summary FIRST for an overview, then search_events for details.
- For specific queries ("AI workshops tomorrow"), call search_events directly with filters.
- For "what's popular?" or recommendations, call get_trending_events.
- For "what cities have events?", call get_available_cities.
- For "what types of events?", call get_event_categories.
- For details on a specific event, call get_event_details with the event ID.
- You can chain multiple tools: summary → search → details. Use multiple tool calls when needed.

CITY HANDLING:
- If the user specifies a city, use it.
- If no city is specified, ${userCity ? `use their current city: "${userCity}".` : "ask which city they're interested in."}
- For "near me" or "around here", ${userCity ? `use "${userCity}".` : "ask for their city."}

DATE REASONING:
- Today is ${today} (${nowStr.split(",")[0]}).
- "Today" = ${today}
- "Tomorrow" = ${fmt(new Date(now.getTime() + 86400_000))}
- "This weekend" = ${fmt(saturday)} to ${fmt(sunday)}
- "Next week" = ${fmt(nextMonday)} to ${fmt(nextSunday)}
- "This week" = ${today} to ${fmt(sunday)}
- Convert relative dates to YYYY-MM-DD format for tool calls.
- For "March 2nd to March 28th", use from="${today.slice(0, 5)}03-02" and to="${today.slice(0, 5)}03-28".

CATEGORIES:
Available category slugs for filtering: defi, nft, ai, social, music, hackathon, workshop, networking, party, conference, meetup, gaming, dao, infrastructure, identity, privacy, payments, art, health, education, community

GENERAL BEHAVIOR:
- Be friendly and helpful. Keep responses concise but informative.
- ALWAYS use tools to get real data — never fabricate events, locations, or people.
- Event names in listings are already linked to their source pages — NEVER show raw event IDs or UUIDs to users.
- Event IDs are embedded as hidden comments (<!-- uuid -->) in tool results. Use these internally for RSVP and detail lookups, but never display them.
- After actions (RSVP, check-in), mention points earned.
- When someone asks "what's happening?", "where is everyone?", or wants a vibe check, call get_activity_feed.
- When someone asks about their crews, call get_my_crews.
- When someone asks "where is [name]?", call find_person.
- When someone says "I'm at [place]", call update_my_location.
- When someone mentions a 4-char code, call lookup_location_code.
- If results are empty, suggest broadening the search (different city, wider dates, fewer filters).
- If you can't find something, suggest checking flowb.me.

FORMAT:
- Event titles are pre-linked in tool results — preserve the markdown links when presenting them.
- Use **bold** for section headers (days, categories).
- Use bullet lists for event listings.
- Group events by day when showing multi-day results.
- Include time, venue, and price info.
- Keep responses scannable and clean — no IDs, no UUIDs, no technical metadata.
- Show ALL events returned by the tool — do not truncate or summarize the list. If the tool returns 10 events, show all 10.
- If results say "Showing N results", tell the user they can ask for more.
- When users want to RSVP, just ask which event by name — you can find the ID from the hidden comments in the tool data.

SHARING & EMAIL:
- After showing event search results with 5+ events, briefly mention: "I can email these results or create a shareable link - just ask!"
- Only mention this ONCE per conversation, after the first substantial search.
- If user asks to email and isn't logged in, tell them to sign in first.
- If user asks to email and no email on file, ask them to provide one.
- When sharing, show the flowb.me/r/{code} link prominently.

LEADS & CRM:
- When someone says "met [name] at [place]" or "add lead [name]", call create_lead.
- When someone says "my leads", "show leads", or "contacts", call list_leads.
- When someone says "move [name] to qualified" or "update [name]", call update_lead.
- When someone says "pipeline" or "how many leads", call get_pipeline.
- For details on a specific lead, call get_lead_timeline.

MEETINGS:
- When someone says "schedule coffee with [name]" or "meet with [name]", call create_meeting.
- When someone says "my meetings" or "upcoming meetings", call list_meetings.
- Parse relative dates: "tomorrow 10am", "friday at 3pm", "next week".

SETTINGS:
- When someone asks "my settings" or "what are my settings", call get_my_settings.
- When someone says "turn on biz mode", "set quiet hours", "enable DND", call update_my_settings.
- When someone asks about crew settings or wants to change them, use get_crew_settings / update_crew_settings.

ADMIN ACTIONS:
- When someone wants to promote, demote, remove a crew member, or approve/deny join requests, call admin_crew_action.
- Always check user's role first — only admins/creators can perform these actions.

AUTOMATIONS:
- When someone asks about automations, call list_automations.
- When someone wants to create or toggle automations, use create_automation / toggle_automation.

BILLING:
- When someone asks "my plan", "what plan", "usage", call get_my_plan.
- If a user hits a tier limit, inform them of their usage and suggest upgrading.

${platform === "telegram" ? `PLATFORM FORMAT (Telegram):
- Keep responses under 2000 characters.
- Use markdown bold/italic (will be converted to HTML).
- Be concise and scannable.` : platform === "farcaster" ? `PLATFORM FORMAT (Farcaster):
- Keep responses under 1024 characters.
- Plain text, no markdown links.
- Use plain URLs only.` : `PLATFORM FORMAT (Web):
- Longer responses OK, full markdown supported.
- Include links and rich formatting.`}

Current time: ${nowStr} MST
${user.userId ? `User: ${user.displayName || user.userId} (${user.platform || "web"})` : "User: not logged in (limited features)"}
${userCity ? `User's city: ${userCity}` : ""}
${biz ? `\nUSER PLAN: ${biz.tier}${biz.usageSummary ? ` (usage: ${biz.usageSummary})` : ""}` : ""}
${biz?.crewRoles?.length ? `\nUSER CREW ROLES:\n${biz.crewRoles.map(c => `- ${c.name}: ${c.role}`).join("\n")}\n\nADMIN CAPABILITIES (for crews where you are admin/creator):\n- Change crew settings, promote/demote members, approve join requests, remove members` : ""}`;
}

// ─── Main chat handler ───────────────────────────────────────────────

const MAX_TOOL_ROUNDS = 5;

export async function handleChat(
  messages: ChatMessage[],
  config: ChatConfig,
): Promise<{ role: string; content: string }> {
  const { sb, xaiKey, user, model, platform } = config;

  // Fetch user's current city for context-aware search
  let userCity: string | undefined;
  let bizCtx: BizContext | undefined;
  if (user.userId) {
    try {
      const [sessions, bctx] = await Promise.all([
        sbFetch<any[]>(sb, `flowb_sessions?user_id=eq.${user.userId}&select=current_city,destination_city&limit=1`),
        fetchUserBizContext(sb, user.userId).catch(() => undefined),
      ]);
      const session = sessions?.[0];
      userCity = session?.current_city || session?.destination_city || undefined;
      bizCtx = bctx;
    } catch { /* non-critical */ }
  }

  // Always use server-side system prompt (has tools awareness + user context)
  const userMessages = messages.filter((m) => m.role !== "system").slice(-24);
  const chatMessages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(user, userCity, bizCtx, platform) },
    ...userMessages,
  ];

  // State tracking for email/share tools
  let capturedEvents: any[] = [];
  let capturedContext: any = {};

  // BizUserContext for biz tool executors
  const bizUser: BizUserContext = {
    userId: user.userId || "",
    platform: user.platform,
    displayName: user.displayName,
  };

  // Limit tools for unauthenticated users — public tools include event search + discovery
  const PUBLIC_TOOLS = ["search_events", "get_available_cities", "get_event_categories", "get_event_summary", "get_event_details", "get_trending_events", "lookup_location_code", "get_activity_feed", "share_results"];
  const allTools = [...TOOLS, ...BIZ_TOOLS];
  const tools = user.userId
    ? allTools
    : TOOLS.filter((t) => PUBLIC_TOOLS.includes(t.function.name));

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
        max_tokens: 2048,
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
          case "search_events": {
            const sr = await searchEvents(args, sb, userCity);
            result = sr.text;
            if (sr.events.length) { capturedEvents = sr.events; capturedContext = sr.context; }
            break;
          }
          case "get_available_cities":
            result = await getAvailableCities(sb);
            break;
          case "get_event_categories":
            result = await getEventCategories(args, sb);
            break;
          case "get_event_summary":
            result = await getEventSummary(args, sb, userCity);
            break;
          case "get_event_details":
            result = await getEventDetails(args, sb);
            break;
          case "get_trending_events": {
            const tr = await getTrendingEvents(args, sb, userCity);
            result = tr.text;
            if (tr.events.length) { capturedEvents = tr.events; capturedContext = tr.context; }
            break;
          }
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
          case "email_results":
            result = await emailResults(args, user, sb, capturedEvents, capturedContext);
            break;
          case "share_results":
            result = await shareResults(args, user, sb, capturedEvents, capturedContext);
            break;
          // ── Business tools (from chat-tools-biz.ts) ──
          case "create_lead":
            result = await createLead(args, bizUser, sb);
            break;
          case "list_leads":
            result = await listLeads(args, bizUser, sb);
            break;
          case "update_lead":
            result = await updateLead(args, bizUser, sb);
            break;
          case "get_pipeline":
            result = await getPipeline(args, bizUser, sb);
            break;
          case "get_lead_timeline":
            result = await getLeadTimeline(args, bizUser, sb);
            break;
          case "create_meeting":
            result = await createMeeting(args, bizUser, sb);
            break;
          case "list_meetings":
            result = await listMeetings(args, bizUser, sb);
            break;
          case "complete_meeting":
            result = await completeMeeting(args, bizUser, sb);
            break;
          case "get_my_settings":
            result = await getMySettings(args, bizUser, sb);
            break;
          case "update_my_settings":
            result = await updateMySettings(args, bizUser, sb);
            break;
          case "get_crew_settings":
            result = await getCrewSettings(args, bizUser, sb);
            break;
          case "update_crew_settings":
            result = await updateCrewSettings(args, bizUser, sb);
            break;
          case "admin_crew_action":
            result = await adminCrewAction(args, bizUser, sb);
            break;
          case "list_automations":
            result = await listAutomations(args, bizUser, sb);
            break;
          case "create_automation":
            result = await createAutomation(args, bizUser, sb);
            break;
          case "toggle_automation":
            result = await toggleAutomation(args, bizUser, sb);
            break;
          case "get_my_plan":
            result = await getMyPlan(args, bizUser, sb);
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
