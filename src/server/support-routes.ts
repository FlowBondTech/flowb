/**
 * Support Email Routes
 *
 * Handles Resend inbound webhook for support@flowb.me emails,
 * plus REST API for future web admin interface.
 */

import type { FastifyInstance } from "fastify";
import type { FlowBCore } from "../core/flowb.js";
import { log } from "../utils/logger.js";
import {
  handleInboundEmail,
  listTickets,
  getTicket,
  sendReply,
  updateTicketStatus,
} from "../services/support.js";
import { Webhook } from "svix";

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

export function registerSupportRoutes(app: FastifyInstance, _core: FlowBCore) {

  // ========================================================================
  // Resend Inbound Webhook — POST /api/v1/webhooks/resend/inbound
  //
  // For svix signature verification we need the raw request body.
  // We capture it via a preParsing hook scoped to this route, storing
  // the raw buffer on the request object so the handler can verify it.
  // ========================================================================

  app.post("/api/v1/webhooks/resend/inbound", {
    config: { rawBody: true },
    preParsing: async (request, _reply, payload) => {
      // Collect the raw body chunks for signature verification
      const chunks: Buffer[] = [];
      for await (const chunk of payload as any) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      const rawBody = Buffer.concat(chunks);
      (request as any).rawBody = rawBody.toString("utf-8");

      // Return a new readable stream from the buffer so Fastify can still parse JSON
      const { Readable } = await import("stream");
      return Readable.from(rawBody);
    },
  }, async (request, reply) => {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    const payload = request.body as any;
    const rawBody: string = (request as any).rawBody || JSON.stringify(payload);

    // Verify svix signature if secret is configured
    if (secret) {
      const svixId = request.headers["svix-id"] as string;
      const svixTimestamp = request.headers["svix-timestamp"] as string;
      const svixSignature = request.headers["svix-signature"] as string;

      if (!svixId || !svixTimestamp || !svixSignature) {
        log.warn("[support-webhook]", "Missing svix headers");
        return reply.status(401).send({ error: "Missing signature headers" });
      }

      try {
        const wh = new Webhook(secret);
        wh.verify(rawBody, {
          "svix-id": svixId,
          "svix-timestamp": svixTimestamp,
          "svix-signature": svixSignature,
        });
      } catch (err) {
        log.warn("[support-webhook]", "Signature verification failed", {
          error: err instanceof Error ? err.message : String(err),
        });
        return reply.status(401).send({ error: "Invalid signature" });
      }
    }

    // Process the event
    const eventType = payload?.type;
    log.info("[support-webhook]", `Received ${eventType}`);

    if (eventType === "email.received") {
      const data = payload.data || {};

      // Extract fields from Resend inbound format
      const emailId = data.email_id || data.id || `resend_${Date.now()}`;
      const from = data.from?.address || data.from || "";
      const fromName = data.from?.name || "";
      const to = data.to?.[0]?.address || data.to?.[0] || data.to || "support@flowb.me";
      const subject = data.subject || "";
      const textBody = data.text || "";
      const htmlBody = data.html || "";

      if (!from) {
        log.warn("[support-webhook]", "No from address in email");
        return reply.status(400).send({ error: "Missing from address" });
      }

      const ticket = await handleInboundEmail({
        emailId,
        from,
        fromName,
        to,
        subject,
        textBody,
        htmlBody,
      });

      return { ok: true, ticketId: ticket?.id || null };
    }

    // Accept but ignore other event types
    return { ok: true, ignored: eventType };
  });

  // ========================================================================
  // REST API (future web admin)
  // ========================================================================

  // List tickets
  app.get<{ Querystring: { status?: string; limit?: string } }>(
    "/api/v1/support/tickets",
    async (request, reply) => {
      const adminKey = process.env.FLOWB_ADMIN_KEY;
      if (!adminKey || request.headers["x-admin-key"] !== adminKey) {
        return reply.status(403).send({ error: "Unauthorized" });
      }

      const { status, limit } = request.query;
      const tickets = await listTickets(status, limit ? parseInt(limit, 10) : 20);
      return { tickets };
    },
  );

  // Get single ticket
  app.get<{ Params: { id: string } }>(
    "/api/v1/support/tickets/:id",
    async (request, reply) => {
      const adminKey = process.env.FLOWB_ADMIN_KEY;
      if (!adminKey || request.headers["x-admin-key"] !== adminKey) {
        return reply.status(403).send({ error: "Unauthorized" });
      }

      const ticket = await getTicket(request.params.id);
      if (!ticket) return reply.status(404).send({ error: "Ticket not found" });
      return { ticket };
    },
  );

  // Send reply to ticket
  app.post<{ Params: { id: string }; Body: { reply_text: string; user_id: string; ai_generated?: boolean } }>(
    "/api/v1/support/tickets/:id/reply",
    async (request, reply) => {
      const adminKey = process.env.FLOWB_ADMIN_KEY;
      if (!adminKey || request.headers["x-admin-key"] !== adminKey) {
        return reply.status(403).send({ error: "Unauthorized" });
      }

      const { reply_text, user_id, ai_generated } = request.body || {};
      if (!reply_text || !user_id) {
        return reply.status(400).send({ error: "Missing reply_text or user_id" });
      }

      const ok = await sendReply(request.params.id, user_id, reply_text, { aiGenerated: ai_generated });
      if (!ok) return reply.status(500).send({ error: "Failed to send reply" });
      return { ok: true };
    },
  );
}
