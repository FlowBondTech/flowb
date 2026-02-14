/**
 * Points Plugin for FlowB
 *
 * Cross-platform gamification: points, streaks, referrals, milestones.
 * Uses existing flowb_user_points and flowb_points_ledger Supabase tables.
 */

import type {
  FlowBPlugin,
  FlowBContext,
  ToolInput,
  PointsPluginConfig,
} from "../../core/types.js";

// ============================================================================
// Point Values
// ============================================================================

const POINT_VALUES: Record<string, { points: number; dailyCap: number; once?: boolean }> = {
  message_sent:          { points: 1,   dailyCap: 50 },
  events_viewed:         { points: 2,   dailyCap: 20 },
  event_saved:           { points: 3,   dailyCap: 30 },
  search:                { points: 2,   dailyCap: 20 },
  challenge_viewed:      { points: 1,   dailyCap: 10 },
  verification_complete: { points: 25,  dailyCap: 25, once: true },
  social_linked:         { points: 10,  dailyCap: 50 },
  referral_click:        { points: 3,   dailyCap: 30 },
  referral_signup:       { points: 10,  dailyCap: 50 },
  daily_login:           { points: 5,   dailyCap: 5,  once: true },
  streak_3:              { points: 10,  dailyCap: 10, once: true },
  streak_7:              { points: 25,  dailyCap: 25, once: true },
  streak_30:             { points: 100, dailyCap: 100, once: true },
  // Trading & battle activity
  trade_executed:        { points: 10,  dailyCap: 50 },
  price_checked:         { points: 1,   dailyCap: 10 },
  portfolio_viewed:      { points: 2,   dailyCap: 10 },
  battle_created:        { points: 15,  dailyCap: 30 },
  battle_joined:         { points: 10,  dailyCap: 50 },
  battle_won:            { points: 50,  dailyCap: 200 },
  battle_participated:   { points: 5,   dailyCap: 25 },
  // Flow & social
  flow_invite_sent:      { points: 2,   dailyCap: 20 },
  flow_accepted:         { points: 15,  dailyCap: 30 },
  crew_created:          { points: 20,  dailyCap: 20, once: true },
  crew_joined:           { points: 10,  dailyCap: 30 },
  crew_invite_sent:      { points: 3,   dailyCap: 15 },
  event_rsvp:            { points: 5,   dailyCap: 25 },
  friend_meetup:         { points: 10,  dailyCap: 30 },
  crew_meetup:           { points: 15,  dailyCap: 30 },
  // Crew invite rewards (tiered by role)
  crew_invite_sent_member:    { points: 2,  dailyCap: 20 },
  crew_invite_sent_admin:     { points: 1,  dailyCap: 10 },
  crew_invite_converted:      { points: 8,  dailyCap: 40 },
  crew_invite_converted_admin: { points: 3, dailyCap: 15 },
  crew_request_approved:      { points: 5,  dailyCap: 25 },
  // Group & channel activity
  group_joined:          { points: 15,  dailyCap: 15, once: true },
  group_message:         { points: 1,   dailyCap: 30 },
  group_reply:           { points: 2,   dailyCap: 20 },
  channel_reaction:      { points: 1,   dailyCap: 20 },
};

const MILESTONES = [
  { level: 1, threshold: 0,    title: "Explorer" },
  { level: 2, threshold: 50,   title: "Mover" },
  { level: 3, threshold: 150,  title: "Groover" },
  { level: 4, threshold: 500,  title: "Dancer" },
  { level: 5, threshold: 1000, title: "Star" },
  { level: 6, threshold: 2500, title: "Legend" },
];

// ============================================================================
// Supabase Helpers (reused pattern from DANZ plugin)
// ============================================================================

