/**
 * Business Chat Tool Executors
 *
 * Lead, meeting, settings, admin/crew, automation, and billing
 * tool executors for the AI chat service. Each function is called
 * by the tool executor switch in ai-chat.ts.
 *
 * Tier gating: free users get limited usage per period.
 * Role gating: admin/crew actions check flowb_group_members.role.
 */

import { sbFetch, sbPost, sbPatch, sbQuery, type SbConfig } from "../utils/supabase.js";

// ─── Types ───────────────────────────────────────────────────────────

export interface BizUserContext {
  userId: string;
  platform: string | null;
  displayName: string | null;
}

/** Tier limits per billing period (calendar month). -1 = unlimited. */
const TIER_LIMITS: Record<string, Record<string, number>> = {
  free:     { leads: 10,  meetings: 3,  automations: 2,  ai_chat: 10,  city_scans: 0 },
  flowmium: { leads: 50,  meetings: 15, automations: 10, ai_chat: 50,  city_scans: 5 },
  pro:      { leads: -1,  meetings: -1, automations: -1, ai_chat: -1,  city_scans: -1 },
  team:     { leads: -1,  meetings: -1, automations: -1, ai_chat: -1,  city_scans: -1 },
  business: { leads: -1,  meetings: -1, automations: -1, ai_chat: -1,  city_scans: -1 },
};

/** Tiers that can request city scans (flowmium and above) */
const CITY_SCAN_TIERS = ["flowmium", "pro", "team", "business"];

type LeadStage = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
const VALID_STAGES: LeadStage[] = ["new", "contacted", "qualified", "proposal", "won", "lost"];

// ─── Helpers ─────────────────────────────────────────────────────────

async function getUserTier(cfg: SbConfig, userId: string): Promise<string> {
  const rows = await sbFetch<any[]>(cfg, `flowb_subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=tier&limit=1`);
  return rows?.[0]?.tier || "free";
}

function getCurrentPeriod(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  return { start, end };
}

async function getFeatureUsage(cfg: SbConfig, userId: string, feature: string): Promise<number> {
  const period = getCurrentPeriod();
  const rows = await sbFetch<any[]>(
    cfg,
    `flowb_usage_tracking?user_id=eq.${encodeURIComponent(userId)}&feature=eq.${feature}&period_start=eq.${encodeURIComponent(period.start)}&select=count&limit=1`,
  );
  return rows?.[0]?.count || 0;
}

async function checkTierLimit(cfg: SbConfig, userId: string, feature: string): Promise<{ allowed: boolean; used: number; limit: number; tier: string }> {
  const tier = await getUserTier(cfg, userId);
  const limit = TIER_LIMITS[tier]?.[feature] ?? -1;
  if (limit === -1) return { allowed: true, used: 0, limit: -1, tier };
  const used = await getFeatureUsage(cfg, userId, feature);
  return { allowed: used < limit, used, limit, tier };
}

function tierGateMessage(used: number, limit: number, tier: string, feature: string): string {
  return `You've used ${used}/${limit} ${feature} on your ${tier} plan this month. Upgrade at flowb.me/upgrade for unlimited access.`;
}

/**
 * Find users by display name OR Telegram @username.
 * Strips leading "@" from the query so admins can type "@stephrella" naturally.
 */
async function findUsersByName(cfg: SbConfig, nameQuery: string, limit = 3): Promise<Array<{ user_id: string; display_name: string; tg_username?: string }>> {
  const q = nameQuery.replace(/^@/, "").trim();
  if (!q) return [];
  const encoded = encodeURIComponent(q);
  // Search display_name OR tg_username (case-insensitive)
  const rows = await sbFetch<any[]>(
    cfg,
    `flowb_sessions?or=(display_name.ilike.*${encoded}*,tg_username.ilike.*${encoded}*)&select=user_id,display_name,tg_username&limit=${limit}`,
  );
  return rows || [];
}

async function getCrewRole(cfg: SbConfig, userId: string, crewId: string): Promise<string | null> {
  const rows = await sbFetch<any[]>(
    cfg,
    `flowb_group_members?group_id=eq.${encodeURIComponent(crewId)}&user_id=eq.${encodeURIComponent(userId)}&select=role&limit=1`,
  );
  return rows?.[0]?.role || null;
}

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

// ─── Lead Tools ──────────────────────────────────────────────────────

export async function createLead(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to create leads.";
  const check = await checkTierLimit(cfg, user.userId, "leads");
  if (!check.allowed) return tierGateMessage(check.used, check.limit, check.tier, "leads");

  const name = (args.name || "").trim();
  if (!name) return "Please provide at least a name for the lead.";

  const row = await sbPost(cfg, "flowb_leads", {
    name,
    company: args.company || null,
    email: args.email || null,
    phone: args.phone || null,
    notes: args.notes || null,
    tags: args.tags || null,
    source: user.platform || "chat",
    stage: "new",
    created_by: user.userId,
    assigned_to: user.userId,
  });

  if (!row) return "Failed to create lead. Try again.";
  return `Lead created: **${name}**${args.company ? ` at ${args.company}` : ""}. Stage: new. +5 Flow points!`;
}

