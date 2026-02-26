/**
 * WhatsApp Message Formatters
 *
 * Equivalent of src/telegram/cards.ts but for WhatsApp.
 * Uses WhatsApp markdown: *bold*, _italic_, ~strikethrough~, ```monospace```
 */

import type { EventResult } from "../core/types.js";

// ============================================================================
// Welcome & Menu
// ============================================================================

export function formatWelcome(name: string): string {
  return [
    `Hey ${name}! Welcome to *FlowB*`,
    "",
    "Discover events, earn points, and connect with your crew.",
    "",
    "What would you like to do?",
  ].join("\n");
}

export function menuButtons(): Array<{ id: string; title: string }> {
  return [
    { id: "cmd:events", title: "Events" },
    { id: "cmd:flow", title: "Flow" },
    { id: "cmd:points", title: "Points" },
  ];
}

export function formatMenu(): string {
  return [
    "*FlowB* - flow & bond",
    "",
    "Discover what's happening.",
    "Earn by showing up. Claim what you've earned.",
  ].join("\n");
}

export function menuListSections(): Array<{
  title: string;
  rows: Array<{ id: string; title: string; description?: string }>;
}> {
  return [
    {
      title: "Discover",
      rows: [
        { id: "cmd:events", title: "Events", description: "Browse upcoming events" },
        { id: "cmd:schedule", title: "My Schedule", description: "Your upcoming RSVPs" },
      ],
    },
    {
      title: "Social",
      rows: [
        { id: "cmd:flow", title: "My Flow", description: "Friends & crews" },
        { id: "cmd:crews", title: "Crews", description: "Browse your crews" },
        { id: "cmd:friends", title: "Friends", description: "Your connections" },
        { id: "cmd:share", title: "Share Invite", description: "Invite friends to FlowB" },
      ],
    },
    {
      title: "Rewards",
      rows: [
        { id: "cmd:points", title: "Points", description: "Check your points & streak" },
      ],
    },
  ];
}

// ============================================================================
// Events
// ============================================================================

export function formatEventList(count: number): string {
  return `Found *${count}* upcoming events. Tap to see details.`;
}

export function formatNoEvents(): string {
  return "No events found right now. Check back later or try a different search!";
}

export function eventListSections(
  events: EventResult[],
): Array<{
  title: string;
  rows: Array<{ id: string; title: string; description?: string }>;
}> {
  const rows = events.map((evt, i) => {
    const date = formatShortDate(evt.startTime);
    const venue = evt.locationName ? ` @ ${evt.locationName}` : "";
    return {
      id: `evt:${i}`,
      title: truncate(evt.title, 24),
      description: truncate(`${date}${venue}`, 72),
    };
  });

  return [{ title: "Events", rows }];
}

export function formatEventDetail(event: EventResult): string {
  const lines: string[] = [];

  lines.push(`*${event.title}*`);
  lines.push("");

  // Date/time
  const date = formatDate(event.startTime);
  lines.push(`${date}`);

  if (event.locationName) {
    lines.push(`${event.locationName}`);
  }
  if (event.locationCity) {
    lines.push(`${event.locationCity}`);
  }

  // Price
  if (event.isFree) {
    lines.push("Free");
  } else if (event.price) {
    lines.push(`$${event.price}`);
  }

  // Description (truncated)
  if (event.description) {
    lines.push("");
    lines.push(truncate(event.description, 300));
  }

  // Categories
  if (event.categories?.length) {
    lines.push("");
    lines.push(event.categories.join(" | "));
  }

  return lines.join("\n");
}

export function eventDetailButtons(
  eventId: string,
  index: number,
  total: number,
): Array<{ id: string; title: string }> {
  const buttons: Array<{ id: string; title: string }> = [];

  buttons.push({ id: `rsvp:${eventId}`, title: "Going" });

  if (index < total - 1) {
    buttons.push({ id: "evt:next", title: "Next" });
  }

  buttons.push({ id: "cmd:menu", title: "Menu" });

  return buttons.slice(0, 3);
}

