/**
 * DuckDuckGo Event Source Adapter (replaces Tavily - no API key needed)
 *
 * Two-phase approach:
 *   1. Search: DuckDuckGo HTML search with site: filters to find event page URLs
 *   2. Extract: Direct fetch + JSON-LD / text parsing for structured event data
 *
 * Universal event scraper that works across any event platform, completely free.
 */

import type { EventQuery, EventResult, EventSourceAdapter } from "../../../core/types.js";
import {
  isEventPage,
  parseEventContent,
  extractSource,
  hashString,
  fetchHtml,
  fetchOgImage,
  parseJsonLd,
  jsonLdToEventResult,
} from "./parse-utils.js";

const DDG_HTML = "https://html.duckduckgo.com/html/";

const EVENT_DOMAINS = [
  "lu.ma", "eventbrite.com", "ra.co", "dice.fm",
  "partiful.com", "shotgun.live", "resident-advisor.net",
];

export class TavilyAdapter implements EventSourceAdapter {
  id = "ddg";
  name = "DuckDuckGo Events";

  // apiKey kept for interface compat but unused
  constructor(private apiKey?: string) {}

  async fetchEvents(params: EventQuery): Promise<EventResult[]> {
    try {
      // Phase 1: Search for event page URLs
      const urls = await this.searchEventUrls(params);
      if (!urls.length) {
        console.log("[egator:ddg] No event URLs found");
        return [];
      }
      console.log(`[egator:ddg] Found ${urls.length} event URLs`);

      // Phase 2: Fetch & parse each page directly
      const events = await this.extractEvents(urls, params);
      console.log(`[egator:ddg] Parsed ${events.length} events from ${urls.length} pages`);
      return events;
    } catch (err: any) {
      console.error("[egator:ddg] Fetch error:", err.message);
      return [];
    }
  }

  // ==========================================================================
  // Phase 1: Search for event URLs via DuckDuckGo
  // ==========================================================================

  private async searchEventUrls(params: EventQuery): Promise<string[]> {
    const queries = this.buildSearchQueries(params);
    const allUrls = new Set<string>();

    // Run searches sequentially to avoid DDG rate limiting
    for (const query of queries) {
      const urls = await this.runSearch(query);
      for (const url of urls) allUrls.add(url);
      // Small delay between queries
      if (queries.length > 1) await sleep(500);
    }

    return Array.from(allUrls).slice(0, 10);
  }

  private buildSearchQueries(params: EventQuery): string[] {
    const queries: string[] = [];
    const city = params.city || "Austin";
    const siteFilter = EVENT_DOMAINS.map((d) => `site:${d}`).join(" OR ");

    if (params.danceStyle || params.category) {
      const focus = params.danceStyle || params.category;
      queries.push(`(${siteFilter}) ${focus} events ${city} 2026`);
    }

    if (city.toLowerCase().includes("austin")) {
      queries.push(`(${siteFilter}) SXSW 2026 event RSVP`);
      queries.push(`(${siteFilter}) Austin March 2026 party showcase`);
    }

    queries.push(`(${siteFilter}) upcoming event ${city} 2026`);

    return queries;
  }

