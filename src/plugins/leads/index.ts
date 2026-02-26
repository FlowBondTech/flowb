/**
 * Leads Plugin for FlowB
 *
 * Org-scoped lead management. Members of an org can submit, view, and
 * update leads via Telegram or the web API. Data is stored in Supabase.
 */

import type {
  FlowBPlugin,
  FlowBContext,
  ToolInput,
} from "../../core/types.js";
import { sbQuery, sbInsert, sbPatch, sbFetch, sbUpsert } from "../../utils/supabase.js";
import { log } from "../../utils/logger.js";
import type {
  LeadsPluginConfig,
  OrgLead,
  Org,
  OrgMember,
} from "./types.js";
export type { LeadsPluginConfig, OrgLead, Org, OrgMember } from "./types.js";

// ============================================================================
// Leads Plugin
// ============================================================================

export class LeadsPlugin implements FlowBPlugin {
  id = "leads";
  name = "Leads";
  description = "Manage sales leads for your organization";

  actions: Record<string, { description: string; requiresAuth?: boolean }> = {
    "leads-add":    { description: "Add a new lead", requiresAuth: true },
    "leads-list":   { description: "List leads for your org", requiresAuth: true },
    "leads-update": { description: "Update a lead's status", requiresAuth: true },
    "leads-view":   { description: "View lead details", requiresAuth: true },
  };

  private config: LeadsPluginConfig | null = null;

  configure(config: LeadsPluginConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!(this.config?.supabaseUrl && this.config?.supabaseKey);
  }

  async execute(action: string, input: ToolInput, context: FlowBContext): Promise<string> {
    const cfg = this.config;
    if (!cfg) return "Leads plugin not configured.";

    switch (action) {
      case "leads-add":    return this.addLead(cfg, input);
      case "leads-list":   return this.listLeads(cfg, input);
      case "leads-update": return this.updateLead(cfg, input);
      case "leads-view":   return this.viewLead(cfg, input);
      default:
        return `Unknown leads action: ${action}`;
    }
  }

  // ==========================================================================
  // Core methods (used by both Telegram bot and web API)
  // ==========================================================================

  /** Add a new lead to an org */
  async createLead(
    cfg: LeadsPluginConfig,
    orgId: string,
    submittedBy: string,
    submittedByName: string | null,
    data: {
      name: string;
      contact?: string;
      contact_type?: string;
      company?: string;
      notes?: string;
      tags?: string[];
      source?: string;
      priority?: string;
    },
  ): Promise<OrgLead | null> {
    return sbInsert<OrgLead>(cfg, "flowb_org_leads", {
      org_id: orgId,
      submitted_by: submittedBy,
      submitted_by_name: submittedByName,
      name: data.name,
      contact: data.contact || null,
      contact_type: data.contact_type || "other",
      company: data.company || null,
      notes: data.notes || null,
      tags: data.tags || [],
      source: data.source || "telegram",
      priority: data.priority || "normal",
      status: "new",
    });
  }

  /** List leads for an org, optionally filtered by status */
  async getLeads(
    cfg: LeadsPluginConfig,
    orgId: string,
    opts?: { status?: string; limit?: number; offset?: number },
  ): Promise<OrgLead[]> {
    const params: Record<string, string> = {
      org_id: `eq.${orgId}`,
      select: "*",
      order: "created_at.desc",
      limit: String(opts?.limit || 25),
    };
    if (opts?.status) params.status = `eq.${opts.status}`;
    if (opts?.offset) params.offset = String(opts.offset);

    const rows = await sbQuery<OrgLead[]>(cfg, "flowb_org_leads", params);
    return rows || [];
  }

  /** Get a single lead by ID */
  async getLead(cfg: LeadsPluginConfig, leadId: string): Promise<OrgLead | null> {
    const rows = await sbQuery<OrgLead[]>(cfg, "flowb_org_leads", {
      id: `eq.${leadId}`,
      select: "*",
      limit: "1",
    });
    return rows?.[0] || null;
  }

  /** Update a lead's status or other fields */
  async updateLeadFields(
    cfg: LeadsPluginConfig,
    leadId: string,
    fields: Partial<Pick<OrgLead, "status" | "priority" | "notes" | "contact" | "contact_type" | "company" | "tags">>,
  ): Promise<boolean> {
    return sbPatch(cfg, "flowb_org_leads", { id: `eq.${leadId}` }, {
      ...fields,
      updated_at: new Date().toISOString(),
    });
  }

  // ==========================================================================
  // Org membership helpers
  // ==========================================================================

