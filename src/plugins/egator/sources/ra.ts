/**
 * Resident Advisor Event Source Adapter
 * Fetches events from RA's public GraphQL API
 */

import type { EventQuery, EventResult, EventSourceAdapter } from "../../../core/types.js";

const RA_GQL = "https://ra.co/graphql";

export class ResidentAdvisorAdapter implements EventSourceAdapter {
  id = "ra";
  name = "Resident Advisor";

  async fetchEvents(params: EventQuery): Promise<EventResult[]> {
    try {
      // RA uses area IDs for cities; map common ones
      const areaId = params.city ? getAreaId(params.city) : null;

      const listing: Record<string, any> = {
        dateFrom: new Date().toISOString().split("T")[0],
        pageSize: Math.min(params.limit || 10, 20),
      };

      if (areaId) listing.areaId = areaId;

      const res = await fetch(RA_GQL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "FlowB/1.0",
          Referer: "https://ra.co/events",
        },
        body: JSON.stringify({
          query: `
            query GET_EVENTS($listing: FilterInputDtoInput) {
              listing(input: $listing) {
                data {
                  id
                  title
                  date
                  startTime
                  endTime
                  contentUrl
                  venue {
                    name
                    area {
                      name
                    }
                  }
                  pick
                  isFree
                  flyerFront
                }
                totalResults
              }
            }
          `,
          variables: { listing },
        }),
      });

      if (!res.ok) {
        console.error(`[egator:ra] ${res.status}: ${await res.text()}`);
        return [];
      }

      const data = await res.json();
      const events = data.data?.listing?.data || [];

      return events.map((e: any) => ({
        id: `ra_${e.id}`,
        title: e.title || "Untitled",
        startTime: e.startTime || e.date,
        endTime: e.endTime,
        locationName: e.venue?.name,
        locationCity: e.venue?.area?.name || params.city,
        isFree: e.isFree || false,
        isVirtual: false,
        source: "ra",
        url: e.contentUrl ? `https://ra.co${e.contentUrl}` : undefined,
        imageUrl: e.flyerFront || undefined,
      }));
    } catch (err: any) {
      console.error("[egator:ra] Fetch error:", err.message);
      return [];
    }
  }
}

/** Map city names to RA area IDs */
function getAreaId(city: string): number | null {
  const map: Record<string, number> = {
    "new york": 8,
    nyc: 8,
    "los angeles": 18,
    la: 18,
    london: 13,
    berlin: 34,
    amsterdam: 29,
    paris: 44,
    barcelona: 49,
    tokyo: 127,
    "san francisco": 59,
    sf: 59,
    chicago: 15,
    miami: 28,
    detroit: 27,
    denver: 106,
    austin: 245,
    seattle: 90,
    portland: 89,
    atlanta: 17,
    ibiza: 25,
  };
  return map[city.toLowerCase()] || null;
}
