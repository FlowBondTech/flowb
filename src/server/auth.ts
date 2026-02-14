/**
 * Auth middleware for FlowB Mini Apps
 *
 * Supports two auth flows:
 *   1. Telegram Mini App: validate initData HMAC, issue JWT
 *   2. Farcaster Mini App: validate SIWF nonce + custody signature, issue JWT
 *
 * JWTs are HS256 signed with FLOWB_JWT_SECRET (or derived from bot token).
 */

import crypto from "node:crypto";
import type { FastifyRequest, FastifyReply } from "fastify";

// ============================================================================
// JWT Types
// ============================================================================

export interface JWTPayload {
  /** User identifier: "telegram_<id>" or "farcaster_<fid>" */
  sub: string;
  /** Platform origin */
  platform: "telegram" | "farcaster";
  /** Telegram user ID (if telegram) */
  tg_id?: number;
  /** Farcaster FID (if farcaster) */
  fid?: number;
  /** Username if known */
  username?: string;
  /** Issued at (epoch seconds) */
  iat: number;
  /** Expires at (epoch seconds) */
  exp: number;
}

// ============================================================================
// JWT Utilities (zero-dep, HS256)
// ============================================================================

function getJwtSecret(): string {
  if (process.env.FLOWB_JWT_SECRET) return process.env.FLOWB_JWT_SECRET;
  const botToken = process.env.FLOWB_TELEGRAM_BOT_TOKEN;
  if (botToken) {
    return crypto.createHash("sha256").update(`flowb-jwt-${botToken}`).digest("hex");
  }
  throw new Error("No JWT secret configured. Set FLOWB_JWT_SECRET or FLOWB_TELEGRAM_BOT_TOKEN");
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64url");
}

export function signJwt(payload: Omit<JWTPayload, "iat" | "exp">, expiresInSeconds = 86400): string {
  const secret = getJwtSecret();
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(fullPayload));
  const signature = base64url(
    crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest(),
  );

  return `${header}.${body}.${signature}`;
}

export function verifyJwt(token: string): JWTPayload | null {
  try {
    const secret = getJwtSecret();
    const [header, body, signature] = token.split(".");
    if (!header || !body || !signature) return null;

    const expected = base64url(
      crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest(),
    );

    if (signature !== expected) return null;

    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as JWTPayload;

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

// ============================================================================
// Telegram Mini App initData Validation
// ============================================================================

/**
 * Validate Telegram Web App initData.
 *
 * Different from Login Widget auth! The HMAC uses:
 *   secret_key = HMAC-SHA-256("WebAppData", bot_token)
 *   hash = HMAC-SHA-256(data_check_string, secret_key)
 *
 * data_check_string = sorted key=value pairs (excluding hash), joined by \n
 *
 * See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export function validateInitData(
  initData: string,
  botToken: string,
): { valid: true; user: TelegramWebAppUser } | { valid: false; error: string } {
  if (!initData) return { valid: false, error: "Empty initData" };

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { valid: false, error: "Missing hash" };

  // Check auth_date freshness (allow 24h)
  const authDate = parseInt(params.get("auth_date") || "0", 10);
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 86400) {
    return { valid: false, error: "initData too old" };
  }

  // Build data check string: all params except hash, sorted, \n joined
  const entries: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash") continue;
    entries.push(`${key}=${value}`);
  }
  entries.sort();
  const dataCheckString = entries.join("\n");

  // secret_key = HMAC-SHA-256("WebAppData", bot_token)
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  // computed_hash = HMAC-SHA-256(data_check_string, secret_key)
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (computedHash !== hash) {
    return { valid: false, error: "Invalid hash" };
  }

  // Parse user object
  const userStr = params.get("user");
  if (!userStr) return { valid: false, error: "Missing user data" };

  try {
    const user = JSON.parse(userStr) as TelegramWebAppUser;
    if (!user.id) return { valid: false, error: "Missing user ID" };
    return { valid: true, user };
  } catch {
    return { valid: false, error: "Invalid user JSON" };
  }
}

// ============================================================================
// Farcaster SIWF Validation (simplified - verify nonce + trust Neynar)
// ============================================================================

export interface FarcasterAuthPayload {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

/**
 * Verify a Farcaster Sign In message via Neynar's API.
 * The mini app sends { message, signature, nonce } from sdk.actions.signIn().
 * We validate via Neynar and extract the FID.
 */
export async function validateFarcasterSignIn(
  message: string,
  signature: string,
  neynarApiKey?: string,
): Promise<{ valid: true; user: FarcasterAuthPayload } | { valid: false; error: string }> {
  if (!neynarApiKey) {
    return { valid: false, error: "Neynar API key not configured" };
  }

  try {
    const res = await fetch("https://api.neynar.com/v2/farcaster/signer/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": neynarApiKey,
      },
      body: JSON.stringify({ message, signature }),
    });

    if (!res.ok) {
      return { valid: false, error: `Neynar verify failed: ${res.status}` };
    }

    const data = await res.json() as any;
    if (!data.fid) {
      return { valid: false, error: "No FID in response" };
    }

    return {
      valid: true,
      user: {
        fid: data.fid,
        username: data.username,
        displayName: data.display_name,
        pfpUrl: data.pfp_url,
      },
    };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

// ============================================================================
// Fastify Auth Hook
// ============================================================================

/** Augment Fastify request with decoded JWT */
declare module "fastify" {
  interface FastifyRequest {
    jwtPayload?: JWTPayload;
  }
}

/**
 * Fastify preHandler that extracts and verifies JWT from Authorization header.
 * Sets request.jwtPayload on success.
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.slice(7);
  const payload = verifyJwt(token);
  if (!payload) {
    return reply.status(401).send({ error: "Invalid or expired token" });
  }

  request.jwtPayload = payload;
}
