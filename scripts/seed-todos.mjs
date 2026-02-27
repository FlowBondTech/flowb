#!/usr/bin/env node
/**
 * Seed FlowB Todos
 *
 * Inserts all discovered incomplete features/tasks into the flowb_todos table.
 * Run after migration 011_todos.sql.
 *
 * Usage: node scripts/seed-todos.mjs
 *
 * Requires: DANZ_SUPABASE_URL, DANZ_SUPABASE_KEY
 */

const SUPABASE_URL = process.env.DANZ_SUPABASE_URL;
const SUPABASE_KEY = process.env.DANZ_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing DANZ_SUPABASE_URL or DANZ_SUPABASE_KEY");
  process.exit(1);
}

const todos = [
  // Signal Integration
  {
    title: "Deploy signal-cli-rest-api Docker container",
    description: "Register a phone number with Signal, configure json-rpc mode for best performance. Deploy alongside flowb.fly.dev or as separate service.",
    category: "signal",
    priority: "high",
    source: "codebase_scan",
  },
  {
    title: "Set Signal env vars on Fly.io",
    description: "SIGNAL_API_URL, SIGNAL_BOT_NUMBER, SIGNAL_WEBHOOK_SECRET",
    category: "signal",
    priority: "high",
    source: "codebase_scan",
  },
  {
    title: "Configure signal-cli webhook endpoint",
    description: "Point signal-cli-rest-api webhook to POST https://flowb.fly.dev/api/v1/signal/webhook",
    category: "signal",
    priority: "high",
    source: "codebase_scan",
  },
  {
    title: "Run migration 010_signal.sql",
    description: "Execute Signal migration against Supabase to create flowb_signal_conversations table",
    category: "signal",
    priority: "high",
    source: "codebase_scan",
  },
  {
    title: "Test Signal end-to-end",
    description: "Send 'hi' to bot number on Signal, verify welcome message, test events/points/crews",
    category: "signal",
    priority: "medium",
    source: "codebase_scan",
  },
  {
    title: "Test Signal cross-platform identity linking",
    description: "Verify that Signal + Telegram users with same phone number link via Privy",
    category: "signal",
    priority: "medium",
    source: "codebase_scan",
  },
  {
    title: "Add Signal to admin daily summary counts",
    description: "Update alertDaily() in admin-alerts.ts to include Signal user/message stats",
    category: "signal",
    priority: "low",
    file_ref: "src/services/admin-alerts.ts",
    source: "codebase_scan",
  },
  {
    title: "Signal mini app (miniapp/signal/)",
    description: "Build web mini app for Signal, same pattern as wa.flowb.me",
    category: "signal",
    priority: "low",
    source: "codebase_scan",
  },
  {
    title: "Signal group bot support",
    description: "Currently DM-only. Add support for Signal group messages.",
    category: "signal",
    priority: "low",
    source: "codebase_scan",
  },
  {
    title: "Add Signal to docs site platform list",
    description: "Update docs.flowb.me to include Signal as supported platform",
    category: "signal",
    priority: "low",
    source: "codebase_scan",
  },

  // Security
  {
    title: "Fix Postiz per-org API key",
    description: "Extract per-org API key from Postiz response instead of using master key. Currently all orgs share cfg.postizMasterApiKey. Security/isolation issue.",
    category: "security",
    priority: "high",
    file_ref: "src/plugins/social/index.ts:104",
    source: "codebase_scan",
  },

  // Privy Social Linking (Phase 3)
  {
    title: "Add Discord social linking via Privy",
    description: "Phase 3 of PLAN-telegram-auth.md - add Discord as linked social account",
    category: "social",
    priority: "medium",
    source: "codebase_scan",
  },
  {
    title: "Add Twitter/X social linking via Privy",
    description: "Phase 3 of PLAN-telegram-auth.md - add Twitter/X as linked social account",
    category: "social",
    priority: "medium",
    source: "codebase_scan",
  },
  {
    title: "Add GitHub social linking via Privy",
    description: "Phase 3 of PLAN-telegram-auth.md - add GitHub as linked social account",
    category: "social",
    priority: "low",
    source: "codebase_scan",
  },
  {
    title: "Implement verification badges system",
    description: "Phase 3 - show badges for users with multiple linked socials",
    category: "social",
    priority: "low",
    source: "codebase_scan",
  },
  {
    title: "Multi-social bonus points",
    description: "Award 10 pts per linked social account. Phase 3 of PLAN-telegram-auth.md.",
    category: "social",
    priority: "low",
    source: "codebase_scan",
  },

  // SocialB
  {
    title: "Implement Mastodon posting support",
    description: "Mastodon is listed in web/social.html as 'Coming Soon'. Implement via Postiz integration.",
    category: "social",
    priority: "low",
    file_ref: "web/social.html:635",
    source: "codebase_scan",
  },

  // SMS
  {
    title: "Research SMS notification provider",
    description: "Evaluate Twilio vs alternatives for SMS notifications. Mentioned as coming soon on pitch.html.",
    category: "infra",
    priority: "low",
    source: "codebase_scan",
  },
  {
    title: "Implement SMS notification channel",
    description: "Add SMS dispatch to notifications.ts, integrate with chosen SMS provider",
    category: "infra",
    priority: "low",
    file_ref: "src/services/notifications.ts",
    source: "codebase_scan",
  },

  // Mobile
  {
    title: "Update about.html mobile app copy",
    description: "about.html says 'Coming soon to iOS & Android' but Expo app exists in mobile/. Update copy.",
    category: "general",
    priority: "low",
    file_ref: "web/about.html:253",
    source: "codebase_scan",
  },

  // Farcaster Mini App
  {
    title: "Complete Farcaster mini app About feature",
    description: "AboutScreen.tsx has a feature listed as 'Coming soon'. Identify and implement it.",
    category: "general",
    priority: "low",
    file_ref: "miniapp/farcaster/src/components/AboutScreen.tsx:82",
    source: "codebase_scan",
  },

  // Admin
  {
    title: "Set FLOWB_ADMIN_ALERT_IDS for steph + koH",
    description: "Get Telegram chat IDs for steph and koH, add to FLOWB_ADMIN_ALERT_IDS env var on Fly.io",
    category: "infra",
    priority: "high",
    assigned_to: "koH",
    source: "codebase_scan",
  },
  {
    title: "Add FLOWB_ADMIN_ALERT_IDS to .env.example",
    description: "Document the env var for admin Telegram notifications in .env.example",
    category: "infra",
    priority: "low",
    source: "codebase_scan",
  },

  // Todo System
  {
    title: "Run migration 011_todos.sql",
    description: "Execute todo system migration against Supabase to create flowb_todos table",
    category: "infra",
    priority: "high",
    source: "codebase_scan",
  },
  {
    title: "Add todo UI to web app or mini apps",
    description: "Build a simple todo list view in one of the frontends",
    category: "general",
    priority: "medium",
    source: "codebase_scan",
  },
  {
    title: "Add /todo command to WhatsApp + Signal bots",
    description: "Telegram bot has /todo command. Port to WhatsApp and Signal bots too.",
    category: "general",
    priority: "low",
    source: "codebase_scan",
  },
];

async function seed() {
  console.log(`Seeding ${todos.length} todos into flowb_todos...`);

  // Use upsert-like behavior: insert all, skip if title already exists
  const res = await fetch(`${SUPABASE_URL}/rest/v1/flowb_todos`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal,resolution=ignore-duplicates",
    },
    body: JSON.stringify(todos.map(t => ({
      title: t.title,
      description: t.description || null,
      category: t.category || "general",
      priority: t.priority || "medium",
      status: "open",
      assigned_to: t.assigned_to || null,
      created_by: "system",
      source: t.source || "codebase_scan",
      file_ref: t.file_ref || null,
    }))),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Seed failed (${res.status}):`, err);
    process.exit(1);
  }

  console.log(`Seeded ${todos.length} todos successfully.`);
}

seed().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});
