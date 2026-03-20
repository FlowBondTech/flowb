/**
 * HTML card formatters for Telegram messages.
 * Uses Telegram HTML: <b>, <i>, <a>, <code>, <pre>
 */

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ============================================================================
// Event Card
// ============================================================================

export function formatEventCardHtml(
  event: any,
  index: number,
  total: number,
  categoryFilter?: string,
  dateFilter?: string,
): string {
  const date = new Date(event.start_date_time);
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

  lines.push(`📅  ${dateStr} · ${timeStr}`);

  if (event.is_virtual) {
    lines.push("🌐  Online");
  } else if (event.location_name) {
    const loc = event.location_city
      ? `${escapeHtml(event.location_name)}, ${escapeHtml(event.location_city)}`
      : escapeHtml(event.location_name);
    lines.push(`📍  ${loc}`);
  }

  if (event.price_usd === 0 || event.price_usd === null || event.price_usd === undefined) {
    lines.push("🎫  Free");
  } else {
    lines.push(`🎫  $${event.price_usd}`);
  }

  if (event.category) {
    lines.push(`🎭  ${escapeHtml(event.category)}`);
  }

  if (event.skill_level && event.skill_level !== "all") {
    lines.push(`📊  ${escapeHtml(event.skill_level)}`);
  }

  if (event.dance_styles?.length) {
    lines.push(`💃  ${event.dance_styles.map(escapeHtml).join(", ")}`);
  }

  if (event.current_capacity !== undefined && event.max_capacity) {
    lines.push(`👥  ${event.current_capacity}/${event.max_capacity} spots`);
  }

  if (event.description) {
    const snippet = event.description.length > 150
      ? event.description.slice(0, 147) + "..."
      : event.description;
    lines.push("");
    lines.push(escapeHtml(snippet));
  }

  lines.push("");
  lines.push(`<i>Event ${index + 1} of ${total}</i>`);

  const filters: string[] = [];
  if (categoryFilter && categoryFilter !== "all") filters.push(categoryFilter);
  if (dateFilter && dateFilter !== "all") filters.push(dateFilter);
  if (filters.length) {
    lines.push(`<i>Filters: ${filters.join(", ")}</i>`);
  }

  return lines.join("\n");
}

// ============================================================================
// Profile Card
// ============================================================================

export interface ProfileData {
  name: string;
  level: number;
  xp: number;
  totalDanceTime: number;
  totalSessions: number;
  currentStreak: number;
  longestStreak: number;
  eventsAttended: number;
  bondsCount: number;
  achievementCount: number;
  danceStyles: string[];
  skillLevel: string;
  tier: string;
}

export function formatProfileHtml(p: ProfileData): string {
  const hours = Math.floor(p.totalDanceTime / 60);
  const mins = p.totalDanceTime % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const lines: string[] = [
    `<b>@${escapeHtml(p.name)}</b>`,
    "",
    `<b>Level ${p.level}</b>  |  ${p.xp} XP`,
    "",
    `Dance Time: ${timeStr}`,
    `Sessions: ${p.totalSessions}`,
    `Current Streak: ${p.currentStreak} days`,
    `Longest Streak: ${p.longestStreak} days`,
    `Events Attended: ${p.eventsAttended}`,
    `Dance Bonds: ${p.bondsCount}`,
    `Achievements: ${p.achievementCount}`,
  ];

  if (p.danceStyles.length) {
    lines.push(`Styles: ${p.danceStyles.map(escapeHtml).join(", ")}`);
  }

  if (p.skillLevel !== "all") {
    lines.push(`Level: ${escapeHtml(p.skillLevel)}`);
  }

  if (p.tier !== "free") {
    lines.push(`Tier: ${escapeHtml(p.tier)}`);
  }

  return lines.join("\n");
}

// ============================================================================
// Menu
// ============================================================================

export function formatMenuHtml(): string {
  return [
    "<b>DANZ.Now</b>  <i>Move. Connect. Earn.</i>",
    "",
    "Find events. Earn XP. Build bonds.",
    "Tap below to explore.",
  ].join("\n");
}