export async function listLeads(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to see your leads.";

  let query = `flowb_leads?created_by=eq.${encodeURIComponent(user.userId)}&order=updated_at.desc`;
  if (args.stage) query += `&stage=eq.${encodeURIComponent(args.stage)}`;
  if (args.search) query += `&or=(name.ilike.*${encodeURIComponent(args.search)}*,company.ilike.*${encodeURIComponent(args.search)}*,notes.ilike.*${encodeURIComponent(args.search)}*)`;
  query += `&limit=${Math.min(args.limit || 20, 50)}`;

  const leads = await sbFetch<any[]>(cfg, query);
  if (!leads?.length) return args.stage ? `No leads in "${args.stage}" stage.` : "No leads yet. Tell me about someone you met!";

  let out = `**Your Leads** (${leads.length}):\n\n`;
  for (const l of leads) {
    const company = l.company ? ` @ ${l.company}` : "";
    const email = l.email ? ` (${l.email})` : "";
    const stage = l.stage || "new";
    out += `- **${l.name}**${company}${email} — ${stage} (${timeAgo(l.updated_at)})\n`;
  }
  return out;
}

export async function updateLead(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to update leads.";

  // Find lead by name query or ID
  let lead: any = null;
  if (args.lead_id) {
    const rows = await sbFetch<any[]>(cfg, `flowb_leads?id=eq.${encodeURIComponent(args.lead_id)}&created_by=eq.${encodeURIComponent(user.userId)}&limit=1`);
    lead = rows?.[0];
  } else if (args.name_query) {
    const rows = await sbFetch<any[]>(cfg, `flowb_leads?created_by=eq.${encodeURIComponent(user.userId)}&name=ilike.*${encodeURIComponent(args.name_query)}*&limit=1`);
    lead = rows?.[0];
  }

  if (!lead) return `Couldn't find a lead matching "${args.name_query || args.lead_id}". Check your leads with "show my leads".`;

  const patch: Record<string, any> = {};
  if (args.new_stage && VALID_STAGES.includes(args.new_stage)) patch.stage = args.new_stage;
  if (args.notes) patch.notes = args.notes;
  if (args.company) patch.company = args.company;
  if (args.email) patch.email = args.email;
  if (args.phone) patch.phone = args.phone;

  if (!Object.keys(patch).length) return "Nothing to update. Specify a new stage, notes, or contact info.";

  patch.updated_at = new Date().toISOString();
  const ok = await sbPatch(cfg, "flowb_leads", { id: `eq.${lead.id}`, created_by: `eq.${user.userId}` }, patch);
  if (!ok) return "Failed to update lead. Try again.";

  const changes = Object.entries(patch).filter(([k]) => k !== "updated_at").map(([k, v]) => `${k}: ${v}`).join(", ");
  return `Updated **${lead.name}**: ${changes}`;
}

export async function getPipeline(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to see your pipeline.";

  const leads = await sbFetch<any[]>(cfg, `flowb_leads?created_by=eq.${encodeURIComponent(user.userId)}&select=stage`);
  if (!leads?.length) return "Pipeline is empty. Start adding leads!";

  const counts: Record<string, number> = { new: 0, contacted: 0, qualified: 0, proposal: 0, won: 0, lost: 0 };
  for (const l of leads) {
    if (counts[l.stage] !== undefined) counts[l.stage]++;
  }

  let out = `**Pipeline** (${leads.length} total):\n`;
  const stageEmoji: Record<string, string> = { new: "🔵", contacted: "💬", qualified: "⭐", proposal: "📋", won: "🏆", lost: "❌" };
  for (const [stage, count] of Object.entries(counts)) {
    if (count > 0) out += `${stageEmoji[stage] || ""} ${stage}: ${count}\n`;
  }
  return out;
}

export async function getLeadTimeline(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to see lead activity.";

  // Find the lead
  let lead: any = null;
  if (args.lead_id) {
    const rows = await sbFetch<any[]>(cfg, `flowb_leads?id=eq.${encodeURIComponent(args.lead_id)}&created_by=eq.${encodeURIComponent(user.userId)}&limit=1`);
    lead = rows?.[0];
  } else if (args.name_query) {
    const rows = await sbFetch<any[]>(cfg, `flowb_leads?created_by=eq.${encodeURIComponent(user.userId)}&name=ilike.*${encodeURIComponent(args.name_query)}*&limit=1`);
    lead = rows?.[0];
  }

  if (!lead) return `Couldn't find a lead matching "${args.name_query || args.lead_id}".`;

  let out = `**${lead.name}**${lead.company ? ` @ ${lead.company}` : ""}\n`;
  out += `Stage: ${lead.stage} | Created: ${timeAgo(lead.created_at)}\n`;
  if (lead.email) out += `Email: ${lead.email}\n`;
  if (lead.phone) out += `Phone: ${lead.phone}\n`;
  if (lead.notes) out += `Notes: ${lead.notes}\n`;
  if (lead.tags) out += `Tags: ${lead.tags}\n`;
  out += `Last updated: ${timeAgo(lead.updated_at)}`;
  return out;
}

// ─── Todo Tools ──────────────────────────────────────────────────────

export async function createTodo(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to create todos.";

  const title = (args.title || "").trim();
  if (!title) return "Please provide a title for the todo.";

  const row = await sbPost(cfg, "flowb_todos", {
    title,
    status: "open",
    priority: args.priority || "medium",
    category: args.category || "general",
    assigned_to: args.assigned_to || null,
    created_by: user.userId,
    source: "chat",
  });

  if (!row) return "Failed to create todo. Try again.";

  let out = `Todo added: **${title}**`;
  if (args.priority && args.priority !== "medium") out += ` (${args.priority})`;
  if (args.assigned_to) out += `\nAssigned to: ${args.assigned_to}`;
  return out;
}

