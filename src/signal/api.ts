/**
 * Signal Bot API Client
 *
 * Wraps the signal-cli-rest-api (bbernhard/signal-cli-rest-api)
 * for sending messages, reactions, and typing indicators.
 *
 * Requires SIGNAL_API_URL (e.g., http://localhost:8080) and
 * SIGNAL_BOT_NUMBER (the registered Signal phone number with +).
 */

import type { SendMessageResponse } from "./types.js";
import { log } from "../utils/logger.js";

function getConfig() {
  const apiUrl = process.env.SIGNAL_API_URL;
  const botNumber = process.env.SIGNAL_BOT_NUMBER;
  if (!apiUrl || !botNumber) {
    throw new Error("SIGNAL_API_URL and SIGNAL_BOT_NUMBER required");
  }
  return { apiUrl: apiUrl.replace(/\/$/, ""), botNumber };
}

async function sendRequest<T = any>(
  endpoint: string,
  body: any,
): Promise<T | null> {
  try {
    const { apiUrl } = getConfig();
    const res = await fetch(`${apiUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      log.error("[signal-api]", `Send failed (${res.status}): ${err}`);
      return null;
    }

    const text = await res.text();
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch (err: any) {
    log.error("[signal-api]", `Send error: ${err.message}`);
    return null;
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Send a plain text message to a recipient.
 */
export async function sendText(
  to: string,
  body: string,
): Promise<SendMessageResponse | null> {
  const { botNumber } = getConfig();
  return sendRequest<SendMessageResponse>("/v2/send", {
    message: body,
    number: botNumber,
    recipients: [to],
  });
}

/**
 * Send a styled text message (markdown-like formatting).
 * signal-cli supports basic styling: *bold*, _italic_, ~strikethrough~, ||spoiler||
 */
export async function sendStyledText(
  to: string,
  body: string,
): Promise<SendMessageResponse | null> {
  const { botNumber } = getConfig();
  return sendRequest<SendMessageResponse>("/v2/send", {
    message: body,
    number: botNumber,
    recipients: [to],
    text_mode: "styled",
  });
}

/**
 * Send a reaction to a message.
 */
export async function sendReaction(
  to: string,
  emoji: string,
  targetTimestamp: number,
): Promise<SendMessageResponse | null> {
  const { botNumber } = getConfig();
  return sendRequest<SendMessageResponse>("/v1/reactions/" + encodeURIComponent(botNumber), {
    recipient: to,
    reaction: emoji,
    target_author: to,
    timestamp: targetTimestamp,
  });
}

/**
 * Send typing indicator.
 */
export async function sendTyping(to: string): Promise<boolean> {
  try {
    const { apiUrl, botNumber } = getConfig();
    const res = await fetch(
      `${apiUrl}/v1/typing-indicator/${encodeURIComponent(botNumber)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: to }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Check if signal-cli-rest-api is reachable and the bot number is registered.
 */
export async function healthCheck(): Promise<{
  ok: boolean;
  registered: boolean;
  error?: string;
}> {
  try {
    const { apiUrl, botNumber } = getConfig();
    const res = await fetch(`${apiUrl}/v1/about`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, registered: false, error: `HTTP ${res.status}` };

    // Check if our number is registered
    const accounts = await fetch(`${apiUrl}/v1/accounts`);
    if (accounts.ok) {
      const list = await accounts.json() as string[];
      const registered = list.includes(botNumber);
      return { ok: true, registered };
    }

    return { ok: true, registered: false };
  } catch (err: any) {
    return { ok: false, registered: false, error: err.message };
  }
}

/**
 * Send a notification to a Signal user (used by notification service).
 * Returns true if sent successfully.
 */
export async function sendSignalNotification(
  phone: string,
  message: string,
): Promise<boolean> {
  const normalizedPhone = phone.startsWith("+") ? phone : `+${phone}`;
  const result = await sendText(normalizedPhone, message);
  return result !== null;
}
