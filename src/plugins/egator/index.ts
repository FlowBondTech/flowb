/**
 * eGator Plugin for FlowB (Multi-Source)
 *
 * Event discovery aggregated from all configured sources:
 * Luma, Tavily, Eventbrite, Brave, Resident Advisor, Lemonade, Sheeets, Google Places.
 * Uses Luma as the primary source with official API for rich features.
 */

import type {
  FlowBPlugin,
  EventProvider,
  FlowBContext,
  ToolInput,
  EGatorPluginConfig,
  EventQuery,
  EventResult,
  EventSourceAdapter,
} from "../../core/types.js";

import { LumaAdapter } from "./sources/luma.js";
import { TavilyAdapter } from "./sources/tavily.js";
import { EventbriteAdapter } from "./sources/eventbrite.js";
import { BraveSearchAdapter } from "./sources/brave.js";
import { ResidentAdvisorAdapter } from "./sources/ra.js";
import { LemonadeAdapter } from "./sources/lemonade.js";
import { SheeetsAdapter } from "./sources/sheeets.js";
import { GooglePlacesAdapter } from "./sources/google-places.js";
import { EventbriteScraperAdapter } from "./sources/eventbrite-scraper.js";
import { MeetupScraperAdapter } from "./sources/meetup-scraper.js";
import { SxswScraperAdapter } from "./sources/sxsw-scraper.js";
import { SupadataAdapter } from "./sources/supadata.js";
import type { TranscriptResult } from "./sources/supadata.js";
import { SerpAPIAdapter } from "./sources/serpapi.js";
import type { LumaEventDetail, LumaTicketType, LumaGuest } from "./sources/luma.js";

export class EGatorPlugin implements FlowBPlugin, EventProvider {
  id = "egator";
  name = "eGator Events";
  description = "Multi-source event discovery and RSVP";
  eventSource = "egator";

  actions: Record<string, { description: string }> = {
    search: { description: "Search events across all platforms" },
    "event-detail": { description: "Get full event details from Luma" },
    "event-tickets": { description: "Get ticket types and pricing for an event" },
    "event-guests": { description: "See who's going to an event" },
    "event-rsvp": { description: "RSVP to a Luma event" },
    "event-link": { description: "Look up event details from a URL" },
    transcribe: { description: "Transcribe a social media video (YouTube, TikTok, Instagram, X, Facebook)" },
    "web-search": { description: "Search the web via Google (SerpAPI)" },
  };

  private config: EGatorPluginConfig | null = null;
  private luma: LumaAdapter | null = null;
  private supadata: SupadataAdapter | null = null;
  private serpapi: SerpAPIAdapter | null = null;
  private adapters: EventSourceAdapter[] = [];

  configure(config: EGatorPluginConfig) {
    this.config = config;
    this.luma = null;
    this.supadata = null;
    this.serpapi = null;
    this.adapters = [];

    const src = config.sources;
    if (!src) return;

    if (src.luma?.apiKey) {
      this.luma = new LumaAdapter(src.luma.apiKey);
      this.adapters.push(this.luma);
      console.log("[egator] Source: Luma (official + discover)");
    }
    if (src.tavily?.apiKey) {
      this.adapters.push(new TavilyAdapter(src.tavily.apiKey));
      console.log("[egator] Source: Tavily (universal scraper)");
    }
    if (src.eventbrite?.apiKey) {
      this.adapters.push(new EventbriteAdapter(src.eventbrite.apiKey));
      console.log("[egator] Source: Eventbrite");
    }
    if (src.brave?.apiKey) {
      this.adapters.push(new BraveSearchAdapter(src.brave.apiKey));
      console.log("[egator] Source: Brave Search");
    }
    if (src.ra?.enabled) {
      this.adapters.push(new ResidentAdvisorAdapter());
      console.log("[egator] Source: Resident Advisor");
    }
    if (src.lemonade?.enabled) {
      this.adapters.push(new LemonadeAdapter(""));
      console.log("[egator] Source: Lemonade");
    }
    if (src.sheeets?.spreadsheetId) {
      this.adapters.push(new SheeetsAdapter(src.sheeets.spreadsheetId));
      console.log("[egator] Source: Sheeets (Google Spreadsheet)");
    }
    if (src.googlePlaces?.apiKey) {
      this.adapters.push(new GooglePlacesAdapter(src.googlePlaces.apiKey));
      console.log("[egator] Source: Google Places");
    }
    if (src.supadata?.apiKey) {
      this.supadata = new SupadataAdapter(src.supadata.apiKey);
      console.log("[egator] Source: Supadata (transcription)");
    }
    if (src.serpapi?.apiKey) {
      this.serpapi = new SerpAPIAdapter(src.serpapi.apiKey);
      this.adapters.push(this.serpapi);
      console.log("[egator] Source: SerpAPI (Google Search + Events)");
    }

    console.log(`[egator] ${this.adapters.length} source(s) configured`);
  }

