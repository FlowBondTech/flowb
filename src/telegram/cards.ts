/**
 * Telegram HTML card formatter + InlineKeyboard builders for FlowB
 *
 * Tone: regen - warm, community-first, web3-native, clean
 */

import { InlineKeyboard } from "grammy";
import type { EventResult } from "../core/types.js";

const NUM_EMOJI = ["1\u20e3", "2\u20e3", "3\u20e3", "4\u20e3", "5\u20e3", "6\u20e3", "7\u20e3", "8\u20e3", "9\u20e3"];

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ==========================================================================
// Menu & Navigation
// ==========================================================================

export function formatMenuHtml(): string {
  return [
    `<b>FlowB</b>  <i>flow &amp; bond</i>`,
    "",
    "Discover what's happening.",
    "Earn by showing up. Claim what you've earned.",
  ].join("\n");
}

export function buildMenuKeyboard(miniAppUrl?: string): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text("\ud83d\udccd Events", "mn:events")
    .text("\ud83d\udd0d Search", "mn:search")
    .row()
    .text("\ud83c\udf0a My Flow", "mn:flow")
    .text("\u2705 Check In", "mn:checkin")
    .row()
    .text("\ud83c\udfc6 Points", "mn:points")
    .text("\ud83d\udcc8 Trade", "mn:trade")
    .row()
    .text("\ud83d\udcb0 Rewards", "mn:rewards")
    .text("\u2694\ufe0f Battles", "mn:battles")
    .row()
    .text("\ud83d\udfe3 Farcaster", "mn:farcaster");
  if (miniAppUrl) {
    kb.row().webApp("\u26a1 Open FlowB App", miniAppUrl);
  }
  return kb;
}

/** Minimal back-to-menu row for appending to responses */
export function buildBackToMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("\u25c0\ufe0f Menu", "mn:menu")
    .text("\ud83d\udccd Events", "mn:events");
}

// ==========================================================================
// Onboarding & Verification
// ==========================================================================

export function formatVerifiedGreetingHtml(
  danzUsername: string,
  points: number,
  streak: number,
): string {
  const streakBadge = streak > 0 ? `  \u00b7  ${streak}-day streak \ud83d\udd25` : "";
  return [
    `gm <b>${escapeHtml(danzUsername)}</b>`,
    "",
    `<b>${points}</b> pts${streakBadge}`,
    "",
    "ready to flow?",
  ].join("\n");
}

export function formatVerifiedHookHtml(username: string): string {
  return [
    `\u2705 <b>Verified!</b>`,
    "",
    `Welcome to the flow, <b>${escapeHtml(username)}</b>.`,
    "You're earning points from here on out.",
    "",
    "What's first?",
  ].join("\n");
}

export function formatConnectPromptHtml(): string {
  return [
    `<b>FlowB</b>  <i>flow &amp; bond</i>`,
    "",
    "Connect to start earning.",
    "Every event you attend, every friend you bring \u2014 it all counts.",
    "",
    "Or just browse \u2014 no account needed.",
  ].join("\n");
}

export function buildConnectKeyboard(danzUrl: string): InlineKeyboard {
  return new InlineKeyboard()
    .url("\ud83d\udd17 Connect Account", danzUrl)
    .row()
    .text("\ud83d\udccd Browse Events", "mn:events");
}

// ==========================================================================
// Event List (paginated)
// ==========================================================================

