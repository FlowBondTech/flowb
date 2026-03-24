#!/usr/bin/env npx tsx
/**
 * migrate-privy-to-supabase.ts
 *
 * Phase 5: Migrate existing Privy users to Supabase Auth.
 *
 * Prerequisites:
 *   - Run scripts/export-privy-users.ts first (Phase 0)
 *   - Supabase migration 029_flowb_passport.sql applied (Phase 1)
 *   - SUPABASE_URL, SUPABASE_KEY (service_role) env vars set
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_KEY=... npx tsx scripts/migrate-privy-to-supabase.ts [path-to-privy-export.json]
 *
 * What it does:
 *   1. Reads Privy export JSON (from Phase 0 export)
 *   2. For each Privy user:
 *      - Creates a Supabase Auth user (via admin.createUser)
 *      - Upserts flowb_passport row
 *      - Updates flowb_identities.supabase_uid
 *   3. Handles duplicates: same email → merge into one Supabase user
 *   4. Logs results: migrated, skipped, errors
 *
 * Dry run: DRY_RUN=1 npx tsx scripts/migrate-privy-to-supabase.ts ...
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // Must be service_role key
const DRY_RUN = process.env.DRY_RUN === "1";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY (service_role) env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface PrivyLinkedAccount {
  type: string;
  address?: string;
  email?: string;
  phone?: string;
  username?: string;
  fid?: number;
  telegram_user_id?: string;
  subject?: string; // for social accounts
  name?: string;
  [key: string]: any;
}

interface PrivyUser {
  id: string; // DID
  created_at: string;
  linked_accounts: PrivyLinkedAccount[];
}

interface MigrationResult {
  privyId: string;
  supabaseUid: string | null;
  status: "created" | "existing" | "skipped" | "error";
  email: string | null;
  platforms: string[];
  error?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────

function extractEmail(user: PrivyUser): string | null {
  const emailAccount = user.linked_accounts.find((a) => a.type === "email");
  return emailAccount?.address || emailAccount?.email || null;
}

function extractDisplayName(user: PrivyUser): string | null {
  // Try Farcaster first, then Telegram, then email prefix
  for (const a of user.linked_accounts) {
    if (a.type === "farcaster" && a.username) return a.username;
    if (a.type === "telegram" && (a.username || a.name)) return a.username || a.name || null;
    if (a.type === "twitter" && a.username) return a.username;
    if (a.type === "discord" && a.username) return a.username;
  }
  const email = extractEmail(user);
  if (email) return email.split("@")[0];
  return null;
}

function extractPlatformIds(user: PrivyUser): Array<{ platform: string; platformUserId: string }> {
  const ids: Array<{ platform: string; platformUserId: string }> = [];

  for (const a of user.linked_accounts) {
    switch (a.type) {
      case "email":
        ids.push({ platform: "web", platformUserId: `web_${user.id}` });
        break;
      case "telegram":
        if (a.telegram_user_id) {
          ids.push({ platform: "telegram", platformUserId: `telegram_${a.telegram_user_id}` });
        }
        break;
      case "farcaster":
        if (a.fid) {
          ids.push({ platform: "farcaster", platformUserId: `farcaster_${a.fid}` });
        }
        break;
      case "phone":
        if (a.phone) {
          ids.push({ platform: "whatsapp", platformUserId: `whatsapp_${a.phone.replace(/\D/g, "")}` });
        }
        break;
      case "wallet":
        if (a.address) {
          ids.push({ platform: "web", platformUserId: `web_${user.id}` });
        }
        break;
    }
  }

  // Always add the web identity for Privy DID
  if (!ids.some((i) => i.platformUserId === `web_${user.id}`)) {
    ids.push({ platform: "web", platformUserId: `web_${user.id}` });
  }

  return ids;
}

// ── Main Migration ──────────────────────────────────────────────────

async function migrateUser(user: PrivyUser, emailToUidMap: Map<string, string>): Promise<MigrationResult> {
  const email = extractEmail(user);
  const displayName = extractDisplayName(user);
  const platformIds = extractPlatformIds(user);
  const platforms = platformIds.map((p) => p.platform);

  // Check if we already migrated a user with this email (dedup)
  if (email && emailToUidMap.has(email)) {
    const existingUid = emailToUidMap.get(email)!;
    // Link this Privy user's platform identities to the existing Supabase user
    if (!DRY_RUN) {
      for (const { platformUserId } of platformIds) {
        await supabase
          .from("flowb_identities")
          .update({ supabase_uid: existingUid })
          .eq("platform_user_id", platformUserId);
      }
    }
    return {
      privyId: user.id,
      supabaseUid: existingUid,
      status: "existing",
      email,
      platforms,
    };
  }

  // Check if this user already has a flowb_passport entry
  const { data: existingPassport } = await supabase
    .from("flowb_passport")
    .select("supabase_uid")
    .or(platformIds.map((p) => `canonical_id.eq.${p.platformUserId}`).join(","))
    .limit(1)
    .single();

  if (existingPassport) {
    if (email) emailToUidMap.set(email, existingPassport.supabase_uid);
    return {
      privyId: user.id,
      supabaseUid: existingPassport.supabase_uid,
      status: "existing",
      email,
      platforms,
    };
  }

  if (DRY_RUN) {
    return {
      privyId: user.id,
      supabaseUid: null,
      status: "created",
      email,
      platforms,
    };
  }

  // Create Supabase Auth user
  const userEmail = email || `${user.id.replace("did:privy:", "")}@passport.flowb.me`;
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: userEmail,
    email_confirm: true, // Skip email verification for migrated users
    app_metadata: {
      privy_id: user.id,
      platforms,
      migrated_at: new Date().toISOString(),
    },
    user_metadata: {
      display_name: displayName,
    },
  });

  if (authError) {
    // If user already exists by email, look them up
    if (authError.message?.includes("already been registered")) {
      const { data: { users } } = await supabase.auth.admin.listUsers({
        filter: `email.eq.${userEmail}`,
      } as any);
      if (users?.[0]) {
        const uid = users[0].id;
        if (email) emailToUidMap.set(email, uid);
        // Still link identities
        for (const { platformUserId } of platformIds) {
          await supabase
            .from("flowb_identities")
            .update({ supabase_uid: uid })
            .eq("platform_user_id", platformUserId);
        }
        return {
          privyId: user.id,
          supabaseUid: uid,
          status: "existing",
          email,
          platforms,
        };
      }
    }
    return {
      privyId: user.id,
      supabaseUid: null,
      status: "error",
      email,
      platforms,
      error: authError.message,
    };
  }

  const supabaseUid = authData.user.id;
  if (email) emailToUidMap.set(email, supabaseUid);

  // Determine canonical_id (first platform identity found in flowb_identities, or the first platform ID)
  let canonicalId = platformIds[0]?.platformUserId || `web_${user.id}`;
  const { data: existingIdentity } = await supabase
    .from("flowb_identities")
    .select("canonical_id")
    .in("platform_user_id", platformIds.map((p) => p.platformUserId))
    .limit(1)
    .single();

  if (existingIdentity?.canonical_id) {
    canonicalId = existingIdentity.canonical_id;
  }

  // Upsert flowb_passport
  await supabase.from("flowb_passport").upsert({
    supabase_uid: supabaseUid,
    canonical_id: canonicalId,
    email: email || null,
    display_name: displayName || null,
    avatar_url: null,
  });

  // Update flowb_identities with supabase_uid
  for (const { platformUserId } of platformIds) {
    await supabase
      .from("flowb_identities")
      .update({ supabase_uid: supabaseUid })
      .eq("platform_user_id", platformUserId);
  }

  return {
    privyId: user.id,
    supabaseUid,
    status: "created",
    email,
    platforms,
  };
}

async function main() {
  // Find export file
  let exportPath = process.argv[2];
  if (!exportPath) {
    // Auto-find the latest export
    const dataDir = path.join(process.cwd(), "data");
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir)
        .filter((f) => f.startsWith("privy-export-") && f.endsWith(".json"))
        .sort()
        .reverse();
      if (files.length > 0) {
        exportPath = path.join(dataDir, files[0]);
        console.log(`Using latest export: ${exportPath}`);
      }
    }
  }

  if (!exportPath || !fs.existsSync(exportPath)) {
    console.error("Usage: npx tsx scripts/migrate-privy-to-supabase.ts [path-to-privy-export.json]");
    console.error("  Or place export in data/privy-export-*.json");
    process.exit(1);
  }

  console.log(DRY_RUN ? "=== DRY RUN ===" : "=== LIVE MIGRATION ===");
  console.log(`Reading export from: ${exportPath}`);

  const raw = JSON.parse(fs.readFileSync(exportPath, "utf-8"));
  const users: PrivyUser[] = raw.users || raw;

  console.log(`Found ${users.length} Privy users to migrate`);

  const results: MigrationResult[] = [];
  const emailToUidMap = new Map<string, string>();
  let created = 0;
  let existing = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    try {
      const result = await migrateUser(user, emailToUidMap);
      results.push(result);

      switch (result.status) {
        case "created": created++; break;
        case "existing": existing++; break;
        case "skipped": skipped++; break;
        case "error": errors++; break;
      }

      // Progress log every 50 users
      if ((i + 1) % 50 === 0 || i === users.length - 1) {
        console.log(`  Progress: ${i + 1}/${users.length} (created=${created}, existing=${existing}, errors=${errors})`);
      }
    } catch (err: any) {
      errors++;
      results.push({
        privyId: user.id,
        supabaseUid: null,
        status: "error",
        email: extractEmail(user),
        platforms: [],
        error: err.message,
      });
    }
  }

  // Summary
  console.log("\n=== Migration Summary ===");
  console.log(`Total users: ${users.length}`);
  console.log(`Created:     ${created}`);
  console.log(`Existing:    ${existing}`);
  console.log(`Skipped:     ${skipped}`);
  console.log(`Errors:      ${errors}`);

  if (errors > 0) {
    console.log("\n=== Errors ===");
    for (const r of results.filter((r) => r.status === "error")) {
      console.log(`  ${r.privyId}: ${r.error}`);
    }
  }

  // Write results
  const outPath = path.join(
    path.dirname(exportPath),
    `migration-results-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  fs.writeFileSync(outPath, JSON.stringify({ summary: { total: users.length, created, existing, skipped, errors }, results }, null, 2));
  console.log(`\nResults written to: ${outPath}`);

  // Verification
  if (!DRY_RUN) {
    console.log("\n=== Verification ===");
    const { count: passportCount } = await supabase
      .from("flowb_passport")
      .select("*", { count: "exact", head: true });
    console.log(`flowb_passport rows: ${passportCount}`);

    const { count: linkedCount } = await supabase
      .from("flowb_identities")
      .select("*", { count: "exact", head: true })
      .not("supabase_uid", "is", null);
    console.log(`flowb_identities with supabase_uid: ${linkedCount}`);
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
