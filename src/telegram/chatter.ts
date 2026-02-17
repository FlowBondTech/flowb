/**
 * Channel Event Chatter Capture
 *
 * Passively listens to group messages, extracts event signals using LLM,
 * stores them per-channel, and periodically posts digests.
 */

import type { ChatterSignal } from "../core/types.js";

const FLOWB_CHAT_URL = "https://flowb.fly.dev";

interface SbConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

let sbCfg: SbConfig | null = null;

export function initChatter(): void {
  const url = process.env.DANZ_SUPABASE_URL;
  const key = process.env.DANZ_SUPABASE_KEY;
  if (url && key) {
    sbCfg = { supabaseUrl: url, supabaseKey: key };
    console.log("[flowb-chatter] Initialized");
  } else {
    console.warn("[flowb-chatter] Missing Supabase credentials, chatter disabled");
  }
}

// ============================================================================
// Pre-filter: avoid sending every message to the LLM
// ============================================================================

const DATE_PATTERNS = /\b(tonight|tonite|tomorrow|tmrw|this\s+(?:friday|saturday|sunday|monday|tuesday|wednesday|thursday|weekend|evening|afternoon)|next\s+(?:week|friday|saturday|sunday|monday|tuesday|wednesday|thursday)|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}|\d{1,2}(?:st|nd|rd|th)|\d{1,2}\/\d{1,2})\b/i;

const TIME_PATTERNS = /\b(\d{1,2}\s*(?:am|pm|a\.m\.|p\.m\.)|at\s+\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?|\d{1,2}:\d{2})\b/i;

const EVENT_KEYWORDS = /\b(party|meetup|event|happening|gathering|hackathon|summit|conference|workshop|concert|show|demo\s*day|afterparty|brunch|dinner|drinks|happy\s*hour|side\s*event|popup|pop-up|mixer|hangout|kickoff|kick-off|opening|closing|ceremony)\b/i;

const EVENT_URL_REGEX = /https?:\/\/(?:lu\.ma|eventbrite\.com|partiful\.com|meetup\.com|dice\.fm|ra\.co|shotgun\.live|events\.xyz|ti\.to|posh\.vip|splash\.club|lemonade\.social)\/[^\s]+/i;

export function shouldAnalyze(text: string): boolean {
  if (!sbCfg) return false;
  if (text.length < 10 || text.length > 2000) return false;
  return (
    DATE_PATTERNS.test(text) ||
    TIME_PATTERNS.test(text) ||
    EVENT_KEYWORDS.test(text) ||
    EVENT_URL_REGEX.test(text)
  );
}

// ============================================================================
// LLM Signal Extraction
// ============================================================================

