import { InlineKeyboard, Keyboard } from "grammy";

// ============================================================================
// Persistent bottom keyboard (always visible)
// ============================================================================

export const PERSISTENT_KEYBOARD = new Keyboard()
  .text("Events").text("Profile").row()
  .text("Challenges").text("Menu")
  .resized()
  .persistent();

// ============================================================================
// Inline keyboards
// ============================================================================

export function buildMenuKeyboard(miniAppUrl?: string): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text("📋 Events", "mn:events")
    .text("👤 Profile", "mn:profile")
    .row()
    .text("🎯 Challenges", "mn:challenges")
    .text("🏆 Leaderboard", "mn:leaderboard")
    .row()
    .text("✅ Check In", "mn:checkin")
    .text("💰 Wallet", "mn:wallet")
    .row()
    .text("🤝 Bonds", "mn:bonds");

  if (miniAppUrl) {
    kb.row().webApp("⚡ Open DANZ App", miniAppUrl);
  }

  return kb;
}

export function buildEventCardKeyboard(
  eventId: string,
  index: number,
  total: number,
): InlineKeyboard {
  const kb = new InlineKeyboard();

  // Navigation row
  if (index > 0) kb.text("◀️", "ec:prev");
  kb.text(`${index + 1}/${total}`, "ec:noop");
  if (index < total - 1) kb.text("▶️", "ec:next");
  kb.row();

  // Filter row
  kb.text("🎭 Category", "ec:fcat")
    .text("📅 Date", "ec:fdate")
    .row();

  // Check in to this event
  kb.text("✅ Check In", `ci:${eventId}`)
    .row();

  // Back to menu
  kb.text("◀️ Menu", "mn:menu");

  return kb;
}

export function buildCategoryFilterKeyboard(current: string): InlineKeyboard {
  const categories = [
    { id: "all", label: "All Events" },
    { id: "social", label: "Social" },
    { id: "class", label: "Class" },
    { id: "workshop", label: "Workshop" },
    { id: "battle", label: "Battle" },
    { id: "performance", label: "Performance" },
    { id: "salsa", label: "Salsa" },
    { id: "hip-hop", label: "Hip-Hop" },
    { id: "contemporary", label: "Contemporary" },
  ];

  const kb = new InlineKeyboard();
  for (const cat of categories) {
    const label = current === cat.id ? `[${cat.label}]` : cat.label;
    kb.text(label, `ec:setcat:${cat.id}`).row();
  }
  return kb;
}

export function buildDateFilterKeyboard(current: string): InlineKeyboard {
  const filters = [
    { id: "all", label: "All Dates" },
    { id: "today", label: "Today" },
    { id: "tomorrow", label: "Tomorrow" },
    { id: "week", label: "This Week" },
  ];

  const kb = new InlineKeyboard();
  for (const f of filters) {
    const label = current === f.id ? `[${f.label}]` : f.label;
    kb.text(label, `ec:setdate:${f.id}`).row();
  }
  return kb;
}

export function buildCheckinKeyboard(events: any[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const e of events.slice(0, 8)) {
    const time = new Date(e.start_date_time).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    kb.text(`✅ ${e.title} (${time})`, `ci:${e.id}`).row();
  }
  return kb;
}

export function buildDanceMoveKeyboard(eventId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("🫸 Git Push", `dm:${eventId}:git-push`)
    .text("🔀 Merge Conflict", `dm:${eventId}:merge-conflict`)
    .row()
    .text("🚀 Deploy", `dm:${eventId}:deploy`)
    .text("🔧 Hotfix", `dm:${eventId}:hotfix`)
    .row()
    .text("❓ 404", `dm:${eventId}:404`)
    .text("📚 Stack Overflow", `dm:${eventId}:stack-overflow`)
    .row()
    .text("📸 Send Photo", `dm:${eventId}:photo`);
}
