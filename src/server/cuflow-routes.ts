/**
 * Cu.Flow Code Intelligence Route Handlers
 *
 * HTTP layer for the Cu.Flow plugin. Public endpoints (whats-new, features,
 * report viewing) require no auth. Everything else uses JWT middleware.
 */

import type { FastifyInstance } from "fastify";
import type { FlowBCore } from "../core/flowb.js";
import { authMiddleware, type JWTPayload } from "./auth.js";
import type { SbConfig } from "../utils/supabase.js";
import type { CuFlowPlugin } from "../plugins/cuflow/index.js";
import type { ReportPeriod } from "../plugins/cuflow/constants.js";

// ============================================================================
// Helpers
// ============================================================================

function getSupabaseConfig(): SbConfig | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) return null;
  return { supabaseUrl: url, supabaseKey: key };
}

// ============================================================================
// Route Registration
// ============================================================================

export function registerCuFlowRoutes(app: FastifyInstance, core: FlowBCore) {
  const plugin = (core as any).getCuFlowPlugin?.();

  // ------------------------------------------------------------------
  // GET /api/v1/cuflow/brief - Engineering brief
  // ------------------------------------------------------------------
  app.get<{ Querystring: { period?: string } }>(
    "/api/v1/cuflow/brief",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg || !plugin) return reply.status(500).send({ error: "Cu.Flow not configured" });

      const period = (request.query.period || "today") as ReportPeriod;
      if (period === "this_week" || period === "last_week") {
        const formatted = await plugin.getWeeklyBrief(cfg, period);
        return { period, formatted };
      }

      const { summary, formatted } = await plugin.getDailyBrief(cfg);
      return { period, summary, formatted };
    },
  );

  // ------------------------------------------------------------------
  // GET /api/v1/cuflow/feature/:featureId - Feature area progress
  // ------------------------------------------------------------------
  app.get<{ Params: { featureId: string }; Querystring: { period?: string } }>(
    "/api/v1/cuflow/feature/:featureId",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!plugin) return reply.status(500).send({ error: "Cu.Flow not configured" });

      const result = await plugin.execute("cuflow-feature", {
        action: "cuflow-feature",
        feature_id: request.params.featureId,
        period: request.query.period || "this_week",
      } as any, { platform: "api", config: {} as any });

      return { featureId: request.params.featureId, formatted: result };
    },
  );

  // ------------------------------------------------------------------
  // GET /api/v1/cuflow/search - Commit search
  // ------------------------------------------------------------------
  app.get<{ Querystring: { q?: string; file?: string; author?: string; period?: string } }>(
    "/api/v1/cuflow/search",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!plugin) return reply.status(500).send({ error: "Cu.Flow not configured" });

      const { q, file, author, period } = request.query;
      const query = q || file || author || "";
      if (!query) return reply.status(400).send({ error: "Search query (q) is required" });

      const result = await plugin.execute("cuflow-search", {
        action: "cuflow-search",
        query,
        since: period,
      } as any, { platform: "api", config: {} as any });

      return { query, formatted: result };
    },
  );

  // ------------------------------------------------------------------
  // GET /api/v1/cuflow/hotspots - Most active areas
  // ------------------------------------------------------------------
  app.get<{ Querystring: { period?: string; limit?: string } }>(
    "/api/v1/cuflow/hotspots",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!plugin) return reply.status(500).send({ error: "Cu.Flow not configured" });

      const result = await plugin.execute("cuflow-hotspots", {
        action: "cuflow-hotspots",
        period: request.query.period || "this_week",
        limit: request.query.limit ? parseInt(request.query.limit, 10) : undefined,
      } as any, { platform: "api", config: {} as any });

      return { formatted: result };
    },
  );

  // ------------------------------------------------------------------
  // GET /api/v1/cuflow/velocity - Commit velocity comparison
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/cuflow/velocity",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!plugin) return reply.status(500).send({ error: "Cu.Flow not configured" });

      const result = await plugin.execute("cuflow-velocity", {
        action: "cuflow-velocity",
      } as any, { platform: "api", config: {} as any });

      return { formatted: result };
    },
  );

  // ------------------------------------------------------------------
  // GET /api/v1/cuflow/contributors - Who worked on what
  // ------------------------------------------------------------------
  app.get<{ Querystring: { period?: string } }>(
    "/api/v1/cuflow/contributors",
    { preHandler: authMiddleware },
    async (request, reply) => {
      if (!plugin) return reply.status(500).send({ error: "Cu.Flow not configured" });

      const result = await plugin.execute("cuflow-contributors", {
        action: "cuflow-contributors",
        period: request.query.period || "this_week",
      } as any, { platform: "api", config: {} as any });

      return { formatted: result };
    },
  );

  // ------------------------------------------------------------------
  // GET /api/v1/cuflow/whats-new - User-facing changelog (PUBLIC)
  // ------------------------------------------------------------------
  app.get<{ Querystring: { period?: string; q?: string } }>(
    "/api/v1/cuflow/whats-new",
    async (request, reply) => {
      if (!plugin) return reply.status(500).send({ error: "Cu.Flow not configured" });

      const result = await plugin.execute("cuflow-whats-new", {
        action: "cuflow-whats-new",
        period: request.query.period || "this_week",
        query: request.query.q,
      } as any, { platform: "api", config: {} as any });

      return { formatted: result };
    },
  );

  // ------------------------------------------------------------------
  // GET /api/v1/cuflow/features - List feature areas (PUBLIC)
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/cuflow/features",
    async (_request, reply) => {
      if (!plugin) return reply.status(500).send({ error: "Cu.Flow not configured" });
      return { features: plugin.getFeatureAreas() };
    },
  );

  // ------------------------------------------------------------------
  // POST /api/v1/cuflow/report - Generate shareable report
  // ------------------------------------------------------------------
  app.post<{ Body: { report_type?: string; period?: string } }>(
    "/api/v1/cuflow/report",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg || !plugin) return reply.status(500).send({ error: "Cu.Flow not configured" });

      const jwt = request.jwtPayload!;
      const reportType = request.body?.report_type || "daily_brief";
      const period = (request.body?.period || "yesterday") as ReportPeriod;

      const result = await plugin.generateReport(cfg, reportType, period, jwt.sub);
      if (!result) return reply.status(500).send({ error: "Failed to generate report" });

      return reply.status(201).send(result);
    },
  );

  // ------------------------------------------------------------------
  // GET /api/v1/cuflow/reports/:code - View report (PUBLIC)
  // ------------------------------------------------------------------
  app.get<{ Params: { code: string } }>(
    "/api/v1/cuflow/reports/:code",
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg || !plugin) return reply.status(500).send({ error: "Cu.Flow not configured" });

      const report = await plugin.getReportByCode(cfg, request.params.code);
      if (!report) return reply.status(404).send({ error: "Report not found" });

      return report;
    },
  );

  // ------------------------------------------------------------------
  // POST /api/v1/cuflow/reports/:code/view - Track view (PUBLIC)
  // ------------------------------------------------------------------
  app.post<{ Params: { code: string } }>(
    "/api/v1/cuflow/reports/:code/view",
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg || !plugin) return reply.status(200).send({ ok: true });

      await plugin.trackReportView(cfg, request.params.code);
      return { ok: true };
    },
  );
}
