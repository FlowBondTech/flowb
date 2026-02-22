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
  CrewMessage,
  PointsInfo,
  LeaderboardEntry,
  EventSocial,
  PreferencesData,
  FeedCast,
  AgentsResponse,
  MyAgentResponse,
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
  const result = await post(`/api/v1/events/${encodeURIComponent(id)}/rsvp`, { status });

  return result;
}

export async function cancelRsvp(id: string): Promise<any> {
  const result = await del(`/api/v1/events/${encodeURIComponent(id)}/rsvp`);

  return result;
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
  const result = await post("/api/v1/flow/crews", { name, emoji });

  return result;
}

export async function joinCrew(joinCode: string): Promise<any> {
  const result = await post(`/api/v1/flow/crews/${encodeURIComponent(joinCode)}/join`, { joinCode });

  return result;
}

export async function getCrewMembers(crewId: string): Promise<{ members: CrewMember[]; checkins: CrewCheckin[] }> {
  return get(`/api/v1/flow/crews/${encodeURIComponent(crewId)}/members`);
}

export async function crewCheckin(crewId: string, venueName: string, opts?: { eventId?: string; status?: string; message?: string }): Promise<any> {
  const result = await post(`/api/v1/flow/crews/${encodeURIComponent(crewId)}/checkin`, { venueName, ...opts });

  return result;
}

export async function getCrewLeaderboard(crewId: string): Promise<LeaderboardEntry[]> {
  const data = await get<{ leaderboard: LeaderboardEntry[] }>(`/api/v1/flow/crews/${encodeURIComponent(crewId)}/leaderboard`);
  return data.leaderboard;
}

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

export async function getFriends(): Promise<any[]> {
  const data = await get<{ friends: any[] }>("/api/v1/flow/friends");
  return data.friends;
}

export async function connectFriend(code: string): Promise<any> {
  const result = await post("/api/v1/flow/connect", { code });

  return result;
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
// Chat (xAI Grok via FlowB backend)
// ============================================================================

const FLOWB_CHAT_URL = "https://flowb.fly.dev";

export async function sendChat(
  messages: Array<{ role: string; content: string }>,
  userId?: string,
): Promise<string> {

  const res = await fetch(`${FLOWB_CHAT_URL}/v1/chat/completions`, {
    method: "POST",
    headers: headers(),
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

// ============================================================================
// Feedback
// ============================================================================

export async function submitFeedback(data: {
  type: "bug" | "feature" | "feedback";
  message: string;
  contact?: string;
  screen?: string;
}): Promise<{ ok: boolean; id: string | null }> {
  const result = await post<{ ok: boolean; id: string | null }>("/api/v1/feedback", data);

  return result;
}

// EthDenver Feed
export async function getEthDenverFeed(cursor?: string): Promise<{ casts: FeedCast[]; nextCursor?: string }> {
  let url = "/api/v1/feed/ethdenver";
  if (cursor) url += `?cursor=${encodeURIComponent(cursor)}`;
  return get(url);
}

// Preferences
export async function getPreferences(): Promise<PreferencesData> {
  const data = await get<{ preferences: PreferencesData }>("/api/v1/me/preferences");
  return data.preferences;
}

export async function updatePreferences(data: PreferencesData): Promise<any> {
  return patch("/api/v1/me/preferences", data);
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
  const result = await post("/api/v1/agents/claim", { agentName });

  return result;
}

export async function purchaseSkill(skillSlug: string): Promise<any> {
  const result = await post("/api/v1/agents/skills/purchase", { skillSlug });

  return result;
}

export async function boostEvent(eventId: string): Promise<any> {
  const result = await post("/api/v1/agents/boost-event", { eventId });

  return result;
}

export async function tipAgent(recipientUserId: string, amount: number, message?: string): Promise<any> {
  const result = await post("/api/v1/agents/tip", { recipientUserId, amount, message });

  return result;
}