export async function listTodos(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  const status = args.status || "open";
  const limit = Math.min(args.limit || 20, 50);

  const rows = await sbFetch<any[]>(
    cfg,
    `flowb_todos?status=eq.${status}&order=priority.desc,created_at.desc&limit=${limit}&select=id,title,priority,category,assigned_to,created_at`,
  );

  if (!rows || rows.length === 0) return `No ${status} todos found.`;

  const priorityIcon: Record<string, string> = { critical: "🔴", high: "🟠", medium: "🟡", low: "⚪" };
  let out = `**${status.charAt(0).toUpperCase() + status.slice(1)} Todos** (${rows.length}):\n\n`;
  rows.forEach((t, i) => {
    out += `${i + 1}. ${priorityIcon[t.priority] || "⚪"} ${t.title}`;
    if (t.assigned_to) out += ` → ${t.assigned_to}`;
    out += "\n";
  });

  return out;
}

// ─── Meeting Tools ───────────────────────────────────────────────────

const CODE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";
function genCode(len = 8): string {
  let code = "";
  for (let i = 0; i < len; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

export async function createMeeting(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to create meetings.";
  const check = await checkTierLimit(cfg, user.userId, "meetings");
  if (!check.allowed) return tierGateMessage(check.used, check.limit, check.tier, "meetings");

  const title = (args.title || "").trim();
  if (!title) return "Please provide a meeting title.";

  // Parse starts_at — accept ISO or relative like "tomorrow 10am"
  let startsAt: string;
  if (args.starts_at) {
    startsAt = new Date(args.starts_at).toISOString();
  } else {
    // Default: 1 hour from now
    startsAt = new Date(Date.now() + 3600_000).toISOString();
  }

  const shareCode = genCode();
  const row = await sbPost(cfg, "flowb_meetings", {
    creator_id: user.userId,
    title,
    description: args.description || null,
    starts_at: startsAt,
    duration_min: args.duration || 30,
    location: args.location || null,
    meeting_type: args.type || "coffee",
    status: "scheduled",
    share_code: shareCode,
  });

  if (!row) return "Failed to create meeting. Try again.";

  // Add creator as organizer attendee
  await sbPost(cfg, "flowb_meeting_attendees", {
    meeting_id: row.id,
    user_id: user.userId,
    name: user.displayName,
    rsvp_status: "going",
    is_organizer: true,
  });

  // Add named attendee if specified
  if (args.attendee_name) {
    await sbPost(cfg, "flowb_meeting_attendees", {
      meeting_id: row.id,
      name: args.attendee_name,
      rsvp_status: "pending",
    });
  }

  const fmtDate = new Date(startsAt).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: "America/Denver",
  });

  return `Meeting created: **${title}**\nWhen: ${fmtDate}\nType: ${args.type || "coffee"}${args.location ? `\nWhere: ${args.location}` : ""}\nShare link: flowb.me/m/${shareCode}\n+5 Flow points!`;
}

export async function listMeetings(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to see meetings.";

  const now = new Date().toISOString();
  let query = `flowb_meetings?creator_id=eq.${encodeURIComponent(user.userId)}&order=starts_at.asc&limit=20`;

  const filter = args.filter || "upcoming";
  if (filter === "upcoming") query += `&starts_at=gte.${now}`;
  else if (filter === "past") query += `&starts_at=lte.${now}&order=starts_at.desc`;
  else if (filter === "today") {
    const today = now.slice(0, 10);
    query += `&starts_at=gte.${today}T00:00:00&starts_at=lte.${today}T23:59:59`;
  }

  const meetings = await sbFetch<any[]>(cfg, query);
  if (!meetings?.length) return filter === "upcoming" ? "No upcoming meetings." : `No ${filter} meetings.`;

  let out = `**${filter.charAt(0).toUpperCase() + filter.slice(1)} Meetings** (${meetings.length}):\n\n`;
  for (const m of meetings) {
    const when = new Date(m.starts_at).toLocaleString("en-US", {
      weekday: "short", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit", timeZone: "America/Denver",
    });
    out += `- **${m.title}** | ${when} | ${m.meeting_type}${m.location ? ` @ ${m.location}` : ""}\n`;
  }
  return out;
}

export async function completeMeeting(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to complete meetings.";
  if (!args.meeting_id) return "Which meeting do you want to complete?";

  const rows = await sbFetch<any[]>(cfg, `flowb_meetings?id=eq.${encodeURIComponent(args.meeting_id)}&creator_id=eq.${encodeURIComponent(user.userId)}&limit=1`);
  if (!rows?.length) return "Meeting not found or you're not the creator.";

  const patch: Record<string, any> = { status: "completed", updated_at: new Date().toISOString() };
  if (args.notes) patch.notes = args.notes;

  await sbPatch(cfg, "flowb_meetings", { id: `eq.${args.meeting_id}` }, patch);
  return `Meeting **${rows[0].title}** marked complete.${args.notes ? " Notes saved." : ""} +5 Flow points!`;
}

// ─── Settings Tools ──────────────────────────────────────────────────

