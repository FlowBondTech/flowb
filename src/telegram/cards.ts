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
  displayName: string,
  points: number,
  streak: number,
): string {
  const streakBadge = streak > 0 ? `  \u00b7  ${streak}-day streak \ud83d\udd25` : "";
  return [
    `gm <b>${escapeHtml(displayName)}</b>`,
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

export function buildConnectKeyboard(connectUrl: string): InlineKeyboard {
  return new InlineKeyboard()
    .url("\ud83d\udd17 Connect Account", connectUrl)
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

  if (event.rsvpCount) {
    lines.push(`\ud83d\udc65  ${event.rsvpCount} attending`);
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
  kb.text("\ud83d\udcdd Details", `ec:luma:${short}`);
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
    kb.url("\u26a1 View in FlowB", `https://t.me/${botUsername}/flowb?startapp=event_${short}`);
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
  const entry = SXSW_DATE_FILTERS.find((df) => df.id === dateFilter);
  return entry?.label ?? dateFilter;
}

/** SXSW 2026 date filters (Mar 12 - Mar 18) */
const SXSW_DATE_FILTERS = (() => {
  const filters: { id: string; label: string }[] = [{ id: "all", label: "All Dates" }];
  for (let d = 12; d <= 18; d++) {
    const dt = new Date(2026, 2, d); // March = 2
    const weekday = dt.toLocaleDateString("en-US", { weekday: "short" });
    filters.push({ id: `2026-03-${String(d).padStart(2, "0")}`, label: `${weekday} 3/${d}` });
  }
  return filters;
})();

export function buildDateFilterKeyboard(activeDateFilter?: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (let i = 0; i < SXSW_DATE_FILTERS.length; i++) {
    const df = SXSW_DATE_FILTERS[i];
    const marker = df.id === (activeDateFilter || "all") ? "\u2713 " : "";
    kb.text(`${marker}${df.label}`, `ec:setdate:${df.id}`);
    if (i % 3 === 2 && i < SXSW_DATE_FILTERS.length - 1) kb.row();
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
    kb.url("\u26a1 Open App", `https://t.me/${botUsername}/flowb?startapp=schedule`);
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
    "Tap <b>Create Crew</b> to start a new crew, or join one via an invite link!",
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
    kb.url("\u26a1 Open in App", `https://t.me/${botUsername}/flowb?startapp=crew`);
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
  // Strip hidden event ID comments
  let s = md.replace(/<!--.*?-->/g, "");
  // Convert markdown links FIRST (before URL protection mangles them)
  const links: string[] = [];
  s = s.replace(/\[(.+?)\]\((.+?)\)/g, (_m, text, href) => {
    links.push(`<a href="${href}">${text}</a>`);
    return `\x00LINK${links.length - 1}\x00`;
  });
  // Protect bare URLs from italic replacement (underscores in URLs)
  const urls: string[] = [];
  s = s.replace(/https?:\/\/[^\s)]+/g, (url) => {
    urls.push(url);
    return `\x00URL${urls.length - 1}\x00`;
  });
  s = s
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/_(.+?)_/g, "<i>$1</i>")
    .replace(/&(?!amp;|lt;|gt;|quot;)/g, "&amp;")
    .replace(/<(?!\/?(?:b|i|a|code|pre)[\s>])/g, "&lt;");
  // Restore links and URLs
  links.forEach((link, i) => { s = s.replace(`\x00LINK${i}\x00`, link); });
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
// Meetings
// ==========================================================================

const MEETING_TYPE_EMOJI: Record<string, string> = {
  coffee: "\u2615",
  call: "\ud83d\udcde",
  lunch: "\ud83c\udf7d\ufe0f",
  workshop: "\ud83d\udee0\ufe0f",
  demo: "\ud83d\udcbb",
  other: "\ud83d\udcc5",
};

export function formatMeetingCreatedHtml(
  title: string,
  startsAt: string,
  durationMin: number,
  meetingType: string,
  location: string | null,
  shareLink: string,
): string {
  const emoji = MEETING_TYPE_EMOJI[meetingType] || "\ud83d\udcc5";
  const date = new Date(startsAt);
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const lines = [
    `${emoji} <b>${escapeHtml(title)}</b>`,
    "",
    `\ud83d\udcc5  ${dateStr} \u00b7 ${timeStr}`,
    `\u23f1  ${durationMin} min`,
  ];

  if (location) {
    lines.push(`\ud83d\udccd  ${escapeHtml(location)}`);
  }

  lines.push("");
  lines.push(`Share: ${shareLink}`);

  return lines.join("\n");
}

export function formatMeetingDetailHtml(
  title: string,
  startsAt: string,
  durationMin: number,
  meetingType: string,
  status: string,
  location: string | null,
  description: string | null,
  attendeeCount: number,
): string {
  const emoji = MEETING_TYPE_EMOJI[meetingType] || "\ud83d\udcc5";
  const date = new Date(startsAt);
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const statusBadge = status === "cancelled" ? " \u274c cancelled" : status === "completed" ? " \u2705 done" : "";

  const lines = [
    `${emoji} <b>${escapeHtml(title)}</b>${statusBadge}`,
    "",
    `\ud83d\udcc5  ${dateStr} \u00b7 ${timeStr}`,
    `\u23f1  ${durationMin} min`,
  ];

  if (location) {
    lines.push(`\ud83d\udccd  ${escapeHtml(location)}`);
  }

  if (description) {
    const snippet = description.length > 150 ? description.slice(0, 147) + "..." : description;
    lines.push("");
    lines.push(`<i>${escapeHtml(snippet)}</i>`);
  }

  lines.push("");
  lines.push(`\ud83d\udc65  ${attendeeCount} attendee${attendeeCount !== 1 ? "s" : ""}`);

  return lines.join("\n");
}

export function formatMeetingListHtml(
  meetings: { id: string; title: string; starts_at: string; meeting_type: string; status: string }[],
  filter: string,
): string {
  if (!meetings.length) {
    return filter === "upcoming"
      ? "<b>Your Meetings</b>\n\nNo upcoming meetings. Use /meet to create one!"
      : "<b>Past Meetings</b>\n\nNo past meetings yet.";
  }

  const headerText = filter === "upcoming" ? "Your Meetings" : "Past Meetings";
  const lines = [`<b>${headerText}</b>  (${meetings.length})\n`];

  for (const m of meetings) {
    const emoji = MEETING_TYPE_EMOJI[m.meeting_type] || "\ud83d\udcc5";
    const date = new Date(m.starts_at);
    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    lines.push(`${emoji} <b>${escapeHtml(m.title)}</b>`);
    lines.push(`    ${dateStr} \u00b7 ${timeStr}`);
    lines.push("");
  }

  return lines.join("\n");
}

export function formatMeetingCreatePromptHtml(): string {
  return [
    "<b>Create a Meeting</b>",
    "",
    "Use natural language:",
    "<code>/meet sarah tomorrow coffee</code>",
    "<code>/meet team standup friday 10am</code>",
    "<code>/meet project demo next week 2pm</code>",
  ].join("\n");
}

export function buildMeetingDetailKeyboard(meetingId: string, isCreator: boolean, shareCode: string): InlineKeyboard {
  const short = meetingId.slice(0, 8);
  const kb = new InlineKeyboard();

  kb.text("\u2705 Accept", `mt:rsvp:${short}:accepted`);
  kb.text("\ud83e\udd14 Maybe", `mt:rsvp:${short}:maybe`);
  kb.text("\u274c Decline", `mt:rsvp:${short}:declined`);
  kb.row();
  kb.text("\ud83d\udce4 Share", `mt:share:${short}`);
  kb.text("\ud83d\udcac Chat", `mt:chat:${short}`);

  if (isCreator) {
    kb.row();
    kb.text("\u2705 Complete", `mt:complete:${short}`);
    kb.text("\u274c Cancel", `mt:cancel:${short}`);
  }

  kb.row();
  kb.text("\u25c0\ufe0f Menu", "mn:menu");

  return kb;
}

export function buildMeetingListKeyboard(
  meetings: { id: string; title: string }[],
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const m of meetings.slice(0, 5)) {
    const short = m.id.slice(0, 8);
    const label = m.title.length > 25 ? m.title.slice(0, 23) + ".." : m.title;
    kb.text(label, `mt:view:${short}`);
    kb.row();
  }
  kb.text("\u2795 New Meeting", "mt:new");
  kb.text("\u25c0\ufe0f Menu", "mn:menu");
  return kb;
}

export function buildMeetingRsvpKeyboard(meetingId: string): InlineKeyboard {
  const short = meetingId.slice(0, 8);
  return new InlineKeyboard()
    .text("\u2705 Accept", `mt:rsvp:${short}:accepted`)
    .text("\ud83e\udd14 Maybe", `mt:rsvp:${short}:maybe`)
    .text("\u274c Decline", `mt:rsvp:${short}:declined`)
    .row()
    .text("\ud83d\udce4 Share", `mt:share:${short}`);
}

export function buildMeetingCreateKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("\u25c0\ufe0f Menu", "mn:menu");
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

// ==========================================================================
// Event Submission (Add My Event)
// ==========================================================================

type EventStep = "title" | "date" | "time" | "venue" | "url" | "description" | "confirm";

export interface PendingEvent {
  title?: string;
  date?: string;
  time?: string;
  venue?: string;
  url?: string;
  description?: string;
  city?: string;
  isFree?: boolean;
}

export function formatEventSubmitPromptHtml(step: EventStep, pending: PendingEvent): string {
  switch (step) {
    case "title":
      return [
        "<b>List Your Event</b>",
        "",
        "What's the event called?",
      ].join("\n");
    case "date":
      return [
        `<b>${escapeHtml(pending.title || "")}</b>`,
        "",
        "When is it? <i>(e.g. Mar 15, tomorrow, Friday)</i>",
      ].join("\n");
    case "time":
      return [
        `<b>${escapeHtml(pending.title || "")}</b>`,
        `\ud83d\udcc5 ${escapeHtml(pending.date || "")}`,
        "",
        "What time? <i>(e.g. 7pm, 2:00 PM)</i>",
      ].join("\n");
    case "venue":
      return [
        `<b>${escapeHtml(pending.title || "")}</b>`,
        `\ud83d\udcc5 ${escapeHtml(pending.date || "")}${pending.time ? ` at ${escapeHtml(pending.time)}` : ""}`,
        "",
        "Where's it at? <i>(venue name)</i>",
      ].join("\n");
    case "url":
      return [
        `<b>${escapeHtml(pending.title || "")}</b>`,
        `\ud83d\udcc5 ${escapeHtml(pending.date || "")}${pending.time ? ` at ${escapeHtml(pending.time)}` : ""}`,
        pending.venue ? `\ud83d\udccd ${escapeHtml(pending.venue)}` : "",
        "",
        "Got a link? <i>(event URL)</i>",
      ].filter(Boolean).join("\n");
    case "description":
      return [
        `<b>${escapeHtml(pending.title || "")}</b>`,
        `\ud83d\udcc5 ${escapeHtml(pending.date || "")}${pending.time ? ` at ${escapeHtml(pending.time)}` : ""}`,
        pending.venue ? `\ud83d\udccd ${escapeHtml(pending.venue)}` : "",
        "",
        "Short description? <i>(one or two lines)</i>",
      ].filter(Boolean).join("\n");
    default:
      return "";
  }
}

export function formatEventSubmitConfirmHtml(pending: PendingEvent): string {
  const lines = [
    "<b>Review Your Event</b>",
    "",
    `\ud83c\udfab <b>${escapeHtml(pending.title || "Untitled")}</b>`,
  ];
  if (pending.date) lines.push(`\ud83d\udcc5 ${escapeHtml(pending.date)}${pending.time ? ` at ${escapeHtml(pending.time)}` : ""}`);
  if (pending.venue) lines.push(`\ud83d\udccd ${escapeHtml(pending.venue)}`);
  if (pending.url) lines.push(`\ud83d\udd17 ${escapeHtml(pending.url)}`);
  if (pending.description) lines.push(`\n<i>${escapeHtml(pending.description)}</i>`);
  lines.push("", "Look good?");
  return lines.join("\n");
}

export function buildEventSubmitConfirmKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("\u2705 Submit", "evt:submit:confirm")
    .text("\u270f\ufe0f Edit", "evt:submit:edit")
    .row()
    .text("\u274c Cancel", "evt:submit:cancel");
}

export function buildEventSubmitSkipKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Skip \u25b6\ufe0f", "evt:submit:skip")
    .text("\u274c Cancel", "evt:submit:cancel");
}

