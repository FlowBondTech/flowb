/**
 * FlowB API Client for WhatsApp Mini App
 *
 * Handles HMAC auth flow (phone + timestamp + signature) and API calls.
 */

import type {
  AuthResponse,
  EventResult,
  ScheduleEntry,
  CrewInfo,
  PointsInfo,
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

// ============================================================================
// Auth
// ============================================================================

export function setToken(token: string) {
  authToken = token;
}

export function getToken(): string | null {
  return authToken;
}

/**
 * Authenticate using WhatsApp HMAC params from URL.
 * Bot sends: wa.flowb.me?phone={phone}&ts={timestamp}&sig={hmac}
 */
export async function authWhatsApp(
  phone: string,
  ts: string,
  sig: string,
): Promise<AuthResponse> {
  const data = await post<AuthResponse>("/api/v1/auth/whatsapp", {
    phone,
    ts,
    sig,
  });
  authToken = data.token;
  return data;
}

// ============================================================================
// Events
// ============================================================================

export async function getEvents(
  city = "Austin",
  limit = 50,
  categories?: string[],
): Promise<EventResult[]> {
  let path = `/api/v1/events?city=${encodeURIComponent(city)}&limit=${limit}`;
  if (categories?.length) {
    path += `&categories=${encodeURIComponent(categories.join(","))}`;
  }
  const data = await get<{ events: EventResult[] }>(path);
  return data.events;
}

export async function getEvent(
  id: string,
): Promise<{ event: EventResult; flow: { going: string[]; maybe: string[] } }> {
  return get(`/api/v1/events/${encodeURIComponent(id)}`);
}

export async function rsvpEvent(
  id: string,
  status: "going" | "maybe" = "going",
): Promise<any> {
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

// ============================================================================
// Crews
// ============================================================================

export async function getCrews(): Promise<CrewInfo[]> {
  const data = await get<{ crews: CrewInfo[] }>("/api/v1/flow/crews");
  return data.crews;
}

export async function joinCrew(joinCode: string): Promise<any> {
  return post(`/api/v1/flow/crews/${encodeURIComponent(joinCode)}/join`, {
    joinCode,
  });
}

// ============================================================================
// Points
// ============================================================================

export async function getPoints(): Promise<PointsInfo> {
  return get("/api/v1/me/points");
}

// ============================================================================
// Friends
// ============================================================================

export async function getFriends(): Promise<any[]> {
  const data = await get<{ friends: any[] }>("/api/v1/flow/friends");
  return data.friends;
}

export async function getInviteLink(): Promise<string> {
  const data = await get<{ link: string }>("/api/v1/flow/invite");
  return data.link;
}
