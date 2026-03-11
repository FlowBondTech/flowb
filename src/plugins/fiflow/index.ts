/**
 * FiFlow CFO Plugin for FlowB
 *
 * Super Regenerative Finance Officer - compliance tracking, treasury
 * management, risk assessment, and strategic recommendations. Admin-only.
 *
 * Tables (migration 035):
 *   - flowb_fiflow_compliance_tasks
 *   - flowb_fiflow_treasury
 *   - flowb_fiflow_audit_log
 *   - flowb_fiflow_risk_assessments
 */

import type {
  FlowBPlugin,
  FlowBContext,
  ToolInput,
} from "../../core/types.js";
import {
  sbFetch,
  sbPost,
  sbPatchRaw,
  type SbConfig,
} from "../../utils/supabase.js";
import { log } from "../../utils/logger.js";
import { TABLES, AUDIT_ACTIONS } from "./constants.js";
import type { ComplianceCategory, TaskStatus, TaskPriority, RiskDomain, RiskLevel, EntryType } from "./constants.js";
import {
  wrapResponse,
  formatComplianceUpdate,
  formatTreasuryBrief,
  formatRiskMatrix,
  formatDeadlines,
  formatStrategyRecommendations,
  type ComplianceSummary,
  type TreasurySummary,
  type RiskEntry,
  type DeadlineEntry,
} from "./personality.js";

// ============================================================================
// Types
// ============================================================================

export interface FiFlowPluginConfig extends SbConfig {
  adminUserIds?: string[];
}