export function formatEventSubmittedHtml(title: string, eventId?: string): string {
  return [
    "\u2705 <b>Event Listed!</b>",
    "",
    `<b>${escapeHtml(title)}</b> has been added to FlowB.`,
    "",
    "Others can now discover it when browsing events.",
    eventId ? `\nID: <code>${escapeHtml(eventId)}</code>` : "",
  ].filter(Boolean).join("\n");
}

export function formatEventSubmitGroupReplyHtml(title: string): string {
  return `\u2705 Got it! I listed <b>${escapeHtml(title)}</b> \u2014 check your DMs for details.`;
}

export function formatEventSubmitDmFollowupHtml(title: string): string {
  return [
    `\u2705 <b>${escapeHtml(title)}</b> has been listed on FlowB!`,
    "",
    "Others can now discover it when browsing events.",
    "Next time, use <b>/addmyevent</b> in DMs to add full details (date, time, venue, description).",
  ].join("\n");
}

export function buildEventSubmitDmFollowupKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("\ud83d\udccd Browse Events", "mn:events")
    .text("\u25c0\ufe0f Menu", "mn:menu");
}

// ==========================================================================
// Leads / CRM Pipeline
// ==========================================================================

export type LeadStage = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";

const STAGE_EMOJI: Record<LeadStage, string> = {
  new: "\ud83d\udfe2",        // green circle
  contacted: "\ud83d\udfe1",  // yellow circle
  qualified: "\ud83d\udd35",  // blue circle
  proposal: "\ud83d\udfe3",   // purple circle
  won: "\u2705",              // check
  lost: "\u274c",             // X
};