export function formatEventCardsHtml(
  events: EventResult[],
  page: number,
  pageSize: number,
): string {
  const start = page * pageSize;
  const pageEvents = events.slice(start, start + pageSize);
  const total = events.length;
  const end = Math.min(start + pageSize, total);

  const lines: string[] = [
    `<b>Events</b>  (${start + 1}\u2013${end} of ${total})\n`,
  ];

  for (let i = 0; i < pageEvents.length; i++) {
    const e = pageEvents[i];
    const num = NUM_EMOJI[i] || `${i + 1}.`;

    const date = new Date(e.startTime);
    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    lines.push(`${num} <b>${escapeHtml(e.title)}</b>`);
    lines.push(`    ${dateStr} \u00b7 ${timeStr}`);

    if (e.isVirtual) {
      lines.push(`    Online`);
    } else if (e.locationName) {
      const loc = e.locationCity
        ? `${escapeHtml(e.locationName)}, ${escapeHtml(e.locationCity)}`
        : escapeHtml(e.locationName);
      lines.push(`    ${loc}`);
    }

    if (e.isFree) {
      lines.push(`    Free`);
    } else if (e.price) {
      lines.push(`    $${e.price}`);
    }

    if (e.danceStyles?.length) {
      lines.push(`    ${e.danceStyles.slice(0, 3).join(" \u00b7 ")}`);
    }

    if (e.url) {
      lines.push(`    <a href="${e.url}">details</a>`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

export function buildEventKeyboard(
  eventsOnPage: number,
  page: number,
  totalPages: number,
  prefix: string = "ev",
): InlineKeyboard {
  const kb = new InlineKeyboard();

  for (let i = 1; i <= eventsOnPage; i++) {
    kb.text(`\u2b50 ${i}`, `${prefix}:s:${i}`);
  }
  kb.row();

  if (page > 0) {
    kb.text("\u25c0\ufe0f", `${prefix}:p:${page - 1}`);
  }
  kb.text("\u25c0\ufe0f Menu", "mn:menu");
  if (page < totalPages - 1) {
    kb.text("\u25b6\ufe0f", `${prefix}:p:${page + 1}`);
  }

  return kb;
}

// ==========================================================================
// Single-Card Event Browser
// ==========================================================================

export function formatEventCardHtml(
  event: EventResult,
  index: number,
  total: number,
  activeFilter?: string,
  activeDateFilter?: string,
): string {
  const date = new Date(event.startTime);
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const lines: string[] = [];

  lines.push(`<b>${escapeHtml(event.title)}</b>`);
  lines.push("");

  lines.push(`\ud83d\udcc5  ${dateStr} \u00b7 ${timeStr}`);

  if (event.isVirtual) {
    lines.push(`\ud83c\udf10  Online`);
  } else if (event.locationName) {
    const loc = event.locationCity
      ? `${escapeHtml(event.locationName)}, ${escapeHtml(event.locationCity)}`
      : escapeHtml(event.locationName);
    lines.push(`\ud83d\udccd  ${loc}`);
  }

  if (event.isFree) {
    lines.push(`\ud83c\udfab  Free`);
  } else if (event.price) {
    lines.push(`\ud83c\udfab  $${event.price}`);
  }

  if (event.danceStyles?.length) {
    lines.push(`\ud83d\udc83  ${event.danceStyles.slice(0, 3).join(" \u00b7 ")}`);
  }

  if (event.description) {
    const snippet = event.description.length > 120
      ? event.description.slice(0, 117) + "..."
      : event.description;
    lines.push("");
    lines.push(`<i>${escapeHtml(snippet)}</i>`);
  }

  // Footer
  const filters: string[] = [];
  if (activeFilter && activeFilter !== "all") filters.push(activeFilter);
  if (activeDateFilter && activeDateFilter !== "all") filters.push(getDateFilterLabel(activeDateFilter));
  const filterTag = filters.length ? `  \u00b7  ${filters.join(", ")}` : "";

  lines.push("");
  lines.push(`<i>${index + 1}/${total}${filterTag}</i>`);

  return lines.join("\n");
}

export function buildEventCardKeyboard(
  eventId: string,
  index: number,
  total: number,
  eventUrl?: string,
  activeCategory?: string,
  activeDateFilter?: string,
  botUsername?: string,
): InlineKeyboard {
  const short = eventId.slice(0, 8);
  const kb = new InlineKeyboard();

  // Row 1: RSVP + Share
  kb.text("\u2705 Going", `fl:going:${short}`);
  kb.text("\ud83e\udd14 Maybe", `fl:maybe:${short}`);
  kb.text("\ud83d\udc40 Who's In", `fl:whos:${short}`);

  // Row 2: Actions
  kb.row();
  kb.text("\u2b50 Save", `ec:save:${short}`);
  if (eventUrl) {
    kb.url("\ud83d\udd17 Open", eventUrl);
  }
  kb.text("\ud83d\udce4 Share", `ec:share:${short}`);

  // Row 3: Navigation
  kb.row();
  if (index > 0) {
    kb.text("\u25c0\ufe0f", `ec:prev`);
  }
  kb.text(`${index + 1}/${total}`, `ec:noop`);
  if (index < total - 1) {
    kb.text("\u25b6\ufe0f", `ec:next`);
  }

  // Row 4: Filters + back
  kb.row();
  kb.text("\ud83c\udfad Filter", `ec:fcat`);
  kb.text("\ud83d\udcc5 Date", `ec:fdate`);
  kb.text("\u25c0\ufe0f Menu", "mn:menu");

  // Row 5: Mini app deep link
  if (botUsername) {
    kb.row();
    kb.url("\u26a1 View in FlowB", `https://t.me/${botUsername}?startapp=event_${short}`);
  }

  return kb;
}

// ==========================================================================
// Filters
// ==========================================================================

export function buildCategoryFilterKeyboard(activeCategory?: string): InlineKeyboard {
  const categories = [
    { id: "all", label: "All" },
    { id: "social", label: "Socials" },
    { id: "class", label: "Classes" },
    { id: "workshop", label: "Workshops" },
    { id: "party", label: "Parties" },
    { id: "festival", label: "Festivals" },
    { id: "concert", label: "Shows" },
  ];

  const kb = new InlineKeyboard();
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const marker = cat.id === (activeCategory || "all") ? "\u2713 " : "";
    kb.text(`${marker}${cat.label}`, `ec:setcat:${cat.id}`);
    if (i % 3 === 2 && i < categories.length - 1) kb.row();
  }
  kb.row();
  kb.text("\u25c0\ufe0f Back", `ec:back`);
  return kb;
}

export function getDateFilterLabel(dateFilter: string): string {
  if (!dateFilter || dateFilter === "all") return "All Dates";
  const entry = ETHDENVER_DATE_FILTERS.find((df) => df.id === dateFilter);
  return entry?.label ?? dateFilter;
}

/** ETHDenver 2026 date filters (Feb 23 - Mar 2) */
const ETHDENVER_DATE_FILTERS = [
  { id: "all", label: "All Dates" },
  { id: "2026-02-23", label: "Mon 2/23" },
  { id: "2026-02-24", label: "Tue 2/24" },
  { id: "2026-02-25", label: "Wed 2/25" },
  { id: "2026-02-26", label: "Thu 2/26" },
  { id: "2026-02-27", label: "Fri 2/27" },
  { id: "2026-02-28", label: "Sat 2/28" },
  { id: "2026-03-01", label: "Sun 3/1" },
  { id: "2026-03-02", label: "Mon 3/2" },
];

export function buildDateFilterKeyboard(activeDateFilter?: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (let i = 0; i < ETHDENVER_DATE_FILTERS.length; i++) {
    const df = ETHDENVER_DATE_FILTERS[i];
    const marker = df.id === (activeDateFilter || "all") ? "\u2713 " : "";
    kb.text(`${marker}${df.label}`, `ec:setdate:${df.id}`);
    if (i % 3 === 2 && i < ETHDENVER_DATE_FILTERS.length - 1) kb.row();
  }
  kb.row();
  kb.text("\u25c0\ufe0f Back", `ec:back`);
  return kb;
}

export function filterEventsByDate(events: EventResult[], dateFilter: string): EventResult[] {
  if (!dateFilter || dateFilter === "all") return events;

  const dayStart = new Date(dateFilter + "T00:00:00");
  if (isNaN(dayStart.getTime())) return events;
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  return events.filter((e) => {
    const d = new Date(e.startTime);
    return d >= dayStart && d < dayEnd;
  });
}

export function filterEventsByCategory(events: EventResult[], category: string): EventResult[] {
  if (!category || category === "all") return events;

  const categoryKeywords: Record<string, string[]> = {
    social: ["social", "meetup", "mixer", "gathering", "hangout"],
    class: ["class", "lesson", "beginner", "intermediate", "advanced", "level"],
    workshop: ["workshop", "intensive", "masterclass", "bootcamp", "training"],
    party: ["party", "night", "club", "afterparty", "celebration"],
    festival: ["festival", "fest", "carnival", "fair"],
    concert: ["concert", "performance", "show", "live", "showcase", "recital"],
  };

  const keywords = categoryKeywords[category];
  if (!keywords) return events;

  return events.filter((e) => {
    const text = `${e.title} ${e.description || ""} ${(e.danceStyles || []).join(" ")}`.toLowerCase();
    return keywords.some((kw) => text.includes(kw));
  });
}

// ==========================================================================
// Event Link Card (pasted URL → rich card)
// ==========================================================================

export function formatEventLinkCardHtml(event: EventResult): string {
  const lines: string[] = [];

  lines.push(`<b>${escapeHtml(event.title)}</b>`);
  lines.push("");

  const date = new Date(event.startTime);
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  lines.push(`\ud83d\udcc5  ${dateStr} \u00b7 ${timeStr}`);

  if (event.isVirtual) {
    lines.push(`\ud83c\udf10  Online`);
  } else if (event.locationName) {
    const loc = event.locationCity
      ? `${escapeHtml(event.locationName)}, ${escapeHtml(event.locationCity)}`
      : escapeHtml(event.locationName);
    lines.push(`\ud83d\udccd  ${loc}`);
  }

  if (event.isFree) {
    lines.push(`\ud83c\udfab  Free`);
  } else if (event.price) {
    lines.push(`\ud83c\udfab  $${event.price}`);
  }

  if (event.description) {
    const snippet = event.description.length > 150
      ? event.description.slice(0, 147) + "..."
      : event.description;
    lines.push("");
    lines.push(`<i>${escapeHtml(snippet)}</i>`);
  }

  if (event.source && event.source !== "tavily") {
    lines.push("");
    lines.push(`<i>via ${event.source}</i>`);
  }

  return lines.join("\n");
}

export function buildEventLinkKeyboard(eventId: string, eventUrl?: string): InlineKeyboard {
  const id8 = eventId.slice(0, 8);
  const kb = new InlineKeyboard();

  kb.text("\ud83d\udce4 Share with Flow", `el:share:${id8}`);
  kb.text("\u2705 Going", `el:going:${id8}`);
  kb.row();
  kb.text("\u2b50 Save", `el:save:${id8}`);
  if (eventUrl) {
    kb.url("\ud83d\udd17 Open", eventUrl);
  }

  return kb;
}

// ==========================================================================
// Check-in & Dance Moves
// ==========================================================================

export function buildCheckinKeyboard(
  events: { id: string; title: string }[],
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (let i = 0; i < events.length; i++) {
    const label = events[i].title.length > 28
      ? events[i].title.slice(0, 26) + "..."
      : events[i].title;
    kb.text(`${NUM_EMOJI[i] || `${i + 1}.`} ${label}`, `ci:${events[i].id.slice(0, 8)}`);
    if (i < events.length - 1) kb.row();
  }
  return kb;
}

const DANCE_MOVES = [
  { id: "git-push", label: "The Git Push", emoji: "\ud83d\udcaa" },
  { id: "merge-conflict", label: "Merge Conflict", emoji: "\ud83e\udd1d" },
  { id: "deploy-prod", label: "Deploy to Prod", emoji: "\ud83d\ude80" },
  { id: "hotfix", label: "Hotfix", emoji: "\u26a1" },
  { id: "404", label: "404 Not Found", emoji: "\ud83e\uddca" },
  { id: "stack-overflow", label: "Stack Overflow", emoji: "\ud83d\udcda" },
  { id: "rebase-chill", label: "Rebase & Chill", emoji: "\ud83c\udf0a" },
  { id: "fork-bomb", label: "Fork Bomb", emoji: "\ud83d\udca3" },
];

export { DANCE_MOVES };

export function buildDanceMoveKeyboard(eventIdShort: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (let i = 0; i < DANCE_MOVES.length; i += 2) {
    const m1 = DANCE_MOVES[i];
    kb.text(`${m1.emoji} ${m1.label}`, `dm:${eventIdShort}:${m1.id}`);
    if (i + 1 < DANCE_MOVES.length) {
      const m2 = DANCE_MOVES[i + 1];
      kb.text(`${m2.emoji} ${m2.label}`, `dm:${eventIdShort}:${m2.id}`);
    }
    if (i + 2 < DANCE_MOVES.length) kb.row();
  }
  kb.row().text("\ud83d\udcf7 Send Photo", `dm:${eventIdShort}:photo`);
  return kb;
}

// ==========================================================================
// Rewards
// ==========================================================================

export function formatRewardsHtml(hasWallet: boolean): string {
  if (hasWallet) {
    return [
      `<b>Rewards</b>`,
      "",
      "Show up. Move. Earn.",
      "",
      "Check in  \u2192  +10 pts",
      "Dance proof  \u2192  +25 pts",
      "Complete challenges  \u2192  USDC",
      "",
      "Payouts on Base.",
    ].join("\n");
  }
  return [
    `<b>Rewards</b>`,
    "",
    "Earn USDC by showing up and moving.",
    "",
    "To claim, link your Base wallet:",
    "<code>/wallet 0x...</code>",
  ].join("\n");
}

export function buildRewardsKeyboard(hasWallet: boolean): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (hasWallet) {
    kb.text("\ud83c\udf81 Claim", "rw:claim");
    kb.text("\ud83d\udcdc History", "rw:history");
    kb.row();
  }
  kb.text("\ud83c\udfc6 Challenges", "mn:challenges");
  kb.text("\u25c0\ufe0f Menu", "mn:menu");
  return kb;
}

// ==========================================================================
// Group cards
// ==========================================================================

export function formatGroupWelcomeHtml(firstName: string, groupName: string): string {
  return [
    `<b>${escapeHtml(firstName)}</b>, welcome to <b>${escapeHtml(groupName)}</b>.`,
    "",
    "I'm FlowB \u2014 connect your account and start earning for being here.",
  ].join("\n");
}

export function buildGroupWelcomeKeyboard(connectUrl: string, botUsername: string): InlineKeyboard {
  return new InlineKeyboard()
    .url("\ud83d\udd17 Connect", connectUrl)
    .url("\ud83e\udd16 Open FlowB", `https://t.me/${botUsername}`)
    .row()
    .text("\ud83d\udccd Events", "mn:events");
}

export function formatGroupRegisterHtml(): string {
  return [
    "\ud83d\udd17 <b>Connect to FlowB</b>",
    "",
    "Earn for being part of the community:",
    "",
    "+15 pts  joining",
    "+1 pt  per message",
    "+2 pts  per reply",
    "",
    "Already connected? You're earning automatically.",
  ].join("\n");
}

export function buildGroupRegisterKeyboard(connectUrl: string, botUsername: string): InlineKeyboard {
  return new InlineKeyboard()
    .url("\ud83d\udd17 Connect", connectUrl)
    .row()
    .url("\ud83c\udfc6 My Points", `https://t.me/${botUsername}?start=points`)
    .text("\ud83d\udccd Events", "mn:events");
}

// ==========================================================================
// Trading Cards
// ==========================================================================

export function formatTradingMenuHtml(): string {
  return [
    `<b>Trade</b>  <i>Base chain</i>`,
    "",
    "Swap tokens via 130+ DEXs.",
    "",
    "<b>/price ETH</b> \u2014 live price",
    "<b>/trade 10 USDC to ETH</b> \u2014 swap",
    "<b>/balance</b> \u2014 wallet",
    "",
    "Every trade = +10 pts",
  ].join("\n");
}

export function buildTradingMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("\ud83d\udcb5 Price ETH", "tr:price:eth:usdc")
    .text("\ud83d\udcb0 Price DEGEN", "tr:price:degen:usdc")
    .row()
    .text("\ud83d\udcbc Balance", "tr:bal")
    .text("\ud83d\udcca Portfolio", "tr:port")
    .row()
    .text("\u25c0\ufe0f Menu", "mn:menu");
}

export function buildSwapConfirmKeyboard(
  from: string,
  to: string,
  amount: string,
): InlineKeyboard {
  return new InlineKeyboard()
    .text("\u2705 Confirm Swap", `tr:confirm:${from}:${to}:${amount}`)
    .text("\u274c Cancel", "tr:cancel")
    .row()
    .text("\u25c0\ufe0f Menu", "mn:menu");
}

export function formatSwapPreviewHtml(
  fromSymbol: string,
  toSymbol: string,
  sellAmount: string,
  buyAmount: string,
  rate: string,
): string {
  return [
    `<b>Swap Preview</b>`,
    "",
    `Sell: <b>${sellAmount} ${escapeHtml(fromSymbol)}</b>`,
    `Get: <b>~${buyAmount} ${escapeHtml(toSymbol)}</b>`,
    `Rate: 1 ${escapeHtml(fromSymbol)} = ${rate} ${escapeHtml(toSymbol)}`,
    "",
    `1% slippage \u00b7 0x on Base`,
  ].join("\n");
}

// ==========================================================================
// Battle Cards
// ==========================================================================

export function formatBattleMenuHtml(): string {
  return [
    `<b>Battle Pools</b>`,
    "",
    "Stake USDC on dance battles.",
    "",
    "<b>Winner Takes All</b> \u2014 1st gets the pot",
    "<b>Top 3 Split</b> \u2014 60/25/15",
    "<b>Proportional</b> \u2014 scored split",
    "",
    "5% fee on winnings. Every battle = pts.",
  ].join("\n");
}

export function buildBattleMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("\ud83d\udd25 Open Battles", "bt:list")
    .text("\u2795 Create", "bt:create")
    .row()
    .text("\u25c0\ufe0f Menu", "mn:menu");
}

