/**
 * OpenClaw Plugin Registration
 *
 * Thin wrapper that creates a FlowBCore instance and registers it as an
 * OpenClaw tool. This preserves backward compatibility with the original
 * plugin interface.
 */

import type { FlowBConfig, ToolInput, FlowBContext } from "./core/types.js";
import { FlowBCore } from "./core/flowb.js";

export default function register(api: any) {
  const rawConfig = api.config || {};

  const config: FlowBConfig = {
    plugins: {
      danz: rawConfig.danzSupabaseUrl ? {
        supabaseUrl: rawConfig.danzSupabaseUrl,
        supabaseKey: rawConfig.danzSupabaseKey,
      } : undefined,
      egator: rawConfig.apiBaseUrl ? {
        apiBaseUrl: rawConfig.apiBaseUrl,
      } : undefined,
    },
  };

  const core = new FlowBCore(config);

  const toolSchema = {
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
      platform_username: { type: "string", description: "Username on the platform" },
      danz_username: { type: "string", description: "DANZ.Now username for verification" },
      city: { type: "string", description: "City filter for events" },
      category: { type: "string", description: "Event category filter" },
      dance_style: { type: "string", description: "Dance style filter" },
      query: { type: "string", description: "Search query" },
    },
    required: ["action"],
  };

  api.registerTool({
    name: "flowb",
    description: `FlowB - Your Flow & Bond Assistant. Privacy-centric helper for events, dance community, and more.

EVENTS:
- events: Discover upcoming events from all sources
- events in [city]: Events in a specific city

DANZ.NOW (dance community):
- signup: Connect your DANZ.Now account
- verify @username: Link existing DANZ account
- stats: Your dance stats & achievements
- my-events: Events you're registered for
- challenges: Active daily & weekly challenges
- leaderboard: Top dancers

OTHER:
- search: Search events across all sources
- help: Show all commands`,
    inputSchema: toolSchema,
    parameters: toolSchema,

    async execute(input: ToolInput): Promise<string> {
      return core.execute(input.action, input);
    },
  });

  api.logger?.info(`[flowb] Agent loaded via OpenClaw`);
}
