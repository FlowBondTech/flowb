/**
 * FlowB Email Notification Service
 *
 * Sends transactional emails via Resend API.
 * Used for: onboarding, event reminders, daily digest, crew updates.
 *
 * Env: RESEND_API_KEY, RESEND_FROM (default: FlowB <noreply@flowb.me>)
 */

import { sbQuery, type SbConfig } from "../utils/supabase.js";
import { log } from "../utils/logger.js";

const RESEND_API = "https://api.resend.com/emails";

interface SendEmailOpts {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

/**
 * Send a single email via Resend.
 * Returns true on success, false on failure.
 */
export async function sendEmail(opts: SendEmailOpts): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    log.warn("[email]", "RESEND_API_KEY not set, skipping email send");
    return false;
  }

  const from = process.env.RESEND_FROM || "FlowB <noreply@flowb.me>";

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        reply_to: opts.replyTo || "support@flowb.me",
        tags: opts.tags,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      log.error("[email]", `Send failed: ${res.status}`, { body, to: opts.to });
      return false;
    }

    const data = (await res.json()) as { id: string };
    log.info("[email]", `Sent ${data.id} to ${opts.to}: ${opts.subject}`);
    return true;
  } catch (err) {
    log.error("[email]", "Send error", { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

/**
 * Send notification email to a FlowB user.
 * Looks up the user's email from flowb_sessions or linked accounts.
 * Returns true if email was found and sent.
 */
export async function sendEmailNotification(
  cfg: SbConfig,
  userId: string,
  subject: string,
  message: string,
): Promise<boolean> {
  const email = await resolveUserEmail(cfg, userId);
  if (!email) return false;

  // Check if user has email notifications enabled
  const prefs = await getUserEmailPrefs(cfg, userId);
  if (!prefs.notify_email) return false;

  return sendEmail({
    to: email,
    subject,
    html: wrapInTemplate(subject, message),
    tags: [
      { name: "user_id", value: userId },
      { name: "type", value: "notification" },
    ],
  });
}

// ============================================================================
// Email Templates
// ============================================================================

/**
 * Welcome email sent when user first links their email.
 */
export async function sendWelcomeEmail(email: string, displayName: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: "Welcome to FlowB - you're in the flow!",
    html: wrapInTemplate(
      "Welcome to FlowB!",
      `
      <p>Hey ${escHtml(displayName)},</p>
      <p>You're now connected to FlowB. Here's what you can do:</p>
      <ul style="padding-left:20px;">
        <li>Discover events and RSVP with your crew</li>
        <li>Check in at venues and earn points</li>
        <li>Coordinate with friends across Telegram, Farcaster, WhatsApp, and more</li>
      </ul>
      <p>Your points, crews, and schedule sync everywhere.</p>
      <div style="margin:24px 0;">
        <a href="https://flowb.me" style="display:inline-block;padding:12px 28px;background:#6366f1;color:#fff;border-radius:24px;text-decoration:none;font-weight:600;">Explore FlowB</a>
      </div>
      <p style="color:#888;font-size:13px;">
        You can also use FlowB on
        <a href="https://t.me/Flow_b_bot" style="color:#6366f1;">Telegram</a>,
        <a href="https://farcaster.xyz/miniapps/oCHuaUqL5dRT/flowb" style="color:#6366f1;">Farcaster</a>, or
        <a href="https://wa.flowb.me" style="color:#6366f1;">WhatsApp</a>.
      </p>
    `,
    ),
    tags: [{ name: "type", value: "welcome" }],
  });
}

/**
 * Email verification code.
 */
export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `FlowB verification: ${code}`,
    html: wrapInTemplate(
      "Verify your email",
      `
      <p>Your FlowB verification code is:</p>
      <div style="margin:20px 0;padding:16px 24px;background:#1a1a2e;border-radius:12px;text-align:center;">
        <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#6366f1;">${escHtml(code)}</span>
      </div>
      <p style="color:#888;font-size:13px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    `,
    ),
    tags: [{ name: "type", value: "verification" }],
  });
}

/**
 * Daily digest email.
 */