async function sbQuery<T>(cfg: PointsPluginConfig, table: string, params: Record<string, string>): Promise<T | null> {
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

async function sbInsert<T>(cfg: PointsPluginConfig, table: string, data: Record<string, any>): Promise<T | null> {
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

async function sbPatch(cfg: PointsPluginConfig, table: string, filter: Record<string, string>, data: Record<string, any>): Promise<void> {
  const url = new URL(`${cfg.supabaseUrl}/rest/v1/${table}`);
  Object.entries(filter).forEach(([k, v]) => url.searchParams.set(k, v));
  await fetch(url.toString(), {
    method: "PATCH",
    headers: {
      apikey: cfg.supabaseKey,
      Authorization: `Bearer ${cfg.supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(data),
  });
}

// ============================================================================
// Points Plugin
// ============================================================================

export class PointsPlugin implements FlowBPlugin {
  id = "points";
  name = "FlowB Points";
  description = "Earn points for every interaction, build streaks, unlock rewards";

  actions = {
    "my-points":      { description: "Check your points balance and streak" },
    "my-referral":    { description: "Get your referral link to share" },
    "points-history": { description: "View recent points activity" },
  };

  private config: PointsPluginConfig | null = null;

  configure(config: PointsPluginConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!(this.config?.supabaseUrl && this.config?.supabaseKey);
  }

  async execute(action: string, input: ToolInput, context: FlowBContext): Promise<string> {
    if (!this.config) return "Points not configured.";
    const userId = input.user_id;
    const platform = input.platform || "api";

    switch (action) {
      case "my-points":
        return this.getBalanceFormatted(this.config, userId, platform);
      case "my-referral":
        return this.getReferralFormatted(this.config, userId, platform);
      case "points-history":
        return this.getHistoryFormatted(this.config, userId, platform);
      default:
        return `Unknown points action: ${action}`;
    }
  }

  // ==========================================================================
  // Public methods (called by bot and other plugins)
  // ==========================================================================

  async awardPoints(
    cfg: PointsPluginConfig,
    userId: string,
    platform: string,
    action: string,
    metadata?: Record<string, any>,
  ): Promise<{ awarded: boolean; points: number; total: number }> {
    const def = POINT_VALUES[action];
    if (!def) return { awarded: false, points: 0, total: 0 };

    // Ensure user row exists
    let rows = await sbQuery<any[]>(cfg, "flowb_user_points", {
      select: "total_points,first_actions",
      user_id: `eq.${userId}`,
      platform: `eq.${platform}`,
      limit: "1",
    });

    if (!rows?.length) {
      await sbInsert(cfg, "flowb_user_points", {
        user_id: userId,
        platform,
        total_points: 0,
        current_streak: 0,
        longest_streak: 0,
        first_actions: {},
        milestone_level: 0,
      });
      rows = [{ total_points: 0, first_actions: {} }];
    }

    const current = rows[0];

    // Check "once" actions
    if (def.once) {
      const firstActions = current.first_actions || {};
      if (firstActions[action]) {
        return { awarded: false, points: 0, total: current.total_points || 0 };
      }
    }

    // Check daily cap
    const today = new Date().toISOString().slice(0, 10);
    const todayLedger = await sbQuery<any[]>(cfg, "flowb_points_ledger", {
      select: "points",
      user_id: `eq.${userId}`,
      platform: `eq.${platform}`,
      action: `eq.${action}`,
      created_at: `gte.${today}T00:00:00Z`,
    });

    const todayTotal = (todayLedger || []).reduce((sum: number, e: any) => sum + (e.points || 0), 0);
    if (todayTotal >= def.dailyCap) {
      return { awarded: false, points: 0, total: current.total_points || 0 };
    }

    const pts = Math.min(def.points, def.dailyCap - todayTotal);

    // Insert ledger entry
    await sbInsert(cfg, "flowb_points_ledger", {
      user_id: userId,
      platform,
      action,
      points: pts,
      metadata: metadata || {},
    });

    // Update total + mark first action if once
    const newTotal = (current.total_points || 0) + pts;
    const updateData: Record<string, any> = {
      total_points: newTotal,
      updated_at: new Date().toISOString(),
    };

    if (def.once) {
      const firstActions = { ...(current.first_actions || {}), [action]: true };
      updateData.first_actions = firstActions;
    }

    // Check milestone level
    const newLevel = MILESTONES.filter((m) => newTotal >= m.threshold).pop();
    if (newLevel) {
      updateData.milestone_level = newLevel.level;
    }

    await sbPatch(cfg, "flowb_user_points", {
      user_id: `eq.${userId}`,
      platform: `eq.${platform}`,
    }, updateData);

    return { awarded: true, points: pts, total: newTotal };
  }

  async updateStreak(
    cfg: PointsPluginConfig,
    userId: string,
    platform: string,
  ): Promise<{ streak: number; bonus: number }> {
    const rows = await sbQuery<any[]>(cfg, "flowb_user_points", {
      select: "current_streak,longest_streak,last_active_date",
      user_id: `eq.${userId}`,
      platform: `eq.${platform}`,
      limit: "1",
    });

    if (!rows?.length) return { streak: 0, bonus: 0 };

    const user = rows[0];
    const today = new Date().toISOString().slice(0, 10);
    const lastActive = user.last_active_date;

    if (lastActive === today) {
      return { streak: user.current_streak || 0, bonus: 0 };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    let newStreak: number;
    if (lastActive === yesterdayStr) {
      newStreak = (user.current_streak || 0) + 1;
    } else {
      newStreak = 1;
    }

    const longestStreak = Math.max(newStreak, user.longest_streak || 0);

    await sbPatch(cfg, "flowb_user_points", {
      user_id: `eq.${userId}`,
      platform: `eq.${platform}`,
    }, {
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_active_date: today,
    });

    // Award streak bonuses
    let bonus = 0;
    if (newStreak === 3) {
      const r = await this.awardPoints(cfg, userId, platform, "streak_3");
      bonus = r.points;
    } else if (newStreak === 7) {
      const r = await this.awardPoints(cfg, userId, platform, "streak_7");
      bonus = r.points;
    } else if (newStreak === 30) {
      const r = await this.awardPoints(cfg, userId, platform, "streak_30");
      bonus = r.points;
    }

    // Award daily login
    const loginResult = await this.awardPoints(cfg, userId, platform, "daily_login");
    bonus += loginResult.points;

    return { streak: newStreak, bonus };
  }

  async getReferralCode(
    cfg: PointsPluginConfig,
    userId: string,
    platform: string,
  ): Promise<string> {
    const rows = await sbQuery<any[]>(cfg, "flowb_user_points", {
      select: "referral_code",
      user_id: `eq.${userId}`,
      platform: `eq.${platform}`,
      limit: "1",
    });

    if (rows?.length && rows[0].referral_code) {
      return rows[0].referral_code;
    }

    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    await sbPatch(cfg, "flowb_user_points", {
      user_id: `eq.${userId}`,
      platform: `eq.${platform}`,
    }, { referral_code: code });

    return code;
  }

  // ==========================================================================
  // Formatted responses
  // ==========================================================================

  private async getBalanceFormatted(cfg: PointsPluginConfig, userId?: string, platform?: string): Promise<string> {
    if (!userId) return "User ID required.";

    const rows = await sbQuery<any[]>(cfg, "flowb_user_points", {
      select: "total_points,current_streak,longest_streak,milestone_level",
      user_id: `eq.${userId}`,
      platform: `eq.${platform || "api"}`,
      limit: "1",
    });

    if (!rows?.length) {
      return "**Your FlowB Points**\n\n0 points | No streak yet\n\nInteract with the bot to start earning!";
    }

    const r = rows[0];
    const milestone = MILESTONES.find((m) => m.level === (r.milestone_level || 1)) || MILESTONES[0];
    const nextMilestone = MILESTONES.find((m) => m.threshold > (r.total_points || 0));

    const lines = [
      `**Your FlowB Points**\n`,
      `**${r.total_points || 0}** points | **${milestone.title}** (Level ${milestone.level})`,
      `Streak: ${r.current_streak || 0} days (best: ${r.longest_streak || 0})`,
    ];

    if (nextMilestone) {
      const remaining = nextMilestone.threshold - (r.total_points || 0);
      lines.push(`\nNext: **${nextMilestone.title}** in ${remaining} points`);
    }

    return lines.join("\n");
  }

  private async getReferralFormatted(cfg: PointsPluginConfig, userId?: string, platform?: string): Promise<string> {
    if (!userId) return "User ID required.";

    const code = await this.getReferralCode(cfg, userId, platform || "api");
    const botUsername = process.env.FLOWB_BOT_USERNAME || "flow_b_bot";
    return `**Your Referral Link**\n\nShare this with friends:\nhttps://t.me/${botUsername}?start=ref_${code}\n\nYou earn **+3 pts** per click, **+10 pts** per signup!`;
  }

  private async getHistoryFormatted(cfg: PointsPluginConfig, userId?: string, platform?: string): Promise<string> {
    if (!userId) return "User ID required.";

    const ledger = await sbQuery<any[]>(cfg, "flowb_points_ledger", {
      select: "action,points,created_at",
      user_id: `eq.${userId}`,
      platform: `eq.${platform || "api"}`,
      order: "created_at.desc",
      limit: "15",
    });

    if (!ledger?.length) {
      return "**Points History**\n\nNo activity yet. Start using the bot to earn points!";
    }

    const lines = ["**Recent Points Activity**\n"];
    for (const entry of ledger) {
      const date = new Date(entry.created_at).toLocaleDateString("en-US", {
        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      });
      const action = entry.action.replace(/_/g, " ");
      lines.push(`${date} | +${entry.points} | ${action}`);
    }

    return lines.join("\n");
  }
}
