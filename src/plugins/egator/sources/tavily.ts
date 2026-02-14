/**
 * Tavily Event Source Adapter
 *
 * Two-phase approach:
 *   1. Search: Find event page URLs on lu.ma, eventbrite, dice.fm, ra.co, etc.
 *   2. Extract: Scrape those pages for structured event data (title, date, venue, price)
 *
 * This turns Tavily into a universal event scraper that works across any event platform.
 */

import type { EventQuery, EventResult, EventSourceAdapter } from "../../../core/types.js";

const TAVILY_SEARCH = "https://api.tavily.com/search";
const TAVILY_EXTRACT = "https://api.tavily.com/extract";

const EVENT_DOMAINS = [
  "lu.ma", "eventbrite.com", "ra.co", "dice.fm",
  "partiful.com", "shotgun.live", "resident-advisor.net",
];

export class TavilyAdapter implements EventSourceAdapter {
  id = "tavily";
  name = "Tavily";

  constructor(private apiKey: string) {}

  async fetchEvents(params: EventQuery): Promise<EventResult[]> {
    try {
      // Phase 1: Search for event page URLs (multiple queries for better coverage)
      const urls = await this.searchEventUrls(params);
      if (!urls.length) {
        console.log("[egator:tavily] No event URLs found");
        return [];
      }
      console.log(`[egator:tavily] Found ${urls.length} event URLs`);

      // Phase 2: Extract structured content from event pages
      const events = await this.extractEvents(urls, params);
      console.log(`[egator:tavily] Parsed ${events.length} events from ${urls.length} pages`);
      return events;
    } catch (err: any) {
      console.error("[egator:tavily] Fetch error:", err.message);
      return [];
    }
  }

  // ==========================================================================
  // Phase 1: Search for event URLs
  // ==========================================================================

  private async searchEventUrls(params: EventQuery): Promise<string[]> {
    // Build multiple search queries for better coverage
    const queries = this.buildSearchQueries(params);
    const allUrls = new Set<string>();

    // Run searches in parallel
    const results = await Promise.allSettled(
      queries.map((query) => this.runSearch(query))
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        for (const url of result.value) allUrls.add(url);
      }
    }

    return [...allUrls].slice(0, 10); // Extract up to 10 pages
  }

  private buildSearchQueries(params: EventQuery): string[] {
    const queries: string[] = [];
    const city = params.city || "Denver";

    // Primary: category/style specific
    if (params.danceStyle || params.category) {
      const focus = params.danceStyle || params.category;
      queries.push(`${focus} events ${city} February 2026`);
    }

    // ETHDenver focus (always include for Denver)
    if (city.toLowerCase().includes("denver")) {
      queries.push("ETHDenver 2026 side event RSVP register");
      queries.push("ETHDenver Denver February 2026 party afterparty");
      queries.push("Denver crypto web3 event February 17 18 19 20 21 22 2026");
    }

    // General city events
    queries.push(`upcoming event ${city} February 2026 RSVP`);

    return queries;
  }

  private async runSearch(query: string): Promise<string[]> {
    console.log(`[egator:tavily] Search: "${query}"`);

    const res = await fetch(TAVILY_SEARCH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: this.apiKey,
        query,
        max_results: 10,
        search_depth: "basic",
        include_domains: EVENT_DOMAINS,
      }),
    });

    if (!res.ok) {
      console.error(`[egator:tavily] Search ${res.status}: ${await res.text()}`);
      return [];
    }

    const data = await res.json();
    const results = data.results || [];

    // Filter for actual event pages (not listing/index pages)
    const urls = results
      .map((r: any) => r.url as string)
      .filter((url: string) => isEventPage(url));

    console.log(`[egator:tavily] Search returned ${results.length} results, ${urls.length} event pages`);
    return urls;
  }

  // ==========================================================================
  // Phase 2: Extract structured event data from pages
  // ==========================================================================

  private async extractEvents(urls: string[], params: EventQuery): Promise<EventResult[]> {
    if (!urls.length) return [];

    const res = await fetch(TAVILY_EXTRACT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: this.apiKey,
        urls,
        extract_depth: "basic",
        format: "text",
        chunks_per_source: 3,
      }),
    });

    if (!res.ok) {
      console.error(`[egator:tavily] Extract ${res.status}: ${await res.text()}`);
      return [];
    }

    const data = await res.json();
    const results = data.results || [];

    const events: EventResult[] = [];

    for (const result of results) {
      const parsed = parseEventContent(result.raw_content, result.url, params);
      if (parsed) events.push(parsed);
    }

    return events;
  }
}

// ============================================================================
// URL filtering - identify individual event pages vs listing pages
// ============================================================================

