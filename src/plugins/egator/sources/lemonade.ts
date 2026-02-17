/**
 * Lemonade.social Event Source Adapter
 * Fetches events from lemonade.social GraphQL API
 */

import type { EventQuery, EventResult, EventSourceAdapter } from "../../../core/types.js";

const LEMONADE_GQL = "https://backend.lemonade.social/graphql";

const EVENTS_QUERY = `
  query GetEvents($space: MongoID, $limit: Int, $skip: Int, $search: String, $start_from: DateTimeISO) {
    getEvents(space: $space, limit: $limit, skip: $skip, search: $search, start_from: $start_from) {
      _id
      title
      slug
      start
      end
      virtual
      cost
      currency
      description_plain_text
      url
      address {
        title
        city
        region
        street_1
        latitude
        longitude
      }
    }
  }
`;

export class LemonadeAdapter implements EventSourceAdapter {
  id = "lemonade";
  name = "Lemonade";

  constructor(private spaceId: string) {}

  async fetchEvents(params: EventQuery): Promise<EventResult[]> {
    try {
      const variables: Record<string, any> = {
        space: this.spaceId,
        limit: Math.min(params.limit || 20, 50),
        skip: 0,
        start_from: new Date().toISOString(),
      };

      if (params.category) variables.search = params.category;

      const res = await fetch(LEMONADE_GQL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: EVENTS_QUERY, variables }),
      });

      if (!res.ok) {
        console.error(`[egator:lemonade] ${res.status}: ${await res.text()}`);
        return [];
      }

      const data = await res.json();
      if (data.errors) {
        console.error("[egator:lemonade] GraphQL errors:", data.errors);
        return [];
      }

      const events = data.data?.getEvents || [];

      return events.map((e: any) => ({
        id: `lemonade_${e._id}`,
        title: e.title || "Untitled",
        description: e.description_plain_text?.substring(0, 300),
        startTime: e.start,
        endTime: e.end,
        locationName: e.address?.title || e.address?.street_1,
        locationCity: e.address?.city || params.city,
        isFree: !e.cost || e.cost === 0,
        price: e.cost ? Number(e.cost) : undefined,
        isVirtual: e.virtual || false,
        source: "lemonade",
        url: e.url || `https://lemonade.social/event/${e._id}/${e.slug}`,
      }));
    } catch (err: any) {
      console.error("[egator:lemonade] Fetch error:", err.message);
      return [];
    }
  }
}