export function buildBattleJoinKeyboard(battleId: string, entryFee: string): InlineKeyboard {
  const short = battleId.slice(0, 8);
  return new InlineKeyboard()
    .text(`\u2694\ufe0f Join ($${entryFee})`, `bt:join:${short}`)
    .text("\ud83d\udcca Status", `bt:status:${short}`)
    .row()
    .text("\u25c0\ufe0f Back", "bt:list");
}

// ==========================================================================
// Flow (Friends & Crews)
// ==========================================================================

export function formatFlowMenuHtml(): string {
  return [
    `<b>Your Flow</b>`,
    "",
    "Connect with friends &amp; crews.",
    "See who's going where. Never miss a night out.",
    "",
    "<b>/share</b> \u2014 invite a friend",
    "<b>/crew</b> \u2014 create or join a crew",
    "<b>/going</b> \u2014 RSVP to an event",
    "<b>/whosgoing</b> \u2014 see your flow's plans",
  ].join("\n");
}

export function buildFlowMenuKeyboard(botUsername?: string): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text("\ud83d\udd17 Share My Flow", "fl:share")
    .text("\ud83d\udc65 My Flow", "fl:list")
    .row()
    .text("\ud83d\ude80 Create Crew", "fl:crew-create")
    .text("\ud83d\udcc5 My Schedule", "fl:schedule")
    .row()
    .text("\ud83d\udc40 Who's Going", "fl:whos-going")
    .row()
    .text("\u25c0\ufe0f Menu", "mn:menu");
  if (botUsername) {
    kb.url("\u26a1 Open App", `https://t.me/${botUsername}?startapp=schedule`);
  }
  return kb;
}

