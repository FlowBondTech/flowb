/**
 * Meeting Plugin for FlowB
 *
 * Smart meetings engine: create, manage, share, and chat about meetings.
 * Natural language parsing for quick creation from Telegram:
 *   /meet sarah tomorrow coffee
 *   /meet team standup friday 10am
 *
 * Short links: flowb.me/m/{code}
 */

import type {
  FlowBPlugin,
  FlowBContext,
  ToolInput,
  MeetingPluginConfig,
} from "../../core/types.js";
export type { MeetingPluginConfig } from "../../core/types.js";
import { sbQuery, sbInsert, sbPatch, sbUpsert, type SbConfig } from "../../utils/supabase.js";
import { sendEmail, wrapInTemplate, escHtml } from "../../services/email.js";
import { sendWhatsAppNotification } from "../../whatsapp/templates.js";
import { sendSignalNotification } from "../../signal/api.js";
import { log } from "../../utils/logger.js";

// ============================================================================
// Types
// ============================================================================

export interface Meeting {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_min: number;
  location: string | null;
  meeting_type: string;
  status: string;
  share_code: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingAttendee {
  id: string;
  meeting_id: string;
  user_id: string | null;
  name: string | null;
  email: string | null;
  rsvp_status: string;
  is_organizer?: boolean;
  created_at: string;
}

export interface MeetingMessage {
  id: string;
  meeting_id: string;
  user_id: string;
  display_name: string | null;
  message: string;
  created_at: string;
}

// ============================================================================
// Code Generation (same pattern as FlowPlugin)
// ============================================================================

const CODE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

function generateCode(length = 8): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function flowbLink(prefix: string, code: string): string {
  const domain = process.env.FLOWB_DOMAIN;
  if (domain) {
    return `https://${domain}/${prefix}/${code}`;
  }
  const botUsername = process.env.FLOWB_BOT_USERNAME || "Flow_b_bot";
  return `https://t.me/${botUsername}?start=${prefix}_${code}`;
}

// ============================================================================
// Natural Language Parser
// ============================================================================

const MEETING_TYPES: Record<string, string> = {
  coffee: "coffee",
  tea: "coffee",
  cafe: "coffee",
  call: "call",
  zoom: "call",
  phone: "call",
  video: "call",
  lunch: "lunch",
  dinner: "lunch",
  brunch: "lunch",
  food: "lunch",
  workshop: "workshop",
  session: "workshop",
  demo: "demo",
  presentation: "demo",
  pitch: "demo",
};

interface ParsedMeeting {
  title: string;
  starts_at: Date;
  meeting_type: string;
  duration_min: number;
}

/**
 * Parse natural language meeting input like:
 *   "sarah tomorrow coffee"
 *   "team standup friday 10am"
 *   "project demo next week 2pm"
 */
export function parseMeetingInput(text: string): ParsedMeeting {
  const words = text.trim().split(/\s+/);
  const lower = text.toLowerCase();
  const now = new Date();

  // Detect meeting type from keywords
  let meetingType = "other";
  for (const [keyword, type] of Object.entries(MEETING_TYPES)) {
    if (lower.includes(keyword)) {
      meetingType = type;
      break;
    }
  }

  // Detect time
  let startsAt = new Date(now);
  startsAt.setMinutes(0, 0, 0);

  // Parse explicit time (10am, 2pm, 14:00)
  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i) || lower.match(/(\d{1,2}):(\d{2})/);
  let hour = 10; // default 10am
  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3]?.toLowerCase();
    if (ampm === "pm" && hour < 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;
    startsAt.setHours(hour, minutes);
  } else {
    startsAt.setHours(10, 0); // default to 10am
  }

  // Parse date
  if (lower.includes("tomorrow")) {
    startsAt.setDate(startsAt.getDate() + 1);
  } else if (lower.includes("next week")) {
    startsAt.setDate(startsAt.getDate() + 7);
  } else if (lower.includes("today") || lower.includes("now")) {
    // keep today, but if "now" set to next hour
    if (lower.includes("now")) {
      startsAt = new Date(now);
      startsAt.setMinutes(0, 0, 0);
      startsAt.setHours(startsAt.getHours() + 1);
    }
  } else {
    // Check for day names
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (let i = 0; i < days.length; i++) {
      if (lower.includes(days[i])) {
        const currentDay = now.getDay();
        let diff = i - currentDay;
        if (diff <= 0) diff += 7;
        startsAt.setDate(now.getDate() + diff);
        break;
      }
    }

    // If still today and time already passed, move to tomorrow
    if (startsAt <= now) {
      startsAt.setDate(startsAt.getDate() + 1);
    }
  }

  // Duration defaults by type
  const durationMap: Record<string, number> = {
    coffee: 30,
    call: 30,
    lunch: 60,
    workshop: 90,
    demo: 45,
    other: 30,
  };

  // Build title from remaining words (strip time/date/type keywords)
  const skipWords = new Set([
    "tomorrow", "today", "now", "next", "week", "am", "pm",
    ...days, ...Object.keys(MEETING_TYPES),
  ]);
  const titleWords = words.filter((w) => {
    const lw = w.toLowerCase().replace(/[^a-z]/g, "");
    return lw.length > 0 && !skipWords.has(lw) && !/^\d{1,2}(:\d{2})?$/.test(w);
  });

  const title = titleWords.length > 0
    ? titleWords.join(" ")
    : `${meetingType.charAt(0).toUpperCase() + meetingType.slice(1)} meeting`;

  return {
    title,
    starts_at: startsAt,
    meeting_type: meetingType,
    duration_min: durationMap[meetingType] || 30,
  };
}

