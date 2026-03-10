/**
 * FlowB Notification Service
 *
 * Cross-platform notification dispatch for:
 *   - Crew checkin alerts ("Alice is at Main Stage")
 *   - Friend RSVP alerts ("Alice is going to [event]")
 *   - Event reminders (30 min before RSVP'd events)
 *   - Daily morning digest
 *   - Business notifications (meetings, leads, commissions, automations)
 *
 * Features:
 *   - Cross-platform dedup (Telegram preferred for push, Farcaster for social)
 *   - Quiet hours (10pm-8am MST)
 *   - Rate limiting (max 10/day/user)
 *   - Priority tiers (P0 urgent, P1 important, P2 digest)
 *   - DND mode respects user opt-out
 *   - Digest queue for P2 batch processing
 */

import { sendFarcasterNotification } from "./farcaster-notify.js";
import { sendWhatsAppNotification } from "../whatsapp/templates.js";
import { sendSignalNotification } from "../signal/api.js";
import { sendEmailNotification } from "./email.js";
import { sendExpoPushToUser } from "./expo-push.js";
import { sbQuery, sbFetch, sbInsert, sbPatch, type SbConfig } from "../utils/supabase.js";
import { log, fireAndForget } from "../utils/logger.js";

interface NotifyContext {
  supabase: SbConfig;
  botToken?: string;
}

// ============================================================================
// Priority Tiers
// ============================================================================

/** P0: Urgent - immediate delivery via all channels */
/** P1: Important - immediate delivery via primary channel only */
/** P2: Digest - queued for daily/weekly batch processing */
export type NotifyPriority = "p0" | "p1" | "p2";

/** Business notification event types */
export type BizNotifyType =
  | "meeting_reminder"
  | "lead_stage_change"
  | "commission_earned"
  | "automation_executed"
  | string; // allow custom types

