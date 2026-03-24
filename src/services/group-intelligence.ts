/**
 * Group Intelligence Service
 *
 * Listens to group messages, extracts business signals (leads, todos,
 * meetings, deadlines, decisions, blockers, etc.) using LLM, and routes
 * them to the appropriate systems (kanban, CRM, activities, automations).
 */

import { sbQuery, sbInsert, sbPatch, sbUpsert, type SbConfig } from "../utils/supabase.js";

const FLOWB_CHAT_URL = "https://flowb.fly.dev";
const NS = "[group-intel]";

// ============================================================================
// Types
// ============================================================================

export type SignalType =
  | "lead" | "todo" | "meeting" | "deadline" | "decision"
  | "action_item" | "blocker" | "event" | "followup"
  | "expense" | "idea" | "feedback";

export interface GroupIntelConfig {
  id: string;
  chat_id: number;
  channel_id: string | null;
  enabled_by: string;
  is_active: boolean;
  listen_leads: boolean;
  listen_todos: boolean;
  listen_meetings: boolean;
  listen_deadlines: boolean;
  listen_decisions: boolean;
  listen_action_items: boolean;
  listen_blockers: boolean;
  listen_events: boolean;
  listen_followups: boolean;
  listen_expenses: boolean;
  listen_ideas: boolean;
  listen_feedback: boolean;
  default_board_id: string | null;
  default_crew_id: string | null;
  auto_assign_to: string | null;
  notify_on_extract: boolean;
  digest_frequency: string;
  min_confidence: number;
}

export interface GroupSignal {
  signal_type: SignalType;
  title: string;
  description?: string;
  confidence: number;
  extracted_data: Record<string, any>;
}

export interface RoutingResult {
  routed_to: string;
  routed_ref_id: string | null;
  success: boolean;
}

// ============================================================================
// Signal type → emoji mapping
// ============================================================================

export const SIGNAL_EMOJI: Record<SignalType, string> = {
  lead: "\u{1F91D}",         // 🤝
  todo: "\u{1F4DD}",         // 📝
  meeting: "\u{1F4C5}",      // 📅
  deadline: "\u23F0",        // ⏰
  decision: "\u2705",        // ✅
  action_item: "\u{1F4DD}",  // 📝
  blocker: "\u{1F6A7}",      // 🚧
  event: "\u{1F389}",        // 🎉
  followup: "\u{1F514}",     // 🔔
  expense: "\u{1F4B0}",      // 💰
  idea: "\u{1F4A1}",         // 💡
  feedback: "\u{1F4E3}",     // 📣
};

// ============================================================================
// Listener → signal type mapping
// ============================================================================

const LISTENER_MAP: Record<string, SignalType> = {
  listen_leads: "lead",
  listen_todos: "todo",
  listen_meetings: "meeting",
  listen_deadlines: "deadline",
  listen_decisions: "decision",
  listen_action_items: "action_item",
  listen_blockers: "blocker",
  listen_events: "event",
  listen_followups: "followup",
  listen_expenses: "expense",
  listen_ideas: "idea",
  listen_feedback: "feedback",
};

// ============================================================================
// Config cache (5-min TTL)
// ============================================================================

const configCache = new Map<number, { config: GroupIntelConfig | null; ts: number }>();
const CONFIG_TTL = 5 * 60 * 1000;

// ============================================================================
// Pre-filter: avoid sending every message to the LLM
// ============================================================================

