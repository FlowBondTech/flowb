/**
 * Shared parsing utilities for eGator event source adapters.
 * Extracted from tavily.ts so all scrapers (Eventbrite, Meetup, SXSW, etc.)
 * can reuse the same battle-tested extraction logic.
 */

import type { EventQuery, EventResult } from "../../../core/types.js";

// ============================================================================
// HTML fetching with retry + rate limiting
// ============================================================================

const DEFAULT_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface FetchHtmlOpts {
  userAgent?: string;
  retries?: number;
  delayMs?: number;
  timeoutMs?: number;
}

export async function fetchHtml(url: string, opts: FetchHtmlOpts = {}): Promise<string | null> {
  const { userAgent = DEFAULT_UA, retries = 2, delayMs = 1000, timeoutMs = 15000 } = opts;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) await sleep(delayMs * attempt);

      const res = await fetch(url, {
        headers: {
          "User-Agent": userAgent,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "follow",
      });

      if (res.status === 429) {
        console.warn(`[parse-utils] Rate limited on ${url}, waiting...`);
        await sleep(delayMs * 3);
        continue;
      }

      if (!res.ok) {
        console.warn(`[parse-utils] HTTP ${res.status} fetching ${url}`);
        return null;
      }

      return await res.text();
    } catch (err: any) {
      if (attempt === retries) {
        console.error(`[parse-utils] Failed to fetch ${url} after ${retries + 1} attempts:`, err.message);
        return null;
      }
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================================================
// JSON-LD extraction from HTML
// ============================================================================

export interface JsonLdEvent {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: {
    name?: string;
    address?: {
      addressLocality?: string;
      streetAddress?: string;
    };
  } | string;
  image?: string | string[] | { url?: string };
  url?: string;
  offers?: {
    price?: number | string;
    priceCurrency?: string;
    url?: string;
    availability?: string;
  } | Array<{
    price?: number | string;
    priceCurrency?: string;
    url?: string;
  }>;
  organizer?: {
    name?: string;
    url?: string;
  } | string;
  eventAttendanceMode?: string;
  performer?: any;
}

/**
 * Extract JSON-LD Event objects from HTML.
 * Returns all found Event-type JSON-LD objects.
 */
export function parseJsonLd(html: string): JsonLdEvent[] {
  const events: JsonLdEvent[] = [];
  // Match <script type="application/ld+json">...</script>
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1].trim());

      if (Array.isArray(data)) {
        for (const item of data) {
          if (isEventType(item)) events.push(item);
        }
      } else if (data["@graph"] && Array.isArray(data["@graph"])) {
        for (const item of data["@graph"]) {
          if (isEventType(item)) events.push(item);
        }
      } else if (isEventType(data)) {
        events.push(data);
      }
    } catch {
      // Malformed JSON-LD, skip
    }
  }

  return events;
}

function isEventType(obj: any): boolean {
  if (!obj || typeof obj !== "object") return false;
  const type = obj["@type"];
  if (typeof type === "string") return type.toLowerCase().includes("event");
  if (Array.isArray(type)) return type.some((t: string) => t.toLowerCase().includes("event"));
  return false;
}

/**
 * Convert a JSON-LD event to an EventResult
 */
export function jsonLdToEventResult(ld: JsonLdEvent, sourceUrl: string, source: string, city?: string): EventResult | null {
  const title = ld.name?.trim();
  if (!title || title.length < 3) return null;

  let locationName: string | undefined;
  let locationCity: string | undefined;
  if (typeof ld.location === "object" && ld.location !== null) {
    locationName = ld.location.name;
    locationCity = ld.location.address?.addressLocality;
  }

  let imageUrl: string | undefined;
  if (typeof ld.image === "string") imageUrl = ld.image;
  else if (Array.isArray(ld.image)) imageUrl = ld.image[0];
  else if (ld.image && typeof ld.image === "object") imageUrl = ld.image.url;

  let price: number | undefined;
  let isFree: boolean | undefined;
  let ticketUrl: string | undefined;
  if (ld.offers) {
    const offer = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers;
    if (offer) {
      const p = Number(offer.price);
      if (!isNaN(p)) {
        price = p;
        isFree = p === 0;
      }
      ticketUrl = offer.url;
    }
  }

  let organizerName: string | undefined;
  if (typeof ld.organizer === "string") organizerName = ld.organizer;
  else if (ld.organizer && typeof ld.organizer === "object") organizerName = ld.organizer.name;

  const isVirtual = ld.eventAttendanceMode?.toLowerCase().includes("online") || false;

  return {
    id: `${source}_${hashString(sourceUrl)}`,
    title,
    description: ld.description?.substring(0, 300),
    startTime: ld.startDate || new Date().toISOString(),
    endTime: ld.endDate,
    locationName,
    locationCity: locationCity || city,
    isFree,
    price,
    isVirtual,
    ticketUrl,
    source,
    url: ld.url || sourceUrl,
    imageUrl,
    organizerName,
  };
}

// ============================================================================
// Content parsing - extract event fields from page text
// ============================================================================

