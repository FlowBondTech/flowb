/**
 * Flow Plugin for FlowB
 *
 * Personal flow (1:1 friend connections) and group flow (crews/squads).
 * Event attendance sharing so friends + crews see each other's schedules.
 * Notification dedup to avoid spamming the same info twice.
 *
 * Short links (via FLOWB_DOMAIN, defaults to flowb.me):
 *   flowb.me/f/{code}    → personal flow invite
 *   flowb.me/g/{code}    → crew join
 *   flowb.me/gi/{code}   → personal tracked crew invite
 *   flowb.me/ref/{code}  → referral
 */

import type {
  FlowBPlugin,
  FlowBContext,
  ToolInput,
} from "../../core/types.js";

// ============================================================================
// Config
// ============================================================================

export interface FlowPluginConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

// ============================================================================
// Types
// ============================================================================

export interface Connection {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
}

export interface FlowGroup {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  created_by: string;
  join_code: string;
  join_mode: string;
  max_members: number;
  is_temporary: boolean;
  is_public: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface JoinRequest {
  id: string;
  group_id: string;
  user_id: string;
  status: string;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface CrewInvite {
  id: string;
  group_id: string;
  inviter_id: string;
  invite_code: string;
  uses: number;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  muted: boolean;
}

export interface EventAttendance {
  id: string;
  user_id: string;
  event_id: string;
  event_name: string | null;
  event_date: string | null;
  event_venue: string | null;
  status: string;
  visibility: string;
  created_at: string;
}

// ============================================================================
// Supabase Helpers
// ============================================================================

interface SbConfig { supabaseUrl: string; supabaseKey: string }

async function sbQuery<T>(cfg: SbConfig, table: string, params: Record<string, string>): Promise<T | null> {
  const url = new URL(`${cfg.supabaseUrl}/rest/v1/${table}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: {
      apikey: cfg.supabaseKey,
      Authorization: `Bearer ${cfg.supabaseKey}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

async function sbInsert<T = any>(cfg: SbConfig, table: string, data: Record<string, any>): Promise<T | null> {
  const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: cfg.supabaseKey,
      Authorization: `Bearer ${cfg.supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  const result = await res.json();
  return Array.isArray(result) ? result[0] : result;
}

async function sbUpsert<T = any>(cfg: SbConfig, table: string, data: Record<string, any>, onConflict: string): Promise<T | null> {
  const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: {
      apikey: cfg.supabaseKey,
      Authorization: `Bearer ${cfg.supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation,resolution=merge-duplicates",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  const result = await res.json();
  return Array.isArray(result) ? result[0] : result;
}

async function sbPatch(cfg: SbConfig, table: string, filter: Record<string, string>, data: Record<string, any>): Promise<boolean> {
  const url = new URL(`${cfg.supabaseUrl}/rest/v1/${table}`);
  Object.entries(filter).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    method: "PATCH",
    headers: {
      apikey: cfg.supabaseKey,
      Authorization: `Bearer ${cfg.supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(data),
  });
  return res.ok;
}

async function sbDelete(cfg: SbConfig, table: string, filter: Record<string, string>): Promise<boolean> {
  const url = new URL(`${cfg.supabaseUrl}/rest/v1/${table}`);
  Object.entries(filter).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      apikey: cfg.supabaseKey,
      Authorization: `Bearer ${cfg.supabaseKey}`,
      "Content-Type": "application/json",
    },
  });
  return res.ok;
}

// ============================================================================
// Code Generation
// ============================================================================

const CODE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

function generateCode(length = 8): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

/** Build a short shareable link via FLOWB_DOMAIN, e.g. https://flowb.me/f/abc123 */
function flowbLink(prefix: string, code: string): string {
  const domain = process.env.FLOWB_DOMAIN;
  if (domain) {
    return `https://${domain}/${prefix}/${code}`;
  }
  const botUsername = process.env.FLOWB_BOT_USERNAME || "flow_b_bot";
  return `https://t.me/${botUsername}?start=${prefix}_${code}`;
}

// ============================================================================
// Flow Plugin
// ============================================================================

export class FlowPlugin implements FlowBPlugin {
  id = "flow";
  name = "Flow";
  description = "Connect with friends & crews, share event schedules, see who's going";

  actions: Record<string, { description: string; requiresAuth?: boolean }> = {
    // Personal flow
    "flow-invite":    { description: "Generate your personal 'Join my Flow' link", requiresAuth: true },
    "flow-accept":    { description: "Accept a friend's flow invite", requiresAuth: true },
    "flow-list":      { description: "See your flow (friends + crews)", requiresAuth: true },
    "flow-remove":    { description: "Remove a friend from your flow", requiresAuth: true },
    "flow-mute":      { description: "Mute/unmute a friend connection", requiresAuth: true },
    // Group flow
    "crew-create":    { description: "Create a new crew (group flow)", requiresAuth: true },
    "crew-join":      { description: "Join a crew via invite code", requiresAuth: true },
    "crew-invite":    { description: "Generate a 'Join our Flow' link for your crew", requiresAuth: true },
    "crew-list":      { description: "List your crews", requiresAuth: true },
    "crew-members":   { description: "See who's in a crew", requiresAuth: true },
    "crew-leave":     { description: "Leave a crew", requiresAuth: true },
    "crew-remove-member": { description: "Remove a member from your crew (admin)", requiresAuth: true },
    "crew-settings":    { description: "Toggle crew visibility and join mode (creator/admin)", requiresAuth: true },
    "crew-browse":      { description: "Browse public crews to discover and join", requiresAuth: true },
    "crew-request-join": { description: "Request to join an approval-mode crew", requiresAuth: true },
    "crew-approve":     { description: "Approve a pending join request (creator/admin)", requiresAuth: true },
    "crew-deny":        { description: "Deny a pending join request (creator/admin)", requiresAuth: true },
    "crew-promote":     { description: "Promote a member to admin (creator only)", requiresAuth: true },
    "crew-demote":      { description: "Demote an admin to member (creator only)", requiresAuth: true },
    "crew-personal-invite": { description: "Generate a tracked personal invite link", requiresAuth: true },
    // Event attendance
    "going":          { description: "RSVP to an event (going/maybe)", requiresAuth: true },
    "not-going":      { description: "Cancel your RSVP", requiresAuth: true },
    "whos-going":     { description: "See which friends & crew are going to events", requiresAuth: true },
    "my-schedule":    { description: "See your upcoming RSVPs", requiresAuth: true },
    // Notifications
    "flow-notify":    { description: "Get friends/crews going to an event (internal)", requiresAuth: true },
  };

  private config: FlowPluginConfig | null = null;

  configure(config: FlowPluginConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!(this.config?.supabaseUrl && this.config?.supabaseKey);
  }

  async execute(action: string, input: ToolInput, context: FlowBContext): Promise<string> {
    const cfg = this.config;
    if (!cfg) return "Flow not configured.";
    const uid = input.user_id;

    switch (action) {
      // Personal flow
      case "flow-invite":    return this.flowInvite(cfg, uid);
      case "flow-accept":    return this.flowAccept(cfg, uid, input);
      case "flow-list":      return this.flowList(cfg, uid);
      case "flow-remove":    return this.flowRemove(cfg, uid, input.friend_id);
      case "flow-mute":      return this.flowMute(cfg, uid, input.friend_id);
      // Group flow
      case "crew-create":    return this.crewCreate(cfg, uid, input);
      case "crew-join":      return this.crewJoin(cfg, uid, input);
      case "crew-invite":    return this.crewInvite(cfg, uid, input.group_id);
      case "crew-list":      return this.crewList(cfg, uid);
      case "crew-members":   return this.crewMembers(cfg, input.group_id);
      case "crew-leave":     return this.crewLeave(cfg, uid, input.group_id);
      case "crew-remove-member": return this.crewRemoveMember(cfg, uid, input.group_id, input.friend_id);
      case "crew-settings":    return this.crewSettings(cfg, uid, input);
      case "crew-browse":      return this.crewBrowse(cfg);
      case "crew-request-join": return this.crewRequestJoin(cfg, uid, input.group_id);
      case "crew-approve":     return this.crewApprove(cfg, uid, input);
      case "crew-deny":        return this.crewDeny(cfg, uid, input);
      case "crew-promote":     return this.crewPromote(cfg, uid, input.group_id, input.friend_id);
      case "crew-demote":      return this.crewDemote(cfg, uid, input.group_id, input.friend_id);
      case "crew-personal-invite": return this.crewPersonalInvite(cfg, uid, input.group_id);
      // Attendance
      case "going":          return this.rsvp(cfg, uid, input);
      case "not-going":      return this.cancelRsvp(cfg, uid, input);
      case "whos-going":     return this.whosGoing(cfg, uid, input);
      case "my-schedule":    return this.mySchedule(cfg, uid);
      // Notifications
      case "flow-notify":    return this.getNotifyTargets(cfg, uid, input);
      default:
        return `Unknown flow action: ${action}`;
    }
  }

  // ==========================================================================
  // Personal Flow - Invite / Accept / List / Remove / Mute
  // ==========================================================================

  /**
   * Generate or retrieve the user's personal flow invite code.
   * Stored in flowb_user_points.referral_code (reuse existing field).
   * Returns the deep link for sharing.
   */
  /** Get or create the user's personal flow invite link */
  async getInviteLink(cfg: FlowPluginConfig, uid: string): Promise<string> {
    const rows = await sbQuery<any[]>(cfg, "flowb_user_points", {
      select: "referral_code",
      user_id: `eq.${uid}`,
      limit: "1",
    });

    let code = rows?.[0]?.referral_code;
    if (!code) {
      code = generateCode(8);
      await sbUpsert(cfg, "flowb_user_points", {
        user_id: uid,
        platform: "telegram",
        total_points: 0,
        current_streak: 0,
        longest_streak: 0,
        first_actions: {},
        milestone_level: 0,
        referral_code: code,
      }, "user_id,platform");
    }

    return flowbLink("f", code);
  }

  async flowInvite(cfg: FlowPluginConfig, uid?: string): Promise<string> {
    if (!uid) return "User ID required.";

    const link = await this.getInviteLink(cfg, uid);

    return [
      "**Join my Flow**",
      "",
      "Share this link with friends:",
      link,
      "",
      "When they tap it, you'll be connected and see each other's event plans.",
    ].join("\n");
  }

  /**
   * Accept a personal flow invite.
   * Called when someone taps a f_{code} deep link.
   * Looks up the inviter by referral_code, creates mutual connection.
   */
  async flowAccept(cfg: FlowPluginConfig, uid?: string, input?: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";

    const code = input?.referral_code;
    if (!code) return "Invite code required.";

    // Look up who owns this code
    const owners = await sbQuery<any[]>(cfg, "flowb_user_points", {
      select: "user_id",
      referral_code: `eq.${code}`,
      limit: "1",
    });

    if (!owners?.length) return "Invalid invite code. Ask your friend for a new link.";

    const friendId = owners[0].user_id;
    if (friendId === uid) return "You can't add yourself to your own flow!";

    // Check if connection already exists (either direction)
    const existing = await sbQuery<any[]>(cfg, "flowb_connections", {
      select: "id,status",
      or: `(and(user_id.eq.${uid},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${uid}))`,
      limit: "1",
    });

    if (existing?.length) {
      const conn = existing[0];
      if (conn.status === "active") return "You're already in each other's flow!";
      if (conn.status === "blocked") return "This connection is blocked.";
      // Reactivate a pending/muted connection
      await sbPatch(cfg, "flowb_connections", { id: `eq.${conn.id}` }, {
        status: "active",
        accepted_at: new Date().toISOString(),
      });
      return "**Flow reconnected!** You'll now see each other's event plans.";
    }

    // Create bidirectional connection (both active immediately via deep link)
    const now = new Date().toISOString();
    await sbInsert(cfg, "flowb_connections", {
      user_id: uid,
      friend_id: friendId,
      status: "active",
      accepted_at: now,
    });
    await sbInsert(cfg, "flowb_connections", {
      user_id: friendId,
      friend_id: uid,
      status: "active",
      accepted_at: now,
    });

    return "**You're in the flow!** You'll now see each other's event plans and get notified when you're going to the same events.";
  }

  /**
   * List all friends and crews for a user.
   */
  async flowList(cfg: FlowPluginConfig, uid?: string): Promise<string> {
    if (!uid) return "User ID required.";

    // Get friends (active connections where this user is user_id)
    const friends = await sbQuery<Connection[]>(cfg, "flowb_connections", {
      select: "friend_id,status,accepted_at",
      user_id: `eq.${uid}`,
      status: "eq.active",
      order: "accepted_at.desc",
    });

    // Get crews
    const memberships = await sbQuery<any[]>(cfg, "flowb_group_members", {
      select: "group_id,role,flowb_groups(name,emoji,join_code)",
      user_id: `eq.${uid}`,
    });

    const lines = ["**Your Flow**\n"];

    // Friends section — resolve usernames
    if (friends?.length) {
      const friendIds = friends.map((f) => f.friend_id);
      const nameMap = await this.resolveNames(cfg, friendIds);

      lines.push(`**Friends** (${friends.length})`);
      for (const f of friends) {
        lines.push(`  ${this.displayName(nameMap, f.friend_id)}`);
      }
      lines.push("");
    } else {
      lines.push("**Friends**: None yet. Use /share to invite friends!\n");
    }

    // Crews section
    const crews = memberships?.filter((m) => m.flowb_groups) || [];
    if (crews.length) {
      lines.push(`**Crews** (${crews.length})`);
      for (const m of crews) {
        const g = m.flowb_groups;
        const roleTag = m.role === "creator" ? " (creator)" : m.role === "admin" ? " (admin)" : "";
        lines.push(`  ${g.emoji} ${g.name}${roleTag}`);
      }
    } else {
      lines.push("**Crews**: None yet. Use /crew to create or join one!");
    }

    return lines.join("\n");
  }

  /**
   * Remove a friend from flow (deletes both directions).
   */
  async flowRemove(cfg: FlowPluginConfig, uid?: string, friendId?: string): Promise<string> {
    if (!uid) return "User ID required.";
    if (!friendId || friendId === uid) return "Friend ID required.";

    // Remove both directions
    await sbDelete(cfg, "flowb_connections", {
      user_id: `eq.${uid}`,
      friend_id: `eq.${friendId}`,
    });
    await sbDelete(cfg, "flowb_connections", {
      user_id: `eq.${friendId}`,
      friend_id: `eq.${uid}`,
    });

    return "Removed from your flow.";
  }

  /**
   * Mute/unmute a connection (still connected but no notifications).
   */
  async flowMute(cfg: FlowPluginConfig, uid?: string, friendId?: string): Promise<string> {
    if (!uid) return "User ID required.";
    if (!friendId) return "Friend ID required.";

    // Get current status
    const conns = await sbQuery<Connection[]>(cfg, "flowb_connections", {
      select: "id,status",
      user_id: `eq.${uid}`,
      friend_id: `eq.${friendId}`,
      limit: "1",
    });

    if (!conns?.length) return "Not in your flow.";

    const newStatus = conns[0].status === "muted" ? "active" : "muted";
    await sbPatch(cfg, "flowb_connections", { id: `eq.${conns[0].id}` }, { status: newStatus });

    return newStatus === "muted"
      ? "Muted. You won't get notifications about this friend."
      : "Unmuted. Notifications restored.";
  }

  // ==========================================================================
  // Group Flow (Crews)
  // ==========================================================================

  /**
   * Create a new crew with a name and optional emoji.
   */
  async crewCreate(cfg: FlowPluginConfig, uid?: string, input?: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";

    const name = input?.query;
    if (!name) return "Crew name required. Example: /crew create Salsa Wolves";

    // Parse emoji from name if present (first char if emoji)
    const emojiMatch = name.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u);
    const emoji = emojiMatch ? emojiMatch[1] : "🔥";
    const cleanName = emojiMatch ? name.slice(emojiMatch[0].length).trim() : name;

    if (!cleanName) return "Crew name required (not just an emoji).";

    const joinCode = generateCode(6);

    const group = await sbInsert<FlowGroup>(cfg, "flowb_groups", {
      name: cleanName,
      emoji,
      created_by: uid,
      join_code: joinCode,
      join_mode: "open",
      max_members: 50,
      is_temporary: false,
    });

    if (!group) return "Failed to create crew. Try again.";

    // Add creator with creator role
    await sbInsert(cfg, "flowb_group_members", {
      group_id: group.id,
      user_id: uid,
      role: "creator",
    });

    const link = flowbLink("g", joinCode);

    return [
      `**${emoji} ${cleanName}** created!`,
      "",
      "Share this link to invite your crew:",
      link,
      "",
      "Members will see each other's event plans.",
    ].join("\n");
  }

  /**
   * Join a crew via join_code (from g_{code} deep link) or personal invite (gi_{code}).
   * Respects join_mode: open = join directly, approval = create request, closed = reject.
   */
  async crewJoin(cfg: FlowPluginConfig, uid?: string, input?: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";

    const code = input?.referral_code;
    if (!code) return "Crew invite code required.";

    // Check if this is a personal invite code (gi_ prefix was stripped by bot)
    let personalInvite: CrewInvite | null = null;
    let group: FlowGroup | null = null;

    // Try personal invite lookup first
    const invites = await sbQuery<CrewInvite[]>(cfg, "flowb_crew_invites", {
      select: "id,group_id,inviter_id,invite_code,uses",
      invite_code: `eq.${code}`,
      limit: "1",
    });

    if (invites?.length) {
      personalInvite = invites[0];
      // Look up the group
      const groups = await sbQuery<FlowGroup[]>(cfg, "flowb_groups", {
        select: "*",
        id: `eq.${personalInvite.group_id}`,
        limit: "1",
      });
      group = groups?.[0] || null;
    } else {
      // Try standard join_code
      const groups = await sbQuery<FlowGroup[]>(cfg, "flowb_groups", {
        select: "*",
        join_code: `eq.${code}`,
        limit: "1",
      });
      group = groups?.[0] || null;
    }

    if (!group) return "Invalid crew code. Ask the crew admin for a new link.";

    // Check if expired
    if (group.is_temporary && group.expires_at) {
      if (new Date(group.expires_at) < new Date()) {
        return "This crew has expired. It was a temporary squad.";
      }
    }

    // Check join mode
    if (group.join_mode === "closed") {
      return "This crew is closed to new members.";
    }

    // Check if already a member
    const existing = await sbQuery<any[]>(cfg, "flowb_group_members", {
      select: "user_id",
      group_id: `eq.${group.id}`,
      user_id: `eq.${uid}`,
      limit: "1",
    });

    if (existing?.length) {
      return `You're already in ${group.emoji} ${group.name}!`;
    }

    // Check member count
    const members = await sbQuery<any[]>(cfg, "flowb_group_members", {
      select: "user_id",
      group_id: `eq.${group.id}`,
    });

    if ((members?.length || 0) >= group.max_members) {
      return `${group.emoji} ${group.name} is full (${group.max_members} members).`;
    }

    // If approval mode and no personal invite override, create a join request
    if (group.join_mode === "approval" && !personalInvite) {
      return this.crewRequestJoin(cfg, uid, group.id);
    }

    // Join directly (open mode or personal invite bypasses approval)
    await sbInsert(cfg, "flowb_group_members", {
      group_id: group.id,
      user_id: uid,
      role: "member",
    });

    // Track personal invite attribution
    if (personalInvite) {
      await sbPatch(cfg, "flowb_crew_invites", { id: `eq.${personalInvite.id}` }, {
        uses: personalInvite.uses + 1,
      });
      // Store invite attribution for bot to award points
      this._lastInviteAttribution = {
        inviterId: personalInvite.inviter_id,
        groupId: group.id,
      };
    }

    const memberCount = (members?.length || 0) + 1;

    return [
      `**Welcome to ${group.emoji} ${group.name}!**`,
      "",
      `${memberCount} members in this crew.`,
      "You'll see each other's event plans and get crew notifications.",
    ].join("\n");
  }

  /** Transient field for bot to read invite attribution after crewJoin */
  _lastInviteAttribution: { inviterId: string; groupId: string } | null = null;

  /**
   * Generate a personal tracked invite link for a crew (must be a member).
   * Creates a unique invite code stored in flowb_crew_invites for referral attribution.
   */
  async crewInvite(cfg: FlowPluginConfig, uid?: string, groupId?: string): Promise<string> {
    if (!uid) return "User ID required.";
    if (!groupId) return "Crew ID required.";

    // Verify membership
    const membership = await sbQuery<any[]>(cfg, "flowb_group_members", {
      select: "role,flowb_groups(name,emoji,join_code)",
      group_id: `eq.${groupId}`,
      user_id: `eq.${uid}`,
      limit: "1",
    });

    if (!membership?.length) return "You're not in this crew.";

    const group = membership[0].flowb_groups;
    const role = membership[0].role;

    // Check if user already has a personal invite for this crew
    const existingInvites = await sbQuery<CrewInvite[]>(cfg, "flowb_crew_invites", {
      select: "invite_code,uses",
      group_id: `eq.${groupId}`,
      inviter_id: `eq.${uid}`,
      limit: "1",
    });

    let inviteCode: string;
    if (existingInvites?.length) {
      inviteCode = existingInvites[0].invite_code;
    } else {
      inviteCode = generateCode(8);
      await sbInsert(cfg, "flowb_crew_invites", {
        group_id: groupId,
        inviter_id: uid,
        invite_code: inviteCode,
      });
    }

    const link = flowbLink("gi", inviteCode);

    const uses = existingInvites?.[0]?.uses || 0;
    const usesText = uses > 0 ? `\n${uses} people joined via your link.` : "";

    return [
      `**Join our Flow - ${group.emoji} ${group.name}**`,
      "",
      "Your personal invite link:",
      link,
      usesText,
      "",
      `You earn points for every person who joins!`,
    ].join("\n");
  }

  /**
   * List all crews the user is in.
   */
  async crewList(cfg: FlowPluginConfig, uid?: string): Promise<string> {
    if (!uid) return "User ID required.";

    const memberships = await sbQuery<any[]>(cfg, "flowb_group_members", {
      select: "group_id,role,flowb_groups(name,emoji,join_code,created_at)",
      user_id: `eq.${uid}`,
      order: "joined_at.desc",
    });

    const crews = memberships?.filter((m) => m.flowb_groups) || [];
    if (!crews.length) {
      return "**Your Crews**\n\nNone yet. Create one with /crew or join via an invite link!";
    }

    const lines = ["**Your Crews**\n"];
    for (const m of crews) {
      const g = m.flowb_groups;
      const roleTag = m.role === "creator" ? " (creator)" : m.role === "admin" ? " (admin)" : "";
      lines.push(`${g.emoji} **${g.name}**${roleTag}`);
      lines.push(`  ID: ${m.group_id.slice(0, 8)}`);
    }

    return lines.join("\n");
  }

  /**
   * Show members of a crew.
   */
  async crewMembers(cfg: FlowPluginConfig, groupId?: string): Promise<string> {
    if (!groupId) return "Crew ID required.";

    // Get group info
    const groups = await sbQuery<FlowGroup[]>(cfg, "flowb_groups", {
      select: "name,emoji",
      id: `eq.${groupId}`,
      limit: "1",
    });

    if (!groups?.length) return "Crew not found.";
    const group = groups[0];

    // Get members
    const members = await sbQuery<GroupMember[]>(cfg, "flowb_group_members", {
      select: "user_id,role,joined_at",
      group_id: `eq.${groupId}`,
      order: "joined_at.asc",
    });

    if (!members?.length) return "No members found.";

    const memberIds = members.map((m) => m.user_id);
    const nameMap = await this.resolveNames(cfg, memberIds);

    const lines = [`**${group.emoji} ${group.name}** (${members.length} members)\n`];
    for (const m of members) {
      const name = this.displayName(nameMap, m.user_id);
      const roleTag = m.role === "creator" ? " (creator)" : m.role === "admin" ? " (admin)" : "";
      lines.push(`  ${name}${roleTag}`);
    }

    return lines.join("\n");
  }

  /**
   * Leave a crew. Admins can leave but the crew persists.
   */
  async crewLeave(cfg: FlowPluginConfig, uid?: string, groupId?: string): Promise<string> {
    if (!uid) return "User ID required.";
    if (!groupId) return "Crew ID required.";

    await sbDelete(cfg, "flowb_group_members", {
      group_id: `eq.${groupId}`,
      user_id: `eq.${uid}`,
    });

    return "You've left the crew.";
  }

  /**
   * Remove a member from a crew (admin only).
   */
  async crewRemoveMember(cfg: FlowPluginConfig, uid?: string, groupId?: string, targetId?: string): Promise<string> {
    if (!uid) return "User ID required.";
    if (!groupId || !targetId) return "Crew ID and member ID required.";

    // Verify caller is admin
    const callerMembership = await sbQuery<any[]>(cfg, "flowb_group_members", {
      select: "role",
      group_id: `eq.${groupId}`,
      user_id: `eq.${uid}`,
      limit: "1",
    });

    if (!callerMembership?.length || !["creator", "admin"].includes(callerMembership[0].role)) {
      return "Only crew admins can remove members.";
    }

    await sbDelete(cfg, "flowb_group_members", {
      group_id: `eq.${groupId}`,
      user_id: `eq.${targetId}`,
    });

    return `Removed ${targetId.replace("telegram_", "@")} from the crew.`;
  }

  // ==========================================================================
  // Crew Management (settings, browse, approve/deny, promote/demote)
  // ==========================================================================

  /**
   * Update crew settings: is_public, join_mode. Creator/admin only.
   */
  async crewSettings(cfg: FlowPluginConfig, uid?: string, input?: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";
    const groupId = input?.group_id;
    if (!groupId) return "Crew ID required.";

    if (!await this.hasCrewPermission(cfg, uid, groupId, "admin")) {
      return "Only crew creators and admins can change settings.";
    }

    // Get current group state
    const groups = await sbQuery<FlowGroup[]>(cfg, "flowb_groups", {
      select: "id,name,emoji,is_public,join_mode",
      id: `eq.${groupId}`,
      limit: "1",
    });

    if (!groups?.length) return "Crew not found.";
    const group = groups[0];

    // Check what to update
    const updates: Record<string, any> = {};
    if (input?.visibility === "public") updates.is_public = true;
    else if (input?.visibility === "private") updates.is_public = false;
    if (input?.query && ["open", "approval", "closed"].includes(input.query)) {
      updates.join_mode = input.query;
    }

    if (Object.keys(updates).length === 0) {
      // Return current settings
      return JSON.stringify({
        id: group.id,
        name: group.name,
        emoji: group.emoji,
        is_public: group.is_public,
        join_mode: group.join_mode,
      });
    }

    await sbPatch(cfg, "flowb_groups", { id: `eq.${groupId}` }, updates);

    const newPublic = updates.is_public ?? group.is_public;
    const newMode = updates.join_mode ?? group.join_mode;

    return [
      `**${group.emoji} ${group.name}** settings updated`,
      "",
      `Visibility: ${newPublic ? "Public" : "Private"}`,
      `Join mode: ${newMode}`,
    ].join("\n");
  }

  /**
   * Browse public crews for discovery.
   */
  async crewBrowse(cfg: FlowPluginConfig): Promise<string> {
    const crews = await sbQuery<FlowGroup[]>(cfg, "flowb_groups", {
      select: "id,name,emoji,description,join_mode,created_at",
      is_public: "eq.true",
      order: "created_at.desc",
      limit: "20",
    });

    if (!crews?.length) {
      return "No public crews yet. Be the first to create one!";
    }

    return JSON.stringify(crews);
  }

  /**
   * Request to join an approval-mode crew.
   */
  async crewRequestJoin(cfg: FlowPluginConfig, uid?: string, groupId?: string): Promise<string> {
    if (!uid) return "User ID required.";
    if (!groupId) return "Crew ID required.";

    // Get group info
    const groups = await sbQuery<FlowGroup[]>(cfg, "flowb_groups", {
      select: "id,name,emoji,join_mode",
      id: `eq.${groupId}`,
      limit: "1",
    });

    if (!groups?.length) return "Crew not found.";
    const group = groups[0];

    if (group.join_mode === "closed") {
      return "This crew is closed to new members.";
    }

    if (group.join_mode === "open") {
      // Open mode - join directly
      await sbInsert(cfg, "flowb_group_members", {
        group_id: group.id,
        user_id: uid,
        role: "member",
      });
      return `**Welcome to ${group.emoji} ${group.name}!**`;
    }

    // Check if already a member
    const existing = await sbQuery<any[]>(cfg, "flowb_group_members", {
      select: "user_id",
      group_id: `eq.${groupId}`,
      user_id: `eq.${uid}`,
      limit: "1",
    });

    if (existing?.length) {
      return `You're already in ${group.emoji} ${group.name}!`;
    }

    // Check for existing pending request
    const existingRequest = await sbQuery<JoinRequest[]>(cfg, "flowb_crew_join_requests", {
      select: "id,status",
      group_id: `eq.${groupId}`,
      user_id: `eq.${uid}`,
      status: "eq.pending",
      limit: "1",
    });

    if (existingRequest?.length) {
      return `You already have a pending request for ${group.emoji} ${group.name}. Hang tight!`;
    }

    // Create join request
    const request = await sbInsert<JoinRequest>(cfg, "flowb_crew_join_requests", {
      group_id: groupId,
      user_id: uid,
      status: "pending",
    });

    if (!request) return "Failed to submit request. Try again.";

    return JSON.stringify({
      type: "join_request_created",
      requestId: request.id,
      groupId: group.id,
      groupName: group.name,
      groupEmoji: group.emoji,
      userId: uid,
    });
  }

  /**
   * Approve a pending join request (creator/admin).
   */
  async crewApprove(cfg: FlowPluginConfig, uid?: string, input?: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";
    const requestId = input?.referral_code; // reuse field for request ID
    if (!requestId) return "Request ID required.";

    // Get the request
    const requests = await sbQuery<JoinRequest[]>(cfg, "flowb_crew_join_requests", {
      select: "id,group_id,user_id,status",
      id: `eq.${requestId}`,
      limit: "1",
    });

    if (!requests?.length) return "Request not found.";
    const request = requests[0];

    if (request.status !== "pending") {
      return `This request has already been ${request.status}.`;
    }

    // Check caller permission
    if (!await this.hasCrewPermission(cfg, uid, request.group_id, "admin")) {
      return "Only crew creators and admins can approve requests.";
    }

    // Approve: update request + add member
    await sbPatch(cfg, "flowb_crew_join_requests", { id: `eq.${requestId}` }, {
      status: "approved",
      reviewed_by: uid,
      reviewed_at: new Date().toISOString(),
    });

    await sbInsert(cfg, "flowb_group_members", {
      group_id: request.group_id,
      user_id: request.user_id,
      role: "member",
    });

    // Get group info for response
    const groups = await sbQuery<FlowGroup[]>(cfg, "flowb_groups", {
      select: "name,emoji",
      id: `eq.${request.group_id}`,
      limit: "1",
    });

    const groupName = groups?.[0] ? `${groups[0].emoji} ${groups[0].name}` : "the crew";

    return JSON.stringify({
      type: "join_request_approved",
      requestId: request.id,
      groupId: request.group_id,
      userId: request.user_id,
      groupName,
    });
  }

  /**
   * Deny a pending join request (creator/admin).
   */
  async crewDeny(cfg: FlowPluginConfig, uid?: string, input?: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";
    const requestId = input?.referral_code;
    if (!requestId) return "Request ID required.";

    const requests = await sbQuery<JoinRequest[]>(cfg, "flowb_crew_join_requests", {
      select: "id,group_id,user_id,status",
      id: `eq.${requestId}`,
      limit: "1",
    });

    if (!requests?.length) return "Request not found.";
    const request = requests[0];

    if (request.status !== "pending") {
      return `This request has already been ${request.status}.`;
    }

    if (!await this.hasCrewPermission(cfg, uid, request.group_id, "admin")) {
      return "Only crew creators and admins can deny requests.";
    }

    await sbPatch(cfg, "flowb_crew_join_requests", { id: `eq.${requestId}` }, {
      status: "denied",
      reviewed_by: uid,
      reviewed_at: new Date().toISOString(),
    });

    const groups = await sbQuery<FlowGroup[]>(cfg, "flowb_groups", {
      select: "name,emoji",
      id: `eq.${request.group_id}`,
      limit: "1",
    });

    const groupName = groups?.[0] ? `${groups[0].emoji} ${groups[0].name}` : "the crew";

    return JSON.stringify({
      type: "join_request_denied",
      requestId: request.id,
      groupId: request.group_id,
      userId: request.user_id,
      groupName,
    });
  }

  /**
   * Promote a member to admin (creator only).
   */
  async crewPromote(cfg: FlowPluginConfig, uid?: string, groupId?: string, targetId?: string): Promise<string> {
    if (!uid) return "User ID required.";
    if (!groupId || !targetId) return "Crew ID and member ID required.";

    if (!await this.hasCrewPermission(cfg, uid, groupId, "creator")) {
      return "Only the crew creator can promote members.";
    }

    // Check target is a member
    const target = await sbQuery<any[]>(cfg, "flowb_group_members", {
      select: "role",
      group_id: `eq.${groupId}`,
      user_id: `eq.${targetId}`,
      limit: "1",
    });

    if (!target?.length) return "That person isn't in this crew.";
    if (target[0].role === "creator") return "Can't change the creator's role.";
    if (target[0].role === "admin") return "They're already an admin.";

    await sbPatch(cfg, "flowb_group_members", {
      group_id: `eq.${groupId}`,
      user_id: `eq.${targetId}`,
    }, { role: "admin" });

    return `Promoted ${targetId.replace("telegram_", "@")} to admin.`;
  }

  /**
   * Demote an admin to member (creator only).
   */
  async crewDemote(cfg: FlowPluginConfig, uid?: string, groupId?: string, targetId?: string): Promise<string> {
    if (!uid) return "User ID required.";
    if (!groupId || !targetId) return "Crew ID and member ID required.";

    if (!await this.hasCrewPermission(cfg, uid, groupId, "creator")) {
      return "Only the crew creator can demote admins.";
    }

    const target = await sbQuery<any[]>(cfg, "flowb_group_members", {
      select: "role",
      group_id: `eq.${groupId}`,
      user_id: `eq.${targetId}`,
      limit: "1",
    });

    if (!target?.length) return "That person isn't in this crew.";
    if (target[0].role === "creator") return "Can't change the creator's role.";
    if (target[0].role === "member") return "They're already a member.";

    await sbPatch(cfg, "flowb_group_members", {
      group_id: `eq.${groupId}`,
      user_id: `eq.${targetId}`,
    }, { role: "member" });

    return `Demoted ${targetId.replace("telegram_", "@")} to member.`;
  }

  /**
   * Generate a personal tracked invite link (alias for crewInvite).
   */
  async crewPersonalInvite(cfg: FlowPluginConfig, uid?: string, groupId?: string): Promise<string> {
    return this.crewInvite(cfg, uid, groupId);
  }

  // ==========================================================================
  // Crew Permission Helpers
  // ==========================================================================

  /**
   * Check if user has >= minRole in a crew.
   * Role hierarchy: creator > admin > member
   */
  async hasCrewPermission(cfg: FlowPluginConfig, uid: string, groupId: string, minRole: "member" | "admin" | "creator"): Promise<boolean> {
    const membership = await sbQuery<any[]>(cfg, "flowb_group_members", {
      select: "role",
      group_id: `eq.${groupId}`,
      user_id: `eq.${uid}`,
      limit: "1",
    });

    if (!membership?.length) return false;

    const roleLevel: Record<string, number> = { member: 1, admin: 2, creator: 3 };
    const userLevel = roleLevel[membership[0].role] || 0;
    const requiredLevel = roleLevel[minRole] || 0;

    return userLevel >= requiredLevel;
  }

  /**
   * Get all creators + admins of a crew (for DM notifications).
   */
  async getCrewAdmins(cfg: FlowPluginConfig, groupId: string): Promise<string[]> {
    const members = await sbQuery<any[]>(cfg, "flowb_group_members", {
      select: "user_id,role",
      group_id: `eq.${groupId}`,
    });

    return (members || [])
      .filter((m: any) => m.role === "creator" || m.role === "admin")
      .map((m: any) => m.user_id);
  }

  /**
   * Get a user's role in a crew. Returns null if not a member.
   */
  async getCrewRole(cfg: FlowPluginConfig, uid: string, groupId: string): Promise<string | null> {
    const membership = await sbQuery<any[]>(cfg, "flowb_group_members", {
      select: "role",
      group_id: `eq.${groupId}`,
      user_id: `eq.${uid}`,
      limit: "1",
    });

    return membership?.[0]?.role || null;
  }

  /**
   * Get pending join requests for a crew.
   */
  async getPendingRequests(cfg: FlowPluginConfig, groupId: string): Promise<JoinRequest[]> {
    const requests = await sbQuery<JoinRequest[]>(cfg, "flowb_crew_join_requests", {
      select: "*",
      group_id: `eq.${groupId}`,
      status: "eq.pending",
      order: "requested_at.asc",
    });

    return requests || [];
  }

  // ==========================================================================
  // Event Attendance
  // ==========================================================================

  /**
   * RSVP to an event. Creates or updates attendance record.
   */
  async rsvp(cfg: FlowPluginConfig, uid?: string, input?: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";
    const eventId = input?.event_id;
    if (!eventId) return "Event ID required.";

    const status = input?.query === "maybe" ? "maybe" : "going";

    await sbUpsert(cfg, "flowb_event_attendance", {
      user_id: uid,
      event_id: eventId,
      event_name: input?.event_id ? undefined : null, // preserve existing name
      status,
      visibility: "friends",
      updated_at: new Date().toISOString(),
    }, "user_id,event_id");

    const emoji = status === "going" ? "You're going!" : "Marked as maybe.";
    return `**${emoji}** Your flow will see this in their feed.`;
  }

  /**
   * RSVP with full event metadata (called by bot with event details).
   */
  async rsvpWithDetails(
    cfg: FlowPluginConfig,
    uid: string,
    eventId: string,
    eventName: string,
    eventDate: string | null,
    eventVenue: string | null,
    status: "going" | "maybe" = "going",
  ): Promise<EventAttendance | null> {
    return sbUpsert<EventAttendance>(cfg, "flowb_event_attendance", {
      user_id: uid,
      event_id: eventId,
      event_name: eventName,
      event_date: eventDate,
      event_venue: eventVenue,
      status,
      visibility: "friends",
      updated_at: new Date().toISOString(),
    }, "user_id,event_id");
  }

  /**
   * Cancel RSVP (delete the attendance record).
   */
  async cancelRsvp(cfg: FlowPluginConfig, uid?: string, input?: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";
    const eventId = input?.event_id;
    if (!eventId) return "Event ID required.";

    await sbDelete(cfg, "flowb_event_attendance", {
      user_id: `eq.${uid}`,
      event_id: `eq.${eventId}`,
    });

    return "RSVP cancelled.";
  }

  /**
   * See which flow friends and crew members are going to upcoming events.
   */
  async whosGoing(cfg: FlowPluginConfig, uid?: string, input?: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";

    // If event_id provided, show who's going to that specific event
    if (input?.event_id) {
      return this.whosGoingToEvent(cfg, uid, input.event_id);
    }

    // Otherwise show all upcoming RSVPs from flow
    return this.whosGoingUpcoming(cfg, uid);
  }

  private async whosGoingToEvent(cfg: FlowPluginConfig, uid: string, eventId: string): Promise<string> {
    // Get all friends
    const friendIds = await this.getFriendIds(cfg, uid);

    // Get all crew member IDs
    const crewMemberIds = await this.getCrewMemberIds(cfg, uid);

    // Combine unique IDs (exclude self)
    const flowIds = [...new Set([...friendIds, ...crewMemberIds])].filter((id) => id !== uid);

    if (!flowIds.length) {
      return "No one in your flow yet. Use /share to connect with friends!";
    }

    // Query attendance for this event from flow members
    const attendance = await sbQuery<EventAttendance[]>(cfg, "flowb_event_attendance", {
      select: "user_id,status,event_name",
      event_id: `eq.${eventId}`,
      user_id: `in.(${flowIds.join(",")})`,
      status: "in.(going,maybe)",
    });

    if (!attendance?.length) {
      return "None of your flow is going to this event yet. Be the first!";
    }

    const going = attendance.filter((a) => a.status === "going");
    const maybe = attendance.filter((a) => a.status === "maybe");
    const eventName = attendance[0].event_name || "this event";

    const allIds = attendance.map((a) => a.user_id);
    const nameMap = await this.resolveNames(cfg, allIds);

    const lines = [`**Who's going to ${eventName}?**\n`];

    if (going.length) {
      lines.push(`**Going** (${going.length})`);
      for (const a of going) {
        lines.push(`  ${this.displayName(nameMap, a.user_id)}`);
      }
    }

    if (maybe.length) {
      lines.push(`\n**Maybe** (${maybe.length})`);
      for (const a of maybe) {
        lines.push(`  ${this.displayName(nameMap, a.user_id)}`);
      }
    }

    return lines.join("\n");
  }

  private async whosGoingUpcoming(cfg: FlowPluginConfig, uid: string): Promise<string> {
    const friendIds = await this.getFriendIds(cfg, uid);
    const crewMemberIds = await this.getCrewMemberIds(cfg, uid);
    const flowIds = [...new Set([...friendIds, ...crewMemberIds])].filter((id) => id !== uid);

    if (!flowIds.length) {
      return "No one in your flow yet. Use /share to connect with friends!";
    }

    // Get upcoming RSVPs from flow members
    const now = new Date().toISOString();
    const attendance = await sbQuery<EventAttendance[]>(cfg, "flowb_event_attendance", {
      select: "user_id,event_id,event_name,event_date,event_venue,status",
      user_id: `in.(${flowIds.join(",")})`,
      status: "in.(going,maybe)",
      event_date: `gte.${now}`,
      order: "event_date.asc",
      limit: "20",
    });

    if (!attendance?.length) {
      return "**Your Flow's Schedule**\n\nNo upcoming RSVPs from your flow. You could be the trendsetter!";
    }

    const allIds = attendance.map((a) => a.user_id);
    const nameMap = await this.resolveNames(cfg, allIds);

    // Group by event
    const byEvent = new Map<string, { name: string; date: string | null; venue: string | null; going: string[]; maybe: string[] }>();
    for (const a of attendance) {
      const key = a.event_id;
      if (!byEvent.has(key)) {
        byEvent.set(key, {
          name: a.event_name || a.event_id.slice(0, 8),
          date: a.event_date,
          venue: a.event_venue,
          going: [],
          maybe: [],
        });
      }
      const entry = byEvent.get(key)!;
      const dn = this.displayName(nameMap, a.user_id);
      if (a.status === "going") entry.going.push(dn);
      else entry.maybe.push(dn);
    }

    const lines = ["**Your Flow's Schedule**\n"];
    for (const [, event] of byEvent) {
      const dateStr = event.date
        ? new Date(event.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
        : "";
      lines.push(`**${event.name}**${dateStr ? ` - ${dateStr}` : ""}`);
      if (event.venue) lines.push(`  ${event.venue}`);
      const people = [...event.going.map((n) => n), ...event.maybe.map((n) => `${n} (maybe)`)];
      lines.push(`  ${people.join(", ")}`);
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Show the user's own upcoming RSVPs.
   */
  async mySchedule(cfg: FlowPluginConfig, uid?: string): Promise<string> {
    if (!uid) return "User ID required.";

    const now = new Date().toISOString();
    const attendance = await sbQuery<EventAttendance[]>(cfg, "flowb_event_attendance", {
      select: "event_id,event_name,event_date,event_venue,status",
      user_id: `eq.${uid}`,
      status: "in.(going,maybe)",
      order: "event_date.asc",
      limit: "20",
    });

    if (!attendance?.length) {
      return "**My Schedule**\n\nNo upcoming RSVPs. Browse events and tap 'Going' to add to your schedule!";
    }

    const lines = ["**My Schedule**\n"];
    for (const a of attendance) {
      const dateStr = a.event_date
        ? new Date(a.event_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
        : "";
      const statusTag = a.status === "maybe" ? " (maybe)" : "";
      lines.push(`**${a.event_name || a.event_id.slice(0, 8)}**${statusTag}`);
      if (dateStr) lines.push(`  ${dateStr}`);
      if (a.event_venue) lines.push(`  ${a.event_venue}`);
      lines.push("");
    }

    return lines.join("\n");
  }

  // ==========================================================================
  // Notification Helpers (called by bot for DM logic)
  // ==========================================================================

  /**
   * Get list of flow members who should be notified about a user's RSVP.
   * Checks dedup log to avoid re-notifying.
   * Returns list of user IDs to DM + the event context.
   */
  async getNotifyTargets(cfg: FlowPluginConfig, uid?: string, input?: ToolInput): Promise<string> {
    if (!uid || !input?.event_id) return "{}";

    const targets = await this.computeNotifyTargets(cfg, uid, input.event_id);
    return JSON.stringify(targets);
  }

  /**
   * Compute who to notify when a user RSVPs.
   * Returns { friends: string[], crewMembers: { groupName: string, userIds: string[] }[] }
   */
  async computeNotifyTargets(
    cfg: FlowPluginConfig,
    uid: string,
    eventId: string,
  ): Promise<{
    friends: string[];
    crews: { groupName: string; groupEmoji: string; userIds: string[] }[];
  }> {
    // Get friends (non-muted active connections)
    const friends = await sbQuery<Connection[]>(cfg, "flowb_connections", {
      select: "friend_id",
      user_id: `eq.${uid}`,
      status: "eq.active",
    });
    const friendIds = (friends || []).map((f) => f.friend_id);

    // Get crews this user is in
    const memberships = await sbQuery<any[]>(cfg, "flowb_group_members", {
      select: "group_id,flowb_groups(name,emoji)",
      user_id: `eq.${uid}`,
      muted: "eq.false",
    });

    const crewResults: { groupName: string; groupEmoji: string; userIds: string[] }[] = [];
    const allCrewMemberIds = new Set<string>();

    for (const m of memberships || []) {
      if (!m.flowb_groups) continue;

      // Get other members of this crew (non-muted)
      const members = await sbQuery<any[]>(cfg, "flowb_group_members", {
        select: "user_id",
        group_id: `eq.${m.group_id}`,
        muted: "eq.false",
      });

      const otherMembers = (members || [])
        .map((mem: any) => mem.user_id)
        .filter((id: string) => id !== uid);

      if (otherMembers.length) {
        crewResults.push({
          groupName: m.flowb_groups.name,
          groupEmoji: m.flowb_groups.emoji,
          userIds: otherMembers,
        });
        otherMembers.forEach((id: string) => allCrewMemberIds.add(id));
      }
    }

    // Filter friends: exclude those who are also crew members (to avoid double-notifying)
    // Actually, keep them separate - the bot can deduplicate per-recipient
    // But DO check the notification log for dedup
    const allTargetIds = [...new Set([...friendIds, ...allCrewMemberIds])];

    if (allTargetIds.length) {
      // Check which ones were already notified about this event by this user
      const alreadyNotified = await sbQuery<any[]>(cfg, "flowb_notification_log", {
        select: "recipient_id",
        triggered_by: `eq.${uid}`,
        reference_id: `eq.${eventId}`,
        notification_type: "in.(friend_rsvp,crew_rsvp)",
      });

      const notifiedSet = new Set((alreadyNotified || []).map((n: any) => n.recipient_id));

      // Filter out already-notified
      const filteredFriends = friendIds.filter((id) => !notifiedSet.has(id));
      const filteredCrews = crewResults.map((crew) => ({
        ...crew,
        userIds: crew.userIds.filter((id) => !notifiedSet.has(id)),
      })).filter((crew) => crew.userIds.length > 0);

      return { friends: filteredFriends, crews: filteredCrews };
    }

    return { friends: [], crews: [] };
  }

  /**
   * Log a notification as sent (for dedup).
   */
  async logNotification(
    cfg: FlowPluginConfig,
    recipientId: string,
    type: "friend_rsvp" | "crew_rsvp" | "checkin" | "crew_broadcast",
    referenceId: string,
    triggeredBy: string,
  ): Promise<void> {
    // Use upsert with the dedup index to silently skip duplicates
    await fetch(`${cfg.supabaseUrl}/rest/v1/flowb_notification_log?on_conflict=recipient_id,notification_type,reference_id,triggered_by`, {
      method: "POST",
      headers: {
        apikey: cfg.supabaseKey,
        Authorization: `Bearer ${cfg.supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal,resolution=merge-duplicates",
      },
      body: JSON.stringify({
        recipient_id: recipientId,
        notification_type: type,
        reference_id: referenceId,
        triggered_by: triggeredBy,
      }),
    });
  }

  /**
   * Check if any flow friends are also going to a specific event.
   * Used by the bot to show "3 of your flow are going" on event cards.
   */
  async getFlowAttendanceForEvent(
    cfg: FlowPluginConfig,
    uid: string,
    eventId: string,
  ): Promise<{ going: string[]; maybe: string[] }> {
    const friendIds = await this.getFriendIds(cfg, uid);
    const crewMemberIds = await this.getCrewMemberIds(cfg, uid);
    const flowIds = [...new Set([...friendIds, ...crewMemberIds])].filter((id) => id !== uid);

    if (!flowIds.length) return { going: [], maybe: [] };

    const attendance = await sbQuery<EventAttendance[]>(cfg, "flowb_event_attendance", {
      select: "user_id,status",
      event_id: `eq.${eventId}`,
      user_id: `in.(${flowIds.join(",")})`,
      status: "in.(going,maybe)",
    });

    const going = (attendance || []).filter((a) => a.status === "going").map((a) => a.user_id);
    const maybe = (attendance || []).filter((a) => a.status === "maybe").map((a) => a.user_id);

    return { going, maybe };
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Get all active friend IDs for a user (non-muted).
   */
  private async getFriendIds(cfg: FlowPluginConfig, uid: string): Promise<string[]> {
    const friends = await sbQuery<Connection[]>(cfg, "flowb_connections", {
      select: "friend_id",
      user_id: `eq.${uid}`,
      status: "eq.active",
    });
    return (friends || []).map((f) => f.friend_id);
  }

  /**
   * Get all crew member IDs across all crews the user is in (non-muted memberships).
   */
  private async getCrewMemberIds(cfg: FlowPluginConfig, uid: string): Promise<string[]> {
    // Get crews this user is in
    const memberships = await sbQuery<any[]>(cfg, "flowb_group_members", {
      select: "group_id",
      user_id: `eq.${uid}`,
      muted: "eq.false",
    });

    if (!memberships?.length) return [];

    const groupIds = memberships.map((m) => m.group_id);

    // Get all members of those crews
    const allMembers = await sbQuery<any[]>(cfg, "flowb_group_members", {
      select: "user_id",
      group_id: `in.(${groupIds.join(",")})`,
    });

    return [...new Set((allMembers || []).map((m: any) => m.user_id))];
  }

  /** Resolve user IDs to display names via flowb_sessions table */
  private async resolveNames(cfg: FlowPluginConfig, userIds: string[]): Promise<Map<string, string>> {
    const nameMap = new Map<string, string>();
    if (!userIds.length) return nameMap;
    const sessions = await sbQuery<{ user_id: string; danz_username: string }[]>(cfg, "flowb_sessions", {
      select: "user_id,danz_username",
      user_id: `in.(${userIds.join(",")})`,
    });
    for (const s of sessions || []) {
      if (s.danz_username) nameMap.set(s.user_id, s.danz_username);
    }
    return nameMap;
  }

  /** Get clickable display name for a user ID (markdown link to Telegram profile) */
  private displayName(nameMap: Map<string, string>, uid: string): string {
    const name = nameMap.get(uid) || uid.replace("telegram_", "@");
    const tgId = uid.replace("telegram_", "");
    // tg://user?id= links open the user's Telegram profile
    return `[${name}](tg://user?id=${tgId})`;
  }
}
