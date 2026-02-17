#!/usr/bin/env node
/**
 * Auto-generates VitePress documentation from the FlowB codebase.
 * Run: node scripts/generate-docs.mjs
 *
 * Parses plugins, API routes, bot commands, and services
 * to produce markdown pages in docs/.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join, basename } from "path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const DOCS = join(ROOT, "docs");
const SRC = join(ROOT, "src");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function read(path) {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return "";
  }
}

function writeDoc(name, content) {
  const path = join(DOCS, name);
  const existing = read(path);
  if (existing.trim() === content.trim()) return false;
  writeFileSync(path, content);
  return true;
}

function timestamp() {
  return new Date().toISOString().replace("T", " ").replace(/\.\d+Z/, " UTC");
}

// ---------------------------------------------------------------------------
// Plugin parser
// ---------------------------------------------------------------------------

function parsePlugin(filePath) {
  const src = read(filePath);
  if (!src) return null;

  // Extract class name
  const classMatch = src.match(/export class (\w+)/);
  const className = classMatch?.[1] || "Unknown";

  // Extract plugin name
  const nameMatch = src.match(/name\s*=\s*["']([^"']+)["']/);
  const pluginName = nameMatch?.[1] || className;

  // Extract actions block
  const actions = [];
  const actionRe = /["']([a-z][\w-]*)["']\s*:\s*\{\s*description:\s*"([^"]+)"/g;
  let m;
  while ((m = actionRe.exec(src)) !== null) {
    const requiresAuth = src.slice(m.index, m.index + 200).includes("requiresAuth: true");
    actions.push({ name: m[1], description: m[2], requiresAuth });
  }

  return { className, pluginName, actions, filePath: filePath.replace(ROOT + "/", "") };
}

function generatePluginDocs() {
  const pluginDirs = ["flow", "points", "egator", "neynar", "danz"];
  const plugins = [];

  for (const dir of pluginDirs) {
    const indexPath = join(SRC, "plugins", dir, "index.ts");
    const plugin = parsePlugin(indexPath);
    if (plugin) plugins.push({ dir, ...plugin });
  }

  // Individual plugin pages
  for (const p of plugins) {
    const authActions = p.actions.filter((a) => a.requiresAuth);
    const publicActions = p.actions.filter((a) => !a.requiresAuth);

    let md = `---
title: "${p.pluginName} Plugin"
---

# ${p.pluginName} Plugin

**Class**: \`${p.className}\` | **Source**: \`${p.filePath}\`

`;

    if (publicActions.length) {
      md += `## Public Actions\n\n`;
      md += `| Action | Description |\n|--------|-------------|\n`;
      for (const a of publicActions) {
        md += `| \`${a.name}\` | ${a.description} |\n`;
      }
      md += "\n";
    }

    if (authActions.length) {
      md += `## Authenticated Actions\n\nThese require a valid user session.\n\n`;
      md += `| Action | Description |\n|--------|-------------|\n`;
      for (const a of authActions) {
        md += `| \`${a.name}\` | ${a.description} |\n`;
      }
      md += "\n";
    }

    // Add event source adapters for egator
    if (p.dir === "egator") {
      const sourcesDir = join(SRC, "plugins", "egator", "sources");
      if (existsSync(sourcesDir)) {
        const adapters = readdirSync(sourcesDir)
          .filter((f) => f.endsWith(".ts"))
          .map((f) => {
            const content = read(join(sourcesDir, f));
            const nameMatch = content.match(/name\s*=\s*["']([^"']+)["']/);
            return { file: f, name: nameMatch?.[1] || f.replace(".ts", "") };
          });

        if (adapters.length) {
          md += `## Event Sources\n\n`;
          md += `| Adapter | Source File |\n|---------|-------------|\n`;
          for (const a of adapters) {
            md += `| ${a.name} | \`src/plugins/egator/sources/${a.file}\` |\n`;
          }
          md += "\n";
        }
      }
    }

    md += `---\n\n*Auto-generated on ${timestamp()}*\n`;
    writeDoc(`plugins/${p.dir}.md`, md);
  }

  // Plugin index page
  let indexMd = `---
title: Plugins
---

# Plugins

FlowB is built on a modular plugin architecture. Each plugin provides a set of actions that can be invoked from the Telegram bot, API, or Farcaster mini app.

| Plugin | Class | Actions |
|--------|-------|---------|
`;
  for (const p of plugins) {
    indexMd += `| [${p.pluginName}](/plugins/${p.dir}) | \`${p.className}\` | ${p.actions.length} |\n`;
  }
  indexMd += `\n---\n\n*Auto-generated on ${timestamp()}*\n`;
  writeDoc("plugins/index.md", indexMd);
}

// ---------------------------------------------------------------------------
// API routes parser
// ---------------------------------------------------------------------------

function generateApiDocs() {
  const routesSrc = read(join(SRC, "server", "routes.ts"));
  const appSrc = read(join(SRC, "server", "app.ts"));

  // Parse route comments + app.method patterns from routes.ts
  const routes = [];
  const lines = routesSrc.split("\n");

  let currentComment = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Capture section comments like "// AUTH: Telegram Mini App"
    const commentMatch = line.match(/^\s*\/\/\s+([A-Z]+:\s*.+)$/);
    if (commentMatch) {
      currentComment = commentMatch[1];
      continue;
    }

    // Match route definitions
    const routeMatch = line.match(/app\.(get|post|put|patch|delete)\s*[<(]/i);
    if (routeMatch) {
      const method = routeMatch[1].toUpperCase();

      // Look for the path string in this or next few lines
      let pathSearch = lines.slice(i, i + 3).join(" ");
      const pathMatch = pathSearch.match(/["'`](\/[^"'`]+)["'`]/);
      const path = pathMatch?.[1] || "unknown";

      // Determine auth requirement
      const contextLines = lines.slice(i, i + 15).join(" ");
      const requiresAuth =
        currentComment.toLowerCase().includes("requires auth") ||
        contextLines.includes("requireAuth") ||
        contextLines.includes("jwt") ||
        contextLines.includes("Authorization");

      routes.push({
        method,
        path,
        section: currentComment,
        requiresAuth,
      });

      currentComment = "";
    }
  }

  // Also parse app.ts for redirect routes
  const appLines = appSrc.split("\n");
  let appComment = "";
  for (let i = 0; i < appLines.length; i++) {
    const line = appLines[i];
    const commentMatch = line.match(/^\s*\/\/\s+(.+)$/);
    if (commentMatch && !commentMatch[1].startsWith("=")) {
      appComment = commentMatch[1];
    }
    const routeMatch = line.match(/app\.(get|post)\s*[<(]/i);
    if (routeMatch) {
      const method = routeMatch[1].toUpperCase();
      let pathSearch = appLines.slice(i, i + 3).join(" ");
      const pathMatch = pathSearch.match(/["'`](\/[^"'`]+)["'`]/);
      if (pathMatch) {
        routes.push({ method, path: pathMatch[1], section: appComment, requiresAuth: false });
      }
      appComment = "";
    }
  }

  // Group by section prefix
  const groups = {};
  for (const r of routes) {
    const prefix = r.section.split(":")[0]?.trim() || "Other";
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(r);
  }

  let md = `---
title: API Reference
---

# API Reference

FlowB exposes two backend servers:

| Server | Domain | Purpose |
|--------|--------|---------|
| **eGator API** | \`egator-api.fly.dev\` | Event discovery (categories, discover, tonight) |
| **FlowB API** | \`flowb.fly.dev\` | User auth, social, crews, points, RSVP, calendar |

---

`;

  for (const [group, groupRoutes] of Object.entries(groups)) {
    md += `## ${group}\n\n`;
    md += `| Method | Path | Auth | Description |\n|--------|------|------|-------------|\n`;
    for (const r of groupRoutes) {
      const desc = r.section.includes(":") ? r.section.split(":").slice(1).join(":").trim() : "";
      md += `| \`${r.method}\` | \`${r.path}\` | ${r.requiresAuth ? "Yes" : "No"} | ${desc} |\n`;
    }
    md += "\n";
  }

  md += `---\n\n*Auto-generated from \`src/server/routes.ts\` and \`src/server/app.ts\` on ${timestamp()}*\n`;
  writeDoc("api.md", md);
}

// ---------------------------------------------------------------------------
// Bot commands parser
// ---------------------------------------------------------------------------

function generateBotDocs() {
  const src = read(join(SRC, "telegram", "bot.ts"));
  const lines = src.split("\n");

  // Known command descriptions (supplement auto-detection)
  const commandDescriptions = {
    start: "Begin or return to the main menu. Handles deep link invites.",
    menu: "Show the main menu with all action buttons",
    app: "Open the FlowB Telegram mini app",
    events: "Browse EthDenver events in swipeable card format",
    search: "Search events by keyword",
    mylist: "View your saved events",
    checkin: "Check in at a current event",
    moves: "View available dance move challenges",
    points: "View your points, streak, and milestone level",
    referral: "Get your personal referral link",
    wallet: "Link your Base wallet for on-chain rewards",
    rewards: "View and claim available rewards",
    challenges: "View active challenges",
    flow: "Manage your flow — friends and crews overview",
    share: "Share your personal flow invite link",
    crew: "Manage crews — create, list, invite, settings",
    going: "RSVP to an event or view your schedule",
    whosgoing: "See which friends and crew are going to events",
    schedule: "View your upcoming RSVP'd events",
    help: "Show available commands and help text",
    register: "Verify your account or check status",
  };

  // Extract bot.command() calls
  const commands = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/bot\.command\(["'](\w+)["']/);
    if (match) {
      commands.push({
        name: match[1],
        line: i + 1,
        description: commandDescriptions[match[1]] || "",
      });
    }
  }

  // Extract callback query patterns
  const callbacks = new Set();
  const cbRe = /(?:data\.startsWith|action\s*===?\s*)["'`](\w[\w:-]*)["'`]/g;
  let m;
  while ((m = cbRe.exec(src)) !== null) {
    callbacks.add(m[1]);
  }

  // Deep link handlers
  const deepLinks = [];
  const dlRe = /args\?\.startsWith\(["'](\w+)_["']\)/g;
  while ((m = dlRe.exec(src)) !== null) {
    deepLinks.push(m[1]);
  }

  let md = `---
title: Telegram Bot
---

# Telegram Bot Commands

The FlowB Telegram bot (\`@Flow_b_bot\`) provides the primary user interface for discovering events, managing crews, and earning points.

## Commands

| Command | Description |
|---------|-------------|
`;
  for (const c of commands) {
    md += `| \`/${c.name}\` | ${c.description || "—"} |\n`;
  }

  md += `\n## Deep Links\n\nThese are triggered via \`https://t.me/Flow_b_bot?start={prefix}_{code}\` or through \`flowb.me/{prefix}/{code}\` short links.\n\n`;
  md += `| Prefix | URL Pattern | Purpose |\n|--------|-------------|----------|\n`;
  const dlDescriptions = {
    f: "Personal flow invite — connects two users as friends",
    g: "Crew join — joins a crew via its public code",
    gi: "Tracked crew invite — joins via personal invite link with attribution",
    ref: "Referral — tracks referral signup",
  };
  for (const prefix of deepLinks) {
    md += `| \`${prefix}_\` | \`flowb.me/${prefix}/{code}\` | ${dlDescriptions[prefix] || "—"} |\n`;
  }

  md += `\n## Callback Actions\n\nInline keyboard callbacks used throughout the bot:\n\n`;
  const sortedCbs = [...callbacks].sort();
  const cbGroups = {};
  for (const cb of sortedCbs) {
    const prefix = cb.split(":")[0];
    if (!cbGroups[prefix]) cbGroups[prefix] = [];
    cbGroups[prefix].push(cb);
  }
  for (const [prefix, cbs] of Object.entries(cbGroups)) {
    md += `**${prefix}**: ${cbs.map((c) => `\`${c}\``).join(", ")}\n\n`;
  }

  md += `---\n\n*Auto-generated from \`src/telegram/bot.ts\` on ${timestamp()}*\n`;
  writeDoc("bot.md", md);
}

// ---------------------------------------------------------------------------
// Services overview
// ---------------------------------------------------------------------------

function generateServicesDocs() {
  const servicesDir = join(SRC, "services");
  const files = readdirSync(servicesDir).filter((f) => f.endsWith(".ts"));

  const services = files.map((f) => {
    const content = read(join(servicesDir, f));
    const firstComment = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)(?:\n|\*\/)/);
    const exportedFns = [];
    const fnRe = /export (?:async )?function (\w+)/g;
    let m;
    while ((m = fnRe.exec(content)) !== null) {
      exportedFns.push(m[1]);
    }
    return {
      file: f,
      name: f.replace(".ts", "").replace(/-/g, " "),
      description: firstComment?.[1]?.trim() || "",
      exports: exportedFns,
    };
  });

  let md = `---
title: Services
---

# Services

Backend services that power FlowB's cross-platform features.

| Service | File | Exports |
|---------|------|---------|
`;
  for (const s of services) {
    md += `| ${s.name} | \`src/services/${s.file}\` | ${s.exports.length ? s.exports.map((e) => `\`${e}\``).join(", ") : "—"} |\n`;
  }

  md += "\n## Details\n\n";
  for (const s of services) {
    md += `### ${s.name}\n\n`;
    if (s.description) md += `${s.description}\n\n`;
    md += `**Source**: \`src/services/${s.file}\`\n\n`;
    if (s.exports.length) {
      md += `**Exports**: ${s.exports.map((e) => `\`${e}()\``).join(", ")}\n\n`;
    }
  }

  md += `---\n\n*Auto-generated on ${timestamp()}*\n`;
  writeDoc("services.md", md);
}

// ---------------------------------------------------------------------------
// Architecture overview
// ---------------------------------------------------------------------------

function generateArchDocs() {
  let md = `---
title: Architecture
---

# FlowB Architecture

## System Overview

\`\`\`
                          flowb.me (Netlify)
                              |
              +---------------+---------------+
              |               |               |
         Web App         Docs (VitePress)   Short Links
         (static)        /docs/             /f/ /g/ /gi/
              |                              -> t.me deep links
              |
     +--------+--------+
     |                  |
egator-api.fly.dev   flowb.fly.dev
(Event Discovery)    (User/Social/Auth)
     |                  |
     +--------+---------+
              |
         Supabase (DB)
              |
     +--------+---------+
     |                  |
 Telegram Bot       Farcaster
 (Grammy)          (Neynar + Poster)
     |                  |
     +--------+---------+
              |
          Plugins
   flow | points | egator
   neynar | danz
\`\`\`

## Backend Servers

| Server | Domain | Purpose |
|--------|--------|---------|
| **eGator API** | \`egator-api.fly.dev\` | Event discovery, categories, search, tonight |
| **FlowB API** | \`flowb.fly.dev\` | Auth, user profiles, crews, RSVP, points, calendar |

## Frontend Apps

| App | Domain | Tech | Purpose |
|-----|--------|------|---------|
| **Web** | \`flowb.me\` | Static HTML/JS | Event discovery, auth, dashboard |
| **Farcaster Mini App** | \`flowb-farcaster.netlify.app\` | Next.js static export | Farcaster frame mini app |
| **Telegram Mini App** | \`flowb-telegram.netlify.app\` | Vite | Telegram WebApp mini app |
| **Mobile** | App Store / TestFlight | Expo React Native | Native mobile app |

## Plugin Architecture

FlowB uses a plugin system where each plugin registers actions that can be invoked from any interface (bot, API, mini app).

**Core class**: \`FlowBCore\` (\`src/core/flowb.ts\`)

Plugins implement the \`FlowBPlugin\` interface:
- \`name\`: Display name
- \`actions\`: Map of action names to descriptions
- \`execute(action, uid, input)\`: Handle an action

## User Identity

Users are identified by platform-prefixed IDs:
- \`telegram_{telegramId}\` - Telegram users
- \`farcaster_{fid}\` - Farcaster users
- \`web_{privyUserId}\` - Web (Privy auth) users

## Database

All data stored in **Supabase** (PostgreSQL). Tables are prefixed with \`flowb_\`.

Key tables:
- \`flowb_sessions\` - User sessions and display names
- \`flowb_user_points\` - Points, streaks, milestones
- \`flowb_connections\` - Friend connections (flow)
- \`flowb_groups\` / \`flowb_group_members\` - Crews
- \`flowb_rsvps\` - Event RSVPs
- \`flowb_crew_join_requests\` - Pending crew join requests
- \`flowb_event_reminders\` - User event reminder preferences

## Short Links

| Pattern | Example | Redirects To |
|---------|---------|-------------|
| \`/f/{code}\` | \`flowb.me/f/abc123\` | \`t.me/Flow_b_bot?start=f_abc123\` |
| \`/g/{code}\` | \`flowb.me/g/xyz789\` | \`t.me/Flow_b_bot?start=g_xyz789\` |
| \`/gi/{code}\` | \`flowb.me/gi/inv456\` | \`t.me/Flow_b_bot?start=gi_inv456\` |
| \`/ref/{code}\` | \`flowb.me/ref/ref123\` | \`t.me/Flow_b_bot?start=ref_ref123\` |
| \`/e/{id}\` | \`flowb.me/e/event-id\` | Platform-detected redirect |

---

*Auto-generated on ${timestamp()}*
`;
  writeDoc("architecture.md", md);
}

// ---------------------------------------------------------------------------
// Features page (user-facing)
// ---------------------------------------------------------------------------

function generateFeaturesDocs() {
  let md = `---
title: Features
---

# FlowB Features

FlowB is your EthDenver companion for discovering events, coordinating with friends, and earning rewards.

## Events

Browse hundreds of EthDenver events aggregated from multiple sources including Luma, Eventbrite, Lemonade, and community spreadsheets.

- **Search & filter** by category, date, and keyword
- **RSVP** going or maybe to track your schedule
- **See who's going** from your flow (friends and crew)
- **Event reminders** before things start
- **Smart event links** that detect your platform (Telegram, Farcaster, or web)

## Flow (Friends)

Connect with friends to see each other's event plans.

- **Share your flow link** — send \`flowb.me/f/{your-code}\` to a friend
- **Instant connection** — when they tap it, you're both connected
- **See mutual plans** — know when friends are going to the same events
- **Mute or remove** connections anytime

## Crews

Create or join group flows for your squad, DAO, or project team.

- **Create a crew** with a custom name and emoji
- **Invite members** via crew link or personal tracked invite
- **Crew leaderboard** — see who's earning the most points
- **Crew meetups** — earn bonus points when multiple members check in together
- **Admin tools** — approve join requests, promote members, manage settings
- **Public discovery** — browse and request to join open crews

## Points & Rewards

Every action earns points toward milestone levels.

- **6 milestone levels** from Explorer to Legend
- **Streak bonuses** for consecutive daily activity
- **Tiered invite rewards** for growing your crew
- **Daily caps** to keep things fair
- **Global crew ranking** based on combined member points

See the full [Points System](/points) for details.

## Notifications

Stay in the loop across platforms.

- **Telegram DMs** as the primary notification channel
- **Farcaster push** as fallback
- **Event reminders** at your chosen intervals
- **Flow activity** — get notified when friends RSVP or check in
- **Crew updates** — join requests, new members, meetup alerts

## Platforms

| Platform | Interface | Status |
|----------|-----------|--------|
| Telegram | Bot + Mini App | Live |
| Farcaster | Mini App + @flowb mentions | Live |
| Web | flowb.me | Live |
| Mobile | iOS (TestFlight) | Beta |

---

*Auto-generated on ${timestamp()}*
`;
  writeDoc("features.md", md);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log("[docs] Generating plugin docs...");
  generatePluginDocs();

  console.log("[docs] Generating API reference...");
  generateApiDocs();

  console.log("[docs] Generating bot command docs...");
  generateBotDocs();

  console.log("[docs] Generating services docs...");
  generateServicesDocs();

  console.log("[docs] Generating architecture overview...");
  generateArchDocs();

  console.log("[docs] Generating features page...");
  generateFeaturesDocs();

  console.log("[docs] Done.");
}

// Handle async mkdir
import { mkdirSync } from "fs";
const pluginsDir = join(DOCS, "plugins");
if (!existsSync(pluginsDir)) {
  mkdirSync(pluginsDir, { recursive: true });
}

main();
