/**
 * Admin Alert Service
 *
 * Sends real-time DMs to admin Telegram accounts when important
 * system events occur (new users, feature requests, bug reports,
 * crew creation, point milestones, daily summaries).
 *
 * All alerts are fire-and-forget: failures are logged but never
 * crash the caller or block the request.
 *
 * Config:
 *   FLOWB_ADMIN_ALERT_IDS  — comma-separated Telegram chat IDs
 *   FLOWB_TELEGRAM_BOT_TOKEN — bot token for sending DMs
 */

import { log } from "../utils/logger.js";
import { sbFetch, type SbConfig } from "../utils/supabase.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export function getAdminIds(): number[] {
  const raw = process.env.FLOWB_ADMIN_ALERT_IDS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0);
}

function getBotToken(): string | undefined {
  return process.env.FLOWB_TELEGRAM_BOT_TOKEN;
}

// ---------------------------------------------------------------------------
// Priority prefixes
// ---------------------------------------------------------------------------

const PRIORITY_PREFIX: Record<string, string> = {
  info: "\u2139\ufe0f",      // i
  important: "\u26a1",        // lightning bolt
  urgent: "\ud83d\udea8",     // rotating light
};

// ---------------------------------------------------------------------------
// Core: alertAdmins
// ---------------------------------------------------------------------------

/**
 * Send an alert message to all configured admin Telegram accounts.
 * Fire-and-forget — errors are logged silently.
 */
export function alertAdmins(
  message: string,
  priority: "info" | "important" | "urgent" = "info",
): void {
  const adminIds = getAdminIds();
  const botToken = getBotToken();

  if (!adminIds.length || !botToken) return;

  const prefix = PRIORITY_PREFIX[priority] || PRIORITY_PREFIX.info;
  const text = `${prefix} ${message}`;

  for (const chatId of adminIds) {
    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    }).catch((err) =>
      log.warn("[admin-alert]", `Failed to DM admin ${chatId}`, {
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}

// ---------------------------------------------------------------------------
// Daily Summary
// ---------------------------------------------------------------------------

/**
 * Send a daily admin summary with key stats.
 * Intended to be called once per day from the context-notifications scheduler.
 *
 * Requires Supabase config to query stats.
 */
export async function alertDaily(cfg: SbConfig): Promise<void> {
  const adminIds = getAdminIds();
  if (!adminIds.length) return;

  try {
    // Midnight Denver time in UTC (handles MST/MDT automatically)
    const now = new Date();
    const denverDate = now.toLocaleDateString("en-CA", { timeZone: "America/Denver" });
    // Create a date at noon UTC to safely detect the Denver offset
    const probe = new Date(`${denverDate}T12:00:00Z`);
    const denverH = parseInt(probe.toLocaleString("en-US", { timeZone: "America/Denver", hour: "numeric", hour12: false }), 10);
    const offsetH = probe.getUTCHours() - denverH; // 7 (MST) or 6 (MDT)
    const todayISO = new Date(`${denverDate}T00:00:00Z`);
    todayISO.setUTCHours(offsetH); // shift to Denver midnight in UTC
    const todayFilter = todayISO.toISOString();

    // New users today (sessions created today)
    const newUsers = await sbFetch<any[]>(
      cfg,
      `flowb_sessions?created_at=gte.${todayFilter}&select=user_id&limit=1000`,
    );
    const newUserCount = newUsers?.length || 0;

    // Feature requests today
    const features = await sbFetch<any[]>(
      cfg,
      `flowb_feedback?created_at=gte.${todayFilter}&type=eq.feature&select=id&limit=1000`,
    );
    const featureCount = features?.length || 0;

    // Bug reports today
    const bugs = await sbFetch<any[]>(
      cfg,
      `flowb_feedback?created_at=gte.${todayFilter}&type=eq.bug&select=id&limit=1000`,
    );
    const bugCount = bugs?.length || 0;

    // Active crews (total)
    const crews = await sbFetch<any[]>(
      cfg,
      `flowb_groups?select=id&limit=10000`,
    );
    const crewCount = crews?.length || 0;

    // Total points awarded today
    const pointsLog = await sbFetch<any[]>(
      cfg,
      `flowb_points_log?created_at=gte.${todayFilter}&select=points&limit=10000`,
    );
    const totalPointsToday = (pointsLog || []).reduce(
      (sum: number, row: any) => sum + (row.points || 0),
      0,
    );

    // Break down new users by platform
    const tgUsers = (newUsers || []).filter((u: any) => u.user_id?.startsWith("telegram_")).length;
    const fcUsers = (newUsers || []).filter((u: any) => u.user_id?.startsWith("farcaster_")).length;
    const webUsers = (newUsers || []).filter((u: any) => u.user_id?.startsWith("web_")).length;
    const otherUsers = newUserCount - tgUsers - fcUsers - webUsers;

    const platformBreakdown = [tgUsers && `TG:${tgUsers}`, fcUsers && `FC:${fcUsers}`, webUsers && `Web:${webUsers}`, otherUsers > 0 && `Other:${otherUsers}`].filter(Boolean).join(" / ");

    const lines = [
      `<b>Daily Summary</b>`,
      ``,
      `New users: <b>${newUserCount}</b>${platformBreakdown ? ` (${platformBreakdown})` : ""}`,
      `Feature requests: <b>${featureCount}</b>`,
      `Bug reports: <b>${bugCount}</b>`,
      `Active crews: <b>${crewCount}</b>`,
      `Points awarded today: <b>${totalPointsToday}</b>`,
    ];

    alertAdmins(lines.join("\n"), "info");
  } catch (err) {
    log.warn("[admin-alert]", "Daily summary failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// Milestone check helper
// ---------------------------------------------------------------------------

const MILESTONES = [100, 500, 1000, 2500, 5000, 10000];

/**
 * Check if a new total crosses a milestone boundary and alert admins.
 * Call after points are awarded with old and new totals.
 */
export function checkMilestone(
  displayName: string,
  oldTotal: number,
  newTotal: number,
): void {
  for (const milestone of MILESTONES) {
    if (oldTotal < milestone && newTotal >= milestone) {
      alertAdmins(
        `Milestone: <b>${displayName}</b> just hit <b>${milestone} points</b>!`,
        "important",
      );
      break; // Only alert for the highest crossed milestone
    }
  }
}