export async function extractSignals(text: string): Promise<ChatterSignal | null> {
  const now = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = dayNames[now.getDay()];
  const dateStr = now.toISOString().slice(0, 10);

  const systemPrompt = `You are an event signal extractor. Given a chat message, determine if it mentions a specific event, gathering, or meetup. Extract structured info.

Return JSON only. If no event signal, return {"confidence": 0}.

Fields:
- event_title: Name or description of the event
- event_date: Date mentioned (keep original text like "Friday" or "Feb 20")
- event_time: Time mentioned (keep original like "9pm" or "after dinner")
- venue_name: Location/venue if mentioned
- event_url: URL if shared
- description: One-line summary of what's happening
- confidence: 0.0-1.0 (0.7+ = likely event mention)

Today is ${today}, ${dateStr}. ETHDenver week: Feb 15-27, 2026.`;

  try {
    const res = await fetch(`${FLOWB_CHAT_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "flowb",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text.slice(0, 500) },
        ],
        stream: false,
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      console.error(`[flowb-chatter] LLM returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    // Extract JSON from response (may be wrapped in markdown code block)
    const jsonStr = content.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    const signal: ChatterSignal = JSON.parse(jsonStr);

    if (!signal.confidence || signal.confidence < 0.5) return null;

    // Resolve relative dates to ISO timestamps
    if (signal.event_date) {
      signal.parsed_datetime = resolveDate(signal.event_date, signal.event_time);
    }

    return signal;
  } catch (err: any) {
    console.error("[flowb-chatter] Extraction error:", err.message);
    return null;
  }
}

// ============================================================================
// Date Resolution
// ============================================================================

function resolveDate(dateStr: string, timeStr?: string): string | undefined {
  const now = new Date();
  const lower = dateStr.toLowerCase().trim();
  let target: Date | null = null;

  if (lower === "tonight" || lower === "tonite" || lower === "today") {
    target = new Date(now);
  } else if (lower === "tomorrow" || lower === "tmrw") {
    target = new Date(now);
    target.setDate(target.getDate() + 1);
  } else {
    // Try "Friday", "this Saturday", "next Monday", etc.
    const dayMatch = lower.match(/(?:this\s+|next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
    if (dayMatch) {
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const targetDay = dayNames.indexOf(dayMatch[1]);
      const currentDay = now.getDay();
      let daysAhead = (targetDay - currentDay + 7) % 7;
      if (daysAhead === 0) daysAhead = lower.includes("next") ? 7 : 0;
      if (lower.includes("next") && daysAhead <= 7) daysAhead += 7;
      target = new Date(now);
      target.setDate(target.getDate() + daysAhead);
    }

    // Try "Feb 20", "February 20", "2/20"
    if (!target) {
      const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const monthMatch = lower.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})/);
      if (monthMatch) {
        const monthIdx = months.findIndex((m) => monthMatch[1].startsWith(m));
        if (monthIdx >= 0) {
          target = new Date(now.getFullYear(), monthIdx, parseInt(monthMatch[2]));
          if (target < now) target.setFullYear(target.getFullYear() + 1);
        }
      }

      // Numeric: "2/20"
      if (!target) {
        const numMatch = lower.match(/(\d{1,2})\/(\d{1,2})/);
        if (numMatch) {
          target = new Date(now.getFullYear(), parseInt(numMatch[1]) - 1, parseInt(numMatch[2]));
          if (target < now) target.setFullYear(target.getFullYear() + 1);
        }
      }
    }
  }

  if (!target) return undefined;

  // Apply time if available
  if (timeStr) {
    const tMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/i);
    if (tMatch) {
      let hours = parseInt(tMatch[1]);
      const minutes = tMatch[2] ? parseInt(tMatch[2]) : 0;
      const meridiem = tMatch[3]?.replace(/\./g, "").toLowerCase();
      if (meridiem === "pm" && hours < 12) hours += 12;
      if (meridiem === "am" && hours === 12) hours = 0;
      if (!meridiem && hours < 12 && hours >= 1 && hours <= 8) hours += 12; // assume PM for event times
      target.setHours(hours, minutes, 0, 0);
    }
  } else {
    target.setHours(19, 0, 0, 0); // default 7pm if no time given
  }

  return target.toISOString();
}

// ============================================================================
// Supabase Storage
// ============================================================================

async function sbPost(table: string, data: Record<string, any>, upsertCol?: string): Promise<any> {
  if (!sbCfg) return null;
  const url = upsertCol
    ? `${sbCfg.supabaseUrl}/rest/v1/${table}?on_conflict=${upsertCol}`
    : `${sbCfg.supabaseUrl}/rest/v1/${table}`;
  const prefer = upsertCol
    ? "return=representation,resolution=merge-duplicates"
    : "return=representation";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: sbCfg.supabaseKey,
      Authorization: `Bearer ${sbCfg.supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: prefer,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  const result = await res.json();
  return Array.isArray(result) ? result[0] : result;
}

async function sbGet<T>(table: string, params: Record<string, string>): Promise<T | null> {
  if (!sbCfg) return null;
  const url = new URL(`${sbCfg.supabaseUrl}/rest/v1/${table}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: {
      apikey: sbCfg.supabaseKey,
      Authorization: `Bearer ${sbCfg.supabaseKey}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

async function sbPatch(table: string, filter: Record<string, string>, data: Record<string, any>): Promise<boolean> {
  if (!sbCfg) return false;
  const url = new URL(`${sbCfg.supabaseUrl}/rest/v1/${table}`);
  Object.entries(filter).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    method: "PATCH",
    headers: {
      apikey: sbCfg.supabaseKey,
      Authorization: `Bearer ${sbCfg.supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(data),
  });
  return res.ok;
}

