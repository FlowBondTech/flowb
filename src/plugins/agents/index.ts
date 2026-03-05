/**
 * Agents Plugin for FlowB
 *
 * Personal AI agents with x402-style micropayments.
 * Agent slots, skill purchases, event boosts, recommendations, tips.
 */

import type {
  FlowBPlugin,
  FlowBContext,
  ToolInput,
} from "../../core/types.js";
import { sbFetch, sbPost, sbPatchRaw, type SbConfig } from "../../utils/supabase.js";
import {
  SEED_BALANCE_USDC,
  DEFAULT_SKILLS,
  PRICING,
  CHAMPION_AWARD,
  PAYMENT_CONFIG,
  DEFAULT_BOOST_HOURS,
} from "./constants.js";

// ============================================================================
// Config
// ============================================================================

export interface AgentsPluginConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

// ============================================================================
// Result type for route handlers
// ============================================================================

export interface AgentResult {
  ok: boolean;
  data?: any;
  error?: string;
  status?: number;
  /** x402 payment-required headers */
  paymentHeaders?: Record<string, string>;
}

// ============================================================================
// Plugin
// ============================================================================

export class AgentsPlugin implements FlowBPlugin {
  id = "agents";
  name = "Agents";
  description = "Personal AI agents with micropayments";
  actions: Record<string, { description: string; requiresAuth?: boolean }> = {};

  private config: AgentsPluginConfig | null = null;

  configure(config: AgentsPluginConfig): void {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!(this.config?.supabaseUrl && this.config?.supabaseKey);
  }

  async execute(_action: string, _input: ToolInput, _context: FlowBContext): Promise<string> {
    return "Agent actions are handled via HTTP routes.";
  }

  // ==========================================================================
  // Shared Helpers
  // ==========================================================================

  /** Fetch the authenticated user's agent row. */
  async getMyAgent(cfg: SbConfig, userId: string, select = "*"): Promise<any | null> {
    const rows = await sbFetch<any[]>(cfg, `flowb_agents?user_id=eq.${userId}&select=${select}&limit=1`);
    return rows?.[0] || null;
  }

  /** PATCH an agent row (return=minimal). */
  async patchAgent(cfg: SbConfig, agentId: string, data: Record<string, any>, extraFilter?: string): Promise<boolean> {
    let path = `flowb_agents?id=eq.${agentId}`;
    if (extraFilter) path += `&${extraFilter}`;
    return sbPatchRaw(cfg, path, { ...data, updated_at: new Date().toISOString() });
  }

  /** Log an agent transaction. */
  async logTransaction(cfg: SbConfig, tx: Record<string, any>): Promise<void> {
    await sbPost(cfg, "flowb_agent_transactions", tx, "return=minimal");
  }

  /** Build a 402 payment-required result. */
  buildPaymentRequired(price: number, extra?: Record<string, any>): AgentResult {
    const payTo = process.env.CDP_ACCOUNT_ADDRESS || "";
    return {
      ok: false,
      status: 402,
      paymentHeaders: {
        "X-402-Price": price.toString(),
        "X-402-Currency": PAYMENT_CONFIG.currency,
        "X-402-Network": PAYMENT_CONFIG.network,
        "X-402-PayTo": payTo,
      },
      data: {
        error: "Payment required",
        price,
        currency: PAYMENT_CONFIG.currency,
        network: PAYMENT_CONFIG.network,
        payTo,
        ...extra,
      },
    };
  }

  // ==========================================================================
  // Business Logic
  // ==========================================================================

