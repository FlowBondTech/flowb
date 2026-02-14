/**
 * Meetup Event Source Adapter
 * Fetches events from Meetup's public GraphQL API (no auth required)
 */

import type { EventQuery, EventResult, EventSourceAdapter } from "../../../core/types.js";

const MEETUP_GQL = "https://www.meetup.com/gql";

export class MeetupAdapter implements EventSourceAdapter {
  id = "meetup";
  name = "Meetup";

  async fetchEvents(params: EventQuery): Promise<EventResult[]> {
    try {
      const queryParts: string[] = [];
      if (params.danceStyle) queryParts.push(params.danceStyle);
      if (params.category) queryParts.push(params.category);
      if (!queryParts.length) queryParts.push("events");

      const variables: Record<string, any> = {
        first: Math.min(params.limit || 10, 20),
        query: queryParts.join(" "),
        startDateRange: new Date().toISOString(),
      };

      if (params.city) {
        variables.city = params.city;
      }

      const res = await fetch(MEETUP_GQL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            query SearchEvents($query: String!, $first: Int, $startDateRange: ZonedDateTime) {
              searchEvents(input: { query: $query, first: $first, startDateRange: $startDateRange }) {
                edges {
                  node {
                    id
                    title
                    description
                    dateTime
                    endTime
                    eventUrl
                    venue {
                      name
                      city
                    }
                    feeSettings {
                      amount
                      currency
                    }
                    isOnline
                    group {
                      name
                    }
                  }
                }
              }
            }
          `,
          variables,
        }),
      });

      if (!res.ok) {
        console.error(`[egator:meetup] ${res.status}: ${await res.text()}`);
        return [];
      }

      const data = await res.json();
      const edges = data.data?.searchEvents?.edges || [];

      return edges.map((edge: any) => {
        const e = edge.node;
        return {
          id: `meetup_${e.id}`,
          title: e.title || "Untitled",
          description: e.description?.substring(0, 300),
          startTime: e.dateTime,
          endTime: e.endTime,
          locationName: e.venue?.name || e.group?.name,
          locationCity: e.venue?.city || params.city,
          isFree: !e.feeSettings?.amount,
          price: e.feeSettings?.amount ? Number(e.feeSettings.amount) : undefined,
          isVirtual: e.isOnline || false,
          source: "meetup",
          url: e.eventUrl,
        };
      });
    } catch (err: any) {
      console.error("[egator:meetup] Fetch error:", err.message);
      return [];
    }
  }
}