export function formatFlowShareHtml(link: string): string {
  return [
    `<b>Join my Flow</b>`,
    "",
    "Share this with friends \u2014 when they tap it, you'll be connected and see each other's event plans.",
  ].join("\n");
}

export function buildFlowShareKeyboard(link: string): InlineKeyboard {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Join my Flow on FlowB! Tap the link to connect and see each other's event plans.")}`;
  return new InlineKeyboard()
    .url("\ud83d\udce4 Share with Friends", shareUrl)
    .row()
    .text("\ud83d\udd17 Copy Link", "fl:copy-link")
    .row()
    .text("\u25c0\ufe0f Back to Flow", "fl:menu");
}

export function formatFlowInviteAcceptedHtml(inviterName: string): string {
  return [
    `<b>You're in the flow!</b>`,
    "",
    `You and <b>${escapeHtml(inviterName)}</b> are now connected.`,
    "You'll see each other's event plans and get notified when you're headed to the same spot.",
  ].join("\n");
}

export function formatCrewJoinedHtml(crewEmoji: string, crewName: string, memberCount: number): string {
  return [
    `<b>Welcome to ${crewEmoji} ${escapeHtml(crewName)}!</b>`,
    "",
    `${memberCount} members in this crew.`,
    "You'll see the crew's event plans and get notified together.",
  ].join("\n");
}

