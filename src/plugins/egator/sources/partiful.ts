/**
 * Partiful Event Source Adapter (Keyless Scraper)
 *
 * Scrapes public Partiful Discover pages and individual event pages.
 * Uses __NEXT_DATA__ JSON extraction (primary) and JSON-LD (fallback).
 * No API key required - Partiful has no public API.
 *
 * Discover pages: partiful.com/discover/{city}
 * Event pages:    partiful.com/e/{eventId}
 *
 * Supported Discover cities (Partiful's full set):
 *   nyc, la, sf, boston, dc, chicago, london, miami, austin
 *
 * When no specific city is requested, scrapes ALL Discover cities
 * and filters results by focus topics (tech, wellness, community, etc.).
 */

import type { EventQuery, EventResult, EventSourceAdapter } from "../../../core/types.js";
import { fetchHtml, parseJsonLd, jsonLdToEventResult, hashString } from "./parse-utils.js";

// All Partiful Discover city slugs
const CITY_SLUGS: Record<string, string> = {
  "new york": "nyc",
  nyc: "nyc",
  "los angeles": "la",
  la: "la",
  "san francisco": "sf",
  sf: "sf",
  boston: "boston",
  "washington dc": "dc",
  dc: "dc",
  chicago: "chicago",
  london: "london",
  miami: "miami",
  austin: "austin",
};

// All unique slugs for worldwide scraping
const ALL_DISCOVER_SLUGS = ["nyc", "la", "sf", "boston", "dc", "chicago", "london", "miami", "austin"];

// Slug → display city name
const SLUG_TO_CITY: Record<string, string> = {
  nyc: "New York",
  la: "Los Angeles",
  sf: "San Francisco",
  boston: "Boston",
  dc: "Washington DC",
  chicago: "Chicago",
  london: "London",
  miami: "Miami",
  austin: "Austin",
};

// Focus topics — events matching these tags/keywords float up
const FOCUS_TAGS = new Set([
  "tech", "technology", "ai", "web3", "crypto", "blockchain", "hackathon",
  "wellness", "holistic", "meditation", "yoga", "breathwork", "sound bath",
  "healing", "mindfulness", "health", "fitness",
  "community", "networking", "meetup", "social", "creative",
  "art", "arts", "music", "culture", "film", "workshop", "class",
  "startup", "founder", "entrepreneur", "builder",
]);

function matchesFocus(event: EventResult): boolean {
  const text = `${event.title} ${event.description || ""} ${(event.tags || []).join(" ")}`.toLowerCase();
  for (const tag of FOCUS_TAGS) {
    if (text.includes(tag)) return true;
  }
  return false;
}

export class PartifulAdapter implements EventSourceAdapter {
  id = "partiful";
  name = "Partiful";

  private cities: string[];

  constructor(cities: string[] = []) {
    this.cities = cities;
  }