  /** GET /agents — list all agent slots (public) */
  async listAgents(cfg: SbConfig): Promise<AgentResult> {
    const agents = await sbFetch<any[]>(
      cfg,
      `flowb_agents?select=slot_number,user_id,agent_name,status,reserved_for,skills,usdc_balance,total_earned,total_spent,claimed_at&order=slot_number.asc`,
    );

    const skills = await sbFetch<any[]>(
      cfg,
      `flowb_agent_skills?active=eq.true&select=slug,name,description,price_usdc,category,capabilities&order=price_usdc.asc`,
    );

    // Resolve display names for claimed agents
    const claimedIds = (agents || []).filter((a: any) => a.user_id).map((a: any) => a.user_id);
    let nameMap = new Map<string, string>();
    if (claimedIds.length) {
      const sessions = await sbFetch<any[]>(
        cfg,
        `flowb_sessions?user_id=in.(${claimedIds.join(",")})&select=user_id,danz_username`,
      );
      nameMap = new Map((sessions || []).map((s: any) => [s.user_id, s.danz_username]));
    }

    return {
      ok: true,
      data: {
        agents: (agents || []).map((a: any) => ({
          slot: a.slot_number,
          userId: a.user_id || null,
          displayName: a.user_id ? nameMap.get(a.user_id) || null : null,
          agentName: a.agent_name || null,
          status: a.status,
          reservedFor: a.reserved_for || null,
          skills: a.skills || [],
          balance: Number(a.usdc_balance) || 0,
          totalEarned: Number(a.total_earned) || 0,
          totalSpent: Number(a.total_spent) || 0,
          claimedAt: a.claimed_at || null,
        })),
        skills: skills || [],
        stats: {
          total: (agents || []).length,
          claimed: (agents || []).filter((a: any) => a.status === "claimed" || a.status === "active").length,
          open: (agents || []).filter((a: any) => a.status === "open").length,
          reserved: (agents || []).filter((a: any) => a.status === "reserved").length,
        },
      },
    };
  }

  /** GET /agents/me — get user's agent + transactions */
  async getAgentForUser(cfg: SbConfig, userId: string): Promise<AgentResult> {
    const agent = await this.getMyAgent(cfg, userId);
    if (!agent) return { ok: true, data: { agent: null } };

    const txs = await sbFetch<any[]>(
      cfg,
      `flowb_agent_transactions?or=(from_agent_id.eq.${agent.id},to_agent_id.eq.${agent.id})&select=*&order=created_at.desc&limit=20`,
    );

    return {
      ok: true,
      data: {
        agent: {
          id: agent.id,
          slot: agent.slot_number,
          name: agent.agent_name,
          walletAddress: agent.wallet_address,
          status: agent.status,
          skills: agent.skills || [],
          balance: Number(agent.usdc_balance) || 0,
          totalEarned: Number(agent.total_earned) || 0,
          totalSpent: Number(agent.total_spent) || 0,
          metadata: agent.metadata || {},
          claimedAt: agent.claimed_at,
        },
        transactions: (txs || []).map((tx: any) => ({
          id: tx.id,
          type: tx.tx_type,
          amount: Number(tx.amount_usdc),
          skillSlug: tx.skill_slug,
          eventId: tx.event_id,
          txHash: tx.tx_hash,
          status: tx.status,
          direction: tx.from_agent_id === agent.id ? "out" : "in",
          createdAt: tx.created_at,
        })),
      },
    };
  }