const STAGE_LABEL: Record<LeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

export interface LeadData {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  stage: LeadStage;
  source?: string | null;
  value?: number | null;
  notes?: string | null;
  assigned_to?: string | null;
  created_at?: string;
  updated_at?: string;
}

export function formatLeadDetailHtml(lead: LeadData): string {
  const lines = [
    `${STAGE_EMOJI[lead.stage]} <b>${escapeHtml(lead.name)}</b>`,
    `Stage: <b>${STAGE_LABEL[lead.stage]}</b>`,
  ];
  if (lead.company) lines.push(`\ud83c\udfe2 ${escapeHtml(lead.company)}`);
  if (lead.email) lines.push(`\ud83d\udce7 ${escapeHtml(lead.email)}`);
  if (lead.phone) lines.push(`\ud83d\udcde ${escapeHtml(lead.phone)}`);
  if (lead.value != null) lines.push(`\ud83d\udcb0 $${lead.value.toLocaleString()}`);
  if (lead.source) lines.push(`Source: ${escapeHtml(lead.source)}`);
  if (lead.notes) {
    lines.push("");
    lines.push(`<i>${escapeHtml(lead.notes.slice(0, 200))}</i>`);
  }
  return lines.join("\n");
}

export function formatLeadListHtml(leads: LeadData[]): string {
  if (!leads.length) {
    return [
      "<b>\ud83d\udcbc Leads</b>",
      "",
      "<i>No leads yet. Add one:</i>",
      "<code>/lead add Sarah CEO at StartupX</code>",
    ].join("\n");
  }
  const lines = [`<b>\ud83d\udcbc Leads</b> (${leads.length})`, ""];
  for (const lead of leads.slice(0, 10)) {
    const val = lead.value != null ? ` \u2014 $${lead.value.toLocaleString()}` : "";
    const co = lead.company ? ` (${escapeHtml(lead.company)})` : "";
    lines.push(`${STAGE_EMOJI[lead.stage]} <b>${escapeHtml(lead.name)}</b>${co}${val}`);
  }
  if (leads.length > 10) lines.push(`\n<i>...and ${leads.length - 10} more</i>`);
  return lines.join("\n");
}

