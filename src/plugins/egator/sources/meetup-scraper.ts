/**
 * Meetup Scraper Adapter (Keyless)
 *
 * Scrapes public Meetup listing pages for events.
 * Uses JSON-LD structured data when available, falls back to HTML parsing.
 * No API key required - works purely from public HTML.
 *
 * URL pattern: meetup.com/find/?location={city}&source=EVENTS
 */

import type { EventQuery, EventResult, EventSourceAdapter } from "../../../core/types.js";
import {
  fetchHtml,
  parseJsonLd,
  jsonLdToEventResult,
  hashString,
} from "./parse-utils.js";

// Map city names to Meetup location strings
const CITY_LOCATIONS: Record<string, string> = {
  austin: "us--tx--Austin",
  denver: "us--co--Denver",
  "new york": "us--ny--New+York",
  nyc: "us--ny--New+York",
  "san francisco": "us--ca--San+Francisco",
  sf: "us--ca--San+Francisco",
  "los angeles": "us--ca--Los+Angeles",
  la: "us--ca--Los+Angeles",
  miami: "us--fl--Miami",
  chicago: "us--il--Chicago",
  seattle: "us--wa--Seattle",
  portland: "us--or--Portland",
  boston: "us--ma--Boston",
  atlanta: "us--ga--Atlanta",
};

export class MeetupScraperAdapter implements EventSourceAdapter {
  id = "meetup-scraper";
  name = "Meetup (scraper)";

  private cities: string[];

  constructor(cities: string[] = ["austin"]) {
    this.cities = cities;
  }

  async fetchEvents(params: EventQuery): Promise<EventResult[]> {
    const city = params.city?.toLowerCase() || this.cities[0] || "austin";
    const location = CITY_LOCATIONS[city];
    if (!location) {
      console.log(`[egator:meetup-scraper] No location for city: ${city}`);
      return [];
    }

    const allEvents: EventResult[] = [];

    try {
      // Build the Meetup find URL
      let url = `https://www.meetup.com/find/?location=${location}&source=EVENTS&eventType=inPerson`;
      if (params.category) {
        url += `&keywords=${encodeURIComponent(params.category)}`;
      }

      console.log(`[egator:meetup-scraper] Fetching ${url}`);
      const html = await fetchHtml(url);
      if (!html) return [];

      // Try JSON-LD first
      const jsonLdEvents = parseJsonLd(html);
      if (jsonLdEvents.length > 0) {
        console.log(`[egator:meetup-scraper] Found ${jsonLdEvents.length} JSON-LD events`);
        for (const ld of jsonLdEvents) {
          const event = jsonLdToEventResult(ld, url, "meetup", city);
          if (event) allEvents.push(event);
        }
      }

      // Extract event links from the page
      const eventUrls = extractMeetupLinks(html);
      console.log(`[egator:meetup-scraper] Found ${eventUrls.length} event links`);

      // Scrape individual event pages (limit to avoid rate limiting)
      const pagesToScrape = eventUrls.slice(0, 12);
      const results = await Promise.allSettled(
        pagesToScrape.map((eventUrl) => this.scrapeEventPage(eventUrl, city)),
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          allEvents.push(result.value);
        }
      }

      // Also try the "tech" category for city if no specific category
      if (!params.category) {
        const techUrl = `https://www.meetup.com/find/?location=${location}&source=EVENTS&keywords=tech`;
        const techHtml = await fetchHtml(techUrl);
        if (techHtml) {
          const techJsonLd = parseJsonLd(techHtml);
          for (const ld of techJsonLd) {
            const event = jsonLdToEventResult(ld, techUrl, "meetup", city);
            if (event) allEvents.push(event);
          }
          const techLinks = extractMeetupLinks(techHtml);
          const techPages = techLinks.slice(0, 8);
          const techResults = await Promise.allSettled(
            techPages.map((u) => this.scrapeEventPage(u, city)),
          );
          for (const r of techResults) {
            if (r.status === "fulfilled" && r.value) allEvents.push(r.value);
          }
        }
      }
    } catch (err: any) {
      console.error("[egator:meetup-scraper] Error:", err.message);
    }

    // Deduplicate by title
    const seen = new Set<string>();
    const deduped = allEvents.filter((e) => {
      const key = e.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`[egator:meetup-scraper] Returning ${deduped.length} events for ${city}`);
    return deduped;
  }

  private async scrapeEventPage(url: string, city: string): Promise<EventResult | null> {
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 500));

    const html = await fetchHtml(url, { retries: 1, timeoutMs: 10000 });
    if (!html) return null;

    // JSON-LD is the best source on Meetup event pages
    const jsonLdEvents = parseJsonLd(html);
    if (jsonLdEvents.length > 0) {
      const event = jsonLdToEventResult(jsonLdEvents[0], url, "meetup", city);
      if (event) {
        // Enrich with Meetup-specific data
        const rsvpCount = extractRsvpCount(html);
        if (rsvpCount) event.rsvpCount = rsvpCount;
        const groupName = extractGroupName(html);
        if (groupName) event.organizerName = groupName;
        return event;
      }
    }

    // Fallback: extract from meta tags
    return extractFromMetaTags(html, url, city);
  }
}

function extractMeetupLinks(html: string): string[] {
  const urls = new Set<string>();
  // Meetup event URLs: meetup.com/{group-name}/events/{event-id}
  const regex = /href=["'](https:\/\/www\.meetup\.com\/[^"']+\/events\/\d+[^"']*)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const url = match[1].split("?")[0];
    urls.add(url);
  }
  return [...urls];
}

function extractRsvpCount(html: string): number | undefined {
  // Look for attendee count patterns
  const match = html.match(/(\d+)\s*(?:attendees?|going|RSVPs?)/i);
  if (match) return parseInt(match[1], 10);
  return undefined;
}

function extractGroupName(html: string): string | undefined {
  // Look for group name in meta or specific Meetup markup
  const match = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']*)["']/i);
  if (match) return match[1];
  return undefined;
}

function extractFromMetaTags(html: string, url: string, city: string): EventResult | null {
  const title = extractMetaContent(html, "og:title");
  if (!title || title.length < 3) return null;

  const description = extractMetaContent(html, "og:description");
  const image = extractMetaContent(html, "og:image");

  // Try to get date from the page
  const dateMatch = html.match(/datetime=["']([^"']+)["']/i);
  const startTime = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();

  return {
    id: `meetup_${hashString(url)}`,
    title: title.replace(/\s*\|\s*Meetup.*$/i, "").trim(),
    description: description?.substring(0, 300),
    startTime,
    locationCity: city,
    source: "meetup",
    url,
    imageUrl: image || undefined,
    rsvpCount: extractRsvpCount(html),
    organizerName: extractGroupName(html),
  };
}

function extractMetaContent(html: string, property: string): string | null {
  const propMatch = html.match(
    new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`, "i"),
  );
  if (propMatch) return propMatch[1];

  const reverseMatch = html.match(
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`, "i"),
  );
  if (reverseMatch) return reverseMatch[1];

  return null;
}
