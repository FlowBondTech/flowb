/**
 * Luma Event Source Adapter (Enhanced)
 *
 * Two-tier approach:
 *   1. Unofficial Discover API  - public Denver event search (no auth needed)
 *   2. Official API (v1)        - rich event details, RSVP, tickets, guests
 *
 * Official API requires LUMA_API_KEY (Luma Plus subscription).
 * If only discover API is available, we still get basic event listing.
 */

import type { EventQuery, EventResult, EventSourceAdapter } from "../../../core/types.js";

// Unofficial public discover endpoint (no auth, paginated)
const LUMA_DISCOVER_API = "https://api.lu.ma";

// Official API (requires x-luma-api-key)
const LUMA_OFFICIAL_API = "https://public-api.luma.com";

// ============================================================================
// Rich Luma types (beyond base EventResult)
// ============================================================================

export interface LumaTicketType {
  id: string;
  name: string;
  type: "free" | "fiat-price";
  cents?: number;
  currency?: string;
  maxCapacity?: number;
  isHidden?: boolean;
  tokenRequirements?: any;
}

export interface LumaGuest {
  id: string;
  userName?: string;
  userEmail?: string;
  approvalStatus: string;
  ethAddress?: string;
  solanaAddress?: string;
  checkInQrCode?: string;
  registrationAnswers?: any[];
}

export interface LumaEventDetail {
  id: string;
  name: string;
  descriptionMd?: string;
  startAt: string;
  endAt?: string;
  timezone?: string;
  geoAddress?: string;
  geoLatitude?: number;
  geoLongitude?: number;
  coverUrl?: string;
  url?: string;
  visibility?: string;
  meetingUrl?: string;
  registrationQuestions?: any[];
  ticketTypes?: LumaTicketType[];
  guestCount?: number;
}

// ============================================================================
// Adapter
// ============================================================================

export class LumaAdapter implements EventSourceAdapter {
  id = "luma";
  name = "Luma";

  constructor(private apiKey: string) {}

  private get hasOfficialKey(): boolean {
    return !!this.apiKey && this.apiKey.length > 10;
  }

  // --------------------------------------------------------------------------
  // EventSourceAdapter: fetchEvents (uses discover API for broad search)
  // --------------------------------------------------------------------------