const USER_SETTINGS_COLS = [
  "biz_mode_enabled", "primary_biz_channel", "dnd_enabled",
  "biz_quiet_hours_start", "biz_quiet_hours_end",
  "biz_daily_notification_limit", "digest_frequency",
];

export async function getMySettings(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to see your settings.";

  const rows = await sbFetch<any[]>(cfg, `flowb_sessions?user_id=eq.${encodeURIComponent(user.userId)}&select=${USER_SETTINGS_COLS.join(",")}&limit=1`);
  if (!rows?.length) return "No settings found — you may need to start a session first.";

  const s = rows[0];
  let out = "**Your Settings:**\n";
  out += `Biz Mode: ${s.biz_mode_enabled ? "ON" : "OFF"}\n`;
  out += `DND: ${s.dnd_enabled ? "ON" : "OFF"}\n`;
  if (s.biz_quiet_hours_start || s.biz_quiet_hours_end) {
    out += `Quiet Hours: ${s.biz_quiet_hours_start || "none"} - ${s.biz_quiet_hours_end || "none"}\n`;
  }
  out += `Digest: ${s.digest_frequency || "daily"}\n`;
  if (s.biz_daily_notification_limit) out += `Notification Limit: ${s.biz_daily_notification_limit}/day\n`;
  if (s.primary_biz_channel) out += `Primary Biz Channel: ${s.primary_biz_channel}\n`;
  return out;
}

export async function updateMySettings(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to update settings.";

  const key = (args.key || "").trim();
  const value = args.value;

  // Map friendly names to DB columns
  const keyMap: Record<string, string> = {
    biz_mode: "biz_mode_enabled",
    biz_mode_enabled: "biz_mode_enabled",
    dnd: "dnd_enabled",
    dnd_enabled: "dnd_enabled",
    quiet_hours_start: "biz_quiet_hours_start",
    quiet_hours_end: "biz_quiet_hours_end",
    notification_limit: "biz_daily_notification_limit",
    digest: "digest_frequency",
    digest_frequency: "digest_frequency",
    notifications: "dnd_enabled", // "turn off notifications" → dnd=true
  };

  const dbKey = keyMap[key];
  if (!dbKey || !USER_SETTINGS_COLS.includes(dbKey)) {
    return `Unknown setting "${key}". Available: biz_mode, dnd, quiet_hours_start, quiet_hours_end, notification_limit, digest.`;
  }

  // Normalize boolean values
  let dbValue: any = value;
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (["true", "on", "yes", "enable", "enabled"].includes(lower)) dbValue = true;
    else if (["false", "off", "no", "disable", "disabled"].includes(lower)) dbValue = false;
  }
  // Special: "notifications off" → dnd_enabled = true
  if (key === "notifications" && dbValue === false) dbValue = true;
  if (key === "notifications" && dbValue === true) dbValue = false;

  const ok = await sbPatch(cfg, "flowb_sessions", { user_id: `eq.${user.userId}` }, { [dbKey]: dbValue });
  if (!ok) return "Failed to update setting. Try again.";
  return `Updated **${key}** to **${dbValue}**.`;
}

export async function getCrewSettings(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to see crew settings.";
  const crewId = args.crew_id;
  if (!crewId) return "Which crew? Specify a crew name or ID.";

  // Resolve crew by name if not UUID
  let resolvedCrewId = crewId;
  if (!crewId.includes("-")) {
    const crews = await sbFetch<any[]>(cfg, `flowb_groups?name=ilike.*${encodeURIComponent(crewId)}*&select=id,name&limit=1`);
    if (!crews?.length) return `Crew "${crewId}" not found.`;
    resolvedCrewId = crews[0].id;
  }

  const role = await getCrewRole(cfg, user.userId, resolvedCrewId);
  if (!role) return "You're not a member of this crew.";

  const rows = await sbFetch<any[]>(cfg, `flowb_groups?id=eq.${encodeURIComponent(resolvedCrewId)}&select=name,emoji,biz_enabled,share_locations,share_leads,share_meetings,share_referrals,share_earnings,share_pipeline,notify_lead_updates,notify_meeting_updates,notify_checkins,notify_wins,is_public,join_mode,max_members&limit=1`);
  if (!rows?.length) return "Crew not found.";

  const c = rows[0];
  let out = `**${c.emoji || ""} ${c.name} Settings:**\n`;

  // Members see limited settings
  if (!["creator", "admin"].includes(role)) {
    out += `Public: ${c.is_public ? "yes" : "no"}\n`;
    out += `Join Mode: ${c.join_mode || "code"}\n`;
    out += `Share Locations: ${c.share_locations ? "yes" : "no"}\n`;
    out += `\n_Only admins can change crew settings._`;
    return out;
  }

  // Admins see everything
  out += `Biz Enabled: ${c.biz_enabled ? "yes" : "no"}\n`;
  out += `Public: ${c.is_public ? "yes" : "no"}\n`;
  out += `Join Mode: ${c.join_mode || "code"}\n`;
  out += `Max Members: ${c.max_members || "unlimited"}\n\n`;
  out += `**Sharing:**\n`;
  out += `Locations: ${c.share_locations ? "ON" : "OFF"} | Leads: ${c.share_leads ? "ON" : "OFF"} | Meetings: ${c.share_meetings ? "ON" : "OFF"}\n`;
  out += `Referrals: ${c.share_referrals ? "ON" : "OFF"} | Earnings: ${c.share_earnings ? "ON" : "OFF"} | Pipeline: ${c.share_pipeline ? "ON" : "OFF"}\n\n`;
  out += `**Notifications:**\n`;
  out += `Lead Updates: ${c.notify_lead_updates ? "ON" : "OFF"} | Meeting Updates: ${c.notify_meeting_updates ? "ON" : "OFF"}\n`;
  out += `Check-ins: ${c.notify_checkins ? "ON" : "OFF"} | Wins: ${c.notify_wins ? "ON" : "OFF"}`;
  return out;
}

