/**
 * Link Token Store
 *
 * Short-lived tokens for cross-platform account connection.
 * When a web user clicks "Connect Telegram", we generate a token that
 * carries their identity through the Telegram Login Widget callback.
 */

// In-memory store (15-min TTL)
export const linkTokens = new Map<string, { webUserId: string; createdAt: number }>();
export const LINK_TOKEN_TTL = 15 * 60 * 1000; // 15 minutes

export function generateLinkToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 20; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

function cleanExpiredTokens(): void {
  const now = Date.now();
  for (const [token, data] of linkTokens) {
    if (now - data.createdAt > LINK_TOKEN_TTL) linkTokens.delete(token);
  }
}

// Run cleanup every 5 minutes
setInterval(cleanExpiredTokens, 5 * 60 * 1000);