function isEventPage(url: string): boolean {
  const u = url.toLowerCase();

  // lu.ma: Filter event pages from calendars/profiles
  if (u.includes("lu.ma/")) {
    if (u.includes("/explore") || u.includes("/discover") || u.includes("/user/")) return false;
    // lu.ma/event/XXX is always an event
    if (u.includes("lu.ma/event/")) return true;
    const slug = u.split("lu.ma/").pop()?.split("?")[0] || "";
    if (!slug || slug.length < 3) return false;
    // Multi-segment paths are usually not events
    if (slug.includes("/") && !slug.startsWith("event/")) return false;
    // Hyphenated slugs with 2+ words are almost always events
    if (slug.includes("-") && slug.length > 5) return true;
    // Underscored slugs are always org/calendar pages on lu.ma
    if (slug.includes("_")) return false;
    // Single-word slugs without hyphens: usually org/calendar pages
    // Only allow if slug looks like a random event ID (short, mixed alphanumeric)
    if (!slug.includes("-")) {
      // Random IDs like tmgr2qq2: 6-12 chars, mixed letters+numbers, no real words
      if (/^[a-z0-9]{6,12}$/i.test(slug) && /[0-9]/.test(slug) && /[a-z]/i.test(slug)) return true;
      return false;
    }
    return true;
  }

  // Eventbrite: eventbrite.com/e/
  if (u.includes("eventbrite.com/e/")) return true;

  // RA: ra.co/events/XXXXXX
  if (u.match(/ra\.co\/events\/\d+/)) return true;

  // Dice: dice.fm/event/
  if (u.includes("dice.fm/event/")) return true;

  // Partiful: partiful.com/e/
  if (u.includes("partiful.com/e/")) return true;

  // Shotgun: shotgun.live/events/
  if (u.includes("shotgun.live/events/")) return true;

  return false;
}

// ============================================================================
// Content parsing - extract event fields from page text
// ============================================================================

function parseEventContent(
  content: string | null,
  url: string,
  params: EventQuery,
): EventResult | null {
  if (!content || content.length < 50) return null;

  const title = extractTitle(content, url);
  if (!title) return null;

  const dateStr = extractDate(content);
  const venue = extractVenue(content);
  const price = extractPrice(content);

  return {
    id: `tavily_${hashString(url)}`,
    title,
    description: extractDescription(content),
    startTime: dateStr || new Date().toISOString(),
    locationName: venue?.name,
    locationCity: venue?.city || params.city,
    isFree: price === 0 || content.toLowerCase().includes("free"),
    price: price || undefined,
    isVirtual: content.toLowerCase().includes("online event") || content.toLowerCase().includes("virtual"),
    source: extractSource(url),
    url,
  };
}

function extractTitle(content: string, url: string): string | null {
  // For Eventbrite, URL slugs give the best titles
  if (url.includes("eventbrite.com/e/")) {
    const slug = extractSlugTitle(url);
    if (slug) return slug;
  }

  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);

  // Noise patterns to skip
  const skipPatterns = [
    /^cover image/i, /^avatar/i, /^hosted by/i, /^presented by/i,
    /^log\s*in/i, /^sign\s*up/i, /^share/i, /^menu$/i, /^home$/i,
    /^calendar$/i, /^events?\s*$/i, /^#\s*$/i, /^\d+\s*events?\s*$/i,
    /^we\s+(build|create|help)/i, /^your\s+web3/i, /^about/i, /^contact/i,
    /^you have \d+/i, /^pending/i, /^submit/i, /^create event/i,
    /^_eventbrite/i, /^eventbrite/i,
  ];

  // Strategy 1: Look for a line near a date mention (likely the event title)
  const datePattern = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i;
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    if (datePattern.test(lines[i])) {
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        const candidate = lines[j];
        if (isGoodTitle(candidate, skipPatterns)) {
          return cleanTitle(candidate);
        }
      }
    }
  }

  // Strategy 2: Find first meaningful line
  for (const line of lines) {
    if (isGoodTitle(line, skipPatterns)) {
      return cleanTitle(line);
    }
  }

  // Strategy 3: URL slug as last resort
  const slug = extractSlugTitle(url);
  if (slug) return slug;

  return null;
}

function isGoodTitle(line: string, skipPatterns: RegExp[]): boolean {
  if (line.length < 5 || line.length > 120) return false;
  if (skipPatterns.some((p) => p.test(line))) return false;
  // Skip lines that look like bios/descriptions (multiple sentences)
  if (line.length > 60 && (line.split(". ").length > 2 || line.split(", ").length > 3)) return false;
  // Skip lines that are just emojis or special chars
  if (/^[\W\s]+$/.test(line)) return false;
  return true;
}

