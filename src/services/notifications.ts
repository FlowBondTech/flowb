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

    // Check per-type toggle
    const prefs = await getUserNotifyPrefs(ctx.supabase, member.user_id);
    if (!prefs.notify_crew_checkins) continue;

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
    // Check per-type toggle
    const prefs = await getUserNotifyPrefs(ctx.supabase, friend.friend_id);
    if (!prefs.notify_friend_rsvps) continue;

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
 * Send reminders based on flowb_event_reminders table entries.
 * Queries unsent reminders, checks if the event's start time minus
 * remind_minutes_before falls within a 10-minute processing window from now.
 * Run this on a cron/interval.
 */
export async function sendEventReminders(
  ctx: NotifyContext,
  sendTelegramMessage?: (chatId: number, text: string) => Promise<void>,
): Promise<number> {
  const now = new Date();

  // Get all unsent reminders with their event details via a join-like approach:
  // First get pending reminders, then look up schedule details
  const reminders = await sbQuery<any[]>(ctx.supabase, "flowb_event_reminders", {
    select: "id,user_id,event_source_id,remind_minutes_before",
    sent: "eq.false",
    limit: "200",
  });

  if (!reminders?.length) return 0;

  let sent = 0;
  for (const reminder of reminders) {
    // Look up the event schedule for this reminder
    const schedules = await sbQuery<any[]>(ctx.supabase, "flowb_schedules", {
      select: "event_title,venue_name,starts_at",
      event_source_id: `eq.${reminder.event_source_id}`,
      user_id: `eq.${reminder.user_id}`,
      rsvp_status: "in.(going,maybe)",
      limit: "1",
    });

    const schedule = schedules?.[0];
    if (!schedule?.starts_at) continue;

    // Check if reminder is due: starts_at - remind_minutes_before should be within [now, now+10min]
    const eventStart = new Date(schedule.starts_at).getTime();
    const reminderDue = eventStart - reminder.remind_minutes_before * 60 * 1000;
    const windowEnd = now.getTime() + 10 * 60 * 1000;

    if (reminderDue > windowEnd || reminderDue < now.getTime() - 10 * 60 * 1000) continue;

    // Check user's notify_event_reminders preference
    const userPrefs = await getUserNotifyPrefs(ctx.supabase, reminder.user_id);
    if (!userPrefs.notify_event_reminders) {
      // Mark as sent so we don't re-check
      await markReminderSent(ctx.supabase, reminder.id);
      continue;
    }

    if (await hasReachedDailyLimit(ctx.supabase, reminder.user_id)) continue;
    if (await isUserQuietHours(ctx.supabase, reminder.user_id)) continue;

    // Format the time label
    const minsLabel = formatReminderLabel(reminder.remind_minutes_before);
    const time = new Date(schedule.starts_at).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    const message = `${schedule.event_title} starts ${minsLabel} (${time})${schedule.venue_name ? ` at ${schedule.venue_name}` : ""}`;

    const didSend = await sendToUser(ctx, reminder.user_id, message, sendTelegramMessage);
    if (didSend) {
      await logNotification(ctx.supabase, reminder.user_id, "event_reminder", `${reminder.event_source_id}:${reminder.remind_minutes_before}`, "system");
      sent++;
    }

    // Always mark as sent to avoid re-sending
    await markReminderSent(ctx.supabase, reminder.id);
  }

  return sent;
}

/** Format minutes into a human-readable reminder label */
function formatReminderLabel(minutes: number): string {
  if (minutes < 60) return `in ${minutes} min`;
  if (minutes < 1440) return `in ${Math.round(minutes / 60)} hour${minutes >= 120 ? "s" : ""}`;
  return `in ${Math.round(minutes / 1440)} day${minutes >= 2880 ? "s" : ""}`;
}

