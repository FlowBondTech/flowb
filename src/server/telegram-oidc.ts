/**
 * Telegram OIDC Utilities
 *
 * PKCE code challenge/verifier generation, ephemeral state store,
 * and JWKS-based id_token verification for Telegram's OAuth 2.0 flow.
 */

import { createHash, randomBytes, createPublicKey, verify as cryptoVerify } from "node:crypto";

// ── PKCE ─────────────────────────────────────────────────────────────

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = base64url(randomBytes(32));
  const codeChallenge = base64url(createHash("sha256").update(codeVerifier).digest());
  return { codeVerifier, codeChallenge };
}

// ── OIDC State Store (10-min TTL) ────────────────────────────────────

interface OidcStateEntry {
  userId: string;       // authenticated mobile user (web_xxx)
  codeVerifier: string;
  createdAt: number;
}

const STATE_TTL = 10 * 60 * 1000; // 10 minutes

export const oidcStates = new Map<string, OidcStateEntry>();

export function createOidcState(userId: string): { state: string; codeVerifier: string; codeChallenge: string } {
  const state = base64url(randomBytes(24));
  const { codeVerifier, codeChallenge } = generatePKCE();
  oidcStates.set(state, { userId, codeVerifier, createdAt: Date.now() });
  return { state, codeVerifier, codeChallenge };
}

export function consumeOidcState(state: string): { userId: string; codeVerifier: string } | null {
  const entry = oidcStates.get(state);
  if (!entry) return null;
  oidcStates.delete(state);
  if (Date.now() - entry.createdAt > STATE_TTL) return null;
  return { userId: entry.userId, codeVerifier: entry.codeVerifier };
}

// Cleanup expired states every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of oidcStates) {
    if (now - entry.createdAt > STATE_TTL) oidcStates.delete(key);
  }
}, 5 * 60 * 1000);

// ── JWKS-based id_token verification ─────────────────────────────────

interface TelegramClaims {
  sub: string;          // Telegram user ID (numeric string)
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface JWK {
  kty: string;
  kid: string;
  n: string;
  e: string;
  alg?: string;
  use?: string;
}

let jwksCache: { keys: JWK[]; fetchedAt: number } | null = null;
const JWKS_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const JWKS_URL = "https://oauth.telegram.org/.well-known/jwks.json";

async function fetchJWKS(): Promise<JWK[]> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_CACHE_TTL) {
    return jwksCache.keys;
  }

  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error(`Failed to fetch Telegram JWKS: ${res.status}`);
  const data = await res.json() as { keys: JWK[] };
  jwksCache = { keys: data.keys, fetchedAt: Date.now() };
  return data.keys;
}

function decodeBase64Url(str: string): Buffer {
  // Restore base64 padding
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export async function verifyTelegramIdToken(idToken: string): Promise<TelegramClaims> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(decodeBase64Url(headerB64).toString("utf8"));
  const payload = JSON.parse(decodeBase64Url(payloadB64).toString("utf8"));

  // Validate algorithm
  if (header.alg !== "RS256") throw new Error(`Unsupported algorithm: ${header.alg}`);

  // Validate claims
  const clientId = process.env.TELEGRAM_OIDC_CLIENT_ID;
  if (!clientId) throw new Error("TELEGRAM_OIDC_CLIENT_ID not configured");

  if (payload.iss !== "https://oauth.telegram.org") {
    throw new Error(`Invalid issuer: ${payload.iss}`);
  }
  if (String(payload.aud) !== String(clientId)) {
    throw new Error(`Invalid audience: ${payload.aud}`);
  }
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  // Find the matching JWK
  const keys = await fetchJWKS();
  const jwk = header.kid
    ? keys.find(k => k.kid === header.kid)
    : keys[0];

  if (!jwk) throw new Error(`No matching JWK found for kid: ${header.kid}`);

  // Create public key from JWK
  const pubKey = createPublicKey({
    key: {
      kty: jwk.kty,
      n: jwk.n,
      e: jwk.e,
    },
    format: "jwk",
  });

  // Verify RS256 signature
  const signedData = Buffer.from(`${headerB64}.${payloadB64}`, "utf8");
  const signature = decodeBase64Url(signatureB64);
  const valid = cryptoVerify("sha256", signedData, pubKey, signature);

  if (!valid) throw new Error("Invalid JWT signature");

  return {
    sub: String(payload.sub),
    first_name: payload.first_name,
    last_name: payload.last_name,
    username: payload.username,
    photo_url: payload.photo_url,
  };
}

// ── Token Exchange ───────────────────────────────────────────────────

export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<string> {
  const clientId = process.env.TELEGRAM_OIDC_CLIENT_ID;
  const clientSecret = process.env.TELEGRAM_OIDC_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Telegram OIDC credentials not configured");

  const res = await fetch("https://oauth.telegram.org/auth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  const data = await res.json() as { id_token?: string; access_token?: string };
  if (!data.id_token) throw new Error("No id_token in token response");
  return data.id_token;
}
