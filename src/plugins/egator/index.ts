/**
 * eGator Plugin for FlowB
 *
 * Unified event aggregator. Pulls from multiple source adapters
 * (Luma, Eventbrite, Brave Search, Tavily, RA, Google Places)
 * and merges results into a single deduplicated feed.
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
import { EventbriteAdapter } from "./sources/eventbrite.js";
import { BraveSearchAdapter } from "./sources/brave.js";
import { TavilyAdapter } from "./sources/tavily.js";
import { ResidentAdvisorAdapter } from "./sources/ra.js";
import { GooglePlacesAdapter } from "./sources/google-places.js";

export class EGatorPlugin implements FlowBPlugin, EventProvider {
  id = "egator";
  name = "eGator Events";
  description = "Aggregated event discovery from multiple sources";
  eventSource = "egator";

  actions = {
    search: { description: "Search events across all sources" },
  };

  private config: EGatorPluginConfig | null = null;
  private adapters: EventSourceAdapter[] = [];

  configure(config: EGatorPluginConfig) {
    this.config = config;
    this.adapters = [];

    const sources = config.sources;
    if (sources?.luma?.apiKey) this.adapters.push(new LumaAdapter(sources.luma.apiKey));
    if (sources?.eventbrite?.apiKey) this.adapters.push(new EventbriteAdapter(sources.eventbrite.apiKey));
    if (sources?.brave?.apiKey) this.adapters.push(new BraveSearchAdapter(sources.brave.apiKey));
    if (sources?.tavily?.apiKey) this.adapters.push(new TavilyAdapter(sources.tavily.apiKey));
    if (sources?.ra) this.adapters.push(new ResidentAdvisorAdapter());
    if (sources?.googlePlaces?.apiKey) this.adapters.push(new GooglePlacesAdapter(sources.googlePlaces.apiKey));

    const names = this.adapters.map((a) => a.name);
    if (names.length) {
      console.log(`[egator] Sources: ${names.join(", ")}`);
    }
  }

  isConfigured(): boolean {
    // Configured if we have at least one adapter OR the legacy API URL
    return this.adapters.length > 0 || !!this.config?.apiBaseUrl;
  }

  async execute(action: string, input: ToolInput, context: FlowBContext): Promise<string> {
    if (!this.config) return "eGator plugin not configured.";

    switch (action) {
      case "search":
        return this.searchEvents(input);
      default:
        return `Unknown eGator action: ${action}`;
    }
  }

  // ========================================================================
  // EventProvider implementation
  // ========================================================================

  async getEvents(params: EventQuery): Promise<EventResult[]> {
    if (!this.config) return [];

    const allEvents: EventResult[] = [];

    // Fetch from all adapters in parallel
    if (this.adapters.length > 0) {
      const results = await Promise.allSettled(
        this.adapters.map((adapter) =>
          adapter.fetchEvents(params).catch((err) => {
            console.error(`[egator] ${adapter.name} failed:`, err.message || err);
            return [] as EventResult[];
          })
        )
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value.length) {
          allEvents.push(...result.value);
        }
      }
    }

    // Fallback: legacy external API
    if (allEvents.length === 0 && this.config.apiBaseUrl) {
      const legacyEvents = await this.fetchLegacyApi(params);
      allEvents.push(...legacyEvents);
    }

    // Sort by start time
    allEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    // Deduplicate by title similarity
    const seen = new Set<string>();
    return allEvents.filter((e) => {
      const key = e.title.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ========================================================================
  // Legacy API fallback
  // ========================================================================

  private async fetchLegacyApi(params: EventQuery): Promise<EventResult[]> {
    if (!this.config?.apiBaseUrl) return [];

    try {
      const res = await fetch(`${this.config.apiBaseUrl}/api/v1/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: params.city,
          limit: params.limit || 10,
          ...(params.danceStyle ? { isDance: true } : {}),
        }),
      });

      if (!res.ok) return [];

      const data = await res.json();
      const events = data.events || [];

      return events.map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        startTime: e.startTime,
        endTime: e.endTime,
        locationName: e.venue?.name,
        locationCity: e.venue?.city || e.neighborhoodName,
        price: e.price?.min,
        isFree: !e.price?.min,
        isVirtual: false,
        danceStyles: e.vibe?.danceTags || [],
        source: e.source || "egator",
        url: e.url,
        imageUrl: e.imageUrl || e.image_url || e.cover_url || undefined,
      }));
    } catch (err) {
      console.error("[egator] Legacy API fetch failed:", err);
      return [];
    }
  }

  // ========================================================================
  // Actions
  // ========================================================================

  private async searchEvents(input: ToolInput): Promise<string> {
    const events = await this.getEvents({
      city: input.city,
      category: input.category,
      danceStyle: input.dance_style,
      limit: 10,
    });

    if (!events.length) {
      const note = input.city ? ` in ${input.city}` : "";
      return `No events found${note}. Check back soon!`;
    }

    return formatEventList(events, "Events");
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

    if (e.danceStyles?.length) {
      lines.push(`${e.danceStyles.slice(0, 3).join(", ")}`);
    }

    if (e.isFree) {
      lines.push(`FREE`);
    } else if (e.price) {
      lines.push(`$${e.price}`);
    }

    if (e.source !== "egator") {
      lines.push(`_via ${e.source}_`);
    }

    lines.push("");
  }

  return lines.join("\n");
}
