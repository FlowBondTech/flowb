/**
 * Doc Access Routes
 *
 * Tracking for technical documentation views at flowb.me/tech.
 * Auth is handled client-side via Supabase Auth OTP.
 * This file provides section view tracking + admin alerts.
 */

import type { FastifyInstance } from "fastify";
import { escHtml } from "../services/email.js";
import { alertAdmins } from "../services/admin-alerts.js";
import { sbInsert, type SbConfig } from "../utils/supabase.js";
import { fireAndForget } from "../utils/logger.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSupabaseConfig(): SbConfig | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) return null;
  return { supabaseUrl: url, supabaseKey: key };
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

export function registerDocAccessRoutes(app: FastifyInstance) {

  // ========================================================================
  // POST /api/v1/doc-access/track-view — Track section views + admin alerts
  // ========================================================================

  app.post<{ Body: { section: string; email?: string } }>(
    "/api/v1/doc-access/track-view",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request) => {
      const cfg = getSupabaseConfig();
      const { section, email } = request.body || {};
      if (!section) return { ok: true };

      const safeEmail = email || "unknown";

      // Admin alert on auth event
      if (section === "_auth") {
        fireAndForget(
          Promise.resolve(alertAdmins(`Tech docs viewed by <b>${escHtml(safeEmail)}</b>`, "important")),
          "doc access alert",
        );
      }

      // Fire-and-forget DB insert
      if (cfg) {
        fireAndForget(
          (async () => {
            await sbInsert(cfg, "flowb_doc_views", {
              email: safeEmail,
              section,
            });
          })(),
          "doc view tracking",
        );
      }

      return { ok: true };
    },
  );
}
