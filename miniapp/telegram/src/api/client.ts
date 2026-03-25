/**
 * FlowB API Client
 *
 * Handles JWT auth, request signing, and API calls for the mini app.
 */

import type {
  AuthResponse,
  EventResult,
  ScheduleEntry,
  CrewInfo,
  CrewMember,
  CrewCheckin,
  PointsInfo,
  LeaderboardEntry,
  EventSocial,
  CrewMessage,
  QRLocation,
  CrewLocation,
  Sponsorship,
  SponsorRanking,
  RankedLocation,
  FeaturedEventBoost,
  FeaturedPageData,
  AgentsResponse,
  MyAgentResponse,
} from "./types";
const API_BASE = import.meta.env.VITE_API_URL || "";

let authToken: string | null = null;

function headers(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) h["Authorization"] = `Bearer ${authToken}`;
  return h;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function post<T>(path: string, body?: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function patch<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

// ============================================================================
// Auth
// ============================================================================

export function setToken(token: string) {
  authToken = token;
}

export function getToken(): string | null {
  return authToken;
}

export async function authTelegram(initData: string): Promise<AuthResponse> {
  const data = await post<AuthResponse>("/api/v1/auth/telegram", { initData });
  authToken = data.token;
  return data;
}

export async function authFarcaster(message: string, signature: string): Promise<AuthResponse> {
  const data = await post<AuthResponse>("/api/v1/auth/farcaster", { message, signature });
  authToken = data.token;
  return data;
}

// ============================================================================
// Guest Auth
// ============================================================================

export interface GuestSession {
  guestToken: string;
  expiresAt: string;
  crew?: {
    id: string;
    name: string;
    emoji: string;
    member_count?: number;
  };
}

export interface GuestCrewInfo {
  id: string;
  name: string;
  emoji: string;
  join_code: string;
}

export async function createGuestSession(joinCode?: string): Promise<GuestSession> {
  return post<GuestSession>("/api/v1/auth/guest", { joinCode });
}

export async function joinCrewAsGuest(guestToken: string, joinCode: string): Promise<GuestCrewInfo | null> {
  const data = await post<{ crew: GuestCrewInfo | null }>("/api/v1/auth/guest/join-crew", { guestToken, joinCode });
  return data.crew;
}

export async function getGuestCrews(guestToken: string): Promise<GuestCrewInfo[]> {
  const data = await post<{ crews: GuestCrewInfo[] }>("/api/v1/auth/guest/crews", { guestToken });
  return data.crews;
}

export async function convertGuestToUser(
  guestToken: string,
  authMethod: string,
  authData: { accessToken?: string; initData?: string; fcMessage?: string; fcSignature?: string },
): Promise<{ ok: boolean; token: string; user: { id: string; platform: string }; mergedData: { crewsJoined: number; pointsAwarded: number } }> {
  const data = await post<any>("/api/v1/auth/guest/convert", { guestToken, authMethod, ...authData });
  if (data.token) {
    authToken = data.token;
  }
  return data;
}

// ============================================================================
// Events
// ============================================================================

export async function getEvents(city = "Austin", limit = 50, categories?: string[]): Promise<EventResult[]> {
  let path = `/api/v1/events?city=${encodeURIComponent(city)}&limit=${limit}`;
  if (categories && categories.length > 0) {
    path += `&categories=${encodeURIComponent(categories.join(","))}`;
  }
  const data = await get<{ events: EventResult[] }>(path);
  return data.events;
}

export async function getEvent(id: string): Promise<{ event: EventResult; flow: { going: string[]; maybe: string[] } }> {
  return get(`/api/v1/events/${encodeURIComponent(id)}`);
}

export async function getEventSocial(id: string): Promise<EventSocial> {
  return get(`/api/v1/events/${encodeURIComponent(id)}/social`);
}

export async function rsvpEvent(id: string, status: "going" | "maybe" = "going"): Promise<any> {
  return post(`/api/v1/events/${encodeURIComponent(id)}/rsvp`, { status });
}

export async function cancelRsvp(id: string): Promise<any> {
  return del(`/api/v1/events/${encodeURIComponent(id)}/rsvp`);
}

// ============================================================================
// Schedule
// ============================================================================

export async function getSchedule(): Promise<ScheduleEntry[]> {
  const data = await get<{ schedule: ScheduleEntry[] }>("/api/v1/me/schedule");
  return data.schedule;
}

export async function checkinScheduleEntry(id: string): Promise<any> {
  return post(`/api/v1/me/schedule/${encodeURIComponent(id)}/checkin`);
}

// ============================================================================
// Flow - Crews
// ============================================================================

export async function getCrews(): Promise<CrewInfo[]> {
  const data = await get<{ crews: CrewInfo[] }>("/api/v1/flow/crews");
  return data.crews;
}

export async function createCrew(name: string, emoji?: string): Promise<any> {
  return post("/api/v1/flow/crews", { name, emoji });
}

export async function joinCrew(joinCode: string): Promise<any> {
  return post(`/api/v1/flow/crews/${encodeURIComponent(joinCode)}/join`, { joinCode });
}

export async function getCrewMembers(crewId: string): Promise<{ members: CrewMember[]; checkins: CrewCheckin[] }> {
  return get(`/api/v1/flow/crews/${encodeURIComponent(crewId)}/members`);
}

export async function crewCheckin(
  crewId: string,
  venueName: string,
  opts?: { eventId?: string; status?: string; message?: string },
): Promise<any> {
  return post(`/api/v1/flow/crews/${encodeURIComponent(crewId)}/checkin`, {
    venueName,
    ...opts,
  });
}

export async function getCrewLeaderboard(crewId: string): Promise<LeaderboardEntry[]> {
  const data = await get<{ leaderboard: LeaderboardEntry[] }>(
    `/api/v1/flow/crews/${encodeURIComponent(crewId)}/leaderboard`,
  );
  return data.leaderboard;
}

// ============================================================================
// Flow - Crew Messages
// ============================================================================

export async function getCrewMessages(crewId: string, limit = 50, before?: string): Promise<CrewMessage[]> {
  let path = `/api/v1/flow/crews/${encodeURIComponent(crewId)}/messages?limit=${limit}`;
  if (before) path += `&before=${encodeURIComponent(before)}`;
  const data = await get<{ messages: CrewMessage[] }>(path);
  return data.messages;
}

export async function sendCrewMessage(crewId: string, message: string, replyTo?: string): Promise<CrewMessage> {
  const data = await post<{ message: CrewMessage }>(`/api/v1/flow/crews/${encodeURIComponent(crewId)}/messages`, { message, replyTo });
  return data.message;
}

// ============================================================================
// Flow - Friends
// ============================================================================

export async function getFriends(): Promise<any[]> {
  const data = await get<{ friends: any[] }>("/api/v1/flow/friends");
  return data.friends;
}

export async function connectFriend(code: string): Promise<any> {
  return post("/api/v1/flow/connect", { code });
}

export async function getInviteLink(): Promise<string> {
  const data = await get<{ link: string }>("/api/v1/flow/invite");
  return data.link;
}

// ============================================================================
// Points
// ============================================================================

export async function getPoints(): Promise<PointsInfo> {
  return get("/api/v1/me/points");
}

// ============================================================================
// Claim Pending Points (pre-auth actions)
// ============================================================================

export async function claimPendingPoints(
  actions: Array<{ action: string; ts: number }>,
): Promise<{ claimed: number; total: number }> {
  return post("/api/v1/auth/claim-points", { actions });
}

// ============================================================================
// Preferences
// ============================================================================

export async function updatePreferences(data: {
  arrival_date?: string;
  interest_categories?: string[];
  onboarding_complete?: boolean;
  home_city?: string;
  home_country?: string;
  current_city?: string;
  current_country?: string;
  destination_city?: string;
  destination_country?: string;
  locale?: string;
  location_visibility?: string;
}): Promise<any> {
  return patch("/api/v1/me/preferences", data);
}

// ============================================================================
// Flow - Crew Management
// ============================================================================

export async function leaveCrew(crewId: string): Promise<any> {
  return del(`/api/v1/flow/crews/${encodeURIComponent(crewId)}/leave`);
}

export async function discoverCrews(): Promise<any[]> {
  const data = await get<{ crews: any[] }>("/api/v1/flow/crews/discover");
  return data.crews;
}

export async function removeMember(crewId: string, userId: string): Promise<any> {
  return del(`/api/v1/flow/crews/${encodeURIComponent(crewId)}/members/${encodeURIComponent(userId)}`);
}

export async function updateMemberRole(crewId: string, userId: string, role: string): Promise<any> {
  return patch(`/api/v1/flow/crews/${encodeURIComponent(crewId)}/members/${encodeURIComponent(userId)}`, { role });
}

export async function updateCrew(crewId: string, data: { name?: string; emoji?: string; description?: string }): Promise<any> {
  return patch(`/api/v1/flow/crews/${encodeURIComponent(crewId)}`, data);
}

export async function getCrewActivity(crewId: string): Promise<any[]> {
  const data = await get<{ activity: any[] }>(`/api/v1/flow/crews/${encodeURIComponent(crewId)}/activity`);
  return data.activity;
}

// ============================================================================
// Flow - QR Locations & Crew GPS
// ============================================================================

export async function resolveLocation(code: string): Promise<QRLocation> {
  return get(`/api/v1/locations/${encodeURIComponent(code)}`);
}

export async function qrCheckin(locationCode: string, crewId?: string): Promise<any> {
  return post("/api/v1/flow/checkin/qr", { locationCode, crewId });
}

export async function getCrewLocations(crewId: string): Promise<CrewLocation[]> {
  const data = await get<{ locations: CrewLocation[] }>(
    `/api/v1/flow/crews/${encodeURIComponent(crewId)}/locations`,
  );
  return data.locations;
}

export async function pingCrewLocate(crewId: string): Promise<{ pinged: number }> {
  return post(`/api/v1/flow/crews/${encodeURIComponent(crewId)}/locate`);
}

// ============================================================================
// Event Boost Auction
// ============================================================================

export interface BoostStatus {
  cycle: {
    cycleId: number;
    cycleNumber: number;
    endsAt: string;
    minBidUsdc: number;
    highestBidUsdc: number;
    highestBidderUserId: string | null;
    winningEventUrl: string | null;
    winningEventName: string | null;
    timeRemainingSeconds: number;
  };
  minNextBid: number;
  wallet: string;
  network: string;
  paymentMethods: string[];
}

export interface BoostCheckoutResult {
  method: string;
  sponsorshipId?: string;
  orderId?: string;
  wallet?: string;
  network?: string;
  chainId?: number;
  amountUsdc: number;
  clientSecret?: string;
  stripePublishableKey?: string;
  message?: string;
}

export async function getBoostStatus(): Promise<BoostStatus> {
  return get<BoostStatus>("/api/v1/boost/status");
}

export async function getSponsorWallet(): Promise<string> {
  const data = await get<{ address: string; network: string }>("/api/v1/boost/wallet");
  return data.address;
}

export async function createBoostCheckout(
  eventUrl: string,
  amountUsdc: number,
  paymentMethod: "crypto" | "stripe" | "apple_pay",
  eventName?: string,
): Promise<BoostCheckoutResult> {
  return post<BoostCheckoutResult>("/api/v1/boost/checkout", { eventUrl, eventName, amountUsdc, paymentMethod });
}

export async function confirmCryptoBoost(sponsorshipId: string, txHash: string): Promise<{ success: boolean; message: string }> {
  return post<{ success: boolean; message: string }>("/api/v1/boost/confirm-crypto", { sponsorshipId, txHash });
}

export async function confirmStripeBoost(orderId: string, paymentIntentId: string): Promise<{ success: boolean; message: string }> {
  return post<{ success: boolean; message: string }>("/api/v1/boost/confirm-stripe", { orderId, paymentIntentId });
}

export async function getFeaturedEventBoost(): Promise<FeaturedEventBoost | null> {
  // Try boost status endpoint first
  try {
    const status = await getBoostStatus();
    if (status.cycle.winningEventUrl) {
      return {
        target_id: status.cycle.winningEventUrl,
        event_name: status.cycle.winningEventName || undefined,
        amount_usdc: status.cycle.highestBidUsdc,
        ends_at: status.cycle.endsAt,
        time_remaining_seconds: status.cycle.timeRemainingSeconds,
      };
    }
  } catch {
    // Fall through to sponsor endpoint
  }

  // Fallback to sponsor featured-event endpoint
  try {
    const data = await get<{ featured: FeaturedEventBoost | null }>("/api/v1/sponsor/featured-event");
    return data.featured || null;
  } catch {
    return null;
  }
}

// ============================================================================
// Featured Page
// ============================================================================

export async function getFeaturedPageData(): Promise<FeaturedPageData> {
  return get<FeaturedPageData>("/api/v1/featured");
}

export async function setAdminFeaturedEvent(eventUrl: string | null): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>("/api/v1/admin/featured-event", { eventUrl });
}