  /** POST /agents/claim — claim an open agent slot (beta: auto-create if none open) */
  async claimSlot(cfg: SbConfig, userId: string, platform: string, agentName: string): Promise<AgentResult> {
    // Check if user already has an agent
    const existing = await this.getMyAgent(cfg, userId, "id,slot_number");
    if (existing) {
      return { ok: false, status: 409, error: "You already have an agent", data: { slot: existing.slot_number } };
    }

    const name = agentName.slice(0, 50);
    const now = new Date().toISOString();

    // Find first open slot
    const openSlots = await sbFetch<any[]>(
      cfg,
      `flowb_agents?status=eq.open&select=id,slot_number&order=slot_number.asc&limit=1`,
    );

    let agent: any;

    if (openSlots?.length) {
      const slot = openSlots[0];
      // Claim existing open slot — need the row back, so PATCH + re-query
      const patched = await this.patchAgent(cfg, slot.id, {
        user_id: userId,
        agent_name: name,
        status: "claimed",
        claimed_at: now,
        usdc_balance: SEED_BALANCE_USDC,
        skills: DEFAULT_SKILLS,
        metadata: { platform, claimedFrom: "app" },
      }, "status=eq.open");

      if (!patched) {
        return { ok: false, status: 500, error: "Failed to claim agent" };
      }

      // Re-query the claimed row
      const claimed = await sbFetch<any[]>(cfg, `flowb_agents?id=eq.${slot.id}&select=*&limit=1`);
      agent = claimed?.[0];
      if (!agent) {
        return { ok: false, status: 500, error: "Failed to claim agent" };
      }
    } else {
      // Beta mode: auto-create a new slot
      const allSlots = await sbFetch<any[]>(cfg, `flowb_agents?select=slot_number&order=slot_number.desc&limit=1`);
      const nextSlot = (allSlots?.[0]?.slot_number || 10) + 1;

      const created = await sbPost(cfg, "flowb_agents", {
        slot_number: nextSlot,
        user_id: userId,
        agent_name: name,
        status: "claimed",
        claimed_at: now,
        usdc_balance: SEED_BALANCE_USDC,
        skills: DEFAULT_SKILLS,
        metadata: { platform, claimedFrom: "app", beta: true },
      });

      agent = Array.isArray(created) ? created[0] : created;
      if (!agent?.id) {
        return { ok: false, status: 500, error: "Failed to create agent slot" };
      }
    }

    // Log seed transaction
    await this.logTransaction(cfg, {
      to_agent_id: agent.id,
      to_user_id: userId,
      amount_usdc: SEED_BALANCE_USDC,
      tx_type: "seed",
      status: "completed",
      metadata: { reason: "SXSW launch seed" },
    });

    console.log(`[agents] ${userId} claimed slot #${agent.slot_number} as "${name}"`);

    return {
      ok: true,
      data: {
        agent: {
          id: agent.id,
          slot: agent.slot_number,
          name: agent.agent_name,
          status: "claimed",
          balance: SEED_BALANCE_USDC,
          skills: DEFAULT_SKILLS,
        },
      },
    };
  }

  /** POST /agents/skills/purchase — buy a skill (x402-style) */
  async purchaseSkill(cfg: SbConfig, userId: string, skillSlug: string, hasPayment: boolean): Promise<AgentResult> {
    const agent = await this.getMyAgent(cfg, userId);
    if (!agent) return { ok: false, status: 404, error: "No agent found. Claim one first." };

    const currentSkills: string[] = agent.skills || [];
    if (currentSkills.includes(skillSlug)) {
      return { ok: false, status: 409, error: "Agent already has this skill" };
    }

    // Get skill details
    const skills = await sbFetch<any[]>(
      cfg,
      `flowb_agent_skills?slug=eq.${skillSlug}&active=eq.true&select=*&limit=1`,
    );
    const skill = skills?.[0];
    if (!skill) return { ok: false, status: 404, error: "Skill not found" };

    const price = Number(skill.price_usdc);
    const balance = Number(agent.usdc_balance);

    // x402-style: if no payment header, return 402 with price info
    if (!hasPayment && balance < price) {
      return this.buildPaymentRequired(price, {
        skill: { slug: skill.slug, name: skill.name, description: skill.description },
      });
    }

    // Deduct from agent balance
    const newBalance = balance - price;
    const updatedSkills = [...currentSkills, skillSlug];

    await this.patchAgent(cfg, agent.id, {
      skills: updatedSkills,
      usdc_balance: newBalance,
      total_spent: (Number(agent.total_spent) || 0) + price,
    });

    await this.logTransaction(cfg, {
      from_agent_id: agent.id,
      from_user_id: userId,
      amount_usdc: price,
      tx_type: "skill_purchase",
      skill_slug: skillSlug,
      status: "completed",
      metadata: { skillName: skill.name },
    });

    console.log(`[agents] ${userId} purchased skill "${skillSlug}" for $${price}`);

    return {
      ok: true,
      data: {
        skill: { slug: skill.slug, name: skill.name, capabilities: skill.capabilities },
        agent: {
          balance: newBalance,
          skills: updatedSkills,
          totalSpent: (Number(agent.total_spent) || 0) + price,
        },
      },
    };
  }