function cleanTitle(line: string): string | null {
  let title = line
    .replace(/^#\s+/, "")
    .replace(/^Cover Image for\s+/i, "")
    .replace(/\s*[|–-]\s*(Eventbrite|Luma|Dice|Partiful|RA|Resident Advisor).*$/i, "")
    .replace(/^(Register|RSVP|Buy Tickets|Get Tickets)\s*[:\-]\s*/i, "")
    .trim();

  if (title.length > 120) title = title.substring(0, 120);
  if (title.length < 3) return null;
  if (/^(crypto|web3|blockchain|nft|defi)$/i.test(title)) return null;

  return title;
}

function extractSlugTitle(url: string): string | null {
  // lu.ma slugs: lu.ma/some-event-name (but not random IDs like lu.ma/t6xq3qd0)
  if (url.includes("lu.ma/")) {
    const slug = url.split("lu.ma/").pop()?.split("?")[0] || "";
    // Skip short hash-like slugs (e.g. "t6xq3qd0")
    if (slug.length > 8 && slug.includes("-")) {
      return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }
  // Eventbrite: eventbrite.com/e/event-name-tickets-XXXXXXX
  if (url.includes("eventbrite.com/e/")) {
    const slug = url.split("/e/").pop()?.split("?")[0] || "";
    const cleaned = slug.replace(/-tickets-\d+$/, "").replace(/-/g, " ");
    if (cleaned.length > 5) return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return null;
}

function extractDate(content: string): string | null {
  const text = content.substring(0, 2000); // Only search first portion

  // ISO format
  const isoMatch = text.match(/(\d{4}-\d{2}-\d{2}T[\d:]+(?:Z|[+-]\d{2}:\d{2})?)/);
  if (isoMatch) return new Date(isoMatch[1]).toISOString();

  // Full month name: "February 15, 2026" or "February 15 2026"
  const fullMonth = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i,
  );
  if (fullMonth) {
    const d = new Date(`${fullMonth[1]} ${fullMonth[2]}, ${fullMonth[3]}`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Abbreviated: "Feb 15, 2026"
  const abbrMonth = text.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i,
  );
  if (abbrMonth) {
    const d = new Date(`${abbrMonth[1]} ${abbrMonth[2]}, ${abbrMonth[3]}`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Month Day without year (assume current/next occurrence):
  // "February 15" / "Feb 15" / "Saturday, February 15"
  const noYear = text.match(
    /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)?,?\s*(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:st|nd|rd|th)?/i,
  );
  if (noYear) {
    const now = new Date();
    const d = new Date(`${noYear[1]} ${noYear[2]}, ${now.getFullYear()}`);
    if (!isNaN(d.getTime())) {
      // If date has passed, try next year
      if (d < now) d.setFullYear(d.getFullYear() + 1);
      return d.toISOString();
    }
  }

  return null;
}

function extractVenue(content: string): { name?: string; city?: string } | null {
  const text = content.substring(0, 3000);

  // Look for venue patterns: "at VENUE" or "Location: VENUE" or "Venue: VENUE"
  const venueMatch = text.match(
    /(?:(?:Location|Venue|Where|Address)\s*[:]\s*|(?:at|@)\s+)([^\n]{3,80})/i,
  );

  if (venueMatch) {
    const raw = venueMatch[1].trim();
    // Try to split venue name and city: "Club XYZ, Denver, CO"
    const parts = raw.split(",").map((p) => p.trim());
    return {
      name: parts[0],
      city: parts.length > 1 ? parts[1] : undefined,
    };
  }

  return null;
}

function extractPrice(content: string): number | null {
  const text = content.substring(0, 3000).toLowerCase();

  if (text.includes("free") && (text.includes("free event") || text.includes("free admission") || text.includes("free entry") || text.includes("price: free"))) {
    return 0;
  }

  // "$25" / "$25.00" / "US$25"
  const priceMatch = text.match(/(?:US)?\$(\d+(?:\.\d{2})?)/);
  if (priceMatch) return parseFloat(priceMatch[1]);

  return null;
}

function extractDescription(content: string): string | undefined {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  // Skip noise lines, find meaningful description lines
  const skipPatterns = [
    /^cover image/i, /^hosted by$/i, /^presented by$/i,
    /^log\s*in/i, /^sign\s*up/i, /^share/i, /^#/,
    /^menu$/i, /^home$/i, /^calendar$/i, /^events?$/i,
  ];
  const meaningful = lines.filter((l) =>
    l.length > 10 && !skipPatterns.some((p) => p.test(l))
  );
  // Skip the first one (likely title), take the next few
  const desc = meaningful.slice(1, 4).join(" ").substring(0, 300);
  return desc || undefined;
}

function extractSource(url: string): string {
  if (url.includes("lu.ma")) return "luma";
  if (url.includes("eventbrite.com")) return "eventbrite";
  if (url.includes("ra.co")) return "ra";
  if (url.includes("dice.fm")) return "dice";
  if (url.includes("partiful.com")) return "partiful";
  if (url.includes("shotgun.live")) return "shotgun";
  return "tavily";
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}