// Legacy function for backwards compatibility
export async function createSponsorship(
  targetType: "event" | "location" | "featured_event",
  targetId: string,
  amountUsdc: number,
  txHash: string,
): Promise<{ ok: boolean; sponsorship: Sponsorship }> {
  // Use new boost checkout for featured_event
  if (targetType === "featured_event") {
    const checkout = await createBoostCheckout(targetId, amountUsdc, "crypto");
    if (checkout.sponsorshipId) {
      const result = await confirmCryptoBoost(checkout.sponsorshipId, txHash);
      return {
        ok: result.success,
        sponsorship: {
          id: checkout.sponsorshipId,
          target_type: targetType,
          target_id: targetId,
          amount_usdc: amountUsdc,
          status: result.success ? "verified" : "pending",
        } as Sponsorship,
      };
    }
  }
  // Fallback to old endpoint for other types
  return post<{ ok: boolean; sponsorship: Sponsorship }>("/api/v1/sponsor", { targetType, targetId, amountUsdc, txHash });
}

export async function getSponsorRankings(targetType?: string): Promise<SponsorRanking[]> {
  const path = targetType
    ? `/api/v1/sponsor/rankings?targetType=${encodeURIComponent(targetType)}`
    : "/api/v1/sponsor/rankings";
  const data = await get<{ rankings: SponsorRanking[] }>(path);
  return data.rankings;
}

