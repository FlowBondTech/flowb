import { API_URL, REQUEST_TIMEOUT, APP_ID } from "../utils/constants";
import type {
  AuthResponse,
  Notification,
  NotificationsResponse,
  UserPreferences,
} from "./types";

// ── Internal State ──────────────────────────────────────────────────────

let authToken: string | null = null;

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) h["Authorization"] = `Bearer ${authToken}`;
  return h;
}

// ── Retry Logic ─────────────────────────────────────────────────────────

const DEFAULT_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;

/**
 * Determine if a failed request should be retried.
 * Only retry on 5xx server errors and network errors, never on 4xx.
 */
function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message;
    // Network errors (fetch rejects with TypeError on network failure)
    if (error.name === "TypeError") return true;
    // AbortError from timeout
    if (error.name === "AbortError") return true;
    // 5xx extracted from our "API NNN:" pattern
    const match = msg.match(/API (\d{3}):/);
    if (match) {
      const status = parseInt(match[1], 10);
      return status >= 500;
    }
    // Unknown error shape - retry to be safe
    return true;
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RequestOptions extends RequestInit {
  /** Number of retries on 5xx / network errors. Default: 3. Set 0 to disable. */
  retries?: number;
}

async function request<T>(
  path: string,
  init?: RequestOptions
): Promise<T> {
  const maxRetries = init?.retries ?? DEFAULT_RETRIES;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
          ...headers(),
          ...(init?.headers as Record<string, string>),
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`API ${res.status}: ${text}`);
      }

      return res.json();
    } catch (err) {
      lastError = err;

      // Only retry if it is a retryable error and we have retries left
      if (attempt < maxRetries && isRetryable(err)) {
        // Exponential backoff: 1s, 2s, 4s
        await delay(BACKOFF_BASE_MS * Math.pow(2, attempt));
        continue;
      }

      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Should not reach here, but satisfy TypeScript
  throw lastError;
}

function get<T>(path: string) {
  return request<T>(path);
}

function post<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

function patch<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
}

function del<T>(path: string) {
  return request<T>(path, { method: "DELETE" });
}

// ── Auth Token Management ──────────────────────────────────────────────

export function setToken(token: string) {
  authToken = token;
}

export function getToken(): string | null {
  return authToken;
}

export function clearAuth() {
  authToken = null;
}

// ── Auth Endpoints ─────────────────────────────────────────────────────

/**
 * Exchange a Supabase access token for a FlowB JWT via the passport endpoint.
 */
export async function authPassport(
  supabaseAccessToken: string,
  displayName?: string
): Promise<AuthResponse> {
  const data = await post<AuthResponse>("/api/v1/auth/passport", {
    accessToken: supabaseAccessToken,
    displayName,
  });
  authToken = data.token;
  return data;
}

// ── Notifications ──────────────────────────────────────────────────────

/**
 * Fetch notifications with cursor-based or offset-based pagination.
 * Use `before` (ISO date of last item's sent_at) for cursor-based pagination.
 * Falls back to `offset` when `before` is not provided.
 */
export async function getNotifications(opts?: {
  limit?: number;
  offset?: number;
  before?: string;
  unread_only?: boolean;
}): Promise<NotificationsResponse> {
  let url = "/api/v1/me/notifications?";
  if (opts?.limit) url += `limit=${opts.limit}&`;
  if (opts?.before) {
    url += `before=${encodeURIComponent(opts.before)}&`;
  } else if (opts?.offset) {
    url += `offset=${opts.offset}&`;
  }
  if (opts?.unread_only) url += `unread_only=true&`;
  return get<NotificationsResponse>(url);
}

export async function markNotificationsRead(
  opts?: { ids?: string[] } | { all?: boolean }
): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>("/api/v1/me/notifications/read", opts);
}

// ── Push Token Registration ────────────────────────────────────────────

export async function registerPushToken(
  token: string,
  deviceType: string
): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>("/api/v1/me/push-token", {
    push_token: token,
    device_type: deviceType,
    app_id: APP_ID,
  });
}

export async function unregisterPushToken(): Promise<{ ok: boolean }> {
  return del<{ ok: boolean }>("/api/v1/me/push-token");
}

// ── Preferences ────────────────────────────────────────────────────────

export async function getPreferences(): Promise<UserPreferences> {
  const data = await get<{ preferences: UserPreferences }>(
    "/api/v1/me/preferences"
  );
  return data.preferences;
}

export async function updatePreferences(
  prefs: Partial<UserPreferences>
): Promise<{ ok: boolean }> {
  return patch<{ ok: boolean }>("/api/v1/me/preferences", prefs);
}

// ── Event RSVP (Quick Action) ──────────────────────────────────────────

export async function rsvpEvent(
  id: string,
  status: "going" | "maybe" = "going"
): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>(
    `/api/v1/events/${encodeURIComponent(id)}/rsvp`,
    { status }
  );
}

// ── Crew Messages (Quick Action) ───────────────────────────────────────

export async function sendCrewMessage(
  crewId: string,
  message: string,
  replyTo?: string
): Promise<{ message: { id: string } }> {
  return post<{ message: { id: string } }>(
    `/api/v1/flow/crews/${encodeURIComponent(crewId)}/messages`,
    { message, replyTo }
  );
}
