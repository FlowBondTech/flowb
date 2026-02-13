/**
 * DANZ Plugin for FlowB
 *
 * Dance events, challenges, stats, leaderboard, and user verification
 * via DANZ.Now's Supabase backend.
 */

import type {
  FlowBPlugin,
  EventProvider,
  FlowBContext,
  ToolInput,
  DANZPluginConfig,
  EventQuery,
  EventResult,
} from "../../core/types.js";

// ============================================================================
// Types
// ============================================================================

interface DANZUser {
  privy_id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  xp?: number;
  level?: number;
}

interface PendingVerification {
  id?: string;
  code: string;
  platform: string;
  platform_user_id: string;
  platform_username?: string;
  expires_at: string;
  verified_at?: string;
  danz_privy_id?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SIGNUP_POINTS = 50;
const CODE_LENGTH = 6;
const CODE_EXPIRATION_MS = 24 * 60 * 60 * 1000;
const DANZ_BASE_URL = "https://danz.now";

const REWARD_RATES: Record<string, number> = {
  DAILY: 1.00,
  WEEKLY: 5.00,
  SPECIAL: 10.00,
  EVENT: 2.00,
  STREAK: 3.00,
  SOCIAL: 1.50,
};

// Local cache for verified users
const verifiedUsers = new Map<string, {
  odId: string;
  danzUsername: string;
  danzPrivyId: string;
  verifiedAt: number;
}>();

// ============================================================================
// Supabase Helpers
// ============================================================================

async function query<T>(
  config: DANZPluginConfig,
  table: string,
  params: Record<string, string>,
): Promise<T | null> {
  if (!config.supabaseUrl || !config.supabaseKey) return null;

  const url = new URL(`${config.supabaseUrl}/rest/v1/${table}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: {
      apikey: config.supabaseKey,
      Authorization: `Bearer ${config.supabaseKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

async function insert<T>(
  config: DANZPluginConfig,
  table: string,
  data: Record<string, any>,
): Promise<T | null> {
  if (!config.supabaseUrl || !config.supabaseKey) return null;

  const res = await fetch(`${config.supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: config.supabaseKey,
      Authorization: `Bearer ${config.supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) return null;
  const result = await res.json();
  return Array.isArray(result) ? result[0] : result;
}

async function upsert<T>(
  config: DANZPluginConfig,
  table: string,
  data: Record<string, any>,
  onConflict: string,
): Promise<T | null> {
  if (!config.supabaseUrl || !config.supabaseKey) return null;

  const res = await fetch(`${config.supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: config.supabaseKey,
      Authorization: `Bearer ${config.supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation,resolution=merge-duplicates",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) return null;
  const result = await res.json();
  return Array.isArray(result) ? result[0] : result;
}

async function update<T>(
  config: DANZPluginConfig,
  table: string,
  data: Record<string, any>,
  filter: Record<string, string>,
): Promise<T | null> {
  if (!config.supabaseUrl || !config.supabaseKey) return null;

  const url = new URL(`${config.supabaseUrl}/rest/v1/${table}`);
  Object.entries(filter).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    method: "PATCH",
    headers: {
      apikey: config.supabaseKey,
      Authorization: `Bearer ${config.supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) return null;
  const result = await res.json();
  return Array.isArray(result) ? result[0] : result;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ============================================================================
// DANZ Plugin
// ============================================================================

export class DANZPlugin implements FlowBPlugin, EventProvider {
  id = "danz";
  name = "DANZ.Now";
  description = "Dance events, challenges, stats, and community";
  eventSource = "danz";

  actions = {
    signup: { description: "Get a verification link to connect your DANZ account" },
    join: { description: "Learn about DANZ.Now" },
    verify: { description: "Verify your existing DANZ account" },
    status: { description: "Check verification status" },
    stats: { description: "View your dance stats", requiresAuth: true },
    "my-events": { description: "View events you're registered for", requiresAuth: true },
    challenges: { description: "View active challenges" },
    leaderboard: { description: "View top dancers" },
    "link-wallet": { description: "Link your Base wallet for USDC rewards", requiresAuth: true },
    "claim-reward": { description: "Claim USDC reward for completed challenges", requiresAuth: true },
    "reward-history": { description: "View your USDC payout history", requiresAuth: true },
    "checkin": { description: "Check in to an event happening now", requiresAuth: true },
    "dance-proof": { description: "Submit photo proof of your dance move", requiresAuth: true },
    "dance-moves": { description: "View available dance move challenges" },
    "event-leaderboard": { description: "See who's checked in and dancing at an event" },
  };

  private config: DANZPluginConfig | null = null;

  configure(config: DANZPluginConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!(this.config?.supabaseUrl && this.config?.supabaseKey);
  }

  async execute(action: string, input: ToolInput, context: FlowBContext): Promise<string> {
    const cfg = this.config;
    if (!cfg) return "DANZ plugin not configured.";

    const userId = input.user_id;
    const platform = input.platform || "openclaw";

    switch (action) {
      case "signup":
        return this.signup(cfg, platform, userId, input.platform_username);
      case "join":
        return this.joinInfo();
      case "verify":
        return this.verify(cfg, userId, input.danz_username);
      case "status":
        return this.checkStatus(cfg, platform, userId);
      case "stats":
        return this.getStats(cfg, platform, userId);
      case "my-events":
        return this.getMyEvents(cfg, platform, userId);
      case "challenges":
        return this.getChallenges(cfg, platform, userId);
      case "leaderboard":
        return this.getLeaderboard(cfg);
      case "link-wallet":
        return this.linkWallet(cfg, platform, userId, input.wallet_address);
      case "claim-reward":
        return this.claimReward(cfg, platform, userId, input.challenge_id);
      case "reward-history":
        return this.getRewardHistory(cfg, platform, userId);
      case "checkin":
        return this.checkin(cfg, platform, userId, input.event_id);
      case "dance-proof":
        return this.danceProof(cfg, platform, userId, input.event_id, input.dance_move, input.photo_file_id);
      case "dance-moves":
        return this.listDanceMoves();
      case "event-leaderboard":
        return this.eventLeaderboard(cfg, input.event_id);
      default:
        return `Unknown DANZ action: ${action}`;
    }
  }

  // ========================================================================
  // EventProvider implementation
  // ========================================================================

  async getEvents(params: EventQuery): Promise<EventResult[]> {
    if (!this.config) return [];

    const now = new Date().toISOString();
    const queryParams: Record<string, string> = {
      select: "id,title,description,category,location_name,location_city,price_usd,is_virtual,skill_level,dance_styles,start_date_time,end_date_time",
      start_date_time: `gt.${now}`,
      order: "start_date_time.asc",
      limit: String(params.limit || 10),
    };

    if (params.city) {
      queryParams["location_city"] = `ilike.*${params.city}*`;
    }
    if (params.category) {
      queryParams["category"] = `eq.${params.category}`;
    }
    if (params.danceStyle) {
      queryParams["dance_styles"] = `cs.{${params.danceStyle}}`;
    }

    const events = await query<any[]>(this.config, "events", queryParams);
    if (!events?.length) return [];

    return events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      startTime: e.start_date_time,
      endTime: e.end_date_time,
      locationName: e.location_name,
      locationCity: e.location_city,
      price: e.price_usd,
      isFree: e.price_usd === 0 || e.price_usd === null,
      isVirtual: e.is_virtual,
      danceStyles: e.dance_styles,
      skillLevel: e.skill_level,
      source: "danz",
    }));
  }

  // ========================================================================
  // One-Time Verification (auto-hydrate from DB)
  // ========================================================================

  private async ensureVerified(
    cfg: DANZPluginConfig,
    platform: string,
    userId?: string,
  ): Promise<{ danzPrivyId: string; danzUsername: string } | null> {
    if (!userId) return null;

    const cached = verifiedUsers.get(userId);
    if (cached) return cached;

    const verifications = await query<PendingVerification[]>(cfg, "pending_verifications", {
      select: "*",
      platform_user_id: `eq.${userId}`,
      platform: `eq.${platform}`,
      verified_at: "not.is.null",
      order: "verified_at.desc",
      limit: "1",
    });

    if (!verifications?.length || !verifications[0].danz_privy_id) return null;

    const v = verifications[0];
    const users = await query<DANZUser[]>(cfg, "users", {
      select: "privy_id,username,display_name,xp,level",
      privy_id: `eq.${v.danz_privy_id}`,
      limit: "1",
    });

    const user = users?.[0];
    const username = user?.username || user?.display_name || "Dancer";

    const verified = {
      odId: userId,
      danzUsername: username,
      danzPrivyId: v.danz_privy_id!,
      verifiedAt: Date.now(),
    };
    verifiedUsers.set(userId, verified);

    return verified;
  }

  // ========================================================================
  // Signup & Verification
  // ========================================================================

  private async signup(
    cfg: DANZPluginConfig,
    platform: string,
    userId?: string,
    username?: string,
  ): Promise<string> {
    if (!userId) return "User ID is required for signup.";

    const existing = verifiedUsers.get(userId);
    if (existing) {
      return `You're already verified as **@${existing.danzUsername}** on DANZ.Now!\n\nSay "stats" to see your dance stats.`;
    }

    const pendingList = await query<PendingVerification[]>(cfg, "pending_verifications", {
      select: "*",
      platform_user_id: `eq.${userId}`,
      platform: `eq.${platform}`,
      verified_at: "is.null",
      order: "created_at.desc",
      limit: "1",
    });

    if (pendingList?.length) {
      const pending = pendingList[0];
      const expiresAt = new Date(pending.expires_at);
      if (expiresAt > new Date()) {
        const url = `${DANZ_BASE_URL}/link?code=${pending.code}`;
        const hours = Math.round((expiresAt.getTime() - Date.now()) / (60 * 60 * 1000));
        return `**You have a pending verification!**\n\nClick to complete: ${url}\n\nThis link expires in ${hours} hours.`;
      }
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRATION_MS).toISOString();

    const inserted = await insert(cfg, "pending_verifications", {
      code,
      platform,
      platform_user_id: userId,
      platform_username: username || null,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    });

    if (!inserted) return "Failed to create verification. Please try again.";

    const url = `${DANZ_BASE_URL}/link?code=${code}`;
    return `**Let's get you verified!**\n\nClick the link below to connect your DANZ.Now account:\n\n${url}\n\n**What happens next:**\n1. Click the link above\n2. Sign up or log in to DANZ.Now\n3. Your accounts will be automatically linked!\n\nThis link expires in 24 hours.`;
  }

  private joinInfo(): string {
    return `**Join DANZ.Now**\n\nThe home for dancers - find events, track your journey, earn achievements, connect with the community.\n\n**New to DANZ?** Say "signup"\n**Already have an account?** Say "verify @your-username"`;
  }

  private async verify(cfg: DANZPluginConfig, userId?: string, danzUsername?: string): Promise<string> {
    if (!userId) return "User ID is required for verification.";
    if (!danzUsername) return `Please provide your DANZ.Now username.\n\nExample: verify @yourname\n\n**Don't have an account yet?** Say "signup" to create one!`;

    const existing = verifiedUsers.get(userId);
    if (existing) {
      return `You're already verified as **@${existing.danzUsername}** on DANZ.Now!`;
    }

    const cleanUsername = danzUsername.toLowerCase().replace("@", "");
    let users = await query<DANZUser[]>(cfg, "users", {
      select: "privy_id,username,display_name,xp,level",
      username: `eq.${cleanUsername}`,
      limit: "1",
    });

    if (!users?.length) {
      users = await query<DANZUser[]>(cfg, "users", {
        select: "privy_id,username,display_name,xp,level",
        display_name: `ilike.${cleanUsername}`,
        limit: "1",
      });
    }

    if (!users?.length) {
      return `No account found for **@${cleanUsername}** on DANZ.Now.\n\nSay "signup" to create a new account.`;
    }

    const user = users[0];

    for (const [, v] of verifiedUsers) {
      if (v.danzPrivyId === user.privy_id) {
        return "This DANZ.Now account has already been verified by another user.";
      }
    }

    verifiedUsers.set(userId, {
      odId: userId,
      danzUsername: user.username || user.display_name || cleanUsername,
      danzPrivyId: user.privy_id,
      verifiedAt: Date.now(),
    });

    return `**Welcome to the dance community!**\n\nYou're now verified as **@${user.username || user.display_name}** on DANZ.Now!\n\n+${SIGNUP_POINTS} pts\n\nTry "stats" or "challenges" next!`;
  }

  private async checkStatus(cfg: DANZPluginConfig, platform: string, userId?: string): Promise<string> {
    if (!userId) return "User ID is required.";

    const cached = verifiedUsers.get(userId);
    if (cached) {
      return `You're verified as **@${cached.danzUsername}** on DANZ.Now!\n\nSay "stats" to see your dance stats.`;
    }

    const verifications = await query<PendingVerification[]>(cfg, "pending_verifications", {
      select: "*",
      platform_user_id: `eq.${userId}`,
      platform: `eq.${platform}`,
      verified_at: "not.is.null",
      order: "verified_at.desc",
      limit: "1",
    });

    if (verifications?.length && verifications[0].danz_privy_id) {
      const v = verifications[0];
      const users = await query<DANZUser[]>(cfg, "users", {
        select: "privy_id,username,display_name,xp,level",
        privy_id: `eq.${v.danz_privy_id}`,
        limit: "1",
      });

      const user = users?.[0];
      const username = user?.username || user?.display_name || "Dancer";

      verifiedUsers.set(userId, {
        odId: userId,
        danzUsername: username,
        danzPrivyId: v.danz_privy_id!,
        verifiedAt: Date.now(),
      });

      return `**You're verified!**\n\nWelcome back, **@${username}**!\n\n+${SIGNUP_POINTS} pts for signing up!\n\nTry "stats", "challenges", or "events" next.`;
    }

    const pending = await query<PendingVerification[]>(cfg, "pending_verifications", {
      select: "*",
      platform_user_id: `eq.${userId}`,
      platform: `eq.${platform}`,
      verified_at: "is.null",
      order: "created_at.desc",
      limit: "1",
    });

    if (pending?.length) {
      const p = pending[0];
      const expiresAt = new Date(p.expires_at);
      if (expiresAt > new Date()) {
        const url = `${DANZ_BASE_URL}/link?code=${p.code}`;
        return `**Verification pending**\n\nClick to complete: ${url}\n\nThen say "status" to confirm.`;
      }
      return `Your verification link expired. Say "signup" to get a new one!`;
    }

    return `You haven't started verification yet.\n\nSay "signup" to connect your DANZ.Now account!`;
  }

  // ========================================================================
  // Stats, Challenges, Leaderboard
  // ========================================================================

  private async getStats(cfg: DANZPluginConfig, platform: string, userId?: string): Promise<string> {
    if (!userId) return "User ID is required.";

    const status = await this.ensureVerified(cfg, platform, userId);
    if (!status) {
      return `You need to connect your DANZ.Now account first.\n\nSay "signup" to get started!`;
    }

    const users = await query<any[]>(cfg, "users", {
      select: "username,display_name,xp,level,total_sessions,total_dance_time,longest_streak,current_streak,total_events_attended,dance_bonds_count,total_achievements",
      privy_id: `eq.${status.danzPrivyId}`,
      limit: "1",
    });

    if (!users?.length) return "Could not load your stats.";

    const u = users[0];
    const hours = Math.floor((u.total_dance_time || 0) / 60);
    const mins = (u.total_dance_time || 0) % 60;
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    const name = u.username || u.display_name || status.danzUsername;

    return `**@${name}'s DANZ Stats**\n\n**Level ${u.level || 1}** | ${u.xp || 0} XP\n\nDance Time: ${timeStr}\nSessions: ${u.total_sessions || 0}\nCurrent Streak: ${u.current_streak || 0} days\nLongest Streak: ${u.longest_streak || 0} days\nEvents Attended: ${u.total_events_attended || 0}\nDance Bonds: ${u.dance_bonds_count || 0}\nAchievements: ${u.total_achievements || 0} unlocked`;
  }

  private async getChallenges(cfg: DANZPluginConfig, platform: string, userId?: string): Promise<string> {
    let privyId: string | undefined;
    if (userId) {
      const verified = await this.ensureVerified(cfg, platform, userId);
      privyId = verified?.danzPrivyId;
    }

    const now = new Date().toISOString();
    const challenges = await query<any[]>(cfg, "challenges", {
      select: "*",
      is_active: "eq.true",
      or: `(ends_at.is.null,ends_at.gt.${now})`,
      order: "challenge_type.asc",
      limit: "15",
    });

    if (!challenges?.length) return "No active challenges right now. Check back soon!";

    const byType: Record<string, any[]> = {};
    for (const c of challenges) {
      const type = c.challenge_type || "OTHER";
      if (!byType[type]) byType[type] = [];
      byType[type].push(c);
    }

    const emoji: Record<string, string> = {
      DAILY: "Daily", WEEKLY: "Weekly", SPECIAL: "Special", EVENT: "Event", STREAK: "Streak", SOCIAL: "Social",
    };

    const lines: string[] = ["**Active Challenges**\n"];
    for (const [type, items] of Object.entries(byType)) {
      lines.push(`**${emoji[type] || type}**`);
      for (const c of items.slice(0, 5)) {
        lines.push(` **${c.title}** - ${c.xp_reward} XP`);
        lines.push(`   ${c.description}`);
      }
      lines.push("");
    }

    lines.push("Complete challenges to earn XP and level up!");
    return lines.join("\n");
  }

  private async getMyEvents(cfg: DANZPluginConfig, platform: string, userId?: string): Promise<string> {
    if (!userId) return "User ID is required.";

    const status = await this.ensureVerified(cfg, platform, userId);
    if (!status) {
      return `You need to connect your DANZ.Now account first.\n\nSay "signup" to get started!`;
    }

    const now = new Date().toISOString();

    const registrations = await query<any[]>(cfg, "event_registrations", {
      select: "id,status,events(id,title,start_date_time,end_date_time,location_name,location_city,dance_styles)",
      user_id: `eq.${status.danzPrivyId}`,
      order: "created_at.desc",
      limit: "15",
    });

    if (!registrations?.length) {
      return `**No registered events yet**\n\nSay "events" to discover upcoming events!`;
    }

    const upcoming: any[] = [];
    const past: any[] = [];

    for (const r of registrations) {
      const event = r.events;
      if (!event) continue;
      if (event.start_date_time > now) {
        upcoming.push(event);
      } else {
        past.push(event);
      }
    }

    const lines: string[] = [`**@${status.danzUsername}'s Events**\n`];

    if (upcoming.length) {
      lines.push(`**Upcoming** (${upcoming.length})\n`);
      for (const e of upcoming) {
        const date = new Date(e.start_date_time);
        const dateStr = date.toLocaleDateString("en-US", {
          weekday: "short", month: "short", day: "numeric",
          hour: "numeric", minute: "2-digit",
        });
        lines.push(`**${e.title}**`);
        lines.push(`${dateStr}`);
        if (e.location_name) {
          lines.push(`${e.location_name}${e.location_city ? `, ${e.location_city}` : ""}`);
        }
        lines.push("");
      }
    }

    if (past.length) {
      lines.push(`**Past** (${past.length})\n`);
      for (const e of past.slice(0, 5)) {
        const date = new Date(e.start_date_time);
        const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        lines.push(`${dateStr} - ${e.title}`);
      }
      if (past.length > 5) {
        lines.push(`...and ${past.length - 5} more`);
      }
    }

    if (!upcoming.length && !past.length) {
      lines.push(`No events found. Say "events" to discover what's happening!`);
    }

    return lines.join("\n");
  }

  private async getLeaderboard(cfg: DANZPluginConfig): Promise<string> {
    const users = await query<any[]>(cfg, "users", {
      select: "username,display_name,xp,level",
      order: "xp.desc",
      limit: "10",
    });

    if (!users?.length) return "No leaderboard data yet.";

    const medals = ["1.", "2.", "3."];
    const lines: string[] = ["**DANZ Leaderboard**\n"];

    users.forEach((u, i) => {
      const rank = medals[i] || `${i + 1}.`;
      const name = u.display_name || u.username || "Dancer";
      lines.push(`${rank} **${name}** - Level ${u.level || 1} (${u.xp || 0} XP)`);
    });

    return lines.join("\n");
  }

  // ========================================================================
  // Wallet & Rewards
  // ========================================================================

  private async linkWallet(
    cfg: DANZPluginConfig,
    platform: string,
    userId?: string,
    walletAddress?: string,
  ): Promise<string> {
    if (!userId) return "User ID is required.";
    if (!walletAddress) return "Please provide your Base network wallet address.\n\nExample: link-wallet 0x1234...abcd";

    const status = await this.ensureVerified(cfg, platform, userId);
    if (!status) {
      return `You need to connect your DANZ.Now account first.\n\nSay "signup" to get started!`;
    }

    // Validate address format
    const addr = walletAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      return "Invalid wallet address. Must be a valid Ethereum/Base address (0x followed by 40 hex characters).";
    }

    const result = await upsert(cfg, "user_wallets", {
      privy_id: status.danzPrivyId,
      wallet_address: addr,
      chain: "base",
      linked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, "privy_id");

    if (!result) return "Failed to link wallet. Please try again.";

    return `**Wallet linked!**\n\nAddress: ${addr.slice(0, 6)}...${addr.slice(-4)}\nNetwork: Base\n\nYou can now claim USDC rewards for completed challenges. Say "challenges" to see what's available!`;
  }

  private async claimReward(
    cfg: DANZPluginConfig,
    platform: string,
    userId?: string,
    challengeId?: string,
  ): Promise<string> {
    if (!userId) return "User ID is required.";

    const status = await this.ensureVerified(cfg, platform, userId);
    if (!status) {
      return `You need to connect your DANZ.Now account first.\n\nSay "signup" to get started!`;
    }

    // Check wallet is linked
    const wallets = await query<any[]>(cfg, "user_wallets", {
      select: "wallet_address",
      privy_id: `eq.${status.danzPrivyId}`,
      limit: "1",
    });

    if (!wallets?.length) {
      return `You need to link a wallet first.\n\nSay "link-wallet 0x..." with your Base network address.`;
    }

    const walletAddress = wallets[0].wallet_address;

    // If specific challenge, claim that one
    if (challengeId) {
      return this.claimSingleReward(cfg, status.danzPrivyId, walletAddress, challengeId);
    }

    // Otherwise, find all eligible completed challenges
    const completions = await query<any[]>(cfg, "user_challenges", {
      select: "id,challenge_id,challenges(id,title,challenge_type,xp_reward)",
      user_id: `eq.${status.danzPrivyId}`,
      status: "eq.completed",
      order: "completed_at.desc",
      limit: "20",
    });

    if (!completions?.length) {
      return "No completed challenges found. Complete some challenges first!\n\nSay \"challenges\" to see active ones.";
    }

    // Check which haven't been claimed yet
    const existingClaims = await query<any[]>(cfg, "payout_claims", {
      select: "challenge_id",
      privy_id: `eq.${status.danzPrivyId}`,
      status: "neq.failed",
    });

    const claimedIds = new Set((existingClaims || []).map((c: any) => c.challenge_id));
    const unclaimed = completions.filter((c: any) => !claimedIds.has(c.challenge_id));

    if (!unclaimed.length) {
      return "All your completed challenges have already been claimed!\n\nComplete more challenges to earn USDC.";
    }

    // Create claims for all unclaimed completions
    const instructions: string[] = [];
    let totalAmount = 0;

    for (const completion of unclaimed) {
      const challenge = completion.challenges;
      if (!challenge) continue;

      const challengeType = challenge.challenge_type || "DAILY";
      const amount = REWARD_RATES[challengeType] || REWARD_RATES.DAILY;

      const claim = await insert(cfg, "payout_claims", {
        privy_id: status.danzPrivyId,
        challenge_id: challenge.id,
        amount_usdc: amount,
        status: "pending",
        claimed_at: new Date().toISOString(),
      });

      if (claim) {
        instructions.push(`PAYOUT_INSTRUCTION: Send ${amount.toFixed(2)} USDC to ${walletAddress} for challenge "${challenge.title}"`);
        totalAmount += amount;
      }
    }

    if (!instructions.length) {
      return "Failed to create reward claims. Please try again.";
    }

    const summary = `**Rewards Claimed!**\n\n${unclaimed.length} challenge(s) | Total: $${totalAmount.toFixed(2)} USDC\nWallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}\n\nProcessing payouts...\n\n${instructions.join("\n")}`;
    return summary;
  }

  private async claimSingleReward(
    cfg: DANZPluginConfig,
    privyId: string,
    walletAddress: string,
    challengeId: string,
  ): Promise<string> {
    // Check challenge exists and is completed
    const completions = await query<any[]>(cfg, "user_challenges", {
      select: "id,challenge_id,challenges(id,title,challenge_type,xp_reward)",
      user_id: `eq.${privyId}`,
      challenge_id: `eq.${challengeId}`,
      status: "eq.completed",
      limit: "1",
    });

    if (!completions?.length) {
      return "Challenge not found or not completed yet.";
    }

    // Check not already claimed
    const existingClaims = await query<any[]>(cfg, "payout_claims", {
      select: "id,status",
      privy_id: `eq.${privyId}`,
      challenge_id: `eq.${challengeId}`,
      status: "neq.failed",
      limit: "1",
    });

    if (existingClaims?.length) {
      const s = existingClaims[0].status;
      return `This challenge reward has already been ${s === "paid" ? "paid out" : "claimed"}.`;
    }

    const challenge = completions[0].challenges;
    const challengeType = challenge?.challenge_type || "DAILY";
    const amount = REWARD_RATES[challengeType] || REWARD_RATES.DAILY;

    const claim = await insert(cfg, "payout_claims", {
      privy_id: privyId,
      challenge_id: challengeId,
      amount_usdc: amount,
      status: "pending",
      claimed_at: new Date().toISOString(),
    });

    if (!claim) return "Failed to create reward claim. Please try again.";

    return `**Reward Claimed!**\n\n"${challenge.title}" - $${amount.toFixed(2)} USDC\nWallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}\n\nPAYOUT_INSTRUCTION: Send ${amount.toFixed(2)} USDC to ${walletAddress} for challenge "${challenge.title}"`;
  }

  private async getRewardHistory(
    cfg: DANZPluginConfig,
    platform: string,
    userId?: string,
  ): Promise<string> {
    if (!userId) return "User ID is required.";

    const status = await this.ensureVerified(cfg, platform, userId);
    if (!status) {
      return `You need to connect your DANZ.Now account first.\n\nSay "signup" to get started!`;
    }

    const claims = await query<any[]>(cfg, "payout_claims", {
      select: "id,amount_usdc,status,tx_hash,claimed_at,paid_at,challenges(title,challenge_type)",
      privy_id: `eq.${status.danzPrivyId}`,
      order: "claimed_at.desc",
      limit: "20",
    });

    if (!claims?.length) {
      return "No reward history yet.\n\nComplete challenges and claim rewards to start earning USDC!";
    }

    const statusEmoji: Record<string, string> = {
      pending: "Pending",
      approved: "Approved",
      paid: "Paid",
      failed: "Failed",
    };

    let totalPaid = 0;
    let totalPending = 0;
    const lines: string[] = [`**@${status.danzUsername}'s Reward History**\n`];

    for (const c of claims) {
      const date = new Date(c.claimed_at).toLocaleDateString("en-US", {
        month: "short", day: "numeric",
      });
      const title = c.challenges?.title || "Challenge";
      const label = statusEmoji[c.status] || c.status;
      const txLink = c.tx_hash ? ` | tx: ${c.tx_hash.slice(0, 8)}...` : "";

      lines.push(`${date} | $${Number(c.amount_usdc).toFixed(2)} | ${title} | ${label}${txLink}`);

      if (c.status === "paid") totalPaid += Number(c.amount_usdc);
      if (c.status === "pending" || c.status === "approved") totalPending += Number(c.amount_usdc);
    }

    lines.push("");
    lines.push(`**Total Earned**: $${totalPaid.toFixed(2)} USDC`);
    if (totalPending > 0) {
      lines.push(`**Pending**: $${totalPending.toFixed(2)} USDC`);
    }

    return lines.join("\n");
  }

  // ========================================================================
  // Check-in & Dance Proof
  // ========================================================================

  private async checkin(
    cfg: DANZPluginConfig,
    platform: string,
    userId?: string,
    eventId?: string,
  ): Promise<string> {
    if (!userId) return "User ID is required.";

    const status = await this.ensureVerified(cfg, platform, userId);
    if (!status) {
      return `You need to connect your DANZ.Now account first.\n\nSay "signup" to get started!`;
    }

    // If no event specified, show events happening today
    if (!eventId) {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const events = await query<any[]>(cfg, "events", {
        select: "id,title,start_date_time,location_name",
        start_date_time: `gte.${todayStart.toISOString()}`,
        end_date_time: `lte.${todayEnd.toISOString()}`,
        order: "start_date_time.asc",
        limit: "10",
      });

      // Also check events that started before today but haven't ended
      const activeEvents = await query<any[]>(cfg, "events", {
        select: "id,title,start_date_time,location_name",
        start_date_time: `lte.${now.toISOString()}`,
        end_date_time: `gte.${now.toISOString()}`,
        order: "start_date_time.asc",
        limit: "10",
      });

      const allEvents = [...(activeEvents || []), ...(events || [])];
      const seen = new Set<string>();
      const unique = allEvents.filter((e) => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });

      if (!unique.length) {
        return "No events happening today. Check back later or say \"events\" to see upcoming events!";
      }

      const lines = ["**Check in to an event:**\n"];
      for (let i = 0; i < unique.length; i++) {
        const e = unique[i];
        const time = new Date(e.start_date_time).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        lines.push(`${i + 1}. **${e.title}** - ${time}`);
        if (e.location_name) lines.push(`   ${e.location_name}`);
      }
      lines.push("\nTap an event below to check in!");
      return lines.join("\n");
    }

    // Check in to specific event
    const existing = await query<any[]>(cfg, "event_attendance", {
      select: "id,checked_in",
      user_id: `eq.${status.danzPrivyId}`,
      event_id: `eq.${eventId}`,
      limit: "1",
    });

    if (existing?.length && existing[0].checked_in) {
      return "You're already checked in to this event! Now show us your moves!\n\nSend a photo of your dance, or tap a dance move below.";
    }

    // Create or update attendance
    const attendance = await upsert(cfg, "event_attendance", {
      event_id: eventId,
      user_id: status.danzPrivyId,
      checked_in: true,
      checked_in_at: new Date().toISOString(),
      points_earned: 10,
    }, "user_id,event_id");

    if (!attendance) return "Failed to check in. Please try again.";

    // Get event title
    const events = await query<any[]>(cfg, "events", {
      select: "title",
      id: `eq.${eventId}`,
      limit: "1",
    });
    const title = events?.[0]?.title || "the event";

    return `**Checked in!** +10 pts\n\nYou're at **${title}**\n\nNow prove you danced! Pick a move:\n\n**Dev Dance Moves:**\n1. The Git Push (push it forward)\n2. Merge Conflict (partner sync)\n3. Deploy to Prod (victory dance)\n4. Hotfix (quick spin)\n5. 404 Not Found (freeze pose)\n6. Stack Overflow (build up)\n\nSend a photo of your move for +25 bonus pts!`;
  }

  private async danceProof(
    cfg: DANZPluginConfig,
    platform: string,
    userId?: string,
    eventId?: string,
    danceMove?: string,
    photoFileId?: string,
  ): Promise<string> {
    if (!userId) return "User ID is required.";

    const status = await this.ensureVerified(cfg, platform, userId);
    if (!status) {
      return `You need to connect your DANZ.Now account first.\n\nSay "signup" to get started!`;
    }

    // Find their most recent check-in if no eventId
    if (!eventId) {
      const recent = await query<any[]>(cfg, "event_attendance", {
        select: "event_id,checked_in_at",
        user_id: `eq.${status.danzPrivyId}`,
        checked_in: "eq.true",
        order: "checked_in_at.desc",
        limit: "1",
      });
      eventId = recent?.[0]?.event_id;
    }

    if (!eventId) {
      return "You need to check in to an event first!\n\nSay \"checkin\" to see today's events.";
    }

    // Record the proof in checkins table
    const proofData: Record<string, any> = {
      user_id: status.danzPrivyId,
      fid: 0, // not from Farcaster
      did_dance: true,
      xp_earned: 25,
      reflection_data: {
        dance_move: danceMove || "freestyle",
        photo_file_id: photoFileId || null,
        event_id: eventId,
        platform,
        submitted_at: new Date().toISOString(),
      },
    };

    const result = await insert(cfg, "checkins", proofData);
    if (!result) return "Failed to record dance proof. Please try again.";

    // Update attendance with proof
    await update(cfg, "event_attendance", {
      attendance_verified: true,
      verified_at: new Date().toISOString(),
      verified_by: "self_proof",
      points_earned: 35, // 10 checkin + 25 proof
    }, {
      user_id: `eq.${status.danzPrivyId}`,
      event_id: `eq.${eventId}`,
    });

    // Award XP to user
    await update(cfg, "users", {
      xp: `xp + 25`,
    }, {
      privy_id: `eq.${status.danzPrivyId}`,
    }).catch(() => {}); // best effort

    const moveName = danceMove || "freestyle";
    const photoNote = photoFileId ? " with photo proof" : "";

    return `**Dance proof submitted!** +25 pts\n\nMove: **${moveName}**${photoNote}\n\nYou're verified as dancing at this event! Keep the energy going!`;
  }

  private listDanceMoves(): string {
    return [
      "**Dev Dance Moves**\n",
      "Pick your signature move at the event:\n",
      "**The Git Push** - Push it forward, both hands out",
      "  Difficulty: Easy | +25 XP\n",
      "**Merge Conflict** - Two people try to sync moves",
      "  Difficulty: Medium | +50 XP\n",
      "**Deploy to Prod** - Victory celebration dance",
      "  Difficulty: Easy | +25 XP\n",
      "**Hotfix** - Quick spin move, no time to think",
      "  Difficulty: Hard | +75 XP\n",
      "**404 Not Found** - Freeze! Hold an unexpected pose",
      "  Difficulty: Medium | +50 XP\n",
      "**Stack Overflow** - Tower move, build from floor up",
      "  Difficulty: Hard | +75 XP\n",
      "**Rebase & Chill** - Smooth rolling wave motion",
      "  Difficulty: Medium | +50 XP\n",
      "**The Fork Bomb** - Rapid-fire moves, multiply!",
      "  Difficulty: Extreme | +100 XP\n",
      "Check in to an event and prove your move for bonus points!",
    ].join("\n");
  }

  private async eventLeaderboard(
    cfg: DANZPluginConfig,
    eventId?: string,
  ): Promise<string> {
    if (!eventId) return "Please specify an event to see its leaderboard.";

    const events = await query<any[]>(cfg, "events", {
      select: "title",
      id: `eq.${eventId}`,
      limit: "1",
    });
    const title = events?.[0]?.title || "Event";

    const attendance = await query<any[]>(cfg, "event_attendance", {
      select: "user_id,checked_in,attendance_verified,points_earned,checked_in_at,users(username,display_name)",
      event_id: `eq.${eventId}`,
      checked_in: "eq.true",
      order: "points_earned.desc",
      limit: "20",
    });

    if (!attendance?.length) {
      return `No one has checked in to **${title}** yet. Be the first!`;
    }

    const lines = [`**${title}** - Leaderboard\n`];
    const verified = attendance.filter((a) => a.attendance_verified);
    const checkedIn = attendance.filter((a) => !a.attendance_verified);

    if (verified.length) {
      lines.push(`**Verified Dancers** (${verified.length})`);
      for (let i = 0; i < verified.length; i++) {
        const a = verified[i];
        const name = a.users?.display_name || a.users?.username || "Dancer";
        lines.push(`${i + 1}. **${name}** - ${a.points_earned || 0} pts`);
      }
      lines.push("");
    }

    if (checkedIn.length) {
      lines.push(`**Checked In** (${checkedIn.length})`);
      for (const a of checkedIn) {
        const name = a.users?.display_name || a.users?.username || "Dancer";
        lines.push(`- ${name}`);
      }
    }

    lines.push(`\nTotal: ${attendance.length} people at this event`);
    return lines.join("\n");
  }
}