export function formatCrewMenuHtml(): string {
  return [
    `<b>Crews</b>`,
    "",
    "Crews are group flows \u2014 your dance squad, festival friends, class cohort.",
    "",
    "<b>/crew create Name</b> \u2014 start a new crew",
    "Or join one via an invite link!",
  ].join("\n");
}

export function buildCrewMenuKeyboard(botUsername?: string): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text("\ud83d\ude80 Create Crew", "fl:crew-create")
    .text("\ud83d\udcdd My Crews", "fl:crew-list")
    .row()
    .text("\ud83d\udd0d Browse Crews", "cr:browse")
    .row()
    .text("\u25c0\ufe0f Menu", "mn:menu");
  if (botUsername) {
    kb.url("\u26a1 Open in App", `https://t.me/${botUsername}?startapp=crew`);
  }
  return kb;
}

export function buildCrewDetailKeyboard(groupId: string, userRole?: string): InlineKeyboard {
  const short = groupId.slice(0, 8);
  const kb = new InlineKeyboard()
    .text("\ud83d\udd17 Invite Link", `fl:crew-invite:${short}`)
    .text("\ud83d\udc65 Members", `fl:crew-members:${short}`);
  // Show settings button for creator/admin
  if (userRole === "creator" || userRole === "admin") {
    kb.row()
      .text("\u2699\ufe0f Settings", `cr:settings:${short}`);
  }
  kb.row()
    .text("\ud83d\udeaa Leave", `fl:crew-leave:${short}`)
    .text("\u25c0\ufe0f Back", "fl:crew-list");
  return kb;
}

