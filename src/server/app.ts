import Fastify from "fastify";
import cors from "@fastify/cors";
import type { FlowBCore } from "../core/flowb.js";
import type { ToolInput } from "../core/types.js";

export function buildApp(core: FlowBCore) {
  const app = Fastify({ logger: true });

  app.register(cors);

  // Health check + plugin status
  app.get("/health", async () => {
    return {
      status: "ok",
      service: "flowb",
      plugins: core.getPluginStatus(),
      uptime: process.uptime(),
    };
  });

  // Generic action endpoint - preserves the agent/plugin router pattern
  app.post<{ Body: ToolInput }>("/api/v1/action", async (request, reply) => {
    const input = request.body;

    if (!input?.action) {
      return reply.status(400).send({ error: "Missing required field: action" });
    }

    const result = await core.execute(input.action, input);
    return { action: input.action, result };
  });

  // Convenience endpoint for event discovery
  app.post<{ Body: ToolInput }>("/api/v1/events", async (request, reply) => {
    const input = request.body || {};
    const result = await core.discoverEvents({ ...input, action: "events" });
    return { result };
  });

  // Plugin status
  app.get("/api/v1/plugins", async () => {
    return { plugins: core.getPluginStatus() };
  });

  return app;
}
