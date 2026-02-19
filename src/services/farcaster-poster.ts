/**
 * FlowB Farcaster Poster Service
 * Posts today's EthDenver events throughout the day with fun metrics.
 * Each time slot highlights events with a different vibe.
 */

const FLOWB_MINIAPP_URL = "https://farcaster.xyz/miniapps/oCHuaUqL5dRT/flowb";
const NEYNAR_API = "https://api.neynar.com/v2/farcaster";

// ============================================================================
// Types
// ============================================================================

interface EventData {
  title: string;
  startTime: string;
  locationName?: string;
  isFree?: boolean;
  category?: string;
  url?: string;
}

interface TimeSlot {
  id: string;
  label: string;
  hourStart: number;
  hourEnd: number;
  formatter: (events: EventData[]) => string;
}

// ============================================================================
// Fun time-based posting slots (MST)
// ============================================================================

const TIME_SLOTS: TimeSlot[] = [
  {
    id: "early_bird",
    label: "Early Bird",
    hourStart: 8,
    hourEnd: 8,
    formatter: (events) => {
      const count = events.length;
      const lines = [
        `Rise and build! ${count} events on the EthDenver schedule today.`,
        "",
        ...events.slice(0, 4).map((e) => {
          const time = fmtTime(e.startTime);
          return `${time} - ${e.title}${e.locationName ? ` @ ${e.locationName}` : ""}`;
        }),
        "",
        count > 4 ? `+ ${count - 4} more. Check the full lineup:` : "See the full lineup:",
      ];
      return lines.join("\n");
    },
  },
  {
    id: "morning_momentum",
    label: "Morning Momentum",
    hourStart: 10,
    hourEnd: 10,
    formatter: (events) => {
      const happening = events.filter((e) => {
        const h = getMSTHour(e.startTime);
        return h >= 9 && h <= 11;
      });
      if (!happening.length) return "";
      const lines = [
        `Happening NOW at EthDenver:`,
        "",
        ...happening.slice(0, 3).map((e) => `- ${e.title}${e.locationName ? ` @ ${e.locationName}` : ""}`),
        "",
        happening.length > 3 ? `${happening.length - 3} more going on right now` : "",
        "Don't just scroll, go!",
      ].filter(Boolean);
      return lines.join("\n");
    },
  },
  {
    id: "lunch_break",
    label: "Lunch Break",
    hourStart: 12,
    hourEnd: 12,
    formatter: (events) => {
      const afternoon = events.filter((e) => {
        const h = getMSTHour(e.startTime);
        return h >= 12 && h <= 15;
      });
      if (!afternoon.length) return "";
      const free = afternoon.filter((e) => e.isFree);
      const lines = [
        `Afternoon lineup at EthDenver (${afternoon.length} events):`,
        "",
        ...afternoon.slice(0, 4).map((e) => {
          const time = fmtTime(e.startTime);
          const tag = e.isFree ? " [FREE]" : "";
          return `${time} - ${e.title}${tag}`;
        }),
        "",
        free.length > 0 ? `${free.length} free events this afternoon` : "",
        "Plan your next move:",
      ].filter(Boolean);
      return lines.join("\n");
    },
  },
  {
    id: "afternoon_picks",
    label: "Afternoon Picks",
    hourStart: 15,
    hourEnd: 15,
    formatter: (events) => {
      const upcoming = events.filter((e) => {
        const h = getMSTHour(e.startTime);
        return h >= 15 && h <= 18;
      });
      if (!upcoming.length) return "";
      const lines = [
        `The afternoon wave at EthDenver:`,
        "",
        ...upcoming.slice(0, 3).map((e, i) => {
          const time = fmtTime(e.startTime);
          const medal = i === 0 ? "1." : i === 1 ? "2." : "3.";
          return `${medal} ${e.title} (${time})${e.locationName ? ` @ ${e.locationName}` : ""}`;
        }),
        "",
        "Which one are you hitting?",
      ];
      return lines.join("\n");
    },
  },
  {
    id: "evening_vibes",
    label: "Evening Vibes",
    hourStart: 17,
    hourEnd: 17,
    formatter: (events) => {
      const evening = events.filter((e) => {
        const h = getMSTHour(e.startTime);
        return h >= 17 && h <= 23;
      });
      if (!evening.length) return "";
      const lines = [
        `Tonight at EthDenver (${evening.length} events):`,
        "",
        ...evening.slice(0, 4).map((e) => {
          const time = fmtTime(e.startTime);
          return `${time} - ${e.title}${e.locationName ? ` @ ${e.locationName}` : ""}`;
        }),
        "",
        evening.length > 4 ? `+ ${evening.length - 4} more tonight` : "",
        "Where's the crew headed?",
      ].filter(Boolean);
      return lines.join("\n");
    },
  },
  {
    id: "night_owl",
    label: "Night Owl",
    hourStart: 20,
    hourEnd: 20,
    formatter: (events) => {
      const late = events.filter((e) => {
        const h = getMSTHour(e.startTime);
        return h >= 20 || h <= 2;
      });
      if (!late.length) return "";
      const lines = [
        `Still going? Late night EthDenver:`,
        "",
        ...late.slice(0, 3).map((e) => `- ${e.title}${e.locationName ? ` @ ${e.locationName}` : ""}`),
        "",
        "The real alpha is at the afterparties",
      ];
      return lines.join("\n");
    },
  },
];

