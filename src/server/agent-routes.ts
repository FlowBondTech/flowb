/**
 * Agent Route Handlers
 *
 * Thin HTTP layer for the Agents plugin. Each handler extracts input,
 * calls the plugin method, and maps the result to an HTTP response.
 */

import type { FastifyInstance } from "fastify";
import type { FlowBCore } from "../core/flowb.js";
import { authMiddleware, type JWTPayload } from "./auth.js";
import type { SbConfig } from "../utils/supabase.js";
import { fireAndForget } from "../utils/logger.js";
import type { AgentResult } from "../plugins/agents/index.js";

function getSupabaseConfig(): SbConfig | null {
  const url = process.env.DANZ_SUPABASE_URL;
  const key = process.env.DANZ_SUPABASE_KEY;
  if (!url || !key) return null;
  return { supabaseUrl: url, supabaseKey: key };
}

/** Send an AgentResult as an HTTP response. */
function sendResult(reply: any, result: AgentResult) {
  if (result.ok) {
    return result.data;
  }

  const status = result.status || 500;
  const r = reply.status(status);

  // Set x402 headers if present
  if (result.paymentHeaders) {
    for (const [k, v] of Object.entries(result.paymentHeaders)) {
      r.header(k, v);
    }
  }

  if (result.data) return r.send(result.data);
  return r.send({ error: result.error || "Internal error" });
}

