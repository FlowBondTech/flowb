/**
 * Expo Push Notification Sender
 *
 * Sends push notifications to mobile devices via Expo's push notification service.
 * Handles batching, receipt checking, and invalid token cleanup.
 */

import { sbQuery, sbPatch, type SbConfig } from "../utils/supabase.js";
import { log } from "../utils/logger.js";

// Expo push API endpoint
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface ExpoPushMessage {
  to: string;
  title?: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
  priority?: "default" | "normal" | "high";
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Send Expo push notifications to one or more tokens.
 * Automatically batches in groups of 100 (Expo limit).
 * Returns the number of successfully queued notifications.
 */
export async function sendExpoPush(
  pushTokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<number> {
  if (!pushTokens.length) return 0;

  // Filter to valid Expo push tokens
  const validTokens = pushTokens.filter((t) => t.startsWith("ExponentPushToken["));
  if (!validTokens.length) return 0;

  const messages: ExpoPushMessage[] = validTokens.map((token) => ({
    to: token,
    title,
    body,
    data,
    sound: "default" as const,
    priority: "high" as const,
  }));

  // Batch in groups of 100
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        log.error("[expo-push]", `Expo push API returned ${res.status}`, {
          batch: i / 100,
        });
        continue;
      }

      const result = await res.json() as { data: ExpoPushTicket[] };
      for (const ticket of result.data) {
        if (ticket.status === "ok") {
          sent++;
        } else {
          log.warn("[expo-push]", "Push ticket error", {
            message: ticket.message,
            error: ticket.details?.error,
          });
        }
      }
    } catch (err) {
      log.error("[expo-push]", "Failed to send batch", {
        error: err instanceof Error ? err.message : String(err),
        batch: i / 100,
      });
    }
  }

  log.info("[expo-push]", `Sent ${sent}/${validTokens.length} push notifications`);
  return sent;
}

/**
 * Send a push notification to a specific user by looking up their active push tokens.
 * Returns true if at least one notification was sent.
 */
export async function sendExpoPushToUser(
  cfg: SbConfig,
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<boolean> {
  const tokens = await sbQuery<{ push_token: string }[]>(cfg, "flowb_push_tokens", {
    select: "push_token",
    user_id: `eq.${userId}`,
    active: "eq.true",
  });

  if (!tokens?.length) return false;

  const pushTokens = tokens.map((t) => t.push_token);
  const sent = await sendExpoPush(pushTokens, title, body, data);
  return sent > 0;
}

/**
 * Deactivate invalid push tokens in the database.
 * Called when Expo reports tokens as invalid.
 */
export async function deactivateToken(
  cfg: SbConfig,
  pushToken: string,
): Promise<void> {
  await sbPatch(cfg, "flowb_push_tokens", { push_token: `eq.${pushToken}` }, { active: false })
    .catch((err) =>
      log.error("[expo-push]", "Failed to deactivate token", {
        error: err instanceof Error ? err.message : String(err),
      }),
    );
}
