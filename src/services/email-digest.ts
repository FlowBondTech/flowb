/**
 * FlowB Email Digest Service
 *
 * Runs daily to send digest emails to users who have:
 * - An email address stored in their session
 * - notify_email_digest = true
 *
 * Gathers today's events, crew activity, and points for each user.
 */

import { sbQuery, type SbConfig } from "../utils/supabase.js";
import { sendDigestEmail } from "./email.js";
import { log } from "../utils/logger.js";

interface DigestUser {
  user_id: string;
  email: string;
  display_name: string | null;
}

/**
 * Run the daily email digest for all opted-in users.
 * Call this once per day (e.g. 8am MST).
 */
export async function runEmailDigest(cfg: SbConfig): Promise<{ sent: number; errors: number }> {
  let sent = 0;
  let errors = 0;

  // Find users who want digest emails
  const users = await sbQuery<DigestUser[]>(cfg, "flowb_sessions", {
    select: "user_id,email,display_name",
    notify_email_digest: "eq.true",
    email: "not.is.null",
    limit: "500",
  });

  if (!users?.length) {
    log.info("[email-digest]", "No users opted in for digest");
    return { sent: 0, errors: 0 };
  }

  log.info("[email-digest]", `Sending digest to ${users.length} users`);

  for (const user of users) {
    try {
      // Get today's events for this user (RSVPs)
      const today = new Date().toISOString().slice(0, 10);
      const rsvps = await sbQuery<any[]>(cfg, "flowb_rsvps", {
        select: "event_id",
        user_id: `eq.${user.user_id}`,
        limit: "20",
      });

      const todayEvents: Array<{ title: string; time: string; venue?: string }> = [];

      if (rsvps?.length) {
        const eventIds = rsvps.map((r) => r.event_id);
        const events = await sbQuery<any[]>(cfg, "flowb_events", {
          select: "title,start_time,venue_name",
          id: `in.(${eventIds.join(",")})`,
          "start_time": `gte.${today}T00:00:00`,
          "start_time@2": `lt.${today}T23:59:59`,
          limit: "10",
        });

        for (const ev of events || []) {
          todayEvents.push({
            title: ev.title || "Untitled Event",
            time: ev.start_time
              ? new Date(ev.start_time).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: "America/Denver",
                })
              : "TBD",
            venue: ev.venue_name || undefined,
          });
        }
      }

      // Get crew activity (recent crew messages/joins)
      const crewActivity: string[] = [];
      const crewMembers = await sbQuery<any[]>(cfg, "flowb_group_members", {
        select: "group_id",
        user_id: `eq.${user.user_id}`,
        limit: "10",
      });

      if (crewMembers?.length) {
        const groupIds = crewMembers.map((m) => m.group_id);
        const recentActivity = await sbQuery<any[]>(cfg, "flowb_group_messages", {
          select: "content,sender_name,created_at",
          group_id: `in.(${groupIds.join(",")})`,
          order: "created_at.desc",
          limit: "5",
        });

        for (const msg of recentActivity || []) {
          const name = msg.sender_name || "Someone";
          const preview = (msg.content || "").slice(0, 50);
          crewActivity.push(`${name}: ${preview}`);
        }
      }

      // Get total points
      const pointRows = await sbQuery<any[]>(cfg, "flowb_user_points", {
        select: "total_points",
        user_id: `eq.${user.user_id}`,
        limit: "1",
      });
      const pointsTotal = pointRows?.[0]?.total_points || 0;

      const displayName = user.display_name || user.email.split("@")[0];

      const ok = await sendDigestEmail(user.email, displayName, todayEvents, crewActivity, pointsTotal);
      if (ok) {
        sent++;
      } else {
        errors++;
      }
    } catch (err) {
      errors++;
      log.error("[email-digest]", `Error for ${user.user_id}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("[email-digest]", `Digest complete: ${sent} sent, ${errors} errors`);
  return { sent, errors };
}
