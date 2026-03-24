/**
 * Export Privy app settings for migration reference.
 *
 * Usage: npx tsx scripts/export-privy-settings.ts
 *
 * Requires PRIVY_APP_ID and PRIVY_APP_SECRET in .env
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const PRIVY_APP_ID = process.env.PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;

if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
  console.error("Missing PRIVY_APP_ID or PRIVY_APP_SECRET in environment");
  process.exit(1);
}

const basicAuth = Buffer.from(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`).toString("base64");

async function main() {
  console.log("Exporting Privy app settings...");

  const res = await fetch(`https://auth.privy.io/api/v1/apps/${PRIVY_APP_ID}`, {
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "privy-app-id": PRIVY_APP_ID!,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`API error ${res.status}: ${text}`);
    process.exit(1);
  }

  const settings = await res.json();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = resolve(import.meta.dirname || __dirname, "../data");
  mkdirSync(outDir, { recursive: true });

  const outPath = resolve(outDir, `privy-settings-${timestamp}.json`);
  writeFileSync(outPath, JSON.stringify(settings, null, 2));
  console.log(`Exported settings to ${outPath}`);
  console.log("\nSettings overview:");
  console.log(JSON.stringify(settings, null, 2).slice(0, 2000));
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
