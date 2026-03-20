import type { Bot, Context } from "grammy";
import { query, upsert, insert, update } from "../db.js";
import { getSession, setSession, userId, type BotSession } from "../bot.js";
import { PERSISTENT_KEYBOARD, buildCheckinKeyboard, buildDanceMoveKeyboard } from "../ui/keyboards.js";
import { escapeHtml } from "../ui/cards.js";

export function registerCheckin(bot: Bot): void {
  bot.command("checkin", async (ctx) => {
    const tgId = ctx.from!.id;
    await ctx.replyWithChatAction("typing");

    const session = getSession(tgId);
    if (!session?.verified || !session?.privyId) {
      await ctx.reply("You need to connect your DANZ account first. Use /start to get set up!", {
        reply_markup: PERSISTENT_KEYBOARD,
      });
      return;
    }

    // Find events happening today / right now
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Events currently active (started but not ended)
    const activeEvents = await query<any[]>("events", {
      select: "id,title,start_date_time,end_date_time,location_name",
      start_date_time: `lte.${now.toISOString()}`,
      end_date_time: `gte.${now.toISOString()}`,
      order: "start_date_time.asc",
      limit: "10",
    });

    // Events starting today but not yet started
    const upcomingToday = await query<any[]>("events", {
      select: "id,title,start_date_time,end_date_time,location_name",
      start_date_time: `gt.${now.toISOString()}`,
      end_date_time: `lte.${todayEnd.toISOString()}`,
      order: "start_date_time.asc",
      limit: "10",
    });

    const allEvents = [...(activeEvents || []), ...(upcomingToday || [])];
    const seen = new Set<string>();
    const unique = allEvents.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    if (!unique.length) {
      await ctx.reply("No events happening today. Check /events for upcoming ones!", {
        reply_markup: PERSISTENT_KEYBOARD,
      });
      return;
    }

    await ctx.reply("<b>Check in to an event:</b>", {
      parse_mode: "HTML",
      reply_markup: buildCheckinKeyboard(unique),
    });
  });
}

export async function handleCheckinCallback(ctx: Context): Promise<void> {
  const tgId = ctx.from!.id;
  const data = ctx.callbackQuery!.data!;

  const session = getSession(tgId);
  if (!session?.verified || !session?.privyId) return;

  // ci:EVENT_ID - check in to event
  if (data.startsWith("ci:")) {
    const eventId = data.slice(3);

    // Check if already checked in
    const existing = await query<any[]>("event_registrations", {
      select: "id,checked_in",
      user_id: `eq.${session.privyId}`,
      event_id: `eq.${eventId}`,
      limit: "1",
    });

    if (existing?.length && existing[0].checked_in) {
      await ctx.editMessageText(
        "You're already checked in! Now prove you danced - pick a move or send a photo.",
        { reply_markup: buildDanceMoveKeyboard(eventId) },
      );
      return;
    }

    // Register + check in
    await upsert("event_registrations", {
      event_id: eventId,
      user_id: session.privyId,
      status: "attended",
      checked_in: true,
      check_in_time: new Date().toISOString(),
    }, "event_id,user_id");

    // Get event title
    const events = await query<any[]>("events", {
      select: "title",
      id: `eq.${eventId}`,
      limit: "1",
    });
    const title = events?.[0]?.title || "the event";

    setSession(tgId, { checkinEventId: eventId });

    await ctx.editMessageText(
      [
        `<b>Checked in!</b> +10 pts`,
        "",
        `You're at <b>${escapeHtml(title)}</b>`,
        "",
        "Now prove you danced! Pick a move or send a photo:",
      ].join("\n"),
      { parse_mode: "HTML", reply_markup: buildDanceMoveKeyboard(eventId) },
    );
    return;
  }

  // dm:EVENT_ID:MOVE - dance move proof
  if (data.startsWith("dm:")) {
    const parts = data.split(":");
    const eventId = parts[1];
    const moveId = parts.slice(2).join(":");

    if (moveId === "photo") {
      setSession(tgId, {
        checkinEventId: eventId,
        awaitingProofPhoto: true,
      });
      await ctx.editMessageText("Send a photo of your dance move for +25 bonus pts!");
      return;
    }

    // Record dance proof
    const moveName = DANCE_MOVES[moveId] || moveId;
    await insert("checkins", {
      user_id: session.privyId,
      fid: 0,
      did_dance: true,
      xp_earned: 25,
      reflection_data: {
        dance_move: moveName,
        event_id: eventId,
        platform: "telegram",
        submitted_at: new Date().toISOString(),
      },
    });

    await ctx.editMessageText(
      [
        `<b>Dance proof submitted!</b> +25 pts`,
        "",
        `Move: <b>${escapeHtml(moveName)}</b>`,
        "",
        "Keep the energy going!",
      ].join("\n"),
      { parse_mode: "HTML" },
    );
  }
}

export async function handleDanceProofPhoto(ctx: Context, session: BotSession): Promise<void> {
  const tgId = ctx.from!.id;
  const photo = ctx.message!.photo!;
  const fileId = photo[photo.length - 1].file_id;

  await insert("checkins", {
    user_id: session.privyId,
    fid: 0,
    did_dance: true,
    xp_earned: 25,
    reflection_data: {
      dance_move: session.danceMoveForProof || "freestyle",
      photo_file_id: fileId,
      event_id: session.checkinEventId,
      platform: "telegram",
      submitted_at: new Date().toISOString(),
    },
  });

  setSession(tgId, { awaitingProofPhoto: false });

  await ctx.reply(
    [
      "<b>Dance proof submitted!</b> +25 pts",
      "",
      "Photo received - you're verified as dancing at this event!",
    ].join("\n"),
    { parse_mode: "HTML", reply_markup: PERSISTENT_KEYBOARD },
  );
}

const DANCE_MOVES: Record<string, string> = {
  "git-push": "The Git Push",
  "merge-conflict": "Merge Conflict",
  "deploy": "Deploy to Prod",
  "hotfix": "Hotfix",
  "404": "404 Not Found",
  "stack-overflow": "Stack Overflow",
};
