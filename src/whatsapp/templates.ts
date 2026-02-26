/**
 * WhatsApp Template Message Builders
 *
 * Maps notification types to approved Meta template names.
 * Templates must be created and approved in Meta Business Manager
 * before they can be used for proactive messages (outside 24h window).
 *
 * Within the 24h conversation window, free-form messages are used instead.
 */

import type { TemplateComponent } from "./types.js";
import * as wa from "./api.js";
import { log } from "../utils/logger.js";

// Template name -> approved template mapping
const TEMPLATE_MAP: Record<string, string> = {
  crew_checkin: "crew_checkin",
  friend_rsvp: "friend_rsvp",
  event_reminder: "event_reminder",
  crew_join: "crew_join",
  morning_briefing: "morning_briefing",
  crew_active: "crew_active",
  welcome: "welcome",
};

/**
 * Check if a phone number has an active conversation window (last msg < 24h).
 */
async function isInConversationWindow(phone: string): Promise<boolean> {
  const sbUrl = process.env.DANZ_SUPABASE_URL;
  const sbKey = process.env.DANZ_SUPABASE_KEY;
  if (!sbUrl || !sbKey) return false;

  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const res = await fetch(
      `${sbUrl}/rest/v1/flowb_wa_conversations?phone=eq.${encodeURIComponent(phone)}&last_message_at=gte.${cutoff}&select=phone&limit=1`,
      {
        headers: {
          apikey: sbKey,
          Authorization: `Bearer ${sbKey}`,
        },
      },
    );
    if (!res.ok) return false;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Send a WhatsApp notification - uses free-form if within 24h window,
 * falls back to template message for proactive notifications.
 */
export async function sendWhatsAppNotification(
  phone: string,
  message: string,
  notificationType?: string,
): Promise<boolean> {
  try {
    // Check if within conversation window for free-form messaging
    const inWindow = await isInConversationWindow(phone);

    if (inWindow) {
      // Within 24h window - send free-form text
      const result = await wa.sendText(phone, message);
      return result !== null;
    }

    // Outside 24h window - need template message
    const templateName = notificationType ? TEMPLATE_MAP[notificationType] : undefined;
    if (!templateName) {
      log.debug("[wa-notify]", `No template for type '${notificationType}', cannot send proactive message to ${phone}`);
      return false;
    }

    // Extract template parameters from message
    const params = extractTemplateParams(message, notificationType);
    const result = await wa.sendTemplate(phone, templateName, "en", params);

    if (result) {
      // Log the template send
      logTemplateSend(phone, templateName);
    }

    return result !== null;
  } catch (err: any) {
    log.error("[wa-notify]", `Failed to notify ${phone}: ${err.message}`);
    return false;
  }
}

/**
 * Extract template parameters from a notification message.
 * Maps known notification formats to template parameter arrays.
 */
function extractTemplateParams(
  message: string,
  notificationType?: string,
): TemplateComponent[] | undefined {
  // For now, pass the full message as a single body parameter
  // This works for templates that use {{1}} as the main content
  return [
    {
      type: "body",
      parameters: [{ type: "text", text: message }],
    },
  ];
}

function logTemplateSend(phone: string, templateName: string): void {
  const sbUrl = process.env.DANZ_SUPABASE_URL;
  const sbKey = process.env.DANZ_SUPABASE_KEY;
  if (!sbUrl || !sbKey) return;

  fetch(`${sbUrl}/rest/v1/flowb_wa_template_log`, {
    method: "POST",
    headers: {
      apikey: sbKey,
      Authorization: `Bearer ${sbKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      phone,
      template_name: templateName,
      status: "sent",
    }),
  }).catch(() => {});
}
