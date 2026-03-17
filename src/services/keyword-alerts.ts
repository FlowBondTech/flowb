/**
 * Keyword Alert Service
 *
 * When the event scanner discovers new events, this service matches them
 * against user-defined keyword alerts and dispatches notifications.
 *
 * - Personal alerts: delivered via sendToUser (TG DM, FC push, etc.)
 * - Crew alerts: posted as a message in flowb_crew_messages
 */

import { sbFetch, sbInsert, type SbConfig } from "../utils/supabase.js";
import { log } from "../utils/logger.js";
import {
  sendToUser,
  isAlreadyNotified,
  logNotification,
  hasReachedDailyLimit,
  isUserQuietHours,
  getUserNotifyPrefs,
  type NotifyContext,
} from "./notifications.js";

interface KeywordAlert {
  id: string;
  user_id: string;
  keyword: string;
  category_slug: string | null;
  crew_id: string | null;
  city: string | null;
}

interface EventData {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  city: string | null;
  starts_at: string | null;
  url: string | null;
  category_slugs: string[];
}

/** Max crew chat messages per crew per scan cycle to prevent spam */
const MAX_CREW_MESSAGES_PER_SCAN = 5;

/**
 * Process keyword alerts for newly discovered events.
 * Returns the number of notifications sent.
 */
export async function processKeywordAlerts(
  ctx: NotifyContext,
  newEventIds: string[],
): Promise<number> {
  if (!newEventIds.length) return 0;

  const cfg = ctx.supabase;

  // 1. Fetch all enabled alerts
  const alerts = await sbFetch<KeywordAlert[]>(
    cfg,
    `flowb_keyword_alerts?enabled=eq.true&select=id,user_id,keyword,category_slug,crew_id,city`,
  );

  if (!alerts?.length) return 0;

  // 2. Fetch event data for each new event (batch in chunks of 20)
  const events: EventData[] = [];
  const BATCH = 20;
  for (let i = 0; i < newEventIds.length; i += BATCH) {
    const batch = newEventIds.slice(i, i + BATCH);
    const idFilter = batch.map(id => `"${id}"`).join(",");

    const [rows, catMaps] = await Promise.all([
      sbFetch<any[]>(
        cfg,
        `flowb_events?id=in.(${idFilter})&select=id,title,description,tags,city,starts_at,url`,
      ),
      sbFetch<any[]>(
        cfg,
        `flowb_event_category_map?event_id=in.(${idFilter})&select=event_id,flowb_event_categories(slug)`,
      ),
    ]);

    // Build category slug lookup by event_id
    const catByEvent = new Map<string, string[]>();
    for (const cm of catMaps || []) {
      const slug = cm.flowb_event_categories?.slug;
      if (!slug) continue;
      const list = catByEvent.get(cm.event_id) || [];
      list.push(slug);
      catByEvent.set(cm.event_id, list);
    }

    for (const row of rows || []) {
      events.push({
        id: row.id,
        title: row.title || "",
        description: row.description || null,
        tags: row.tags || [],
        city: row.city || null,
        starts_at: row.starts_at || null,
        url: row.url || null,
        category_slugs: catByEvent.get(row.id) || [],
      });
    }
  }

  if (!events.length) return 0;

  // 3. Match alerts against events
  let sent = 0;
  const crewMessageCounts = new Map<string, number>(); // crew_id -> count

  for (const event of events) {
    const searchText = [
      event.title,
      event.description || "",
      ...event.tags,
    ].join(" ").toLowerCase();

    for (const alert of alerts) {
      // Keyword match
      if (!searchText.includes(alert.keyword)) continue;

      // Category filter
      if (alert.category_slug && !event.category_slugs.includes(alert.category_slug)) continue;

      // City filter
      if (alert.city && event.city?.toLowerCase() !== alert.city.toLowerCase()) continue;

      // Determine target (crew or personal)
      const targetId = alert.crew_id || alert.user_id;

      // Dedup check
      const alreadySent = await isAlreadyNotified(
        cfg,
        targetId,
        "keyword_alert",
        event.id,
        alert.id,
      );
      if (alreadySent) continue;

      // Format date
      const dateStr = event.starts_at
        ? new Date(event.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "";
      const datePart = dateStr ? ` (${dateStr})` : "";
      const message = `New event matching "${alert.keyword}": ${event.title}${datePart}${event.url ? `\n${event.url}` : ""}`;

      if (alert.crew_id) {
        // Crew alert: post to crew chat
        const crewCount = crewMessageCounts.get(alert.crew_id) || 0;
        if (crewCount >= MAX_CREW_MESSAGES_PER_SCAN) continue;

        try {
          await sbInsert(cfg, "flowb_crew_messages", {
            group_id: alert.crew_id,
            user_id: alert.user_id,
            display_name: "FlowB Alerts",
            message,
            message_type: "keyword_alert",
          });
          crewMessageCounts.set(alert.crew_id, crewCount + 1);
          await logNotification(cfg, targetId, "keyword_alert", event.id, alert.id);
          sent++;
        } catch (err) {
          log.warn("[keyword-alerts]", "Failed to post crew alert", {
            crewId: alert.crew_id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      } else {
        // Personal alert: check user prefs, limits, quiet hours
        const prefs = await getUserNotifyPrefs(cfg, alert.user_id);
        if (!prefs.notify_keyword_alerts) continue;
        if (await hasReachedDailyLimit(cfg, alert.user_id)) continue;
        if (await isUserQuietHours(cfg, alert.user_id)) continue;

        const didSend = await sendToUser(ctx, alert.user_id, message);
        if (didSend) {
          await logNotification(cfg, targetId, "keyword_alert", event.id, alert.id);
          sent++;
        }
      }
    }
  }

  if (sent > 0) {
    log.info("[keyword-alerts]", `Sent ${sent} keyword alert notifications`, {
      events: events.length,
      alerts: alerts.length,
    });
  }

  return sent;
}