export interface BizNotifyOptions {
  userId: string;
  title: string;
  body: string;
  priority: NotifyPriority;
  type: BizNotifyType;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Business Notification Dispatch
// ============================================================================

/**
 * Send a business notification with priority routing.
 *
 * - P0 (urgent): Immediate delivery, all channels, bypasses quiet hours
 * - P1 (important): Immediate delivery, primary channel only
 * - P2 (digest): Queued to flowb_digest_queue for batch processing
 *
 * Respects user DND settings (dnd_enabled on flowb_sessions).
 * Returns true if the notification was sent or queued successfully.
 */
export async function sendBizNotification(
  ctx: NotifyContext,
  opts: BizNotifyOptions,
  sendTelegramMessage?: (chatId: number, text: string) => Promise<void>,
): Promise<boolean> {
  const { userId, title, body, priority, type, metadata } = opts;

  // Check DND (Do Not Disturb) — P0 bypasses DND
  if (priority !== "p0") {
    const isDnd = await isUserDndEnabled(ctx.supabase, userId);
    if (isDnd) {
      log.debug("[biz-notify]", `Skipping ${type} for ${userId}: DND enabled`, { priority });
      return false;
    }
  }

  // P2: queue for digest batch processing
  if (priority === "p2") {
    return await queueForDigest(ctx.supabase, userId, type, title, body, priority, metadata);
  }

  // P0/P1: send immediately
  const message = `${title}\n${body}`;

  if (priority === "p0") {
    // P0: all channels - send to primary and attempt fallbacks
    const didSend = await sendToUser(ctx, userId, message, sendTelegramMessage);
    if (didSend) {
      await logNotification(ctx.supabase, userId, `biz_${type}`, type, "system");
    }
    return didSend;
  }

  // P1: primary channel only (same as sendToUser which tries primary first)
  if (await hasReachedDailyLimit(ctx.supabase, userId)) {
    log.debug("[biz-notify]", `Daily limit reached for ${userId}`, { type });
    return false;
  }
  if (await isUserQuietHours(ctx.supabase, userId)) {
    log.debug("[biz-notify]", `Quiet hours for ${userId}, downgrading to digest`, { type });
    // Downgrade P1 to digest during quiet hours instead of dropping
    return await queueForDigest(ctx.supabase, userId, type, title, body, "p1", metadata);
  }

  const didSend = await sendToUser(ctx, userId, message, sendTelegramMessage);
  if (didSend) {
    await logNotification(ctx.supabase, userId, `biz_${type}`, type, "system");
  }
  return didSend;
}

// ============================================================================
// Digest Queue Processing
// ============================================================================

/**
 * Process the digest queue: fetch all pending items grouped by user,
 * compose a single digest message per user, send it, and mark items as sent.
 *
 * Intended to be called by a cron job (e.g. daily at 9am user-local time).
 * Returns the number of users who received a digest.
 */
export async function processDigestQueue(
  ctx: NotifyContext,
  sendTelegramMessage?: (chatId: number, text: string) => Promise<void>,
): Promise<number> {
  // Fetch all unsent digest items
  const pending = await sbFetch<any[]>(
    ctx.supabase,
    `flowb_digest_queue?sent_at=is.null&order=created_at.asc&limit=500`,
  );

  if (!pending?.length) {
    log.debug("[digest]", "No pending digest items");
    return 0;
  }

  // Group by user_id
  const byUser = new Map<string, typeof pending>();
  for (const item of pending) {
    const list = byUser.get(item.user_id) || [];
    list.push(item);
    byUser.set(item.user_id, list);
  }

  let usersNotified = 0;

  for (const [userId, items] of byUser) {
    // Check DND before sending digest
    const isDnd = await isUserDndEnabled(ctx.supabase, userId);
    if (isDnd) {
      log.debug("[digest]", `Skipping digest for ${userId}: DND enabled`);
      continue;
    }

    // Compose digest message
    const digestLines: string[] = ["Your FlowB digest:", ""];
    for (const item of items) {
      const content = item.content || {};
      const title = content.title || item.message_type;
      const body = content.body || "";
      digestLines.push(`- ${title}${body ? `: ${body}` : ""}`);
    }
    const digestMessage = digestLines.join("\n");

    // Send the composed digest
    const didSend = await sendToUser(ctx, userId, digestMessage, sendTelegramMessage);

    // Mark all items for this user as sent (regardless of send success to avoid infinite retries)
    const now = new Date().toISOString();
    const itemIds = items.map((i: any) => i.id);
    for (const itemId of itemIds) {
      fireAndForget(
        sbPatch(
          ctx.supabase,
          "flowb_digest_queue",
          { id: `eq.${itemId}` },
          { sent_at: now },
        ).then(() => {}),
        `mark digest item ${itemId} as sent`,
      );
    }

    if (didSend) {
      await logNotification(ctx.supabase, userId, "biz_digest", `digest_${now}`, "system");
      usersNotified++;
    } else {
      log.warn("[digest]", `Failed to deliver digest for ${userId}`, { itemCount: items.length });
    }
  }

  log.info("[digest]", `Processed digest queue`, {
    totalItems: pending.length,
    users: byUser.size,
    delivered: usersNotified,
  });

  return usersNotified;
}

// ============================================================================
// Business Event Notification Helpers
// ============================================================================

/**
 * Notify a user about an upcoming meeting.
 * Priority: P1 (important) - immediate delivery.
 */
export function notifyMeetingReminder(
  ctx: NotifyContext,
  userId: string,
  meetingTitle: string,
  startsAt: Date,
  minutesBefore: number,
  sendTelegramMessage?: (chatId: number, text: string) => Promise<void>,
): void {
  const timeStr = startsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const label = formatReminderLabel(minutesBefore);

  fireAndForget(
    sendBizNotification(ctx, {
      userId,
      title: `Meeting ${label}`,
      body: `${meetingTitle} at ${timeStr}`,
      priority: "p1",
      type: "meeting_reminder",
      metadata: { meeting_title: meetingTitle, starts_at: startsAt.toISOString(), minutes_before: minutesBefore },
    }, sendTelegramMessage),
    `meeting reminder for ${userId}`,
  );
}

/**
 * Notify a user that a lead changed stages.
 * Priority: P2 (digest) - batched for daily delivery.
 */
export function notifyLeadStageChange(
  ctx: NotifyContext,
  userId: string,
  leadName: string,
  fromStage: string,
  toStage: string,
): void {
  fireAndForget(
    sendBizNotification(ctx, {
      userId,
      title: "Lead moved",
      body: `${leadName}: ${fromStage} -> ${toStage}`,
      priority: "p2",
      type: "lead_stage_change",
      metadata: { lead_name: leadName, from_stage: fromStage, to_stage: toStage },
    }),
    `lead stage change for ${userId}`,
  );
}

/**
 * Notify a user that they earned a commission.
 * Priority: P1 (important) - immediate delivery.
 */
export function notifyCommissionEarned(
  ctx: NotifyContext,
  userId: string,
  amount: number,
  currency: string,
  source: string,
): void {
  fireAndForget(
    sendBizNotification(ctx, {
      userId,
      title: "Commission earned",
      body: `${amount} ${currency} from ${source}`,
      priority: "p1",
      type: "commission_earned",
      metadata: { amount, currency, source },
    }),
    `commission earned for ${userId}`,
  );
}

/**
 * Notify a user that an automation was executed.
 * Priority: P2 (digest) - batched for daily delivery.
 */
export function notifyAutomationExecuted(
  ctx: NotifyContext,
  userId: string,
  automationName: string,
  result: "success" | "failure",
  details?: string,
): void {
  fireAndForget(
    sendBizNotification(ctx, {
      userId,
      title: `Automation ${result === "success" ? "ran" : "failed"}: ${automationName}`,
      body: details || (result === "success" ? "Completed successfully" : "Check logs for details"),
      priority: "p2",
      type: "automation_executed",
      metadata: { automation_name: automationName, result, details },
    }),
    `automation executed for ${userId}`,
  );
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

  const displayName = await resolveDisplayName(ctx.supabase, userId);

  // Build crew deep link for Telegram mini app
  const crewDetails = await sbFetch<any[]>(
    ctx.supabase,
    `flowb_groups?id=eq.${crewId}&select=join_code&limit=1`,
  );
  const joinCode = crewDetails?.[0]?.join_code;
  const botUsername = process.env.FLOWB_BOT_USERNAME || "Flow_b_bot";
  const crewLink = joinCode ? `https://t.me/${botUsername}/flowb?startapp=crew_${joinCode}` : "";

  const message = `${crewEmoji} ${displayName} checked in at ${venueName} (${crewName}) (+5 pts)${crewLink ? `\n\nView crew: ${crewLink}` : ""}`;

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

/** Format event time + link for RSVP notification messages */
function formatEventDetails(startTime?: string | null, url?: string | null): string {
  const parts: string[] = [];
  if (startTime) {
    const d = new Date(startTime);
    const timeStr = d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Denver" });
    parts.push(`\n\ud83d\udcc5 ${timeStr} MST`);
  }
  if (url) parts.push(`\n\ud83d\udd17 <a href="${url}">${url}</a>`);
  return parts.join("");
}

/** Build Telegram inline keyboard with RSVP buttons for an event */
function buildRsvpButtons(eventId: string): { parse_mode: string; link_preview_options: any; reply_markup: any } {
  const id8 = eventId.slice(0, 8);
  return {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: {
      inline_keyboard: [
        [
          { text: "\u2705 I'm going too", callback_data: `fl:going:${id8}` },
          { text: "\ud83e\udd14 Maybe", callback_data: `fl:maybe:${id8}` },
        ],
      ],
    },
  };
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
  eventStartTime?: string | null,
  eventUrl?: string | null,
): Promise<number> {

  // Get active friends
  const friends = await sbQuery<any[]>(ctx.supabase, "flowb_connections", {
    select: "friend_id",
    user_id: `eq.${userId}`,
    status: "eq.active",
  });

  if (!friends?.length) return 0;

  const displayName = await resolveDisplayName(ctx.supabase, userId);
  const details = formatEventDetails(eventStartTime, eventUrl);
  const message = `<b>${displayName}</b> is going to <b>${eventName}</b>!${details}\n\nYou in?`;
  const rsvpButtons = buildRsvpButtons(eventId);

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

    const didSend = await sendToUser(ctx, friend.friend_id, message, sendTelegramMessage, rsvpButtons);
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
  ).catch(err => log.error("[notify]", "markReminderSent failed", { error: err instanceof Error ? err.message : String(err) }));
}

/** Get user notification preferences (cached-friendly shape) */
async function getUserNotifyPrefs(cfg: SbConfig, userId: string): Promise<{
  notify_crew_checkins: boolean;
  notify_friend_rsvps: boolean;
  notify_crew_rsvps: boolean;
  notify_crew_messages: boolean;
  notify_event_reminders: boolean;
  notify_daily_digest: boolean;
  daily_notification_limit: number;
  quiet_hours_start: number;
  quiet_hours_end: number;
}> {
  const rows = await sbQuery<any[]>(cfg, "flowb_sessions", {
    select: "notify_crew_checkins,notify_friend_rsvps,notify_crew_rsvps,notify_crew_messages,notify_event_reminders,notify_daily_digest,daily_notification_limit,quiet_hours_start,quiet_hours_end",
    user_id: `eq.${userId}`,
    limit: "1",
  });
  const p = rows?.[0];
  return {
    notify_crew_checkins: p?.notify_crew_checkins ?? true,
    notify_friend_rsvps: p?.notify_friend_rsvps ?? true,
    notify_crew_rsvps: p?.notify_crew_rsvps ?? true,
    notify_crew_messages: p?.notify_crew_messages ?? true,
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
  // NOTE: Don't check joiner's quiet hours here -- each recipient's quiet hours
  // are checked individually in the loop below.

  // Get crew members (excluding the person who joined)
  const members = await sbQuery<any[]>(ctx.supabase, "flowb_group_members", {
    select: "user_id",
    group_id: `eq.${crewId}`,
    muted: "eq.false",
  });

  if (!members?.length) return 0;

  const displayName = await resolveDisplayName(ctx.supabase, userId);
  const message = `${crewEmoji} ${displayName} just joined ${crewName}! (+10 pts)`;

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
  eventStartTime?: string | null,
  eventUrl?: string | null,
): Promise<number> {
  // Get crews this user is in
  const memberships = await sbQuery<any[]>(ctx.supabase, "flowb_group_members", {
    select: "group_id,flowb_groups(name,emoji)",
    user_id: `eq.${userId}`,
    muted: "eq.false",
  });

  if (!memberships?.length) return 0;

  const displayName = await resolveDisplayName(ctx.supabase, userId);
  const details = formatEventDetails(eventStartTime, eventUrl);
  const rsvpButtons = buildRsvpButtons(eventId);
  const notifiedSet = new Set<string>();
  let sent = 0;

  for (const m of memberships) {
    if (!m.flowb_groups) continue;
    const crewEmoji = m.flowb_groups.emoji || "";
    const crewName = m.flowb_groups.name || "";
    const message = `<b>${crewEmoji} ${displayName}</b> from <b>${crewName}</b> is going to <b>${eventName}</b>!${details}`;

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

      const didSend = await sendToUser(ctx, member.user_id, message, sendTelegramMessage, rsvpButtons);
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
  const requesterName = await resolveDisplayName(ctx.supabase, requesterId);
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
// Crew Message Notification
// ============================================================================

/**
 * Notify crew members when someone sends a message in crew chat.
 * Sends via Telegram bot DM (primary) or Farcaster notification (fallback).
 */
export async function notifyCrewMessage(
  ctx: NotifyContext,
  userId: string,
  crewId: string,
  crewName: string,
  crewEmoji: string,
  messageText: string,
  sendTelegramMessage?: (chatId: number, text: string) => Promise<void>,
): Promise<number> {

  // Get crew members (excluding the sender)
  const members = await sbQuery<any[]>(ctx.supabase, "flowb_group_members", {
    select: "user_id",
    group_id: `eq.${crewId}`,
    muted: "eq.false",
  });

  if (!members?.length) return 0;

  const displayName = await resolveDisplayName(ctx.supabase, userId);
  const preview = messageText.length > 80 ? messageText.slice(0, 77) + "..." : messageText;
  const message = `${crewEmoji} ${displayName} in ${crewName}: ${preview}`;

  let sent = 0;
  for (const member of members) {
    if (member.user_id === userId) continue;

    // Check per-type toggle
    const prefs = await getUserNotifyPrefs(ctx.supabase, member.user_id);
    if (!prefs.notify_crew_messages) continue;

    if (await hasReachedDailyLimit(ctx.supabase, member.user_id)) continue;
    if (await isUserQuietHours(ctx.supabase, member.user_id)) continue;

    // Check dedup -- use hourly bucket so the same sender can trigger notifications
    // again after an hour, preventing spam while still allowing follow-up messages
    const hourBucket = new Date().toISOString().slice(0, 13); // "2026-03-05T14"
    const alreadySent = await isAlreadyNotified(
      ctx.supabase,
      member.user_id,
      "crew_message",
      `${crewId}:${userId}:${hourBucket}`,
      userId,
    );
    if (alreadySent) continue;

    const didSend = await sendToUser(ctx, member.user_id, message, sendTelegramMessage);
    if (didSend) {
      await logNotification(ctx.supabase, member.user_id, "crew_message", `${crewId}:${userId}:${hourBucket}`, userId);
      sent++;
    }
  }

  return sent;
}

// ============================================================================
// Crew Role Change Notification
// ============================================================================

/**
 * Notify a user when their crew role changes (promoted/demoted).
 * Cross-platform: works for Telegram, Farcaster, WhatsApp, Signal, email users.
 */
export async function notifyRoleChange(
  ctx: NotifyContext,
  targetUserId: string,
  changedByUserId: string,
  crewId: string,
  crewName: string,
  crewEmoji: string,
  newRole: "admin" | "member",
  sendTelegramMessage?: (chatId: number, text: string) => Promise<void>,
): Promise<boolean> {
  const changedByName = await resolveDisplayName(ctx.supabase, changedByUserId);

  const message = newRole === "admin"
    ? `${crewEmoji} You've been promoted to admin in ${crewName} by ${changedByName}! You can now approve join requests, remove members, and manage settings.`
    : `${crewEmoji} Your role in ${crewName} has been changed to member by ${changedByName}.`;

  // Check dedup
  const alreadySent = await isAlreadyNotified(
    ctx.supabase,
    targetUserId,
    "role_change",
    `${crewId}:${newRole}`,
    changedByUserId,
  );
  if (alreadySent) return false;

  const didSend = await sendToUser(ctx, targetUserId, message, sendTelegramMessage);
  if (didSend) {
    await logNotification(ctx.supabase, targetUserId, "role_change", `${crewId}:${newRole}`, changedByUserId);
  }
  return didSend;
}

// ============================================================================
// Meeting Invite Notification
// ============================================================================

/**
 * Notify attendees when they're invited to a meeting.
 * Sends the meeting title + share link.
 */
export async function notifyMeetingInvite(
  ctx: NotifyContext,
  inviterId: string,
  meetingId: string,
  meetingTitle: string,
  shareLink: string,
  attendeeUserIds: string[],
  sendTelegramMessage?: (chatId: number, text: string) => Promise<void>,
): Promise<number> {
  if (!attendeeUserIds.length) return 0;

  const displayName = await resolveDisplayName(ctx.supabase, inviterId);
  const message = `${displayName} invited you to: ${meetingTitle}\n${shareLink}`;

  let sent = 0;
  for (const attendeeId of attendeeUserIds) {
    if (attendeeId === inviterId) continue;

    const prefs = await getUserNotifyPrefs(ctx.supabase, attendeeId);
    if (!prefs.notify_crew_messages) continue; // reuse crew_messages pref for meeting notifications

    if (await hasReachedDailyLimit(ctx.supabase, attendeeId)) continue;
    if (await isUserQuietHours(ctx.supabase, attendeeId)) continue;

    const alreadySent = await isAlreadyNotified(
      ctx.supabase,
      attendeeId,
      "meeting_invite",
      meetingId,
      inviterId,
    );
    if (alreadySent) continue;

    const didSend = await sendToUser(ctx, attendeeId, message, sendTelegramMessage);
    if (didSend) {
      await logNotification(ctx.supabase, attendeeId, "meeting_invite", meetingId, inviterId);
      sent++;
    }
  }

  return sent;
}

// ============================================================================
// Meeting Chat Notification
// ============================================================================

/**
 * Notify meeting attendees when someone sends a chat message.
 * Follows the same pattern as notifyCrewMessage.
 */
export async function notifyMeetingChat(
  ctx: NotifyContext,
  userId: string,
  meetingId: string,
  meetingTitle: string,
  messageText: string,
  sendTelegramMessage?: (chatId: number, text: string) => Promise<void>,
): Promise<number> {
  // Get meeting attendees (excluding the sender)
  const attendees = await sbQuery<any[]>(ctx.supabase, "flowb_meeting_attendees", {
    select: "user_id",
    meeting_id: `eq.${meetingId}`,
  });

  if (!attendees?.length) return 0;

  const displayName = await resolveDisplayName(ctx.supabase, userId);
  const preview = messageText.length > 80 ? messageText.slice(0, 77) + "..." : messageText;
  const message = `${displayName} in ${meetingTitle}: ${preview}`;

  let sent = 0;
  for (const attendee of attendees) {
    if (!attendee.user_id || attendee.user_id === userId) continue;

    const prefs = await getUserNotifyPrefs(ctx.supabase, attendee.user_id);
    if (!prefs.notify_crew_messages) continue;

    if (await hasReachedDailyLimit(ctx.supabase, attendee.user_id)) continue;
    if (await isUserQuietHours(ctx.supabase, attendee.user_id)) continue;

    const alreadySent = await isAlreadyNotified(
      ctx.supabase,
      attendee.user_id,
      "meeting_chat",
      `${meetingId}:${userId}`,
      userId,
    );
    if (alreadySent) continue;

    const didSend = await sendToUser(ctx, attendee.user_id, message, sendTelegramMessage);
    if (didSend) {
      await logNotification(ctx.supabase, attendee.user_id, "meeting_chat", `${meetingId}:${userId}`, userId);
      sent++;
    }
  }

  return sent;
}

// ============================================================================
// Helpers
// ============================================================================

/** Resolve a user ID (e.g. "telegram_123") to their display name from flowb_sessions */
async function resolveDisplayName(cfg: SbConfig, userId: string): Promise<string> {
  const rows = await sbQuery<any[]>(cfg, "flowb_sessions", {
    select: "display_name",
    user_id: `eq.${userId}`,
    limit: "1",
  });
  return rows?.[0]?.display_name || userId.replace(/^(telegram_|farcaster_)/, "");
}

/** Send notification to a user via their primary platform */
async function sendToUser(
  ctx: NotifyContext,
  userId: string,
  message: string,
  sendTelegramMessage?: (chatId: number, text: string) => Promise<void>,
  tgExtras?: { parse_mode?: string; reply_markup?: any; link_preview_options?: any },
): Promise<boolean> {
  // Telegram users
  if (userId.startsWith("telegram_")) {
    const chatId = parseInt(userId.replace("telegram_", ""), 10);
    if (!isNaN(chatId)) {
      try {
        if (sendTelegramMessage && !tgExtras) {
          await sendTelegramMessage(chatId, message);
          return true;
        }
        // Call TG Bot API directly (supports extras like inline keyboards)
        const botToken = ctx.botToken || process.env.FLOWB_TELEGRAM_BOT_TOKEN;
        if (botToken) {
          const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: message, ...tgExtras }),
          });
          if (res.ok) return true;
          console.error(`[notify] TG API send failed for ${userId}: ${res.status}`);
        }
      } catch (err) {
        console.error(`[notify] TG send failed for ${userId}:`, err);
      }
    }
  }

