/**
 * Automation Plugin for FlowB
 *
 * Rule-based automation engine: define triggers and actions to automate
 * workflows like follow-ups, lead nurturing, task creation, and notifications.
 *
 * Trigger types: schedule, event, lead_stage, meeting_complete,
 *   meeting_reminder, contact_inactive, referral_sale, manual
 *
 * Action types: send_message, create_meeting, update_lead, create_task,
 *   send_email, ai_suggestion, webhook
 *
 * Tables: flowb_automations, flowb_automation_log
 */

import type { FlowBPlugin, FlowBContext, ToolInput } from "../../core/types.js";
import { sbQuery, sbInsert, sbPatch, sbDelete, type SbConfig } from "../../utils/supabase.js";
import { log } from "../../utils/logger.js";

// ============================================================================
// Types
// ============================================================================

export interface AutomationPluginConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export type TriggerType =
  | "schedule"
  | "event"
  | "lead_stage"
  | "meeting_complete"
  | "meeting_reminder"
  | "contact_inactive"
  | "referral_sale"
  | "manual";

export type ActionType =
  | "send_message"
  | "create_meeting"
  | "update_lead"
  | "create_task"
  | "send_email"
  | "ai_suggestion"
  | "webhook";

export interface Automation {
  id: string;
  user_id: string;
  name: string;
  trigger_type: TriggerType;
  trigger_config: Record<string, any>;
  action_type: ActionType;
  action_config: Record<string, any>;
  is_active: boolean;
  max_per_day: number;
  run_count: number;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationLogEntry {
  id: string;
  automation_id: string;
  trigger_data: Record<string, any>;
  action_data: Record<string, any>;
  status: "success" | "failure" | "skipped";
  error_message: string | null;
  created_at: string;
}

const NS = "[automation]";

const VALID_TRIGGER_TYPES: Set<string> = new Set([
  "schedule",
  "event",
  "lead_stage",
  "meeting_complete",
  "meeting_reminder",
  "contact_inactive",
  "referral_sale",
  "manual",
]);

const VALID_ACTION_TYPES: Set<string> = new Set([
  "send_message",
  "create_meeting",
  "update_lead",
  "create_task",
  "send_email",
  "ai_suggestion",
  "webhook",
]);

// ============================================================================
// Template Helpers
// ============================================================================

/**
 * Simple mustache-style template interpolation.
 * Replaces {{key.subkey}} with values from the data object.
 */
function renderTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, path: string) => {
    const parts = path.split(".");
    let value: any = data;
    for (const part of parts) {
      if (value == null || typeof value !== "object") return "";
      value = value[part];
    }
    return value != null ? String(value) : "";
  });
}

// ============================================================================
// Automation Plugin
// ============================================================================

export class AutomationPlugin implements FlowBPlugin {
  id = "automation";
  name = "Automations";
  description = "Rule-based automation engine for triggers, actions, and workflows";

  actions: Record<string, { description: string; requiresAuth?: boolean }> = {
    "automation-create":  { description: "Create a new automation rule", requiresAuth: true },
    "automation-list":    { description: "List your automations", requiresAuth: true },
    "automation-get":     { description: "Get automation details", requiresAuth: true },
    "automation-update":  { description: "Update an automation rule", requiresAuth: true },
    "automation-delete":  { description: "Delete an automation rule", requiresAuth: true },
    "automation-toggle":  { description: "Enable/disable an automation", requiresAuth: true },
    "automation-execute": { description: "Manually trigger an automation", requiresAuth: true },
    "automation-log":     { description: "View automation execution history", requiresAuth: true },
  };

  private config: AutomationPluginConfig | null = null;

  configure(config: AutomationPluginConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!(this.config?.supabaseUrl && this.config?.supabaseKey);
  }

