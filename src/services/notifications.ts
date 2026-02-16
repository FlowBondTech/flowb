/**
 * FlowB Notification Service
 *
 * Cross-platform notification dispatch for:
 *   - Crew checkin alerts ("Alice is at Main Stage")
 *   - Friend RSVP alerts ("Alice is going to [event]")
 *   - Event reminders (30 min before RSVP'd events)
 *   - Daily morning digest
 *
 * Features:
 *   - Cross-platform dedup (Telegram preferred for push, Farcaster for social)
 *   - Quiet hours (10pm-8am MST)
 *   - Rate limiting (max 10/day/user)
 */

import { sendFarcasterNotification } from "./farcaster-notify.js";

interface SbConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

interface NotifyContext {
  supabase: SbConfig;
  botToken?: string;
}

// ============================================================================
// Crew Checkin Notification
// ============================================================================

/**
 * Notify crew members when someone checks in at a venue.
 * Sends via Telegram bot DM (primary) or Farcaster notification (fallback).
 */
export async function notifyCrewCheckin(
  ctx: NotifyContext,
  userId: string,
  crewId: string,
  crewName: string,
  crewEmoji: string,
  venueName: string,
  sendTelegramMessage?: (chatId: number, text: string) => Promise<void>,
): Promise<number> {

  // Get crew members (excluding the person who checked in)
  const members = await sbQuery<any[]>(ctx.supabase, "flowb_group_members", {
    select: "user_id",
    group_id: `eq.${crewId}`,
    muted: "eq.false",
  });

  if (!members?.length) return 0;

  const username = userId.replace(/^(telegram_|farcaster_)/, "@");
  const message = `${crewEmoji} ${username} checked in at ${venueName} (+5 pts)`;

  let sent = 0;
  for (const member of members) {
    if (member.user_id === userId) continue;
    if (await hasReachedDailyLimit(ctx.supabase, member.user_id)) continue;
    if (await isUserQuietHours(ctx.supabase, member.user_id)) continue;

    // Check dedup
    const alreadySent = await isAlreadyNotified(
      ctx.supabase,
      member.user_id,
      "checkin",
      `${crewId}:${venueName}`,
      userId,
    );
    if (alreadySent) continue;

    const didSend = await sendToUser(ctx, member.user_id, message, sendTelegramMessage);
    if (didSend) {
      await logNotification(ctx.supabase, member.user_id, "checkin", `${crewId}:${venueName}`, userId);
      sent++;
    }
  }

  return sent;
}

// ============================================================================
// Friend RSVP Notification
// ============================================================================

/**
 * Notify flow friends when someone RSVPs to an event.
 */
export async function notifyFriendRsvp(
  ctx: NotifyContext,
  userId: string,
  eventId: string,
  eventName: string,
  sendTelegramMessage?: (chatId: number, text: string) => Promise<void>,
): Promise<number> {

  // Get active friends
  const friends = await sbQuery<any[]>(ctx.supabase, "flowb_connections", {
    select: "friend_id",
    user_id: `eq.${userId}`,
    status: "eq.active",
  });

  if (!friends?.length) return 0;

  const username = userId.replace(/^(telegram_|farcaster_)/, "@");
  const message = `${username} is going to ${eventName}!`;

  let sent = 0;
  for (const friend of friends) {
    if (await hasReachedDailyLimit(ctx.supabase, friend.friend_id)) continue;
    if (await isUserQuietHours(ctx.supabase, friend.friend_id)) continue;

    const alreadySent = await isAlreadyNotified(
      ctx.supabase,
      friend.friend_id,
      "friend_rsvp",
      eventId,
      userId,
    );
    if (alreadySent) continue;

    const didSend = await sendToUser(ctx, friend.friend_id, message, sendTelegramMessage);
    if (didSend) {
      await logNotification(ctx.supabase, friend.friend_id, "friend_rsvp", eventId, userId);
      sent++;
    }
  }

  return sent;
}

// ============================================================================
// Event Reminder
// ============================================================================

/**
 * Send reminders for events starting in ~30 minutes.
 * Run this on a cron/interval.
 */
