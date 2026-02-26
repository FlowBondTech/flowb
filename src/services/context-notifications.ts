/**
 * Contextual Push Notification Engine
 *
 * Runs periodically (every 30 min) to send proactive, context-aware
 * notifications to users via Telegram DM (primary) or Farcaster (fallback).
 *
 * Notification triggers:
 *   1. "Your crew is active" — 2+ crew members checked in nearby in last 2h
 *   2. "Friends at an event" — friends RSVP'd to event you haven't
 *   3. "People heading your way" — 3+ connections have your city as destination
 *   4. "Post-event roundup" — after an attended event ends, show where crew went
 *   5. "Morning briefing" — daily at ~9am local: friends in city + schedule
 *
 * Dedup: Uses flowb_notifications_sent table. Same type+reference won't
 * re-send within 12 hours (configurable per type).
 *
 * Safety: Every operation is wrapped in try/catch. Individual failures
 * are logged but never crash the server or abort the run.
 */

import { sbFetch, sbQuery, type SbConfig } from "../utils/supabase.js";
import { log } from "../utils/logger.js";
import { sendFarcasterNotification } from "./farcaster-notify.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CtxNotifyConfig {
  supabase: SbConfig;
  botToken?: string;
}

interface ActiveUser {
  user_id: string;
  current_city: string | null;
  destination_city: string | null;
  timezone: string | null;
  notifications_enabled: boolean;
  notify_daily_digest: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: number;
  quiet_hours_end: number;
  daily_notification_limit: number;
}

// Cooldown windows per notification type (in hours)
const COOLDOWN_HOURS: Record<string, number> = {
  crew_active: 6,
  friends_at_event: 12,
  heading_your_way: 24,
  post_event: 48,
  morning_briefing: 20, // ~once per day
};

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

/**
 * Run all contextual notification checks for all active users.
 * Call this on a 30-minute interval from app.ts.
 */
