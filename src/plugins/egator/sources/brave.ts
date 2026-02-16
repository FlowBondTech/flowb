/**
 * Brave Search Event Source Adapter
 * Uses Brave Web Search API to find events from any site
 */

import type { EventQuery, EventResult, EventSourceAdapter } from "../../../core/types.js";

const BRAVE_API = "https://api.search.brave.com/res/v1/web/search";

export class BraveSearchAdapter implements EventSourceAdapter {
  id = "brave";
  name = "Brave Search";

  constructor(private apiKey: string) {}

  async fetchEvents(params: EventQuery): Promise<EventResult[]> {
    try {
      const queryParts: string[] = [];
      if (params.danceStyle) queryParts.push(params.danceStyle);
      if (params.category) queryParts.push(params.category);
      queryParts.push("events");
      if (params.city) queryParts.push(`in ${params.city}`);
      queryParts.push("upcoming");

      const query = queryParts.join(" ");
      const limit = Math.min(params.limit || 10, 20);

      const res = await fetch(
        `${BRAVE_API}?q=${encodeURIComponent(query)}&count=${limit}&freshness=pw`,
        {
          headers: {
            "X-Subscription-Token": this.apiKey,
            Accept: "application/json",
          },
        },
      );

      if (!res.ok) {
        console.error(`[egator:brave] ${res.status}: ${await res.text()}`);
        return [];
      }

      const data = await res.json();
      const results = data.web?.results || [];

      // Extract event-like results (filter for pages that look like events)
      return results
        .filter((r: any) => {
          const url = r.url?.toLowerCase() || "";
          const title = r.title?.toLowerCase() || "";
          return (
            url.includes("event") ||
            url.includes("lu.ma") ||
            url.includes("eventbrite") ||
            url.includes("meetup.com") ||
            title.includes("event") ||
            title.includes("class") ||
            title.includes("workshop") ||
            title.includes("party") ||
            title.includes("festival")
          );
        })
        .map((r: any) => ({
          id: `brave_${hashString(r.url)}`,
          title: cleanTitle(r.title),
          description: r.description?.substring(0, 300),
          startTime: extractDate(r) || new Date().toISOString(),
          locationCity: params.city,
          isFree: false,
          isVirtual: false,
          source: "brave",
          url: r.url,
          imageUrl: r.thumbnail?.src || undefined,
        }));
    } catch (err: any) {
      console.error("[egator:brave] Fetch error:", err.message);
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
  // Remove common suffixes like "| Eventbrite", "- Meetup"
  return title
    .replace(/\s*[|–-]\s*(Eventbrite|Meetup|Luma|Ticketmaster|Dice).*$/i, "")
    .trim();
}

function extractDate(result: any): string | null {
  // Try to extract a date from the result metadata or description
  if (result.age) {
    // Brave sometimes includes page age/date
    return new Date(result.age).toISOString();
  }
  return null;
}