  /** Get the org(s) a user belongs to */
  async getUserOrgs(cfg: LeadsPluginConfig, userId: string): Promise<OrgMember[]> {
    const rows = await sbQuery<OrgMember[]>(cfg, "flowb_org_members", {
      user_id: `eq.${userId}`,
      select: "*",
    });
    return rows || [];
  }

  /** Check if a user is a member of a specific org */
  async checkOrgAccess(cfg: LeadsPluginConfig, userId: string, orgId: string): Promise<OrgMember | null> {
    const rows = await sbQuery<OrgMember[]>(cfg, "flowb_org_members", {
      user_id: `eq.${userId}`,
      org_id: `eq.${orgId}`,
      select: "*",
      limit: "1",
    });
    return rows?.[0] || null;
  }

  /** Create an org and set the creator as owner */
  async createOrg(
    cfg: LeadsPluginConfig,
    orgSlug: string,
    orgName: string,
    createdBy: string,
    creatorDisplayName?: string,
  ): Promise<Org | null> {
    const org = await sbInsert<Org>(cfg, "flowb_orgs", {
      id: orgSlug,
      name: orgName,
      created_by: createdBy,
    });
    if (!org) return null;

    await sbInsert(cfg, "flowb_org_members", {
      org_id: orgSlug,
      user_id: createdBy,
      display_name: creatorDisplayName || null,
      role: "owner",
    });

    return org;
  }

  /** Add a member to an org */
  async addOrgMember(
    cfg: LeadsPluginConfig,
    orgId: string,
    userId: string,
    displayName: string | null,
    role = "member",
  ): Promise<OrgMember | null> {
    return sbUpsert<OrgMember>(cfg, "flowb_org_members", {
      org_id: orgId,
      user_id: userId,
      display_name: displayName,
      role,
    }, "org_id,user_id");
  }

  /** Get org details */
  async getOrg(cfg: LeadsPluginConfig, orgId: string): Promise<Org | null> {
    const rows = await sbQuery<Org[]>(cfg, "flowb_orgs", {
      id: `eq.${orgId}`,
      select: "*",
      limit: "1",
    });
    return rows?.[0] || null;
  }

  /** Get all members of an org */
  async getOrgMembers(cfg: LeadsPluginConfig, orgId: string): Promise<OrgMember[]> {
    const rows = await sbQuery<OrgMember[]>(cfg, "flowb_org_members", {
      org_id: `eq.${orgId}`,
      select: "*",
    });
    return rows || [];
  }

  /** Get lead counts by status for an org */
  async getLeadStats(cfg: LeadsPluginConfig, orgId: string): Promise<Record<string, number>> {
    const leads = await this.getLeads(cfg, orgId, { limit: 1000 });
    const stats: Record<string, number> = { total: leads.length };
    for (const lead of leads) {
      stats[lead.status] = (stats[lead.status] || 0) + 1;
    }
    return stats;
  }

  // ==========================================================================
  // Action handlers (for the FlowBPlugin execute interface)
  // ==========================================================================

  private async addLead(cfg: LeadsPluginConfig, input: ToolInput): Promise<string> {
    if (!input.user_id) return "User ID required.";
    const orgs = await this.getUserOrgs(cfg, input.user_id);
    if (!orgs.length) return "You are not a member of any organization.";

    const orgId = input.org_id || orgs[0].org_id;
    const name = input.query;
    if (!name) return "Lead name is required.";

    const lead = await this.createLead(cfg, orgId, input.user_id, null, { name });
    if (!lead) return "Failed to add lead.";

    return `Lead added: ${lead.name} (${lead.id.slice(0, 8)})`;
  }

  private async listLeads(cfg: LeadsPluginConfig, input: ToolInput): Promise<string> {
    if (!input.user_id) return "User ID required.";
    const orgs = await this.getUserOrgs(cfg, input.user_id);
    if (!orgs.length) return "You are not a member of any organization.";

    const orgId = input.org_id || orgs[0].org_id;
    const leads = await this.getLeads(cfg, orgId, { limit: 10 });
    if (!leads.length) return "No leads yet. Use /lead to add one!";

    const lines = leads.map((l, i) =>
      `${i + 1}. ${l.name}${l.company ? ` (${l.company})` : ""} - ${l.status}`,
    );
    return `Leads for ${orgId}:\n${lines.join("\n")}`;
  }

  private async updateLead(cfg: LeadsPluginConfig, input: ToolInput): Promise<string> {
    return "Use the web dashboard or inline buttons to update leads.";
  }

  private async viewLead(cfg: LeadsPluginConfig, input: ToolInput): Promise<string> {
    return "Use the web dashboard to view full lead details.";
  }
}
