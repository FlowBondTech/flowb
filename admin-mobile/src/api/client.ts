import { API_URL, REQUEST_TIMEOUT } from '../utils/constants';
import type {
  AdminStats,
  HealthStatus,
  PluginInfo,
  AdminEvent,
  Festival,
  Booth,
  Venue,
  AdminUser,
  AdminCrew,
  AdminEntry,
  NotificationStats,
  NotificationRecipient,
  EGatorStats,
  ScanCity,
  SupportTicket,
} from './types';

let authToken: string | null = null;
let adminKey: string | null = null;

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) h['Authorization'] = `Bearer ${authToken}`;
  if (adminKey) h['x-admin-key'] = adminKey;
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
      const text = await res.text().catch(() => '');
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
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}
function patch<T>(path: string, body?: any) {
  return request<T>(path, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}
function del<T>(path: string) {
  return request<T>(path, { method: 'DELETE' });
}

// ── Token management ──────────────────────────────────────────────────
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

// ── Auth ──────────────────────────────────────────────────────────────
export async function authPassport(
  supabaseAccessToken: string,
  displayName?: string,
) {
  const data = await post<{ token: string; user: any }>(
    '/api/v1/auth/passport',
    { accessToken: supabaseAccessToken, displayName },
  );
  authToken = data.token;
  return data;
}

export async function verifyAdmin(): Promise<{ admin: boolean; user: any }> {
  return get('/api/v1/admin/me');
}

// ── Dashboard ─────────────────────────────────────────────────────────
export async function getAdminStats(): Promise<AdminStats> {
  const data = await get<{ stats: AdminStats }>('/api/v1/admin/stats');
  return data.stats;
}

export async function getHealth(): Promise<HealthStatus> {
  return get('/health');
}

export async function getAdminHealth(): Promise<any> {
  return get('/api/v1/admin/health');
}

export async function getLumaHealth(): Promise<any> {
  return get('/health/luma');
}

// ── Plugins ───────────────────────────────────────────────────────────
export async function getPlugins(): Promise<PluginInfo[]> {
  const data = await get<{ plugins: PluginInfo[] }>('/api/v1/admin/plugins');
  return data.plugins;
}

export async function togglePlugin(id: string, enabled: boolean) {
  return post(`/api/v1/admin/plugins/${enc(id)}/toggle`, { enabled });
}

export async function configurePlugin(id: string, config: Record<string, any>) {
  return post(`/api/v1/admin/plugins/${enc(id)}/configure`, { config });
}

// ── Events ────────────────────────────────────────────────────────────
export async function getAdminEvents(opts?: {
  limit?: number;
  offset?: number;
  search?: string;
  source?: string;
  city?: string;
}) {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));
  if (opts?.search) params.set('q', opts.search);
  if (opts?.source) params.set('source', opts.source);
  if (opts?.city) params.set('city', opts.city);
  return get<{ events: AdminEvent[]; total: number }>(
    `/api/v1/admin/events?${params}`,
  );
}

export async function featureEvent(id: string, featured: boolean) {
  return post(`/api/v1/admin/events/${enc(id)}/feature`, { featured });
}

export async function hideEvent(id: string, hidden: boolean) {
  return post(`/api/v1/admin/events/${enc(id)}/hide`, { hidden });
}

export async function deleteEvent(id: string) {
  return del(`/api/v1/admin/events/${enc(id)}`);
}

// ── Festivals ─────────────────────────────────────────────────────────
export async function getFestivals(): Promise<Festival[]> {
  const data = await get<{ festivals: Festival[] }>('/api/v1/admin/festivals');
  return data.festivals;
}

export async function createFestival(body: Partial<Festival>) {
  return post<{ festival: Festival }>('/api/v1/admin/festivals', body);
}

export async function updateFestival(id: string, body: Partial<Festival>) {
  return patch<{ festival: Festival }>(`/api/v1/admin/festivals/${enc(id)}`, body);
}

export async function deleteFestival(id: string) {
  return del(`/api/v1/admin/festivals/${enc(id)}`);
}

// ── Booths ────────────────────────────────────────────────────────────
export async function getBooths(): Promise<Booth[]> {
  const data = await get<{ booths: Booth[] }>('/api/v1/booths');
  return data.booths;
}

export async function createBooth(body: Partial<Booth>) {
  return post<{ booth: Booth }>('/api/v1/admin/booths', body);
}

export async function updateBooth(id: string, body: Partial<Booth>) {
  return patch<{ booth: Booth }>(`/api/v1/admin/booths/${enc(id)}`, body);
}

// ── Venues ────────────────────────────────────────────────────────────
export async function getVenues(): Promise<Venue[]> {
  const data = await get<{ venues: Venue[] }>('/api/v1/venues');
  return data.venues;
}

export async function createVenue(body: Partial<Venue>) {
  return post<{ venue: Venue }>('/api/v1/admin/venues', body);
}