// ==========================================================================
// Crew Settings
// ==========================================================================

export function formatCrewSettingsHtml(
  name: string,
  emoji: string,
  memberCount: number,
  isPublic: boolean,
  joinMode: string,
): string {
  return [
    `<b>${emoji} ${escapeHtml(name)}</b>  <i>Settings</i>`,
    "",
    `Members: <b>${memberCount}</b>`,
    `Visibility: <b>${isPublic ? "Public" : "Private"}</b>`,
    `Join mode: <b>${joinMode}</b>`,
    "",
    "Tap below to change:",
  ].join("\n");
}

export function buildCrewSettingsKeyboard(
  groupId: string,
  isPublic: boolean,
  joinMode: string,
): InlineKeyboard {
  const short = groupId.slice(0, 8);
  const kb = new InlineKeyboard();

  // Toggle public/private
  if (isPublic) {
    kb.text("\ud83d\udd12 Make Private", `cr:toggle-public:${short}`);
  } else {
    kb.text("\ud83c\udf10 Make Public", `cr:toggle-public:${short}`);
  }
  kb.row();

  // Join mode buttons
  const modes = [
    { id: "open", label: "Open", emoji: "\ud83d\udfe2" },
    { id: "approval", label: "Approval", emoji: "\ud83d\udfe1" },
    { id: "closed", label: "Closed", emoji: "\ud83d\udd34" },
  ];
  for (const m of modes) {
    const marker = m.id === joinMode ? "\u2713 " : "";
    kb.text(`${marker}${m.emoji} ${m.label}`, `cr:join-mode:${short}:${m.id}`);
  }

  kb.row()
    .text("\u25c0\ufe0f Back", `fl:crew-list`);

  return kb;
}

// ==========================================================================
// Crew Browse (Public Discovery)
// ==========================================================================