export function parseEventContent(
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

// ============================================================================
// URL filtering - identify individual event pages vs listing pages
// ============================================================================

export function isEventPage(url: string): boolean {
  const u = url.toLowerCase();

  // lu.ma: Filter event pages from calendars/profiles
  if (u.includes("lu.ma/")) {
    if (u.includes("/explore") || u.includes("/discover") || u.includes("/user/")) return false;
    if (u.includes("lu.ma/event/")) return true;
    const slug = u.split("lu.ma/").pop()?.split("?")[0] || "";
    if (!slug || slug.length < 3) return false;
    if (slug.includes("/") && !slug.startsWith("event/")) return false;
    if (slug.includes("-") && slug.length > 5) return true;
    if (slug.includes("_")) return false;
    if (!slug.includes("-")) {
      if (/^[a-z0-9]{6,12}$/i.test(slug) && /[0-9]/.test(slug) && /[a-z]/i.test(slug)) return true;
      return false;
    }
    return true;
  }

  if (u.includes("eventbrite.com/e/")) return true;
  if (u.match(/ra\.co\/events\/\d+/)) return true;
  if (u.includes("dice.fm/event/")) return true;
  if (u.includes("partiful.com/e/")) return true;
  if (u.includes("shotgun.live/events/")) return true;

  return false;
}

// ============================================================================
// Field extractors
// ============================================================================

export function extractTitle(content: string, url: string): string | null {
  if (url.includes("eventbrite.com/e/")) {
    const slug = extractSlugTitle(url);
    if (slug) return slug;
  }

  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);

  const skipPatterns = [
    /^cover image/i, /^avatar/i, /^hosted by/i, /^presented by/i,
    /^log\s*in/i, /^sign\s*up/i, /^share/i, /^menu$/i, /^home$/i,
    /^calendar$/i, /^events?\s*$/i, /^#\s*$/i, /^\d+\s*events?\s*$/i,
    /^we\s+(build|create|help)/i, /^your\s+web3/i, /^about/i, /^contact/i,
    /^you have \d+/i, /^pending/i, /^submit/i, /^create event/i,
    /^_eventbrite/i, /^eventbrite/i,
  ];

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

  for (const line of lines) {
    if (isGoodTitle(line, skipPatterns)) {
      return cleanTitle(line);
    }
  }

  const slug = extractSlugTitle(url);
  if (slug) return slug;

  return null;
}

export function isGoodTitle(line: string, skipPatterns: RegExp[]): boolean {
  if (line.length < 5 || line.length > 120) return false;
  if (skipPatterns.some((p) => p.test(line))) return false;
  if (line.length > 60 && (line.split(". ").length > 2 || line.split(", ").length > 3)) return false;
  if (/^[\W\s]+$/.test(line)) return false;
  return true;
}

export function cleanTitle(line: string): string | null {
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

export function extractSlugTitle(url: string): string | null {
  if (url.includes("lu.ma/")) {
    const slug = url.split("lu.ma/").pop()?.split("?")[0] || "";
    if (slug.length > 8 && slug.includes("-")) {
      return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }
  if (url.includes("eventbrite.com/e/")) {
    const slug = url.split("/e/").pop()?.split("?")[0] || "";
    const cleaned = slug.replace(/-tickets-\d+$/, "").replace(/-/g, " ");
    if (cleaned.length > 5) return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return null;
}

export function extractDate(content: string): string | null {
  const text = content.substring(0, 2000);

  const isoMatch = text.match(/(\d{4}-\d{2}-\d{2}T[\d:]+(?:Z|[+-]\d{2}:\d{2})?)/);
  if (isoMatch) return new Date(isoMatch[1]).toISOString();

  const fullMonth = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i,
  );
  if (fullMonth) {
    const d = new Date(`${fullMonth[1]} ${fullMonth[2]}, ${fullMonth[3]}`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  const abbrMonth = text.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i,
  );
  if (abbrMonth) {
    const d = new Date(`${abbrMonth[1]} ${abbrMonth[2]}, ${abbrMonth[3]}`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  const noYear = text.match(
    /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)?,?\s*(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:st|nd|rd|th)?/i,
  );
  if (noYear) {
    const now = new Date();
    const d = new Date(`${noYear[1]} ${noYear[2]}, ${now.getFullYear()}`);
    if (!isNaN(d.getTime())) {
      if (d < now) d.setFullYear(d.getFullYear() + 1);
      return d.toISOString();
    }
  }

  return null;
}

export function extractVenue(content: string): { name?: string; city?: string } | null {
  const text = content.substring(0, 3000);

  const venueMatch = text.match(
    /(?:(?:Location|Venue|Where|Address)\s*[:]\s*|(?:at|@)\s+)([^\n]{3,80})/i,
  );

  if (venueMatch) {
    const raw = venueMatch[1].trim();
    const parts = raw.split(",").map((p) => p.trim());
    return {
      name: parts[0],
      city: parts.length > 1 ? parts[1] : undefined,
    };
  }

  return null;
}

export function extractPrice(content: string): number | null {
  const text = content.substring(0, 3000).toLowerCase();

  if (text.includes("free") && (text.includes("free event") || text.includes("free admission") || text.includes("free entry") || text.includes("price: free"))) {
    return 0;
  }

  const priceMatch = text.match(/(?:US)?\$(\d+(?:\.\d{2})?)/);
  if (priceMatch) return parseFloat(priceMatch[1]);

  return null;
}

export function extractDescription(content: string): string | undefined {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  const skipPatterns = [
    /^cover image/i, /^hosted by$/i, /^presented by$/i,
    /^log\s*in/i, /^sign\s*up/i, /^share/i, /^#/,
    /^menu$/i, /^home$/i, /^calendar$/i, /^events?$/i,
  ];
  const meaningful = lines.filter((l) =>
    l.length > 10 && !skipPatterns.some((p) => p.test(l))
  );
  const desc = meaningful.slice(1, 4).join(" ").substring(0, 300);
  return desc || undefined;
}

export function extractSource(url: string): string {
  if (url.includes("lu.ma")) return "luma";
  if (url.includes("eventbrite.com")) return "eventbrite";
  if (url.includes("ra.co")) return "ra";
  if (url.includes("dice.fm")) return "dice";
  if (url.includes("partiful.com")) return "partiful";
  if (url.includes("shotgun.live")) return "shotgun";
  if (url.includes("meetup.com")) return "meetup";
  if (url.includes("sxsw.com")) return "sxsw";
  return "web";
}

export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}
