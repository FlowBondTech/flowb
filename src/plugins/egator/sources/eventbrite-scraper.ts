/**
 * Eventbrite Scraper Adapter (Keyless)
 *
 * Scrapes public Eventbrite listing pages for events.
 * Uses JSON-LD structured data when available, falls back to HTML parsing.
 * No API key required - works purely from public HTML.
 *
 * URL pattern: eventbrite.com/d/{state}--{city}/events/
 */

import type { EventQuery, EventResult, EventSourceAdapter } from "../../../core/types.js";
import {
  fetchHtml,
  parseJsonLd,
  jsonLdToEventResult,
  hashString,
  extractDate,
  extractPrice,
} from "./parse-utils.js";

// Map city names to Eventbrite URL slugs
const CITY_SLUGS: Record<string, string> = {
  austin: "tx--austin",
  denver: "co--denver",
  "new york": "ny--new-york",
  nyc: "ny--new-york",
  "san francisco": "ca--san-francisco",
  sf: "ca--san-francisco",
  "los angeles": "ca--los-angeles",
  la: "ca--los-angeles",
  miami: "fl--miami",
  chicago: "il--chicago",
  seattle: "wa--seattle",
  portland: "or--portland",
  boston: "ma--boston",
  atlanta: "ga--atlanta",
};

export class EventbriteScraperAdapter implements EventSourceAdapter {
  id = "eventbrite-scraper";
  name = "Eventbrite (scraper)";

  private cities: string[];

  constructor(cities: string[] = ["austin"]) {
    this.cities = cities;
  }

  async fetchEvents(params: EventQuery): Promise<EventResult[]> {
    const city = params.city?.toLowerCase() || this.cities[0] || "austin";
    const slug = CITY_SLUGS[city];
    if (!slug) {
      console.log(`[egator:eventbrite-scraper] No slug for city: ${city}`);
      return [];
    }

    const allEvents: EventResult[] = [];

    try {
      // Scrape the main listing page
      const url = `https://www.eventbrite.com/d/${slug}/events/`;
      console.log(`[egator:eventbrite-scraper] Fetching ${url}`);
      const html = await fetchHtml(url);
      if (!html) return [];

      // Try JSON-LD first (Eventbrite embeds structured data)
      const jsonLdEvents = parseJsonLd(html);
      if (jsonLdEvents.length > 0) {
        console.log(`[egator:eventbrite-scraper] Found ${jsonLdEvents.length} JSON-LD events`);
        for (const ld of jsonLdEvents) {
          const event = jsonLdToEventResult(ld, url, "eventbrite", city);
          if (event) allEvents.push(event);
        }
      }

      // Also try to extract event links from HTML for individual page scraping
      const eventUrls = extractEventbriteLinks(html);
      console.log(`[egator:eventbrite-scraper] Found ${eventUrls.length} event links on listing page`);

      // Scrape individual event pages (limit to avoid rate limiting)
      const pagesToScrape = eventUrls.slice(0, 15);
      const results = await Promise.allSettled(
        pagesToScrape.map((eventUrl) => this.scrapeEventPage(eventUrl, city)),
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          allEvents.push(result.value);
        }
      }

      // Also try category-specific pages if params specify
      if (params.category) {
        const catUrl = `https://www.eventbrite.com/d/${slug}/${encodeURIComponent(params.category)}/`;
        const catHtml = await fetchHtml(catUrl);
        if (catHtml) {
          const catJsonLd = parseJsonLd(catHtml);
          for (const ld of catJsonLd) {
            const event = jsonLdToEventResult(ld, catUrl, "eventbrite", city);
            if (event) allEvents.push(event);
          }
        }
      }
    } catch (err: any) {
      console.error("[egator:eventbrite-scraper] Error:", err.message);
    }

    // Deduplicate by title
    const seen = new Set<string>();
    const deduped = allEvents.filter((e) => {
      const key = e.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`[egator:eventbrite-scraper] Returning ${deduped.length} events for ${city}`);
    return deduped;
  }

  private async scrapeEventPage(url: string, city: string): Promise<EventResult | null> {
    // Rate limit: small delay between requests
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 500));

    const html = await fetchHtml(url, { retries: 1, timeoutMs: 10000 });
    if (!html) return null;

    // Try JSON-LD (individual Eventbrite event pages almost always have this)
    const jsonLdEvents = parseJsonLd(html);
    if (jsonLdEvents.length > 0) {
      return jsonLdToEventResult(jsonLdEvents[0], url, "eventbrite", city);
    }

    // Fallback: extract from meta tags
    return extractFromMetaTags(html, url, city);
  }
}

function extractEventbriteLinks(html: string): string[] {
  const urls = new Set<string>();
  // Match eventbrite.com/e/ links
  const regex = /href=["'](https:\/\/www\.eventbrite\.com\/e\/[^"']+)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const url = match[1].split("?")[0]; // Strip query params
    urls.add(url);
  }
  return [...urls];
}

function extractFromMetaTags(html: string, url: string, city: string): EventResult | null {
  const title = extractMetaContent(html, "og:title") || extractMetaContent(html, "twitter:title");
  if (!title || title.length < 3) return null;

  const description = extractMetaContent(html, "og:description") || extractMetaContent(html, "description");
  const image = extractMetaContent(html, "og:image");
  const dateStr = extractDate(html);

  return {
    id: `eventbrite_${hashString(url)}`,
    title: title.replace(/\s*\|\s*Eventbrite.*$/i, "").trim(),
    description: description?.substring(0, 300),
    startTime: dateStr || new Date().toISOString(),
    locationCity: city,
    isFree: html.toLowerCase().includes('"free"') || html.toLowerCase().includes("free event"),
    price: extractPrice(html) || undefined,
    source: "eventbrite",
    url,
    imageUrl: image || undefined,
  };
}

function extractMetaContent(html: string, property: string): string | null {
  // Try property attribute
  const propMatch = html.match(
    new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`, "i"),
  );
  if (propMatch) return propMatch[1];

  // Try content before property
  const reverseMatch = html.match(
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`, "i"),
  );
  if (reverseMatch) return reverseMatch[1];

  return null;
}
