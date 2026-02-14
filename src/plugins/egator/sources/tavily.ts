/**
 * Tavily AI Search Event Source Adapter
 * Uses Tavily's AI-powered search to find events
 */

import type { EventQuery, EventResult, EventSourceAdapter } from "../../../core/types.js";

const TAVILY_API = "https://api.tavily.com/search";

export class TavilyAdapter implements EventSourceAdapter {
  id = "tavily";
  name = "Tavily";

  constructor(private apiKey: string) {}

  async fetchEvents(params: EventQuery): Promise<EventResult[]> {
    try {
      const queryParts: string[] = [];
      if (params.danceStyle) queryParts.push(params.danceStyle);
      if (params.category) queryParts.push(params.category);
      queryParts.push("events");
      if (params.city) queryParts.push(`in ${params.city}`);
      queryParts.push("upcoming this week");

      const res = await fetch(TAVILY_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: this.apiKey,
          query: queryParts.join(" "),
          max_results: Math.min(params.limit || 10, 10),
          search_depth: "basic",
          include_domains: [
            "lu.ma", "eventbrite.com", "meetup.com",
            "ra.co", "dice.fm", "partiful.com",
          ],
        }),
      });

      if (!res.ok) {
        console.error(`[egator:tavily] ${res.status}: ${await res.text()}`);
        return [];
      }

      const data = await res.json();
      const results = data.results || [];

      return results.map((r: any) => ({
        id: `tavily_${hashString(r.url)}`,
        title: cleanTitle(r.title || ""),
        description: r.content?.substring(0, 300),
        startTime: new Date().toISOString(), // Tavily doesn't extract structured dates
        locationCity: params.city,
        isFree: false,
        isVirtual: false,
        source: "tavily",
        url: r.url,
      }));
    } catch (err: any) {
      console.error("[egator:tavily] Fetch error:", err.message);
      return [];
    }
  }
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[|–-]\s*(Eventbrite|Meetup|Luma|Ticketmaster|Dice|Partiful).*$/i, "")
    .trim();
}
