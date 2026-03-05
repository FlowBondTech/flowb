/**
 * FlowB Signal Bot
 *
 * Webhook handler for signal-cli-rest-api. Registers a POST route on the
 * Fastify instance to receive incoming messages from Signal.
 *
 * Uses FlowBCore for event discovery and action routing, mirroring the
 * WhatsApp/Telegram bot pattern. Since Signal doesn't have interactive
 * buttons, navigation uses text commands and numbered selections.
 */

import type { FastifyInstance } from "fastify";
import type { FlowBCore } from "../core/flowb.js";
import type { EventResult } from "../core/types.js";
import type { SignalWebhookPayload, SignalSession } from "./types.js";
import * as signal from "./api.js";
import {
  formatWelcome,
  formatMenu,
  formatEventList,
  formatEventDetail,
  formatPoints,
  formatFlowMenu,
  formatCrewList,
  formatCrewDetail,
  formatSchedule,
  formatCheckinConfirm,
  formatShareInvite,
  formatFriendsList,
  formatHelp,
} from "./messages.js";
import { log, fireAndForget } from "../utils/logger.js";

const SESSION_TTL_MS = 30 * 60 * 1000;
const sessions = new Map<string, SignalSession>();

function getOrCreateSession(phone: string): SignalSession {
  let session = sessions.get(phone);
  if (!session || Date.now() - session.lastActive > SESSION_TTL_MS) {
    session = {
      events: [],
      filteredEvents: [],
      cardIndex: 0,
      categoryFilter: "all",
      dateFilter: "all",
      verified: false,
      chatHistory: [],
      lastActive: Date.now(),
    };
    sessions.set(phone, session);
  }
  session.lastActive = Date.now();
  return session;
}

// Clean stale sessions every 15 minutes
setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [phone, session] of sessions) {
    if (session.lastActive < cutoff) sessions.delete(phone);
  }
}, 15 * 60 * 1000);

// ============================================================================
// Webhook Registration
// ============================================================================

export function registerSignalWebhook(app: FastifyInstance, core: FlowBCore) {
  if (!process.env.SIGNAL_API_URL || !process.env.SIGNAL_BOT_NUMBER) {
    log.info("[signal-bot]", "Signal not configured, skipping webhook registration");
    return;
  }

  const webhookSecret = process.env.SIGNAL_WEBHOOK_SECRET;

  // POST: Incoming messages from signal-cli-rest-api webhook
  app.post(
    "/api/v1/signal/webhook",
    async (request, reply) => {
      // Always return 200 immediately
      reply.status(200).send("OK");

      // Verify webhook secret if configured
      if (webhookSecret) {
        const authHeader = request.headers.authorization;
        if (authHeader !== `Bearer ${webhookSecret}`) {
          log.error("[signal-bot]", "Invalid webhook authorization");
          return;
        }
      }

      const payload = request.body as SignalWebhookPayload;
      if (!payload?.envelope) return;

      const envelope = payload.envelope;

      // Only process data messages (text, attachments)
      if (!envelope.dataMessage) return;

      // Ignore group messages for now (only handle 1:1 DMs)
      if (envelope.dataMessage.groupInfo) return;

      const phone = envelope.source || envelope.sourceNumber;
      const message = envelope.dataMessage.message;
      const profileName = envelope.sourceName;

      if (!phone || !message) return;

      fireAndForget(
        handleMessage(core, phone, message.trim(), profileName, envelope.timestamp),
        "signal message handler",
      );
    },
  );

  // Health check for Signal bot
  app.get("/api/v1/signal/health", async () => {
    return signal.healthCheck();
  });

  log.info("[signal-bot]", "Signal webhook registered at /api/v1/signal/webhook");
}

// ============================================================================
// Message Handler
// ============================================================================

async function handleMessage(
  core: FlowBCore,
  phone: string,
  text: string,
  profileName?: string,
  timestamp?: number,
): Promise<void> {
  // Normalize phone: strip + prefix for user ID
  const normalizedPhone = phone.startsWith("+") ? phone.slice(1) : phone;
  const userId = `signal_${normalizedPhone}`;

  // Track conversation
  trackConversation(normalizedPhone, userId, profileName);

  const session = getOrCreateSession(normalizedPhone);
  if (profileName) session.displayName = profileName;

  const command = text.toLowerCase().trim();

  try {
    await routeCommand(core, phone, userId, session, command, text);
  } catch (err: any) {
    log.error("[signal-bot]", `Error handling message from ${phone}: ${err.message}`);
    await signal.sendText(phone, "Something went wrong. Try again or type *menu* for options.");
  }
}