  /** POST /agents/boost-event — boost an event (x402 micropayment) */
  async boostEvent(cfg: SbConfig, userId: string, eventId: string, hours?: number): Promise<AgentResult> {
    const agent = await this.getMyAgent(cfg, userId);
    if (!agent) return { ok: false, status: 404, error: "No agent found" };

    const price = PRICING.EVENT_BOOST;
    const balance = Number(agent.usdc_balance);
    const duration = hours || DEFAULT_BOOST_HOURS;

    if (balance < price) {
      return this.buildPaymentRequired(price, { eventId });
    }

    const expiresAt = new Date(Date.now() + duration * 3600_000).toISOString();

    // Create boost
    await sbPost(cfg, "flowb_event_boosts", {
      event_id: eventId,
      agent_id: agent.id,
      user_id: userId,
      amount_usdc: price,
      agent_name: agent.agent_name,
      expires_at: expiresAt,
      active: true,
    }, "return=minimal");

    // Deduct balance
    await this.patchAgent(cfg, agent.id, {
      usdc_balance: balance - price,
      total_spent: (Number(agent.total_spent) || 0) + price,
    });

    await this.logTransaction(cfg, {
      from_agent_id: agent.id,
      from_user_id: userId,
      amount_usdc: price,
      tx_type: "event_boost",
      event_id: eventId,
      status: "completed",
      metadata: { durationHours: duration },
    });

    console.log(`[agents] ${userId} boosted event "${eventId}" for $${price}`);

    return {
      ok: true,
      data: {
        boost: { eventId, expiresAt, price, agentName: agent.agent_name },
        agent: { balance: balance - price },
      },
    };
  }

  /** POST /agents/recommend — agent-to-agent recommendation (x402) */
  async recommend(
    cfg: SbConfig,
    userId: string,
    targetUserId: string,
    context?: string,
    preferences?: string[],
  ): Promise<AgentResult> {
    const myAgent = await this.getMyAgent(cfg, userId);
    if (!myAgent) return { ok: false, status: 404, error: "You need an agent to request recommendations" };

    const targetAgent = await this.getMyAgent(cfg, targetUserId);
    if (!targetAgent) return { ok: false, status: 404, error: "Target user has no agent" };

    const price = PRICING.RECOMMENDATION;
    const balance = Number(myAgent.usdc_balance);

    if (balance < price) {
      return this.buildPaymentRequired(price);
    }

    // Get target user's recent activity for recommendations
    const targetSchedule = await sbFetch<any[]>(
      cfg,
      `flowb_schedules?user_id=eq.${targetUserId}&rsvp_status=eq.going&select=event_title,event_source_id,venue_name,starts_at&order=starts_at.asc&limit=5`,
    );

    const targetCheckins = await sbFetch<any[]>(
      cfg,
      `flowb_checkins?user_id=eq.${targetUserId}&select=venue_name,status,created_at&order=created_at.desc&limit=3`,
    );

    // Build recommendations from target's social graph
    const recommendations = (targetSchedule || []).map((s: any) => ({
      event: s.event_title,
      eventId: s.event_source_id,
      venue: s.venue_name,
      startsAt: s.starts_at,
      reason: `${targetAgent.agent_name} is going`,
    }));

    if (targetCheckins?.length) {
      recommendations.unshift({
        event: `${targetAgent.agent_name} is at ${targetCheckins[0].venue_name}`,
        eventId: null as any,
        venue: targetCheckins[0].venue_name,
        startsAt: targetCheckins[0].created_at,
        reason: "Currently checked in",
      });
    }

    // Deduct from requester, credit to target
    await Promise.all([
      this.patchAgent(cfg, myAgent.id, {
        usdc_balance: balance - price,
        total_spent: (Number(myAgent.total_spent) || 0) + price,
      }),
      this.patchAgent(cfg, targetAgent.id, {
        usdc_balance: Number(targetAgent.usdc_balance) + price,
        total_earned: (Number(targetAgent.total_earned) || 0) + price,
      }),
    ]);

    await this.logTransaction(cfg, {
      from_agent_id: myAgent.id,
      to_agent_id: targetAgent.id,
      from_user_id: userId,
      to_user_id: targetUserId,
      amount_usdc: price,
      tx_type: "recommendation",
      status: "completed",
      metadata: { context, preferences },
    });

    console.log(`[agents] ${userId} got recommendations from ${targetUserId}'s agent for $${price}`);

    return {
      ok: true,
      data: {
        from: { agentName: targetAgent.agent_name, userId: targetUserId },
        recommendations,
        price,
        myBalance: balance - price,
      },
    };
  }

