/**
 * FlowB Support Service
 *
 * Handles inbound support emails: stores in Supabase, generates AI draft
 * replies via Claude, sends TG notifications with inline keyboards, and
 * dispatches outbound replies via Resend.
 */

import { log } from "../utils/logger.js";
import { sbInsert, sbFetch, sbPatchRaw, sbPost, type SbConfig } from "../utils/supabase.js";
import { sendEmail, wrapInTemplate, escHtml } from "./email.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SupportTicket {
  id: string;
  email_id: string;
  from_address: string;
  from_name: string | null;
  to_address: string;
  subject: string | null;
  text_body: string | null;
  html_body: string | null;
  status: string;
  assigned_to: string | null;
  priority: string;
  tags: string[] | null;
  tg_message_id: number | null;
  tg_chat_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface SupportReply {
  id: string;
  ticket_id: string;
  replied_by: string;
  reply_text: string;
  reply_html: string | null;
  ai_generated: boolean;
  ai_edited: boolean;
  sent_at: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function getCfg(): SbConfig {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase not configured");
  return { supabaseUrl, supabaseKey };
}

const SUPPORT_CHANNEL_ID = () => process.env.FLOWB_SUPPORT_CHANNEL_ID || "-1003767473725";
const SUPPORT_TOPIC_ID = () => process.env.FLOWB_SUPPORT_TOPIC_ID || "122";

function getBotToken(): string | undefined {
  return process.env.FLOWB_TELEGRAM_BOT_TOKEN;
}

// ---------------------------------------------------------------------------
// Handle Inbound Email
// ---------------------------------------------------------------------------

export async function handleInboundEmail(payload: {
  emailId: string;
  from: string;
  fromName?: string;
  to: string;
  subject?: string;
  textBody?: string;
  htmlBody?: string;
}): Promise<SupportTicket | null> {
  const cfg = getCfg();

  // 1. Insert into DB
  const ticket = await sbInsert<SupportTicket>(cfg, "flowb_support_emails", {
    email_id: payload.emailId,
    from_address: payload.from,
    from_name: payload.fromName || null,
    to_address: payload.to,
    subject: payload.subject || "(no subject)",
    text_body: payload.textBody || null,
    html_body: payload.htmlBody || null,
    status: "new",
    priority: detectPriority(payload.subject, payload.textBody),
  });

  if (!ticket) {
    log.error("[support]", "Failed to insert support email", { emailId: payload.emailId });
    return null;
  }

  log.info("[support]", `New ticket ${ticket.id} from ${payload.from}: ${payload.subject}`);

  // 2. Send TG notification with inline keyboard (fire-and-forget)
  sendSupportNotification(ticket).catch((err) =>
    log.warn("[support]", "TG notification failed", { error: err instanceof Error ? err.message : String(err) }),
  );

  return ticket;
}

// ---------------------------------------------------------------------------
// AI Draft Generation (Claude Sonnet 4.5)
// ---------------------------------------------------------------------------

export async function generateDraftReply(ticket: SupportTicket): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return "AI drafting is not configured. Please set ANTHROPIC_API_KEY.";
  }

  const systemPrompt = `You are FlowB support staff. FlowB is a social coordination platform that helps people discover events, form crews, and earn points across Telegram, Farcaster, WhatsApp, and web.

Be helpful, concise, and friendly. Keep replies under 200 words. If you don't know the specific answer, acknowledge the issue and let them know the team will look into it.

Sign off as "FlowB Support".`;

  const emailContext = [
    ticket.subject ? `Subject: ${ticket.subject}` : "",
    `From: ${ticket.from_name || ticket.from_address}`,
    "",
    ticket.text_body || "(no body)",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 512,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Draft a reply to this support email:\n\n${emailContext}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      log.error("[support]", `Claude API error: ${response.status}`, { body: errText.slice(0, 200) });
      return "Failed to generate AI draft. Try again or write a manual reply.";
    }

    const data = await response.json();
    const content = data.content || [];
    const textBlock = content.find((b: any) => b.type === "text");
    return textBlock?.text || "Failed to generate draft.";
  } catch (err) {
    log.error("[support]", "AI draft error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return "AI service unavailable. Please write a manual reply.";
  }
}

// ---------------------------------------------------------------------------
// Send Reply via Email
// ---------------------------------------------------------------------------

