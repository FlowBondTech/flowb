import { API_URL, REQUEST_TIMEOUT } from "../utils/constants";
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
  AdminStats,
  PluginInfo,
  NotificationStats,
  CrewMission,
  FeedCast,
  GlobalCrewRanking,
} from "./types";

let authToken: string | null = null;
let adminKey: string | null = null;

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) h["Authorization"] = `Bearer ${authToken}`;
  if (adminKey) h["x-admin-key"] = adminKey;
  return h;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { ...headers(), ...(init?.headers as Record<string, string>) },
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${res.status}: ${text}`);
    }
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

function get<T>(path: string) {
  return request<T>(path);
}

function post<T>(path: string, body?: any) {
  return request<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

function patch<T>(path: string, body?: any) {
  return request<T>(path, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
}

function del<T>(path: string) {
  return request<T>(path, { method: "DELETE" });
}

// ── Auth ──────────────────────────────────────────────────────────────
export function setToken(token: string) {
  authToken = token;
}
export function setAdminKey(key: string) {
  adminKey = key;
}
export function getToken() {
  return authToken;
}
export function clearAuth() {
  authToken = null;
  adminKey = null;
}

export async function authApp(
  username: string,
  password: string
): Promise<AuthResponse> {
  const data = await post<AuthResponse>("/api/v1/auth/app", {
    username,
    password,
  });
  authToken = data.token;
  if (data.adminKey) adminKey = data.adminKey;
  return data;
}

// ── Events ────────────────────────────────────────────────────────────
export async function getEvents(
  city = "Denver",
  limit = 20,
  categories?: string
): Promise<EventResult[]> {
  let url = `/api/v1/events?city=${encodeURIComponent(city)}&limit=${limit}`;
  if (categories) url += `&categories=${encodeURIComponent(categories)}`;
  const data = await get<{ events: EventResult[] }>(url);
  return data.events;
}

export async function getEvent(
  id: string
): Promise<{ event: EventResult; flow: { going: string[]; maybe: string[] } }> {
  return get(`/api/v1/events/${encodeURIComponent(id)}`);
}

export async function getEventSocial(id: string): Promise<EventSocial> {
  return get(`/api/v1/events/${encodeURIComponent(id)}/social`);
}

export async function rsvpEvent(
  id: string,
  status: "going" | "maybe" = "going"
) {
  return post(`/api/v1/events/${encodeURIComponent(id)}/rsvp`, { status });
}

export async function cancelRsvp(id: string) {
  return del(`/api/v1/events/${encodeURIComponent(id)}/rsvp`);
}

// ── Schedule ──────────────────────────────────────────────────────────
export async function getSchedule(): Promise<ScheduleEntry[]> {
  const data = await get<{ schedule: ScheduleEntry[] }>("/api/v1/me/schedule");
  return data.schedule;
}

export async function checkinScheduleEntry(id: string) {
  return post(`/api/v1/me/schedule/${encodeURIComponent(id)}/checkin`);
}

// ── Crews ─────────────────────────────────────────────────────────────
export async function getCrews(): Promise<CrewInfo[]> {
  const data = await get<{ crews: CrewInfo[] }>("/api/v1/flow/crews");
  return data.crews;
}

export async function createCrew(name: string, emoji?: string) {
  return post("/api/v1/flow/crews", { name, emoji });
}

export async function joinCrew(joinCode: string) {
  return post(`/api/v1/flow/crews/${encodeURIComponent(joinCode)}/join`, {
    joinCode,
  });
}

export async function getCrewMembers(
  crewId: string
): Promise<{ members: CrewMember[]; checkins: CrewCheckin[] }> {
  return get(`/api/v1/flow/crews/${encodeURIComponent(crewId)}/members`);
}

export async function crewCheckin(
  crewId: string,
  venueName: string,
  opts?: { eventId?: string; status?: string; message?: string }
) {
  return post(`/api/v1/flow/crews/${encodeURIComponent(crewId)}/checkin`, {
    venueName,
    ...opts,
  });
}

export async function getCrewLeaderboard(
  crewId: string
): Promise<LeaderboardEntry[]> {
  const data = await get<{ leaderboard: LeaderboardEntry[] }>(
    `/api/v1/flow/crews/${encodeURIComponent(crewId)}/leaderboard`
  );
  return data.leaderboard;
}

export async function getCrewMissions(
  crewId: string
): Promise<CrewMission[]> {
  const data = await get<{ missions: CrewMission[] }>(
    `/api/v1/flow/crews/${encodeURIComponent(crewId)}/missions`
  );
  return data.missions;
}

// ── Crew Messages ────────────────────────────────────────────────────
export async function getCrewMessages(
  crewId: string,
  limit = 50,
  before?: string
): Promise<CrewMessage[]> {
  let path = `/api/v1/flow/crews/${encodeURIComponent(crewId)}/messages?limit=${limit}`;
  if (before) path += `&before=${encodeURIComponent(before)}`;
  const data = await get<{ messages: CrewMessage[] }>(path);
  return data.messages;
}

export async function sendCrewMessage(
  crewId: string,
  message: string,
  replyTo?: string
): Promise<CrewMessage> {
  const data = await post<{ message: CrewMessage }>(
    `/api/v1/flow/crews/${encodeURIComponent(crewId)}/messages`,
    { message, replyTo }
  );
  return data.message;
}

// ── FlowB AI Chat ───────────────────────────────────────────────────
export async function sendChat(
  messages: Array<{ role: string; content: string }>,
  userId?: string
): Promise<string> {
  const base = API_URL || "https://flowb.fly.dev";
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "flowb",
      messages,
      stream: false,
      user: userId || "mobile-anon",
    }),
  });
  if (!res.ok) throw new Error(`FlowB chat returned ${res.status}`);
  const data = await res.json();
  return (
    data?.choices?.[0]?.message?.content ||
    "Sorry, I couldn't process that."
  );
}

// ── Friends ───────────────────────────────────────────────────────────
export async function getFriends() {
  const data = await get<{ friends: any[] }>("/api/v1/flow/friends");
  return data.friends;
}

export async function connectFriend(code: string) {
  return post("/api/v1/flow/connect", { code });
}

export async function getInviteLink(): Promise<string> {
  const data = await get<{ link: string }>("/api/v1/flow/invite");
  return data.link;
}

// ── Points ────────────────────────────────────────────────────────────
export async function getPoints(): Promise<PointsInfo> {
  return get("/api/v1/me/points");
}

export async function getGlobalLeaderboard() {
  return get<{ crews: any[] }>("/api/v1/flow/leaderboard");
}

// ── Feed ─────────────────────────────────────────────────────────
export async function getFeed(
  channel = "ethdenver",
  limit = 20
): Promise<FeedCast[]> {
  const data = await get<{ casts: FeedCast[] }>(
    `/api/v1/feed/${encodeURIComponent(channel)}?limit=${limit}`
  );
  return data.casts;
}

// ── Preferences ───────────────────────────────────────────────────────
export async function getPreferences() {
  const data = await get<{ preferences: any }>("/api/v1/me/preferences");
  return data.preferences;
}

export async function updatePreferences(prefs: Record<string, any>) {
  return patch("/api/v1/me/preferences", prefs);
}

// ── Admin ─────────────────────────────────────────────────────────────
export async function getAdminStats(): Promise<AdminStats> {
  const data = await get<{ stats: AdminStats }>("/api/v1/admin/stats");
  return data.stats;
}

export async function getAdminPlugins(): Promise<PluginInfo[]> {
  const data = await get<{ plugins: PluginInfo[] }>("/api/v1/admin/plugins");
  return data.plugins;
}

export async function togglePlugin(id: string, enabled: boolean) {
  return post(`/api/v1/admin/plugins/${encodeURIComponent(id)}/toggle`, {
    enabled,
  });
}

export async function configurePlugin(
  id: string,
  config: Record<string, any>
) {
  return post(`/api/v1/admin/plugins/${encodeURIComponent(id)}/configure`, {
    config,
  });
}

export async function featureEvent(id: string, featured: boolean) {
  return post(`/api/v1/admin/events/${encodeURIComponent(id)}/feature`, {
    featured,
  });
}

export async function hideEvent(id: string, hidden: boolean) {
  return post(`/api/v1/admin/events/${encodeURIComponent(id)}/hide`, {
    hidden,
  });
}

export async function awardBonusPoints(
  userId: string,
  points: number,
  reason?: string
) {
  return post("/api/v1/admin/points", { userId, points, reason });
}

export async function changeUserRole(userId: string, role: string) {
  return post(`/api/v1/admin/users/${encodeURIComponent(userId)}/role`, {
    role,
  });
}

export async function sendTestNotification(
  userId: string,
  title: string,
  body: string
) {
  return post("/api/v1/admin/notifications/test", { userId, title, body });
}

export async function getNotificationStats(): Promise<NotificationStats> {
  const data = await get<{ stats: NotificationStats }>(
    "/api/v1/admin/notifications/stats"
  );
  return data.stats;
}

export async function getAdminEvents(opts?: {
  limit?: number;
  offset?: number;
  search?: string;
}) {
  let url = "/api/v1/admin/events?";
  if (opts?.limit) url += `limit=${opts.limit}&`;
  if (opts?.offset) url += `offset=${opts.offset}&`;
  if (opts?.search) url += `search=${encodeURIComponent(opts.search)}&`;
  return get<{ events: EventResult[]; total: number }>(url);
}

export async function getAdminUsers(opts?: {
  search?: string;
  limit?: number;
}) {
  let url = "/api/v1/admin/users?";
  if (opts?.limit) url += `limit=${opts.limit}&`;
  if (opts?.search) url += `search=${encodeURIComponent(opts.search)}&`;
  return get<{ users: any[] }>(url);
}