// ============================================================================
// Command Router
// ============================================================================

async function routeCommand(
  core: FlowBCore,
  phone: string,
  userId: string,
  session: SignalSession,
  command: string,
  originalText: string,
): Promise<void> {
  // Welcome / onboarding
  if (["hi", "hey", "hello", "start", "hola"].includes(command)) {
    return handleWelcome(core, phone, userId, session);
  }

  // Menu
  if (command === "menu" || command === "m") {
    return handleMenu(phone);
  }

  // Help
  if (command === "help" || command === "h" || command === "?") {
    return handleHelp(phone);
  }

  // Events
  if (command === "events" || command === "e") {
    return handleEvents(core, phone, userId, session);
  }

  // Event navigation
  if (command === "next" || command === "n") {
    session.cardIndex = Math.min(session.cardIndex + 1, session.filteredEvents.length - 1);
    return handleEventDetail(core, phone, userId, session, session.cardIndex);
  }
  if (command === "prev" || command === "p" || command === "back") {
    session.cardIndex = Math.max(session.cardIndex - 1, 0);
    return handleEventDetail(core, phone, userId, session, session.cardIndex);
  }

  // RSVP to current event
  if (command === "going" || command === "rsvp" || command === "go") {
    const event = session.filteredEvents[session.cardIndex];
    if (event) {
      return handleRsvp(core, phone, userId, event.id);
    }
    await signal.sendText(phone, "No event selected. Type *events* to browse.");
    return;
  }

  // Numeric selection (event or crew by number)
  const num = parseInt(command, 10);
  if (!isNaN(num) && num >= 1) {
    // If we have events loaded, select event
    if (session.filteredEvents.length > 0 && num <= session.filteredEvents.length) {
      return handleEventDetail(core, phone, userId, session, num - 1);
    }
    // If we have crews loaded (context-aware)
    if (session.awaitingInput === "crew_select") {
      return handleCrewSelectByNumber(core, phone, userId, session, num);
    }
  }

  // Points
  if (command === "points" || command === "pts") {
    return handlePoints(core, phone, userId);
  }

  // Flow (friends/crews)
  if (command === "flow" || command === "f") {
    return handleFlowMenu(phone);
  }

  // Crews
  if (command === "crews" || command === "crew" || command === "c") {
    return handleCrews(core, phone, userId, session);
  }

  // Crew actions
  if (command === "join") {
    if (session.awaitingInput?.startsWith("crew_")) {
      const crewId = session.awaitingInput.replace("crew_", "");
      session.awaitingInput = undefined;
      return handleCrewJoin(core, phone, userId, crewId);
    }
    await signal.sendText(phone, "No crew selected. Type *crews* first.");
    return;
  }

  if (command === "leave") {
    if (session.awaitingInput?.startsWith("crew_")) {
      const crewId = session.awaitingInput.replace("crew_", "");
      session.awaitingInput = undefined;
      return handleCrewLeave(core, phone, userId, crewId);
    }
    await signal.sendText(phone, "No crew selected. Type *crews* first.");
    return;
  }

  // Create crew
  if (command === "create crew" || command === "newcrew") {
    session.awaitingCrewName = true;
    await signal.sendText(phone, "What would you like to name your crew?");
    return;
  }

  // Awaiting crew name
  if (session.awaitingCrewName) {
    session.awaitingCrewName = false;
    return handleCrewCreate(core, phone, userId, originalText);
  }

  // Check-in
  if (command.startsWith("checkin ") || command.startsWith("ci ")) {
    const code = command.replace(/^(checkin|ci)\s+/, "");
    return handleCheckin(core, phone, userId, code);
  }

  // Share invite
  if (command === "share" || command === "invite") {
    return handleShare(core, phone, userId);
  }

  // Schedule (upcoming RSVPs)
  if (command === "schedule" || command === "sched" || command === "s") {
    return handleSchedule(core, phone, userId, session);
  }

  // Friends
  if (command === "friends" || command === "fr") {
    return handleFriends(core, phone, userId);
  }

  // Deep link join codes
  if (command.startsWith("join f_") || command.startsWith("join g_")) {
    return handleDeepLinkJoin(core, phone, userId, command.replace("join ", ""));
  }

  // Todos
  if (command === "todo" || command === "todos") {
    return handleTodos(core, phone, userId);
  }
  if (command.startsWith("todo add ")) {
    return handleTodoAdd(core, phone, userId, originalText.slice("todo add ".length).trim());
  }

  // Default: show hint
  await signal.sendText(
    phone,
    "I didn't catch that. Type *menu* to see what I can do, or try:\n\n" +
    "*events* - Browse events\n" +
    "*points* - Check your points\n" +
    "*flow* - Friends & crews\n" +
    "*help* - All commands",
  );
}