// ============================================================================
// Helpers
// ============================================================================

function getMSTHour(isoDate: string): number {
  const d = new Date(isoDate);
  const mst = new Date(d.toLocaleString("en-US", { timeZone: "America/Denver" }));
  return mst.getHours();
}

function fmtTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Denver",
  });
}

function getTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  const mstStr = now.toLocaleString("en-US", { timeZone: "America/Denver", hour12: false });
  const [datePart] = mstStr.split(",");
  const [month, day, year] = datePart.trim().split("/").map(Number);

  const start = new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00-07:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function filterTodayEvents(events: EventData[]): EventData[] {
  const { start, end } = getTodayRange();
  return events.filter((e) => {
    const t = new Date(e.startTime).getTime();
    return t >= start.getTime() && t < end.getTime();
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

// ============================================================================
// Core: Publish Cast
// ============================================================================

async function publishCast(text: string, embeds?: { url: string }[]): Promise<boolean> {
  const signerUuid = process.env.NEYNAR_AGENT_TOKEN;
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!signerUuid || !apiKey) return false;

  try {
    const res = await fetch(`${NEYNAR_API}/cast`, {
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
      console.error(`[fc-poster] Cast failed: ${res.status} ${await res.text()}`);
      return false;
    }
    console.log(`[fc-poster] Cast published: ${text.slice(0, 60)}...`);
    return true;
  } catch (err) {
    console.error("[fc-poster] Cast error:", err);
    return false;
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Post a time-slot cast for today's EthDenver events.
 * Called from the scheduler - determines the right slot based on current MST hour.
 */
export async function postTimeSlotCast(allEvents: EventData[]): Promise<{ posted: boolean; slot?: string }> {
  const todayEvents = filterTodayEvents(allEvents);
  if (!todayEvents.length) {
    console.log("[fc-poster] No events for today, skipping");
    return { posted: false };
  }

  const now = new Date();
  const mstHour = parseInt(
    now.toLocaleString("en-US", { timeZone: "America/Denver", hour12: false, hour: "2-digit" }),
    10,
  );

  const slot = TIME_SLOTS.find((s) => mstHour >= s.hourStart && mstHour <= s.hourEnd);
  if (!slot) {
    return { posted: false };
  }

  const text = slot.formatter(todayEvents);
  if (!text) {
    console.log(`[fc-poster] Slot "${slot.id}" returned empty text, skipping`);
    return { posted: false };
  }

  const posted = await publishCast(text, [{ url: FLOWB_MINIAPP_URL }]);
  return { posted, slot: slot.id };
}

/** Post a single event highlight */
export async function postEventCard(event: {
  title: string;
  date?: string;
  venue?: string;
  isFree?: boolean;
}): Promise<boolean> {
  const lines = [
    event.title,
    event.date ? event.date : null,
    event.venue ? `@ ${event.venue}` : null,
    event.isFree ? "Free" : null,
    "",
    "Check it out on FlowB:",
  ].filter(Boolean);

  return publishCast(lines.join("\n"), [{ url: FLOWB_MINIAPP_URL }]);
}

/** Post daily morning digest */
export async function postDailyDigest(
  eventCount: number,
  topEvents: { title: string; time?: string }[],
): Promise<boolean> {
  const lines = [
    `Good morning EthDenver! ${eventCount} events today.`,
    "",
    ...topEvents.slice(0, 5).map((e, i) => `${i + 1}. ${e.title}${e.time ? ` (${e.time})` : ""}`),
    "",
    "Open FlowB to browse them all:",
  ];
  return publishCast(lines.join("\n"), [{ url: FLOWB_MINIAPP_URL }]);
}

/** Post evening highlights */
export async function postEveningHighlight(
  events: { title: string; venue?: string }[],
): Promise<boolean> {
  const lines = [
    "Tonight's picks at EthDenver:",
    "",
    ...events.slice(0, 3).map((e) => `- ${e.title}${e.venue ? ` @ ${e.venue}` : ""}`),
    "",
    "Who's going?",
  ];
  return publishCast(lines.join("\n"), [{ url: FLOWB_MINIAPP_URL }]);
}

/**
 * Process today's events from Supabase and post the appropriate time-slot cast.
 * Only posts EthDenver events happening today.
 */
export async function processEventQueue(supabaseUrl: string, supabaseKey: string): Promise<void> {
  try {
    const { start, end } = getTodayRange();

    // Fetch only today's events
    const res = await fetch(
      `${supabaseUrl}/rest/v1/flowb_events?starts_at=gte.${start.toISOString()}&starts_at=lt.${end.toISOString()}&order=starts_at.asc&limit=100`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      },
    );
    if (!res.ok) return;
    const events = await res.json();
    if (!events?.length) {
      console.log("[fc-poster] No events for today in DB");
      return;
    }

    const mapped: EventData[] = events.map((e: any) => ({
      title: e.title,
      startTime: e.starts_at,
      locationName: e.venue_name,
      isFree: e.is_free,
      category: e.category,
    }));

    const result = await postTimeSlotCast(mapped);
    if (result.posted) {
      console.log(`[fc-poster] Posted time-slot cast: ${result.slot}`);
    }
  } catch (err) {
    console.error("[fc-poster] Queue processing error:", err);
  }
}