interface ComplianceTask {
  id: string;
  category: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  deadline: string | null;
  assigned_to: string | null;
  estimated_cost_usd: number | null;
  actual_cost_usd: number | null;
  jurisdiction: string | null;
  regulatory_body: string | null;
  notes: any[];
  evidence_urls: string[] | null;
  risk_score: number | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface TreasuryEntry {
  id: string;
  entry_type: string;
  category: string;
  amount_usd: number;
  currency: string;
  description: string | null;
  counterparty: string | null;
  tx_hash: string | null;
  period_start: string | null;
  period_end: string | null;
  recurring: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: any;
  ip_address: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

interface RiskAssessment {
  id: string;
  domain: string;
  risk_level: string;
  score: number;
  description: string | null;
  mitigation_plan: string | null;
  assessed_by: string | null;
  valid_until: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

// ============================================================================
// Plugin
// ============================================================================

export class FiFlowPlugin implements FlowBPlugin {
  id = "fiflow";
  name = "CFO Dashboard";
  description = "FiFlow - Super Regenerative Finance Officer. Compliance, treasury, risk, and strategy.";

  actions: Record<string, { description: string; requiresAuth?: boolean }> = {
    "fiflow-status": { description: "Overall compliance & financial health summary", requiresAuth: true },
    "fiflow-compliance": { description: "Compliance task list with deadlines and status", requiresAuth: true },
    "fiflow-treasury": { description: "Treasury dashboard (balances, flows, runway)", requiresAuth: true },
    "fiflow-report": { description: "Generate financial/compliance reports", requiresAuth: true },
    "fiflow-task-add": { description: "Add a compliance task", requiresAuth: true },
    "fiflow-task-update": { description: "Update task status/notes", requiresAuth: true },
    "fiflow-risks": { description: "Risk assessment matrix", requiresAuth: true },
    "fiflow-strategy": { description: "Regenerative finance strategy recommendations", requiresAuth: true },
    "fiflow-deadlines": { description: "Upcoming regulatory deadlines", requiresAuth: true },
    "fiflow-audit-log": { description: "Compliance audit trail", requiresAuth: true },
  };

  private config: FiFlowPluginConfig | null = null;

  configure(config: FiFlowPluginConfig): void {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!(this.config?.supabaseUrl && this.config?.supabaseKey);
  }

  async execute(action: string, input: ToolInput, _context: FlowBContext): Promise<string> {
    const cfg = this.config;
    if (!cfg) return "FiFlow CFO plugin not configured.";

    switch (action) {
      case "fiflow-status":
        return this.handleStatus(cfg);
      case "fiflow-compliance":
        return this.handleCompliance(cfg, input);
      case "fiflow-treasury":
        return this.handleTreasury(cfg);
      case "fiflow-report":
        return this.handleReport(cfg, input);
      case "fiflow-task-add":
        return this.handleTaskAdd(cfg, input);
      case "fiflow-task-update":
        return this.handleTaskUpdate(cfg, input);
      case "fiflow-risks":
        return this.handleRisks(cfg);
      case "fiflow-strategy":
        return this.handleStrategy(cfg);
      case "fiflow-deadlines":
        return this.handleDeadlines(cfg, input);
      case "fiflow-audit-log":
        return this.handleAuditLog(cfg, input);
      default:
        return `Unknown FiFlow action: ${action}`;
    }
  }

  // ==========================================================================
  // Action Handlers
  // ==========================================================================

  private async handleStatus(cfg: SbConfig): Promise<string> {
    const [compliance, treasury] = await Promise.all([
      this.getComplianceStatus(cfg),
      this.getTreasurySummary(cfg),
    ]);

    const lines: string[] = [];
    lines.push("**FiFlow Health Dashboard**");
    lines.push("");
    lines.push(`Compliance: ${compliance.completed}/${compliance.total} complete | ${compliance.critical} critical items`);
    lines.push(`Treasury: $${treasury.netPosition.toLocaleString()} net | $${treasury.totalIncome.toLocaleString()} in / $${treasury.totalExpenses.toLocaleString()} out`);

    if (compliance.blocked > 0) {
      lines.push(`\nBlocked tasks: ${compliance.blocked}`);
    }

    if (compliance.upcomingDeadlines.length > 0) {
      lines.push("\n**Next Deadlines:**");
      for (const d of compliance.upcomingDeadlines.slice(0, 3)) {
        lines.push(`- ${d.title}: ${d.deadline}`);
      }
    }

    return wrapResponse(lines.join("\n"), "general");
  }

  private async handleCompliance(cfg: SbConfig, input: ToolInput): Promise<string> {
    const compliance = await this.getComplianceStatus(cfg, input);
    return formatComplianceUpdate(compliance);
  }

  private async handleTreasury(cfg: SbConfig): Promise<string> {
    const treasury = await this.getTreasurySummary(cfg);
    return formatTreasuryBrief(treasury);
  }

  private async handleReport(cfg: SbConfig, input: ToolInput): Promise<string> {
    const reportType = (input as any).report_type || "compliance";
    const report = await this.generateReport(cfg, reportType);

    await this.logAudit(cfg, input.user_id || "system", AUDIT_ACTIONS.REPORT_GENERATED, "report", null, {
      report_type: reportType,
    });

    return report;
  }

  private async handleTaskAdd(cfg: SbConfig, input: ToolInput): Promise<string> {
    const data = input as any;
    if (!data.title) return "Task title is required.";

    const task = await sbPost(cfg, TABLES.COMPLIANCE_TASKS, {
      category: data.category || "federal_registration",
      title: data.title,
      description: data.description || null,
      status: "not_started",
      priority: data.priority || "medium",
      deadline: data.deadline || null,
      jurisdiction: data.jurisdiction || null,
      regulatory_body: data.regulatory_body || null,
      estimated_cost_usd: data.estimated_cost_usd || null,
    });

    if (!task) return "Failed to create compliance task.";

    await this.logAudit(cfg, input.user_id || "system", AUDIT_ACTIONS.TASK_CREATED, "compliance_task", task.id, {
      title: data.title,
      category: data.category,
    });

    log.info("[fiflow]", `Compliance task created: ${data.title}`);
    return wrapResponse(`Compliance task created: **${data.title}**\nID: ${task.id}\nPriority: ${data.priority || "medium"}`, "compliance");
  }

  private async handleTaskUpdate(cfg: SbConfig, input: ToolInput): Promise<string> {
    const data = input as any;
    const taskId = data.task_id || data.id;
    if (!taskId) return "Task ID is required.";

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (data.status) updates.status = data.status;
    if (data.priority) updates.priority = data.priority;
    if (data.assigned_to) updates.assigned_to = data.assigned_to;
    if (data.actual_cost_usd !== undefined) updates.actual_cost_usd = data.actual_cost_usd;
    if (data.deadline) updates.deadline = data.deadline;

    const ok = await sbPatchRaw(cfg, `${TABLES.COMPLIANCE_TASKS}?id=eq.${taskId}`, updates);
    if (!ok) return "Failed to update compliance task.";

    const action = data.status === "completed" ? AUDIT_ACTIONS.TASK_COMPLETED : AUDIT_ACTIONS.TASK_UPDATED;
    await this.logAudit(cfg, input.user_id || "system", action, "compliance_task", taskId, {
      changes: updates,
    });

    log.info("[fiflow]", `Compliance task updated: ${taskId}`);
    return wrapResponse(`Compliance task updated: ${taskId}`, "compliance");
  }

  private async handleRisks(cfg: SbConfig): Promise<string> {
    const risks = await this.getRiskMatrix(cfg);
    return formatRiskMatrix(risks);
  }

  private async handleStrategy(cfg: SbConfig): Promise<string> {
    const recs = await this.getStrategyRecommendations(cfg);

    await this.logAudit(cfg, "system", AUDIT_ACTIONS.STRATEGY_REQUESTED, "strategy", null, {});

    return formatStrategyRecommendations(recs);
  }

  private async handleDeadlines(cfg: SbConfig, input: ToolInput): Promise<string> {
    const days = (input as any).days || 90;
    const deadlines = await this.getUpcomingDeadlines(cfg, days);
    return formatDeadlines(deadlines);
  }

  private async handleAuditLog(cfg: SbConfig, input: ToolInput): Promise<string> {
    const data = input as any;
    const entries = await this.getAuditLog(cfg, {
      action: data.filter_action,
      entity_type: data.filter_entity_type,
      limit: data.log_limit || 20,
    });

    const lines: string[] = ["**Compliance Audit Trail**", ""];

    if (entries.length === 0) {
      lines.push("No audit log entries found.");
      return wrapResponse(lines.join("\n"), "compliance");
    }

    for (const e of entries) {
      const date = new Date(e.created_at).toISOString().slice(0, 16).replace("T", " ");
      lines.push(`[${date}] ${e.actor} | ${e.action} | ${e.entity_type}${e.entity_id ? ` (${e.entity_id.slice(0, 8)})` : ""}`);
    }

    return wrapResponse(lines.join("\n"), "compliance");
  }

  // ==========================================================================
  // Data Access Methods (public for route handlers)
  // ==========================================================================

  async getComplianceStatus(cfg: SbConfig, filters?: ToolInput): Promise<ComplianceSummary> {
    let path = `${TABLES.COMPLIANCE_TASKS}?select=*&order=deadline.asc.nullslast,priority.asc`;
    if (filters) {
      if ((filters as any).category) path += `&category=eq.${(filters as any).category}`;
      if ((filters as any).status) path += `&status=eq.${(filters as any).status}`;
      if ((filters as any).priority) path += `&priority=eq.${(filters as any).priority}`;
      if ((filters as any).jurisdiction) path += `&jurisdiction=eq.${(filters as any).jurisdiction}`;
    }

    const tasks = await sbFetch<ComplianceTask[]>(cfg, path) || [];

    const completed = tasks.filter((t) => t.status === "completed").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const blocked = tasks.filter((t) => t.status === "blocked").length;
    const notStarted = tasks.filter((t) => t.status === "not_started").length;
    const critical = tasks.filter((t) => t.priority === "critical" && t.status !== "completed").length;

    const now = new Date();
    const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const upcomingDeadlines = tasks
      .filter((t) => t.deadline && new Date(t.deadline) <= ninetyDays && t.status !== "completed")
      .map((t) => ({ title: t.title, deadline: t.deadline!, status: t.status }));

    const byCategory: Record<string, number> = {};
    for (const t of tasks) {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    }

    return {
      total: tasks.length,
      completed,
      inProgress,
      blocked,
      notStarted,
      critical,
      upcomingDeadlines,
      byCategory,
    };
  }

  async getTreasurySummary(cfg: SbConfig): Promise<TreasurySummary> {
    const entries = await sbFetch<TreasuryEntry[]>(cfg, `${TABLES.TREASURY}?select=*&order=created_at.desc`) || [];

    let totalIncome = 0;
    let totalExpenses = 0;
    let complianceSpent = 0;
    const byCategory: Record<string, number> = {};

    for (const e of entries) {
      const amount = Number(e.amount_usd) || 0;
      if (e.entry_type === "income" || e.entry_type === "grant" || e.entry_type === "investment") {
        totalIncome += amount;
      } else if (e.entry_type === "expense") {
        totalExpenses += amount;
        byCategory[e.category] = (byCategory[e.category] || 0) + amount;
        if (e.category === "compliance" || e.category === "legal") {
          complianceSpent += amount;
        }
      }
    }

    // Estimate compliance budget from task estimates
    const tasks = await sbFetch<ComplianceTask[]>(cfg, `${TABLES.COMPLIANCE_TASKS}?select=estimated_cost_usd`) || [];
    const complianceBudget = tasks.reduce((sum, t) => sum + (Number(t.estimated_cost_usd) || 0), 0);

    return {
      totalIncome,
      totalExpenses,
      netPosition: totalIncome - totalExpenses,
      complianceBudget,
      complianceSpent,
      byCategory,
    };
  }

  async getRiskMatrix(cfg: SbConfig): Promise<RiskEntry[]> {
    const assessments = await sbFetch<RiskAssessment[]>(
      cfg,
      `${TABLES.RISK_ASSESSMENTS}?select=domain,risk_level,score,description,mitigation_plan&order=score.desc`,
    ) || [];

    return assessments.map((a) => ({
      domain: a.domain,
      risk_level: a.risk_level,
      score: Number(a.score),
      description: a.description,
      mitigation_plan: a.mitigation_plan,
    }));
  }

  async getUpcomingDeadlines(cfg: SbConfig, days: number = 90): Promise<DeadlineEntry[]> {
    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const tasks = await sbFetch<ComplianceTask[]>(
      cfg,
      `${TABLES.COMPLIANCE_TASKS}?deadline=not.is.null&deadline=lte.${cutoff}&status=neq.completed&select=title,deadline,status,priority,jurisdiction&order=deadline.asc`,
    ) || [];

    return tasks.map((t) => ({
      title: t.title,
      deadline: t.deadline!,
      status: t.status,
      priority: t.priority,
      jurisdiction: t.jurisdiction || "N/A",
    }));
  }

  async getAuditLog(
    cfg: SbConfig,
    filters: { action?: string; entity_type?: string; limit?: number },
  ): Promise<AuditLogEntry[]> {
    let path = `${TABLES.AUDIT_LOG}?select=*&order=created_at.desc&limit=${filters.limit || 20}`;
    if (filters.action) path += `&action=eq.${filters.action}`;
    if (filters.entity_type) path += `&entity_type=eq.${filters.entity_type}`;

    return await sbFetch<AuditLogEntry[]>(cfg, path) || [];
  }

  async addComplianceTask(
    cfg: SbConfig,
    task: {
      category: ComplianceCategory;
      title: string;
      description?: string;
      priority?: TaskPriority;
      deadline?: string;
      jurisdiction?: string;
      regulatory_body?: string;
      estimated_cost_usd?: number;
    },
    actor: string = "system",
  ): Promise<ComplianceTask | null> {
    const created = await sbPost(cfg, TABLES.COMPLIANCE_TASKS, {
      category: task.category,
      title: task.title,
      description: task.description || null,
      status: "not_started",
      priority: task.priority || "medium",
      deadline: task.deadline || null,
      jurisdiction: task.jurisdiction || null,
      regulatory_body: task.regulatory_body || null,
      estimated_cost_usd: task.estimated_cost_usd || null,
    });

    if (created) {
      await this.logAudit(cfg, actor, AUDIT_ACTIONS.TASK_CREATED, "compliance_task", created.id, {
        title: task.title,
      });
    }

    return created;
  }

  async updateComplianceTask(
    cfg: SbConfig,
    id: string,
    updates: Partial<{
      status: TaskStatus;
      priority: TaskPriority;
      assigned_to: string;
      actual_cost_usd: number;
      deadline: string;
      notes: any[];
      evidence_urls: string[];
    }>,
    actor: string = "system",
  ): Promise<boolean> {
    const patchData = { ...updates, updated_at: new Date().toISOString() };
    const ok = await sbPatchRaw(cfg, `${TABLES.COMPLIANCE_TASKS}?id=eq.${id}`, patchData);

    if (ok) {
      const action = updates.status === "completed" ? AUDIT_ACTIONS.TASK_COMPLETED : AUDIT_ACTIONS.TASK_UPDATED;
      await this.logAudit(cfg, actor, action, "compliance_task", id, { changes: updates });
    }

    return ok;
  }

  async generateReport(cfg: SbConfig, type: string = "compliance"): Promise<string> {
    const lines: string[] = [];
    const now = new Date().toISOString().slice(0, 10);

    if (type === "compliance" || type === "full") {
      const compliance = await this.getComplianceStatus(cfg);
      lines.push(`**Compliance Report - ${now}**`);
      lines.push("");
      lines.push(`Total Tasks: ${compliance.total}`);
      lines.push(`Completed: ${compliance.completed} (${compliance.total ? Math.round((compliance.completed / compliance.total) * 100) : 0}%)`);
      lines.push(`In Progress: ${compliance.inProgress}`);
      lines.push(`Blocked: ${compliance.blocked}`);
      lines.push(`Not Started: ${compliance.notStarted}`);
      lines.push(`Critical Outstanding: ${compliance.critical}`);
      lines.push("");

      const totalEstimated = await this.getTotalEstimatedCost(cfg);
      lines.push(`Estimated Total Compliance Cost: $${totalEstimated.toLocaleString()}`);
      lines.push("");
    }

    if (type === "treasury" || type === "full") {
      const treasury = await this.getTreasurySummary(cfg);
      lines.push(`**Treasury Report - ${now}**`);
      lines.push("");
      lines.push(`Income: $${treasury.totalIncome.toLocaleString()}`);
      lines.push(`Expenses: $${treasury.totalExpenses.toLocaleString()}`);
      lines.push(`Net: $${treasury.netPosition.toLocaleString()}`);
      lines.push("");
    }

    if (type === "risk" || type === "full") {
      const risks = await this.getRiskMatrix(cfg);
      lines.push(`**Risk Report - ${now}**`);
      lines.push("");
      if (risks.length === 0) {
        lines.push("No risk assessments on record.");
      } else {
        for (const r of risks) {
          lines.push(`- ${r.domain}: ${r.risk_level} (${r.score})`);
        }
      }
      lines.push("");
    }

    return wrapResponse(lines.join("\n"), "compliance");
  }

  async getStrategyRecommendations(cfg: SbConfig): Promise<string[]> {
    const [compliance, treasury, risks] = await Promise.all([
      this.getComplianceStatus(cfg),
      this.getTreasurySummary(cfg),
      this.getRiskMatrix(cfg),
    ]);

    const recs: string[] = [];

    // Critical items first
    if (compliance.critical > 0) {
      recs.push(
        `**Immediate**: ${compliance.critical} critical compliance tasks need attention. FinCEN MSB registration and AML programs should be prioritized - they're foundational to everything else.`,
      );
    }

    // Deadline-driven
    if (compliance.upcomingDeadlines.length > 0) {
      const nearest = compliance.upcomingDeadlines[0];
      const daysLeft = Math.ceil(
        (new Date(nearest.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      recs.push(
        `**Timeline**: "${nearest.title}" deadline is ${daysLeft} days away. ${daysLeft < 60 ? "Accelerate this immediately." : "Plan resources now to avoid crunch."}`,
      );
    }

    // Budget awareness
    if (treasury.complianceBudget > 0 && treasury.complianceSpent >= treasury.complianceBudget * 0.8) {
      recs.push(
        `**Budget**: Compliance spending at ${Math.round((treasury.complianceSpent / treasury.complianceBudget) * 100)}% of estimates. Review remaining tasks for cost optimization opportunities.`,
      );
    }

    // Risk-driven
    const criticalRisks = risks.filter((r) => r.risk_level === "critical" || r.risk_level === "high");
    if (criticalRisks.length > 0) {
      recs.push(
        `**Risk**: ${criticalRisks.length} high/critical risk domains identified. Focus mitigation on: ${criticalRisks.map((r) => r.domain).join(", ")}.`,
      );
    }

    // Blocked items
    if (compliance.blocked > 0) {
      recs.push(
        `**Blockers**: ${compliance.blocked} compliance tasks are blocked. Unblocking these may cascade progress across multiple categories.`,
      );
    }

    // Regenerative angle
    if (compliance.completed > 0 && compliance.total > 0) {
      const progress = Math.round((compliance.completed / compliance.total) * 100);
      recs.push(
        `**Regenerative Impact**: At ${progress}% compliance completion, FlowBond is building the trust infrastructure that enables regenerative finance at scale. Each completed task is a foundation stone.`,
      );
    }

    if (recs.length === 0) {
      recs.push(
        "Start by completing your FinCEN MSB registration and establishing a BSA/AML program. These are the foundation for all other compliance activities.",
      );
      recs.push(
        "Consider obtaining the $DANZ token legal opinion early - the classification determines your regulatory path across all jurisdictions.",
      );
    }

    return recs;
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private async getTotalEstimatedCost(cfg: SbConfig): Promise<number> {
    const tasks = await sbFetch<ComplianceTask[]>(cfg, `${TABLES.COMPLIANCE_TASKS}?select=estimated_cost_usd`) || [];
    return tasks.reduce((sum, t) => sum + (Number(t.estimated_cost_usd) || 0), 0);
  }

  private async logAudit(
    cfg: SbConfig,
    actor: string,
    action: string,
    entityType: string,
    entityId: string | null,
    changes: any,
  ): Promise<void> {
    try {
      await sbPost(cfg, TABLES.AUDIT_LOG, {
        actor,
        action,
        entity_type: entityType,
        entity_id: entityId,
        changes,
      }, "return=minimal");
    } catch (err) {
      log.error("[fiflow]", "Failed to write audit log", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
