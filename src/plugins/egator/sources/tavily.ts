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
import { isEventPage, parseEventContent, extractSource, hashString } from "./parse-utils.js";

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

// Parsing utilities re-exported from shared module
export { isEventPage, parseEventContent, extractSource, hashString } from "./parse-utils.js";

// ============================================================================
// Single-URL extraction (used by event-link action)
// ============================================================================

export async function extractEventFromUrl(
  apiKey: string,
  url: string,
  city?: string,
): Promise<EventResult | null> {
  try {
    const res = await fetch(TAVILY_EXTRACT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        urls: [url],
        extract_depth: "basic",
        format: "text",
        chunks_per_source: 3,
      }),
    });

    if (!res.ok) {
      console.error(`[egator:tavily] Extract single ${res.status}: ${await res.text()}`);
      return null;
    }

    const data = await res.json();
    const results = data.results || [];
    if (!results.length) return null;

    const result = results[0];
    return parseEventContent(result.raw_content, result.url || url, { city });
  } catch (err: any) {
    console.error("[egator:tavily] extractEventFromUrl error:", err.message);
    return null;
  }
}