const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// ============================================================================
// Meeting Plugin
// ============================================================================

export class MeetingPlugin implements FlowBPlugin {
  id = "meeting";
  name = "Meetings";
  description = "Create, manage, and share meetings with share links and chat";

  actions: Record<string, { description: string; requiresAuth?: boolean }> = {
    "meeting-create":   { description: "Create a new meeting", requiresAuth: true },
    "meeting-list":     { description: "List your meetings", requiresAuth: true },
    "meeting-detail":   { description: "View meeting details", requiresAuth: true },
    "meeting-update":   { description: "Update a meeting", requiresAuth: true },
    "meeting-cancel":   { description: "Cancel a meeting", requiresAuth: true },
    "meeting-complete": { description: "Mark a meeting as completed", requiresAuth: true },
    "meeting-invite":   { description: "Invite someone to a meeting", requiresAuth: true },
    "meeting-chat":     { description: "Send a message in meeting chat", requiresAuth: true },
    "meeting-link":     { description: "Get or resolve a meeting share link", requiresAuth: false },
  };

  private config: MeetingPluginConfig | null = null;

  configure(config: MeetingPluginConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!(this.config?.supabaseUrl && this.config?.supabaseKey);
  }

  async execute(action: string, input: ToolInput, context: FlowBContext): Promise<string> {
    const cfg = this.config;
    if (!cfg) return "Meetings not configured.";
    const uid = input.user_id;

    switch (action) {
      case "meeting-create":   return this.create(cfg, uid, input);
      case "meeting-list":     return this.list(cfg, uid, input);
      case "meeting-detail":   return this.detail(cfg, input.meeting_id);
      case "meeting-update":   return this.update(cfg, uid, input);
      case "meeting-cancel":   return this.cancel(cfg, uid, input.meeting_id);
      case "meeting-complete": return this.complete(cfg, uid, input.meeting_id);
      case "meeting-invite":   return this.invite(cfg, uid, input);
      case "meeting-chat":     return this.chat(cfg, uid, input);
      case "meeting-link":     return this.resolveLink(cfg, input.referral_code);
      default:
        return `Unknown meeting action: ${action}`;
    }
  }

  // ==========================================================================
  // Create
  // ==========================================================================

  async create(cfg: SbConfig, uid: string | undefined, input: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";

    const title = input.meeting_title || input.query;
    if (!title) return "Meeting title required.";

    const shareCode = generateCode(8);
    const now = new Date();

    // Use explicit fields if provided, otherwise parse from title/query
    let startsAt = input.meeting_starts_at
      ? new Date(input.meeting_starts_at)
      : new Date(now.getTime() + 24 * 60 * 60 * 1000); // default: tomorrow
    startsAt.setMinutes(0, 0, 0);
    if (!input.meeting_starts_at) startsAt.setHours(10);

    const meeting = await sbInsert<Meeting>(cfg, "flowb_meetings", {
      creator_id: uid,
      title: input.meeting_title || title,
      description: input.meeting_description || null,
      starts_at: (input.meeting_starts_at ? new Date(input.meeting_starts_at) : startsAt).toISOString(),
      duration_min: input.meeting_duration || 30,
      location: input.meeting_location || null,
      meeting_type: input.meeting_type || "other",
      status: "scheduled",
      share_code: shareCode,
      notes: input.meeting_notes || null,
    });

    if (!meeting) return "Failed to create meeting. Try again.";

    // Add creator as attendee
    await sbInsert(cfg, "flowb_meeting_attendees", {
      meeting_id: meeting.id,
      user_id: uid,
      rsvp_status: "accepted",
    });

    const link = flowbLink("m", shareCode);

    return JSON.stringify({
      type: "meeting_created",
      id: meeting.id,
      title: meeting.title,
      starts_at: meeting.starts_at,
      duration_min: meeting.duration_min,
      location: meeting.location,
      meeting_type: meeting.meeting_type,
      share_code: shareCode,
      share_link: link,
    });
  }

  // ==========================================================================
  // Create from natural language (called by bot)
  // ==========================================================================

