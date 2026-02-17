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
  event_link_shared:     { points: 8,   dailyCap: 40 },
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
  chatter_signal:        { points: 5,   dailyCap: 25 },
  // EthDenver mini app & event actions
  event_checkin:         { points: 5,   dailyCap: 25 },
  onboarding_complete:   { points: 10,  dailyCap: 10, once: true },
  miniapp_open:          { points: 2,   dailyCap: 10 },
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
// Exported Types (Phase 4)
// ============================================================================

export interface CrewRanking {
  id: string;
  name: string;
  emoji: string;
  totalPoints: number;
  memberCount: number;
}

export interface CrewMission {
  id: string;
  crew_id: string;
  mission_type: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  bonus_points: number;
  is_active: boolean;
  completed_at: string | null;
  progressPercentage: number;
}

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
  // Crew Leaderboard & Missions (Phase 4)
  // ==========================================================================

  /**
   * Rank all public crews by total member points.
   * Returns top 10 crews with name, emoji, total points, and member count.
   */
  async getGlobalCrewRanking(cfg: PointsPluginConfig): Promise<CrewRanking[]> {
    const crews = await sbQuery<any[]>(cfg, "flowb_groups", {
      select: "id,name,emoji",
      is_public: "eq.true",
    });

    if (!crews?.length) return [];

    const rankings: CrewRanking[] = [];

    for (const crew of crews) {
      const members = await sbQuery<any[]>(cfg, "flowb_group_members", {
        select: "user_id",
        group_id: `eq.${crew.id}`,
      });

      if (!members?.length) {
        rankings.push({
          id: crew.id,
          name: crew.name,
          emoji: crew.emoji || "",
          totalPoints: 0,
          memberCount: 0,
        });
        continue;
      }

      const userIds = members.map((m: any) => m.user_id);
      const points = await sbQuery<any[]>(cfg, "flowb_user_points", {
        select: "total_points",
        user_id: `in.(${userIds.join(",")})`,
      });

      const totalPoints = (points || []).reduce(
        (sum: number, p: any) => sum + (p.total_points || 0),
        0,
      );

      rankings.push({
        id: crew.id,
        name: crew.name,
        emoji: crew.emoji || "",
        totalPoints,
        memberCount: members.length,
      });
    }

    rankings.sort((a, b) => b.totalPoints - a.totalPoints);
    return rankings.slice(0, 10);
  }

  /**
   * Get active crew missions for a given crew.
   * Returns missions with progress percentage.
   */
  async getCrewMissions(cfg: PointsPluginConfig, crewId: string): Promise<CrewMission[]> {
    const missions = await sbQuery<any[]>(cfg, "flowb_crew_missions", {
      select: "id,crew_id,mission_type,title,description,target,progress,bonus_points,is_active,completed_at",
      crew_id: `eq.${crewId}`,
      is_active: "eq.true",
    });

    if (!missions?.length) return [];

    return missions.map((m: any) => ({
      id: m.id,
      crew_id: m.crew_id,
      mission_type: m.mission_type,
      title: m.title,
      description: m.description || "",
      target: m.target || 0,
      progress: m.progress || 0,
      bonus_points: m.bonus_points || 0,
      is_active: m.is_active,
      completed_at: m.completed_at,
      progressPercentage: m.target > 0
        ? Math.min(100, Math.round(((m.progress || 0) / m.target) * 100))
        : 0,
    }));
  }

  /**
   * Increment a mission counter for a crew.
   * If the target is reached, mark completed and award bonus points to all members.
   *
   * Supported mission types: 'checkin_count', 'group_rsvp', 'invite_count'
   */
  async updateMissionProgress(
    cfg: PointsPluginConfig,
    crewId: string,
    missionType: string,
  ): Promise<{ updated: boolean; completed: boolean; bonusAwarded: number }> {
    const missions = await sbQuery<any[]>(cfg, "flowb_crew_missions", {
      select: "id,target,progress,bonus_points",
      crew_id: `eq.${crewId}`,
      mission_type: `eq.${missionType}`,
      is_active: "eq.true",
      limit: "1",
    });

    if (!missions?.length) {
      return { updated: false, completed: false, bonusAwarded: 0 };
    }

    const mission = missions[0];
    const newProgress = (mission.progress || 0) + 1;
    const targetReached = newProgress >= (mission.target || 0);

    const updateData: Record<string, any> = {
      progress: newProgress,
      updated_at: new Date().toISOString(),
    };

    if (targetReached) {
      updateData.is_active = false;
      updateData.completed_at = new Date().toISOString();
    }

    await sbPatch(cfg, "flowb_crew_missions", {
      id: `eq.${mission.id}`,
    }, updateData);

    let bonusAwarded = 0;
    if (targetReached && mission.bonus_points > 0) {
      const members = await sbQuery<any[]>(cfg, "flowb_group_members", {
        select: "user_id",
        group_id: `eq.${crewId}`,
      });

      if (members?.length) {
        for (const member of members) {
          const userId = member.user_id;
          const platform = userId.startsWith("farcaster_") ? "farcaster" : "telegram";

          await sbInsert(cfg, "flowb_points_ledger", {
            user_id: userId,
            platform,
            action: "crew_mission_bonus",
            points: mission.bonus_points,
            metadata: { crew_id: crewId, mission_type: missionType, mission_id: mission.id },
          });

          const userRows = await sbQuery<any[]>(cfg, "flowb_user_points", {
            select: "total_points",
            user_id: `eq.${userId}`,
            limit: "1",
          });

          if (userRows?.length) {
            const newTotal = (userRows[0].total_points || 0) + mission.bonus_points;
            await sbPatch(cfg, "flowb_user_points", {
              user_id: `eq.${userId}`,
            }, {
              total_points: newTotal,
              updated_at: new Date().toISOString(),
            });
          }

          bonusAwarded += mission.bonus_points;
        }
      }
    }

    return { updated: true, completed: targetReached, bonusAwarded };
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
    const domain = process.env.FLOWB_DOMAIN;
    const link = domain
      ? `https://${domain}/ref/${code}`
      : `https://t.me/${process.env.FLOWB_BOT_USERNAME || "Flow_b_bot"}?start=ref_${code}`;
    return `**Your Referral Link**\n\nShare this with friends:\n${link}\n\nYou earn **+3 pts** per click, **+10 pts** per signup!`;
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