export async function sendReply(
  ticketId: string,
  adminUserId: string,
  replyText: string,
  opts?: { aiGenerated?: boolean; aiEdited?: boolean },
): Promise<boolean> {
  const cfg = getCfg();

  // Fetch ticket
  const rows = await sbFetch<SupportTicket[]>(
    cfg,
    `flowb_support_emails?id=eq.${ticketId}&select=*&limit=1`,
  );
  const ticket = rows?.[0];
  if (!ticket) {
    log.error("[support]", `Ticket ${ticketId} not found for reply`);
    return false;
  }

  // Send email
  const subject = ticket.subject?.startsWith("Re:") ? ticket.subject : `Re: ${ticket.subject || "Your FlowB support request"}`;
  const sent = await sendEmail({
    to: ticket.from_address,
    subject,
    html: wrapInTemplate("FlowB Support", `<p>${escHtml(replyText).replace(/\n/g, "<br>")}</p>`),
    text: replyText,
    replyTo: "support@flowb.me",
    tags: [
      { name: "type", value: "support_reply" },
      { name: "ticket_id", value: ticketId },
    ],
  });

  if (!sent) {
    log.error("[support]", `Failed to send reply for ticket ${ticketId}`);
    return false;
  }

  // Record reply in DB
  await sbInsert(cfg, "flowb_support_replies", {
    ticket_id: ticketId,
    replied_by: adminUserId,
    reply_text: replyText,
    reply_html: null,
    ai_generated: opts?.aiGenerated ?? false,
    ai_edited: opts?.aiEdited ?? false,
  });

  // Update ticket status
  await sbPatchRaw(cfg, `flowb_support_emails?id=eq.${ticketId}`, {
    status: "replied",
    updated_at: new Date().toISOString(),
  });

  log.info("[support]", `Reply sent for ticket ${ticketId} by ${adminUserId}`);
  return true;
}

// ---------------------------------------------------------------------------
// Ticket Management
// ---------------------------------------------------------------------------

export async function updateTicketStatus(
  ticketId: string,
  status: string,
  assignedTo?: string,
): Promise<boolean> {
  const cfg = getCfg();
  const patch: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (assignedTo !== undefined) patch.assigned_to = assignedTo;

  return sbPatchRaw(cfg, `flowb_support_emails?id=eq.${ticketId}`, patch);
}

export async function getTicket(ticketId: string): Promise<SupportTicket | null> {
  const cfg = getCfg();
  const rows = await sbFetch<SupportTicket[]>(
    cfg,
    `flowb_support_emails?id=eq.${ticketId}&select=*&limit=1`,
  );
  return rows?.[0] ?? null;
}

export async function listTickets(status?: string, limit = 20): Promise<SupportTicket[]> {
  const cfg = getCfg();
  let path = `flowb_support_emails?select=*&order=created_at.desc&limit=${limit}`;
  if (status) path += `&status=eq.${status}`;
  return (await sbFetch<SupportTicket[]>(cfg, path)) ?? [];
}

// ---------------------------------------------------------------------------
// TG Notification (to support channel/topic)
// ---------------------------------------------------------------------------

async function sendSupportNotification(ticket: SupportTicket): Promise<void> {
  const botToken = getBotToken();
  if (!botToken) return;

  const chatId = SUPPORT_CHANNEL_ID();
  const topicId = SUPPORT_TOPIC_ID();

  const preview = (ticket.text_body || "").slice(0, 200).replace(/\n/g, " ");
  const priorityIcon = ticket.priority === "urgent" ? "🔴" : ticket.priority === "high" ? "🟠" : "";

  const text = [
    `📩 <b>New Support Email</b>${priorityIcon ? " " + priorityIcon : ""}`,
    `<b>From:</b> ${escapeHtml(ticket.from_name || ticket.from_address)}`,
    ticket.from_name ? `<b>Email:</b> ${escapeHtml(ticket.from_address)}` : "",
    `<b>Subject:</b> ${escapeHtml(ticket.subject || "(no subject)")}`,
    "",
    preview ? `<i>"${escapeHtml(preview)}${(ticket.text_body || "").length > 200 ? "..." : ""}"</i>` : "<i>(no body)</i>",
  ]
    .filter((l) => l !== "")
    .join("\n");

  const keyboard = {
    inline_keyboard: [
      [
        { text: "🤖 AI Draft", callback_data: `sup:ai:${ticket.id}` },
        { text: "✍️ Reply", callback_data: `sup:reply:${ticket.id}` },
      ],
      [
        { text: "👤 Assign Me", callback_data: `sup:assign:${ticket.id}` },
        { text: "✅ Close", callback_data: `sup:close:${ticket.id}` },
      ],
    ],
  };

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_thread_id: parseInt(topicId, 10),
        text,
        parse_mode: "HTML",
        reply_markup: keyboard,
        link_preview_options: { is_disabled: true },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const messageId = data.result?.message_id;
      if (messageId) {
        // Store TG message ID for later edits
        const cfg = getCfg();
        await sbPatchRaw(cfg, `flowb_support_emails?id=eq.${ticket.id}`, {
          tg_message_id: messageId,
          tg_chat_id: parseInt(chatId, 10),
        });
      }
    } else {
      const errBody = await res.text();
      log.warn("[support]", `TG notification send failed: ${res.status}`, { body: errBody.slice(0, 200) });
    }
  } catch (err) {
    log.warn("[support]", "TG notification error", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectPriority(subject?: string, body?: string): string {
  const text = `${subject || ""} ${body || ""}`.toLowerCase();
  if (text.includes("urgent") || text.includes("emergency") || text.includes("asap")) return "urgent";
  if (text.includes("important") || text.includes("critical") || text.includes("broken")) return "high";
  return "normal";
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