export function formatCrewBrowseHtml(
  crews: { id: string; name: string; emoji: string; description: string | null; join_mode: string; member_count?: number }[],
): string {
  if (!crews.length) {
    return [
      "<b>Browse Crews</b>",
      "",
      "No public crews yet. Be the first to create one!",
    ].join("\n");
  }

  const lines = [
    `<b>Browse Crews</b>  (${crews.length} public)\n`,
  ];

  for (const c of crews) {
    lines.push(`${c.emoji} <b>${escapeHtml(c.name)}</b>`);
    if (c.description) {
      const snippet = c.description.length > 60 ? c.description.slice(0, 57) + "..." : c.description;
      lines.push(`  <i>${escapeHtml(snippet)}</i>`);
    }
    const modeLabel = c.join_mode === "open" ? "Open" : c.join_mode === "approval" ? "Apply" : "Closed";
    const countText = c.member_count !== undefined ? ` \u00b7 ${c.member_count} members` : "";
    lines.push(`  ${modeLabel}${countText}`);
    lines.push("");
  }

  return lines.join("\n");
}

export function buildCrewBrowseKeyboard(
  crews: { id: string; join_mode: string; name: string }[],
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const c of crews.slice(0, 6)) {
    const short = c.id.slice(0, 8);
    const label = c.name.length > 20 ? c.name.slice(0, 18) + ".." : c.name;
    if (c.join_mode === "open") {
      kb.text(`\u2705 Join ${label}`, `cr:join-request:${short}`);
    } else if (c.join_mode === "approval") {
      kb.text(`\ud83d\udce9 Apply ${label}`, `cr:join-request:${short}`);
    }
    kb.row();
  }
  kb.text("\u25c0\ufe0f Menu", "mn:menu");
  return kb;
}

// ==========================================================================
// Join Request Notification (Admin DM)
// ==========================================================================

export function formatJoinRequestHtml(
  userName: string,
  crewEmoji: string,
  crewName: string,
): string {
  return [
    `<b>New join request</b>`,
    "",
    `<b>${escapeHtml(userName)}</b> wants to join <b>${crewEmoji} ${escapeHtml(crewName)}</b>`,
    "",
    "Approve or deny below:",
  ].join("\n");
}

export function buildJoinRequestKeyboard(requestId: string): InlineKeyboard {
  const short = requestId.slice(0, 8);
  return new InlineKeyboard()
    .text("\u2705 Approve", `cr:approve:${short}`)
    .text("\u274c Deny", `cr:deny:${short}`);
}

export function buildGoingKeyboard(eventId: string): InlineKeyboard {
  const short = eventId.slice(0, 8);
  return new InlineKeyboard()
    .text("\u2705 Going", `fl:going:${short}`)
    .text("\ud83e\udd14 Maybe", `fl:maybe:${short}`)
    .row()
    .text("\ud83d\udc40 Who's Going", `fl:whos:${short}`)
    .row()
    .text("\u25c0\ufe0f Back", "ec:back");
}

export function formatWhosGoingHtml(
  eventName: string,
  going: string[],
  maybe: string[],
): string {
  const lines = [`<b>Who's going to ${escapeHtml(eventName)}?</b>\n`];

  if (going.length) {
    lines.push(`<b>Going</b> (${going.length})`);
    for (const name of going) lines.push(`  ${escapeHtml(name)}`);
  }
  if (maybe.length) {
    if (going.length) lines.push("");
    lines.push(`<b>Maybe</b> (${maybe.length})`);
    for (const name of maybe) lines.push(`  ${escapeHtml(name)}`);
  }
  if (!going.length && !maybe.length) {
    lines.push("No one from your flow yet. Be the first!");
  }
  return lines.join("\n");
}

export function formatFlowAttendanceBadge(goingCount: number, maybeCount: number): string {
  if (goingCount === 0 && maybeCount === 0) return "";
  const parts: string[] = [];
  if (goingCount > 0) parts.push(`${goingCount} going`);
  if (maybeCount > 0) parts.push(`${maybeCount} maybe`);
  return `\n\ud83d\udc65 <i>${parts.join(", ")} from your flow</i>`;
}

// ==========================================================================
// Utilities
// ==========================================================================

export function markdownToHtml(md: string): string {
  // Protect URLs from italic replacement (underscores in URLs)
  const urls: string[] = [];
  let s = md.replace(/https?:\/\/[^\s)]+/g, (url) => {
    urls.push(url);
    return `\x00URL${urls.length - 1}\x00`;
  });
  s = s
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/_(.+?)_/g, "<i>$1</i>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/&(?!amp;|lt;|gt;|quot;)/g, "&amp;")
    .replace(/<(?!\/?(?:b|i|a|code|pre)[\s>])/g, "&lt;");
  // Restore URLs
  urls.forEach((url, i) => { s = s.replace(`\x00URL${i}\x00`, url); });
  return s;
}

// ==========================================================================
// Intent Parser
// ==========================================================================

export interface SearchIntent {
  city?: string;
  style?: string;
  timeHint?: string;
  query?: string;
  isEventQuery: boolean;
}