  async execute(action: string, input: ToolInput, _context: FlowBContext): Promise<string> {
    const cfg = this.config;
    if (!cfg) return "Automations not configured.";
    const uid = input.user_id;

    switch (action) {
      case "automation-create":  return this.createFromInput(cfg, uid, input);
      case "automation-list":    return this.listForUser(cfg, uid);
      case "automation-get":     return this.getDetail(cfg, input.automation_id);
      case "automation-update":  return this.updateFromInput(cfg, uid, input);
      case "automation-delete":  return this.deleteAutomation(cfg, uid, input.automation_id);
      case "automation-toggle":  return this.toggleFromInput(cfg, uid, input.automation_id);
      case "automation-execute": return this.manualExecute(cfg, uid, input);
      case "automation-log":     return this.getLogForInput(cfg, input.automation_id, input.log_limit);
      default:
        return `Unknown automation action: ${action}`;
    }
  }

  // ==========================================================================
  // CRUD
  // ==========================================================================

  async create(
    cfg: SbConfig,
    userId: string,
    name: string,
    triggerType: TriggerType,
    triggerConfig: Record<string, any>,
    actionType: ActionType,
    actionConfig: Record<string, any>,
    options?: { max_per_day?: number; is_active?: boolean },
  ): Promise<Automation | null> {
    if (!VALID_TRIGGER_TYPES.has(triggerType)) {
      log.warn(NS, "invalid trigger type", { triggerType });
      return null;
    }
    if (!VALID_ACTION_TYPES.has(actionType)) {
      log.warn(NS, "invalid action type", { actionType });
      return null;
    }

    const automation = await sbInsert<Automation>(cfg, "flowb_automations", {
      user_id: userId,
      name,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      action_type: actionType,
      action_config: actionConfig,
      is_active: options?.is_active ?? true,
      max_per_day: options?.max_per_day ?? 50,
      run_count: 0,
    });

    if (!automation) {
      log.warn(NS, "failed to create automation", { userId, name });
      return null;
    }

    log.info(NS, "automation created", { id: automation.id, name, triggerType, actionType });
    return automation;
  }

  async list(cfg: SbConfig, userId: string): Promise<Automation[]> {
    const rows = await sbQuery<Automation[]>(cfg, "flowb_automations", {
      select: "*",
      user_id: `eq.${userId}`,
      order: "created_at.desc",
    });
    return rows || [];
  }

  async get(cfg: SbConfig, automationId: string): Promise<Automation | null> {
    const rows = await sbQuery<Automation[]>(cfg, "flowb_automations", {
      select: "*",
      id: `eq.${automationId}`,
      limit: "1",
    });
    return rows?.[0] || null;
  }

  async update(
    cfg: SbConfig,
    userId: string,
    automationId: string,
    updates: Partial<Pick<Automation, "name" | "trigger_type" | "trigger_config" | "action_type" | "action_config" | "is_active" | "max_per_day">>,
  ): Promise<boolean> {
    // Verify ownership
    const existing = await this.get(cfg, automationId);
    if (!existing) return false;
    if (existing.user_id !== userId) {
      log.warn(NS, "update denied: not owner", { userId, automationId });
      return false;
    }

    // Validate types if being changed
    if (updates.trigger_type && !VALID_TRIGGER_TYPES.has(updates.trigger_type)) {
      log.warn(NS, "invalid trigger type in update", { triggerType: updates.trigger_type });
      return false;
    }
    if (updates.action_type && !VALID_ACTION_TYPES.has(updates.action_type)) {
      log.warn(NS, "invalid action type in update", { actionType: updates.action_type });
      return false;
    }

    const patch: Record<string, any> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.trigger_type !== undefined) patch.trigger_type = updates.trigger_type;
    if (updates.trigger_config !== undefined) patch.trigger_config = updates.trigger_config;
    if (updates.action_type !== undefined) patch.action_type = updates.action_type;
    if (updates.action_config !== undefined) patch.action_config = updates.action_config;
    if (updates.is_active !== undefined) patch.is_active = updates.is_active;
    if (updates.max_per_day !== undefined) patch.max_per_day = updates.max_per_day;

    if (Object.keys(patch).length === 0) return true;

