/**
 * FiFlow CFO Route Handlers
 *
 * Admin-only HTTP layer for the FiFlow plugin. Each handler extracts input,
 * calls the plugin method, and maps the result to an HTTP response.
 */

import type { FastifyInstance } from "fastify";
import type { FlowBCore } from "../core/flowb.js";
import { authMiddleware, type JWTPayload } from "./auth.js";
import type { SbConfig } from "../utils/supabase.js";
import type { FiFlowPlugin } from "../plugins/fiflow/index.js";
import { isFlowBAdmin } from "../utils/admin.js";

// ============================================================================
// Helpers
// ============================================================================

function getSupabaseConfig(): SbConfig | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) return null;
  return { supabaseUrl: url, supabaseKey: key };
}

async function requireAdmin(reply: any, userId: string): Promise<boolean> {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    reply.status(500).send({ error: "Server configuration error" });
    return false;
  }
  const admin = await isFlowBAdmin(cfg, userId, "fiflow");
  if (!admin) {
    reply.status(403).send({ error: "Admin access required" });
    return false;
  }
  return true;
}

// ============================================================================
// Route Registration
// ============================================================================

export function registerFiFlowRoutes(app: FastifyInstance, core: FlowBCore) {
  const plugin = core.getFiFlowPlugin();

  // ------------------------------------------------------------------
  // GET /api/v1/fiflow/status - Health dashboard
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/fiflow/status",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      if (!(await requireAdmin(reply, jwt.sub))) return;

      const cfg = getSupabaseConfig();
      if (!cfg || !plugin) return reply.status(500).send({ error: "FiFlow not configured" });

      const [compliance, treasury] = await Promise.all([
        plugin.getComplianceStatus(cfg),
        plugin.getTreasurySummary(cfg),
      ]);

      return { compliance, treasury };
    },
  );

  // ------------------------------------------------------------------
  // GET /api/v1/fiflow/compliance - Compliance tasks (filterable)
  // ------------------------------------------------------------------
  app.get<{
    Querystring: { category?: string; status?: string; priority?: string; jurisdiction?: string };
  }>(
    "/api/v1/fiflow/compliance",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      if (!(await requireAdmin(reply, jwt.sub))) return;

      const cfg = getSupabaseConfig();
      if (!cfg || !plugin) return reply.status(500).send({ error: "FiFlow not configured" });

      const filters = request.query;
      const result = await plugin.getComplianceStatus(cfg, filters as any);
      return result;
    },
  );

  // ------------------------------------------------------------------
  // GET /api/v1/fiflow/treasury - Treasury summary
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/fiflow/treasury",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      if (!(await requireAdmin(reply, jwt.sub))) return;

      const cfg = getSupabaseConfig();
      if (!cfg || !plugin) return reply.status(500).send({ error: "FiFlow not configured" });

      return plugin.getTreasurySummary(cfg);
    },
  );

  // ------------------------------------------------------------------
  // GET /api/v1/fiflow/deadlines - Upcoming deadlines
  // ------------------------------------------------------------------
  app.get<{ Querystring: { days?: string } }>(
    "/api/v1/fiflow/deadlines",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      if (!(await requireAdmin(reply, jwt.sub))) return;

      const cfg = getSupabaseConfig();
      if (!cfg || !plugin) return reply.status(500).send({ error: "FiFlow not configured" });

      const days = parseInt(request.query.days || "90", 10);
      return plugin.getUpcomingDeadlines(cfg, days);
    },
  );

  // ------------------------------------------------------------------
  // GET /api/v1/fiflow/risks - Risk matrix
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/fiflow/risks",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      if (!(await requireAdmin(reply, jwt.sub))) return;

      const cfg = getSupabaseConfig();
      if (!cfg || !plugin) return reply.status(500).send({ error: "FiFlow not configured" });

      return plugin.getRiskMatrix(cfg);
    },
  );

  // ------------------------------------------------------------------
  // GET /api/v1/fiflow/audit-log - Audit trail
  // ------------------------------------------------------------------
  app.get<{
    Querystring: { action?: string; entity_type?: string; limit?: string };
  }>(
    "/api/v1/fiflow/audit-log",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      if (!(await requireAdmin(reply, jwt.sub))) return;

      const cfg = getSupabaseConfig();
      if (!cfg || !plugin) return reply.status(500).send({ error: "FiFlow not configured" });

      const { action, entity_type, limit } = request.query;
      return plugin.getAuditLog(cfg, {
        action,
        entity_type,
        limit: limit ? parseInt(limit, 10) : 20,
      });
    },
  );

  // ------------------------------------------------------------------
  // POST /api/v1/fiflow/tasks - Add compliance task
  // ------------------------------------------------------------------
  app.post<{
    Body: {
      category: string;
      title: string;
      description?: string;
      priority?: string;
      deadline?: string;
      jurisdiction?: string;
      regulatory_body?: string;
      estimated_cost_usd?: number;
    };
  }>(
    "/api/v1/fiflow/tasks",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      if (!(await requireAdmin(reply, jwt.sub))) return;

      const cfg = getSupabaseConfig();
      if (!cfg || !plugin) return reply.status(500).send({ error: "FiFlow not configured" });

      const body = request.body;
      if (!body?.title) return reply.status(400).send({ error: "title is required" });

      const task = await plugin.addComplianceTask(cfg, body as any, jwt.sub);
      if (!task) return reply.status(500).send({ error: "Failed to create task" });

      return reply.status(201).send(task);
    },
  );

  // ------------------------------------------------------------------
  // PATCH /api/v1/fiflow/tasks/:id - Update task
  // ------------------------------------------------------------------
  app.patch<{
    Params: { id: string };
    Body: {
      status?: string;
      priority?: string;
      assigned_to?: string;
      actual_cost_usd?: number;
      deadline?: string;
    };
  }>(
    "/api/v1/fiflow/tasks/:id",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      if (!(await requireAdmin(reply, jwt.sub))) return;

      const cfg = getSupabaseConfig();
      if (!cfg || !plugin) return reply.status(500).send({ error: "FiFlow not configured" });

      const ok = await plugin.updateComplianceTask(cfg, request.params.id, request.body as any, jwt.sub);
      if (!ok) return reply.status(500).send({ error: "Failed to update task" });

      return { ok: true, id: request.params.id };
    },
  );

  // ------------------------------------------------------------------
  // POST /api/v1/fiflow/report - Generate report
  // ------------------------------------------------------------------
  app.post<{ Body: { type?: string } }>(
    "/api/v1/fiflow/report",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      if (!(await requireAdmin(reply, jwt.sub))) return;

      const cfg = getSupabaseConfig();
      if (!cfg || !plugin) return reply.status(500).send({ error: "FiFlow not configured" });

      const reportType = request.body?.type || "compliance";
      const report = await plugin.generateReport(cfg, reportType);
      return { report };
    },
  );

  // ------------------------------------------------------------------
  // POST /api/v1/fiflow/strategy - Get strategy recommendations
  // ------------------------------------------------------------------
  app.post(
    "/api/v1/fiflow/strategy",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      if (!(await requireAdmin(reply, jwt.sub))) return;

      const cfg = getSupabaseConfig();
      if (!cfg || !plugin) return reply.status(500).send({ error: "FiFlow not configured" });

      const recommendations = await plugin.getStrategyRecommendations(cfg);
      return { recommendations };
    },
  );
}