export async function runContextNotifications(cfg: CtxNotifyConfig): Promise<{
  usersProcessed: number;
  notificationsSent: number;
  errors: number;
}> {
  const stats = { usersProcessed: 0, notificationsSent: 0, errors: 0 };

  try {
    // Get all active users with a telegram or farcaster user_id
    // who have notifications_enabled (or the column hasn't been set yet, defaulting to true)
    const users = await sbFetch<ActiveUser[]>(
      cfg.supabase,
      `flowb_sessions?select=user_id,current_city,destination_city,timezone,notifications_enabled,notify_daily_digest,quiet_hours_enabled,quiet_hours_start,quiet_hours_end,daily_notification_limit&or=(user_id.like.telegram_%25,user_id.like.farcaster_%25)&notifications_enabled=not.is.false&limit=500`,
    );

    if (!users?.length) {
      log.debug("[ctx-notify]", "No active users found");
      return stats;
    }

    log.info("[ctx-notify]", `Processing ${users.length} active users`);

    for (const user of users) {
      try {
        // Skip users in quiet hours
        if (isQuietHours(user)) continue;

        // Check daily limit
        if (await hasReachedDailyLimit(cfg.supabase, user.user_id, user.daily_notification_limit ?? 10)) continue;

        stats.usersProcessed++;

        // Run each trigger (order matters: most actionable first)
        const sent = await Promise.all([
          safeRun(() => checkCrewActive(cfg, user)),
          safeRun(() => checkFriendsAtEvent(cfg, user)),
          safeRun(() => checkHeadingYourWay(cfg, user)),
          safeRun(() => checkPostEventRoundup(cfg, user)),
          safeRun(() => checkMorningBriefing(cfg, user)),
        ]);

        for (const result of sent) {
          if (result.ok && result.sent) stats.notificationsSent++;
          if (!result.ok) stats.errors++;
        }
      } catch (err) {
        stats.errors++;
        log.error("[ctx-notify]", `Error processing user ${user.user_id}`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  } catch (err) {
    stats.errors++;
    log.error("[ctx-notify]", "Fatal error in runContextNotifications", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  log.info("[ctx-notify]", "Run complete", stats as any);
  return stats;
}

// ---------------------------------------------------------------------------
// Trigger 1: "Your crew is active"
// When 2+ crew members check in at nearby venues in last 2 hours
// ---------------------------------------------------------------------------

async function checkCrewActive(cfg: CtxNotifyConfig, user: ActiveUser): Promise<boolean> {
  if (!user.current_city) return false;

  // Get user's crews
  const memberships = await sbFetch<any[]>(
    cfg.supabase,
    `flowb_group_members?user_id=eq.${user.user_id}&select=group_id`,
  );
  if (!memberships?.length) return false;

  const crewIds = memberships.map((m: any) => m.group_id);
  const cutoff2h = new Date(Date.now() - 2 * 3600_000).toISOString();

  let sent = false;
  for (const crewId of crewIds) {
    // Check dedup
    if (await wasRecentlySent(cfg.supabase, user.user_id, "crew_active", crewId)) continue;

    // Get recent check-ins from this crew (excluding the user)
    const checkins = await sbFetch<any[]>(
      cfg.supabase,
      `flowb_checkins?crew_id=eq.${crewId}&created_at=gte.${cutoff2h}&user_id=neq.${user.user_id}&select=user_id,venue_name&order=created_at.desc&limit=20`,
    );

    if (!checkins || checkins.length < 2) continue;

    // Count unique members who checked in
    const uniqueMembers = [...new Set(checkins.map((c: any) => c.user_id))];
    if (uniqueMembers.length < 2) continue;

    // Get crew info
    const crewRows = await sbFetch<any[]>(
      cfg.supabase,
      `flowb_groups?id=eq.${crewId}&select=name,emoji&limit=1`,
    );
    const crew = crewRows?.[0];
    if (!crew) continue;

    // Get the most recent venue
    const latestVenue = checkins[0].venue_name || "nearby";

    const emoji = crew.emoji || "";
    const message = `${emoji} ${uniqueMembers.length} of your ${crew.name} crew just checked in at ${latestVenue}!`;

    const didSend = await sendToUser(cfg, user.user_id, message);
    if (didSend) {
      await recordSent(cfg.supabase, user.user_id, "crew_active", crewId);
      sent = true;
      break; // One crew notification per cycle
    }
  }

  return sent;
}

// ---------------------------------------------------------------------------
// Trigger 2: "Friends at an event"
// When friends RSVP to an upcoming event the user hasn't RSVP'd to
// ---------------------------------------------------------------------------

async function checkFriendsAtEvent(cfg: CtxNotifyConfig, user: ActiveUser): Promise<boolean> {
  // Get friend IDs
  const connections = await sbFetch<any[]>(
    cfg.supabase,
    `flowb_connections?user_id=eq.${user.user_id}&status=eq.active&select=friend_id`,
  );
  if (!connections?.length) return false;

  const friendIds = connections.map((c: any) => c.friend_id);
  const inClause = friendIds.map((id: string) => `"${id}"`).join(",");

  // Get friend attendance for upcoming events (next 48h)
  const now = new Date().toISOString();
  const soon = new Date(Date.now() + 48 * 3600_000).toISOString();

  const friendAttendance = await sbFetch<any[]>(
    cfg.supabase,
    `flowb_event_attendance?user_id=in.(${inClause})&status=eq.going&select=user_id,event_id`,
  );
  if (!friendAttendance?.length) return false;

  // Get user's own RSVPs
  const myAttendance = await sbFetch<any[]>(
    cfg.supabase,
    `flowb_event_attendance?user_id=eq.${user.user_id}&status=in.(going,maybe)&select=event_id`,
  );
  const myEventIds = new Set((myAttendance || []).map((a: any) => a.event_id));

  // Group by event
  const eventFriends = new Map<string, Set<string>>();
  for (const a of friendAttendance) {
    if (myEventIds.has(a.event_id)) continue; // Skip events user already RSVP'd to
    const set = eventFriends.get(a.event_id) || new Set();
    set.add(a.user_id);
    eventFriends.set(a.event_id, set);
  }

  // Find events with 2+ friends
  for (const [eventId, friendSet] of eventFriends) {
    if (friendSet.size < 2) continue;

    // Check dedup
    if (await wasRecentlySent(cfg.supabase, user.user_id, "friends_at_event", eventId)) continue;

    // Get event details (must be upcoming)
    const events = await sbFetch<any[]>(
      cfg.supabase,
      `flowb_events?id=eq.${eventId}&starts_at=gte.${now}&starts_at=lte.${soon}&select=id,title,starts_at&limit=1`,
    );
    const event = events?.[0];
    if (!event) continue;

    // Format time
    const startsAt = new Date(event.starts_at);
    const isToday = startsAt.toDateString() === new Date().toDateString();
    const timeLabel = isToday
      ? `today at ${startsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
      : "tomorrow";

    const message = `<b>${friendSet.size} friends</b> are going to <b>${event.title}</b> ${timeLabel}`;

    const didSend = await sendToUser(cfg, user.user_id, message);
    if (didSend) {
      await recordSent(cfg.supabase, user.user_id, "friends_at_event", eventId);
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Trigger 3: "People heading your way"
// When 3+ connections have the user's current city as destination
// ---------------------------------------------------------------------------

async function checkHeadingYourWay(cfg: CtxNotifyConfig, user: ActiveUser): Promise<boolean> {
  if (!user.current_city) return false;

  const refId = `city:${user.current_city}`;
  if (await wasRecentlySent(cfg.supabase, user.user_id, "heading_your_way", refId)) return false;

  // Get all connections (friends + crew)
  const connections = await sbFetch<any[]>(
    cfg.supabase,
    `flowb_connections?user_id=eq.${user.user_id}&status=eq.active&select=friend_id`,
  );
  const friendIds = (connections || []).map((c: any) => c.friend_id);

  // Also get crew members
  const myMemberships = await sbFetch<any[]>(
    cfg.supabase,
    `flowb_group_members?user_id=eq.${user.user_id}&select=group_id`,
  );
  const crewIds = (myMemberships || []).map((m: any) => m.group_id);

  let crewMemberIds: string[] = [];
  if (crewIds.length) {
    const crewMembers = await sbFetch<any[]>(
      cfg.supabase,
      `flowb_group_members?group_id=in.(${crewIds.join(",")})&user_id=neq.${user.user_id}&select=user_id`,
    );
    crewMemberIds = (crewMembers || []).map((m: any) => m.user_id);
  }

  const allPeopleIds = [...new Set([...friendIds, ...crewMemberIds])];
  if (allPeopleIds.length < 3) return false;

  const inClause = allPeopleIds.map((id: string) => `"${id}"`).join(",");

  // Count people whose destination_city matches user's current_city
  const headingHere = await sbFetch<any[]>(
    cfg.supabase,
    `flowb_sessions?user_id=in.(${inClause})&destination_city=eq.${encodeURIComponent(user.current_city)}&location_visibility=neq.hidden&select=user_id`,
  );

  const count = headingHere?.length || 0;
  if (count < 3) return false;

  const message = `${count} people in your network are heading to ${user.current_city}!`;

  const didSend = await sendToUser(cfg, user.user_id, message);
  if (didSend) {
    await recordSent(cfg.supabase, user.user_id, "heading_your_way", refId);
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Trigger 4: "Post-event roundup"
// After an attended event ends, show where crew/friends went next
// ---------------------------------------------------------------------------

async function checkPostEventRoundup(cfg: CtxNotifyConfig, user: ActiveUser): Promise<boolean> {
  // Find events the user attended that ended in the last 3 hours
  const threeHoursAgo = new Date(Date.now() - 3 * 3600_000).toISOString();
  const now = new Date().toISOString();

  const myAttendance = await sbFetch<any[]>(
    cfg.supabase,
    `flowb_event_attendance?user_id=eq.${user.user_id}&status=eq.going&select=event_id`,
  );
  if (!myAttendance?.length) return false;

  const eventIds = myAttendance.map((a: any) => a.event_id);
  const eventIdClause = eventIds.map((id: string) => `"${id}"`).join(",");

  // Find events that have ended (ends_at is past, or starts_at + 3h is past)
  const recentlyEnded = await sbFetch<any[]>(
    cfg.supabase,
    `flowb_events?id=in.(${eventIdClause})&starts_at=lte.${threeHoursAgo}&select=id,title&limit=5`,
  );

  if (!recentlyEnded?.length) return false;

  // Get crew member IDs for context
  const myMemberships = await sbFetch<any[]>(
    cfg.supabase,
    `flowb_group_members?user_id=eq.${user.user_id}&select=group_id`,
  );
  const crewIds = (myMemberships || []).map((m: any) => m.group_id);

  for (const event of recentlyEnded) {
    const refId = `post:${event.id}`;
    if (await wasRecentlySent(cfg.supabase, user.user_id, "post_event", refId)) continue;

    // Find check-ins from crew members in the last 2 hours (where they went after)
    if (!crewIds.length) continue;

    const cutoff2h = new Date(Date.now() - 2 * 3600_000).toISOString();
    const afterCheckins = await sbFetch<any[]>(
      cfg.supabase,
      `flowb_checkins?crew_id=in.(${crewIds.join(",")})&created_at=gte.${cutoff2h}&user_id=neq.${user.user_id}&select=venue_name&order=created_at.desc&limit=20`,
    );

    if (!afterCheckins?.length) continue;

    // Group by venue
    const venueCount = new Map<string, number>();
    for (const c of afterCheckins) {
      if (!c.venue_name) continue;
      venueCount.set(c.venue_name, (venueCount.get(c.venue_name) || 0) + 1);
    }

    if (!venueCount.size) continue;

    // Top 3 venues
    const topVenues = [...venueCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([venue, count]) => `${venue} (${count})`)
      .join(", ");

    const message = `How was <b>${event.title}</b>? Your crew is heading to: ${topVenues}`;

    const didSend = await sendToUser(cfg, user.user_id, message);
    if (didSend) {
      await recordSent(cfg.supabase, user.user_id, "post_event", refId);
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Trigger 5: "Morning briefing" (~9am local time)
// Daily digest: friends in city + events on schedule
// ---------------------------------------------------------------------------

async function checkMorningBriefing(cfg: CtxNotifyConfig, user: ActiveUser): Promise<boolean> {
  if (!user.notify_daily_digest) return false;

  const tz = user.timezone || "America/Denver";
  const localHour = getLocalHour(tz);

  // Only send between 8am and 10am local time
  if (localHour < 8 || localHour >= 10) return false;

  const dateKey = new Date().toISOString().slice(0, 10);
  const refId = `briefing:${dateKey}`;
  if (await wasRecentlySent(cfg.supabase, user.user_id, "morning_briefing", refId)) return false;

  // Count friends in same city
  let friendsInCity = 0;
  if (user.current_city) {
    const connections = await sbFetch<any[]>(
      cfg.supabase,
      `flowb_connections?user_id=eq.${user.user_id}&status=eq.active&select=friend_id`,
    );
    const friendIds = (connections || []).map((c: any) => c.friend_id);

    if (friendIds.length) {
      const inClause = friendIds.map((id: string) => `"${id}"`).join(",");
      const nearbyFriends = await sbFetch<any[]>(
        cfg.supabase,
        `flowb_sessions?user_id=in.(${inClause})&current_city=eq.${encodeURIComponent(user.current_city)}&location_visibility=neq.hidden&select=user_id`,
      );
      friendsInCity = nearbyFriends?.length || 0;
    }
  }

  // Count user's events today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);

  const myAttendance = await sbFetch<any[]>(
    cfg.supabase,
    `flowb_event_attendance?user_id=eq.${user.user_id}&status=in.(going,maybe)&select=event_id`,
  );
  let eventsToday = 0;
  if (myAttendance?.length) {
    const eventIds = myAttendance.map((a: any) => a.event_id);
    const eventIdClause = eventIds.map((id: string) => `"${id}"`).join(",");
    const todayEvents = await sbFetch<any[]>(
      cfg.supabase,
      `flowb_events?id=in.(${eventIdClause})&starts_at=gte.${todayStart.toISOString()}&starts_at=lte.${todayEnd.toISOString()}&select=id`,
    );
    eventsToday = todayEvents?.length || 0;
  }

  // Only send if there's something worth mentioning
  if (friendsInCity === 0 && eventsToday === 0) return false;

  const parts: string[] = [];
  if (friendsInCity > 0 && user.current_city) {
    parts.push(`${friendsInCity} friend${friendsInCity === 1 ? "" : "s"} in ${user.current_city} today`);
  }
  if (eventsToday > 0) {
    parts.push(`${eventsToday} event${eventsToday === 1 ? "" : "s"} on your schedule`);
  }

  const message = `Good morning! ${parts.join(", ")}`;

  const didSend = await sendToUser(cfg, user.user_id, message);
  if (didSend) {
    await recordSent(cfg.supabase, user.user_id, "morning_briefing", refId);
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Delivery: send via Telegram DM (primary) or Farcaster (fallback)
// ---------------------------------------------------------------------------

async function sendToUser(cfg: CtxNotifyConfig, userId: string, message: string): Promise<boolean> {
  // Telegram users
  if (userId.startsWith("telegram_")) {
    const chatId = parseInt(userId.replace("telegram_", ""), 10);
    if (isNaN(chatId)) return false;

    const botToken = cfg.botToken || process.env.FLOWB_TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      log.warn("[ctx-notify]", "No bot token available for Telegram send");
      return false;
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        log.warn("[ctx-notify]", `TG send failed for ${userId}: ${res.status}`, { error: errText });
        return false;
      }

      return true;
    } catch (err) {
      log.error("[ctx-notify]", `TG send error for ${userId}`, {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  // Farcaster users
  if (userId.startsWith("farcaster_")) {
    const fid = parseInt(userId.replace("farcaster_", ""), 10);
    if (isNaN(fid)) return false;

    // Strip HTML tags for Farcaster (plain text only)
    const plainMessage = message.replace(/<[^>]*>/g, "");
    const appUrl = process.env.FLOWB_FC_APP_URL || "https://farcaster.xyz/miniapps/oCHuaUqL5dRT/flowb";

    return sendFarcasterNotification(cfg.supabase, fid, "FlowB", plainMessage, appUrl);
  }

  return false;
}

// ---------------------------------------------------------------------------
// Dedup: check if we already sent this notification recently
// ---------------------------------------------------------------------------

async function wasRecentlySent(
  cfg: SbConfig,
  userId: string,
  notificationType: string,
  referenceId: string,
): Promise<boolean> {
  const cooldownHours = COOLDOWN_HOURS[notificationType] || 12;
  const cutoff = new Date(Date.now() - cooldownHours * 3600_000).toISOString();

  const rows = await sbQuery<any[]>(cfg, "flowb_notifications_sent", {
    select: "id",
    user_id: `eq.${userId}`,
    notification_type: `eq.${notificationType}`,
    reference_id: `eq.${referenceId}`,
    sent_at: `gte.${cutoff}`,
    limit: "1",
  });

  return !!rows?.length;
}

async function recordSent(
  cfg: SbConfig,
  userId: string,
  notificationType: string,
  referenceId: string,
): Promise<void> {
  try {
    await fetch(
      `${cfg.supabaseUrl}/rest/v1/flowb_notifications_sent?on_conflict=user_id,notification_type,reference_id`,
      {
        method: "POST",
        headers: {
          apikey: cfg.supabaseKey,
          Authorization: `Bearer ${cfg.supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal,resolution=merge-duplicates",
        },
        body: JSON.stringify({
          user_id: userId,
          notification_type: notificationType,
          reference_id: referenceId,
          sent_at: new Date().toISOString(),
        }),
      },
    );
  } catch (err) {
    log.error("[ctx-notify]", "recordSent failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if we've exceeded the user's daily notification limit (includes both reactive + contextual) */
async function hasReachedDailyLimit(cfg: SbConfig, userId: string, limit: number): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Count from both notification tables
  const [reactiveRows, contextRows] = await Promise.all([
    sbQuery<any[]>(cfg, "flowb_notification_log", {
      select: "id",
      recipient_id: `eq.${userId}`,
      sent_at: `gte.${todayStart.toISOString()}`,
    }),
    sbQuery<any[]>(cfg, "flowb_notifications_sent", {
      select: "id",
      user_id: `eq.${userId}`,
      sent_at: `gte.${todayStart.toISOString()}`,
    }),
  ]);

  const totalSent = (reactiveRows?.length || 0) + (contextRows?.length || 0);
  return totalSent >= limit;
}

/** Check if it's currently quiet hours for this user */
function isQuietHours(user: ActiveUser): boolean {
  if (!user.quiet_hours_enabled) return false;

  const tz = user.timezone || "America/Denver";
  const hour = getLocalHour(tz);
  const start = user.quiet_hours_start ?? 22;
  const end = user.quiet_hours_end ?? 8;

  if (start > end) {
    return hour >= start || hour < end;
  }
  return hour >= start && hour < end;
}

/** Get the current hour in a given timezone */
function getLocalHour(tz: string): number {
  try {
    const nowStr = new Date().toLocaleString("en-US", { timeZone: tz, hour12: false });
    const parts = nowStr.split(",")[1]?.trim().split(":");
    return parseInt(parts?.[0] || "0", 10);
  } catch {
    // Fallback to MST (UTC-7)
    const now = new Date();
    return (now.getUTCHours() - 7 + 24) % 24;
  }
}

/** Safe runner: catches errors and returns result with ok flag */
async function safeRun(fn: () => Promise<boolean>): Promise<{ ok: boolean; sent: boolean }> {
  try {
    const sent = await fn();
    return { ok: true, sent };
  } catch (err) {
    log.error("[ctx-notify]", "Trigger error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, sent: false };
  }
}