export async function sendEventReminders(
  ctx: NotifyContext,
  sendTelegramMessage?: (chatId: number, text: string) => Promise<void>,
): Promise<number> {
  const now = new Date();
  const thirtyMinFromNow = new Date(now.getTime() + 30 * 60 * 1000);
  const fortyMinFromNow = new Date(now.getTime() + 40 * 60 * 1000);

  // Find schedules starting in 30-40 min window (allows for 10 min processing window)
  const entries = await sbQuery<any[]>(ctx.supabase, "flowb_schedules", {
    select: "user_id,event_title,venue_name,starts_at",
    rsvp_status: "eq.going",
    and: `(starts_at.gte.${thirtyMinFromNow.toISOString()},starts_at.lt.${fortyMinFromNow.toISOString()})`,
    limit: "100",
  });

  if (!entries?.length) return 0;

  let sent = 0;
  for (const entry of entries) {
    const alreadySent = await isAlreadyNotified(
      ctx.supabase,
      entry.user_id,
      "event_reminder",
      entry.event_title,
      "system",
    );
    if (alreadySent) continue;

    const time = new Date(entry.starts_at).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    const message = `${entry.event_title} starts at ${time}${entry.venue_name ? ` at ${entry.venue_name}` : ""}`;

    const didSend = await sendToUser(ctx, entry.user_id, message, sendTelegramMessage);
    if (didSend) {
      await logNotification(ctx.supabase, entry.user_id, "event_reminder", entry.event_title, "system");
      sent++;
    }
  }

  return sent;
}

// ============================================================================
// Crew Join Notification
// ============================================================================

/**
 * Notify crew members when someone joins their crew.
 * Sends via Telegram bot DM (primary) or Farcaster notification (fallback).
 */
export async function notifyCrewJoin(
  ctx: NotifyContext,
  userId: string,
  crewId: string,
  crewName: string,
  crewEmoji: string,
  sendTelegramMessage?: (chatId: number, text: string) => Promise<void>,
): Promise<number> {
  if (await isUserQuietHours(ctx.supabase, userId)) return 0;

  // Get crew members (excluding the person who joined)
  const members = await sbQuery<any[]>(ctx.supabase, "flowb_group_members", {
    select: "user_id",
    group_id: `eq.${crewId}`,
    muted: "eq.false",
  });

  if (!members?.length) return 0;

  const username = userId.replace(/^(telegram_|farcaster_)/, "@");
  const message = `${crewEmoji} ${username} just joined ${crewName}! (+10 pts)`;

  let sent = 0;
  for (const member of members) {
    if (member.user_id === userId) continue;
    if (await hasReachedDailyLimit(ctx.supabase, member.user_id)) continue;
    if (await isUserQuietHours(ctx.supabase, member.user_id)) continue;

    const alreadySent = await isAlreadyNotified(
      ctx.supabase,
      member.user_id,
      "crew_join",
      `${crewId}:${userId}`,
      userId,
    );
    if (alreadySent) continue;

    const didSend = await sendToUser(ctx, member.user_id, message, sendTelegramMessage);
    if (didSend) {
      await logNotification(ctx.supabase, member.user_id, "crew_join", `${crewId}:${userId}`, userId);
      sent++;
    }
  }

  return sent;
}

// ============================================================================
// Crew Member RSVP Notification
// ============================================================================

/**
 * Notify crew members when someone RSVPs to an event.
 * Queries the user's crews, then notifies other members in each crew.
 */
export async function notifyCrewMemberRsvp(
  ctx: NotifyContext,
  userId: string,
  eventId: string,
  eventName: string,
  sendTelegramMessage?: (chatId: number, text: string) => Promise<void>,
): Promise<number> {
  // Get crews this user is in
  const memberships = await sbQuery<any[]>(ctx.supabase, "flowb_group_members", {
    select: "group_id,flowb_groups(name,emoji)",
    user_id: `eq.${userId}`,
    muted: "eq.false",
  });

  if (!memberships?.length) return 0;

  const username = userId.replace(/^(telegram_|farcaster_)/, "@");
  const notifiedSet = new Set<string>();
  let sent = 0;

  for (const m of memberships) {
    if (!m.flowb_groups) continue;
    const crewEmoji = m.flowb_groups.emoji || "";
    const message = `${crewEmoji} ${username} is going to ${eventName}! (+5 pts)`;

    // Get other members of this crew
    const members = await sbQuery<any[]>(ctx.supabase, "flowb_group_members", {
      select: "user_id",
      group_id: `eq.${m.group_id}`,
      muted: "eq.false",
    });

    for (const member of members || []) {
      if (member.user_id === userId) continue;
      if (notifiedSet.has(member.user_id)) continue; // dedup across crews
      if (await hasReachedDailyLimit(ctx.supabase, member.user_id)) continue;
      if (await isUserQuietHours(ctx.supabase, member.user_id)) continue;

      const alreadySent = await isAlreadyNotified(
        ctx.supabase,
        member.user_id,
        "crew_rsvp",
        eventId,
        userId,
      );
      if (alreadySent) continue;

      const didSend = await sendToUser(ctx, member.user_id, message, sendTelegramMessage);
      if (didSend) {
        await logNotification(ctx.supabase, member.user_id, "crew_rsvp", eventId, userId);
        notifiedSet.add(member.user_id);
        sent++;
      }
    }
  }

  return sent;
}