  // WhatsApp users
  if (userId.startsWith("whatsapp_")) {
    const phone = userId.replace("whatsapp_", "");
    if (phone) {
      try {
        return await sendWhatsAppNotification(phone, message);
      } catch (err) {
        console.error(`[notify] WA send failed for ${userId}:`, err);
      }
    }
  }

  // Signal users
  if (userId.startsWith("signal_")) {
    const phone = userId.replace("signal_", "");
    if (phone) {
      try {
        return await sendSignalNotification(phone, message);
      } catch (err) {
        console.error(`[notify] Signal send failed for ${userId}:`, err);
      }
    }
  }

  // Farcaster users
  if (userId.startsWith("farcaster_")) {
    const fid = parseInt(userId.replace("farcaster_", ""), 10);
    if (!isNaN(fid)) {
      const appUrl = process.env.FLOWB_FC_APP_URL || "https://farcaster.xyz/miniapps/oCHuaUqL5dRT/flowb";
      return sendFarcasterNotification(ctx.supabase, fid, "FlowB", message, appUrl);
    }
  }

  // Email users
  if (userId.startsWith("email_")) {
    return sendEmailNotification(ctx.supabase, userId, "FlowB Notification", message);
  }

  // Expo push: try for any user with registered push tokens (mobile app)
  try {
    const pushSent = await sendExpoPushToUser(ctx.supabase, userId, "FlowB", message);
    if (pushSent) return true;
  } catch (err) {
    console.error(`[notify] Expo push failed for ${userId}:`, err);
  }

