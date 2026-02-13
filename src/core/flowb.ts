/**
 * FlowB - FlowBond's Core Agent
 *
 * A privacy-centric assistant that helps users flow and bond.
 * Loads plugins for domain-specific capabilities:
 *   - danz:   Dance events, challenges, stats
 *   - egator: Aggregated multi-source event discovery
 *   - (more plugins coming: harmonik, etc.)
 */

import type { FlowBPlugin, EventProvider, FlowBConfig, ToolInput, FlowBContext, EventResult } from "./types.js";
import { DANZPlugin } from "../plugins/danz/index.js";
import { EGatorPlugin, formatEventList } from "../plugins/egator/index.js";
import { NeynarPlugin } from "../plugins/neynar/index.js";
import { PointsPlugin } from "../plugins/points/index.js";
import { TradingPlugin } from "../plugins/trading/index.js";
import { CDPClient } from "../services/cdp.js";
import type { TelegramAuthData } from "../services/telegram-auth.js";

export class FlowBCore {
  private plugins: Map<string, FlowBPlugin> = new Map();
  private eventProviders: EventProvider[] = [];
  private config: FlowBConfig;
  cdp: CDPClient | null = null;
  private verifiedHooks: Array<(tgId: number, username: string) => void> = [];

  constructor(config: FlowBConfig) {
    this.config = config;
    this.initPlugins();
    this.initCDP();
  }

  private initPlugins() {
    const danz = new DANZPlugin();
    if (this.config.plugins?.danz) {
      danz.configure(this.config.plugins.danz);
    }
    this.registerPlugin(danz);

    const egator = new EGatorPlugin();
    if (this.config.plugins?.egator) {
      egator.configure(this.config.plugins.egator);
    }
    this.registerPlugin(egator);

    const neynar = new NeynarPlugin();
    if (this.config.plugins?.neynar) {
      neynar.configure(this.config.plugins.neynar);
    }
    this.registerPlugin(neynar);

    const points = new PointsPlugin();
    if (this.config.plugins?.points) {
      points.configure(this.config.plugins.points);
    }
    this.registerPlugin(points);

    const trading = new TradingPlugin();
    if (this.config.plugins?.trading) {
      trading.configure(this.config.plugins.trading);
    }
    this.registerPlugin(trading);

    const configured = Array.from(this.plugins.values())
      .filter((p) => p.isConfigured())
      .map((p) => p.name);

    console.log(`[flowb] Agent loaded | Plugins: ${configured.join(", ") || "none"}`);
  }

