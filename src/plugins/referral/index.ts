import type { FlowBPlugin, FlowBContext, ToolInput } from "../../core/types.js";
import { sbQuery, sbInsert, sbPatch, type SbConfig } from "../../utils/supabase.js";
import { log } from "../../utils/logger.js";

// ============================================================================
// Types
// ============================================================================

export interface ReferralPluginConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export interface ReferralProgram {
  id: string;
  event_id: string;
  organizer_id: string;
  commission_rate: number;
  commission_type: string;
  fixed_amount: number | null;
  max_commission_per_ticket: number | null;
  max_total_payout: number | null;
  total_paid_out: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface ReferralEngagement {
  id: string;
  user_id: string;
  event_id: string;
  crew_id: string | null;
  action: string;
  weight: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ReferralLink {
  id: string;
  event_id: string;
  creator_id: string;
  crew_id: string | null;
  short_code: string;
  link_type: string;
  clicks: number;
  conversions: number;
  created_at: string;
}

export interface ReferralClick {
  id: string;
  link_id: string;
  visitor_id: string | null;
  visitor_fingerprint: string | null;
  referrer_url: string | null;
  created_at: string;
}

export interface ReferralCommission {
  id: string;
  program_id: string;
  event_id: string;
  ticket_ref: string;
  ticket_price: number;
  total_commission: number;
  status: string;
  buyer_id: string | null;
  source_link_id: string | null;
  source_crew_id: string | null;
  created_at: string;
}

export interface ReferralSplit {
  id: string;
  commission_id: string;
  user_id: string;
  engagement_weight: number;
  share_percentage: number;
  amount: number;
  status: string;
  created_at: string;
}

export interface ReferralPayout {
  id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  payment_ref: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

// ============================================================================
// Constants
// ============================================================================

const CODE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

const ACTION_WEIGHTS: Record<string, number> = {
  rsvp_going: 5,
  invite: 5,
  share: 4,
  social_post: 4,
  rsvp_maybe: 3,
  chat_mention: 3,
  checkin: 3,
  comment: 2,
  view: 1,
};

// ============================================================================
// Helpers
// ============================================================================

function generateCode(length = 8): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function flowbLink(prefix: string, code: string): string {
  const domain = process.env.FLOWB_DOMAIN;
  if (domain) return `https://${domain}/${prefix}/${code}`;
  const botUsername = process.env.FLOWB_BOT_USERNAME || "Flow_b_bot";
  return `https://t.me/${botUsername}?start=${prefix}_${code}`;
}

// ============================================================================
// Referral Program CRUD
// ============================================================================

export async function createProgram(
  cfg: SbConfig,
  userId: string,
  eventId: string,
  commissionRate: number,
  options?: {
    commissionType?: string;
    fixedAmount?: number;
    maxCommissionPerTicket?: number;
    maxTotalPayout?: number;
    startsAt?: string;
    expiresAt?: string;
  },
): Promise<ReferralProgram | null> {
  return sbInsert<ReferralProgram>(cfg, "flowb_referral_programs", {
    event_id: eventId,
    organizer_id: userId,
    commission_rate: commissionRate,
    commission_type: options?.commissionType || "percentage",
    fixed_amount: options?.fixedAmount || null,
    max_commission_per_ticket: options?.maxCommissionPerTicket || null,
    max_total_payout: options?.maxTotalPayout || null,
    starts_at: options?.startsAt || null,
    expires_at: options?.expiresAt || null,
  });
}

export async function getProgram(cfg: SbConfig, eventId: string): Promise<ReferralProgram | null> {
  const rows = await sbQuery<ReferralProgram[]>(cfg, "flowb_referral_programs", {
    select: "*",
    event_id: `eq.${eventId}`,
    is_active: "eq.true",
    order: "created_at.desc",
    limit: "1",
  });
  return rows?.[0] || null;
}

export async function updateProgram(
  cfg: SbConfig,
  userId: string,
  programId: string,
  updates: Partial<Pick<ReferralProgram, "commission_rate" | "commission_type" | "fixed_amount" | "max_commission_per_ticket" | "max_total_payout" | "is_active" | "starts_at" | "expires_at">>,
): Promise<boolean> {
  const rows = await sbQuery<ReferralProgram[]>(cfg, "flowb_referral_programs", {
    select: "id,organizer_id",
    id: `eq.${programId}`,
    limit: "1",
  });
  if (!rows?.length) return false;
  if (rows[0].organizer_id !== userId) return false;
  return sbPatch(cfg, "flowb_referral_programs", { id: `eq.${programId}` }, updates);
}

// ============================================================================
// Engagement Tracking
// ============================================================================

export async function trackEngagement(
  cfg: SbConfig,
  userId: string,
  eventId: string,
  action: string,
  crewId?: string,
  metadata?: Record<string, unknown>,
): Promise<ReferralEngagement | null> {
  const weight = ACTION_WEIGHTS[action];
  if (!weight) {
    log.warn("[referral]", "unknown engagement action", { action });
    return null;
  }
  return sbInsert<ReferralEngagement>(cfg, "flowb_referral_engagement", {
    user_id: userId,
    event_id: eventId,
    crew_id: crewId || null,
    action,
    weight,
    metadata: metadata || {},
  });
}

export async function getEventEngagement(cfg: SbConfig, eventId: string): Promise<ReferralEngagement[]> {
  const rows = await sbQuery<ReferralEngagement[]>(cfg, "flowb_referral_engagement", {
    select: "*",
    event_id: `eq.${eventId}`,
    order: "created_at.desc",
  });
  return rows || [];
}

// ============================================================================
// Referral Links
// ============================================================================

export async function getOrCreateLink(
  cfg: SbConfig,
  userId: string,
  eventId: string,
  crewId?: string,
): Promise<ReferralLink | null> {
  const filter: Record<string, string> = {
    select: "*",
    event_id: `eq.${eventId}`,
    creator_id: `eq.${userId}`,
    limit: "1",
  };
  if (crewId) filter.crew_id = `eq.${crewId}`;
  else filter.crew_id = "is.null";

  const existing = await sbQuery<ReferralLink[]>(cfg, "flowb_referral_links", filter);
  if (existing?.length) return existing[0];

  const code = generateCode(8);
  return sbInsert<ReferralLink>(cfg, "flowb_referral_links", {
    event_id: eventId,
    creator_id: userId,
    crew_id: crewId || null,
    short_code: code,
    link_type: "event",
  });
}

export async function trackClick(
  cfg: SbConfig,
  linkCode: string,
  visitorId?: string,
  fingerprint?: string,
  referrer?: string,
): Promise<boolean> {
  const link = await resolveLink(cfg, linkCode);
  if (!link) return false;

  await sbInsert(cfg, "flowb_referral_clicks", {
    link_id: link.id,
    visitor_id: visitorId || null,
    visitor_fingerprint: fingerprint || null,
    referrer_url: referrer || null,
  });

  await sbPatch(
    cfg,
    "flowb_referral_links",
    { id: `eq.${link.id}` },
    { clicks: link.clicks + 1 },
  );

  return true;
}

export async function resolveLink(cfg: SbConfig, code: string): Promise<ReferralLink | null> {
  const rows = await sbQuery<ReferralLink[]>(cfg, "flowb_referral_links", {
    select: "*",
    short_code: `eq.${code}`,
    limit: "1",
  });
  return rows?.[0] || null;
}

export function getReferralUrl(code: string): string {
  return flowbLink("r", code);
}

// ============================================================================
// Commission Calculation
// ============================================================================

export async function processTicketSale(
  cfg: SbConfig,
  eventId: string,
  ticketRef: string,
  ticketPrice: number,
  buyerId?: string,
  sourceLinkId?: string,
): Promise<ReferralCommission | null> {
  const program = await getProgram(cfg, eventId);
  if (!program) {
    log.debug("[referral]", "no active program for event", { eventId });
    return null;
  }

  let totalCommission: number;
  if (program.commission_type === "fixed_amount" && program.fixed_amount) {
    totalCommission = program.fixed_amount;
  } else {
    totalCommission = ticketPrice * Number(program.commission_rate);
  }

  if (program.max_commission_per_ticket) {
    totalCommission = Math.min(totalCommission, Number(program.max_commission_per_ticket));
  }

  if (program.max_total_payout) {
    const remaining = Number(program.max_total_payout) - Number(program.total_paid_out);
    if (remaining <= 0) {
      log.info("[referral]", "program payout cap reached", { eventId, programId: program.id });
      return null;
    }
    totalCommission = Math.min(totalCommission, remaining);
  }

  let sourceCrewId: string | null = null;
  if (sourceLinkId) {
    const links = await sbQuery<ReferralLink[]>(cfg, "flowb_referral_links", {
      select: "crew_id",
      id: `eq.${sourceLinkId}`,
      limit: "1",
    });
    sourceCrewId = links?.[0]?.crew_id || null;
  }

  const commission = await sbInsert<ReferralCommission>(cfg, "flowb_referral_commissions", {
    program_id: program.id,
    event_id: eventId,
    ticket_ref: ticketRef,
    ticket_price: ticketPrice,
    total_commission: totalCommission,
    status: "pending",
    buyer_id: buyerId || null,
    source_link_id: sourceLinkId || null,
    source_crew_id: sourceCrewId,
  });

  if (!commission) return null;

  const engagement = await getEventEngagement(cfg, eventId);
  if (!engagement.length) {
    log.info("[referral]", "no engagement to split commission", { eventId });
    return commission;
  }

  const totalWeight = engagement.reduce((sum, e) => sum + e.weight, 0);
  if (totalWeight === 0) return commission;

  const userWeights = new Map<string, number>();
  for (const e of engagement) {
    userWeights.set(e.user_id, (userWeights.get(e.user_id) || 0) + e.weight);
  }

  for (const [userId, weight] of userWeights) {
    const sharePct = weight / totalWeight;
    const amount = Math.round(totalCommission * sharePct * 100) / 100;
    if (amount <= 0) continue;

    await sbInsert(cfg, "flowb_referral_splits", {
      commission_id: commission.id,
      user_id: userId,
      engagement_weight: weight,
      share_percentage: sharePct,
      amount,
      status: "pending",
    });
  }

  await sbPatch(
    cfg,
    "flowb_referral_commissions",
    { id: `eq.${commission.id}` },
    { status: "distributed" },
  );

  await sbPatch(
    cfg,
    "flowb_referral_programs",
    { id: `eq.${program.id}` },
    { total_paid_out: Number(program.total_paid_out) + totalCommission },
  );

  if (sourceLinkId) {
    const links = await sbQuery<ReferralLink[]>(cfg, "flowb_referral_links", {
      select: "id,conversions",
      id: `eq.${sourceLinkId}`,
      limit: "1",
    });
    if (links?.[0]) {
      await sbPatch(
        cfg,
        "flowb_referral_links",
        { id: `eq.${sourceLinkId}` },
        { conversions: links[0].conversions + 1 },
      );
    }
  }

  log.info("[referral]", "commission distributed", {
    eventId,
    commissionId: commission.id,
    total: totalCommission,
    splits: userWeights.size,
  });

  return commission;
}

export async function getUserEarnings(cfg: SbConfig, userId: string): Promise<{ total: number; pending: number }> {
  const splits = await sbQuery<ReferralSplit[]>(cfg, "flowb_referral_splits", {
    select: "amount,status",
    user_id: `eq.${userId}`,
  });
  if (!splits?.length) return { total: 0, pending: 0 };

  let total = 0;
  let pending = 0;
  for (const s of splits) {
    total += Number(s.amount);
    if (s.status === "pending") pending += Number(s.amount);
  }
  return { total: Math.round(total * 100) / 100, pending: Math.round(pending * 100) / 100 };
}

export async function getCrewEarnings(
  cfg: SbConfig,
  crewId: string,
): Promise<{ total: number; byEvent: Record<string, number> }> {
  const engagement = await sbQuery<ReferralEngagement[]>(cfg, "flowb_referral_engagement", {
    select: "user_id,event_id",
    crew_id: `eq.${crewId}`,
  });
  if (!engagement?.length) return { total: 0, byEvent: {} };

  const userIds = [...new Set(engagement.map((e) => e.user_id))];
  const eventIds = [...new Set(engagement.map((e) => e.event_id))];

  const splits = await sbQuery<(ReferralSplit & { commission_event_id?: string })[]>(
    cfg,
    "flowb_referral_splits",
    {
      select: "amount,user_id,commission_id",
      user_id: `in.(${userIds.join(",")})`,
    },
  );
  if (!splits?.length) return { total: 0, byEvent: {} };

  const commissionIds = [...new Set(splits.map((s) => s.commission_id))];
  const commissions = await sbQuery<ReferralCommission[]>(cfg, "flowb_referral_commissions", {
    select: "id,event_id",
    id: `in.(${commissionIds.join(",")})`,
  });
  const commissionEventMap = new Map<string, string>();
  for (const c of commissions || []) commissionEventMap.set(c.id, c.event_id);

  let total = 0;
  const byEvent: Record<string, number> = {};
  for (const s of splits) {
    const eid = commissionEventMap.get(s.commission_id);
    if (!eid || !eventIds.includes(eid)) continue;
    const amt = Number(s.amount);
    total += amt;
    byEvent[eid] = (byEvent[eid] || 0) + amt;
  }

  return {
    total: Math.round(total * 100) / 100,
    byEvent: Object.fromEntries(
      Object.entries(byEvent).map(([k, v]) => [k, Math.round(v * 100) / 100]),
    ),
  };
}

export async function getCommissionHistory(
  cfg: SbConfig,
  userId: string,
  limit = 20,
): Promise<ReferralSplit[]> {
  const rows = await sbQuery<ReferralSplit[]>(cfg, "flowb_referral_splits", {
    select: "*",
    user_id: `eq.${userId}`,
    order: "created_at.desc",
    limit: String(limit),
  });
  return rows || [];
}

// ============================================================================
// Payout Processing
// ============================================================================

export async function requestPayout(
  cfg: SbConfig,
  userId: string,
  amount: number,
  paymentMethod: string,
): Promise<ReferralPayout | null> {
  const validMethods = ["usdc_wallet", "stripe", "points_conversion", "flowb_credit"];
  if (!validMethods.includes(paymentMethod)) {
    log.warn("[referral]", "invalid payment method", { paymentMethod });
    return null;
  }

  const earnings = await getUserEarnings(cfg, userId);
  if (earnings.pending < amount) {
    log.warn("[referral]", "insufficient pending balance", {
      userId,
      requested: amount,
      available: earnings.pending,
    });
    return null;
  }

  const payout = await sbInsert<ReferralPayout>(cfg, "flowb_referral_payouts", {
    user_id: userId,
    amount,
    payment_method: paymentMethod,
    status: "pending",
  });

  if (!payout) return null;

  const pendingSplits = await sbQuery<ReferralSplit[]>(cfg, "flowb_referral_splits", {
    select: "id,amount",
    user_id: `eq.${userId}`,
    status: "eq.pending",
    order: "created_at.asc",
  });

  let remaining = amount;
  for (const split of pendingSplits || []) {
    if (remaining <= 0) break;
    const splitAmt = Number(split.amount);
    if (splitAmt <= remaining) {
      await sbPatch(cfg, "flowb_referral_splits", { id: `eq.${split.id}` }, { status: "withdrawn" });
      remaining -= splitAmt;
    }
  }

  return payout;
}

export async function getPayoutHistory(cfg: SbConfig, userId: string): Promise<ReferralPayout[]> {
  const rows = await sbQuery<ReferralPayout[]>(cfg, "flowb_referral_payouts", {
    select: "*",
    user_id: `eq.${userId}`,
    order: "created_at.desc",
    limit: "50",
  });
  return rows || [];
}

// ============================================================================
// Plugin Class
// ============================================================================

export class ReferralPlugin implements FlowBPlugin {
  id = "referral";
  name = "Referral & Commissions";
  description = "Event referral programs with engagement-weighted commission splits";

  actions: Record<string, { description: string; requiresAuth?: boolean }> = {
    "referral-create-program":   { description: "Create a referral program for an event", requiresAuth: true },
    "referral-get-program":      { description: "Get referral program for an event", requiresAuth: false },
    "referral-update-program":   { description: "Update a referral program", requiresAuth: true },
    "referral-track-engagement": { description: "Track user engagement with an event", requiresAuth: true },
    "referral-get-link":         { description: "Get or create a referral link", requiresAuth: true },
    "referral-track-click":      { description: "Track a referral link click", requiresAuth: false },
    "referral-resolve-link":     { description: "Resolve a referral link code", requiresAuth: false },
    "referral-process-sale":     { description: "Process a ticket sale commission", requiresAuth: true },
    "referral-user-earnings":    { description: "Get user earnings summary", requiresAuth: true },
    "referral-crew-earnings":    { description: "Get crew earnings breakdown", requiresAuth: true },
    "referral-history":          { description: "Get commission history", requiresAuth: true },
    "referral-request-payout":   { description: "Request a payout", requiresAuth: true },
    "referral-payout-history":   { description: "Get payout history", requiresAuth: true },
  };

  private config: ReferralPluginConfig | null = null;

  configure(config: ReferralPluginConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!(this.config?.supabaseUrl && this.config?.supabaseKey);
  }

  async execute(action: string, input: ToolInput, context: FlowBContext): Promise<string> {
    const cfg = this.config;
    if (!cfg) return "Referral plugin not configured.";
    const uid = input.user_id;

    switch (action) {
      case "referral-create-program":
        return this.handleCreateProgram(cfg, uid, input);
      case "referral-get-program":
        return this.handleGetProgram(cfg, input);
      case "referral-update-program":
        return this.handleUpdateProgram(cfg, uid, input);
      case "referral-track-engagement":
        return this.handleTrackEngagement(cfg, uid, input);
      case "referral-get-link":
        return this.handleGetLink(cfg, uid, input);
      case "referral-track-click":
        return this.handleTrackClick(cfg, input);
      case "referral-resolve-link":
        return this.handleResolveLink(cfg, input);
      case "referral-process-sale":
        return this.handleProcessSale(cfg, input);
      case "referral-user-earnings":
        return this.handleUserEarnings(cfg, uid);
      case "referral-crew-earnings":
        return this.handleCrewEarnings(cfg, input);
      case "referral-history":
        return this.handleHistory(cfg, uid, input);
      case "referral-request-payout":
        return this.handleRequestPayout(cfg, uid, input);
      case "referral-payout-history":
        return this.handlePayoutHistory(cfg, uid);
      default:
        return `Unknown referral action: ${action}`;
    }
  }

  // --------------------------------------------------------------------------
  // Action Handlers
  // --------------------------------------------------------------------------

  private async handleCreateProgram(cfg: SbConfig, uid: string | undefined, input: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";
    if (!input.event_id) return "Event ID required.";

    const rate = (input as any).commission_rate ?? 0.10;
    const program = await createProgram(cfg, uid, input.event_id, rate, {
      commissionType: (input as any).commission_type,
      fixedAmount: (input as any).fixed_amount,
      maxCommissionPerTicket: (input as any).max_commission_per_ticket,
      maxTotalPayout: (input as any).max_total_payout,
      startsAt: (input as any).starts_at,
      expiresAt: (input as any).expires_at,
    });

    if (!program) return "Failed to create referral program.";
    return JSON.stringify({ type: "referral_program_created", program });
  }

  private async handleGetProgram(cfg: SbConfig, input: ToolInput): Promise<string> {
    if (!input.event_id) return "Event ID required.";
    const program = await getProgram(cfg, input.event_id);
    if (!program) return "No active referral program for this event.";
    return JSON.stringify({ type: "referral_program", program });
  }

  private async handleUpdateProgram(cfg: SbConfig, uid: string | undefined, input: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";
    const programId = (input as any).program_id;
    if (!programId) return "Program ID required.";

    const updates: Record<string, any> = {};
    if ((input as any).commission_rate !== undefined) updates.commission_rate = (input as any).commission_rate;
    if ((input as any).commission_type) updates.commission_type = (input as any).commission_type;
    if ((input as any).is_active !== undefined) updates.is_active = (input as any).is_active;
    if ((input as any).max_total_payout !== undefined) updates.max_total_payout = (input as any).max_total_payout;

    if (!Object.keys(updates).length) return "No updates provided.";

    const ok = await updateProgram(cfg, uid, programId, updates);
    if (!ok) return "Failed to update program. Check ownership.";
    return "Referral program updated.";
  }

  private async handleTrackEngagement(cfg: SbConfig, uid: string | undefined, input: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";
    if (!input.event_id) return "Event ID required.";

    const action = (input as any).engagement_action || (input as any).action;
    if (!action) return "Engagement action required.";

    const crewId = (input as any).crew_id || input.group_id;
    const result = await trackEngagement(cfg, uid, input.event_id, action, crewId, (input as any).metadata);
    if (!result) return "Invalid engagement action.";
    return JSON.stringify({ type: "engagement_tracked", engagement: result });
  }

  private async handleGetLink(cfg: SbConfig, uid: string | undefined, input: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";
    if (!input.event_id) return "Event ID required.";

    const crewId = (input as any).crew_id || input.group_id;
    const link = await getOrCreateLink(cfg, uid, input.event_id, crewId);
    if (!link) return "Failed to create referral link.";

    return JSON.stringify({
      type: "referral_link",
      link,
      url: getReferralUrl(link.short_code),
    });
  }

  private async handleTrackClick(cfg: SbConfig, input: ToolInput): Promise<string> {
    const code = input.referral_code || (input as any).link_code;
    if (!code) return "Link code required.";

    const ok = await trackClick(
      cfg,
      code,
      (input as any).visitor_id,
      (input as any).fingerprint,
      (input as any).referrer,
    );
    return ok ? "Click tracked." : "Link not found.";
  }

  private async handleResolveLink(cfg: SbConfig, input: ToolInput): Promise<string> {
    const code = input.referral_code || (input as any).link_code;
    if (!code) return "Link code required.";

    const link = await resolveLink(cfg, code);
    if (!link) return "Link not found.";
    return JSON.stringify({ type: "referral_link", link, url: getReferralUrl(link.short_code) });
  }

  private async handleProcessSale(cfg: SbConfig, input: ToolInput): Promise<string> {
    if (!input.event_id) return "Event ID required.";
    const ticketRef = (input as any).ticket_ref;
    const ticketPrice = (input as any).ticket_price;
    if (!ticketRef || ticketPrice === undefined) return "Ticket ref and price required.";

    const commission = await processTicketSale(
      cfg,
      input.event_id,
      ticketRef,
      ticketPrice,
      (input as any).buyer_id,
      (input as any).source_link_id,
    );
    if (!commission) return "No active program or payout cap reached.";
    return JSON.stringify({ type: "commission_processed", commission });
  }

  private async handleUserEarnings(cfg: SbConfig, uid: string | undefined): Promise<string> {
    if (!uid) return "User ID required.";
    const earnings = await getUserEarnings(cfg, uid);
    return JSON.stringify({ type: "user_earnings", ...earnings });
  }

  private async handleCrewEarnings(cfg: SbConfig, input: ToolInput): Promise<string> {
    const crewId = (input as any).crew_id || input.group_id;
    if (!crewId) return "Crew ID required.";
    const earnings = await getCrewEarnings(cfg, crewId);
    return JSON.stringify({ type: "crew_earnings", ...earnings });
  }

  private async handleHistory(cfg: SbConfig, uid: string | undefined, input: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";
    const limit = (input as any).limit || 20;
    const history = await getCommissionHistory(cfg, uid, limit);
    return JSON.stringify({ type: "commission_history", splits: history });
  }

  private async handleRequestPayout(cfg: SbConfig, uid: string | undefined, input: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";
    const amount = (input as any).amount;
    const method = (input as any).payment_method;
    if (!amount || !method) return "Amount and payment method required.";

    const payout = await requestPayout(cfg, uid, amount, method);
    if (!payout) return "Payout request failed. Check balance and payment method.";
    return JSON.stringify({ type: "payout_requested", payout });
  }

  private async handlePayoutHistory(cfg: SbConfig, uid: string | undefined): Promise<string> {
    if (!uid) return "User ID required.";
    const history = await getPayoutHistory(cfg, uid);
    return JSON.stringify({ type: "payout_history", payouts: history });
  }
}