  // Fallback: try email for any user that has one linked (secondary channel)
  try {
    const emailSent = await sendEmailNotification(ctx.supabase, userId, "FlowB Notification", message);
    if (emailSent) return true;
  } catch {
    // Email fallback is best-effort
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
  ).catch(err => log.error("[notify]", "logNotification failed", { error: err instanceof Error ? err.message : String(err) }));
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

/**
 * Check if user has Do Not Disturb enabled.
 * Reads dnd_enabled from flowb_sessions (added in migration 027).
 */
async function isUserDndEnabled(cfg: SbConfig, userId: string): Promise<boolean> {
  const rows = await sbQuery<any[]>(cfg, "flowb_sessions", {
    select: "dnd_enabled",
    user_id: `eq.${userId}`,
    limit: "1",
  });
  return rows?.[0]?.dnd_enabled === true;
}

/**
 * Insert a notification into the digest queue for later batch processing.
 * Uses the flowb_digest_queue table (migration 027) with JSONB content column.
 */
async function queueForDigest(
  cfg: SbConfig,
  userId: string,
  messageType: string,
  title: string,
  body: string,
  priority: NotifyPriority,
  metadata?: Record<string, unknown>,
): Promise<boolean> {
  const result = await sbInsert(cfg, "flowb_digest_queue", {
    user_id: userId,
    message_type: messageType,
    content: { title, body, ...(metadata ? { metadata } : {}) },
    priority,
    is_biz: true,
  });

  if (result) {
    log.debug("[biz-notify]", `Queued ${messageType} for ${userId} digest`, { priority });
    return true;
  }

  log.warn("[biz-notify]", `Failed to queue ${messageType} for ${userId}`, { priority });
  return false;
}

// ============================================================================
// Onboarding Reminders
// ============================================================================

/**
 * Send daily reminders to users who skipped onboarding.
 * Queries for users where onboarding_complete = false and sends a nudge.
 * Uses dedup via notification_log to send at most once per day per user.
 * Call this from a daily cron / scheduled task.
 */
export async function sendOnboardingReminders(
  ctx: NotifyContext,
  sendTelegramMessage?: (chatId: number, text: string) => Promise<void>,
): Promise<number> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD for dedup