/** Mark a reminder as sent */
async function markReminderSent(cfg: SbConfig, reminderId: string): Promise<void> {
  await fetch(
    `${cfg.supabaseUrl}/rest/v1/flowb_event_reminders?id=eq.${reminderId}`,
    {
      method: "PATCH",
      headers: {
        apikey: cfg.supabaseKey,
        Authorization: `Bearer ${cfg.supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ sent: true }),
    },
  ).catch(() => {});
}

/** Get user notification preferences (cached-friendly shape) */
async function getUserNotifyPrefs(cfg: SbConfig, userId: string): Promise<{
  notify_crew_checkins: boolean;
  notify_friend_rsvps: boolean;
  notify_crew_rsvps: boolean;
  notify_event_reminders: boolean;
  notify_daily_digest: boolean;
  daily_notification_limit: number;
  quiet_hours_start: number;
  quiet_hours_end: number;
}> {
  const rows = await sbQuery<any[]>(cfg, "flowb_sessions", {
    select: "notify_crew_checkins,notify_friend_rsvps,notify_crew_rsvps,notify_event_reminders,notify_daily_digest,daily_notification_limit,quiet_hours_start,quiet_hours_end",
    user_id: `eq.${userId}`,
    limit: "1",
  });
  const p = rows?.[0];
  return {
    notify_crew_checkins: p?.notify_crew_checkins ?? true,
    notify_friend_rsvps: p?.notify_friend_rsvps ?? true,
    notify_crew_rsvps: p?.notify_crew_rsvps ?? true,
    notify_event_reminders: p?.notify_event_reminders ?? true,
    notify_daily_digest: p?.notify_daily_digest ?? true,
    daily_notification_limit: p?.daily_notification_limit ?? 10,
    quiet_hours_start: p?.quiet_hours_start ?? 22,
    quiet_hours_end: p?.quiet_hours_end ?? 8,
  };
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

      // Check per-type toggle
      const memberPrefs = await getUserNotifyPrefs(ctx.supabase, member.user_id);
      if (!memberPrefs.notify_crew_rsvps) continue;

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
// Crew Locate Ping ("Where are you?")
// ============================================================================

/**
 * Send "Where are you?" ping to crew members without active checkins.
 * Includes inline keyboard to check in via the mini app.
 */
export async function notifyCrewLocate(
  ctx: NotifyContext,
  requesterId: string,
  crewId: string,
  crewName: string,
  crewEmoji: string,
  memberIds: string[],
  sendTelegramMessage?: (chatId: number, text: string) => Promise<void>,
): Promise<number> {
  const requesterName = requesterId.replace(/^(telegram_|farcaster_)/, "@");
  const message = `${crewEmoji} ${requesterName} is looking for you! Where are you? Check in to let your ${crewName} crew know.`;

  let sent = 0;
  for (const memberId of memberIds) {
    // Check per-type toggle
    const prefs = await getUserNotifyPrefs(ctx.supabase, memberId);
    if (!prefs.notify_crew_checkins) continue;

    if (await hasReachedDailyLimit(ctx.supabase, memberId)) continue;
    if (await isUserQuietHours(ctx.supabase, memberId)) continue;

    // Dedup
    const alreadySent = await isAlreadyNotified(
      ctx.supabase,
      memberId,
      "locate_ping",
      crewId,
      requesterId,
    );
    if (alreadySent) continue;

    const didSend = await sendToUser(ctx, memberId, message, sendTelegramMessage);
    if (didSend) {
      await logNotification(ctx.supabase, memberId, "locate_ping", crewId, requesterId);
      sent++;
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

/** Check if user has received too many notifications today (configurable limit) */
async function hasReachedDailyLimit(cfg: SbConfig, userId: string): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const prefs = await getUserNotifyPrefs(cfg, userId);
  const limit = prefs.daily_notification_limit;

  const rows = await sbQuery<any[]>(cfg, "flowb_notification_log", {
    select: "id",
    recipient_id: `eq.${userId}`,
    sent_at: `gte.${todayStart.toISOString()}`,
  });

  return (rows?.length || 0) >= limit;
}

/**
 * Check if it's quiet hours for a specific user (opt-in).
 * Users must enable quiet hours via preferences. Default: OFF.
 * When enabled, uses their timezone and configurable start/end hours.
 */
async function isUserQuietHours(cfg: SbConfig, userId: string): Promise<boolean> {
  const prefs = await sbQuery<any[]>(cfg, "flowb_sessions", {
    select: "quiet_hours_enabled,timezone,quiet_hours_start,quiet_hours_end",
    user_id: `eq.${userId}`,
    limit: "1",
  });

  const pref = prefs?.[0];
  if (!pref?.quiet_hours_enabled) return false; // opt-in only

  const tz = pref.timezone || "America/Denver";
  const qhStart = pref.quiet_hours_start ?? 22;
  const qhEnd = pref.quiet_hours_end ?? 8;

  try {
    const nowInTz = new Date().toLocaleString("en-US", { timeZone: tz, hour12: false });
    const hour = parseInt(nowInTz.split(",")[1]?.trim().split(":")[0] || "0", 10);

    // Handle wrap-around (e.g., 22:00 to 08:00)
    if (qhStart > qhEnd) {
      return hour >= qhStart || hour < qhEnd;
    }
    return hour >= qhStart && hour < qhEnd;
  } catch {
    // Fallback to MST if timezone is invalid
    const now = new Date();
    const mstHour = (now.getUTCHours() - 7 + 24) % 24;
    if (qhStart > qhEnd) {
      return mstHour >= qhStart || mstHour < qhEnd;
    }
    return mstHour >= qhStart && mstHour < qhEnd;
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