    const ok = await sbPatch(cfg, "flowb_automations", { id: `eq.${automationId}` }, patch);
    if (ok) log.info(NS, "automation updated", { automationId, fields: Object.keys(patch) });
    return ok;
  }

  async delete(cfg: SbConfig, userId: string, automationId: string): Promise<boolean> {
    const existing = await this.get(cfg, automationId);
    if (!existing) return false;
    if (existing.user_id !== userId) {
      log.warn(NS, "delete denied: not owner", { userId, automationId });
      return false;
    }

    const ok = await sbDelete(cfg, "flowb_automations", {
      id: `eq.${automationId}`,
      user_id: `eq.${userId}`,
    });
    if (ok) log.info(NS, "automation deleted", { automationId });
    return ok;
  }

  async toggle(cfg: SbConfig, userId: string, automationId: string): Promise<{ is_active: boolean } | null> {
    const existing = await this.get(cfg, automationId);
    if (!existing) return null;
    if (existing.user_id !== userId) {
      log.warn(NS, "toggle denied: not owner", { userId, automationId });
      return null;
    }

    const newState = !existing.is_active;
    const ok = await sbPatch(
      cfg,
      "flowb_automations",
      { id: `eq.${automationId}` },
      { is_active: newState },
    );

    if (!ok) return null;
    log.info(NS, "automation toggled", { automationId, is_active: newState });
    return { is_active: newState };
  }

  // ==========================================================================
  // Trigger Evaluation
  // ==========================================================================

  /**
   * Evaluate whether incoming trigger data matches an automation's trigger config.
   * Returns true if the automation should fire.
   */
  evaluateTrigger(
    _cfg: SbConfig,
    triggerType: TriggerType,
    triggerData: Record<string, any>,
    automation: Automation,
  ): boolean {
    if (!automation.is_active) return false;
    if (automation.trigger_type !== triggerType) return false;

    const tc = automation.trigger_config;

    switch (triggerType) {
      case "schedule":
        // Schedule evaluation is handled by the cron service.
        // If this method is called with triggerType=schedule, it means
        // the cron already matched -- so we just validate the automation is active.
        return true;

      case "event":
        // Match on event_type or category if specified
        if (tc.event_type && triggerData.event_type !== tc.event_type) return false;
        if (tc.category && triggerData.category !== tc.category) return false;
        return true;

      case "lead_stage":
        // Match stage transition
        if (tc.from_stage && triggerData.from_stage !== tc.from_stage) return false;
        if (tc.to_stage && triggerData.to_stage !== tc.to_stage) return false;
        return true;

      case "meeting_complete":
        // Fire when a meeting is completed. Optionally filter by meeting_type.
        if (tc.meeting_type && triggerData.meeting_type !== tc.meeting_type) return false;
        return true;

      case "meeting_reminder":
        // Fire when a reminder window is reached. The cron service determines timing.
        if (tc.minutes_before && triggerData.minutes_before !== tc.minutes_before) return false;
        return true;

      case "contact_inactive":
        // Match when days_inactive threshold is met
        if (tc.days_inactive && (triggerData.days_inactive || 0) < tc.days_inactive) return false;
        return true;

      case "referral_sale":
        // Any referral sale triggers it. Optionally filter by min_amount.
        if (tc.min_amount && (triggerData.amount || 0) < tc.min_amount) return false;
        return true;

      case "manual":
        // Manual triggers always match when invoked.
        return true;

      default:
        log.warn(NS, "unknown trigger type in evaluation", { triggerType });
        return false;
    }
  }

  // ==========================================================================
  // Action Execution
  // ==========================================================================

  /**
   * Execute the action defined by an automation rule.
   * Returns the action result data for logging.
   *
   * NOTE: This is a dispatch layer. The actual side effects (sending messages,
   * creating meetings, etc.) will be wired up to real services by the cron
   * service or the bot. For now we build the action payload and log it.
   */
  async executeAction(
    cfg: SbConfig,
    automation: Automation,
    triggerData: Record<string, any>,
  ): Promise<{ success: boolean; actionData: Record<string, any>; error?: string }> {
    // --- Rate limit check ---
    if (automation.max_per_day > 0) {
      const todayRunCount = await this.getTodayRunCount(cfg, automation.id);
      if (todayRunCount >= automation.max_per_day) {
        const msg = `Rate limit reached: ${todayRunCount}/${automation.max_per_day} today`;
        log.warn(NS, msg, { automationId: automation.id });
        await this.logExecution(cfg, automation.id, triggerData, {}, "skipped", msg);
        return { success: false, actionData: {}, error: msg };
      }
    }

    const ac = automation.action_config;
    let actionData: Record<string, any> = {};

    try {
      switch (automation.action_type) {
        case "send_message":
          actionData = {
            type: "send_message",
            platform: ac.platform || "telegram",
            message: renderTemplate(ac.template || ac.message || "", triggerData),
            recipient: ac.recipient || triggerData.user_id || null,
          };
          break;

        case "create_meeting":
          actionData = {
            type: "create_meeting",
            title: renderTemplate(ac.title_template || "Follow-up", triggerData),
            duration: ac.duration || 30,
            meeting_type: ac.meeting_type || "call",
            attendee_id: triggerData.user_id || triggerData.lead_id || null,
          };
          break;

        case "update_lead":
          actionData = {
            type: "update_lead",
            lead_id: triggerData.lead_id || ac.lead_id,
            updates: {
              ...(ac.set_stage ? { stage: ac.set_stage } : {}),
              ...(ac.set_tags ? { tags: ac.set_tags } : {}),
              ...(ac.set_score ? { score: ac.set_score } : {}),
            },
          };
          break;

        case "create_task":
          actionData = {
            type: "create_task",
            title: renderTemplate(ac.title_template || ac.title || "New task", triggerData),
            description: ac.description ? renderTemplate(ac.description, triggerData) : null,
            priority: ac.priority || "medium",
            due_offset_hours: ac.due_offset_hours || 24,
          };
          break;

        case "send_email":
          actionData = {
            type: "send_email",
            to: ac.to || triggerData.email || null,
            subject: renderTemplate(ac.subject_template || ac.subject || "", triggerData),
            body: renderTemplate(ac.body_template || ac.body || "", triggerData),
          };
          break;

        case "ai_suggestion":
          actionData = {
            type: "ai_suggestion",
            prompt_template: ac.prompt_template || null,
            prompt: ac.prompt_template
              ? renderTemplate(ac.prompt_template, triggerData)
              : null,
            context: triggerData,
          };
          break;

        case "webhook":
          actionData = {
            type: "webhook",
            url: ac.url,
            method: ac.method || "POST",
            payload: ac.payload
              ? JSON.parse(renderTemplate(JSON.stringify(ac.payload), triggerData))
              : triggerData,
          };

          // Actually fire the webhook
          if (ac.url) {
            try {
              const resp = await fetch(ac.url, {
                method: ac.method || "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(ac.headers || {}),
                },
                body: JSON.stringify(actionData.payload),
                signal: AbortSignal.timeout(10_000),
              });
              actionData.response_status = resp.status;
              actionData.response_ok = resp.ok;
            } catch (webhookErr) {
              actionData.webhook_error =
                webhookErr instanceof Error ? webhookErr.message : String(webhookErr);
            }
          }
          break;

        default:
          log.warn(NS, "unknown action type", { actionType: automation.action_type });
          await this.logExecution(
            cfg,
            automation.id,
            triggerData,
            {},
            "failure",
            `Unknown action type: ${automation.action_type}`,
          );
          return {
            success: false,
            actionData: {},
            error: `Unknown action type: ${automation.action_type}`,
          };
      }

      // Update run tracking
      await sbPatch(
        cfg,
        "flowb_automations",
        { id: `eq.${automation.id}` },
        {
          run_count: automation.run_count + 1,
          last_run_at: new Date().toISOString(),
        },
      );

      // Log success
      await this.logExecution(cfg, automation.id, triggerData, actionData, "success");

      log.info(NS, "action executed", {
        automationId: automation.id,
        actionType: automation.action_type,
      });

      return { success: true, actionData };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log.error(NS, "action execution failed", {
        automationId: automation.id,
        error: errorMessage,
      });
      await this.logExecution(cfg, automation.id, triggerData, actionData, "failure", errorMessage);
      return { success: false, actionData, error: errorMessage };
    }
  }

  // ==========================================================================
  // Execution Log
  // ==========================================================================

  async logExecution(
    cfg: SbConfig,
    automationId: string,
    triggerData: Record<string, any>,
    actionData: Record<string, any>,
    status: "success" | "failure" | "skipped",
    errorMessage?: string,
  ): Promise<AutomationLogEntry | null> {
    return sbInsert<AutomationLogEntry>(cfg, "flowb_automation_log", {
      automation_id: automationId,
      trigger_data: triggerData,
      action_data: actionData,
      status,
      error_message: errorMessage || null,
    });
  }

  async getLog(
    cfg: SbConfig,
    automationId: string,
    limit: number = 25,
  ): Promise<AutomationLogEntry[]> {
    const rows = await sbQuery<AutomationLogEntry[]>(cfg, "flowb_automation_log", {
      select: "*",
      automation_id: `eq.${automationId}`,
      order: "created_at.desc",
      limit: String(limit),
    });
    return rows || [];
  }

  // ==========================================================================
  // Rate Limiting Helpers
  // ==========================================================================

  /**
   * Count how many times an automation has run today (UTC).
   */
  private async getTodayRunCount(cfg: SbConfig, automationId: string): Promise<number> {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const rows = await sbQuery<AutomationLogEntry[]>(cfg, "flowb_automation_log", {
      select: "id",
      automation_id: `eq.${automationId}`,
      status: "eq.success",
      created_at: `gte.${todayStart.toISOString()}`,
    });
    return rows?.length || 0;
  }

  // ==========================================================================
  // Batch Trigger Processing
  // ==========================================================================

  /**
   * Process a trigger event against all active automations for a user.
   * Returns the list of automations that fired.
   */
  async processTrigger(
    cfg: SbConfig,
    userId: string,
    triggerType: TriggerType,
    triggerData: Record<string, any>,
  ): Promise<{ automationId: string; success: boolean; error?: string }[]> {
    const automations = await sbQuery<Automation[]>(cfg, "flowb_automations", {
      select: "*",
      user_id: `eq.${userId}`,
      is_active: "eq.true",
      trigger_type: `eq.${triggerType}`,
    });

    if (!automations?.length) return [];

    const results: { automationId: string; success: boolean; error?: string }[] = [];

    for (const automation of automations) {
      const shouldFire = this.evaluateTrigger(cfg, triggerType, triggerData, automation);
      if (!shouldFire) continue;

      const result = await this.executeAction(cfg, automation, triggerData);
      results.push({
        automationId: automation.id,
        success: result.success,
        error: result.error,
      });
    }

    return results;
  }

  /**
   * Get all active automations of a given trigger type (across all users).
   * Used by the cron service to find scheduled automations.
   */
  async getActiveByTriggerType(
    cfg: SbConfig,
    triggerType: TriggerType,
  ): Promise<Automation[]> {
    const rows = await sbQuery<Automation[]>(cfg, "flowb_automations", {
      select: "*",
      is_active: "eq.true",
      trigger_type: `eq.${triggerType}`,
    });
    return rows || [];
  }

  // ==========================================================================
  // Execute Entry Points (from ToolInput)
  // ==========================================================================

  private async createFromInput(cfg: SbConfig, uid: string | undefined, input: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";

    const name = (input as any).automation_name || (input as any).name;
    const triggerType = (input as any).trigger_type as TriggerType;
    const triggerConfig = (input as any).trigger_config || {};
    const actionType = (input as any).action_type as ActionType;
    const actionConfig = (input as any).action_config || {};

    if (!name) return "Automation name required.";
    if (!triggerType) return "Trigger type required.";
    if (!actionType) return "Action type required.";

    if (!VALID_TRIGGER_TYPES.has(triggerType)) {
      return `Invalid trigger type: ${triggerType}. Valid: ${[...VALID_TRIGGER_TYPES].join(", ")}`;
    }
    if (!VALID_ACTION_TYPES.has(actionType)) {
      return `Invalid action type: ${actionType}. Valid: ${[...VALID_ACTION_TYPES].join(", ")}`;
    }

    const automation = await this.create(cfg, uid, name, triggerType, triggerConfig, actionType, actionConfig, {
      max_per_day: (input as any).max_per_day,
      is_active: (input as any).is_active,
    });

    if (!automation) return "Failed to create automation. Try again.";

    return JSON.stringify({
      type: "automation_created",
      id: automation.id,
      name: automation.name,
      trigger_type: automation.trigger_type,
      action_type: automation.action_type,
      is_active: automation.is_active,
      max_per_day: automation.max_per_day,
    });
  }

  private async listForUser(cfg: SbConfig, uid: string | undefined): Promise<string> {
    if (!uid) return "User ID required.";

    const automations = await this.list(cfg, uid);
    return JSON.stringify({
      type: "automation_list",
      count: automations.length,
      automations: automations.map((a) => ({
        id: a.id,
        name: a.name,
        trigger_type: a.trigger_type,
        action_type: a.action_type,
        is_active: a.is_active,
        run_count: a.run_count,
        last_run_at: a.last_run_at,
      })),
    });
  }

  private async getDetail(cfg: SbConfig, automationId: string | undefined): Promise<string> {
    if (!automationId) return "Automation ID required.";

    const automation = await this.get(cfg, automationId);
    if (!automation) return "Automation not found.";

    return JSON.stringify({
      type: "automation_detail",
      automation,
    });
  }

  private async updateFromInput(cfg: SbConfig, uid: string | undefined, input: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";
    const automationId = (input as any).automation_id;
    if (!automationId) return "Automation ID required.";

    const updates: Record<string, any> = {};
    if ((input as any).automation_name !== undefined) updates.name = (input as any).automation_name;
    if ((input as any).name !== undefined && !updates.name) updates.name = (input as any).name;
    if ((input as any).trigger_type !== undefined) updates.trigger_type = (input as any).trigger_type;
    if ((input as any).trigger_config !== undefined) updates.trigger_config = (input as any).trigger_config;
    if ((input as any).action_type !== undefined) updates.action_type = (input as any).action_type;
    if ((input as any).action_config !== undefined) updates.action_config = (input as any).action_config;
    if ((input as any).is_active !== undefined) updates.is_active = (input as any).is_active;
    if ((input as any).max_per_day !== undefined) updates.max_per_day = (input as any).max_per_day;

    if (Object.keys(updates).length === 0) return "No updates provided.";

    const ok = await this.update(cfg, uid, automationId, updates);
    if (!ok) return "Failed to update automation. Check ownership and try again.";

    return "Automation updated.";
  }

  private async deleteAutomation(cfg: SbConfig, uid: string | undefined, automationId: string | undefined): Promise<string> {
    if (!uid) return "User ID required.";
    if (!automationId) return "Automation ID required.";

    const ok = await this.delete(cfg, uid, automationId);
    if (!ok) return "Failed to delete automation. Check ownership and try again.";

    return "Automation deleted.";
  }

  private async toggleFromInput(cfg: SbConfig, uid: string | undefined, automationId: string | undefined): Promise<string> {
    if (!uid) return "User ID required.";
    if (!automationId) return "Automation ID required.";

    const result = await this.toggle(cfg, uid, automationId);
    if (!result) return "Failed to toggle automation. Check ownership and try again.";

    return JSON.stringify({
      type: "automation_toggled",
      automation_id: automationId,
      is_active: result.is_active,
    });
  }

  private async manualExecute(cfg: SbConfig, uid: string | undefined, input: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";
    const automationId = (input as any).automation_id;
    if (!automationId) return "Automation ID required.";

    const automation = await this.get(cfg, automationId);
    if (!automation) return "Automation not found.";
    if (automation.user_id !== uid) return "Only the automation owner can execute it.";

    const triggerData = (input as any).trigger_data || { manual: true, triggered_by: uid };

    const result = await this.executeAction(cfg, automation, triggerData);

    return JSON.stringify({
      type: "automation_executed",
      automation_id: automationId,
      success: result.success,
      action_data: result.actionData,
      error: result.error || null,
    });
  }

  private async getLogForInput(cfg: SbConfig, automationId: string | undefined, limit?: number): Promise<string> {
    if (!automationId) return "Automation ID required.";

    const entries = await this.getLog(cfg, automationId, limit || 25);

    return JSON.stringify({
      type: "automation_log",
      automation_id: automationId,
      count: entries.length,
      entries,
    });
  }
}