  // Find users who haven't completed onboarding
  const users = await sbQuery<any[]>(ctx.supabase, "flowb_sessions", {
    select: "user_id",
    onboarding_complete: "eq.false",
    limit: "200",
  });

  if (!users?.length) return 0;

  let sent = 0;
  for (const { user_id } of users) {
    // Skip non-Telegram users (only TG mini app has this flow)
    if (!user_id.startsWith("telegram_")) continue;

    // Dedup: only once per day
    if (await isAlreadyNotified(ctx.supabase, user_id, "onboarding_reminder", today, "system")) continue;

    // Respect daily limit & quiet hours
    if (await hasReachedDailyLimit(ctx.supabase, user_id)) continue;
    if (await isUserQuietHours(ctx.supabase, user_id)) continue;
    if (await isUserDndEnabled(ctx.supabase, user_id)) continue;

    const message =
      "Hey! You haven't finished setting up FlowB yet. " +
      "Complete your profile to unlock points, join crews, and discover events tailored to you.\n\n" +
      "Tap to continue: https://t.me/Flow_b_bot/flowb";

    const ok = await sendToUser(ctx, user_id, message, sendTelegramMessage);
    if (ok) {
      await logNotification(ctx.supabase, user_id, "onboarding_reminder", today, "system");
      sent++;
    }
  }

  log.info("[notify]", `Sent ${sent} onboarding reminders`);
  return sent;
}
