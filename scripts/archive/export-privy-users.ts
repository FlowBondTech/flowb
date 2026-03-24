/**
 * Export all Privy users for migration safety net.
 *
 * Usage: npx tsx scripts/export-privy-users.ts
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

interface PrivyLinkedAccount {
  type: string;
  telegram_user_id?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  address?: string;
  chain_type?: string;
  fid?: number;
  email?: string;
  phone_number?: string;
  subject?: string;
}

interface PrivyUser {
  id: string;
  did?: string;
  created_at: number;
  linked_accounts: PrivyLinkedAccount[];
}

async function fetchAllUsers(): Promise<PrivyUser[]> {
  const allUsers: PrivyUser[] = [];
  let cursor: string | undefined;
  let page = 0;

  while (true) {
    page++;
    const url = new URL("https://auth.privy.io/api/v1/users");
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);

    console.log(`Fetching page ${page}...`);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "privy-app-id": PRIVY_APP_ID!,
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`API error ${res.status}: ${text}`);
      break;
    }

    const data = (await res.json()) as any;
    const users: PrivyUser[] = data.data || data.users || [];

    if (!users.length) break;
    allUsers.push(...users);

    cursor = data.next_cursor;
    if (!cursor) break;

    // Respect rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  return allUsers;
}

function summarize(users: PrivyUser[]) {
  const accountTypes: Record<string, number> = {};

  for (const user of users) {
    for (const account of user.linked_accounts || []) {
      accountTypes[account.type] = (accountTypes[account.type] || 0) + 1;
    }
  }

  console.log("\n=== Privy Export Summary ===");
  console.log(`Total users: ${users.length}`);
  console.log("Linked account breakdown:");
  for (const [type, count] of Object.entries(accountTypes).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }
}

async function main() {
  console.log("Exporting Privy users...");
  const users = await fetchAllUsers();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = resolve(import.meta.dirname || __dirname, "../data");
  mkdirSync(outDir, { recursive: true });

  const outPath = resolve(outDir, `privy-export-${timestamp}.json`);
  writeFileSync(outPath, JSON.stringify(users, null, 2));
  console.log(`\nExported ${users.length} users to ${outPath}`);

  summarize(users);
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