  async fetchEvents(params: EventQuery): Promise<EventResult[]> {
    try {
      const queryParams = new URLSearchParams();
      // Denver coordinates for geo-based discover
      if (params.city?.toLowerCase() === "denver") {
        queryParams.set("geo_latitude", "39.7392");
        queryParams.set("geo_longitude", "-104.9903");
      }
      if (params.limit) queryParams.set("pagination_limit", String(Math.min(params.limit, 50)));

      const res = await fetch(`${LUMA_DISCOVER_API}/discover/get-paginated-events?${queryParams}`);

      if (!res.ok) {
        console.error(`[luma] Discover ${res.status}: ${await res.text()}`);
        return [];
      }

      const data = await res.json();
      const entries = data.entries || data.events || [];

      return entries.map((entry: any) => {
        const e = entry.event || entry;
        const geo = e.geo_address_info || {};
        const coord = e.coordinate || {};
        const cal = entry.calendar || {};
        return {
          id: `luma_${e.api_id || e.id}`,
          sourceEventId: e.api_id || e.id,
          title: e.name || "Untitled",
          description: e.description?.substring(0, 500) || e.description_md?.substring(0, 500),
          startTime: e.start_at,
          endTime: e.end_at,
          locationName: geo.address || geo.short_address || geo.city_state,
          locationCity: geo.city || params.city,
          latitude: coord.latitude || undefined,
          longitude: coord.longitude || undefined,
          isFree: e.location_type !== "offline" ? undefined : true,
          isVirtual: e.location_type === "online",
          virtualUrl: e.virtual_info?.has_access ? e.meeting_url : undefined,
          source: "luma",
          url: e.url ? `https://lu.ma/${e.url}` : `https://lu.ma/${e.api_id || e.id}`,
          imageUrl: e.cover_url || undefined,
          coverUrl: e.cover_url || undefined,
          organizerName: cal.name || undefined,
          organizerUrl: cal.api_id ? `https://lu.ma/${cal.slug || cal.api_id}` : undefined,
          rsvpCount: entry.guest_count || undefined,
          tags: e.tags || [],
        };
      });
    } catch (err: any) {
      console.error("[luma] Discover fetch error:", err.message);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // Official API: Get event detail by ID or slug
  // --------------------------------------------------------------------------

  async getEventDetail(eventId: string): Promise<LumaEventDetail | null> {
    if (!this.hasOfficialKey) return null;

    try {
      // Try by event ID first
      let url = `${LUMA_OFFICIAL_API}/v1/event/get?id=${encodeURIComponent(eventId)}`;

      const res = await fetch(url, {
        headers: { "x-luma-api-key": this.apiKey },
      });

      if (!res.ok) {
        // Maybe it's a slug - try entity lookup
        if (res.status === 404 || res.status === 400) {
          return this.getEventBySlug(eventId);
        }
        console.error(`[luma] Event detail ${res.status}`);
        return null;
      }

      const data = await res.json();
      const e = data.event || data;

      return {
        id: e.api_id || e.id,
        name: e.name,
        descriptionMd: e.description_md || e.description,
        startAt: e.start_at,
        endAt: e.end_at,
        timezone: e.timezone,
        geoAddress: e.geo_address_json?.full_address || e.geo_address_info?.city_state,
        geoLatitude: e.geo_latitude,
        geoLongitude: e.geo_longitude,
        coverUrl: e.cover_url,
        url: e.url,
        visibility: e.visibility,
        meetingUrl: e.meeting_url,
        registrationQuestions: e.registration_questions,
      };
    } catch (err: any) {
      console.error("[luma] Event detail error:", err.message);
      return null;
    }
  }

  /** Lookup event by slug via entity lookup */
  private async getEventBySlug(slug: string): Promise<LumaEventDetail | null> {
    if (!this.hasOfficialKey) return null;
    try {
      const res = await fetch(
        `${LUMA_OFFICIAL_API}/v1/entity/lookup?slug=${encodeURIComponent(slug)}`,
        { headers: { "x-luma-api-key": this.apiKey } },
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (data.type === "event" && data.data?.api_id) {
        return this.getEventDetail(data.data.api_id);
      }
      return null;
    } catch {
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Official API: Ticket Types
  // --------------------------------------------------------------------------

  async getTicketTypes(eventId: string): Promise<LumaTicketType[]> {
    if (!this.hasOfficialKey) return [];

    try {
      const res = await fetch(
        `${LUMA_OFFICIAL_API}/v1/event/ticket-types/list?event_id=${encodeURIComponent(eventId)}`,
        { headers: { "x-luma-api-key": this.apiKey } },
      );
      if (!res.ok) return [];

      const data = await res.json();
      const types = data.ticket_types || data.data || [];

      return types.map((t: any) => ({
        id: t.api_id || t.id,
        name: t.name,
        type: t.type || "free",
        cents: t.cents || undefined,
        currency: t.currency || "USD",
        maxCapacity: t.max_capacity || undefined,
        isHidden: t.is_hidden || false,
        tokenRequirements: t.ethereum_token_requirements || undefined,
      }));
    } catch (err: any) {
      console.error("[luma] Ticket types error:", err.message);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // Official API: Guests (who's going)
  // --------------------------------------------------------------------------

  async getGuests(
    eventId: string,
    opts?: { status?: string; limit?: number },
  ): Promise<{ guests: LumaGuest[]; total: number }> {
    if (!this.hasOfficialKey) return { guests: [], total: 0 };

    try {
      const params = new URLSearchParams({ event_id: eventId });
      if (opts?.status) params.set("approval_status", opts.status);
      if (opts?.limit) params.set("pagination_limit", String(opts.limit));
      params.set("sort_column", "created_at");
      params.set("sort_direction", "desc");

      const res = await fetch(
        `${LUMA_OFFICIAL_API}/v1/event/get-guests?${params}`,
        { headers: { "x-luma-api-key": this.apiKey } },
      );
      if (!res.ok) return { guests: [], total: 0 };

      const data = await res.json();
      const entries = data.entries || [];

      const guests: LumaGuest[] = entries.map((entry: any) => {
        const g = entry.guest || entry;
        return {
          id: g.api_id || g.id,
          userName: g.user_name || entry.user?.name,
          userEmail: g.user_email,
          approvalStatus: g.approval_status || "approved",
          ethAddress: g.eth_address || undefined,
          solanaAddress: g.solana_address || undefined,
          checkInQrCode: g.check_in_qr_code || undefined,
          registrationAnswers: g.registration_answers || undefined,
        };
      });

      return { guests, total: data.total_count || guests.length };
    } catch (err: any) {
      console.error("[luma] Guests error:", err.message);
      return { guests: [], total: 0 };
    }
  }

  // --------------------------------------------------------------------------
  // Official API: RSVP / Add Guest
  // --------------------------------------------------------------------------

  async addGuest(
    eventId: string,
    email: string,
    name?: string,
  ): Promise<{ success: boolean; guestId?: string; error?: string }> {
    if (!this.hasOfficialKey) return { success: false, error: "No API key" };

    try {
      const res = await fetch(`${LUMA_OFFICIAL_API}/v1/event/add-guests`, {
        method: "POST",
        headers: {
          "x-luma-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: eventId,
          guests: [{ email, name: name || email.split("@")[0] }],
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`[luma] Add guest failed: ${res.status} ${text}`);
        return { success: false, error: `Luma API error: ${res.status}` };
      }

      const data = await res.json();
      const guestId = data.guests?.[0]?.api_id || data.guests?.[0]?.id;
      console.log(`[luma] Guest added to ${eventId}: ${email}`);
      return { success: true, guestId };
    } catch (err: any) {
      console.error("[luma] Add guest error:", err.message);
      return { success: false, error: err.message };
    }
  }

  // --------------------------------------------------------------------------
  // Official API: Calendar events (your hosted events)
  // --------------------------------------------------------------------------

  async getCalendarEvents(opts?: {
    after?: string;
    before?: string;
    limit?: number;
  }): Promise<EventResult[]> {
    if (!this.hasOfficialKey) return [];

    try {
      const params = new URLSearchParams();
      params.set("sort_column", "start_at");
      params.set("sort_direction", "asc");
      if (opts?.after) params.set("after", opts.after);
      if (opts?.before) params.set("before", opts.before);
      if (opts?.limit) params.set("pagination_limit", String(opts.limit));

      const res = await fetch(
        `${LUMA_OFFICIAL_API}/v1/calendar/list-events?${params}`,
        { headers: { "x-luma-api-key": this.apiKey } },
      );
      if (!res.ok) return [];

      const data = await res.json();
      const entries = data.entries || [];

      return entries.map((entry: any) => {
        const e = entry.event || entry;
        return {
          id: `luma_${e.api_id || e.id}`,
          sourceEventId: e.api_id || e.id,
          title: e.name || "Untitled",
          description: e.description_md || e.description,
          startTime: e.start_at,
          endTime: e.end_at,
          locationName: e.geo_address_json?.full_address || e.geo_address_info?.city_state,
          locationCity: e.geo_address_json?.city,
          latitude: e.geo_latitude,
          longitude: e.geo_longitude,
          isFree: true,
          isVirtual: !!e.meeting_url,
          virtualUrl: e.meeting_url,
          source: "luma",
          url: e.url || `https://lu.ma/${e.api_id || e.id}`,
          imageUrl: e.cover_url,
          coverUrl: e.cover_url,
          rsvpCount: entry.guest_count || undefined,
        };
      });
    } catch (err: any) {
      console.error("[luma] Calendar events error:", err.message);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // Official API: Lookup event by URL
  // --------------------------------------------------------------------------

  async lookupEventByUrl(lumaUrl: string): Promise<LumaEventDetail | null> {
    if (!this.hasOfficialKey) return null;

    try {
      const res = await fetch(
        `${LUMA_OFFICIAL_API}/v1/calendar/lookup-event?url=${encodeURIComponent(lumaUrl)}`,
        { headers: { "x-luma-api-key": this.apiKey } },
      );
      if (!res.ok) return null;

      const data = await res.json();
      const e = data.event || data;
      if (!e.api_id && !e.id) return null;

      return {
        id: e.api_id || e.id,
        name: e.name,
        descriptionMd: e.description_md,
        startAt: e.start_at,
        endAt: e.end_at,
        timezone: e.timezone,
        geoAddress: e.geo_address_json?.full_address,
        geoLatitude: e.geo_latitude,
        geoLongitude: e.geo_longitude,
        coverUrl: e.cover_url,
        url: e.url,
        visibility: e.visibility,
        meetingUrl: e.meeting_url,
      };
    } catch {
      return null;
    }
  }
}
