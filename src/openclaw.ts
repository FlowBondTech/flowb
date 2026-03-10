/**
 * OpenClaw Plugin Registration
 *
 * Registers individual FlowB tools for external AI agents:
 *   - flowb_events: Search & discover events
 *   - flowb_leads: CRM lead management
 *   - flowb_meetings: Meeting scheduling
 *   - flowb_chat: Full natural-language chat (routes through handleChat)
 *
 * Also registers the legacy monolithic "flowb" tool for backward compat.
 */

import type { FlowBConfig, ToolInput } from "./core/types.js";
import { FlowBCore } from "./core/flowb.js";
import { handleChat, type ChatMessage, type ChatConfig } from "./services/ai-chat.js";

export default function register(api: any) {
  const rawConfig = api.config || {};

  const sbUrl = rawConfig.supabaseUrl || process.env.SUPABASE_URL || "";
  const sbKey = rawConfig.supabaseKey || process.env.SUPABASE_SERVICE_KEY || "";
  const xaiKey = process.env.XAI_API_KEY || "";

  const config: FlowBConfig = {
    plugins: {
      danz: sbUrl ? { supabaseUrl: sbUrl, supabaseKey: sbKey } : undefined,
      egator: process.env.LUMA_API_KEY ? {
        sources: { luma: { apiKey: process.env.LUMA_API_KEY } },
      } : undefined,
    },
  };

  const core = new FlowBCore(config);

  // ─── Individual tools ──────────────────────────────────────────────

  // 1. Event search
  api.registerTool({
    name: "flowb_events",
    description: "Search and discover events. Filter by city, category, date range, or free-text query.",
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string", description: "City to search in (e.g. 'Denver', 'Austin')" },
        category: { type: "string", description: "Category slug (e.g. 'defi', 'social', 'ai')" },
        query: { type: "string", description: "Free-text search query" },
        free_only: { type: "boolean", description: "Only show free events" },
        limit: { type: "number", description: "Max results (default 10)" },
      },
    },
    async execute(input: any): Promise<string> {
      return core.execute("events", {
        action: "events",
        city: input.city,
        category: input.category,
        query: input.query,
        platform: "openclaw",
      });
    },
  });

  // 2. Lead management
  api.registerTool({
    name: "flowb_leads",
    description: "Create, list, or update CRM leads. Actions: create, list, update, pipeline.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["create", "list", "update", "pipeline"],
          description: "Lead action to perform",
        },
        user_id: { type: "string", description: "User identifier (e.g. 'openclaw_abc')" },
        name: { type: "string", description: "Lead name (for create/update)" },
        company: { type: "string", description: "Lead company (for create)" },
        email: { type: "string", description: "Lead email (for create)" },
        stage: { type: "string", description: "Pipeline stage (for update/list filter)" },
        notes: { type: "string", description: "Notes to add" },
        search: { type: "string", description: "Search query (for list)" },
      },
      required: ["action", "user_id"],
    },
    async execute(input: any): Promise<string> {
      if (!sbUrl || !xaiKey) return "FlowB CRM not configured.";
      const msg = buildLeadMessage(input);
      return chatPassthrough(msg, input.user_id);
    },
  });

  // 3. Meetings
  api.registerTool({
    name: "flowb_meetings",
    description: "Schedule, list, or complete meetings. Actions: create, list, complete.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["create", "list", "complete"],
          description: "Meeting action to perform",
        },
        user_id: { type: "string", description: "User identifier" },
        title: { type: "string", description: "Meeting title (for create)" },
        attendee: { type: "string", description: "Attendee name (for create)" },
        starts_at: { type: "string", description: "ISO datetime (for create)" },
        filter: { type: "string", enum: ["upcoming", "today", "past"], description: "List filter" },
        meeting_id: { type: "string", description: "Meeting ID (for complete)" },
        notes: { type: "string", description: "Completion notes" },
      },
      required: ["action", "user_id"],
    },
    async execute(input: any): Promise<string> {
      if (!sbUrl || !xaiKey) return "FlowB meetings not configured.";
      const msg = buildMeetingMessage(input);
      return chatPassthrough(msg, input.user_id);
    },
  });

  // 4. Full natural-language chat
  api.registerTool({
    name: "flowb_chat",
    description: "Send a natural-language message to FlowB. Supports event search, lead management, meetings, crew actions, settings, and general questions.",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "The natural-language message to send" },
        user_id: { type: "string", description: "User identifier" },
      },
      required: ["message"],
    },
    async execute(input: any): Promise<string> {
      return chatPassthrough(input.message, input.user_id || "openclaw_anon");
    },
  });

  // ─── Legacy monolithic tool (backward compat) ──────────────────────

  const legacySchema = {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: core.getActionNames(),
        description: "The action to perform",
      },
      user_id: { type: "string", description: "User identifier" },
      platform: {
        type: "string",
        enum: ["telegram", "discord", "farcaster", "openclaw"],
        description: "User's platform",
      },
      city: { type: "string", description: "City filter for events" },
      category: { type: "string", description: "Event category filter" },
      query: { type: "string", description: "Search query" },
    },
    required: ["action"],
  };

  api.registerTool({
    name: "flowb",
    description: "FlowB legacy tool. Prefer individual tools (flowb_events, flowb_leads, flowb_meetings, flowb_chat) for better results.",
    inputSchema: legacySchema,
    parameters: legacySchema,
    async execute(input: ToolInput): Promise<string> {
      return core.execute(input.action, input);
    },
  });

  // ─── Helpers ────────────────────────────────────────────────────────

  async function chatPassthrough(message: string, userId: string): Promise<string> {
    if (!xaiKey) return "FlowB AI not configured (missing XAI_API_KEY).";

    const messages: ChatMessage[] = [{ role: "user", content: message }];
    const cfg: ChatConfig = {
      sb: { supabaseUrl: sbUrl, supabaseKey: sbKey },
      xaiKey,
      user: { userId, platform: "openclaw", displayName: null },
      platform: "web",
    };

    try {
      const result = await handleChat(messages, cfg);
      return result.content || "No response.";
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  }

  function buildLeadMessage(input: any): string {
    switch (input.action) {
      case "create":
        return `Add lead ${input.name || "unknown"}${input.company ? ` from ${input.company}` : ""}${input.email ? `, email ${input.email}` : ""}${input.notes ? `. Notes: ${input.notes}` : ""}`;
      case "list":
        return `List my leads${input.stage ? ` in ${input.stage} stage` : ""}${input.search ? ` matching "${input.search}"` : ""}`;
      case "update":
        return `Update lead ${input.name || input.lead_id || "?"}${input.stage ? ` to ${input.stage}` : ""}${input.notes ? `. Notes: ${input.notes}` : ""}`;
      case "pipeline":
        return "Show my pipeline summary";
      default:
        return `Lead action: ${input.action}`;
    }
  }

  function buildMeetingMessage(input: any): string {
    switch (input.action) {
      case "create":
        return `Schedule meeting${input.title ? ` "${input.title}"` : ""}${input.attendee ? ` with ${input.attendee}` : ""}${input.starts_at ? ` at ${input.starts_at}` : ""}`;
      case "list":
        return `Show my ${input.filter || "upcoming"} meetings`;
      case "complete":
        return `Complete meeting ${input.meeting_id || ""}${input.notes ? `. Notes: ${input.notes}` : ""}`;
      default:
        return `Meeting action: ${input.action}`;
    }
  }

  api.logger?.info(`[flowb] OpenClaw registered: flowb_events, flowb_leads, flowb_meetings, flowb_chat, flowb (legacy)`);
}