export function registerAgentRoutes(app: FastifyInstance, core: FlowBCore) {
  const agentsPlugin = core.getAgentsPlugin();

  // ------------------------------------------------------------------
  // LIST: All agent slots (public)
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/agents",
    async (_request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg || !agentsPlugin) return { agents: [], skills: [] };
      return sendResult(reply, await agentsPlugin.listAgents(cfg));
    },
  );

  // ------------------------------------------------------------------
  // ME: Get my agent (requires auth)
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/agents/me",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg || !agentsPlugin) return reply.status(500).send({ error: "Not configured" });
      return sendResult(reply, await agentsPlugin.getAgentForUser(cfg, jwt.sub));
    },
  );

  // ------------------------------------------------------------------
  // CLAIM: Claim an open agent slot (requires auth)
  // ------------------------------------------------------------------
  app.post<{ Body: { agentName?: string; name?: string } }>(
    "/api/v1/agents/claim",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg || !agentsPlugin) return reply.status(500).send({ error: "Not configured" });

      const agentName = request.body?.agentName || request.body?.name || `${jwt.sub.replace(/^(telegram_|farcaster_|web_)/, "")}'s Agent`;

      const result = await agentsPlugin.claimSlot(cfg, jwt.sub, jwt.platform, agentName);

      if (result.ok) {
        fireAndForget(core.awardPoints(jwt.sub, jwt.platform, "agent_claimed"), "award agent_claimed");
      }

      return sendResult(reply, result);
    },
  );

  // ------------------------------------------------------------------
  // SKILLS: Purchase a skill (x402-style)
  // ------------------------------------------------------------------
  app.post<{ Body: { skillSlug: string } }>(
    "/api/v1/agents/skills/purchase",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg || !agentsPlugin) return reply.status(500).send({ error: "Not configured" });

      const { skillSlug } = request.body || {};
      if (!skillSlug) return reply.status(400).send({ error: "skillSlug required" });

      const hasPayment = !!(request.headers["x-402-payment"] || request.headers["payment"]);
      const result = await agentsPlugin.purchaseSkill(cfg, jwt.sub, skillSlug, hasPayment);

      if (result.ok) {
        fireAndForget(core.awardPoints(jwt.sub, jwt.platform, "skill_purchased"), "award skill_purchased");
      }

      return sendResult(reply, result);
    },
  );

  // ------------------------------------------------------------------
  // BOOST: Boost an event (x402 micropayment)
  // ------------------------------------------------------------------
  app.post<{ Body: { eventId: string; durationHours?: number } }>(
    "/api/v1/agents/boost-event",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg || !agentsPlugin) return reply.status(500).send({ error: "Not configured" });

      const { eventId, durationHours } = request.body || {};
      if (!eventId) return reply.status(400).send({ error: "eventId required" });

      const result = await agentsPlugin.boostEvent(cfg, jwt.sub, eventId, durationHours);

      if (result.ok) {
        fireAndForget(core.awardPoints(jwt.sub, jwt.platform, "event_boosted"), "award event_boosted");
      }

      return sendResult(reply, result);
    },
  );

  // ------------------------------------------------------------------
  // RECOMMEND: Agent-to-agent recommendation (x402)
  // ------------------------------------------------------------------
  app.post<{ Body: { targetUserId: string; context?: string; preferences?: string[] } }>(
    "/api/v1/agents/recommend",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg || !agentsPlugin) return reply.status(500).send({ error: "Not configured" });

      const { targetUserId, context, preferences } = request.body || {};
      if (!targetUserId) return reply.status(400).send({ error: "targetUserId required" });

      return sendResult(reply, await agentsPlugin.recommend(cfg, jwt.sub, targetUserId, context, preferences));
    },
  );

  // ------------------------------------------------------------------
  // TIP: Send a tip to another user/agent
  // ------------------------------------------------------------------
  app.post<{ Body: { recipientUserId: string; amount: number; eventId?: string; message?: string } }>(
    "/api/v1/agents/tip",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const jwt = request.jwtPayload!;
      const cfg = getSupabaseConfig();
      if (!cfg || !agentsPlugin) return reply.status(500).send({ error: "Not configured" });

      const { recipientUserId, amount, eventId, message } = request.body || {};

      const result = await agentsPlugin.sendTip(cfg, jwt.sub, recipientUserId, amount, eventId, message);

      if (result.ok) {
        fireAndForget(core.awardPoints(jwt.sub, jwt.platform, "tip_sent"), "award tip_sent");
      }

      return sendResult(reply, result);
    },
  );

  // ------------------------------------------------------------------
  // BOOSTS: Get active event boosts (for feed ranking)
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/agents/boosts",
    async (_request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg || !agentsPlugin) return { boosts: [] };
      return sendResult(reply, await agentsPlugin.getActiveBoosts(cfg));
    },
  );

  // ------------------------------------------------------------------
  // TRANSACTIONS: Transaction history (public, for demo)
  // ------------------------------------------------------------------
  app.get(
    "/api/v1/agents/transactions",
    async (request, reply) => {
      const cfg = getSupabaseConfig();
      if (!cfg || !agentsPlugin) return { transactions: [] };
      const query = request.query as any;
      const limit = Math.min(parseInt(query.limit) || 20, 50);
      return sendResult(reply, await agentsPlugin.getTransactions(cfg, limit));
    },
  );

  // ------------------------------------------------------------------
  // ADMIN: Award top points user
  // ------------------------------------------------------------------
  app.post<{ Body: { adminKey: string } }>(
    "/api/v1/agents/award-top-scorer",
    async (request, reply) => {
      const { adminKey } = request.body || {};
      if (adminKey !== process.env.FLOWB_ADMIN_KEY) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
      const cfg = getSupabaseConfig();
      if (!cfg || !agentsPlugin) return reply.status(500).send({ error: "Not configured" });
      return sendResult(reply, await agentsPlugin.awardTopScorer(cfg));
    },
  );

  // ------------------------------------------------------------------
  // ADMIN: Notification blast to all users
  // ------------------------------------------------------------------
  app.post<{ Body: { adminKey: string; message?: string } }>(
    "/api/v1/agents/blast",
    async (request, reply) => {
      const { adminKey, message } = request.body || {};
      if (adminKey !== process.env.FLOWB_ADMIN_KEY) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
      const cfg = getSupabaseConfig();
      if (!cfg || !agentsPlugin) return reply.status(500).send({ error: "Not configured" });
      return sendResult(reply, await agentsPlugin.blastNotification(cfg, message || ""));
    },
  );
}