  /**
   * Configure for keyless scraping mode (no API keys required).
   * Used by the standalone scraper on IONOS VPS.
   * Sets up all adapters that work without API keys.
   */
  configureKeyless(cities: string[] = ["austin"]) {
    this.config = { sources: {} };
    this.luma = null;
    this.adapters = [];

    // Keyless scrapers (always enabled)
    this.adapters.push(new EventbriteScraperAdapter(cities));
    console.log("[egator] Source: Eventbrite Scraper (keyless)");

    this.adapters.push(new MeetupScraperAdapter(cities));
    console.log("[egator] Source: Meetup Scraper (keyless)");

    // Luma Discover API works without auth
    this.luma = new LumaAdapter("");
    this.adapters.push(this.luma);
    console.log("[egator] Source: Luma Discover (keyless)");

    // RA public GraphQL works without auth
    this.adapters.push(new ResidentAdvisorAdapter());
    console.log("[egator] Source: Resident Advisor (keyless)");

    // Lemonade public GraphQL works without spaceId for search
    this.adapters.push(new LemonadeAdapter(""));
    console.log("[egator] Source: Lemonade (keyless)");

    // SXSW scraper - enabled when any city is Austin
    if (cities.some((c) => c.toLowerCase() === "austin")) {
      this.adapters.push(new SxswScraperAdapter());
      console.log("[egator] Source: SXSW Schedule Scraper (keyless, Austin)");
    }

    console.log(`[egator] ${this.adapters.length} keyless source(s) configured for cities: ${cities.join(", ")}`);
  }

  /** Expose LumaAdapter for direct use by bot/services */
  getLumaAdapter(): LumaAdapter | null {
    return this.luma;
  }

  isConfigured(): boolean {
    return this.adapters.length > 0 || this.supadata !== null || this.serpapi !== null;
  }

  /** Expose SupadataAdapter for direct use by routes/services */
  getSupadataAdapter(): SupadataAdapter | null {
    return this.supadata;
  }

  /** Expose SerpAPIAdapter for direct use by routes/services */
  getSerpAPIAdapter(): SerpAPIAdapter | null {
    return this.serpapi;
  }

  async execute(action: string, input: ToolInput, context: FlowBContext): Promise<string> {
    if (!this.isConfigured()) return "No event sources configured. Set API keys for at least one source.";

    switch (action) {
      case "search":
        return this.searchEvents(input);
      case "event-detail":
        return this.eventDetail(input);
      case "event-tickets":
        return this.eventTickets(input);
      case "event-guests":
        return this.eventGuests(input);
      case "event-rsvp":
        return this.eventRsvp(input);
      case "event-link":
        return this.eventLink(input);
      case "transcribe":
        return this.transcribeVideo(input);
      case "web-search":
        return this.webSearch(input);
      default:
        return `Unknown action: ${action}`;
    }
  }

  // ========================================================================
  // EventProvider implementation - aggregates from ALL sources
  // ========================================================================

  async getEvents(params: EventQuery): Promise<EventResult[]> {
    if (!this.adapters.length) return [];

    // Fetch from all adapters in parallel with individual error handling
    const results = await Promise.allSettled(
      this.adapters.map(async (adapter) => {
        try {
          const events = await adapter.fetchEvents(params);
          return events;
        } catch (err: any) {
          console.error(`[egator:${adapter.id}] Fetch failed:`, err.message);
          return [];
        }
      }),
    );

    // Merge all results
    const allEvents: EventResult[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        allEvents.push(...result.value);
      }
    }