export async function updateCrewSettings(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to update crew settings.";
  const crewId = args.crew_id;
  if (!crewId) return "Which crew? Specify a crew name or ID.";

  // Resolve crew by name
  let resolvedCrewId = crewId;
  if (!crewId.includes("-")) {
    const crews = await sbFetch<any[]>(cfg, `flowb_groups?name=ilike.*${encodeURIComponent(crewId)}*&select=id,name&limit=1`);
    if (!crews?.length) return `Crew "${crewId}" not found.`;
    resolvedCrewId = crews[0].id;
  }

  const role = await getCrewRole(cfg, user.userId, resolvedCrewId);
  if (!["creator", "admin"].includes(role || "")) {
    return "You need to be a crew admin to change settings.";
  }

  const key = (args.key || "").trim();
  let value = args.value;

  // Allowed crew settings
  const allowed = [
    "biz_enabled", "share_locations", "share_leads", "share_meetings",
    "share_referrals", "share_earnings", "share_pipeline",
    "notify_lead_updates", "notify_meeting_updates", "notify_checkins", "notify_wins",
    "is_public", "join_mode", "max_members",
  ];

  if (!allowed.includes(key)) {
    return `Unknown crew setting "${key}". Available: ${allowed.join(", ")}`;
  }

  // Normalize booleans
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (["true", "on", "yes", "enable", "enabled"].includes(lower)) value = true;
    else if (["false", "off", "no", "disable", "disabled"].includes(lower)) value = false;
  }

  const ok = await sbPatch(cfg, "flowb_groups", { id: `eq.${resolvedCrewId}` }, { [key]: value });
  if (!ok) return "Failed to update crew setting. Try again.";
  return `Updated crew setting **${key}** to **${value}**.`;
}

// ─── Admin/Crew Tools ────────────────────────────────────────────────

export async function adminCrewAction(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to perform admin actions.";

  const crewId = args.crew_id;
  if (!crewId) return "Which crew?";

  // Resolve crew by name
  let resolvedCrewId = crewId;
  let crewName = crewId;
  if (!crewId.includes("-")) {
    const crews = await sbFetch<any[]>(cfg, `flowb_groups?name=ilike.*${encodeURIComponent(crewId)}*&select=id,name&limit=1`);
    if (!crews?.length) return `Crew "${crewId}" not found.`;
    resolvedCrewId = crews[0].id;
    crewName = crews[0].name;
  }

  const role = await getCrewRole(cfg, user.userId, resolvedCrewId);
  if (!["creator", "admin"].includes(role || "")) {
    return "You need to be a crew admin to do that.";
  }

  const action = (args.action || "").toLowerCase();
  const targetName = args.target_name || args.target_user;

  if (!targetName) return "Who do you want to target? Provide a name or @username.";

  // Find target user by display name or TG @username
  const targets = await findUsersByName(cfg, targetName);
  if (!targets?.length) return `Couldn't find anyone named "${targetName}". Try their display name or Telegram @username.`;

  // Check they're in the crew
  const targetUserId = targets[0].user_id;
  const targetLabel = targets[0].display_name || targets[0].tg_username || targetUserId;
  const targetMember = await sbFetch<any[]>(cfg, `flowb_group_members?group_id=eq.${encodeURIComponent(resolvedCrewId)}&user_id=eq.${encodeURIComponent(targetUserId)}&limit=1`);

  switch (action) {
    case "promote": {
      if (!targetMember?.length) return `${targetLabel} is not in the crew.`;
      await sbPatch(cfg, "flowb_group_members", {
        group_id: `eq.${resolvedCrewId}`,
        user_id: `eq.${targetUserId}`,
      }, { role: "admin" });
      return `Promoted **${targetLabel}** to admin in ${crewName}.`;
    }
    case "demote": {
      if (!targetMember?.length) return `${targetLabel} is not in the crew.`;
      await sbPatch(cfg, "flowb_group_members", {
        group_id: `eq.${resolvedCrewId}`,
        user_id: `eq.${targetUserId}`,
      }, { role: "member" });
      return `Demoted **${targetLabel}** to member in ${crewName}.`;
    }
    case "remove": {
      if (!targetMember?.length) return `${targetLabel} is not in the crew.`;
      const { supabaseUrl, supabaseKey } = cfg;
      await fetch(
        `${supabaseUrl}/rest/v1/flowb_group_members?group_id=eq.${encodeURIComponent(resolvedCrewId)}&user_id=eq.${encodeURIComponent(targetUserId)}`,
        {
          method: "DELETE",
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        },
      );
      return `Removed **${targetLabel}** from ${crewName}.`;
    }
    case "approve": {
      // Approve a join request (pending members)
      const pending = await sbFetch<any[]>(cfg, `flowb_group_join_requests?group_id=eq.${encodeURIComponent(resolvedCrewId)}&user_id=eq.${encodeURIComponent(targetUserId)}&status=eq.pending&limit=1`);
      if (!pending?.length) return `No pending join request from ${targetLabel}.`;
      await sbPatch(cfg, "flowb_group_join_requests", { id: `eq.${pending[0].id}` }, { status: "approved" });
      await sbPost(cfg, "flowb_group_members", {
        group_id: resolvedCrewId,
        user_id: targetUserId,
        role: "member",
      });
      return `Approved **${targetLabel}** to join ${crewName}!`;
    }
    case "deny": {
      const pendingDeny = await sbFetch<any[]>(cfg, `flowb_group_join_requests?group_id=eq.${encodeURIComponent(resolvedCrewId)}&user_id=eq.${encodeURIComponent(targetUserId)}&status=eq.pending&limit=1`);
      if (!pendingDeny?.length) return `No pending join request from ${targetLabel}.`;
      await sbPatch(cfg, "flowb_group_join_requests", { id: `eq.${pendingDeny[0].id}` }, { status: "denied" });
      return `Denied join request from **${targetLabel}** for ${crewName}.`;
    }
    default:
      return `Unknown admin action "${action}". Available: promote, demote, remove, approve, deny.`;
  }
}

