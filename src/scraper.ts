/**
 * Standalone eGator Event Scraper
 *
 * Runs independently on IONOS VPS (216.225.205.69).
 * Scrapes public event pages without API keys and writes to Supabase.
 * Includes a tiny health server on port 8080.
 *
 * Env vars:
 *   SUPABASE_URL             - Supabase project URL (required)
 *   SUPABASE_KEY             - Supabase anon/service key (required)
 *   SCAN_INTERVAL_HOURS      - Hours between scans (default: 2)
 *   SCRAPER_CITIES           - Comma-separated city list (default: "austin")
 *   PORT                     - Health server port (default: 8080)
 *   FLOWB_TELEGRAM_BOT_TOKEN - Bot token for admin alerts (optional)
 *   FLOWB_ADMIN_ALERT_IDS    - Comma-separated admin TG chat IDs (optional)
 */

import { createServer } from "http";
import { EGatorPlugin } from "./plugins/egator/index.js";
import { scanForNewEvents } from "./services/event-scanner.js";
import { alertAdmins } from "./services/admin-alerts.js";
import type { SbConfig } from "./utils/supabase.js";

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("[scraper] SUPABASE_URL and SUPABASE_KEY are required");
  process.exit(1);
}

const sbConfig: SbConfig = { supabaseUrl: SUPABASE_URL, supabaseKey: SUPABASE_KEY };
const INTERVAL_HOURS = Number(process.env.SCAN_INTERVAL_HOURS) || 2;
const CITIES = (process.env.SCRAPER_CITIES || "austin").split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
const PORT = Number(process.env.PORT) || 8080;

// ============================================================================
// eGator Plugin (keyless mode)
// ============================================================================

const egator = new EGatorPlugin();
egator.configureKeyless(CITIES);

// ============================================================================
// Scan state
// ============================================================================

let lastScan: { time: string; result: any } | null = null;
let nextScan: string | null = null;
let scanCount = 0;
let isScanning = false;

async function runScan() {
  if (isScanning) {
    console.log("[scraper] Scan already in progress, skipping");
    return;
  }

  isScanning = true;
  console.log(`[scraper] Starting scan #${scanCount + 1} for cities: ${CITIES.join(", ")}`);

  try {
    // Run a scan for each city
    let totalNew = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    for (const city of CITIES) {
      console.log(`[scraper] Scanning city: ${city}`);
      const result = await scanForNewEvents(
        sbConfig,
        async (opts) => egator.getEvents({ ...opts, city }),
        city,
      );
      totalNew += result.newCount;
      totalUpdated += result.updatedCount;
      totalSkipped += result.skippedCount;
    }

    lastScan = {
      time: new Date().toISOString(),
      result: { newCount: totalNew, updatedCount: totalUpdated, skippedCount: totalSkipped },
    };
    scanCount++;
    console.log(`[scraper] Scan #${scanCount} complete: ${totalNew} new, ${totalUpdated} updated, ${totalSkipped} unchanged`);

    // Notify admins when there are new or updated events
    if (totalNew > 0 || totalUpdated > 0) {
      const parts = [];
      if (totalNew > 0) parts.push(`<b>${totalNew}</b> new`);
      if (totalUpdated > 0) parts.push(`<b>${totalUpdated}</b> updated`);
      alertAdmins(
        `eGator scan #${scanCount}: ${parts.join(", ")} events (${CITIES.join(", ")})`,
        totalNew >= 10 ? "important" : "info",
      );
    }
  } catch (err: any) {
    console.error("[scraper] Scan error:", err.message);
    alertAdmins(`eGator scan error: ${err.message}`, "urgent");
    lastScan = { time: new Date().toISOString(), result: { error: err.message } };
  } finally {
    isScanning = false;
    scheduleNext();
  }
}

function scheduleNext() {
  const nextTime = new Date(Date.now() + INTERVAL_HOURS * 60 * 60 * 1000);
  nextScan = nextTime.toISOString();
}

// ============================================================================
// Health server
// ============================================================================

const server = createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: isScanning ? "scanning" : "ok",
      service: "egator-scraper",
      lastScan: lastScan?.time || null,
      lastResult: lastScan?.result || null,
      nextScan,
      scanCount,
      cities: CITIES,
      sources: egator.isConfigured() ? "keyless" : "none",
      uptime: process.uptime(),
    }, null, 2));
    return;
  }

  // Manual trigger
  if (req.url === "/scan" && req.method === "POST") {
    if (isScanning) {
      res.writeHead(409, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Scan already in progress" }));
      return;
    }
    res.writeHead(202, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "scan started" }));
    runScan();
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

// ============================================================================
// Startup
// ============================================================================

server.listen(PORT, () => {
  console.log(`[scraper] Health server listening on port ${PORT}`);
  console.log(`[scraper] Cities: ${CITIES.join(", ")}`);
  console.log(`[scraper] Scan interval: ${INTERVAL_HOURS}h`);
  console.log(`[scraper] Supabase: ${SUPABASE_URL}`);

  // Initial scan after 5s startup delay
  setTimeout(() => runScan(), 5000);

  // Schedule recurring scans
  setInterval(() => runScan(), INTERVAL_HOURS * 60 * 60 * 1000);
  scheduleNext();
});

// ============================================================================
// Graceful shutdown
// ============================================================================

function shutdown(signal: string) {
  console.log(`[scraper] Received ${signal}, shutting down...`);
  server.close(() => {
    console.log("[scraper] Health server closed");
    process.exit(0);
  });
  // Force exit after 10s
  setTimeout(() => process.exit(1), 10000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