export async function getRankedLocations(): Promise<RankedLocation[]> {
  const data = await get<{ locations: RankedLocation[] }>("/api/v1/locations/ranked");
  return data.locations;
}

export async function proximityCheckin(
  latitude: number,
  longitude: number,
  crewId?: string,
): Promise<{ matched: Array<{ id: string; code: string; name: string; distance_m: number; sponsored: boolean }>; checkins: number }> {
  return post("/api/v1/flow/checkin/proximity", { latitude, longitude, crewId });
}

export async function universalCheckin(params: {
  venue: string;
  status?: string;
  message?: string;
  eventId?: string;
  latitude?: number;
  longitude?: number;
}): Promise<any> {
  // If we have GPS coords, use proximity checkin first
  if (params.latitude && params.longitude) {
    return post("/api/v1/flow/checkin/proximity", {
      latitude: params.latitude,
      longitude: params.longitude,
    });
  }
  // Fallback: post to schedule checkin if eventId provided
  if (params.eventId) {
    return post(`/api/v1/me/schedule/${params.eventId}/checkin`, {
      venue: params.venue,
      status: params.status,
      message: params.message,
    });
  }
  // Generic: use proximity with 0,0 as fallback (server handles gracefully)
  return post("/api/v1/flow/checkin/proximity", { latitude: 0, longitude: 0 });
}