// ============================================================================
// Command Handlers
// ============================================================================

async function handleWelcome(
  core: FlowBCore,
  phone: string,
  userId: string,
  session: SignalSession,
): Promise<void> {
  fireAndForget(core.awardPoints(userId, "signal", "first_message"), "award points");

  const name = session.displayName || "there";
  await signal.sendText(phone, formatWelcome(name));
}

async function handleMenu(phone: string): Promise<void> {
  await signal.sendText(phone, formatMenu());
}

async function handleHelp(phone: string): Promise<void> {
  await signal.sendText(phone, formatHelp());
}

async function handleEvents(
  core: FlowBCore,
  phone: string,
  userId: string,
  session: SignalSession,
): Promise<void> {
  const result = await core.discoverEvents({
    action: "events",
    user_id: userId,
    platform: "app",
  });

  let events: EventResult[] = [];
  try {
    if (typeof result === "string") {
      const parsed = JSON.parse(result);
      events = parsed.events || parsed || [];
    } else if (Array.isArray(result)) {
      events = result;
    }
  } catch {
    events = [];
  }

  session.events = events;
  session.filteredEvents = events;
  session.cardIndex = 0;
  session.awaitingInput = undefined;

  await signal.sendText(phone, formatEventList(events));
}

async function handleEventDetail(
  core: FlowBCore,
  phone: string,
  userId: string,
  session: SignalSession,
  index: number,
): Promise<void> {
  const event = session.filteredEvents[index];
  if (!event) {
    await signal.sendText(phone, "Event not found. Type *events* to browse.");
    return;
  }

  session.cardIndex = index;
  await signal.sendText(
    phone,
    formatEventDetail(event, index, session.filteredEvents.length),
  );
}

async function handleRsvp(
  core: FlowBCore,
  phone: string,
  userId: string,
  eventId: string,
): Promise<void> {
  try {
    await core.execute("flow_rsvp", {
      action: "flow_rsvp",
      user_id: userId,
      event_id: eventId,
      event_status: "going",
    });

    await signal.sendText(
      phone,
      "You're going! We'll remind you before it starts.\n\n" +
      "*schedule* - My Schedule | *events* - More Events",
    );

    fireAndForget(core.awardPoints(userId, "signal", "rsvp"), "award rsvp points");
  } catch (err: any) {
    await signal.sendText(phone, `Couldn't RSVP: ${err.message}`);
  }
}

async function handlePoints(
  core: FlowBCore,
  phone: string,
  userId: string,
): Promise<void> {
  try {
    const result = await core.execute("get_points", {
      action: "get_points",
      user_id: userId,
    });

    let points = 0;
    let streak = 0;
    try {
      const parsed = typeof result === "string" ? JSON.parse(result) : result;
      points = parsed.total_points || parsed.points || 0;
      streak = parsed.streak || 0;
    } catch {}

    await signal.sendText(phone, formatPoints(points, streak));
  } catch {
    await signal.sendText(phone, "Couldn't load points. Try again later.");
  }
}

async function handleFlowMenu(phone: string): Promise<void> {
  await signal.sendText(phone, formatFlowMenu());
}

async function handleCrews(
  core: FlowBCore,
  phone: string,
  userId: string,
  session: SignalSession,
): Promise<void> {
  try {
    const result = await core.execute("list_groups", {
      action: "list_groups",
      user_id: userId,
    });

    let crews: any[] = [];
    try {
      const parsed = typeof result === "string" ? JSON.parse(result) : result;
      crews = parsed.groups || parsed || [];
    } catch {}

    // Store crews in session for number-based selection
    (session as any)._crews = crews;
    session.awaitingInput = "crew_select";

    if (!crews.length) {
      await signal.sendText(
        phone,
        "You're not in any crews yet.\n\n*create crew* - Start a crew\n*share* - Invite friends",
      );
      return;
    }

    await signal.sendText(phone, formatCrewList(crews));
  } catch {
    await signal.sendText(phone, "Couldn't load crews. Try again later.");
  }
}