  async fetchEvents(params: EventQuery): Promise<EventResult[]> {
    const requestedCity = params.city?.toLowerCase().trim();

    // If a specific city was requested, scrape just that one
    if (requestedCity) {
      const slug = CITY_SLUGS[requestedCity];
      if (!slug) {
        console.log(`[egator:partiful] No Discover page for city: ${requestedCity}`);
        return [];
      }
      return this.scrapeDiscover(slug, requestedCity, params.limit);
    }

    // Worldwide mode: scrape all Discover cities in parallel
    const slugsToScrape = this.cities.length > 0
      ? this.cities.map((c) => CITY_SLUGS[c.toLowerCase()] || c).filter(Boolean)
      : ALL_DISCOVER_SLUGS;

    console.log(`[egator:partiful] Worldwide scrape: ${slugsToScrape.length} cities`);

    const results = await Promise.allSettled(
      slugsToScrape.map((slug) =>
        this.scrapeDiscover(slug, SLUG_TO_CITY[slug] || slug, undefined),
      ),
    );

    const allEvents: EventResult[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") allEvents.push(...r.value);
    }

    // Sort: focus-matching events first, then by start time
    allEvents.sort((a, b) => {
      const aFocus = matchesFocus(a) ? 0 : 1;
      const bFocus = matchesFocus(b) ? 0 : 1;
      if (aFocus !== bFocus) return aFocus - bFocus;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    // Deduplicate by normalized title
    const seen = new Set<string>();
    const deduped = allEvents.filter((e) => {
      const key = e.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`[egator:partiful] Worldwide total: ${deduped.length} events (${allEvents.length} before dedup)`);
    return params.limit ? deduped.slice(0, params.limit) : deduped;
  }

  private async scrapeDiscover(slug: string, city: string, limit?: number): Promise<EventResult[]> {
    try {
      const url = `https://partiful.com/discover/${slug}`;
      console.log(`[egator:partiful] Fetching ${url}`);

      const html = await fetchHtml(url, { timeoutMs: 15000, retries: 1 });
      if (!html) return [];

      // Primary: __NEXT_DATA__ (richest data)
      const nextDataEvents = extractNextDataEvents(html, city);
      if (nextDataEvents.length > 0) {
        console.log(`[egator:partiful] ${slug}: ${nextDataEvents.length} events via __NEXT_DATA__`);
        return limit ? nextDataEvents.slice(0, limit) : nextDataEvents;
      }

      // Fallback: JSON-LD
      const jsonLdEvents = parseJsonLd(html);
      if (jsonLdEvents.length > 0) {
        console.log(`[egator:partiful] ${slug}: ${jsonLdEvents.length} events via JSON-LD`);
        const results: EventResult[] = [];
        for (const ld of jsonLdEvents) {
          const event = jsonLdToEventResult(ld, url, "partiful", city);
          if (event) results.push(event);
        }
        return limit ? results.slice(0, limit) : results;
      }

      console.log(`[egator:partiful] ${slug}: no events found`);
      return [];
    } catch (err: any) {
      console.error(`[egator:partiful] ${slug} error:`, err.message);
      return [];
    }
  }
}

/**
 * Extract events from Partiful's __NEXT_DATA__ JSON blob.
 * The Discover page embeds a <script id="__NEXT_DATA__"> with event arrays
 * inside pageProps (commonly under trendingSection.items or similar).
 */
function extractNextDataEvents(html: string, city: string): EventResult[] {
  const match = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return [];

  let data: any;
  try {
    data = JSON.parse(match[1]);
  } catch {
    console.warn("[egator:partiful] Failed to parse __NEXT_DATA__");
    return [];
  }

  const pageProps = data?.props?.pageProps;
  if (!pageProps) return [];

  // Collect events from all known pageProps structures
  const rawEvents: any[] = [];

  // Discover page sections (trendingSection, sections array, events array)
  if (pageProps.trendingSection?.items) {
    rawEvents.push(...pageProps.trendingSection.items);
  }
  if (Array.isArray(pageProps.sections)) {
    for (const section of pageProps.sections) {
      if (section.items) rawEvents.push(...section.items);
      if (section.events) rawEvents.push(...section.events);
    }
  }
  if (Array.isArray(pageProps.events)) {
    rawEvents.push(...pageProps.events);
  }
  // Individual event page
  if (pageProps.event) {
    rawEvents.push(pageProps.event);
  }

  // Deduplicate by event id before mapping
  const seen = new Set<string>();
  const unique: any[] = [];
  for (const e of rawEvents) {
    const id = e.id || e._id || e.eventId;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push(e);
  }

  return unique.map((e) => mapPartifulEvent(e, city)).filter(Boolean) as EventResult[];
}

/**
 * Map a raw Partiful event object (from __NEXT_DATA__) to EventResult.
 */
function mapPartifulEvent(e: any, city: string): EventResult | null {
  const title = e.title || e.name;
  if (!title || title.length < 2) return null;

  const id = e.id || e._id || e.eventId || hashString(title);

  // Date/time
  const startTime = e.startDate || e.start || e.startAt;
  if (!startTime) return null;

  const endTime = e.endDate || e.end || e.endAt || undefined;

  // Location
  let locationName: string | undefined;
  let locationCity: string | undefined;
  const loc = e.locationInfo || e.location;
  if (loc) {
    if (typeof loc === "string") {
      locationName = loc;
    } else {
      locationName = loc.displayName || loc.name || loc.value || loc.mapsInfo?.name;
      const addrLines = loc.displayAddressLines || loc.mapsInfo?.addressLines;
      if (Array.isArray(addrLines) && addrLines.length > 0) {
        locationName = locationName || addrLines[0];
        // Try to extract city from address lines
        for (const line of addrLines) {
          const cityMatch = line.match(/,\s*([A-Za-z\s]+),?\s*[A-Z]{2}/);
          if (cityMatch) {
            locationCity = cityMatch[1].trim();
            break;
          }
        }
      }
    }
  }

  // Image
  let imageUrl: string | undefined;
  if (typeof e.image === "string") {
    imageUrl = e.image;
  } else if (e.image?.url) {
    imageUrl = e.image.url;
  } else if (e.coverImage?.url) {
    imageUrl = e.coverImage.url;
  }

  // Description
  const description = (e.description || e.descriptionPlainText || "").substring(0, 500) || undefined;

  // Guest/RSVP count
  const rsvpCount = e.goingGuestCount || e.interestedGuestCount || e.approvedGuestCount || e.guestCount || undefined;

  // Tags
  const tags: string[] = [];
  if (Array.isArray(e.tags)) {
    for (const t of e.tags) {
      if (typeof t === "string") tags.push(t);
      else if (t.label || t.title) tags.push(t.label || t.title);
    }
  }

  // Free detection
  const isFree = e.isFree ?? (e.cost === 0 || e.cost === "0" || e.price === 0) ?? undefined;

  return {
    id: `partiful_${id}`,
    sourceEventId: id,
    title,
    description,
    startTime: new Date(startTime).toISOString(),
    endTime: endTime ? new Date(endTime).toISOString() : undefined,
    locationName,
    locationCity: locationCity || city,
    isFree,
    isVirtual: e.isVirtual || e.virtual || false,
    source: "partiful",
    url: e.url || `https://partiful.com/e/${id}`,
    imageUrl,
    rsvpCount,
    tags: tags.length > 0 ? tags : undefined,
  };
}
