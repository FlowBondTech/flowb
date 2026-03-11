/**
 * SXSW Schedule Scraper Adapter (Keyless)
 *
 * Scrapes schedule.sxsw.com for SXSW-specific events.
 * Austin-specific but demonstrates the pattern for conference scrapers.
 * No API key required - works purely from public HTML.
 *
 * Can serve as a template for future conference scrapers
 * (ETHDenver, Consensus, Devconnect, etc.)
 */

import type { EventQuery, EventResult, EventSourceAdapter } from "../../../core/types.js";
import {
  fetchHtml,
  parseJsonLd,
  jsonLdToEventResult,
  hashString,
  extractDate,
} from "./parse-utils.js";

const SXSW_BASE = "https://schedule.sxsw.com";

export class SxswScraperAdapter implements EventSourceAdapter {
  id = "sxsw-scraper";
  name = "SXSW Schedule (scraper)";

  async fetchEvents(params: EventQuery): Promise<EventResult[]> {
    const allEvents: EventResult[] = [];

    try {
      // Scrape the main schedule page
      const year = new Date().getFullYear();
      const url = `${SXSW_BASE}/${year}`;
      console.log(`[egator:sxsw-scraper] Fetching ${url}`);
      const html = await fetchHtml(url);
      if (!html) {
        console.log("[egator:sxsw-scraper] No HTML returned from schedule page");
        return [];
      }

      // Try JSON-LD
      const jsonLdEvents = parseJsonLd(html);
      if (jsonLdEvents.length > 0) {
        console.log(`[egator:sxsw-scraper] Found ${jsonLdEvents.length} JSON-LD events`);
        for (const ld of jsonLdEvents) {
          const event = jsonLdToEventResult(ld, url, "sxsw", "Austin");
          if (event) allEvents.push(event);
        }
      }

      // Extract event links from the schedule page
      const eventUrls = extractSxswLinks(html, year);
      console.log(`[egator:sxsw-scraper] Found ${eventUrls.length} event links`);

      // Scrape individual event pages (limit to avoid rate limiting)
      const pagesToScrape = eventUrls.slice(0, 20);
      const results = await Promise.allSettled(
        pagesToScrape.map((eventUrl) => this.scrapeEventPage(eventUrl)),
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          allEvents.push(result.value);
        }
      }

      // Also try category-specific pages
      const categories = params.category
        ? [params.category]
        : ["interactive", "music", "film"];

      for (const cat of categories) {
        const catUrl = `${SXSW_BASE}/${year}?categories=${encodeURIComponent(cat)}`;
        const catHtml = await fetchHtml(catUrl);
        if (!catHtml) continue;

        const catLinks = extractSxswLinks(catHtml, year);
        const catPages = catLinks.slice(0, 10);
        const catResults = await Promise.allSettled(
          catPages.map((u) => this.scrapeEventPage(u)),
        );
        for (const r of catResults) {
          if (r.status === "fulfilled" && r.value) allEvents.push(r.value);
        }
      }
    } catch (err: any) {
      console.error("[egator:sxsw-scraper] Error:", err.message);
    }

    // Deduplicate
    const seen = new Set<string>();
    const deduped = allEvents.filter((e) => {
      const key = e.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`[egator:sxsw-scraper] Returning ${deduped.length} events`);
    return deduped;
  }

  private async scrapeEventPage(url: string): Promise<EventResult | null> {
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 400));

    const html = await fetchHtml(url, { retries: 1, timeoutMs: 10000 });
    if (!html) return null;

    // Try JSON-LD
    const jsonLdEvents = parseJsonLd(html);
    if (jsonLdEvents.length > 0) {
      return jsonLdToEventResult(jsonLdEvents[0], url, "sxsw", "Austin");
    }

    // Fallback: extract from meta tags and page structure
    return extractFromSxswPage(html, url);
  }
}

function extractSxswLinks(html: string, year: number): string[] {
  const urls = new Set<string>();
  // SXSW schedule links: schedule.sxsw.com/YEAR/events/XXXXX
  const regex = new RegExp(
    `href=["']((?:https?://schedule\\.sxsw\\.com)?/${year}/events/[^"']+)["']`,
    "gi",
  );
  let match;
  while ((match = regex.exec(html)) !== null) {
    let url = match[1];
    if (url.startsWith("/")) url = `${SXSW_BASE}${url}`;
    urls.add(url.split("?")[0]);
  }
  return [...urls];
}

function extractFromSxswPage(html: string, url: string): EventResult | null {
  const title = extractMetaContent(html, "og:title") || extractTitleTag(html);
  if (!title || title.length < 3) return null;

  const cleanedTitle = title
    .replace(/\s*[-|]\s*SXSW.*$/i, "")
    .replace(/\s*[-|]\s*Schedule.*$/i, "")
    .trim();

  const description = extractMetaContent(html, "og:description");
  const image = extractMetaContent(html, "og:image");
  const dateStr = extractDate(html);

  // Try to extract venue from page content
  const venueMatch = html.match(/(?:venue|location)[^>]*>([^<]{3,80})/i);
  const venueName = venueMatch ? venueMatch[1].trim() : undefined;

  // Check for category/track info
  const trackMatch = html.match(/(?:track|category)[^>]*>([^<]{3,40})/i);
  const tags = trackMatch ? [trackMatch[1].trim()] : undefined;

  return {
    id: `sxsw_${hashString(url)}`,
    title: cleanedTitle,
    description: description?.substring(0, 300),
    startTime: dateStr || new Date().toISOString(),
    locationName: venueName,
    locationCity: "Austin",
    source: "sxsw",
    url,
    imageUrl: image || undefined,
    tags,
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

function extractTitleTag(html: string): string | null {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
}