  /** POST /agents/tip — send a tip to another user/agent */
  async sendTip(
    cfg: SbConfig,
    userId: string,
    recipientUserId: string,
    amount: number,
    eventId?: string,
    message?: string,
  ): Promise<AgentResult> {
    if (!recipientUserId || !amount || amount <= 0) {
      return { ok: false, status: 400, error: "recipientUserId and positive amount required" };
    }
    if (amount > PRICING.TIP_MAX) {
      return { ok: false, status: 400, error: `Max tip is $${PRICING.TIP_MAX}` };
    }

    const myAgent = await this.getMyAgent(cfg, userId);
    if (!myAgent) return { ok: false, status: 404, error: "You need an agent" };

    const balance = Number(myAgent.usdc_balance);
    if (balance < amount) {
      return { ok: false, status: 402, data: { error: "Insufficient balance", balance, required: amount } };
    }

    const recipientAgent = await this.getMyAgent(cfg, recipientUserId);

    // Deduct from sender
    await this.patchAgent(cfg, myAgent.id, {
      usdc_balance: balance - amount,
      total_spent: (Number(myAgent.total_spent) || 0) + amount,
    });

    // Credit recipient agent (if they have one)
    if (recipientAgent) {
      await this.patchAgent(cfg, recipientAgent.id, {
        usdc_balance: Number(recipientAgent.usdc_balance) + amount,
        total_earned: (Number(recipientAgent.total_earned) || 0) + amount,
      });
    }

    await this.logTransaction(cfg, {
      from_agent_id: myAgent.id,
      to_agent_id: recipientAgent?.id || null,
      from_user_id: userId,
      to_user_id: recipientUserId,
      amount_usdc: amount,
      tx_type: "tip",
      event_id: eventId || null,
      status: "completed",
      metadata: { message: message || null },
    });

    console.log(`[agents] ${userId} tipped ${recipientUserId} $${amount}`);

    return {
      ok: true,
      data: {
        tip: { recipient: recipientUserId, amount, eventId },
        myBalance: balance - amount,
      },
    };
  }

  /** GET /agents/boosts — active event boosts for feed ranking */
  async getActiveBoosts(cfg: SbConfig): Promise<AgentResult> {
    const now = new Date().toISOString();
    const boosts = await sbFetch<any[]>(
      cfg,
      `flowb_event_boosts?active=eq.true&expires_at=gt.${now}&select=event_id,agent_name,user_id,amount_usdc,expires_at&order=created_at.desc`,
    );
    return { ok: true, data: { boosts: boosts || [] } };
  }

  /** GET /agents/transactions — public transaction history */
  async getTransactions(cfg: SbConfig, limit: number): Promise<AgentResult> {
    const txs = await sbFetch<any[]>(
      cfg,
      `flowb_agent_transactions?select=id,from_user_id,to_user_id,amount_usdc,tx_type,skill_slug,event_id,status,created_at&order=created_at.desc&limit=${limit}`,
    );
    return { ok: true, data: { transactions: txs || [] } };
  }

