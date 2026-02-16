/**
 * FlowB API Client - Farcaster Mini App
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
  PreferencesData,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

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

async function patch<T>(path: string, body?: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE", headers: headers() });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export function setToken(token: string) { authToken = token; }
export function getToken(): string | null { return authToken; }

export async function authFarcaster(message: string, signature: string): Promise<AuthResponse> {
  const data = await post<AuthResponse>("/api/v1/auth/farcaster", { message, signature });
  authToken = data.token;
  return data;
}

export async function authFarcasterQuick(quickAuthToken: string): Promise<AuthResponse> {
  const data = await post<AuthResponse>("/api/v1/auth/farcaster", { quickAuthToken });
  authToken = data.token;
  return data;
}

export async function getEvents(city = "Denver", limit = 20, categories?: string[]): Promise<EventResult[]> {
  let url = `/api/v1/events?city=${encodeURIComponent(city)}&limit=${limit}`;
  if (categories && categories.length > 0) {
    url += `&categories=${encodeURIComponent(categories.join(","))}`;
  }
  const data = await get<{ events: EventResult[] }>(url);
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

export async function getSchedule(): Promise<ScheduleEntry[]> {
  const data = await get<{ schedule: ScheduleEntry[] }>("/api/v1/me/schedule");
  return data.schedule;
}

export async function checkinScheduleEntry(id: string): Promise<any> {
  return post(`/api/v1/me/schedule/${encodeURIComponent(id)}/checkin`);
}

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

export async function crewCheckin(crewId: string, venueName: string, opts?: { eventId?: string; status?: string; message?: string }): Promise<any> {
  return post(`/api/v1/flow/crews/${encodeURIComponent(crewId)}/checkin`, { venueName, ...opts });
}

export async function getCrewLeaderboard(crewId: string): Promise<LeaderboardEntry[]> {
  const data = await get<{ leaderboard: LeaderboardEntry[] }>(`/api/v1/flow/crews/${encodeURIComponent(crewId)}/leaderboard`);
  return data.leaderboard;
}

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
// Chat (OpenClaw-FlowB on Fly)
// ============================================================================

const FLOWB_CHAT_URL = "https://flowb.fly.dev";

export async function sendChat(
  messages: Array<{ role: string; content: string }>,
  userId?: string,
): Promise<string> {
  const res = await fetch(`${FLOWB_CHAT_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "flowb",
      messages,
      stream: false,
      user: userId || "farcaster-anon",
    }),
  });

  if (!res.ok) throw new Error(`FlowB chat returned ${res.status}`);

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "Sorry, I couldn't process that.";
}

// Preferences
export async function getPreferences(): Promise<PreferencesData> {
  const data = await get<{ preferences: PreferencesData }>("/api/v1/me/preferences");
  return data.preferences;
}

export async function updatePreferences(data: PreferencesData): Promise<any> {
  return patch("/api/v1/me/preferences", data);
}
