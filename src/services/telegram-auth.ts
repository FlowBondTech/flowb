/**
 * Telegram Login Widget - Server-side verification
 *
 * Verifies the HMAC-SHA-256 hash from Telegram's Login Widget
 * to ensure auth data is genuinely from Telegram.
 *
 * See: https://core.telegram.org/widgets/login#checking-authorization
 */

import crypto from "node:crypto";

export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

const MAX_AUTH_AGE_SECONDS = 86400; // 24 hours

/**
 * Verify Telegram Login Widget auth data.
 *
 * 1. Build data-check-string (all fields except hash, sorted, key=value, \n separated)
 * 2. secret_key = SHA256(bot_token)
 * 3. Compare HMAC-SHA256(data_check_string, secret_key) with hash
 */
export function verifyTelegramAuth(
  data: TelegramAuthData,
  botToken: string,
): { valid: boolean; error?: string } {
  if (!data.hash || !data.id || !data.auth_date) {
    return { valid: false, error: "Missing required fields" };
  }

  // Check auth_date freshness
  const now = Math.floor(Date.now() / 1000);
  if (now - data.auth_date > MAX_AUTH_AGE_SECONDS) {
    return { valid: false, error: "Auth data is too old" };
  }

  // Build data-check-string: all fields except hash, sorted alphabetically
  const checkFields: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "hash" || value === undefined || value === null) continue;
    checkFields[key] = String(value);
  }

  const dataCheckString = Object.keys(checkFields)
    .sort()
    .map((key) => `${key}=${checkFields[key]}`)
    .join("\n");

  // secret_key = SHA256(bot_token)
  const secretKey = crypto.createHash("sha256").update(botToken).digest();

  // HMAC-SHA256(data_check_string, secret_key)
  const hmac = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (hmac !== data.hash) {
    return { valid: false, error: "Invalid hash" };
  }

  return { valid: true };
}

/**
 * Parse query string params into TelegramAuthData.
 * Telegram widget sends: id, first_name, last_name, username, photo_url, auth_date, hash
 */
export function parseTelegramAuthParams(
  params: Record<string, string>,
): TelegramAuthData {
  return {
    id: parseInt(params.id, 10),
    first_name: params.first_name || "",
    last_name: params.last_name || undefined,
    username: params.username || undefined,
    photo_url: params.photo_url || undefined,
    auth_date: parseInt(params.auth_date, 10),
    hash: params.hash || "",
  };
}