export async function sendDigestEmail(
  email: string,
  displayName: string,
  todayEvents: Array<{ title: string; time: string; venue?: string }>,
  crewActivity: string[],
  pointsTotal: number,
): Promise<boolean> {
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const eventsHtml = todayEvents.length
    ? todayEvents
        .map(
          (e) =>
            `<tr><td style="padding:8px 0;border-bottom:1px solid #222;">${escHtml(e.title)}</td><td style="padding:8px 0;border-bottom:1px solid #222;color:#888;">${escHtml(e.time)}${e.venue ? ` at ${escHtml(e.venue)}` : ""}</td></tr>`,
        )
        .join("")
    : '<tr><td style="padding:8px 0;color:#666;">No events on your schedule today</td></tr>';

  const activityHtml = crewActivity.length
    ? crewActivity.map((a) => `<li style="padding:4px 0;">${escHtml(a)}</li>`).join("")
    : '<li style="color:#666;">No crew activity yet today</li>';

  return sendEmail({
    to: email,
    subject: `Your FlowB digest for ${dateStr}`,
    html: wrapInTemplate(
      `Good morning, ${escHtml(displayName)}!`,
      `
      <p style="color:#888;">Here's your FlowB update for ${dateStr}.</p>

      <h3 style="font-size:15px;margin:20px 0 8px;color:#a78bfa;">Today's Events</h3>
      <table style="width:100%;border-collapse:collapse;">${eventsHtml}</table>

      <h3 style="font-size:15px;margin:20px 0 8px;color:#a78bfa;">Crew Activity</h3>
      <ul style="padding-left:20px;margin:0;">${activityHtml}</ul>

      <div style="margin:20px 0;padding:12px;background:#1a1a2e;border-radius:8px;text-align:center;">
        <span style="color:#888;">Your points:</span>
        <span style="font-size:20px;font-weight:700;color:#f59e0b;margin-left:8px;">${pointsTotal}</span>
      </div>

      <div style="text-align:center;margin-top:24px;">
        <a href="https://flowb.me" style="display:inline-block;padding:10px 24px;background:#6366f1;color:#fff;border-radius:24px;text-decoration:none;font-weight:600;">View Full Schedule</a>
      </div>
    `,
    ),
    tags: [{ name: "type", value: "digest" }],
  });
}

// ============================================================================
// Helpers
// ============================================================================

/** Resolve a user's email address from their session or linked Privy accounts */
async function resolveUserEmail(cfg: SbConfig, userId: string): Promise<string | null> {
  // If it's an email-based user ID, extract it
  if (userId.startsWith("email_")) {
    return userId.replace("email_", "");
  }

  // Check flowb_sessions for stored email
  const rows = await sbQuery<any[]>(cfg, "flowb_sessions", {
    select: "email",
    user_id: `eq.${userId}`,
    limit: "1",
  });
  if (rows?.[0]?.email) return rows[0].email;

  // Check linked accounts table for email platform
  const linked = await sbQuery<any[]>(cfg, "flowb_linked_accounts", {
    select: "platform_user_id",
    user_id: `eq.${userId}`,
    platform: "eq.email",
    limit: "1",
  });
  if (linked?.[0]?.platform_user_id) {
    return linked[0].platform_user_id.replace("email_", "");
  }

  return null;
}

/** Get user's email notification preferences */
async function getUserEmailPrefs(cfg: SbConfig, userId: string): Promise<{
  notify_email: boolean;
  notify_email_digest: boolean;
  notify_email_events: boolean;
  notify_email_crew: boolean;
}> {
  const rows = await sbQuery<any[]>(cfg, "flowb_sessions", {
    select: "notify_email,notify_email_digest,notify_email_events,notify_email_crew",
    user_id: `eq.${userId}`,
    limit: "1",
  });
  const p = rows?.[0];
  return {
    notify_email: p?.notify_email ?? true,
    notify_email_digest: p?.notify_email_digest ?? true,
    notify_email_events: p?.notify_email_events ?? true,
    notify_email_crew: p?.notify_email_crew ?? true,
  };
}

/** Wrap content in the FlowB email template */
function wrapInTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;color:#e0e0e0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:20px;font-weight:800;color:#fff;">Flow<span style="color:#6366f1;">B</span></span>
    </div>
    <div style="background:#111;border:1px solid #222;border-radius:12px;padding:28px;">
      <h2 style="margin:0 0 16px;font-size:18px;color:#fff;">${title}</h2>
      ${body}
    </div>
    <div style="text-align:center;margin-top:24px;padding:16px 0;border-top:1px solid #222;">
      <p style="color:#555;font-size:12px;margin:0 0 8px;">
        <a href="https://flowb.me/settings?tab=notifications" style="color:#6366f1;text-decoration:none;">Manage email preferences</a>
      </p>
      <p style="color:#444;font-size:11px;margin:0;">FlowB - Get in the flow</p>
    </div>
  </div>
</body>
</html>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