  private registerPlugin(plugin: FlowBPlugin) {
    this.plugins.set(plugin.id, plugin);
    if ("getEvents" in plugin && "eventSource" in plugin) {
      this.eventProviders.push(plugin as unknown as EventProvider);
    }
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  async execute(action: string, input: ToolInput, context?: Partial<FlowBContext>): Promise<string> {
    const ctx: FlowBContext = {
      userId: input.user_id || context?.userId,
      platform: input.platform || context?.platform || "api",
      config: this.config,
    };

    try {
      switch (action) {
        case "events":
          return await this.discoverEvents(input);
        case "help":
          return this.showHelp();
        case "menu":
          return this.showHelp();
      }

      // Route to plugins
      for (const [, plugin] of this.plugins) {
        if (action in plugin.actions && plugin.isConfigured()) {
          return await plugin.execute(action, input, ctx);
        }
      }

      // Fallback
      return this.showHelp();
    } catch (err) {
      console.error("[flowb] Error:", err);
      return "Something went wrong. Please try again.";
    }
  }

  async discoverEventsRaw(input: ToolInput): Promise<EventResult[]> {
    const configuredProviders = this.eventProviders.filter((p) => {
      const plugin = this.plugins.get((p as unknown as FlowBPlugin).id);
      return plugin?.isConfigured();
    });

    if (configuredProviders.length === 0) return [];

    const results = await Promise.allSettled(
      configuredProviders.map((provider) =>
        provider.getEvents({
          city: input.city,
          category: input.category,
          danceStyle: input.dance_style,
          limit: 15,
        })
      )
    );

    const allEvents: EventResult[] = [];
    for (const result of results) {
      if (result.status === "fulfilled" && result.value.length) {
        allEvents.push(...result.value);
      }
    }

    allEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const seen = new Set<string>();
    return allEvents.filter((e) => {
      const key = e.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async discoverEvents(input: ToolInput): Promise<string> {
    const configuredProviders = this.eventProviders.filter((p) => {
      const plugin = this.plugins.get((p as unknown as FlowBPlugin).id);
      return plugin?.isConfigured();
    });

    if (configuredProviders.length === 0) {
      return "No event sources are configured. Ask your admin to set up DANZ or eGator.";
    }

    const results = await Promise.allSettled(
      configuredProviders.map((provider) =>
        provider.getEvents({
          city: input.city,
          category: input.category,
          danceStyle: input.dance_style,
          limit: 10,
        })
      )
    );

    const allEvents: EventResult[] = [];
    for (const result of results) {
      if (result.status === "fulfilled" && result.value.length) {
        allEvents.push(...result.value);
      }
    }

    if (allEvents.length === 0) {
      const cityNote = input.city ? ` in ${input.city}` : "";
      return `No upcoming events found${cityNote}. Check back soon!`;
    }

    allEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const seen = new Set<string>();
    const unique = allEvents.filter((e) => {
      const key = e.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const sourceCount = new Set(unique.map((e) => e.source)).size;
    const title = input.city
      ? `Upcoming Events in ${input.city}`
      : "Upcoming Events";
    const subtitle = sourceCount > 1 ? ` (from ${sourceCount} sources)` : "";

    return formatEventList(unique.slice(0, 15), `${title}${subtitle}`);
  }

  getPluginStatus(): { id: string; name: string; configured: boolean }[] {
    return Array.from(this.plugins.values()).map((p) => ({
      id: p.id,
      name: p.name,
      configured: p.isConfigured(),
    }));
  }

  showHelp(): string {
    const lines: string[] = [
      "**FlowB - Your Flow & Bond Assistant**",
      "",
      "**Events**",
      "- **events** - Discover upcoming events",
      '- **events in [city]** - Events in a specific city',
      "",
    ];

    for (const [, plugin] of this.plugins) {
      if (!plugin.isConfigured()) continue;
      const actionNames = Object.keys(plugin.actions);
      if (actionNames.length) {
        lines.push(`**${plugin.name}**`);
        for (const [name, info] of Object.entries(plugin.actions)) {
          lines.push(`- **${name}** - ${info.description}`);
        }
        lines.push("");
      }
    }

    lines.push("- **help** - Show this message");
    return lines.join("\n");
  }

  /** Award points for a user interaction (delegates to PointsPlugin) */
  async awardPoints(
    userId: string,
    platform: string,
    action: string,
    metadata?: Record<string, any>,
  ): Promise<{ awarded: boolean; points: number; total: number }> {
    const points = this.plugins.get("points") as PointsPlugin | undefined;
    if (!points?.isConfigured() || !this.config.plugins?.points) {
      return { awarded: false, points: 0, total: 0 };
    }
    return points.awardPoints(this.config.plugins.points, userId, platform, action, metadata);
  }

  /** Update daily login streak (delegates to PointsPlugin) */
  async updateStreak(
    userId: string,
    platform: string,
  ): Promise<{ streak: number; bonus: number }> {
    const points = this.plugins.get("points") as PointsPlugin | undefined;
    if (!points?.isConfigured() || !this.config.plugins?.points) {
      return { streak: 0, bonus: 0 };
    }
    return points.updateStreak(this.config.plugins.points, userId, platform);
  }

  /** Get the list of all action names (for schema generation) */
  getActionNames(): string[] {
    const actions = ["events", "help"];
    for (const [, plugin] of this.plugins) {
      actions.push(...Object.keys(plugin.actions));
    }
    return actions;
  }

  // ==========================================================================
  // Telegram Verification Hooks
  // ==========================================================================

  /** Register a callback to fire when a Telegram user completes verification. */
  onTelegramVerified(cb: (tgId: number, username: string) => void): void {
    this.verifiedHooks.push(cb);
  }

  private fireVerifiedHooks(tgId: number, username: string): void {
    for (const cb of this.verifiedHooks) {
      try {
        cb(tgId, username);
      } catch (err) {
        console.error("[flowb] Verified hook error:", err);
      }
    }
  }

  // ==========================================================================
  // Telegram Login Widget - Account Linking
  // ==========================================================================

  /**
   * Check if a Telegram user has completed verification via the Login Widget.
   * Queries the pending_verifications table in Supabase.
   */
  async checkTelegramVerification(
    telegramUserId: string,
  ): Promise<{ username?: string; displayName?: string } | null> {
    const cfg = this.config.plugins?.danz;
    if (!cfg) return null;

    try {
      const res = await fetch(
        `${cfg.supabaseUrl}/rest/v1/pending_verifications?platform=eq.telegram&platform_user_id=eq.${telegramUserId}&verified_at=not.is.null&select=platform_username&limit=1`,
        {
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: `Bearer ${cfg.supabaseKey}`,
          },
        },
      );

      if (!res.ok) return null;
      const rows = await res.json();
      if (!rows?.length) return null;

      return {
        username: rows[0].platform_username,
        displayName: rows[0].platform_username,
      };
    } catch {
      return null;
    }
  }

  /**
   * Store a verified Telegram user in Supabase.
   * Called after the Telegram Login Widget HMAC is verified.
   * Uses the pending_verifications table (already exists) to record the link,
   * and upserts the user in flowb_user_points so the bot recognizes them.
   */
  async linkTelegramUser(
    authData: TelegramAuthData,
  ): Promise<{ success: boolean; error?: string }> {
    const cfg = this.config.plugins?.danz;
    if (!cfg) {
      return { success: false, error: "Supabase not configured" };
    }

    const telegramUserId = String(authData.id);
    const displayName = [authData.first_name, authData.last_name].filter(Boolean).join(" ");

    try {
      // Upsert into pending_verifications as a completed verification.
      // Uses the unique index on (platform, platform_user_id) for conflict resolution.
      const verifyRes = await fetch(
        `${cfg.supabaseUrl}/rest/v1/pending_verifications?on_conflict=platform,platform_user_id`,
        {
          method: "POST",
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: `Bearer ${cfg.supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal,resolution=merge-duplicates",
          },
          body: JSON.stringify({
            platform: "telegram",
            platform_user_id: telegramUserId,
            platform_username: authData.username || displayName,
            verified_at: new Date().toISOString(),
            auth_date: authData.auth_date,
            photo_url: authData.photo_url || null,
          }),
        },
      );

      if (!verifyRes.ok) {
        const text = await verifyRes.text();
        console.error(`[flowb] Link telegram failed (verifications): ${verifyRes.status} ${text}`);
        return { success: false, error: "Failed to store verification" };
      }

      // Ensure user exists in flowb_user_points so the bot can track them
      const pointsCfg = this.config.plugins?.points;
      if (pointsCfg) {
        const userId = `telegram_${telegramUserId}`;
        const checkRes = await fetch(
          `${pointsCfg.supabaseUrl}/rest/v1/flowb_user_points?user_id=eq.${userId}&platform=eq.telegram&select=user_id&limit=1`,
          {
            headers: {
              apikey: pointsCfg.supabaseKey,
              Authorization: `Bearer ${pointsCfg.supabaseKey}`,
            },
          },
        );

        const existing = checkRes.ok ? await checkRes.json() : [];
        if (!existing?.length) {
          await fetch(`${pointsCfg.supabaseUrl}/rest/v1/flowb_user_points`, {
            method: "POST",
            headers: {
              apikey: pointsCfg.supabaseKey,
              Authorization: `Bearer ${pointsCfg.supabaseKey}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({
              user_id: userId,
              platform: "telegram",
              total_points: 0,
              current_streak: 0,
              longest_streak: 0,
              first_actions: {},
              milestone_level: 0,
            }),
          });
        }
      }

      console.log(`[flowb] Telegram linked: ${telegramUserId} (${authData.username || displayName})`);
      this.fireVerifiedHooks(authData.id, authData.username || displayName);
      return { success: true };
    } catch (err: any) {
      console.error("[flowb] linkTelegramUser error:", err);
      return { success: false, error: err.message };
    }
  }

  // ==========================================================================
  // CDP / Payout System
  // ==========================================================================

  private initCDP() {
    if (this.config.plugins?.cdp) {
      try {
        this.cdp = new CDPClient(this.config.plugins.cdp);
        console.log(`[flowb] CDP client initialized (address: ${this.cdp.address})`);
      } catch (err) {
        console.error("[flowb] CDP client init failed:", err);
      }
    }
  }

  /** Process pending payout claims by sending USDC via CDP */
  async processPayouts(): Promise<{ processed: number; failed: number; total: number }> {
    if (!this.cdp || !this.config.plugins?.danz) {
      return { processed: 0, failed: 0, total: 0 };
    }

    const cfg = this.config.plugins.danz;
    const url = `${cfg.supabaseUrl}/rest/v1/payout_claims`;

    // Fetch pending claims with linked wallets
    const claimsRes = await fetch(
      `${url}?status=eq.pending&select=id,privy_id,amount_usdc,challenge_id,user_wallets(wallet_address)&order=claimed_at.asc&limit=10`,
      {
        headers: {
          apikey: cfg.supabaseKey,
          Authorization: `Bearer ${cfg.supabaseKey}`,
        },
      },
    );

    if (!claimsRes.ok) return { processed: 0, failed: 0, total: 0 };
    const claims = await claimsRes.json();
    if (!claims?.length) return { processed: 0, failed: 0, total: 0 };

    let processed = 0;
    let failed = 0;

    for (const claim of claims) {
      const walletAddr = claim.user_wallets?.wallet_address;
      if (!walletAddr) {
        // No wallet linked, skip
        continue;
      }

      const amount = Number(claim.amount_usdc);
      if (amount <= 0) continue;

      const result = await this.cdp.sendUSDC(walletAddr, amount);

      // Update claim status
      const newStatus = result.success ? "paid" : "failed";
      const updateBody: Record<string, any> = {
        status: newStatus,
      };
      if (result.txHash) {
        updateBody.tx_hash = result.txHash;
        updateBody.paid_at = new Date().toISOString();
      }
      if (result.error) {
        updateBody.error_message = result.error;
      }

      await fetch(`${url}?id=eq.${claim.id}`, {
        method: "PATCH",
        headers: {
          apikey: cfg.supabaseKey,
          Authorization: `Bearer ${cfg.supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(updateBody),
      });

      if (result.success) {
        processed++;
        console.log(`[flowb-cdp] Paid ${amount} USDC to ${walletAddr} (tx: ${result.txHash})`);
      } else {
        failed++;
        console.error(`[flowb-cdp] Failed payout to ${walletAddr}: ${result.error}`);
      }
    }

    return { processed, failed, total: claims.length };
  }
}