const DANCE_STYLES_MATCH = [
  "salsa", "bachata", "kizomba", "zouk", "swing", "tango",
  "hip hop", "hip-hop", "breaking", "popping", "locking",
  "house", "waacking", "voguing", "krump", "afrobeats",
  "dancehall", "reggaeton", "samba", "merengue", "cumbia",
  "ballet", "contemporary", "jazz", "tap", "ballroom",
  "waltz", "foxtrot", "cha-cha", "rumba", "hustle",
  "west coast swing", "east coast swing", "lindy hop",
  "blues", "fusion", "ecstatic", "contact improv",
];

const CITIES_MATCH = [
  "denver", "boulder", "new york", "nyc", "brooklyn", "manhattan",
  "los angeles", "la", "san francisco", "sf", "chicago", "miami",
  "austin", "portland", "seattle", "atlanta", "dallas", "houston",
  "philadelphia", "boston", "detroit", "nashville", "phoenix",
  "san diego", "minneapolis", "tampa", "orlando", "las vegas",
  "washington dc", "dc",
];

const TIME_PATTERNS: [RegExp, string][] = [
  [/\btonight\b/i, "tonight"],
  [/\btomorrow\b/i, "tomorrow"],
  [/\bthis weekend\b/i, "this weekend"],
  [/\bnext week\b/i, "next week"],
  [/\bthis week\b/i, "this week"],
  [/\bfriday\b/i, "friday"],
  [/\bsaturday\b/i, "saturday"],
  [/\bsunday\b/i, "sunday"],
];

const EVENT_KEYWORDS = [
  "event", "events", "class", "classes", "workshop", "workshops",
  "party", "parties", "social", "socials", "lesson", "lessons",
  "show", "happening", "going on", "what's up", "whats up",
  "anything", "where can i", "find me", "looking for",
  "dance", "dancing", "concert", "festival", "meetup",
];

export function parseSearchIntent(text: string): SearchIntent {
  const lower = text.toLowerCase().trim();
  const intent: SearchIntent = { isEventQuery: false };

  const hasEventKeyword = EVENT_KEYWORDS.some((kw) => lower.includes(kw));
  const hasDanceStyle = DANCE_STYLES_MATCH.some((s) => lower.includes(s));
  const hasCity = CITIES_MATCH.some((c) => lower.includes(c));
  const hasTime = TIME_PATTERNS.some(([re]) => re.test(lower));

  intent.isEventQuery = hasEventKeyword || hasDanceStyle || (hasCity && hasTime);

  for (const style of DANCE_STYLES_MATCH) {
    if (lower.includes(style)) {
      intent.style = style;
      break;
    }
  }

  const inCityMatch = lower.match(/\bin\s+([a-z\s]+?)(?:\s+(?:tonight|tomorrow|this|next|on)\b|$)/);
  if (inCityMatch) {
    const candidate = inCityMatch[1].trim();
    if (CITIES_MATCH.includes(candidate)) {
      intent.city = candidate;
    }
  }
  if (!intent.city) {
    for (const city of CITIES_MATCH) {
      if (lower.includes(city)) {
        intent.city = city;
        break;
      }
    }
  }

  for (const [re, hint] of TIME_PATTERNS) {
    if (re.test(lower)) {
      intent.timeHint = hint;
      break;
    }
  }

  intent.query = text.trim();

  return intent;
}

// ==========================================================================
// Trade Intent Parser
// ==========================================================================

export interface TradeIntent {
  amount: string;
  fromToken: string;
  toToken: string;
  valid: boolean;
}

/**
 * Parse natural language trade intents:
 *   "10 USDC to ETH"
 *   "swap 0.5 ETH for USDC"
 *   "buy 100 DEGEN with USDC"
 */
export function parseTradeIntent(text: string): TradeIntent {
  const invalid: TradeIntent = { amount: "", fromToken: "", toToken: "", valid: false };

  const lower = text.toLowerCase().trim()
    .replace(/^(swap|trade|buy|sell)\s+/i, "");

  const match = lower.match(
    /^([\d.]+)\s+(\w+)\s+(?:to|for|->|=>|into)\s+(\w+)$/,
  );
  if (!match) return invalid;

  return {
    amount: match[1],
    fromToken: match[2].toUpperCase(),
    toToken: match[3].toUpperCase(),
    valid: true,
  };
}

// ==========================================================================
// Farcaster
// ==========================================================================

export function formatFarcasterMenuHtml(): string {
  return [
    `<b>Farcaster</b>`,
    "",
    "Look up profiles, check trending casts,",
    "or verify your social challenges on-chain.",
  ].join("\n");
}

export function buildFarcasterMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Trending", "fc:trending")
    .text("Search Profile", "fc:profile")
    .row()
    .text("\u25c0\ufe0f Menu", "mn:menu");
}
