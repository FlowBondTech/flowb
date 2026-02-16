/**
 * Google Places Event Source Adapter
 * Uses Google Places API for venue-based event discovery
 */

import type { EventQuery, EventResult, EventSourceAdapter } from "../../../core/types.js";

const PLACES_API = "https://maps.googleapis.com/maps/api/place";

export class GooglePlacesAdapter implements EventSourceAdapter {
  id = "google-places";
  name = "Google Places";

  constructor(private apiKey: string) {}

  async fetchEvents(params: EventQuery): Promise<EventResult[]> {
    try {
      // Build a query for event-hosting venues
      const queryParts: string[] = [];
      if (params.danceStyle) queryParts.push(params.danceStyle);
      if (params.category) queryParts.push(params.category);
      queryParts.push("events");
      if (params.city) queryParts.push(params.city);

      const query = queryParts.join(" ");

      const res = await fetch(
        `${PLACES_API}/textsearch/json?query=${encodeURIComponent(query)}&key=${this.apiKey}`,
      );

      if (!res.ok) {
        console.error(`[egator:google-places] ${res.status}: ${await res.text()}`);
        return [];
      }

      const data = await res.json();
      const results = data.results || [];

      // Google Places returns venues, not events directly.
      // We convert venues to "venue discovery" results.
      return results
        .slice(0, Math.min(params.limit || 10, 10))
        .filter((place: any) => {
          // Filter for active/open venues
          return place.business_status === "OPERATIONAL";
        })
        .map((place: any) => ({
          id: `gp_${place.place_id}`,
          title: place.name,
          description: place.formatted_address,
          startTime: new Date().toISOString(), // Venues don't have start times
          locationName: place.name,
          locationCity: params.city || extractCity(place.formatted_address),
          isFree: true,
          isVirtual: false,
          source: "google-places",
          url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
          imageUrl: place.photos?.[0]?.photo_reference
            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${this.apiKey}`
            : undefined,
        }));
    } catch (err: any) {
      console.error("[egator:google-places] Fetch error:", err.message);
      return [];
    }
  }
}

function extractCity(address: string): string | undefined {
  // Try to extract city from "123 Main St, City, State ZIP" format
  const parts = address?.split(",") || [];
  return parts.length >= 2 ? parts[parts.length - 2]?.trim() : undefined;
}