// ============================================================================
// Agents
// ============================================================================

export async function getAgents(): Promise<AgentsResponse> {
  return get("/api/v1/agents");
}

export async function getMyAgent(): Promise<MyAgentResponse> {
  return get("/api/v1/agents/me");
}

export async function claimAgent(agentName?: string): Promise<any> {
  return post("/api/v1/agents/claim", { agentName });
}

export async function purchaseSkill(skillSlug: string): Promise<any> {
  return post("/api/v1/agents/skills/purchase", { skillSlug });
}

export async function boostEvent(eventId: string): Promise<any> {
  return post("/api/v1/agents/boost-event", { eventId });
}

export async function tipAgent(recipientUserId: string, amount: number, message?: string): Promise<any> {
  return post("/api/v1/agents/tip", { recipientUserId, amount, message });
}

export async function getAgentTransactions(limit = 20): Promise<any> {
  return get(`/api/v1/agents/transactions?limit=${limit}`);
}

// ============================================================================
// Product Checkout
// ============================================================================

export interface CheckoutIntent {
  orderId: string;
  method: string;
  amountUsdc: number;
  expiresAt: string;
  // Crypto payments
  paymentAddress?: string;
  network?: string;
  chainId?: number;
  // Stripe payments
  clientSecret?: string;
  stripePublishableKey?: string;
  stripeCheckoutUrl?: string;
  // Telegram Stars payments
  telegramInvoiceUrl?: string;
  starsAmount?: number;
}