// ============================================================================
// Channel Registration
// ============================================================================

export async function registerChannel(
  chatId: number,
  chatType: string,
  title: string | undefined,
  addedBy: number,
): Promise<void> {
  await sbPost("flowb_channels", {
    chat_id: chatId,
    chat_type: chatType,
    title: title || null,
    added_by: addedBy,
    active: true,
    updated_at: new Date().toISOString(),
  }, "chat_id");
}

export async function deactivateChannel(chatId: number): Promise<void> {
  await sbPatch("flowb_channels", { chat_id: `eq.${chatId}` }, {
    active: false,
    updated_at: new Date().toISOString(),
  });
}

// ============================================================================
// Store Signal
// ============================================================================

export async function storeSignal(
  chatId: number,
  messageId: number,
  senderId: number,
  senderName: string,
  signal: ChatterSignal,
  rawText: string,
): Promise<void> {
  // Look up channel_id
  const channels = await sbGet<Array<{ id: string }>>("flowb_channels", {
    chat_id: `eq.${chatId}`,
    select: "id",
    limit: "1",
  });
  const channelId = channels?.[0]?.id || null;

  await sbPost("flowb_channel_signals", {
    channel_id: channelId,
    chat_id: chatId,
    message_id: messageId,
    sender_id: senderId,
    sender_name: senderName,
    event_title: signal.event_title || null,
    event_date: signal.event_date || null,
    event_time: signal.event_time || null,
    parsed_datetime: signal.parsed_datetime || null,
    venue_name: signal.venue_name || null,
    event_url: signal.event_url || null,
    description: signal.description || null,
    confidence: signal.confidence,
    raw_text: rawText.slice(0, 500),
  });
}

// ============================================================================
// Digest Builder
// ============================================================================

export async function buildDigest(chatId: number): Promise<string | null> {
  const signals = await sbGet<Array<{
    id: string;
    event_title: string | null;
    event_date: string | null;
    event_time: string | null;
    venue_name: string | null;
    event_url: string | null;
    sender_name: string | null;
    description: string | null;
    parsed_datetime: string | null;
  }>>("flowb_channel_signals", {
    chat_id: `eq.${chatId}`,
    digested: "eq.false",
    "confidence": "gte.0.6",
    select: "id,event_title,event_date,event_time,venue_name,event_url,sender_name,description,parsed_datetime",
    order: "parsed_datetime.asc.nullslast",
    limit: "10",
  });

  if (!signals || signals.length === 0) return null;

  let html = "<b>Events buzzing in this chat</b>\n\n";
  const signalIds: string[] = [];

  for (let i = 0; i < signals.length; i++) {
    const s = signals[i];
    signalIds.push(s.id);

    const title = s.event_title || s.description || "Unnamed event";
    const dateTime = [s.event_date, s.event_time].filter(Boolean).join(" ");
    const venue = s.venue_name ? ` @ ${s.venue_name}` : "";
    const link = s.event_url ? `\n   <a href="${s.event_url}">Details</a>` : "";
    const by = s.sender_name ? `\n   Mentioned by ${s.sender_name}` : "";

    html += `${i + 1}. <b>${escapeHtml(title)}</b>`;
    if (dateTime || venue) html += `\n   ${escapeHtml(dateTime)}${escapeHtml(venue)}`;
    html += by + link + "\n\n";
  }

  // Mark signals as digested
  for (const id of signalIds) {
    await sbPatch("flowb_channel_signals", { id: `eq.${id}` }, { digested: true });
  }

  return html;
}

// ============================================================================
// Active Channels with Undigested Signals
// ============================================================================

export async function getActiveChannelsWithSignals(): Promise<number[]> {
  const rows = await sbGet<Array<{ chat_id: number }>>("flowb_channel_signals", {
    digested: "eq.false",
    "confidence": "gte.0.6",
    select: "chat_id",
  });
  if (!rows) return [];
  // Deduplicate chat IDs
  return [...new Set(rows.map((r) => r.chat_id))];
}

// ============================================================================
// Helpers
// ============================================================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