async function handleCrewSelectByNumber(
  core: FlowBCore,
  phone: string,
  userId: string,
  session: SignalSession,
  num: number,
): Promise<void> {
  const crews = (session as any)._crews as any[] | undefined;
  if (!crews || num > crews.length) {
    await signal.sendText(phone, "Invalid selection. Type *crews* to see your crews.");
    return;
  }

  const crew = crews[num - 1];
  return handleCrewDetail(core, phone, userId, crew.id);
}

async function handleCrewDetail(
  core: FlowBCore,
  phone: string,
  userId: string,
  crewId: string,
): Promise<void> {
  try {
    const result = await core.execute("group_info", {
      action: "group_info",
      user_id: userId,
      group_id: crewId,
    });

    const crew = typeof result === "string" ? JSON.parse(result) : result;

    // Store crew context for join/leave commands
    const session = sessions.get(phone.startsWith("+") ? phone.slice(1) : phone);
    if (session) session.awaitingInput = `crew_${crewId}`;

    await signal.sendText(phone, formatCrewDetail(crew));
  } catch {
    await signal.sendText(phone, "Couldn't load crew details.");
  }
}

async function handleCrewJoin(
  core: FlowBCore,
  phone: string,
  userId: string,
  crewId: string,
): Promise<void> {
  try {
    await core.execute("join_group", {
      action: "join_group",
      user_id: userId,
      group_id: crewId,
    });
    await signal.sendText(phone, "You joined the crew! Type *crews* to see your crews.");
    fireAndForget(core.awardPoints(userId, "signal", "join_crew"), "award points");
  } catch (err: any) {
    await signal.sendText(phone, `Couldn't join crew: ${err.message}`);
  }
}

async function handleCrewLeave(
  core: FlowBCore,
  phone: string,
  userId: string,
  crewId: string,
): Promise<void> {
  try {
    await core.execute("leave_group", {
      action: "leave_group",
      user_id: userId,
      group_id: crewId,
    });
    await signal.sendText(phone, "You left the crew.");
  } catch (err: any) {
    await signal.sendText(phone, `Couldn't leave crew: ${err.message}`);
  }
}

async function handleCrewCreate(
  core: FlowBCore,
  phone: string,
  userId: string,
  name: string,
): Promise<void> {
  try {
    const result = await core.execute("create_group", {
      action: "create_group",
      user_id: userId,
      query: name,
    });

    const crew = typeof result === "string" ? JSON.parse(result) : result;
    const joinCode = crew.join_code || crew.code;
    const shareUrl = joinCode ? `flowb.me/g/${joinCode}` : "";

    await signal.sendText(
      phone,
      `Crew *${name}* created!${shareUrl ? `\n\nShare: ${shareUrl}` : ""}\n\nType *crews* to manage your crews.`,
    );
    fireAndForget(core.awardPoints(userId, "signal", "create_crew"), "award points");
  } catch (err: any) {
    await signal.sendText(phone, `Couldn't create crew: ${err.message}`);
  }
}

async function handleCheckin(
  core: FlowBCore,
  phone: string,
  userId: string,
  code: string,
): Promise<void> {
  try {
    const result = await core.execute("checkin", {
      action: "checkin",
      user_id: userId,
      query: code,
    });

    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    await signal.sendText(phone, formatCheckinConfirm(parsed.venue || code, parsed.points || 5));
    fireAndForget(core.awardPoints(userId, "signal", "checkin"), "award points");
  } catch (err: any) {
    await signal.sendText(phone, `Check-in failed: ${err.message}`);
  }
}

async function handleShare(
  core: FlowBCore,
  phone: string,
  userId: string,
): Promise<void> {
  try {
    const result = await core.execute("get_invite_link", {
      action: "get_invite_link",
      user_id: userId,
    });

    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    const link = parsed.link || parsed.url || `flowb.me/ref/${userId}`;

    await signal.sendText(phone, formatShareInvite(link));
  } catch {
    await signal.sendText(phone, "Share FlowB with friends: flowb.me");
  }
}

async function handleSchedule(
  core: FlowBCore,
  phone: string,
  userId: string,
  session: SignalSession,
): Promise<void> {
  try {
    const result = await core.execute("my_rsvps", {
      action: "my_rsvps",
      user_id: userId,
    });

    let rsvps: any[] = [];
    try {
      const parsed = typeof result === "string" ? JSON.parse(result) : result;
      rsvps = parsed.rsvps || parsed || [];
    } catch {}

    await signal.sendText(phone, formatSchedule(rsvps));
  } catch {
    await signal.sendText(phone, "Couldn't load your schedule. Try again later.");
  }
}

