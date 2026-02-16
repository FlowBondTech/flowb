/**
 * Eventbrite Event Source Adapter
 * Fetches events from Eventbrite API v3
 */

import type { EventQuery, EventResult, EventSourceAdapter } from "../../../core/types.js";

const EB_API = "https://www.eventbriteapi.com/v3";

export class EventbriteAdapter implements EventSourceAdapter {
  id = "eventbrite";
  name = "Eventbrite";

  constructor(private apiKey: string) {}

  async fetchEvents(params: EventQuery): Promise<EventResult[]> {
    try {
      const queryParams = new URLSearchParams({
        expand: "venue",
        sort_by: "date",
      });

      if (params.city) queryParams.set("location.address", params.city);
      if (params.category) queryParams.set("q", params.category);
      if (params.danceStyle) queryParams.set("q", params.danceStyle);
      if (params.limit) queryParams.set("page_size", String(Math.min(params.limit, 50)));

      const res = await fetch(`${EB_API}/events/search/?${queryParams}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });

      if (!res.ok) {
        console.error(`[egator:eventbrite] ${res.status}: ${await res.text()}`);
        return [];
      }

      const data = await res.json();
      const events = data.events || [];

      return events.map((e: any) => ({
        id: `eb_${e.id}`,
        title: e.name?.text || "Untitled",
        description: e.description?.text?.substring(0, 300),
        startTime: e.start?.utc || e.start?.local,
        endTime: e.end?.utc || e.end?.local,
        locationName: e.venue?.name,
        locationCity: e.venue?.address?.city || params.city,
        isFree: e.is_free || false,
        price: e.is_free ? undefined : undefined, // Eventbrite doesn't include price in search
        isVirtual: e.online_event || false,
        source: "eventbrite",
        url: e.url,
        imageUrl: e.logo?.url || e.logo?.original?.url || undefined,
      }));
    } catch (err: any) {
      console.error("[egator:eventbrite] Fetch error:", err.message);
      return [];
    }
  }
}