export function formatPipelineHtml(
  pipeline: Record<LeadStage, number>,
  total: number,
): string {
  const stages: LeadStage[] = ["new", "contacted", "qualified", "proposal", "won", "lost"];
  const lines = [`<b>\ud83d\udcca Pipeline</b> (${total} leads)`, ""];
  for (const stage of stages) {
    const count = pipeline[stage] || 0;
    if (count > 0 || stage !== "lost") {
      lines.push(`${STAGE_EMOJI[stage]} ${STAGE_LABEL[stage]}: <b>${count}</b>`);
    }
  }
  return lines.join("\n");
}

export function formatLeadCreatedHtml(name: string, stage: LeadStage): string {
  return [
    `\u2705 <b>Lead added</b>`,
    "",
    `${STAGE_EMOJI[stage]} <b>${escapeHtml(name)}</b>`,
    `Stage: ${STAGE_LABEL[stage]}`,
  ].join("\n");
}

export function formatLeadUpdatedHtml(name: string, stage: LeadStage): string {
  return `${STAGE_EMOJI[stage]} <b>${escapeHtml(name)}</b> moved to <b>${STAGE_LABEL[stage]}</b>`;
}

export function buildLeadDetailKeyboard(leadId: string): InlineKeyboard {
  const short = leadId.slice(0, 8);
  return new InlineKeyboard()
    .text("\u27a1\ufe0f Advance", `ld:advance:${short}`)
    .text("\ud83d\udcc5 Schedule Meeting", `ld:meet:${short}`)
    .row()
    .text("\u270f\ufe0f Edit", `ld:edit:${short}`)
    .text("\ud83d\uddd1 Delete", `ld:del:${short}`)
    .row()
    .text("\ud83d\udcbc Pipeline", "ld:pipeline")
    .text("\u25c0\ufe0f Menu", "mn:menu");
}

