import type { Bot, Context } from "grammy";
import { query } from "../db.js";
import { getSession, setSession } from "../bot.js";
import { buildEventCardKeyboard, buildCategoryFilterKeyboard, buildDateFilterKeyboard } from "../ui/keyboards.js";
import { formatEventCardHtml } from "../ui/cards.js";

interface DanzEvent {
  id: string;
  title: string;
  description?: string;
  category?: string;
  location_name?: string;
  location_city?: string;
  price_usd?: number;
  is_virtual?: boolean;
  skill_level?: string;
  dance_styles?: string[];
  start_date_time: string;
  end_date_time: string;
  current_capacity?: number;
  max_capacity?: number;
}

export function registerEvents(bot: Bot): void {
  bot.command("events", async (ctx) => {
    await sendEventCards(ctx);
  });
}

export async function sendEventCards(ctx: Context): Promise<void> {
  const tgId = ctx.from!.id;
  await ctx.replyWithChatAction("typing");

  const now = new Date().toISOString();
  const events = await query<DanzEvent[]>("events", {
    select: "id,title,description,category,location_name,location_city,price_usd,is_virtual,skill_level,dance_styles,start_date_time,end_date_time,current_capacity,max_capacity",
    start_date_time: `gt.${now}`,
    order: "start_date_time.asc",
    limit: "20",
  });

  if (!events?.length) {
    await ctx.reply("No upcoming events right now. Check back soon!");
    return;
  }

  const session = setSession(tgId, {
    events,
    filteredEvents: events,
    cardIndex: 0,
    categoryFilter: "all",
    dateFilter: "all",
  });

  const event = events[0];
  const msg = await ctx.reply(formatEventCardHtml(event, 0, events.length), {
    parse_mode: "HTML",
    reply_markup: buildEventCardKeyboard(event.id, 0, events.length),
  });
  setSession(tgId, { cardMessageId: msg.message_id });
}

export async function handleEventCallback(ctx: Context): Promise<void> {
  const tgId = ctx.from!.id;
  const data = ctx.callbackQuery!.data!;
  const parts = data.split(":");
  const action = parts[1];

  const session = getSession(tgId);
  if (!session || !session.filteredEvents.length) {
    await ctx.answerCallbackQuery({ text: "No events loaded. Try /events again." });
    return;
  }

  if (action === "next" || action === "prev") {
    const newIndex = action === "next"
      ? Math.min(session.cardIndex + 1, session.filteredEvents.length - 1)
      : Math.max(session.cardIndex - 1, 0);
    setSession(tgId, { cardIndex: newIndex });

    const event = session.filteredEvents[newIndex];
    await ctx.editMessageText(
      formatEventCardHtml(event, newIndex, session.filteredEvents.length, session.categoryFilter, session.dateFilter),
      {
        parse_mode: "HTML",
        reply_markup: buildEventCardKeyboard(event.id, newIndex, session.filteredEvents.length),
      },
    );
    return;
  }

  if (action === "fcat") {
    await ctx.editMessageText("Filter by category:", {
      parse_mode: "HTML",
      reply_markup: buildCategoryFilterKeyboard(session.categoryFilter),
    });
    return;
  }

  if (action === "setcat") {
    const category = parts[2] || "all";
    let filtered = session.events;
    if (category !== "all") {
      filtered = filtered.filter((e: any) => e.category === category);
    }
    // Also apply date filter
    filtered = applyDateFilter(filtered, session.dateFilter);

    setSession(tgId, { filteredEvents: filtered, cardIndex: 0, categoryFilter: category });

    if (!filtered.length) {
      await ctx.editMessageText("No events match this filter. Try a different one.", {
        reply_markup: buildCategoryFilterKeyboard(category),
      });
      return;
    }

    const event = filtered[0];
    await ctx.editMessageText(
      formatEventCardHtml(event, 0, filtered.length, category, session.dateFilter),
      {
        parse_mode: "HTML",
        reply_markup: buildEventCardKeyboard(event.id, 0, filtered.length),
      },
    );
    return;
  }

  if (action === "fdate") {
    await ctx.editMessageText("Filter by date:", {
      parse_mode: "HTML",
      reply_markup: buildDateFilterKeyboard(session.dateFilter),
    });
    return;
  }

  if (action === "setdate") {
    const dateFilter = parts[2] || "all";
    let filtered = session.events;
    if (session.categoryFilter !== "all") {
      filtered = filtered.filter((e: any) => e.category === session.categoryFilter);
    }
    filtered = applyDateFilter(filtered, dateFilter);

    setSession(tgId, { filteredEvents: filtered, cardIndex: 0, dateFilter });

    if (!filtered.length) {
      await ctx.editMessageText("No events match this filter. Try a different one.", {
        reply_markup: buildDateFilterKeyboard(dateFilter),
      });
      return;
    }

    const event = filtered[0];
    await ctx.editMessageText(
      formatEventCardHtml(event, 0, filtered.length, session.categoryFilter, dateFilter),
      {
        parse_mode: "HTML",
        reply_markup: buildEventCardKeyboard(event.id, 0, filtered.length),
      },
    );
    return;
  }
}

function applyDateFilter(events: any[], dateFilter: string): any[] {
  if (dateFilter === "all") return events;

  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const tomorrowEnd = new Date(todayEnd);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  switch (dateFilter) {
    case "today":
      return events.filter((e) => new Date(e.start_date_time) <= todayEnd);
    case "tomorrow":
      return events.filter((e) => {
        const d = new Date(e.start_date_time);
        return d > todayEnd && d <= tomorrowEnd;
      });
    case "week":
      return events.filter((e) => new Date(e.start_date_time) <= weekEnd);
    default:
      return events;
  }
}
