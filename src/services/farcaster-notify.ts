/**
 * Farcaster Mini App Notification Sender
 *
 * Sends push notifications to Farcaster users via their stored notification tokens.
 * Rate limits: 1 per 30s per token, 100/day per token.
 *
 * Tokens are received via the webhook endpoint when users enable notifications
 * in the mini app, and stored in flowb_notification_tokens.
 */

interface NotificationToken {
  fid: number;
  token: string;
  url: string;
}

interface SbConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

/**
 * Send a notification to a Farcaster user.
 * Returns true if sent, false if no token found or send failed.
 */
export async function sendFarcasterNotification(
  cfg: SbConfig,
  fid: number,
  title: string,
  body: string,
  targetUrl: string,
): Promise<boolean> {
  const token = await getNotificationToken(cfg, fid);
  if (!token) return false;

  try {
    const res = await fetch(token.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notificationId: crypto.randomUUID(),
        title,
        body,
        targetUrl,
        tokens: [token.token],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[fc-notify] Send failed for fid=${fid}: ${res.status} ${text}`);

      // If token is invalid (410 Gone or specific error), disable it
      if (res.status === 410) {
        await disableToken(cfg, fid);
      }

      return false;
    }

    const result = await res.json() as any;

    // Check for individual token failures in response
    if (result?.result?.rateLimitedTokens?.includes(token.token)) {
      console.warn(`[fc-notify] Rate limited for fid=${fid}`);
      return false;
    }
    if (result?.result?.invalidTokens?.includes(token.token)) {
      console.warn(`[fc-notify] Invalid token for fid=${fid}, disabling`);
      await disableToken(cfg, fid);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`[fc-notify] Error sending to fid=${fid}:`, err);
    return false;
  }
}

/**
 * Send notification to multiple Farcaster users (batch).
 * Returns count of successful sends.
 */
export async function sendFarcasterNotificationBatch(
  cfg: SbConfig,
  fids: number[],
  title: string,
  body: string,
  targetUrl: string,
): Promise<number> {
  let sent = 0;
  // Send sequentially to respect rate limits
  for (const fid of fids) {
    const ok = await sendFarcasterNotification(cfg, fid, title, body, targetUrl);
    if (ok) sent++;
  }
  return sent;
}

/**
 * Store or update a Farcaster notification token.
 * Called when the webhook receives a notification_enabled event.
 */
export async function upsertNotificationToken(
  cfg: SbConfig,
  fid: number,
  token: string,
  url: string,
): Promise<boolean> {
  try {
    const res = await fetch(
      `${cfg.supabaseUrl}/rest/v1/flowb_notification_tokens?on_conflict=fid`,
      {
        method: "POST",
        headers: {
          apikey: cfg.supabaseKey,
          Authorization: `Bearer ${cfg.supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal,resolution=merge-duplicates",
        },
        body: JSON.stringify({
          fid,
          token,
          url,
          enabled: true,
          updated_at: new Date().toISOString(),
        }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Disable a notification token (user opted out or token invalid).
 */
export async function disableNotificationToken(
  cfg: SbConfig,
  fid: number,
): Promise<boolean> {
  return disableToken(cfg, fid);
}

// ============================================================================
// Internal helpers
// ============================================================================

async function getNotificationToken(cfg: SbConfig, fid: number): Promise<NotificationToken | null> {
  try {
    const res = await fetch(
      `${cfg.supabaseUrl}/rest/v1/flowb_notification_tokens?fid=eq.${fid}&enabled=eq.true&select=fid,token,url&limit=1`,
      {
        headers: {
          apikey: cfg.supabaseKey,
          Authorization: `Bearer ${cfg.supabaseKey}`,
        },
      },
    );

    if (!res.ok) return null;
    const rows = await res.json() as NotificationToken[];
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

async function disableToken(cfg: SbConfig, fid: number): Promise<boolean> {
  try {
    const res = await fetch(
      `${cfg.supabaseUrl}/rest/v1/flowb_notification_tokens?fid=eq.${fid}`,
      {
        method: "PATCH",
        headers: {
          apikey: cfg.supabaseKey,
          Authorization: `Bearer ${cfg.supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ enabled: false, updated_at: new Date().toISOString() }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}
