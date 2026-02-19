/**
 * eGator Plugin for FlowB (Luma-Only)
 *
 * Event discovery and management powered exclusively by Luma.
 * Uses the discover API for public search and official API for
 * rich features: event details, tickets, RSVP, guest lists.
 */

import type {
  FlowBPlugin,
  EventProvider,
  FlowBContext,
  ToolInput,
  EGatorPluginConfig,
  EventQuery,
  EventResult,
} from "../../core/types.js";

import { LumaAdapter } from "./sources/luma.js";
import type { LumaEventDetail, LumaTicketType, LumaGuest } from "./sources/luma.js";

export class EGatorPlugin implements FlowBPlugin, EventProvider {
  id = "egator";
  name = "Luma Events";
  description = "Event discovery and RSVP powered by Luma";
  eventSource = "luma";

  actions: Record<string, { description: string }> = {
    search: { description: "Search events in Denver" },
    "event-detail": { description: "Get full event details from Luma" },
    "event-tickets": { description: "Get ticket types and pricing for an event" },
    "event-guests": { description: "See who's going to an event" },
    "event-rsvp": { description: "RSVP to a Luma event" },
    "event-link": { description: "Look up event details from a lu.ma URL" },
  };

  private config: EGatorPluginConfig | null = null;
  private luma: LumaAdapter | null = null;

  configure(config: EGatorPluginConfig) {
    this.config = config;
    this.luma = null;

    if (config.sources?.luma?.apiKey) {
      this.luma = new LumaAdapter(config.sources.luma.apiKey);
      console.log("[egator] Source: Luma (official + discover)");
    }
  }

  /** Expose LumaAdapter for direct use by bot/services */
  getLumaAdapter(): LumaAdapter | null {
    return this.luma;
  }

  isConfigured(): boolean {
    return !!this.luma;
  }

  async execute(action: string, input: ToolInput, context: FlowBContext): Promise<string> {
    if (!this.luma) return "Luma not configured. Set LUMA_API_KEY.";

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
      default:
        return `Unknown action: ${action}`;
    }
  }

  // ========================================================================
  // EventProvider implementation
  // ========================================================================

  async getEvents(params: EventQuery): Promise<EventResult[]> {
    if (!this.luma) return [];

    try {
      const events = await this.luma.fetchEvents(params);

      // Sort by start time
      events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      // Deduplicate by title
      const seen = new Set<string>();
      return events.filter((e) => {
        const key = e.title.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } catch (err: any) {
      console.error("[egator] Luma fetch failed:", err.message);
      return [];
    }
  }

  // ========================================================================
  // Actions
  // ========================================================================

  private async searchEvents(input: ToolInput): Promise<string> {
    const events = await this.getEvents({
      city: input.city || "Denver",
      category: input.category,
      limit: 10,
    });

    if (!events.length) {
      return "No events found on Luma right now. Check back soon!";
    }

    return formatEventList(events, "Events");
  }

  private async eventDetail(input: ToolInput): Promise<string> {
    if (!input.event_id) return JSON.stringify({ error: "No event_id provided" });

    // Strip luma_ prefix if present
    const lumaId = input.event_id.replace(/^luma_/, "");
    const detail = await this.luma!.getEventDetail(lumaId);
    if (!detail) return JSON.stringify({ error: "Event not found on Luma" });

    // Also fetch tickets
    const tickets = await this.luma!.getTicketTypes(detail.id);

    return JSON.stringify({ ...detail, ticketTypes: tickets });
  }

  private async eventTickets(input: ToolInput): Promise<string> {
    if (!input.event_id) return JSON.stringify({ error: "No event_id provided" });

    const lumaId = input.event_id.replace(/^luma_/, "");
    const tickets = await this.luma!.getTicketTypes(lumaId);

    if (!tickets.length) {
      return JSON.stringify({ tickets: [], message: "No ticket types found" });
    }

    return JSON.stringify({ tickets });
  }

  private async eventGuests(input: ToolInput): Promise<string> {
    if (!input.event_id) return JSON.stringify({ error: "No event_id provided" });

    const lumaId = input.event_id.replace(/^luma_/, "");
    const result = await this.luma!.getGuests(lumaId, { status: "approved", limit: 20 });

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

    // For RSVP we need an email - construct from user_id or use provided
    const email = input.query; // Reuse query field for email
    if (!email || !email.includes("@")) {
      return JSON.stringify({
        error: "Email required for RSVP",
        message: "Please provide your email to RSVP via Luma",
      });
    }

    const lumaId = input.event_id.replace(/^luma_/, "");
    const result = await this.luma!.addGuest(lumaId, email, input.platform_username);
    return JSON.stringify(result);
  }

  private async eventLink(input: ToolInput): Promise<string> {
    if (!input.url) return JSON.stringify({ error: "No URL provided" });

    // Check if it's a lu.ma URL
    if (input.url.includes("lu.ma") || input.url.includes("luma.com")) {
      const detail = await this.luma!.lookupEventByUrl(input.url);
      if (detail) return JSON.stringify(detail);
    }

    // Try extracting slug from URL
    const slugMatch = input.url.match(/lu\.ma\/([a-zA-Z0-9-]+)/);
    if (slugMatch) {
      const detail = await this.luma!.getEventDetail(slugMatch[1]);
      if (detail) return JSON.stringify(detail);
    }

    return JSON.stringify({ error: "Could not find this event on Luma" });
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

    lines.push("");
  }

  return lines.join("\n");
}

// Re-export Luma types for use by bot
export type { LumaEventDetail, LumaTicketType, LumaGuest };