  /** POST /agents/award-top-scorer — admin: award champion slots to top points user */
  async awardTopScorer(cfg: SbConfig): Promise<AgentResult> {
    const topUsers = await sbFetch<any[]>(
      cfg,
      `flowb_user_points?select=user_id,platform,total_points&order=total_points.desc&limit=1`,
    );
    if (!topUsers?.length) return { ok: false, status: 404, error: "No users with points" };

    const topUser = topUsers[0];

    // Assign reserved champion slots
    for (const slot of CHAMPION_AWARD.SLOTS) {
      await sbPatchRaw(
        cfg,
        `flowb_agents?slot_number=eq.${slot}&status=eq.reserved`,
        {
          user_id: topUser.user_id,
          agent_name: slot === 9
            ? `${topUser.user_id.replace(/^(telegram_|farcaster_)/, "")}'s Champion`
            : `${topUser.user_id.replace(/^(telegram_|farcaster_)/, "")}'s Gift`,
          status: "active",
          claimed_at: new Date().toISOString(),
          usdc_balance: slot === 9 ? CHAMPION_AWARD.PRIZE_USDC : SEED_BALANCE_USDC,
          skills: CHAMPION_AWARD.SKILLS,
          metadata: { awardedFor: "top_points", points: topUser.total_points },
          updated_at: new Date().toISOString(),
        },
      );
    }

    await this.logTransaction(cfg, {
      to_user_id: topUser.user_id,
      amount_usdc: CHAMPION_AWARD.PRIZE_USDC,
      tx_type: "prize",
      status: "completed",
      metadata: { reason: "Top points scorer - 2 agents + $25 USDC", points: topUser.total_points },
    });

    console.log(`[agents] Awarded slots 9+10 to top scorer: ${topUser.user_id} (${topUser.total_points} pts)`);

    return {
      ok: true,
      data: {
        winner: { userId: topUser.user_id, points: topUser.total_points },
        awarded: { slots: [...CHAMPION_AWARD.SLOTS], usdcPrize: CHAMPION_AWARD.PRIZE_USDC },
      },
    };
  }

  /** POST /agents/blast — admin: notification blast to all users */
  async blastNotification(cfg: SbConfig, message: string): Promise<AgentResult> {
    const blastMessage = message || `First Flow, First Bond

FlowB is giving away 8 personal AI agents!

Your agent gets a wallet, discovers events, earns USDC, and trades skills with other agents.

Top points scorer gets 2 agents + $25 USDC!

Claim yours in the app now. Only 8 slots available.`;

    // Get all users from sessions and points tables
    const sessions = await sbFetch<any[]>(cfg, `flowb_sessions?select=user_id`);
    const points = await sbFetch<any[]>(cfg, `flowb_user_points?select=user_id`);

    const allUserIds = new Set<string>();
    for (const s of sessions || []) allUserIds.add(s.user_id);
    for (const p of points || []) allUserIds.add(p.user_id);

    const botToken = process.env.FLOWB_TELEGRAM_BOT_TOKEN;
    let tgSent = 0;
    let fcSent = 0;
    let errors = 0;

    for (const uid of allUserIds) {
      try {
        if (uid.startsWith("telegram_") && botToken) {
          const chatId = parseInt(uid.replace("telegram_", ""), 10);
          if (!isNaN(chatId)) {
            const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, text: blastMessage, parse_mode: "HTML" }),
            });
            if (res.ok) tgSent++;
            else errors++;
          }
        }

        if (uid.startsWith("farcaster_")) {
          const fid = parseInt(uid.replace("farcaster_", ""), 10);
          if (!isNaN(fid)) {
            const { sendFarcasterNotification: sendFcNotif } = await import("../../services/farcaster-notify.js");
            const appUrl = process.env.FLOWB_FC_APP_URL || "https://farcaster.xyz/miniapps/oCHuaUqL5dRT/flowb";
            const ok = await sendFcNotif(cfg, fid, "FlowB Agents — Claim Yours", blastMessage.slice(0, 120), appUrl);
            if (ok) fcSent++;
            else errors++;
          }
        }
      } catch {
        errors++;
      }
    }

    console.log(`[agents] Blast sent: TG=${tgSent}, FC=${fcSent}, errors=${errors}, total_users=${allUserIds.size}`);

    return {
      ok: true,
      data: {
        sent: { telegram: tgSent, farcaster: fcSent, total: tgSent + fcSent },
        errors,
        totalUsers: allUserIds.size,
      },
    };
  }
}