export interface CheckoutConfirmResult {
  success: boolean;
  order?: any;
  error?: string;
}

export async function createCheckout(data: {
  productSlug: string;
  paymentMethod: string;
  network?: string;
  metadata?: Record<string, any>;
}): Promise<CheckoutIntent> {
  const result = await post<{ paymentIntent: CheckoutIntent }>("/api/v1/checkout/create", data);
  return result.paymentIntent;
}

export async function confirmCheckout(data: {
  orderId: string;
  paymentIntentId?: string;
  txHash?: string;
  senderAddress?: string;
}): Promise<CheckoutConfirmResult> {
  return post<CheckoutConfirmResult>("/api/v1/checkout/confirm", data);
}

// ============================================================================
// Event Submission
// ============================================================================

export async function submitEvent(data: {
  title?: string;
  url?: string;
  startTime?: string;
  endTime?: string;
  venue?: string;
  city?: string;
  description?: string;
  isFree?: boolean;
}): Promise<{ ok: boolean; message: string; eventId?: string }> {
  return post("/api/v1/events/submit", data);
}

// ============================================================================
// AI Chat
// ============================================================================

// ============================================================================
// Feedback
// ============================================================================

export async function submitFeedback(data: {
  type: "bug" | "feature" | "feedback";
  message: string;
  contact?: string;
  screen?: string;
}): Promise<{ ok: boolean; id: string | null }> {
  return post<{ ok: boolean; id: string | null }>("/api/v1/feedback", data);
}

// ============================================================================
// AI Chat
// ============================================================================

export async function sendChat(
  messages: Array<{ role: string; content: string }>,
  userId?: string,
): Promise<string> {
  const CHAT_URL = import.meta.env.VITE_API_URL || "https://flowb.fly.dev";
  const res = await fetch(`${CHAT_URL}/v1/chat/completions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: "flowb",
      messages,
      stream: false,
      user: userId || "telegram-anon",
    }),
  });
  if (!res.ok) throw new Error(`FlowB chat returned ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "Sorry, I couldn't process that.";
}