// ============================================================================
// Points
// ============================================================================

export function formatPoints(points: number, streak: number): string {
  return [
    `*Your Points*`,
    "",
    `Total: *${points}* pts`,
    streak > 0 ? `Streak: *${streak}* days` : "",
    "",
    "Earn points by checking in, RSVPing, and connecting with friends!",
  ].filter(Boolean).join("\n");
}

export function pointsButtons(): Array<{ id: string; title: string }> {
  return [
    { id: "cmd:events", title: "Browse Events" },
    { id: "cmd:schedule", title: "My Schedule" },
    { id: "cmd:menu", title: "Menu" },
  ];
}

// ============================================================================
// Flow (Friends & Crews)
// ============================================================================

export function formatFlowMenu(): string {
  return [
    "*My Flow*",
    "",
    "Connect with friends and join crews to make the most of events together.",
  ].join("\n");
}

export function flowMenuButtons(): Array<{ id: string; title: string }> {
  return [
    { id: "cmd:friends", title: "Friends" },
    { id: "cmd:crews", title: "Crews" },
    { id: "cmd:share", title: "Invite" },
  ];
}

// ============================================================================
// Crews
// ============================================================================

export function formatCrewList(count: number): string {
  return `You're in *${count}* crew${count === 1 ? "" : "s"}. Tap to view details.`;
}

export function crewListSections(
  crews: any[],
): Array<{
  title: string;
  rows: Array<{ id: string; title: string; description?: string }>;
}> {
  const rows = crews.slice(0, 10).map((crew: any) => ({
    id: `crew:${crew.id}`,
    title: truncate(crew.name || crew.id, 24),
    description: truncate(
      `${crew.member_count || "?"} members${crew.emoji ? ` ${crew.emoji}` : ""}`,
      72,
    ),
  }));

  return [{ title: "Your Crews", rows }];
}

export function formatCrewDetail(crew: any): string {
  const lines: string[] = [];
  lines.push(`*${crew.emoji || ""} ${crew.name}*`);
  lines.push("");
  if (crew.description) lines.push(crew.description);
  lines.push(`Members: ${crew.member_count || "?"}`);
  if (crew.join_code) lines.push(`Join code: ${crew.join_code}`);
  return lines.join("\n");
}

export function crewDetailButtons(
  crewId: string,
  isMember: boolean,
): Array<{ id: string; title: string }> {
  if (isMember) {
    return [
      { id: `leave:${crewId}`, title: "Leave Crew" },
      { id: "cmd:crews", title: "My Crews" },
      { id: "cmd:menu", title: "Menu" },
    ];
  }
  return [
    { id: `join:${crewId}`, title: "Join Crew" },
    { id: "cmd:crews", title: "Browse Crews" },
    { id: "cmd:menu", title: "Menu" },
  ];
}

// ============================================================================
// Schedule, Checkin, Share
// ============================================================================

export function formatSchedule(rsvps: any[]): string {
  const lines: string[] = ["*Your Schedule*", ""];
  for (const rsvp of rsvps.slice(0, 10)) {
    const date = formatShortDate(rsvp.start_time || rsvp.startTime || "");
    const title = rsvp.title || rsvp.event_title || "Event";
    lines.push(`- ${date} *${title}*`);
  }
  return lines.join("\n");
}

export function formatCheckinConfirm(venue: string, points: number): string {
  return `Checked in at *${venue}*! +${points} pts`;
}

export function formatShareInvite(link: string): string {
  return [
    "*Share FlowB*",
    "",
    "Send this link to friends:",
    link,
    "",
    "When they join, you both earn bonus points!",
  ].join("\n");
}

// ============================================================================
// Helpers
// ============================================================================

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "\u2026";
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Denver",
    });
  } catch {
    return iso;
  }
}

function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Denver",
    });
  } catch {
    return iso;
  }
}
