/**
 * Signal Message Formatters
 *
 * Text-based menus with numbered options since Signal doesn't support
 * interactive buttons or lists like WhatsApp/Telegram.
 *
 * Signal supports basic styling: *bold*, _italic_, ~strikethrough~, ||spoiler||
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
    "Reply with a command:",
    "  *events* - Browse upcoming events",
    "  *points* - Check your points & streak",
    "  *flow* - Friends & crews",
    "  *menu* - See all options",
  ].join("\n");
}

export function formatMenu(): string {
  return [
    "*FlowB Menu*",
    "",
    "_Discover_",
    "  *events* - Browse upcoming events",
    "  *schedule* - Your upcoming RSVPs",
    "",
    "_Social_",
    "  *flow* - Friends & crews",
    "  *crews* - Browse your crews",
    "  *friends* - Your connections",
    "  *share* - Invite friends to FlowB",
    "",
    "_Rewards_",
    "  *points* - Check your points & streak",
    "",
    "Or type *help* for tips.",
  ].join("\n");
}

// ============================================================================
// Events
// ============================================================================

export function formatEventList(events: EventResult[]): string {
  if (!events.length) {
    return "No events found right now. Check back later!";
  }

  const lines: string[] = [
    `*${events.length} upcoming events:*`,
    "",
  ];

  for (let i = 0; i < Math.min(events.length, 10); i++) {
    const evt = events[i];
    const date = formatShortDate(evt.startTime);
    const venue = evt.locationName ? ` @ ${evt.locationName}` : "";
    lines.push(`*${i + 1}.* ${truncate(evt.title, 40)}`);
    lines.push(`   ${date}${venue}`);
    lines.push("");
  }

  lines.push("Reply with the *number* to see details (e.g., *1*).");

  return lines.join("\n");
}

export function formatEventDetail(
  event: EventResult,
  index: number,
  total: number,
): string {
  const lines: string[] = [];

  lines.push(`*${event.title}*`);
  lines.push("");

  const date = formatDate(event.startTime);
  lines.push(date);

  if (event.locationName) lines.push(event.locationName);
  if (event.locationCity) lines.push(event.locationCity);

  if (event.isFree) {
    lines.push("Free");
  } else if (event.price) {
    lines.push(`$${event.price}`);
  }

  if (event.description) {
    lines.push("");
    lines.push(truncate(event.description, 300));
  }

  if (event.categories?.length) {
    lines.push("");
    lines.push(event.categories.join(" | "));
  }

  if (event.url) {
    lines.push("");
    lines.push(event.url);
  }

  lines.push("");
  lines.push("---");
  lines.push(`*going* - RSVP to this event`);
  if (index < total - 1) {
    lines.push(`*next* - Next event`);
  }
  if (index > 0) {
    lines.push(`*prev* - Previous event`);
  }
  lines.push(`*events* - Back to list`);

  return lines.join("\n");
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
    "",
    "*events* - Browse events | *schedule* - My schedule",
  ].filter(Boolean).join("\n");
}

// ============================================================================
// Flow (Friends & Crews)
// ============================================================================

export function formatFlowMenu(): string {
  return [
    "*My Flow*",
    "",
    "Connect with friends and join crews.",
    "",
    "  *friends* - See your connections",
    "  *crews* - Browse your crews",
    "  *share* - Invite friends",
  ].join("\n");
}

// ============================================================================
// Crews
// ============================================================================

export function formatCrewList(crews: any[]): string {
  if (!crews.length) {
    return "You're not in any crews yet. Share your invite link to start one!";
  }

  const lines: string[] = [
    `*Your Crews* (${crews.length})`,
    "",
  ];

  for (let i = 0; i < Math.min(crews.length, 10); i++) {
    const crew = crews[i];
    const emoji = crew.emoji || "";
    const members = crew.member_count || "?";
    lines.push(`*${i + 1}.* ${emoji} ${crew.name || crew.id} (${members} members)`);
  }

  lines.push("");
  lines.push("Reply with the *number* to see crew details.");

  return lines.join("\n");
}

export function formatCrewDetail(crew: any): string {
  const lines: string[] = [];
  lines.push(`*${crew.emoji || ""} ${crew.name}*`);
  lines.push("");
  if (crew.description) lines.push(crew.description);
  lines.push(`Members: ${crew.member_count || "?"}`);
  if (crew.join_code) lines.push(`Join code: ${crew.join_code}`);

  lines.push("");
  if (crew.is_member) {
    lines.push("*leave* - Leave this crew | *crews* - Back to list");
  } else {
    lines.push("*join* - Join this crew | *crews* - Back to list");
  }

  return lines.join("\n");
}

// ============================================================================
// Schedule, Checkin, Share, Friends
// ============================================================================

export function formatSchedule(rsvps: any[]): string {
  if (!rsvps.length) {
    return "No upcoming events on your schedule. Type *events* to browse!";
  }

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

export function formatFriendsList(friends: any[]): string {
  if (!friends.length) {
    return "No friends yet! Type *share* to invite people.";
  }

  const lines: string[] = [
    `*Your Friends* (${friends.length})`,
    "",
  ];

  for (const f of friends.slice(0, 10)) {
    lines.push(`- ${f.display_name || f.friend_id}`);
  }

  return lines.join("\n");
}

export function formatHelp(): string {
  return [
    "*FlowB Commands*",
    "",
    "*events* - Browse upcoming events",
    "*schedule* - Your upcoming RSVPs",
    "*points* - Check your points",
    "*flow* - Friends & crews menu",
    "*crews* - Browse your crews",
    "*friends* - Your connections",
    "*share* - Invite friends",
    "*menu* - Full menu",
    "*help* - This message",
    "",
    "When browsing events, reply with a *number* to see details.",
    "Use *checkin <code>* to check in at a venue.",
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
