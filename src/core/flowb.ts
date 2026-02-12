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

export class FlowBCore {
  private plugins: Map<string, FlowBPlugin> = new Map();
  private eventProviders: EventProvider[] = [];
  private config: FlowBConfig;

  constructor(config: FlowBConfig) {
    this.config = config;
    this.initPlugins();
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

  /** Get the list of all action names (for schema generation) */
  getActionNames(): string[] {
    const actions = ["events", "help"];
    for (const [, plugin] of this.plugins) {
      actions.push(...Object.keys(plugin.actions));
    }
    return actions;
  }
}