// ─── Automation Tools ────────────────────────────────────────────────

export async function listAutomations(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to see automations.";

  const rows = await sbFetch<any[]>(cfg, `flowb_automations?user_id=eq.${encodeURIComponent(user.userId)}&order=created_at.desc&limit=20`);
  if (!rows?.length) return "No automations yet. Create one to automate repetitive tasks!";

  let out = `**Your Automations** (${rows.length}):\n\n`;
  for (const a of rows) {
    const status = a.is_active ? "ON" : "OFF";
    out += `- **${a.name}** [${status}] — ${a.trigger_type} → ${a.action_type}\n`;
  }
  return out;
}

export async function createAutomation(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to create automations.";
  const check = await checkTierLimit(cfg, user.userId, "automations");
  if (!check.allowed) return tierGateMessage(check.used, check.limit, check.tier, "automations");

  const name = (args.name || "").trim();
  if (!name) return "Please provide a name for the automation.";

  const row = await sbPost(cfg, "flowb_automations", {
    user_id: user.userId,
    name,
    trigger_type: args.trigger_type || "manual",
    trigger_config: args.trigger_config || {},
    action_type: args.action_type || "send_message",
    action_config: args.action_config || {},
    is_active: true,
  });

  if (!row) return "Failed to create automation. Try again.";
  return `Automation **${name}** created! Trigger: ${args.trigger_type || "manual"}, Action: ${args.action_type || "notification"}.`;
}

export async function toggleAutomation(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to manage automations.";
  if (!args.automation_id) return "Which automation?";

  const rows = await sbFetch<any[]>(cfg, `flowb_automations?id=eq.${encodeURIComponent(args.automation_id)}&user_id=eq.${encodeURIComponent(user.userId)}&limit=1`);
  if (!rows?.length) return "Automation not found.";

  const newState = !rows[0].is_active;
  await sbPatch(cfg, "flowb_automations", { id: `eq.${args.automation_id}` }, { is_active: newState });
  return `Automation **${rows[0].name}** is now ${newState ? "enabled" : "disabled"}.`;
}

// ─── Billing Tool ────────────────────────────────────────────────────

export async function getMyPlan(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to see your plan.";

  const tier = await getUserTier(cfg, user.userId);
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

  const tierLabel = tier === "flowmium" ? "Flowmium" : tier.charAt(0).toUpperCase() + tier.slice(1);
  let out = `**Your Plan: ${tierLabel}**${tier === "flowmium" ? " (yes, like freemium... but Flow-ier)" : ""}\n\n`;

  if (tier === "free") {
    out += "**Usage this month:**\n";
    for (const [feature, limit] of Object.entries(limits)) {
      if (limit === -1 || limit === 0) continue;
      const used = await getFeatureUsage(cfg, user.userId, feature);
      out += `- ${feature.replace(/_/g, " ")}: ${used}/${limit}\n`;
    }
    out += `\nWant more? Ask an admin to gift you **Flowmium** (it's like freemium, but we couldn't resist the pun).`;
    out += `\nOr upgrade for unlimited: flowb.me/upgrade`;
  } else if (tier === "flowmium") {
    out += "**Usage this month:**\n";
    for (const [feature, limit] of Object.entries(limits)) {
      if (limit === -1) continue;
      const used = await getFeatureUsage(cfg, user.userId, feature);
      out += `- ${feature.replace(/_/g, " ")}: ${used}/${limit}\n`;
    }
    out += `\nYou've got the Flowmium magic -- you can request eGator city scans and enjoy 5x the free tier limits.`;
    out += `\nUpgrade for truly unlimited: flowb.me/upgrade`;
  } else {
    out += "All features unlimited on your plan.\n";
    out += `Manage billing: flowb.me/billing`;
  }

  return out;
}

// ─── Flowmium Tools ─────────────────────────────────────────────────

/**
 * Admin tool: gift Flowmium tier to a user.
 * Because "freemium" was taken, so we went with something Flow-ier.
 */