    // Sort by start time
    allEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    // Deduplicate by normalized title (keep first occurrence = highest priority source)
    const seen = new Set<string>();
    return allEvents.filter((e) => {
      const key = e.title.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ========================================================================
  // Actions
  // ========================================================================

  private async searchEvents(input: ToolInput): Promise<string> {
    const events = await this.getEvents({
      city: input.city || "Austin",
      category: input.category,
      limit: 20,
    });

    if (!events.length) {
      return "No events found right now. Check back soon!";
    }

    return formatEventList(events, "Events");
  }

  private async eventDetail(input: ToolInput): Promise<string> {
    if (!input.event_id) return JSON.stringify({ error: "No event_id provided" });
    if (!this.luma) return JSON.stringify({ error: "Luma not configured for event details" });

    const lumaId = input.event_id.replace(/^luma_/, "");
    const detail = await this.luma.getEventDetail(lumaId);
    if (!detail) return JSON.stringify({ error: "Event not found on Luma" });

    const tickets = await this.luma.getTicketTypes(detail.id);
    return JSON.stringify({ ...detail, ticketTypes: tickets });
  }

  private async eventTickets(input: ToolInput): Promise<string> {
    if (!input.event_id) return JSON.stringify({ error: "No event_id provided" });
    if (!this.luma) return JSON.stringify({ error: "Luma not configured" });

    const lumaId = input.event_id.replace(/^luma_/, "");
    const tickets = await this.luma.getTicketTypes(lumaId);

    if (!tickets.length) {
      return JSON.stringify({ tickets: [], message: "No ticket types found" });
    }

    return JSON.stringify({ tickets });
  }

  private async eventGuests(input: ToolInput): Promise<string> {
    if (!input.event_id) return JSON.stringify({ error: "No event_id provided" });
    if (!this.luma) return JSON.stringify({ error: "Luma not configured" });

    const lumaId = input.event_id.replace(/^luma_/, "");
    const result = await this.luma.getGuests(lumaId, { status: "approved", limit: 20 });

    return JSON.stringify({
      total: result.total,
      guests: result.guests.map((g) => ({
        name: g.userName,
        ethAddress: g.ethAddress,
        solanaAddress: g.solanaAddress,
      })),
    });
  }

  private async eventRsvp(input: ToolInput): Promise<string> {
    if (!input.event_id) return JSON.stringify({ error: "No event_id provided" });
    if (!this.luma) return JSON.stringify({ error: "Luma not configured for RSVP" });

    const email = input.query;
    if (!email || !email.includes("@")) {
      return JSON.stringify({
        error: "Email required for RSVP",
        message: "Please provide your email to RSVP via Luma",
      });
    }

    const lumaId = input.event_id.replace(/^luma_/, "");
    const result = await this.luma.addGuest(lumaId, email, input.platform_username);
    return JSON.stringify(result);
  }

  private async eventLink(input: ToolInput): Promise<string> {
    if (!input.url) return JSON.stringify({ error: "No URL provided" });

    // Check if it's a lu.ma URL and we have Luma configured
    if (this.luma && (input.url.includes("lu.ma") || input.url.includes("luma.com"))) {
      const detail = await this.luma.lookupEventByUrl(input.url);
      if (detail) return JSON.stringify(detail);

      const slugMatch = input.url.match(/lu\.ma\/([a-zA-Z0-9-]+)/);
      if (slugMatch) {
        const d = await this.luma.getEventDetail(slugMatch[1]);
        if (d) return JSON.stringify(d);
      }
    }

    return JSON.stringify({ error: "Could not find this event" });
  }

  private async transcribeVideo(input: ToolInput): Promise<string> {
    const url = input.video_url || input.url;
    if (!url) return JSON.stringify({ error: "No video URL provided" });
    if (!this.supadata) return JSON.stringify({ error: "Supadata not configured. Set SUPADATA_API_KEY." });

    if (!SupadataAdapter.isSupportedUrl(url)) {
      return JSON.stringify({
        error: "Unsupported URL",
        message: "Supported platforms: YouTube, TikTok, Instagram, X/Twitter, Facebook",
      });
    }

    try {
      const platform = SupadataAdapter.detectPlatform(url);
      console.log(`[egator:supadata] Transcribing ${platform} video: ${url}`);

      const result = await this.supadata.transcribe(url, {
        lang: input.transcript_lang,
        mode: input.transcript_mode || "auto",
        text: true,
      });

      return JSON.stringify({
        platform,
        url: result.sourceUrl,
        lang: result.lang,
        availableLangs: result.availableLangs,
        transcript: result.content,
        async: result.async,
      });
    } catch (err: any) {
      console.error("[egator:supadata] Transcribe error:", err.message);
      return JSON.stringify({ error: `Transcription failed: ${err.message}` });
    }
  }

  private async webSearch(input: ToolInput): Promise<string> {
    const query = input.search_query || input.query;
    if (!query) return JSON.stringify({ error: "No search query provided" });
    if (!this.serpapi) return JSON.stringify({ error: "SerpAPI not configured. Set SERPAPI_API_KEY." });

    try {
      console.log(`[egator:serpapi] Web search: "${query}"`);
      const data = await this.serpapi.search(query, {
        location: input.search_location || input.city,
        num: 10,
      });

      const results = (data.organic_results || []).map((r) => ({
        title: r.title,
        link: r.link,
        snippet: r.snippet,
      }));

      return JSON.stringify({
        query,
        results,
        knowledge_graph: data.knowledge_graph || null,
        related_questions: data.related_questions || [],
      });
    } catch (err: any) {
      console.error("[egator:serpapi] Search error:", err.message);
      return JSON.stringify({ error: `Search failed: ${err.message}` });
    }
  }
}

// ============================================================================
// Shared formatting
// ============================================================================

export function formatEventList(events: EventResult[], title: string): string {
  const lines: string[] = [`**${title}** (${events.length})\n`];

  for (const e of events) {
    const date = new Date(e.startTime);
    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    lines.push(`**${e.title}**`);
    lines.push(`${dateStr}`);

    if (e.isVirtual) {
      lines.push(`Online`);
    } else if (e.locationName) {
      lines.push(`${e.locationName}${e.locationCity ? `, ${e.locationCity}` : ""}`);
    }

    if (e.isFree) {
      lines.push(`FREE`);
    } else if (e.price) {
      lines.push(`$${e.price}`);
    }

    if (e.rsvpCount) {
      lines.push(`${e.rsvpCount} going`);
    }

    if (e.source) {
      lines.push(`via ${e.source}`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

// Re-export types for use by bot/routes
export type { LumaEventDetail, LumaTicketType, LumaGuest };
export type { TranscriptResult };
export { SupadataAdapter, SerpAPIAdapter };
