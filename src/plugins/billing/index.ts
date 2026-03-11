/**
 * Billing Plugin for FlowB
 *
 * Subscription management, tier-based feature gates, usage tracking,
 * and Stripe integration stubs. Handles free/pro/team/business tiers
 * with per-period usage limits on gated features.
 *
 * Tables (migration 027):
 *   - flowb_subscriptions
 *   - flowb_usage_tracking
 */

import type {
  FlowBPlugin,
  FlowBContext,
  ToolInput,
} from "../../core/types.js";
import { sbQuery, sbInsert, sbPatch, sbUpsert, type SbConfig } from "../../utils/supabase.js";
import { log } from "../../utils/logger.js";

// ============================================================================
// Types
// ============================================================================

export type BillingTier = "free" | "pro" | "team" | "business";

export type GatedFeature = "ai_chat" | "meetings" | "automations" | "leads" | "boards" | "team_size";

export interface TierLimits {
  ai_chat: number;
  meetings: number;
  automations: number;
  leads: number;
  boards: number;
  team_size?: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  tier: BillingTier;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsageRecord {
  id: string;
  user_id: string;
  feature: GatedFeature;
  used: number;
  period_start: string;
  period_end: string;
  created_at: string;
  updated_at: string;
}

export interface LimitCheck {
  allowed: boolean;
  used: number;
  limit: number;
}

export interface UsageStats {
  tier: BillingTier;
  period_start: string;
  period_end: string;
  features: Record<GatedFeature, { used: number; limit: number }>;
}

export interface BillingPluginConfig extends SbConfig {
  stripeKey?: string;
}

// ============================================================================
// Tier Limits
// ============================================================================

const TIER_LIMITS: Record<BillingTier, TierLimits> = {
  free:     { ai_chat: 10,  meetings: 3,  automations: 2,  leads: 10,  boards: 1 },
  pro:      { ai_chat: -1,  meetings: -1, automations: -1, leads: -1,  boards: -1 },
  team:     { ai_chat: -1,  meetings: -1, automations: -1, leads: -1,  boards: -1, team_size: 10 },
  business: { ai_chat: -1,  meetings: -1, automations: -1, leads: -1,  boards: -1, team_size: 50 },
};

const GATED_FEATURES: GatedFeature[] = ["ai_chat", "meetings", "automations", "leads", "boards"];

const NS = "[billing]";

// ============================================================================
// Helpers
// ============================================================================

/** Get current billing period boundaries (calendar month). */
function getCurrentPeriod(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

// ============================================================================
// Billing Plugin
// ============================================================================

export class BillingPlugin implements FlowBPlugin {
  id = "billing";
  name = "Billing & Subscriptions";
  description = "Subscription tiers, feature gates, usage tracking, and Stripe integration";

  actions = {
    "my-plan":      { description: "View your current subscription plan and usage" },
    "upgrade":      { description: "Get a link to upgrade your plan" },
    "manage":       { description: "Manage your subscription (billing portal)" },
  };

  private config: BillingPluginConfig | null = null;

  configure(config: BillingPluginConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!(this.config?.supabaseUrl && this.config?.supabaseKey);
  }

  async execute(action: string, input: ToolInput, context: FlowBContext): Promise<string> {
    if (!this.config) return "Billing not configured.";
    const userId = input.user_id;

    switch (action) {
      case "my-plan":
        return this.getMyPlanFormatted(this.config, userId);
      case "upgrade":
        return this.getUpgradeFormatted(this.config, userId);
      case "manage":
        return this.getManageFormatted(this.config, userId);
      default:
        return `Unknown billing action: ${action}`;
    }
  }

  // ==========================================================================
  // Subscription Management
  // ==========================================================================

  /**
   * Get the current subscription for a user.
   * Creates a free-tier subscription if none exists.
   */
  async getSubscription(cfg: BillingPluginConfig, userId: string): Promise<Subscription> {
    const rows = await sbQuery<Subscription[]>(cfg, "flowb_subscriptions", {
      select: "*",
      user_id: `eq.${userId}`,
      limit: "1",
    });

    if (rows?.length) {
      return rows[0];
    }

    // Auto-create free tier subscription
    log.info(NS, "creating free subscription", { userId });
    const period = getCurrentPeriod();
    const inserted = await sbInsert<Subscription>(cfg, "flowb_subscriptions", {
      user_id: userId,
      tier: "free",
      status: "active",
      stripe_customer_id: null,
      stripe_subscription_id: null,
      current_period_start: period.start,
      current_period_end: period.end,
      cancel_at_period_end: false,
    });

    if (inserted) return inserted;

    // Fallback: return a synthetic free subscription if insert fails
    return {
      id: "",
      user_id: userId,
      tier: "free",
      status: "active",
      stripe_customer_id: null,
      stripe_subscription_id: null,
      current_period_start: period.start,
      current_period_end: period.end,
      cancel_at_period_end: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Get the billing tier for a user.
   */
  async getTier(cfg: BillingPluginConfig, userId: string): Promise<BillingTier> {
    const sub = await this.getSubscription(cfg, userId);
    return sub.tier;
  }

  /**
   * Update a subscription. Called by Stripe webhook handlers or admin actions.
   */
  async updateSubscription(
    cfg: BillingPluginConfig,
    userId: string,
    updates: Partial<Pick<Subscription,
      "tier" | "status" | "stripe_customer_id" | "stripe_subscription_id" |
      "current_period_start" | "current_period_end" | "cancel_at_period_end"
    >>,
  ): Promise<boolean> {
    log.info(NS, "updating subscription", { userId, updates });

    // Ensure subscription exists first
    await this.getSubscription(cfg, userId);

    return sbPatch(cfg, "flowb_subscriptions", {
      user_id: `eq.${userId}`,
    }, {
      ...updates,
      updated_at: new Date().toISOString(),
    });
  }

  // ==========================================================================
  // Tier Feature Gates
  // ==========================================================================

  /**
   * Check whether a user can use a gated feature.
   * Returns allowed=true if unlimited (-1) or under the period limit.
   */
  async checkLimit(
    cfg: BillingPluginConfig,
    userId: string,
    feature: GatedFeature,
  ): Promise<LimitCheck> {
    const tier = await this.getTier(cfg, userId);
    const limits = TIER_LIMITS[tier];
    const featureLimit = limits[feature as keyof TierLimits] as number | undefined;

    // Feature not defined for this tier (e.g. team_size on free) or unlimited
    if (featureLimit === undefined || featureLimit === -1) {
      const used = await this.getFeatureUsage(cfg, userId, feature);
      return { allowed: true, used, limit: -1 };
    }

    const used = await this.getFeatureUsage(cfg, userId, feature);
    return {
      allowed: used < featureLimit,
      used,
      limit: featureLimit,
    };
  }

  /**
   * Increment usage counter for a gated feature in the current period.
   * Returns the updated usage count or -1 if the limit was already reached.
   */
  async incrementUsage(
    cfg: BillingPluginConfig,
    userId: string,
    feature: GatedFeature,
  ): Promise<number> {
    const check = await this.checkLimit(cfg, userId, feature);
    if (!check.allowed) {
      log.debug(NS, "usage limit reached", { userId, feature, used: check.used, limit: check.limit });
      return -1;
    }

    const period = getCurrentPeriod();

    // Try upsert: increment if exists, insert if not
    const existing = await sbQuery<UsageRecord[]>(cfg, "flowb_usage_tracking", {
      select: "id,used",
      user_id: `eq.${userId}`,
      feature: `eq.${feature}`,
      period_start: `eq.${period.start}`,
      limit: "1",
    });

    if (existing?.length) {
      const newUsed = (existing[0].used || 0) + 1;
      await sbPatch(cfg, "flowb_usage_tracking", {
        id: `eq.${existing[0].id}`,
      }, {
        used: newUsed,
        updated_at: new Date().toISOString(),
      });
      return newUsed;
    }

    // First usage this period
    await sbInsert(cfg, "flowb_usage_tracking", {
      user_id: userId,
      feature,
      used: 1,
      period_start: period.start,
      period_end: period.end,
    });

    return 1;
  }

  // ==========================================================================
  // Usage Stats
  // ==========================================================================

  /**
   * Get all feature usage for a user in the current period, with limits.
   */
  async getUsage(cfg: BillingPluginConfig, userId: string): Promise<UsageStats> {
    const tier = await this.getTier(cfg, userId);
    const limits = TIER_LIMITS[tier];
    const period = getCurrentPeriod();

    const rows = await sbQuery<UsageRecord[]>(cfg, "flowb_usage_tracking", {
      select: "feature,used",
      user_id: `eq.${userId}`,
      period_start: `eq.${period.start}`,
    });

    const usageMap = new Map<string, number>();
    for (const row of rows || []) {
      usageMap.set(row.feature, row.used || 0);
    }

    const features: Record<string, { used: number; limit: number }> = {};
    for (const feat of GATED_FEATURES) {
      const limit = limits[feat as keyof TierLimits] as number | undefined;
      features[feat] = {
        used: usageMap.get(feat) || 0,
        limit: limit ?? -1,
      };
    }

    return {
      tier,
      period_start: period.start,
      period_end: period.end,
      features: features as Record<GatedFeature, { used: number; limit: number }>,
    };
  }

  // ==========================================================================
  // Stripe Integration (Stubs)
  // ==========================================================================

  /**
   * Create a Stripe Checkout session for upgrading to a paid tier.
   * Stub: returns a placeholder URL. Real implementation requires the `stripe` npm package.
   */
  async createCheckoutSession(
    cfg: BillingPluginConfig,
    userId: string,
    tier: BillingTier,
  ): Promise<{ url: string }> {
    if (!cfg.stripeKey) {
      log.warn(NS, "stripe not configured, returning placeholder checkout URL");
      return { url: `https://flowb.me/upgrade?tier=${tier}&user=${userId}` };
    }

    // TODO: Real Stripe integration
    // const stripe = new Stripe(cfg.stripeKey);
    // const sub = await this.getSubscription(cfg, userId);
    // const session = await stripe.checkout.sessions.create({
    //   customer: sub.stripe_customer_id || undefined,
    //   mode: 'subscription',
    //   line_items: [{ price: TIER_PRICE_IDS[tier], quantity: 1 }],
    //   success_url: 'https://flowb.me/billing?success=1',
    //   cancel_url: 'https://flowb.me/billing?cancelled=1',
    //   metadata: { user_id: userId, tier },
    // });
    // return { url: session.url! };

    log.info(NS, "createCheckoutSession stub", { userId, tier });
    return { url: `https://flowb.me/upgrade?tier=${tier}&user=${userId}` };
  }

  /**
   * Create a Stripe Customer Portal session for managing an existing subscription.
   * Stub: returns a placeholder URL.
   */
  async createPortalSession(
    cfg: BillingPluginConfig,
    userId: string,
  ): Promise<{ url: string }> {
    if (!cfg.stripeKey) {
      log.warn(NS, "stripe not configured, returning placeholder portal URL");
      return { url: `https://flowb.me/billing?user=${userId}` };
    }

    // TODO: Real Stripe integration
    // const stripe = new Stripe(cfg.stripeKey);
    // const sub = await this.getSubscription(cfg, userId);
    // if (!sub.stripe_customer_id) throw new Error('No Stripe customer');
    // const session = await stripe.billingPortal.sessions.create({
    //   customer: sub.stripe_customer_id,
    //   return_url: 'https://flowb.me/billing',
    // });
    // return { url: session.url };

    log.info(NS, "createPortalSession stub", { userId });
    return { url: `https://flowb.me/billing?user=${userId}` };
  }

  /**
   * Process a Stripe webhook event.
   * Handles subscription lifecycle events and updates the local subscription record.
   */
  async handleWebhook(
    cfg: BillingPluginConfig,
    event: { type: string; data: { object: Record<string, any> } },
  ): Promise<{ handled: boolean }> {
    const obj = event.data.object;

    switch (event.type) {
      case "checkout.session.completed": {
        const userId = obj.metadata?.user_id;
        const tier = (obj.metadata?.tier as BillingTier) || "pro";
        if (!userId) {
          log.warn(NS, "checkout.session.completed missing user_id metadata");
          return { handled: false };
        }

        await this.updateSubscription(cfg, userId, {
          tier,
          status: "active",
          stripe_customer_id: obj.customer || null,
          stripe_subscription_id: obj.subscription || null,
        });

        log.info(NS, "checkout completed", { userId, tier });
        return { handled: true };
      }

      case "customer.subscription.updated": {
        const customerId = obj.customer;
        if (!customerId) {
          log.warn(NS, "subscription.updated missing customer");
          return { handled: false };
        }

        // Look up user by stripe_customer_id
        const subs = await sbQuery<Subscription[]>(cfg, "flowb_subscriptions", {
          select: "user_id",
          stripe_customer_id: `eq.${customerId}`,
          limit: "1",
        });

        if (!subs?.length) {
          log.warn(NS, "subscription.updated: no user for customer", { customerId });
          return { handled: false };
        }

        const userId = subs[0].user_id;
        const updates: Record<string, any> = {
          status: obj.status || "active",
          cancel_at_period_end: obj.cancel_at_period_end || false,
        };

        if (obj.current_period_start) {
          updates.current_period_start = new Date(obj.current_period_start * 1000).toISOString();
        }
        if (obj.current_period_end) {
          updates.current_period_end = new Date(obj.current_period_end * 1000).toISOString();
        }

        await this.updateSubscription(cfg, userId, updates);
        log.info(NS, "subscription updated", { userId, status: updates.status });
        return { handled: true };
      }

      case "customer.subscription.deleted": {
        const customerId = obj.customer;
        if (!customerId) {
          log.warn(NS, "subscription.deleted missing customer");
          return { handled: false };
        }

        const subs = await sbQuery<Subscription[]>(cfg, "flowb_subscriptions", {
          select: "user_id",
          stripe_customer_id: `eq.${customerId}`,
          limit: "1",
        });

        if (!subs?.length) {
          log.warn(NS, "subscription.deleted: no user for customer", { customerId });
          return { handled: false };
        }

        const userId = subs[0].user_id;
        await this.updateSubscription(cfg, userId, {
          tier: "free",
          status: "canceled",
          stripe_subscription_id: null,
          cancel_at_period_end: false,
        });

        log.info(NS, "subscription canceled, reverted to free", { userId });
        return { handled: true };
      }

      default:
        log.debug(NS, "unhandled webhook event type", { type: event.type });
        return { handled: false };
    }
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Get usage count for a single feature in the current period.
   */
  private async getFeatureUsage(
    cfg: BillingPluginConfig,
    userId: string,
    feature: GatedFeature,
  ): Promise<number> {
    const period = getCurrentPeriod();

    const rows = await sbQuery<UsageRecord[]>(cfg, "flowb_usage_tracking", {
      select: "used",
      user_id: `eq.${userId}`,
      feature: `eq.${feature}`,
      period_start: `eq.${period.start}`,
      limit: "1",
    });

    return rows?.[0]?.used || 0;
  }

  // ==========================================================================
  // Formatted Responses (for bot/API actions)
  // ==========================================================================

  private async getMyPlanFormatted(cfg: BillingPluginConfig, userId?: string): Promise<string> {
    if (!userId) return "User ID required.";

    const usage = await this.getUsage(cfg, userId);
    const tierLabel = usage.tier.charAt(0).toUpperCase() + usage.tier.slice(1);

    const lines = [
      `**Your FlowB Plan: ${tierLabel}**\n`,
    ];

    for (const feat of GATED_FEATURES) {
      const { used, limit } = usage.features[feat];
      const featureLabel = feat.replace(/_/g, " ");
      if (limit === -1) {
        lines.push(`  ${featureLabel}: ${used} used (unlimited)`);
      } else {
        const remaining = Math.max(0, limit - used);
        lines.push(`  ${featureLabel}: ${used}/${limit} used (${remaining} remaining)`);
      }
    }

    if (usage.tier === "free") {
      lines.push(`\nUpgrade to Pro for unlimited access.`);
    }

    return lines.join("\n");
  }

  private async getUpgradeFormatted(cfg: BillingPluginConfig, userId?: string): Promise<string> {
    if (!userId) return "User ID required.";

    const tier = await this.getTier(cfg, userId);
    if (tier !== "free") {
      return `You're already on the **${tier.charAt(0).toUpperCase() + tier.slice(1)}** plan. Use /billing manage to update your subscription.`;
    }

    const { url } = await this.createCheckoutSession(cfg, userId, "pro");
    return [
      `**Upgrade to FlowB Pro**\n`,
      `Unlock unlimited AI chat, meetings, automations, leads, and boards.\n`,
      `Upgrade here: ${url}`,
    ].join("\n");
  }

  private async getManageFormatted(cfg: BillingPluginConfig, userId?: string): Promise<string> {
    if (!userId) return "User ID required.";

    const { url } = await this.createPortalSession(cfg, userId);
    return [
      `**Manage Your Subscription**\n`,
      `Update payment method, change plan, or cancel:\n${url}`,
    ].join("\n");
  }
}