async function handleFriends(
  core: FlowBCore,
  phone: string,
  userId: string,
): Promise<void> {
  try {
    const result = await core.execute("list_friends", {
      action: "list_friends",
      user_id: userId,
    });

    let friends: any[] = [];
    try {
      const parsed = typeof result === "string" ? JSON.parse(result) : result;
      friends = parsed.friends || parsed || [];
    } catch {}

    await signal.sendText(phone, formatFriendsList(friends));
  } catch {
    await signal.sendText(phone, "Couldn't load friends list.");
  }
}

async function handleDeepLinkJoin(
  core: FlowBCore,
  phone: string,
  userId: string,
  code: string,
): Promise<void> {
  try {
    if (code.startsWith("f_")) {
      await core.execute("accept_invite", {
        action: "accept_invite",
        user_id: userId,
        referral_code: code.replace("f_", ""),
      });
      await signal.sendText(phone, "Friend request accepted! You're now connected.");
      fireAndForget(core.awardPoints(userId, "signal", "accept_invite"), "award points");
    } else if (code.startsWith("g_")) {
      await core.execute("join_group_by_code", {
        action: "join_group_by_code",
        user_id: userId,
        referral_code: code.replace("g_", ""),
      });
      await signal.sendText(phone, "You joined the crew! Type *crews* to see your crews.");
      fireAndForget(core.awardPoints(userId, "signal", "join_crew"), "award points");
    }
  } catch (err: any) {
    await signal.sendText(phone, `Couldn't process invite: ${err.message}`);
  }
}

// ============================================================================
// Todo Handlers
// ============================================================================

async function handleTodos(
  core: FlowBCore,
  phone: string,
  userId: string,
): Promise<void> {
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_KEY;
  if (!sbUrl || !sbKey) {
    await signal.sendText(phone, "Todo system not configured.");
    return;
  }

  try {
    const res = await fetch(
      `${sbUrl}/rest/v1/flowb_todos?status=eq.open&order=priority.asc,created_at.desc&limit=10`,
      {
        headers: {
          apikey: sbKey,
          Authorization: `Bearer ${sbKey}`,
        },
      },
    );
    if (!res.ok) throw new Error("fetch failed");
    const todos = (await res.json()) as any[];

    if (!todos.length) {
      await signal.sendText(phone, "No open todos right now.");
      return;
    }

    const priorityIcon: Record<string, string> = { high: "!!!", medium: "!!", low: "!" };
    const lines = todos.map(
      (t: any, i: number) =>
        `${i + 1}. [${priorityIcon[t.priority] || "!"}] ${t.title}${t.category ? ` (${t.category})` : ""}${t.assigned_to ? ` @${t.assigned_to}` : ""}`,
    );

    await signal.sendText(
      phone,
      `Open Todos:\n\n${lines.join("\n")}\n\nUse *todo add <title>* to add a new todo.`,
    );
  } catch {
    await signal.sendText(phone, "Couldn't load todos. Try again later.");
  }
}

async function handleTodoAdd(
  core: FlowBCore,
  phone: string,
  userId: string,
  title: string,
): Promise<void> {
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_KEY;
  if (!sbUrl || !sbKey) {
    await signal.sendText(phone, "Todo system not configured.");
    return;
  }

  try {
    const res = await fetch(`${sbUrl}/rest/v1/flowb_todos`, {
      method: "POST",
      headers: {
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        title,
        status: "open",
        priority: "medium",
        source: "signal",
        created_by: userId,
      }),
    });

    if (!res.ok) throw new Error("insert failed");

    await signal.sendText(phone, `Todo added: *${title}*\n\nType *todo* to see all open todos.`);
    fireAndForget(core.awardPoints(userId, "signal", "todo_added"), "award points");

    // Notify admins
    try {
      const { alertAdmins } = await import("../services/admin-alerts.js");
      alertAdmins(`New todo from Signal user ${userId}: ${title}`);
    } catch {}
  } catch {
    await signal.sendText(phone, "Couldn't add todo. Try again later.");
  }
}

// ============================================================================
// Helpers
// ============================================================================

function trackConversation(phone: string, userId: string, profileName?: string): void {
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_KEY;
  if (!sbUrl || !sbKey) return;

  fireAndForget(
    fetch(`${sbUrl}/rest/v1/flowb_signal_conversations`, {
      method: "POST",
      headers: {
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal,resolution=merge-duplicates",
      },
      body: JSON.stringify({
        phone,
        user_id: userId,
        profile_name: profileName || null,
        last_message_at: new Date().toISOString(),
      }),
    }),
    "track signal conversation",
  );
}