export function buildLeadListKeyboard(leads: LeadData[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const lead of leads.slice(0, 5)) {
    const short = lead.id.slice(0, 8);
    const label = lead.name.length > 20 ? lead.name.slice(0, 18) + ".." : lead.name;
    kb.text(`${STAGE_EMOJI[lead.stage]} ${label}`, `ld:view:${short}`);
    kb.row();
  }
  kb.text("\u2795 Add Lead", "ld:add");
  kb.text("\ud83d\udcca Pipeline", "ld:pipeline");
  kb.row();
  kb.text("\u25c0\ufe0f Menu", "mn:menu");
  return kb;
}

export function buildLeadStageKeyboard(leadId: string): InlineKeyboard {
  const short = leadId.slice(0, 8);
  return new InlineKeyboard()
    .text("\ud83d\udfe2 New", `ld:stage:${short}:new`)
    .text("\ud83d\udfe1 Contacted", `ld:stage:${short}:contacted`)
    .row()
    .text("\ud83d\udd35 Qualified", `ld:stage:${short}:qualified`)
    .text("\ud83d\udfe3 Proposal", `ld:stage:${short}:proposal`)
    .row()
    .text("\u2705 Won", `ld:stage:${short}:won`)
    .text("\u274c Lost", `ld:stage:${short}:lost`)
    .row()
    .text("\u25c0\ufe0f Back", `ld:view:${short}`);
}

export function buildPipelineKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("\ud83d\udcbc All Leads", "ld:list")
    .text("\u2795 Add Lead", "ld:add")
    .row()
    .text("\u25c0\ufe0f Menu", "mn:menu");
}

// ==========================================================================
// Task Lists (Checklists)
// ==========================================================================

export interface TaskListItem {
  text: string;
  done: boolean;
  done_by?: string;
  done_by_name?: string;
  done_at?: string;
}

