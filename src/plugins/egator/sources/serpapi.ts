/**
 * SerpAPI Source Adapter
 *
 * Uses SerpAPI (serpapi.com) for:
 * 1. Event discovery via Google Search (EventSourceAdapter)
 * 2. General web search skill for FlowB
 *
 * Supports Google Search, Google Events, and Google Maps/Local results.
 */

import type { EventQuery, EventResult, EventSourceAdapter } from "../../../core/types.js";

const SERPAPI_BASE = "https://serpapi.com/search.json";

export interface SerpSearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
  source?: string;
  thumbnail?: string;
  date?: string;
}

export interface SerpSearchResponse {
  organic_results: SerpSearchResult[];
  knowledge_graph?: Record<string, any>;
  related_questions?: Array<{ question: string; snippet: string }>;
  local_results?: Array<{
    title: string;
    place_id: string;
    address: string;
    rating?: number;
    type?: string;
  }>;
  events_results?: Array<{
    title: string;
    date?: { start_date: string; when: string };
    address?: string[];
    link?: string;
    thumbnail?: string;
    venue?: { name: string; rating?: number };
    ticket_info?: { source: string; link: string };
  }>;
  search_metadata: { id: string; status: string; total_time_taken: number };
}

export class SerpAPIAdapter implements EventSourceAdapter {
  id = "serpapi";
  name = "SerpAPI";

  constructor(private apiKey: string) {}

  /**
   * EventSourceAdapter: search for events via Google
   */
  async fetchEvents(params: EventQuery): Promise<EventResult[]> {
    try {
      const city = params.city || "Austin";
      const queries = this.buildEventQueries(params, city);
      const allEvents: EventResult[] = [];

      // Run up to 2 queries in parallel
      const results = await Promise.allSettled(
        queries.slice(0, 2).map((q) => this.searchGoogle(q, city)),
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          allEvents.push(...result.value);
        }
      }

      console.log(`[egator:serpapi] Found ${allEvents.length} events`);
      return allEvents;
    } catch (err: any) {
      console.error("[egator:serpapi] Fetch error:", err.message);
      return [];
    }
  }

  /**
   * General web search - returns structured results from Google
   */
  async search(
    query: string,
    options: { location?: string; num?: number; gl?: string; hl?: string } = {},
  ): Promise<SerpSearchResponse> {
    const params = new URLSearchParams({
      api_key: this.apiKey,
      engine: "google",
      q: query,
      output: "json",
      num: String(options.num || 10),
    });

    if (options.location) params.set("location", options.location);
    if (options.gl) params.set("gl", options.gl);
    if (options.hl) params.set("hl", options.hl);

    const res = await fetch(`${SERPAPI_BASE}?${params}`);
    if (!res.ok) {
      throw new Error(`SerpAPI ${res.status}: ${await res.text()}`);
    }

    return res.json();
  }

  /**
   * Search Google Events specifically
   */
  async searchEvents(
    query: string,
    options: { location?: string } = {},
  ): Promise<SerpSearchResponse> {
    const params = new URLSearchParams({
      api_key: this.apiKey,
      engine: "google_events",
      q: query,
      output: "json",
    });

    if (options.location) params.set("location", options.location);

    const res = await fetch(`${SERPAPI_BASE}?${params}`);
    if (!res.ok) {
      throw new Error(`SerpAPI Events ${res.status}: ${await res.text()}`);
    }

    return res.json();
  }

  // ==========================================================================
  // Private helpers
  // ==========================================================================

  private buildEventQueries(params: EventQuery, city: string): string[] {
    const queries: string[] = [];

    if (params.category || params.danceStyle) {
      const focus = params.category || params.danceStyle;
      queries.push(`${focus} events in ${city}`);
    }

    if (params.q) {
      queries.push(`${params.q} events ${city}`);
    }

    queries.push(`upcoming events in ${city}`);
    return queries;
  }

  private async searchGoogle(query: string, city: string): Promise<EventResult[]> {
    console.log(`[egator:serpapi] Search: "${query}"`);

    const data = await this.search(query, { location: city, num: 10 });
    const events: EventResult[] = [];

    // Parse Google Events results if present
    if (data.events_results?.length) {
      for (const ev of data.events_results) {
        events.push({
          id: `serpapi_${hashStr(ev.title + (ev.date?.start_date || ""))}`,
          title: ev.title,
          startTime: ev.date?.start_date || new Date().toISOString(),
          locationName: ev.venue?.name || ev.address?.[0],
          locationCity: city,
          url: ev.link || ev.ticket_info?.link,
          ticketUrl: ev.ticket_info?.link,
          imageUrl: ev.thumbnail,
          source: "serpapi",
          isFree: false,
        });
      }
    }

    // Parse organic results that look like event pages
    if (data.organic_results?.length) {
      for (const r of data.organic_results) {
        if (isLikelyEventUrl(r.link)) {
          const parsed = parseOrganic(r, city);
          if (parsed) events.push(parsed);
        }
      }
    }

    return events;
  }
}

// ============================================================================
// Helpers
// ============================================================================

function hashStr(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return Math.abs(hash).toString(36);
}

const EVENT_HOSTS = [
  "lu.ma", "eventbrite.com", "meetup.com", "ra.co",
  "dice.fm", "partiful.com", "lemonade.social",
];

function isLikelyEventUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace("www.", "");
    return EVENT_HOSTS.some((d) => host.includes(d));
  } catch {
    return false;
  }
}

function parseOrganic(r: SerpSearchResult, city: string): EventResult | null {
  if (!r.title || !r.link) return null;

  return {
    id: `serpapi_${hashStr(r.link)}`,
    title: r.title.replace(/ \| .*$/, "").replace(/ - .*$/, "").trim(),
    description: r.snippet,
    startTime: new Date().toISOString(),
    locationCity: city,
    url: r.link,
    source: "serpapi",
    isFree: false,
  };
}