// ============================================================================
// Helpers
// ============================================================================

/** Send notification to a user via their primary platform */
async function sendToUser(
  ctx: NotifyContext,
  userId: string,
  message: string,
  sendTelegramMessage?: (chatId: number, text: string) => Promise<void>,
): Promise<boolean> {
  // Telegram users
  if (userId.startsWith("telegram_") && sendTelegramMessage) {
    const chatId = parseInt(userId.replace("telegram_", ""), 10);
    if (!isNaN(chatId)) {
      try {
        await sendTelegramMessage(chatId, message);
        return true;
      } catch (err) {
        console.error(`[notify] TG send failed for ${userId}:`, err);
      }
    }
  }

  // Farcaster users
  if (userId.startsWith("farcaster_")) {
    const fid = parseInt(userId.replace("farcaster_", ""), 10);
    if (!isNaN(fid)) {
      const appUrl = process.env.FLOWB_FC_APP_URL || "https://flowb-farcaster.netlify.app";
      return sendFarcasterNotification(ctx.supabase, fid, "FlowB", message, appUrl);
    }
  }

  return false;
}

/** Check if a notification was already sent (dedup) */
async function isAlreadyNotified(
  cfg: SbConfig,
  recipientId: string,
  type: string,
  referenceId: string,
  triggeredBy: string,
): Promise<boolean> {
  const rows = await sbQuery<any[]>(cfg, "flowb_notification_log", {
    select: "id",
    recipient_id: `eq.${recipientId}`,
    notification_type: `eq.${type}`,
    reference_id: `eq.${referenceId}`,
    triggered_by: `eq.${triggeredBy}`,
    limit: "1",
  });
  return !!rows?.length;
}

/** Log a sent notification for dedup */
async function logNotification(
  cfg: SbConfig,
  recipientId: string,
  type: string,
  referenceId: string,
  triggeredBy: string,
): Promise<void> {
  await fetch(
    `${cfg.supabaseUrl}/rest/v1/flowb_notification_log?on_conflict=recipient_id,notification_type,reference_id,triggered_by`,
    {
      method: "POST",
      headers: {
        apikey: cfg.supabaseKey,
        Authorization: `Bearer ${cfg.supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal,resolution=merge-duplicates",
      },
      body: JSON.stringify({ recipient_id: recipientId, notification_type: type, reference_id: referenceId, triggered_by: triggeredBy }),
    },
  ).catch(() => {});
}

/** Check if user has received too many notifications today (max 10) */
async function hasReachedDailyLimit(cfg: SbConfig, userId: string): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const rows = await sbQuery<any[]>(cfg, "flowb_notification_log", {
    select: "id",
    recipient_id: `eq.${userId}`,
    sent_at: `gte.${todayStart.toISOString()}`,
  });

  return (rows?.length || 0) >= 10;
}

/**
 * Check if it's quiet hours for a specific user (opt-in).
 * Users must enable quiet hours via preferences. Default: OFF.
 * When enabled, uses their timezone (default: America/Denver / MST).
 */
async function isUserQuietHours(cfg: SbConfig, userId: string): Promise<boolean> {
  const prefs = await sbQuery<any[]>(cfg, "flowb_sessions", {
    select: "quiet_hours_enabled,timezone",
    user_id: `eq.${userId}`,
    limit: "1",
  });

  const pref = prefs?.[0];
  if (!pref?.quiet_hours_enabled) return false; // opt-in only

  const tz = pref.timezone || "America/Denver";
  try {
    const nowInTz = new Date().toLocaleString("en-US", { timeZone: tz, hour12: false });
    const hour = parseInt(nowInTz.split(",")[1]?.trim().split(":")[0] || "0", 10);
    return hour >= 22 || hour < 8;
  } catch {
    // Fallback to MST if timezone is invalid
    const now = new Date();
    const mstHour = (now.getUTCHours() - 7 + 24) % 24;
    return mstHour >= 22 || mstHour < 8;
  }
}

/** Supabase query helper */
async function sbQuery<T>(cfg: SbConfig, table: string, params: Record<string, string>): Promise<T | null> {
  const url = new URL(`${cfg.supabaseUrl}/rest/v1/${table}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url.toString(), {
      headers: {
        apikey: cfg.supabaseKey,
        Authorization: `Bearer ${cfg.supabaseKey}`,
      },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}