  async createFromNaturalLanguage(cfg: SbConfig, uid: string, text: string): Promise<Meeting | null> {
    const parsed = parseMeetingInput(text);
    const shareCode = generateCode(8);

    const meeting = await sbInsert<Meeting>(cfg, "flowb_meetings", {
      creator_id: uid,
      title: parsed.title,
      starts_at: parsed.starts_at.toISOString(),
      duration_min: parsed.duration_min,
      meeting_type: parsed.meeting_type,
      status: "scheduled",
      share_code: shareCode,
    });

    if (!meeting) return null;

    // Add creator as attendee
    await sbInsert(cfg, "flowb_meeting_attendees", {
      meeting_id: meeting.id,
      user_id: uid,
      rsvp_status: "accepted",
    });

    return meeting;
  }

  // ==========================================================================
  // List
  // ==========================================================================

  async list(cfg: SbConfig, uid: string | undefined, input: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";

    const filter = input.meeting_filter || "upcoming";
    const now = new Date().toISOString();

    // Get meetings where user is creator or attendee
    const creatorMeetings = await sbQuery<Meeting[]>(cfg, "flowb_meetings", {
      select: "id,title,starts_at,duration_min,location,meeting_type,status,share_code",
      creator_id: `eq.${uid}`,
      ...(filter === "upcoming"
        ? { status: "eq.scheduled", starts_at: `gte.${now}` }
        : { status: `in.(completed,cancelled)` }),
      order: "starts_at.asc",
      limit: "20",
    });

    // Get meetings where user is an attendee (but not creator)
    const attendances = await sbQuery<MeetingAttendee[]>(cfg, "flowb_meeting_attendees", {
      select: "meeting_id",
      user_id: `eq.${uid}`,
    });

    const attendeeIds = (attendances || []).map((a) => a.meeting_id);
    let attendeeMeetings: Meeting[] = [];
    if (attendeeIds.length) {
      attendeeMeetings = await sbQuery<Meeting[]>(cfg, "flowb_meetings", {
        select: "id,title,starts_at,duration_min,location,meeting_type,status,share_code",
        id: `in.(${attendeeIds.join(",")})`,
        creator_id: `neq.${uid}`,
        ...(filter === "upcoming"
          ? { status: "eq.scheduled", starts_at: `gte.${now}` }
          : { status: `in.(completed,cancelled)` }),
        order: "starts_at.asc",
        limit: "20",
      }) || [];
    }

    // Combine and deduplicate
    const seen = new Set<string>();
    const all: Meeting[] = [];
    for (const m of [...(creatorMeetings || []), ...attendeeMeetings]) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        all.push(m);
      }
    }

    all.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

    return JSON.stringify({
      type: "meeting_list",
      filter,
      meetings: all,
    });
  }

  // ==========================================================================
  // Detail
  // ==========================================================================

  async detail(cfg: SbConfig, meetingId: string | undefined): Promise<string> {
    if (!meetingId) return "Meeting ID required.";

    const meetings = await sbQuery<Meeting[]>(cfg, "flowb_meetings", {
      select: "*",
      id: `eq.${meetingId}`,
      limit: "1",
    });

    if (!meetings?.length) return "Meeting not found.";

    const attendees = await sbQuery<MeetingAttendee[]>(cfg, "flowb_meeting_attendees", {
      select: "id,user_id,name,email,rsvp_status,created_at",
      meeting_id: `eq.${meetingId}`,
      order: "created_at.asc",
    });

    return JSON.stringify({
      type: "meeting_detail",
      meeting: meetings[0],
      attendees: attendees || [],
    });
  }

  // ==========================================================================
  // Update
  // ==========================================================================

  async update(cfg: SbConfig, uid: string | undefined, input: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";
    if (!input.meeting_id) return "Meeting ID required.";

    // Verify ownership
    const meetings = await sbQuery<Meeting[]>(cfg, "flowb_meetings", {
      select: "id,creator_id",
      id: `eq.${input.meeting_id}`,
      limit: "1",
    });

    if (!meetings?.length) return "Meeting not found.";
    if (meetings[0].creator_id !== uid) return "Only the meeting creator can update it.";

    const updates: Record<string, any> = {};
    if (input.meeting_title) updates.title = input.meeting_title;
    if (input.meeting_description) updates.description = input.meeting_description;
    if (input.meeting_starts_at) updates.starts_at = input.meeting_starts_at;
    if (input.meeting_duration) updates.duration_min = input.meeting_duration;
    if (input.meeting_location) updates.location = input.meeting_location;
    if (input.meeting_type) updates.meeting_type = input.meeting_type;
    if (input.meeting_notes) updates.notes = input.meeting_notes;

    if (Object.keys(updates).length === 0) return "No updates provided.";

    await sbPatch(cfg, "flowb_meetings", { id: `eq.${input.meeting_id}` }, updates);
    return "Meeting updated.";
  }

  // ==========================================================================
  // Cancel / Complete
  // ==========================================================================

  async cancel(cfg: SbConfig, uid: string | undefined, meetingId: string | undefined): Promise<string> {
    if (!uid || !meetingId) return "User ID and meeting ID required.";

    const meetings = await sbQuery<Meeting[]>(cfg, "flowb_meetings", {
      select: "id,creator_id,title",
      id: `eq.${meetingId}`,
      limit: "1",
    });

    if (!meetings?.length) return "Meeting not found.";
    if (meetings[0].creator_id !== uid) return "Only the meeting creator can cancel it.";

    await sbPatch(cfg, "flowb_meetings", { id: `eq.${meetingId}` }, { status: "cancelled" });
    return `Meeting "${meetings[0].title}" cancelled.`;
  }

  async complete(cfg: SbConfig, uid: string | undefined, meetingId: string | undefined): Promise<string> {
    if (!uid || !meetingId) return "User ID and meeting ID required.";

    const meetings = await sbQuery<Meeting[]>(cfg, "flowb_meetings", {
      select: "id,creator_id,title",
      id: `eq.${meetingId}`,
      limit: "1",
    });

    if (!meetings?.length) return "Meeting not found.";
    if (meetings[0].creator_id !== uid) return "Only the meeting creator can complete it.";

    await sbPatch(cfg, "flowb_meetings", { id: `eq.${meetingId}` }, { status: "completed" });
    return `Meeting "${meetings[0].title}" marked as completed.`;
  }

  // ==========================================================================
  // Invite
  // ==========================================================================

  async invite(cfg: SbConfig, uid: string | undefined, input: ToolInput): Promise<string> {
    if (!uid || !input.meeting_id) return "User ID and meeting ID required.";

    // Verify user is creator or attendee
    const meetings = await sbQuery<Meeting[]>(cfg, "flowb_meetings", {
      select: "id,creator_id,title,share_code",
      id: `eq.${input.meeting_id}`,
      limit: "1",
    });

    if (!meetings?.length) return "Meeting not found.";

    const attendee = await sbInsert<MeetingAttendee>(cfg, "flowb_meeting_attendees", {
      meeting_id: input.meeting_id,
      user_id: input.friend_id || null,
      name: input.attendee_name || null,
      email: input.attendee_email || null,
      rsvp_status: "invited",
    });

    if (!attendee) return "Failed to add attendee.";

    const link = flowbLink("m", meetings[0].share_code);

    return JSON.stringify({
      type: "meeting_invite_sent",
      meetingId: input.meeting_id,
      meetingTitle: meetings[0].title,
      attendeeId: attendee.id,
      shareLink: link,
    });
  }

  // ==========================================================================
  // Chat
  // ==========================================================================

  async chat(cfg: SbConfig, uid: string | undefined, input: ToolInput): Promise<string> {
    if (!uid || !input.meeting_id) return "User ID and meeting ID required.";
    if (!input.message_content) return "Message content required.";

    // Verify user is an attendee
    const attendees = await sbQuery<MeetingAttendee[]>(cfg, "flowb_meeting_attendees", {
      select: "id",
      meeting_id: `eq.${input.meeting_id}`,
      user_id: `eq.${uid}`,
      limit: "1",
    });

    if (!attendees?.length) return "You're not an attendee of this meeting.";

    // Resolve display name
    const sessions = await sbQuery<any[]>(cfg, "flowb_sessions", {
      select: "display_name",
      user_id: `eq.${uid}`,
      limit: "1",
    });

    const msg = await sbInsert<MeetingMessage>(cfg, "flowb_meeting_messages", {
      meeting_id: input.meeting_id,
      user_id: uid,
      display_name: sessions?.[0]?.display_name || null,
      message: input.message_content.slice(0, 500),
    });

    if (!msg) return "Failed to send message.";

    return JSON.stringify({
      type: "meeting_message_sent",
      meetingId: input.meeting_id,
      messageId: msg.id,
    });
  }

  // ==========================================================================
  // Resolve Share Link
  // ==========================================================================

  async resolveLink(cfg: SbConfig, code: string | undefined): Promise<string> {
    if (!code) return "Share code required.";

    const meetings = await sbQuery<Meeting[]>(cfg, "flowb_meetings", {
      select: "id,title,description,starts_at,duration_min,location,meeting_type,status,share_code,creator_id",
      share_code: `eq.${code}`,
      limit: "1",
    });

    if (!meetings?.length) return "Meeting not found.";

    const meeting = meetings[0];
    const attendees = await sbQuery<MeetingAttendee[]>(cfg, "flowb_meeting_attendees", {
      select: "id,user_id,name,rsvp_status",
      meeting_id: `eq.${meeting.id}`,
    });

    return JSON.stringify({
      type: "meeting_detail",
      meeting,
      attendees: attendees || [],
    });
  }

  // ==========================================================================
  // Public helpers (called by bot/routes)
  // ==========================================================================

  /** RSVP to a meeting by share code */
  async rsvpByCode(cfg: SbConfig, uid: string, code: string, rsvpStatus: string = "accepted"): Promise<{ meeting: Meeting; attendee: MeetingAttendee } | null> {
    const meetings = await sbQuery<Meeting[]>(cfg, "flowb_meetings", {
      select: "*",
      share_code: `eq.${code}`,
      limit: "1",
    });

    if (!meetings?.length) return null;
    const meeting = meetings[0];

    // Check if already an attendee
    const existing = await sbQuery<MeetingAttendee[]>(cfg, "flowb_meeting_attendees", {
      select: "id,rsvp_status",
      meeting_id: `eq.${meeting.id}`,
      user_id: `eq.${uid}`,
      limit: "1",
    });

    if (existing?.length) {
      // Update status
      await sbPatch(cfg, "flowb_meeting_attendees", {
        meeting_id: `eq.${meeting.id}`,
        user_id: `eq.${uid}`,
      }, { rsvp_status: rsvpStatus });
      return { meeting, attendee: { ...existing[0], rsvp_status: rsvpStatus } as MeetingAttendee };
    }

    // New attendee
    const attendee = await sbInsert<MeetingAttendee>(cfg, "flowb_meeting_attendees", {
      meeting_id: meeting.id,
      user_id: uid,
      rsvp_status: rsvpStatus,
    });

    if (!attendee) return null;
    return { meeting, attendee };
  }

  /** Get a meeting by ID */
  async getById(cfg: SbConfig, meetingId: string): Promise<Meeting | null> {
    const meetings = await sbQuery<Meeting[]>(cfg, "flowb_meetings", {
      select: "*",
      id: `eq.${meetingId}`,
      limit: "1",
    });
    return meetings?.[0] || null;
  }

  /** Get a meeting by share code */
  async getByCode(cfg: SbConfig, code: string): Promise<Meeting | null> {
    const meetings = await sbQuery<Meeting[]>(cfg, "flowb_meetings", {
      select: "*",
      share_code: `eq.${code}`,
      limit: "1",
    });
    return meetings?.[0] || null;
  }

  /** Get attendees for a meeting */
  async getAttendees(cfg: SbConfig, meetingId: string): Promise<MeetingAttendee[]> {
    const attendees = await sbQuery<MeetingAttendee[]>(cfg, "flowb_meeting_attendees", {
      select: "*",
      meeting_id: `eq.${meetingId}`,
      order: "created_at.asc",
    });
    return attendees || [];
  }

  /** Get share link for a meeting */
  getShareLink(code: string): string {
    return flowbLink("m", code);
  }

  // ==========================================================================
  // Create from Lead (carries context over)
  // ==========================================================================

  async createFromLead(cfg: SbConfig, uid: string, leadId: string): Promise<Meeting | null> {
    // Fetch lead data
    const leads = await sbQuery<any[]>(cfg, "flowb_leads", {
      select: "*",
      id: `eq.${leadId}`,
      limit: "1",
    });

    if (!leads?.length) return null;
    const lead = leads[0];

    const shareCode = generateCode(8);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const title = `Meeting with ${lead.name}${lead.company ? ` (${lead.company})` : ""}`;
    const description = [
      lead.company && `Company: ${lead.company}`,
      lead.value && `Deal value: $${lead.value}`,
      lead.notes && `Notes: ${lead.notes}`,
      lead.source && `Source: ${lead.source}`,
    ].filter(Boolean).join("\n");

    const meeting = await sbInsert<Meeting>(cfg, "flowb_meetings", {
      creator_id: uid,
      title,
      description,
      starts_at: tomorrow.toISOString(),
      duration_min: 30,
      meeting_type: "one_on_one",
      status: "scheduled",
      share_code: shareCode,
      lead_id: leadId,
      source: "lead_conversion",
    });

    if (!meeting) return null;

    // Add creator as organizer
    await sbInsert(cfg, "flowb_meeting_attendees", {
      meeting_id: meeting.id,
      user_id: uid,
      rsvp_status: "accepted",
      is_organizer: true,
    });

    // Add lead as attendee
    await sbInsert(cfg, "flowb_meeting_attendees", {
      meeting_id: meeting.id,
      name: lead.name,
      email: lead.email || null,
      phone: lead.phone || null,
      rsvp_status: "invited",
    });

    // Update lead stage to 'meeting' + meeting_stage
    await sbPatch(cfg, "flowb_leads", { id: `eq.${leadId}` }, {
      meeting_stage: "scheduled",
    });

    // Log activity on the lead
    await sbInsert(cfg, "flowb_lead_activities", {
      lead_id: leadId,
      user_id: uid,
      activity_type: "meeting_created",
      description: `Meeting scheduled: ${title}`,
      metadata: { meeting_id: meeting.id, share_code: shareCode },
    });

    // Auto-share invite to the lead's contact info (fire-and-forget)
    if (lead.email || lead.phone || lead.platform_id) {
      this.shareMeetingToGuest(cfg, meeting.id, uid, {
        name: lead.name, email: lead.email,
        phone: lead.phone, platform: lead.platform, platform_id: lead.platform_id,
      }).catch(err => log.error("[meeting]", "auto-share failed", { err: err?.message }));
    }

    return meeting;
  }

  // ==========================================================================
  // AI Briefing Generation
  // ==========================================================================

  async generateBriefing(cfg: SbConfig, meetingId: string): Promise<string> {
    const meetings = await sbQuery<any[]>(cfg, "flowb_meetings", {
      select: "*",
      id: `eq.${meetingId}`,
      limit: "1",
    });
    if (!meetings?.length) return "Meeting not found.";
    const meeting = meetings[0];

    const attendees = await sbQuery<MeetingAttendee[]>(cfg, "flowb_meeting_attendees", {
      select: "*",
      meeting_id: `eq.${meetingId}`,
    });

    // Build briefing from available context
    const parts: string[] = [];
    parts.push(`Meeting: ${meeting.title}`);
    parts.push(`When: ${new Date(meeting.starts_at).toLocaleString()}`);
    if (meeting.location) parts.push(`Where: ${meeting.location}`);
    if (meeting.description) parts.push(`Context: ${meeting.description}`);

    if (attendees?.length) {
      const attendeeList = attendees.map(a => a.name || a.user_id || "Unknown").join(", ");
      parts.push(`Attendees: ${attendeeList}`);
    }

    // If linked to a lead, pull lead context
    if (meeting.lead_id) {
      const leads = await sbQuery<any[]>(cfg, "flowb_leads", {
        select: "name,company,stage,notes,value,source,tags",
        id: `eq.${meeting.lead_id}`,
        limit: "1",
      });
      if (leads?.length) {
        const lead = leads[0];
        parts.push(`\nLead Context:`);
        parts.push(`  Name: ${lead.name}`);
        if (lead.company) parts.push(`  Company: ${lead.company}`);
        if (lead.stage) parts.push(`  Pipeline Stage: ${lead.stage}`);
        if (lead.value) parts.push(`  Deal Value: $${lead.value}`);
        if (lead.notes) parts.push(`  Notes: ${lead.notes}`);
        if (lead.tags?.length) parts.push(`  Tags: ${lead.tags.join(", ")}`);
      }
    }

    const briefing = parts.join("\n");

    // Save briefing to the meeting
    await sbPatch(cfg, "flowb_meetings", { id: `eq.${meetingId}` }, {
      briefing_notes: briefing,
    });

    return briefing;
  }

  // ==========================================================================
  // Follow-up Drafting
  // ==========================================================================

  async draftFollowUp(cfg: SbConfig, meetingId: string): Promise<string> {
    const meetings = await sbQuery<any[]>(cfg, "flowb_meetings", {
      select: "*",
      id: `eq.${meetingId}`,
      limit: "1",
    });
    if (!meetings?.length) return "Meeting not found.";
    const meeting = meetings[0];

    const attendees = await sbQuery<MeetingAttendee[]>(cfg, "flowb_meeting_attendees", {
      select: "name,email,user_id,is_organizer",
      meeting_id: `eq.${meetingId}`,
    });

    const nonOrgAttendees = (attendees || []).filter(a => !a.is_organizer);
    const names = nonOrgAttendees.map(a => a.name || "there").join(", ");

    let followUp = `Hi ${names},\n\nThank you for taking the time to meet`;
    if (meeting.title) followUp += ` regarding "${meeting.title}"`;
    followUp += `.`;

    if (meeting.outcome_notes) {
      followUp += `\n\nKey takeaways:\n${meeting.outcome_notes}`;
    }

    if (meeting.action_items?.length) {
      followUp += `\n\nAction items:\n${meeting.action_items.map((item: string, i: number) => `${i + 1}. ${item}`).join("\n")}`;
    }

    followUp += `\n\nLooking forward to our next steps.\n\nBest regards`;

    // Save draft
    await sbPatch(cfg, "flowb_meetings", { id: `eq.${meetingId}` }, {
      follow_up_message: followUp,
      follow_up_status: "drafted",
    });

    return followUp;
  }

  // ==========================================================================
  // Complete Meeting (with lead advancement)
  // ==========================================================================

  async completeWithNotes(cfg: SbConfig, uid: string, meetingId: string, outcomeNotes?: string, actionItems?: string[]): Promise<string> {
    const meetings = await sbQuery<Meeting[]>(cfg, "flowb_meetings", {
      select: "id,creator_id,title,lead_id",
      id: `eq.${meetingId}`,
      limit: "1",
    });

    if (!meetings?.length) return "Meeting not found.";
    if (meetings[0].creator_id !== uid) return "Only the meeting creator can complete it.";

    const updates: Record<string, any> = { status: "completed" };
    if (outcomeNotes) updates.outcome_notes = outcomeNotes;
    if (actionItems?.length) updates.action_items = actionItems;

    await sbPatch(cfg, "flowb_meetings", { id: `eq.${meetingId}` }, updates);

    // If linked to a lead, advance the lead stage
    const meeting = meetings[0] as any;
    if (meeting.lead_id) {
      await sbPatch(cfg, "flowb_leads", { id: `eq.${meeting.lead_id}` }, {
        stage: "proposal",
        meeting_stage: "completed",
      });

      await sbInsert(cfg, "flowb_lead_activities", {
        lead_id: meeting.lead_id,
        user_id: uid,
        activity_type: "stage_change",
        description: `Meeting completed. Lead advanced to Proposal stage.`,
        metadata: { meeting_id: meetingId, from_stage: "meeting", to_stage: "proposal" },
      });
    }

    return `Meeting "${meetings[0].title}" completed.${meeting.lead_id ? " Lead advanced to Proposal stage." : ""}`;
  }

  // ==========================================================================
  // Meeting Messages (Chat History)
  // ==========================================================================

  async getMessages(cfg: SbConfig, meetingId: string, since?: string): Promise<MeetingMessage[]> {
    const params: Record<string, string> = {
      select: "*",
      meeting_id: `eq.${meetingId}`,
      order: "created_at.asc",
      limit: "100",
    };
    if (since) {
      params.created_at = `gt.${since}`;
    }

    return await sbQuery<MeetingMessage[]>(cfg, "flowb_meeting_messages", params) || [];
  }

  // ==========================================================================
  // Meeting Notes
  // ==========================================================================

  async addNote(cfg: SbConfig, meetingId: string, authorId: string, content: string, noteType: string = "note"): Promise<any> {
    return sbInsert(cfg, "flowb_meeting_notes", {
      meeting_id: meetingId,
      author_id: authorId,
      content,
      note_type: noteType,
    });
  }

  async getNotes(cfg: SbConfig, meetingId: string): Promise<any[]> {
    return await sbQuery<any[]>(cfg, "flowb_meeting_notes", {
      select: "*",
      meeting_id: `eq.${meetingId}`,
      order: "created_at.asc",
    }) || [];
  }

  // ==========================================================================
  // Meeting Suggest (AI-powered)
  // ==========================================================================

  async suggestMeetings(cfg: SbConfig, uid: string): Promise<any[]> {
    // Get contacts with recent interactions but no recent meetings
    const connections = await sbQuery<any[]>(cfg, "flowb_connections", {
      select: "friend_id,notes,tags",
      user_id: `eq.${uid}`,
      status: "eq.active",
      limit: "10",
    });

    if (!connections?.length) return [];

    // Check which contacts haven't had meetings recently
    const suggestions: any[] = [];
    for (const conn of connections) {
      const recentMeetings = await sbQuery<any[]>(cfg, "flowb_meeting_attendees", {
        select: "meeting_id",
        user_id: `eq.${conn.friend_id}`,
        limit: "1",
      });

      if (!recentMeetings?.length) {
        // Resolve display name for the friend
        const sessions = await sbQuery<any[]>(cfg, "flowb_sessions", {
          select: "display_name",
          user_id: `eq.${conn.friend_id}`,
          limit: "1",
        });

        suggestions.push({
          contactId: conn.friend_id,
          contactName: sessions?.[0]?.display_name || conn.friend_id,
          reason: "No recent meetings",
          tags: conn.tags || [],
        });
      }

      if (suggestions.length >= 5) break;
    }

    return suggestions;
  }

  // ==========================================================================
  // iCal Generation
  // ==========================================================================

  generateICal(meeting: Meeting): string {
    const start = new Date(meeting.starts_at);
    const end = new Date(start.getTime() + (meeting.duration_min || 30) * 60000);

    const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const escText = (s: string) => s.replace(/[\\;,]/g, c => `\\${c}`).replace(/\n/g, "\\n");

    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//FlowB//Meeting//EN",
      "BEGIN:VEVENT",
      `UID:${meeting.id}@flowb.me`,
      `DTSTART:${formatDate(start)}`,
      `DTEND:${formatDate(end)}`,
      `SUMMARY:${escText(meeting.title)}`,
      meeting.description ? `DESCRIPTION:${escText(meeting.description)}` : "",
      meeting.location ? `LOCATION:${escText(meeting.location)}` : "",
      `URL:https://flowb.me/m/${meeting.share_code}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");
  }

  // ==========================================================================
  // Share Meeting to Guest (non-user contact)
  // ==========================================================================

  async shareMeetingToGuest(
    cfg: SbConfig,
    meetingId: string,
    senderId: string,
    contact: { name?: string; email?: string; phone?: string; platform?: string; platform_id?: string },
    options?: { message?: string },
  ): Promise<{ sent: boolean; channel: string; attendeeId?: string }> {
    // Fetch meeting
    const meetings = await sbQuery<Meeting[]>(cfg, "flowb_meetings", {
      select: "id,creator_id,title,starts_at,duration_min,location,share_code,lead_id",
      id: `eq.${meetingId}`,
      limit: "1",
    });
    if (!meetings?.length) return { sent: false, channel: "none" };
    const meeting = meetings[0] as any;

    // Verify sender is creator or organizer
    if (meeting.creator_id !== senderId) {
      const att = await sbQuery<MeetingAttendee[]>(cfg, "flowb_meeting_attendees", {
        select: "id",
        meeting_id: `eq.${meetingId}`,
        user_id: `eq.${senderId}`,
        is_organizer: "eq.true",
        limit: "1",
      });
      if (!att?.length) return { sent: false, channel: "none" };
    }

    const shareLink = this.getShareLink(meeting.share_code);
    const dateStr = new Date(meeting.starts_at).toLocaleString("en-US", {
      weekday: "short", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });
    const customMsg = options?.message ? `\n\n${options.message}` : "";
    const textMsg = `You're invited to: ${meeting.title}\n${dateStr}${meeting.location ? `\nAt: ${meeting.location}` : ""}\n\nView & RSVP: ${shareLink}${customMsg}`;

    let sent = false;
    let channel = "none";

    // 1. Email (highest priority)
    if (!sent && contact.email) {
      const htmlBody = `
        <p style="color:#ccc;">You're invited to a meeting:</p>
        <h3 style="color:#fff;margin:12px 0 4px;">${escHtml(meeting.title)}</h3>
        <p style="color:#aaa;margin:4px 0;">${escHtml(dateStr)}</p>
        ${meeting.location ? `<p style="color:#aaa;margin:4px 0;">At: ${escHtml(meeting.location)}</p>` : ""}
        ${customMsg ? `<p style="color:#ccc;margin:12px 0;">${escHtml(customMsg.trim())}</p>` : ""}
        <div style="margin:20px 0;text-align:center;">
          <a href="${shareLink}" style="display:inline-block;padding:12px 28px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">View & RSVP</a>
        </div>`;
      sent = await sendEmail({
        to: contact.email,
        subject: `Meeting invite: ${meeting.title}`,
        html: wrapInTemplate("Meeting Invitation", htmlBody),
        text: textMsg,
      });
      if (sent) channel = "email";
    }

    // 2. Telegram DM (only works if user has messaged bot before)
    if (!sent && contact.platform === "telegram" && contact.platform_id) {
      try {
        const botToken = process.env.FLOWB_TELEGRAM_BOT_TOKEN;
        if (botToken) {
          const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: contact.platform_id, text: textMsg }),
          });
          if (res.ok) {
            sent = true;
            channel = "telegram";
          }
        }
      } catch (err: any) {
        log.debug("[meeting]", "TG DM failed (expected if user hasn't started bot)", { err: err?.message });
      }
    }

    // 3. WhatsApp
    if (!sent && contact.phone) {
      sent = await sendWhatsAppNotification(contact.phone, textMsg, "meeting_invite");
      if (sent) channel = "whatsapp";
    }

    // 4. Signal
    if (!sent && contact.phone) {
      sent = await sendSignalNotification(contact.phone, textMsg);
      if (sent) channel = "signal";
    }

    // Upsert contact into attendees if not already there
    let attendeeId: string | undefined;
    const existingAtt = await sbQuery<MeetingAttendee[]>(cfg, "flowb_meeting_attendees", {
      select: "id",
      meeting_id: `eq.${meetingId}`,
      ...(contact.email ? { email: `eq.${contact.email}` } : contact.phone ? { phone: `eq.${contact.phone}` } : {}),
      limit: "1",
    });
    if (existingAtt?.length) {
      attendeeId = existingAtt[0].id;
    } else if (contact.email || contact.phone || contact.name) {
      const att = await sbInsert<MeetingAttendee>(cfg, "flowb_meeting_attendees", {
        meeting_id: meetingId,
        name: contact.name || null,
        email: contact.email || null,
        phone: contact.phone || null,
        platform: contact.platform || null,
        platform_id: contact.platform_id || null,
        rsvp_status: "invited",
      });
      if (att) attendeeId = att.id;
    }

    // Log activity if meeting is from a lead
    if (meeting.lead_id && sent) {
      await sbInsert(cfg, "flowb_lead_activities", {
        lead_id: meeting.lead_id,
        user_id: senderId,
        activity_type: "meeting_shared",
        description: `Meeting invite sent via ${channel}`,
        metadata: { meeting_id: meetingId, channel },
      }).catch(() => {});
    }

    return { sent, channel, attendeeId };
  }
}
