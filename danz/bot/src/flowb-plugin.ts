/**
 * FlowB Plugin Adapter
 *
 * Thin adapter that implements the FlowBPlugin interface
 * so flowb can optionally import and register this plugin.
 *
 * Usage in flowb:
 *   import { DANZNowPlugin } from "../../DANZ/danznow-bot/src/flowb-plugin.js";
 *   const danzNow = new DANZNowPlugin();
 *   danzNow.configure({ supabaseUrl: ..., supabaseKey: ... });
 *   core.registerPlugin(danzNow);
 */

import { query, insert, upsert, update, initDb } from "./db.js";

export interface DANZNowPluginConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export interface FlowBPluginCompat {
  id: string;
  name: string;
  description: string;
  actions: Record<string, { description: string; requiresAuth?: boolean }>;
  configure(config: any): void;
  isConfigured(): boolean;
  execute(action: string, input: any, context: any): Promise<string>;
}

export class DANZNowPlugin implements FlowBPluginCompat {
  id = "danznow";
  name = "DANZ.Now Bot";
  description = "Dance events, challenges, stats, leaderboard - standalone bot bridge";

  actions = {
    "danz-events": { description: "Discover upcoming dance events" },
    "danz-profile": { description: "View dancer profile and stats", requiresAuth: true },
    "danz-challenges": { description: "View active challenges" },
    "danz-leaderboard": { description: "View top dancers" },
    "danz-checkin": { description: "Check in to an event", requiresAuth: true },
    "danz-bonds": { description: "View dance bonds", requiresAuth: true },
  };

  private config: DANZNowPluginConfig | null = null;

  configure(config: DANZNowPluginConfig): void {
    this.config = config;
    initDb({ supabaseUrl: config.supabaseUrl, supabaseKey: config.supabaseKey });
  }

  isConfigured(): boolean {
    return !!(this.config?.supabaseUrl && this.config?.supabaseKey);
  }

  async execute(action: string, input: any, context: any): Promise<string> {
    if (!this.config) return "DANZ.Now plugin not configured.";

    const userId = input.user_id;

    switch (action) {
      case "danz-events":
        return this.getEvents();
      case "danz-profile":
        return this.getProfile(userId);
      case "danz-challenges":
        return this.getChallenges();
      case "danz-leaderboard":
        return this.getLeaderboard();
      case "danz-checkin":
        return this.checkin(userId, input.event_id);
      case "danz-bonds":
        return this.getBonds(userId);
      default:
        return `Unknown DANZ.Now action: ${action}`;
    }
  }

  private async getEvents(): Promise<string> {
    const now = new Date().toISOString();
    const events = await query<any[]>("events", {
      select: "id,title,start_date_time,location_name,location_city,category",
      start_date_time: `gt.${now}`,
      order: "start_date_time.asc",
      limit: "10",
    });

    if (!events?.length) return "No upcoming events.";

    const lines = ["**Upcoming DANZ Events**\n"];
    for (const e of events) {
      const date = new Date(e.start_date_time).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      lines.push(`**${e.title}**`);
      lines.push(`${date} | ${e.location_name || "TBD"}${e.location_city ? `, ${e.location_city}` : ""}`);
      lines.push("");
    }
    return lines.join("\n");
  }

  private async getProfile(userId?: string): Promise<string> {
    if (!userId) return "User ID required.";

    // Try to resolve privy_id from telegram user
    const privyId = await this.resolvePrivyId(userId);
    if (!privyId) return "Connect your DANZ account first.";

    const users = await query<any[]>("users", {
      select: "username,display_name,xp,level,total_sessions,total_dance_time,current_streak,total_events_attended",
      privy_id: `eq.${privyId}`,
      limit: "1",
    });

    if (!users?.length) return "Profile not found.";

    const u = users[0];
    const name = u.username || u.display_name || "Dancer";
    return `**@${name}** | Level ${u.level || 1} | ${u.xp || 0} XP\nSessions: ${u.total_sessions || 0} | Streak: ${u.current_streak || 0}d | Events: ${u.total_events_attended || 0}`;
  }

  private async getChallenges(): Promise<string> {
    const challenges = await query<any[]>("challenges", {
      select: "title,challenge_type,xp_reward",
      is_active: "eq.true",
      limit: "10",
    });

    if (!challenges?.length) return "No active challenges.";

    const lines = ["**Active Challenges**\n"];
    for (const c of challenges) {
      lines.push(`**${c.title}** - ${c.xp_reward || 0} XP (${c.challenge_type || "DAILY"})`);
    }
    return lines.join("\n");
  }

  private async getLeaderboard(): Promise<string> {
    const users = await query<any[]>("users", {
      select: "username,display_name,xp,level",
      order: "xp.desc",
      limit: "10",
    });

    if (!users?.length) return "No leaderboard data.";

    const lines = ["**DANZ Leaderboard**\n"];
    users.forEach((u, i) => {
      const name = u.display_name || u.username || "Dancer";
      lines.push(`${i + 1}. **${name}** - Lv${u.level || 1} (${u.xp || 0} XP)`);
    });
    return lines.join("\n");
  }

  private async checkin(userId?: string, eventId?: string): Promise<string> {
    if (!userId || !eventId) return "User ID and event ID required.";

    const privyId = await this.resolvePrivyId(userId);
    if (!privyId) return "Connect your DANZ account first.";

    await upsert("event_registrations", {
      event_id: eventId,
      user_id: privyId,
      status: "attended",
      checked_in: true,
      check_in_time: new Date().toISOString(),
    }, "event_id,user_id");

    return "Checked in! +10 pts";
  }

  private async getBonds(userId?: string): Promise<string> {
    if (!userId) return "User ID required.";

    const privyId = await this.resolvePrivyId(userId);
    if (!privyId) return "Connect your DANZ account first.";

    const bonds1 = await query<any[]>("dance_bonds", {
      select: "bond_level,users!dance_bonds_user2_id_fkey(username,display_name)",
      user1_id: `eq.${privyId}`,
      order: "bond_level.desc",
      limit: "10",
    });
    const bonds2 = await query<any[]>("dance_bonds", {
      select: "bond_level,users!dance_bonds_user1_id_fkey(username,display_name)",
      user2_id: `eq.${privyId}`,
      order: "bond_level.desc",
      limit: "10",
    });

    const all = [
      ...(bonds1 || []).map((b) => ({ name: b.users?.display_name || b.users?.username || "Dancer", level: b.bond_level })),
      ...(bonds2 || []).map((b) => ({ name: b.users?.display_name || b.users?.username || "Dancer", level: b.bond_level })),
    ].sort((a, b) => b.level - a.level);

    if (!all.length) return "No dance bonds yet. Attend events to build connections!";

    const lines = [`**Dance Bonds** (${all.length})\n`];
    for (const b of all.slice(0, 10)) {
      lines.push(`**${b.name}** - Lv${b.level}`);
    }
    return lines.join("\n");
  }

  private async resolvePrivyId(userId: string): Promise<string | null> {
    // Try pending_verifications for this platform user
    const verifications = await query<any[]>("pending_verifications", {
      select: "danz_privy_id",
      platform_user_id: `eq.${userId}`,
      verified_at: "not.is.null",
      order: "verified_at.desc",
      limit: "1",
    });

    if (verifications?.length && verifications[0].danz_privy_id) {
      return verifications[0].danz_privy_id;
    }

    // Could be a privy_id directly
    const users = await query<any[]>("users", {
      select: "privy_id",
      privy_id: `eq.${userId}`,
      limit: "1",
    });
    return users?.[0]?.privy_id || null;
  }
}