// ── Users ─────────────────────────────────────────────────────────────
export async function getAdminUsers(opts?: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));
  if (opts?.search) params.set('search', opts.search);
  return get<{ users: AdminUser[] }>(`/api/v1/admin/users?${params}`);
}

// ── Crews ─────────────────────────────────────────────────────────────
export async function getAdminCrews(opts?: {
  search?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.search) params.set('search', opts.search);
  return get<{ crews: AdminCrew[] }>(`/api/v1/admin/crews?${params}`);
}

// ── Admins ────────────────────────────────────────────────────────────
export async function getAdmins(): Promise<AdminEntry[]> {
  const data = await get<{ admins: AdminEntry[] }>('/api/v1/admin/admins');
  return data.admins;
}

export async function addAdmin(userId: string, label?: string) {
  return post('/api/v1/admin/admins', { userId, label });
}

export async function removeAdmin(userId: string) {
  return del(`/api/v1/admin/admins/${enc(userId)}`);
}

// ── Points ────────────────────────────────────────────────────────────
export async function awardPoints(
  userId: string,
  points: number,
  reason?: string,
) {
  return post('/api/v1/admin/points', { userId, points, reason });
}

// ── Notifications ─────────────────────────────────────────────────────
export async function getNotificationStats(): Promise<NotificationStats> {
  const data = await get<{ stats: NotificationStats }>(
    '/api/v1/admin/notifications/stats',
  );
  return data.stats;
}

export async function searchRecipients(
  query: string,
  type?: string,
): Promise<NotificationRecipient[]> {
  const params = new URLSearchParams({ q: query });
  if (type) params.set('type', type);
  const data = await get<{ recipients: NotificationRecipient[] }>(
    `/api/v1/admin/notifications/recipients?${params}`,
  );
  return data.recipients;
}

export async function sendNotification(body: {
  target: string;
  targetId?: string;
  title: string;
  message: string;
}) {
  return post('/api/v1/admin/notifications/send', body);
}

// ── Chat ──────────────────────────────────────────────────────────────
export async function sendChat(
  messages: Array<{ role: string; content: string }>,
): Promise<string> {
  const res = await fetch(`${API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'flowb',
      messages,
      stream: false,
      user: 'admin-mobile',
    }),
  });
  if (!res.ok) throw new Error(`Chat ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || 'No response.';
}

// ── EGator ────────────────────────────────────────────────────────────
export async function getEGatorStats(): Promise<EGatorStats> {
  const data = await get<{ stats: EGatorStats }>('/api/v1/admin/egator/stats');
  return data.stats;
}

export async function getEGatorEvents(opts?: {
  limit?: number;
  offset?: number;
  search?: string;
  filter?: string;
}) {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));
  if (opts?.search) params.set('q', opts.search);
  if (opts?.filter) params.set('filter', opts.filter);
  return get<{ events: AdminEvent[]; total: number }>(
    `/api/v1/admin/egator/events?${params}`,
  );
}

export async function triggerScan() {
  return post('/api/v1/admin/egator/scan');
}

export async function purgeStale(days = 7) {
  return del(`/api/v1/admin/egator/events/stale?days=${days}`);
}

export async function getEGatorCities(): Promise<ScanCity[]> {
  const data = await get<{ cities: ScanCity[] }>('/api/v1/admin/egator/cities');
  return data.cities;
}

export async function addCity(city: string) {
  return post('/api/v1/admin/egator/cities', { city });
}

export async function toggleCity(city: string) {
  return post(`/api/v1/admin/egator/cities/${enc(city)}/toggle`);
}

export async function removeCity(city: string) {
  return del(`/api/v1/admin/egator/cities/${enc(city)}`);
}

export async function bulkEGatorEvents(body: {
  action: 'feature' | 'hide' | 'delete';
  ids: string[];
}) {
  return post('/api/v1/admin/egator/events/bulk', body);
}

// ── Support ───────────────────────────────────────────────────────────
export async function getSupportTickets(status?: string) {
  const params = status ? `?status=${status}` : '';
  return get<{ tickets: SupportTicket[] }>(
    `/api/v1/support/tickets${params}`,
  );
}

export async function getSupportTicket(id: string) {
  return get<SupportTicket>(`/api/v1/support/tickets/${enc(id)}`);
}

export async function replySupportTicket(id: string, message: string) {
  return post(`/api/v1/support/tickets/${enc(id)}/reply`, { message });
}

// ── Settings ──────────────────────────────────────────────────────────
export async function getSettings() {
  return get<{ settings: Record<string, any> }>('/api/v1/admin/settings');
}

export async function updateSettings(settings: Record<string, any>) {
  return patch('/api/v1/admin/settings', settings);
}

// ── Helpers ───────────────────────────────────────────────────────────
function enc(s: string) {
  return encodeURIComponent(s);
}