export async function grantFlowmium(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to gift Flowmium.";

  // Admin check is done at the tool-definition level (admin-only tool),
  // but double-check here for safety
  const { isFlowBAdmin } = await import("../utils/admin.js");
  const isAdmin = await isFlowBAdmin(cfg, user.userId);
  if (!isAdmin) return "Only admins can gift Flowmium. Nice try though!";

  const targetName = (args.target_name || "").trim();
  if (!targetName) return "Who should receive the gift of Flowmium? Provide a name or @username.";

  // Find target user by display name or TG @username
  const targets = await findUsersByName(cfg, targetName);
  if (!targets?.length) return `Couldn't find anyone named "${targetName}". Try their display name or Telegram @username.`;

  if (targets.length > 1) {
    const names = targets.map((t: any) => {
      const handle = t.tg_username ? ` (@${t.tg_username})` : "";
      return `- ${t.display_name || t.tg_username || t.user_id}${handle}`;
    }).join("\n");
    return `Found multiple matches:\n${names}\n\nBe more specific about which one.`;
  }

  const target = targets[0];
  const targetUserId = target.user_id;
  const targetLabel = target.display_name || target.tg_username || targetUserId;

  // Check current tier
  const existingRows = await sbFetch<any[]>(
    cfg,
    `flowb_subscriptions?user_id=eq.${encodeURIComponent(targetUserId)}&select=tier&limit=1`,
  );
  const currentTier = existingRows?.[0]?.tier || "free";

  if (["pro", "team", "business"].includes(currentTier)) {
    return `**${targetLabel}** is already on the **${currentTier}** plan -- that's above Flowmium. They're living the premium life already!`;
  }

  if (currentTier === "flowmium") {
    return `**${targetLabel}** already has Flowmium! The flow is strong with this one.`;
  }

  // Upsert subscription to flowmium
  const now = new Date().toISOString();
  if (existingRows?.length) {
    await sbPatch(cfg, "flowb_subscriptions", { user_id: `eq.${targetUserId}` }, {
      tier: "flowmium",
      flowmium_granted_by: user.userId,
      flowmium_granted_at: now,
    });
  } else {
    await sbPost(cfg, "flowb_subscriptions", {
      user_id: targetUserId,
      tier: "flowmium",
      flowmium_granted_by: user.userId,
      flowmium_granted_at: now,
    });
  }

  return `Flowmium granted to **${targetLabel}**! (Like freemium, but with more flow.)\n\nThey now get:\n- 50 leads/mo (5x free)\n- 15 meetings/mo (5x free)\n- 10 automations/mo (5x free)\n- 50 AI chats/mo (5x free)\n- City scan requests for eGator`;
}

/**
 * Flowmium+ users can request eGator to scan a city.
 * Adds the city to flowb_scan_cities and optionally triggers a scan.
 */
export async function requestCityScan(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  if (!user.userId) return "Log in to request a city scan.";

  // Check tier
  const tier = await getUserTier(cfg, user.userId);
  if (!CITY_SCAN_TIERS.includes(tier)) {
    return `City scan requests are a **Flowmium** perk (yes, like freemium -- we know, we know). Ask an admin to gift you Flowmium, or upgrade at flowb.me/upgrade.`;
  }

  // Check usage limit
  const check = await checkTierLimit(cfg, user.userId, "city_scans");
  if (!check.allowed) return tierGateMessage(check.used, check.limit, check.tier, "city scans");

  const cityName = (args.city || "").trim().toLowerCase();
  if (!cityName) return "Which city should eGator scan? Provide a city name.";

  // Check if city already exists and is enabled
  const existing = await sbFetch<any[]>(
    cfg,
    `flowb_scan_cities?city=eq.${encodeURIComponent(cityName)}&select=city,enabled&limit=1`,
  );

  if (existing?.length && existing[0].enabled) {
    return `**${cityName}** is already on eGator's scan list and active! Events should already be flowing in. Try searching for events in ${cityName}.`;
  }

  // Add or re-enable the city
  if (existing?.length) {
    await sbPatch(cfg, "flowb_scan_cities", { city: `eq.${cityName}` }, { enabled: true });
  } else {
    await sbPost(cfg, "flowb_scan_cities", { city: cityName, enabled: true });
  }

  return `eGator is now scanning **${cityName}**! Events will start appearing after the next scan cycle. You can ask "what's happening in ${cityName}?" to check for events.`;
}

// ─── Exported context builder ────────────────────────────────────────

/** Fetch user tier + crew roles for system prompt enrichment */
export async function fetchUserBizContext(cfg: SbConfig, userId: string): Promise<{
  tier: string;
  crewRoles: Array<{ name: string; role: string; id: string }>;
  usageSummary: string;
}> {
  const tier = await getUserTier(cfg, userId);
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

  // Crew roles
  const memberships = await sbFetch<any[]>(
    cfg,
    `flowb_group_members?user_id=eq.${encodeURIComponent(userId)}&select=role,group_id,flowb_groups(id,name)&order=joined_at.desc`,
  );
  const crewRoles = (memberships || [])
    .filter((m: any) => m.flowb_groups)
    .map((m: any) => ({ name: m.flowb_groups.name, role: m.role, id: m.flowb_groups.id }));

  // Usage summary for free/flowmium tiers
  let usageSummary = "";
  if (tier === "free" || tier === "flowmium") {
    const parts: string[] = [];
    for (const [feature, limit] of Object.entries(limits)) {
      if (limit === -1 || limit === 0) continue;
      const used = await getFeatureUsage(cfg, userId, feature);
      parts.push(`${feature}: ${used}/${limit}`);
    }
    usageSummary = parts.join(", ");
  }

  return { tier, crewRoles, usageSummary };
}