  private async runSearch(query: string): Promise<string[]> {
    console.log(`[egator:ddg] Search: "${query}"`);

    try {
      const body = new URLSearchParams({ q: query });
      const res = await fetch(DDG_HTML, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "FlowB-EventScanner/1.0 (https://flowb.me; events@flowb.me)",
        },
        body: body.toString(),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        console.error(`[egator:ddg] Search HTTP ${res.status}`);
        return [];
      }

      const html = await res.text();
      return this.parseSearchResults(html);
    } catch (err: any) {
      console.error(`[egator:ddg] Search error: ${err.message}`);
      return [];
    }
  }

  private parseSearchResults(html: string): string[] {
    const urls: string[] = [];

    // DDG HTML results have links in <a class="result__a" href="...">
    // or redirect URLs like //duckduckgo.com/l/?uddg=ENCODED_URL
    const linkRegex = /class="result__a"[^>]*href="([^"]+)"/g;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      let href = match[1];

      // DDG wraps URLs in redirect: //duckduckgo.com/l/?uddg=ENCODED_URL
      if (href.includes("uddg=")) {
        const encoded = href.split("uddg=")[1]?.split("&")[0];
        if (encoded) href = decodeURIComponent(encoded);
      }

      // Only keep event page URLs
      if (href.startsWith("http") && isEventPage(href)) {
        urls.push(href);
      }
    }

    // Also try extracting from result snippets that contain URLs
    const snippetUrlRegex = /href="(https?:\/\/(?:lu\.ma|.*eventbrite\.com|.*ra\.co|.*dice\.fm|.*partiful\.com)[^"]+)"/g;
    while ((match = snippetUrlRegex.exec(html)) !== null) {
      if (isEventPage(match[1]) && !urls.includes(match[1])) {
        urls.push(match[1]);
      }
    }

    console.log(`[egator:ddg] Parsed ${urls.length} event URLs from search results`);
    return urls;
  }

  // ==========================================================================
  // Phase 2: Direct fetch + parse event pages
  // ==========================================================================

  private async extractEvents(urls: string[], params: EventQuery): Promise<EventResult[]> {
    if (!urls.length) return [];

    // Fetch pages in parallel (max 5 concurrent)
    const events: EventResult[] = [];
    const chunks = chunkArray(urls, 5);

    for (const chunk of chunks) {
      const results = await Promise.allSettled(
        chunk.map((url) => this.extractSingleEvent(url, params))
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          events.push(result.value);
        }
      }
    }

    // Backfill og:image for events still missing images
    const needsImage = events.filter((e) => !e.imageUrl && e.url);
    if (needsImage.length) {
      const imgResults = await Promise.allSettled(
        needsImage.map((e) => fetchOgImage(e.url!))
      );
      for (let i = 0; i < needsImage.length; i++) {
        const r = imgResults[i];
        if (r.status === "fulfilled" && r.value) {
          needsImage[i].imageUrl = r.value;
        }
      }
    }

    return events;
  }

  private async extractSingleEvent(url: string, params: EventQuery): Promise<EventResult | null> {
    const html = await fetchHtml(url, { retries: 1, timeoutMs: 10000 });
    if (!html) return null;

    // Try JSON-LD first (most structured, best data)
    const jsonLdEvents = parseJsonLd(html);
    if (jsonLdEvents.length) {
      const source = extractSource(url);
      const event = jsonLdToEventResult(jsonLdEvents[0], url, source, params.city);
      if (event) return event;
    }

    // Fall back to text-based parsing
    // Strip HTML tags for text content (simple approach)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "\n")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return parseEventContent(text, url, params);
  }
}

// Parsing utilities re-exported from shared module
export { isEventPage, parseEventContent, extractSource, hashString } from "./parse-utils.js";

// ============================================================================
// Single-URL extraction (used by event-link action) - now free, no API key
// ============================================================================

export async function extractEventFromUrl(
  _apiKey: string,
  url: string,
  city?: string,
): Promise<EventResult | null> {
  try {
    const html = await fetchHtml(url, { retries: 1, timeoutMs: 10000 });
    if (!html) return null;

    // Try JSON-LD first
    const jsonLdEvents = parseJsonLd(html);
    if (jsonLdEvents.length) {
      const source = extractSource(url);
      const event = jsonLdToEventResult(jsonLdEvents[0], url, source, city);
      if (event) {
        if (!event.imageUrl) {
          const ogImg = extractOgImageFromHtml(html);
          if (ogImg) event.imageUrl = ogImg;
        }
        return event;
      }
    }

    // Fall back to text-based parsing
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "\n")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const parsed = parseEventContent(text, url, { city });
    if (parsed && !parsed.imageUrl) {
      parsed.imageUrl = extractOgImageFromHtml(html) || undefined;
    }
    return parsed;
  } catch (err: any) {
    console.error("[egator:ddg] extractEventFromUrl error:", err.message);
    return null;
  }
}

// ============================================================================
// Helpers
// ============================================================================

function extractOgImageFromHtml(html: string): string | undefined {
  const head = html.slice(0, 50_000);
  const ogMatch = head.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || head.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogMatch?.[1] && ogMatch[1].startsWith("http")) return ogMatch[1];
  return undefined;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
