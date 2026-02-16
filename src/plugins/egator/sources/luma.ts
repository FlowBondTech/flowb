/**
 * Luma Event Source Adapter
 * Fetches events from lu.ma API
 */

import type { EventQuery, EventResult, EventSourceAdapter } from "../../../core/types.js";

const LUMA_API = "https://api.lu.ma/public/v2";

export class LumaAdapter implements EventSourceAdapter {
  id = "luma";
  name = "Luma";

  constructor(private apiKey: string) {}

  async fetchEvents(params: EventQuery): Promise<EventResult[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params.city) queryParams.set("geo_city", params.city);
      if (params.limit) queryParams.set("limit", String(Math.min(params.limit, 50)));

      const res = await fetch(`${LUMA_API}/discover/events?${queryParams}`, {
        headers: {
          "x-luma-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        console.error(`[egator:luma] ${res.status}: ${await res.text()}`);
        return [];
      }

      const data = await res.json();
      const entries = data.entries || data.events || [];

      return entries.map((entry: any) => {
        const e = entry.event || entry;
        return {
          id: `luma_${e.api_id || e.id}`,
          title: e.name || e.title || "Untitled",
          description: e.description?.substring(0, 300),
          startTime: e.start_at || e.startTime,
          endTime: e.end_at || e.endTime,
          locationName: e.geo_address_info?.city_state || e.location,
          locationCity: e.geo_address_info?.city || params.city,
          isFree: !e.ticket_price,
          price: e.ticket_price ? Number(e.ticket_price) / 100 : undefined,
          isVirtual: e.is_online || false,
          source: "luma",
          url: e.url || `https://lu.ma/${e.api_id || e.id}`,
          imageUrl: e.cover_url || e.image_url || undefined,
        };
      });
    } catch (err: any) {
      console.error("[egator:luma] Fetch error:", err.message);
      return [];
    }
  }
}