// ─── Group Intelligence Tool Executors ──────────────────────────────

import {
  enableGroupIntel,
  disableGroupIntel,
  getGroupIntelConfig,
  updateGroupIntelSettings,
  listActiveGroups,
  getGroupSignals,
  manualRouteSignal,
  buildSignalDigest,
} from "./group-intelligence.js";

export async function manageGroupIntelligence(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  const action = args.action;

  if (action === "list_active") {
    const groups = await listActiveGroups(user.userId, cfg);
    if (groups.length === 0) return JSON.stringify({ type: "group_intel_list", count: 0, groups: [], message: "No groups with intelligence enabled." });
    return JSON.stringify({ type: "group_intel_list", count: groups.length, groups });
  }

  if (action === "enable" || action === "disable" || action === "status" || action === "configure") {
    // Need to resolve crew_id to a chat_id
    const crewId = args.crew_id;
    if (!crewId) return "Crew ID or name required for this action.";

    // Look up the crew's chat_id from flowb_groups
    const crews = await sbFetch<any[]>(cfg, `flowb_groups?or=(id.eq.${encodeURIComponent(crewId)},name.ilike.*${encodeURIComponent(crewId)}*)&select=id,name,chat_id&limit=1`);
    const crew = crews?.[0];
    if (!crew) return `Crew "${crewId}" not found.`;
    if (!crew.chat_id) return `Crew "${crew.name}" doesn't have a linked Telegram group.`;

    // Check admin role
    const role = await getCrewRole(cfg, user.userId, crew.id);
    if (!role || !["admin", "creator"].includes(role)) {
      return `You need admin access to manage intelligence for "${crew.name}".`;
    }

    if (action === "enable") {
      const ok = await enableGroupIntel(crew.chat_id, user.userId, cfg, args.settings);
      return ok
        ? JSON.stringify({ type: "group_intel_enabled", crew: crew.name, chat_id: crew.chat_id })
        : "Failed to enable group intelligence.";
    }

    if (action === "disable") {
      const ok = await disableGroupIntel(crew.chat_id, cfg);
      return ok
        ? JSON.stringify({ type: "group_intel_disabled", crew: crew.name })
        : "Failed to disable group intelligence.";
    }

    if (action === "status") {
      const config = await getGroupIntelConfig(crew.chat_id, cfg);
      if (!config) return JSON.stringify({ type: "group_intel_status", crew: crew.name, active: false });

      const digest = await buildSignalDigest(crew.chat_id, cfg);
      return JSON.stringify({
        type: "group_intel_status",
        crew: crew.name,
        active: config.is_active,
        config: {
          listen_leads: config.listen_leads,
          listen_todos: config.listen_todos,
          listen_meetings: config.listen_meetings,
          listen_deadlines: config.listen_deadlines,
          listen_decisions: config.listen_decisions,
          listen_action_items: config.listen_action_items,
          listen_blockers: config.listen_blockers,
          listen_events: config.listen_events,
          listen_followups: config.listen_followups,
          listen_expenses: config.listen_expenses,
          listen_ideas: config.listen_ideas,
          listen_feedback: config.listen_feedback,
          digest_frequency: config.digest_frequency,
          min_confidence: config.min_confidence,
        },
        recent_digest: digest,
      });
    }

    if (action === "configure") {
      if (!args.settings || Object.keys(args.settings).length === 0) return "No settings provided.";
      const ok = await updateGroupIntelSettings(crew.chat_id, args.settings, cfg);
      return ok
        ? JSON.stringify({ type: "group_intel_configured", crew: crew.name, updated: Object.keys(args.settings) })
        : "Failed to update settings.";
    }
  }

  return `Unknown action: ${action}`;
}

export async function getGroupSignalsTool(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  const crewId = args.crew_id;
  if (!crewId) return "Crew ID or name required.";

  const crews = await sbFetch<any[]>(cfg, `flowb_groups?or=(id.eq.${encodeURIComponent(crewId)},name.ilike.*${encodeURIComponent(crewId)}*)&select=id,name,chat_id&limit=1`);
  const crew = crews?.[0];
  if (!crew?.chat_id) return `Crew "${crewId}" not found or no linked group.`;

  const signals = await getGroupSignals(crew.chat_id, cfg, {
    signal_type: args.signal_type,
    limit: args.limit,
    unrouted_only: args.unrouted_only,
  });

  return JSON.stringify({
    type: "group_signals",
    crew: crew.name,
    count: signals.length,
    signals: signals.map((s: any) => ({
      id: s.id,
      signal_type: s.signal_type,
      title: s.title,
      description: s.description,
      confidence: s.confidence,
      sender_name: s.sender_name,
      routed: s.routed,
      routed_to: s.routed_to,
      created_at: s.created_at,
    })),
  });
}

export async function routeSignalTool(args: any, user: BizUserContext, cfg: SbConfig): Promise<string> {
  if (!args.signal_id) return "Signal ID required.";
  if (!args.route_to) return "Route destination required.";

  const ok = await manualRouteSignal(args.signal_id, args.route_to, cfg, args.override_data);
  return ok
    ? JSON.stringify({ type: "signal_routed", signal_id: args.signal_id, route_to: args.route_to })
    : "Failed to route signal. Check the signal ID.";
}