// Business language patterns
const LEAD_PATTERNS = /\b(met|introduced|connected with|talked to|spoke with|bumped into|ran into)\b.*\b(from|at|with|who)\b/i;
const TODO_PATTERNS = /\b(need to|gotta|should|have to|let's|must|action item|to-?do|task|finish|complete|prepare|update|set up|write|create|build|send|make)\b/i;
const MEETING_PATTERNS = /\b(meet|meeting|coffee|call|zoom|sync|catchup|catch up|schedule|book|grab lunch|grab drinks|huddle|standup|check-?in)\b/i;
const DEADLINE_PATTERNS = /\b(due|deadline|by friday|by monday|by tuesday|by wednesday|by thursday|by saturday|by sunday|by end of|by eod|by eow|by tomorrow|deliverable|submission|submit)\b/i;
const DECISION_PATTERNS = /\b(decided|decision|going with|approved|chose|picked|settled on|agreed|consensus|verdict|conclusion|let's go with)\b/i;
const BLOCKER_PATTERNS = /\b(stuck|blocked|waiting on|depends on|can't proceed|holding up|bottleneck|impediment|stalled|unable to)\b/i;
const EXPENSE_PATTERNS = /\$\d+|\b(cost|paid|spent|invoice|receipt|expense|bill|reimburs)\b/i;
const FOLLOWUP_PATTERNS = /\b(follow up|followup|remind me|don't forget|ping|circle back|check in with|touch base)\b/i;
const IDEA_PATTERNS = /\b(what if|idea|brainstorm|concept|proposal|suggestion|how about|wouldn't it be|we could|imagine if)\b/i;
const FEEDBACK_PATTERNS = /\b(users? (say|complain|love|hate|want|request|asked)|feedback|complaint|bug report|feature request|users? are)\b/i;

const PATTERN_MAP: Record<string, RegExp> = {
  listen_leads: LEAD_PATTERNS,
  listen_todos: TODO_PATTERNS,
  listen_meetings: MEETING_PATTERNS,
  listen_deadlines: DEADLINE_PATTERNS,
  listen_decisions: DECISION_PATTERNS,
  listen_blockers: BLOCKER_PATTERNS,
  listen_expenses: EXPENSE_PATTERNS,
  listen_followups: FOLLOWUP_PATTERNS,
  listen_ideas: IDEA_PATTERNS,
  listen_feedback: FEEDBACK_PATTERNS,
};

export function shouldAnalyzeForSignals(text: string, config: GroupIntelConfig): boolean {
  if (text.length < 8 || text.length > 3000) return false;

  // Check each enabled listener's pattern
  for (const [listener, pattern] of Object.entries(PATTERN_MAP)) {
    if ((config as any)[listener] && pattern.test(text)) return true;
  }

  // Event listener uses the existing chatter patterns (date/time/event keywords)
  if (config.listen_events) {
    const DATE_PATTERNS = /\b(tonight|tomorrow|this\s+(?:friday|saturday|sunday|monday|tuesday|wednesday|thursday|weekend)|next\s+(?:week|friday|saturday|sunday|monday|tuesday|wednesday|thursday))\b/i;
    const EVENT_KEYWORDS = /\b(party|meetup|event|hackathon|summit|conference|workshop|concert|demo\s*day|afterparty|brunch|dinner|drinks|happy\s*hour|mixer)\b/i;
    if (DATE_PATTERNS.test(text) || EVENT_KEYWORDS.test(text)) return true;
  }

  return false;
}

// ============================================================================
// LLM Signal Extraction
// ============================================================================

function getEnabledTypes(config: GroupIntelConfig): SignalType[] {
  const types: SignalType[] = [];
  for (const [listener, signalType] of Object.entries(LISTENER_MAP)) {
    if ((config as any)[listener]) types.push(signalType);
  }
  return types;
}

export async function extractBusinessSignals(
  text: string,
  senderName: string,
  config: GroupIntelConfig,
): Promise<GroupSignal[]> {
  const enabledTypes = getEnabledTypes(config);
  if (enabledTypes.length === 0) return [];

  const now = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = dayNames[now.getDay()];
  const dateStr = now.toISOString().slice(0, 10);

  const systemPrompt = `You are a business signal extractor. Given a group chat message, identify actionable business signals.

ENABLED SIGNAL TYPES: ${enabledTypes.join(", ")}

Sender name: ${senderName}
Today is ${today}, ${dateStr}.

For each signal found, return:
{
  "signal_type": "lead|todo|meeting|deadline|decision|action_item|blocker|event|followup|expense|idea|feedback",
  "title": "Brief descriptive title",
  "description": "Context from the message",
  "confidence": 0.0-1.0,
  "extracted_data": { /* signal-specific structured data */ }
}

Signal-specific extracted_data schemas:
- lead: { name, company, email, phone, context, relationship }
- todo: { title, assignee_name, priority: "low"|"medium"|"high"|"urgent", due_date }
- meeting: { title, attendees: string[], datetime, location, type: "coffee"|"call"|"meeting" }
- deadline: { task, due_date, owner_name, priority }
- decision: { decision, context, alternatives_considered, decided_by }
- action_item: { action, assignee_name, due_date, depends_on }
- blocker: { blocker, impact, owner_name, suggested_resolution }
- event: { event_title, event_date, event_time, venue_name, event_url }
- followup: { task, with_whom, when, context }
- expense: { amount, currency, category, description, paid_by }
- idea: { idea, context, proposed_by }
- feedback: { feedback, source, sentiment: "positive"|"negative"|"neutral", category }

Return JSON array. If no signals found, return [].
Only extract signals with confidence >= 0.5.
Only return signal types from the ENABLED list above.`;

  try {
    const res = await fetch(`${FLOWB_CHAT_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "flowb",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text.slice(0, 1000) },
        ],
        stream: false,
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      console.error(`${NS} LLM returned ${res.status}`);
      return [];
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return [];

    const jsonStr = content.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    const signals: GroupSignal[] = JSON.parse(jsonStr);

    if (!Array.isArray(signals)) return [];

    // Filter to enabled types and minimum confidence
    return signals.filter(
      (s) => enabledTypes.includes(s.signal_type) && s.confidence >= 0.5,
    );
  } catch (err: any) {
    console.error(`${NS} extraction error:`, err.message);
    return [];
  }
}

// ============================================================================
// Signal Routing
// ============================================================================

export async function routeSignal(
  signal: GroupSignal,
  config: GroupIntelConfig,
  senderId: number,
  senderName: string,
  sb: SbConfig,
): Promise<RoutingResult> {
  const d = signal.extracted_data;

  try {
    switch (signal.signal_type) {
      case "lead": {
        const lead = await sbInsert<any>(sb, "flowb_leads", {
          flowb_user_id: config.enabled_by,
          name: d.name || signal.title,
          company: d.company || null,
          email: d.email || null,
          phone: d.phone || null,
          notes: d.context || signal.description || null,
          stage: "new",
          source: "group_intel",
          tags: ["group-intel"],
        });
        return { routed_to: "lead", routed_ref_id: lead?.id || null, success: !!lead };
      }

      case "todo":
      case "action_item":
      case "deadline":
      case "blocker": {
        const priority = signal.signal_type === "blocker"
          ? "urgent"
          : d.priority || "medium";
        const task = await sbInsert<any>(sb, "kanban_tasks", {
          flowb_user_id: config.enabled_by,
          board_id: config.default_board_id || null,
          crew_id: config.default_crew_id || null,
          title: d.title || d.task || d.action || d.blocker || signal.title,
          description: signal.description || null,
          priority,
          status: "todo",
          due_date: d.due_date || null,
          source: "group_intel",
          metadata: {
            signal_type: signal.signal_type,
            assignee_name: d.assignee_name || d.owner_name || null,
            sender_name: senderName,
            chat_id: config.chat_id,
          },
        });
        return { routed_to: "kanban", routed_ref_id: task?.id || null, success: !!task };
      }

      case "meeting": {
        const meeting = await sbInsert<any>(sb, "flowb_meetings", {
          flowb_user_id: config.enabled_by,
          title: d.title || signal.title,
          meeting_type: d.type || "meeting",
          starts_at: d.datetime || null,
          duration_minutes: 30,
          location: d.location || null,
          notes: signal.description || null,
          status: "scheduled",
          source: "group_intel",
        });
        return { routed_to: "meeting", routed_ref_id: meeting?.id || null, success: !!meeting };
      }

      case "decision":
      case "expense":
      case "feedback":
      case "idea": {
        const activityType = signal.signal_type === "expense" ? "expense"
          : signal.signal_type === "feedback" ? "feedback"
          : signal.signal_type === "idea" ? "idea"
          : "decision";
        const activity = await sbInsert<any>(sb, "flowb_crew_activities", {
          crew_id: config.default_crew_id || null,
          user_id: `telegram_${senderId}`,
          activity_type: activityType,
          title: signal.title,
          description: signal.description || null,
          metadata: {
            ...d,
            sender_name: senderName,
            chat_id: config.chat_id,
            source: "group_intel",
          },
        });
        return { routed_to: "activity", routed_ref_id: activity?.id || null, success: !!activity };
      }

      case "event": {
        // Backward-compat: use existing chatter signal storage
        const channels = await sbQuery<any[]>(sb, "flowb_channels", {
          chat_id: `eq.${config.chat_id}`,
          select: "id",
          limit: "1",
        });
        const channelId = channels?.[0]?.id || null;
        const sig = await sbInsert<any>(sb, "flowb_channel_signals", {
          channel_id: channelId,
          chat_id: config.chat_id,
          message_id: 0,
          sender_id: senderId,
          sender_name: senderName,
          event_title: d.event_title || signal.title,
          event_date: d.event_date || null,
          event_time: d.event_time || null,
          venue_name: d.venue_name || null,
          event_url: d.event_url || null,
          description: signal.description || null,
          confidence: signal.confidence,
          raw_text: signal.title,
        });
        return { routed_to: "event", routed_ref_id: sig?.id || null, success: !!sig };
      }

      case "followup": {
        // Create a kanban task tagged as followup
        const task = await sbInsert<any>(sb, "kanban_tasks", {
          flowb_user_id: config.enabled_by,
          board_id: config.default_board_id || null,
          crew_id: config.default_crew_id || null,
          title: d.task || signal.title,
          description: `Follow up${d.with_whom ? ` with ${d.with_whom}` : ""}${d.when ? ` — ${d.when}` : ""}`,
          priority: "medium",
          status: "todo",
          due_date: d.when || null,
          source: "group_intel",
          metadata: {
            signal_type: "followup",
            with_whom: d.with_whom || null,
            sender_name: senderName,
            chat_id: config.chat_id,
          },
        });
        return { routed_to: "kanban", routed_ref_id: task?.id || null, success: !!task };
      }

      default:
        return { routed_to: "none", routed_ref_id: null, success: false };
    }
  } catch (err: any) {
    console.error(`${NS} routing error for ${signal.signal_type}:`, err.message);
    return { routed_to: "error", routed_ref_id: null, success: false };
  }
}

// ============================================================================
// Config Management
// ============================================================================

export async function getGroupIntelConfig(
  chatId: number,
  sb: SbConfig,
): Promise<GroupIntelConfig | null> {
  const cached = configCache.get(chatId);
  if (cached && Date.now() - cached.ts < CONFIG_TTL) return cached.config;

  const rows = await sbQuery<GroupIntelConfig[]>(sb, "flowb_group_intelligence", {
    chat_id: `eq.${chatId}`,
    is_active: "eq.true",
    select: "*",
    limit: "1",
  });

  const config = rows?.[0] || null;
  configCache.set(chatId, { config, ts: Date.now() });
  return config;
}

export async function enableGroupIntel(
  chatId: number,
  enabledBy: string,
  sb: SbConfig,
  options?: Partial<GroupIntelConfig>,
): Promise<boolean> {
  // Look up channel_id
  const channels = await sbQuery<any[]>(sb, "flowb_channels", {
    chat_id: `eq.${chatId}`,
    select: "id",
    limit: "1",
  });
  const channelId = channels?.[0]?.id || null;

  const data: Record<string, any> = {
    chat_id: chatId,
    channel_id: channelId,
    enabled_by: enabledBy,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  // Apply any option overrides
  if (options) {
    for (const [k, v] of Object.entries(options)) {
      if (k.startsWith("listen_") || k === "default_board_id" || k === "default_crew_id"
          || k === "auto_assign_to" || k === "notify_on_extract" || k === "digest_frequency"
          || k === "min_confidence") {
        data[k] = v;
      }
    }
  }

  const result = await sbUpsert(sb, "flowb_group_intelligence", data, "chat_id");
  if (result) configCache.delete(chatId);
  return !!result;
}

export async function disableGroupIntel(chatId: number, sb: SbConfig): Promise<boolean> {
  const ok = await sbPatch(sb, "flowb_group_intelligence", {
    chat_id: `eq.${chatId}`,
  }, {
    is_active: false,
    updated_at: new Date().toISOString(),
  });
  configCache.delete(chatId);
  return ok;
}

export async function updateGroupIntelSettings(
  chatId: number,
  updates: Record<string, any>,
  sb: SbConfig,
): Promise<boolean> {
  const ok = await sbPatch(sb, "flowb_group_intelligence", {
    chat_id: `eq.${chatId}`,
  }, {
    ...updates,
    updated_at: new Date().toISOString(),
  });
  if (ok) configCache.delete(chatId);
  return ok;
}

// ============================================================================
// Signal Storage
// ============================================================================

export async function storeGroupSignal(
  chatId: number,
  messageId: number,
  senderId: number,
  senderName: string,
  signal: GroupSignal,
  rawText: string,
  routing: RoutingResult | null,
  sb: SbConfig,
): Promise<void> {
  await sbInsert(sb, "flowb_group_signals", {
    chat_id: chatId,
    message_id: messageId,
    sender_id: senderId,
    sender_name: senderName,
    signal_type: signal.signal_type,
    title: signal.title,
    description: signal.description || null,
    confidence: signal.confidence,
    extracted_data: signal.extracted_data,
    raw_text: rawText.slice(0, 500),
    routed: routing?.success || false,
    routed_to: routing?.routed_to || null,
    routed_ref_id: routing?.routed_ref_id || null,
  });
}

// ============================================================================
// Digest Builder
// ============================================================================

export async function buildSignalDigest(
  chatId: number,
  sb: SbConfig,
  since?: Date,
): Promise<string | null> {
  const params: Record<string, string> = {
    chat_id: `eq.${chatId}`,
    select: "id,signal_type,title,description,confidence,extracted_data,sender_name,created_at",
    order: "created_at.desc",
    limit: "30",
  };
  if (since) {
    params.created_at = `gte.${since.toISOString()}`;
  }

  const signals = await sbQuery<any[]>(sb, "flowb_group_signals", params);
  if (!signals?.length) return null;

  // Group by signal type
  const grouped: Record<string, any[]> = {};
  for (const s of signals) {
    if (!grouped[s.signal_type]) grouped[s.signal_type] = [];
    grouped[s.signal_type].push(s);
  }

  const typeLabels: Record<string, string> = {
    lead: "Leads", todo: "Todos", meeting: "Meetings",
    deadline: "Deadlines", decision: "Decisions", action_item: "Action Items",
    blocker: "Blockers", event: "Events", followup: "Follow-ups",
    expense: "Expenses", idea: "Ideas", feedback: "Feedback",
  };

  let html = "<b>Group Intelligence Digest</b>\n\n";
  for (const [type, items] of Object.entries(grouped)) {
    const emoji = SIGNAL_EMOJI[type as SignalType] || "";
    html += `${emoji} <b>${typeLabels[type] || type}</b> (${items.length})\n`;
    for (const item of items.slice(0, 5)) {
      html += `  - ${escapeHtml(item.title)}`;
      if (item.sender_name) html += ` <i>(${escapeHtml(item.sender_name)})</i>`;
      html += "\n";
    }
    if (items.length > 5) html += `  <i>...and ${items.length - 5} more</i>\n`;
    html += "\n";
  }

  return html;
}

// ============================================================================
// List active groups for a user
// ============================================================================

export async function listActiveGroups(
  userId: string,
  sb: SbConfig,
): Promise<any[]> {
  const rows = await sbQuery<any[]>(sb, "flowb_group_intelligence", {
    enabled_by: `eq.${userId}`,
    is_active: "eq.true",
    select: "id,chat_id,channel_id,listen_leads,listen_todos,listen_meetings,listen_deadlines,listen_decisions,listen_action_items,listen_blockers,listen_events,listen_followups,listen_expenses,listen_ideas,listen_feedback,digest_frequency,min_confidence,created_at",
  });
  return rows || [];
}

// ============================================================================
// Get signals for a chat
// ============================================================================

export async function getGroupSignals(
  chatId: number,
  sb: SbConfig,
  options?: { signal_type?: string; limit?: number; unrouted_only?: boolean },
): Promise<any[]> {
  const params: Record<string, string> = {
    chat_id: `eq.${chatId}`,
    select: "*",
    order: "created_at.desc",
    limit: String(options?.limit || 20),
  };
  if (options?.signal_type) params.signal_type = `eq.${options.signal_type}`;
  if (options?.unrouted_only) params.routed = "eq.false";

  const rows = await sbQuery<any[]>(sb, "flowb_group_signals", params);
  return rows || [];
}

// ============================================================================
// Manual route/re-route a signal
// ============================================================================

export async function manualRouteSignal(
  signalId: string,
  routeTo: string,
  sb: SbConfig,
  overrideData?: Record<string, any>,
): Promise<boolean> {
  if (routeTo === "dismiss") {
    return sbPatch(sb, "flowb_group_signals", { id: `eq.${signalId}` }, {
      routed: true,
      routed_to: "dismissed",
    });
  }

  // Get the signal
  const rows = await sbQuery<any[]>(sb, "flowb_group_signals", {
    id: `eq.${signalId}`,
    select: "*",
    limit: "1",
  });
  const signal = rows?.[0];
  if (!signal) return false;

  // Get group intel config
  const config = await getGroupIntelConfig(signal.chat_id, sb);
  if (!config) return false;

  const groupSignal: GroupSignal = {
    signal_type: signal.signal_type,
    title: signal.title,
    description: signal.description,
    confidence: signal.confidence,
    extracted_data: { ...signal.extracted_data, ...(overrideData || {}) },
  };

  const result = await routeSignal(groupSignal, config, signal.sender_id, signal.sender_name || "Unknown", sb);

  await sbPatch(sb, "flowb_group_signals", { id: `eq.${signalId}` }, {
    routed: result.success,
    routed_to: result.routed_to,
    routed_ref_id: result.routed_ref_id,
  });

  return result.success;
}

// ============================================================================
// Process Group Message (main entry point from bot.ts)
// ============================================================================

export async function processGroupMessage(
  chatId: number,
  messageId: number,
  senderId: number,
  senderName: string,
  text: string,
  config: GroupIntelConfig,
  sb: SbConfig,
  awardPoints?: (userId: string, platform: string, action: string) => Promise<any>,
  reactToMessage?: (emoji: string) => Promise<void>,
): Promise<void> {
  // Step 1: Pre-filter
  if (!shouldAnalyzeForSignals(text, config)) return;

  // Step 2: LLM extraction
  const signals = await extractBusinessSignals(text, senderName, config);
  if (signals.length === 0) return;

  // Step 3: Process each signal
  const emojis = new Set<string>();

  for (const signal of signals) {
    if (signal.confidence < config.min_confidence) continue;

    // Route the signal
    const routing = await routeSignal(signal, config, senderId, senderName, sb);

    // Store the signal
    await storeGroupSignal(chatId, messageId, senderId, senderName, signal, text, routing, sb);

    // Collect emojis for reaction
    if (config.notify_on_extract) {
      emojis.add(SIGNAL_EMOJI[signal.signal_type] || "\u{1F4DD}");
    }

    console.log(`${NS} Signal stored: [${signal.signal_type}] "${signal.title}" (${signal.confidence}) → ${routing.routed_to}`);
  }

  // Step 4: React to message with first signal's emoji
  if (config.notify_on_extract && emojis.size > 0 && reactToMessage) {
    const firstEmoji = emojis.values().next().value;
    try {
      await reactToMessage(firstEmoji as string);
    } catch {
      // Bot may not have permission to react
    }
  }

  // Step 5: Award points
  if (awardPoints) {
    try {
      await awardPoints(`telegram_${senderId}`, "telegram", "group_signal");
    } catch {
      // Non-critical
    }
  }
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