export interface TaskListData {
  id: string;
  chat_id: number;
  message_id?: number;
  creator_id: string;
  creator_name: string;
  title: string;
  items: TaskListItem[];
  status: string;        // 'active' | 'pending_review' | 'completed'
  reviewed_by?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  is_active: boolean;
  share_code?: string;
  board_id?: string;
  created_at: string;
  updated_at: string;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function progressBar(done: number, total: number, width: number = 12): string {
  if (total === 0) return "\u2591".repeat(width);
  const filled = Math.round((done / total) * width);
  return "\u2588".repeat(filled) + "\u2591".repeat(width - filled);
}

const STATUS_BADGE: Record<string, string> = {
  active: "Active",
  pending_review: "\u23f3 Pending review",
  completed: "\u2705 Done",
};

export function formatTaskListHtml(list: TaskListData): string {
  const done = list.items.filter((i) => i.done).length;
  const total = list.items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const lines: string[] = [
    `\ud83d\udccb <b>${escapeHtml(list.title)}</b>`,
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`,
  ];

  if (total > 0) {
    lines.push(`${progressBar(done, total)} ${done}/${total} (${pct}%)`);
    lines.push("");
  }

  for (const item of list.items) {
    const check = item.done ? "\u2611" : "\u2610";
    const byTag = item.done && item.done_by_name ? ` (\u2713 ${escapeHtml(item.done_by_name)})` : "";
    lines.push(`${check} ${escapeHtml(item.text)}${byTag}`);
  }

  if (total === 0) {
    lines.push("");
    lines.push("<i>No items yet. Tap + Add to get started.</i>");
  }

  // Footer
  lines.push("");
  lines.push(`\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`);
  const creator = list.creator_name ? `By ${escapeHtml(list.creator_name)}` : "";
  const updated = list.updated_at ? ` \u00b7 Updated ${relativeTime(list.updated_at)}` : "";
  if (creator || updated) lines.push(`${creator}${updated}`);
  if (list.status && list.status !== "active") {
    lines.push(STATUS_BADGE[list.status] || list.status);
  }

  return lines.join("\n");
}

export function buildTaskListKeyboard(list: TaskListData): InlineKeyboard {
  const kb = new InlineKeyboard();
  const short = list.id.slice(0, 8);

  // Item toggle buttons (rows of 4)
  for (let i = 0; i < list.items.length; i++) {
    const item = list.items[i];
    const label = item.done ? `${i + 1} \u2611` : `${i + 1} \u2610`;
    kb.text(label, `tl:t:${short}:${i}`);
    if ((i + 1) % 4 === 0) kb.row();
  }
  if (list.items.length % 4 !== 0) kb.row();

  // Action row
  kb.text("+ Add", `tl:a:${short}`);
  kb.text("\ud83d\uddd1 Delete", `tl:d:${short}`);

  // Nav row
  kb.row();
  kb.text("\u25c0 Back", "tl:back");
  kb.text("\ud83d\udd17 Share", `tl:share:${short}`);
  kb.text("\ud83d\udcca Kanban", `tl:kanban:${short}`);

  return kb;
}

// --- Task List Index (browse/paginated) ---

const TL_PAGE_SIZE = 5;

export function formatTaskListIndexHtml(
  lists: TaskListData[],
  page: number,
  filter: string,
): string {
  if (!lists.length) {
    return [
      "<b>\ud83d\udccb Checklists</b>",
      "",
      "No checklists yet!",
      "",
      "Try: <code>create checklist My List</code>",
    ].join("\n");
  }

  const start = page * TL_PAGE_SIZE;
  const pageItems = lists.slice(start, start + TL_PAGE_SIZE);
  const total = lists.length;
  const end = Math.min(start + TL_PAGE_SIZE, total);

  const filterLabel = filter !== "all" ? ` \u00b7 ${filter}` : "";
  const lines: string[] = [
    `<b>\ud83d\udccb Checklists</b>  (${start + 1}\u2013${end} of ${total}${filterLabel})`,
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`,
    "",
  ];

  for (let i = 0; i < pageItems.length; i++) {
    const list = pageItems[i];
    const num = NUM_EMOJI[i] || `${i + 1}.`;
    const done = list.items.filter((it) => it.done).length;
    const total = list.items.length;
    const bar = progressBar(done, total);
    const badge = STATUS_BADGE[list.status] || "";
    const dateStr = relativeTime(list.updated_at || list.created_at);

    lines.push(`${num} <b>${escapeHtml(list.title)}</b>`);
    lines.push(`   ${bar} ${done}/${total} \u00b7 ${badge} \u00b7 ${dateStr}`);
    lines.push("");
  }

  return lines.join("\n");
}

export function buildTaskListIndexKeyboard(
  listsOnPage: TaskListData[],
  page: number,
  totalPages: number,
  filter: string,
): InlineKeyboard {
  const kb = new InlineKeyboard();

  // Number buttons to view detail
  for (let i = 0; i < listsOnPage.length; i++) {
    const short = listsOnPage[i].id.slice(0, 8);
    kb.text(NUM_EMOJI[i] || `${i + 1}`, `tl:v:${short}`);
  }
  kb.row();

  // Nav row
  if (page > 0) kb.text("\u25c0\ufe0f", `tl:idx:${page - 1}`);
  const filterLabel = filter === "all" ? "All" : filter === "active" ? "Active" : filter === "pending_review" ? "Pending" : "Done";
  kb.text(`Filter: ${filterLabel} \u25be`, "tl:f:cycle");
  kb.text("+ New", "tl:new");
  if (page < totalPages - 1) kb.text("\u25b6\ufe0f", `tl:idx:${page + 1}`);

  return kb;
}
