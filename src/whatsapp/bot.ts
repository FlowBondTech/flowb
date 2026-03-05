/**
 * FlowB WhatsApp Bot
 *
 * Webhook handler for WhatsApp Cloud API. Registers GET (verification)
 * and POST (message handling) routes on the Fastify instance.
 *
 * Uses FlowBCore directly for event discovery and action routing,
 * mirroring the Telegram bot pattern.
 */

import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { FlowBCore } from "../core/flowb.js";
import type { EventResult } from "../core/types.js";
import type { IncomingMessage, WebhookPayload, WaSession } from "./types.js";
import * as wa from "./api.js";
import {
  formatWelcome,
  formatMenu,
  menuButtons,
  menuListSections,
  formatEventList,
  eventListSections,
  formatEventDetail,
  eventDetailButtons,
  formatPoints,
  pointsButtons,
  formatFlowMenu,
  flowMenuButtons,
  formatCrewList,
  crewListSections,
  formatCrewDetail,
  crewDetailButtons,
  formatSchedule,
  formatCheckinConfirm,
  formatShareInvite,
  formatNoEvents,
} from "./messages.js";
import { log, fireAndForget } from "../utils/logger.js";
import { sbFetch } from "../utils/supabase.js";

const SESSION_TTL_MS = 30 * 60 * 1000;
const sessions = new Map<string, WaSession>();

function getOrCreateSession(phone: string): WaSession {
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

export function registerWhatsAppWebhook(app: FastifyInstance, core: FlowBCore) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    log.info("[wa-bot]", "WhatsApp not configured, skipping webhook registration");
    return;
  }

  // Fastify needs raw body for HMAC verification
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (req, body, done) => {
      // Store raw body for signature verification
      (req as any).rawBody = body;
      try {
        done(null, JSON.parse(body.toString()));
      } catch (err: any) {
        done(err, undefined);
      }
    },
  );

  // GET: Meta webhook verification challenge
  app.get<{ Querystring: Record<string, string> }>(
    "/api/v1/whatsapp/webhook",
    async (request, reply) => {
      const mode = request.query["hub.mode"];
      const token = request.query["hub.verify_token"];
      const challenge = request.query["hub.challenge"];

      if (mode === "subscribe" && token === verifyToken) {
        log.info("[wa-bot]", "Webhook verified");
        return reply.status(200).send(challenge);
      }

      log.error("[wa-bot]", "Webhook verification failed");
      return reply.status(403).send("Forbidden");
    },
  );

  // POST: Incoming messages
  app.post(
    "/api/v1/whatsapp/webhook",
    async (request, reply) => {
      // Always return 200 immediately (Meta requires fast response)
      reply.status(200).send("OK");

      // Verify signature if app secret is set
      if (appSecret) {
        const signature = request.headers["x-hub-signature-256"] as string;
        const rawBody = (request as any).rawBody as Buffer;
        if (!verifySignature(rawBody, signature, appSecret)) {
          log.error("[wa-bot]", "Invalid webhook signature");
          return;
        }
      }

      const payload = request.body as WebhookPayload;
      if (payload?.object !== "whatsapp_business_account") return;

      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;
          if (!value?.messages?.length) continue;

          const contact = value.contacts?.[0];
          for (const msg of value.messages) {
            fireAndForget(
              handleMessage(core, msg, contact?.profile?.name),
              "wa message handler",
            );
          }
        }
      }
    },
  );

  log.info("[wa-bot]", "WhatsApp webhook registered at /api/v1/whatsapp/webhook");
}

// ============================================================================
// Signature Verification
// ============================================================================

function verifySignature(rawBody: Buffer, signature: string, appSecret: string): boolean {
  if (!signature) return false;
  const expectedSig = "sha256=" + crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig),
  );
}

// ============================================================================
// Message Handler
// ============================================================================

async function handleMessage(
  core: FlowBCore,
  msg: IncomingMessage,
  profileName?: string,
): Promise<void> {
  const phone = msg.from;
  const userId = `whatsapp_${phone}`;

  // Mark as read
  fireAndForget(wa.markAsRead(msg.id), "mark read");

  // Track conversation window
  trackConversation(phone, userId, profileName);

  const session = getOrCreateSession(phone);
  if (profileName) session.displayName = profileName;

  // Extract command from message
  const command = extractCommand(msg);
  if (!command) return;

  try {
    await routeCommand(core, phone, userId, session, command);
  } catch (err: any) {
    log.error("[wa-bot]", `Error handling message from ${phone}: ${err.message}`);
    await wa.sendText(phone, "Something went wrong. Try again or type *menu* for options.");
  }
}

function extractCommand(msg: IncomingMessage): string | null {
  if (msg.type === "text" && msg.text?.body) {
    return msg.text.body.trim().toLowerCase();
  }
  if (msg.type === "interactive") {
    if (msg.interactive?.button_reply) return msg.interactive.button_reply.id;
    if (msg.interactive?.list_reply) return msg.interactive.list_reply.id;
  }
  if (msg.type === "button" && msg.button?.payload) {
    return msg.button.payload;
  }
  return null;
}

// ============================================================================
// Command Router
// ============================================================================

async function routeCommand(
  core: FlowBCore,
  phone: string,
  userId: string,
  session: WaSession,
  command: string,
): Promise<void> {
  // Normalize text commands
  const cmd = command.toLowerCase().trim();

  // Welcome / onboarding
  if (["hi", "hey", "hello", "start", "hola"].includes(cmd) || !sessions.has(phone)) {
    return handleWelcome(core, phone, userId, session);
  }

  // Menu
  if (cmd === "menu" || cmd === "cmd:menu") {
    return handleMenu(phone);
  }

  // Events
  if (cmd === "events" || cmd === "cmd:events") {
    return handleEvents(core, phone, userId, session);
  }

  // Event detail (from list selection)
  if (cmd.startsWith("evt:")) {
    const idx = parseInt(cmd.replace("evt:", ""), 10);
    return handleEventDetail(core, phone, userId, session, idx);
  }

  // Event navigation
  if (cmd === "evt:next") {
    session.cardIndex = Math.min(session.cardIndex + 1, session.filteredEvents.length - 1);
    return handleEventDetail(core, phone, userId, session, session.cardIndex);
  }
  if (cmd === "evt:prev") {
    session.cardIndex = Math.max(session.cardIndex - 1, 0);
    return handleEventDetail(core, phone, userId, session, session.cardIndex);
  }

  // RSVP
  if (cmd.startsWith("rsvp:")) {
    const eventId = cmd.replace("rsvp:", "");
    return handleRsvp(core, phone, userId, eventId);
  }

  // Points
  if (cmd === "points" || cmd === "cmd:points") {
    return handlePoints(core, phone, userId);
  }

  // Flow (friends/crews)
  if (cmd === "flow" || cmd === "cmd:flow") {
    return handleFlowMenu(phone);
  }

  // Crews
  if (cmd === "crews" || cmd === "cmd:crews") {
    return handleCrews(core, phone, userId, session);
  }

  // Crew detail
  if (cmd.startsWith("crew:")) {
    const crewId = cmd.replace("crew:", "");
    return handleCrewDetail(core, phone, userId, crewId);
  }

  // Crew join
  if (cmd.startsWith("join:")) {
    const crewId = cmd.replace("join:", "");
    return handleCrewJoin(core, phone, userId, crewId);
  }

  // Crew leave
  if (cmd.startsWith("leave:")) {
    const crewId = cmd.replace("leave:", "");
    return handleCrewLeave(core, phone, userId, crewId);
  }

  // Check-in
  if (cmd.startsWith("checkin ") || cmd.startsWith("ci ")) {
    const code = cmd.replace(/^(checkin|ci)\s+/, "");
    return handleCheckin(core, phone, userId, code);
  }

  // Share invite
  if (cmd === "share" || cmd === "cmd:share") {
    return handleShare(core, phone, userId);
  }

  // Schedule (upcoming RSVPs)
  if (cmd === "schedule" || cmd === "cmd:schedule") {
    return handleSchedule(core, phone, userId, session);
  }

  // Friends
  if (cmd === "friends" || cmd === "cmd:friends") {
    return handleFriends(core, phone, userId);
  }

  // Who's going
  if (cmd.startsWith("whosgoing:")) {
    const eventId = cmd.replace("whosgoing:", "");
    return handleWhosGoing(core, phone, userId, eventId);
  }

  // Deep link join codes (e.g., "join f_abc123")
  if (cmd.startsWith("join f_") || cmd.startsWith("join g_")) {
    return handleDeepLinkJoin(core, phone, userId, cmd.replace("join ", ""));
  }

  // Create crew (awaiting name)
  if (session.awaitingCrewName) {
    session.awaitingCrewName = false;
    return handleCrewCreate(core, phone, userId, command);
  }

  if (cmd === "cmd:create_crew") {
    session.awaitingCrewName = true;
    await wa.sendText(phone, "What would you like to name your crew?");
    return;
  }

  // Todos
  if (cmd === "todo" || cmd === "todos" || cmd === "cmd:todo") {
    return handleTodos(phone, userId);
  }
  if (cmd.startsWith("todo add ")) {
    return handleTodoAdd(phone, userId, command.slice(9).trim());
  }

  // Default: show menu hint
  await wa.sendText(
    phone,
    `I didn't catch that. Type *menu* to see what I can do, or try:\n\n` +
    `*events* - Browse events\n` +
    `*points* - Check your points\n` +
    `*flow* - Friends & crews\n` +
    `*schedule* - Your upcoming events`,
  );
}

// ============================================================================
// Command Handlers
// ============================================================================

async function handleWelcome(
  core: FlowBCore,
  phone: string,
  userId: string,
  session: WaSession,
): Promise<void> {
  fireAndForget(core.awardPoints(userId, "whatsapp", "first_message"), "award points");

  const name = session.displayName || "there";
  await wa.sendButtons(
    phone,
    formatWelcome(name),
    menuButtons(),
    "FlowB",
  );
}

async function handleMenu(phone: string): Promise<void> {
  await wa.sendList(
    phone,
    formatMenu(),
    "Options",
    menuListSections(),
    "FlowB Menu",
  );
}

async function handleEvents(
  core: FlowBCore,
  phone: string,
  userId: string,
  session: WaSession,
): Promise<void> {
  const result = await core.discoverEvents({
    action: "events",
    user_id: userId,
    platform: "app",
  });

  // Parse events from result
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

  if (!events.length) {
    await wa.sendText(phone, formatNoEvents());
    return;
  }

  // Show first 10 events as a list
  const rows = eventListSections(events.slice(0, 10));
  await wa.sendList(
    phone,
    formatEventList(events.length),
    "Browse Events",
    rows,
    "Events",
  );
}

async function handleEventDetail(
  core: FlowBCore,
  phone: string,
  userId: string,
  session: WaSession,
  index: number,
): Promise<void> {
  const event = session.filteredEvents[index];
  if (!event) {
    await wa.sendText(phone, "Event not found. Type *events* to browse.");
    return;
  }

  session.cardIndex = index;

  const buttons = eventDetailButtons(event.id, index, session.filteredEvents.length);
  await wa.sendButtons(
    phone,
    formatEventDetail(event),
    buttons,
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

    await wa.sendButtons(
      phone,
      "You're going! We'll remind you before it starts.",
      [
        { id: "cmd:schedule", title: "My Schedule" },
        { id: `whosgoing:${eventId}`, title: "Who's Going" },
        { id: "cmd:events", title: "More Events" },
      ],
    );

    fireAndForget(core.awardPoints(userId, "whatsapp", "rsvp"), "award rsvp points");
  } catch (err: any) {
    await wa.sendText(phone, `Couldn't RSVP: ${err.message}`);
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

    await wa.sendButtons(
      phone,
      formatPoints(points, streak),
      pointsButtons(),
    );
  } catch {
    await wa.sendText(phone, "Couldn't load points. Try again later.");
  }
}

async function handleFlowMenu(phone: string): Promise<void> {
  await wa.sendButtons(
    phone,
    formatFlowMenu(),
    flowMenuButtons(),
  );
}

async function handleCrews(
  core: FlowBCore,
  phone: string,
  userId: string,
  session: WaSession,
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

    if (!crews.length) {
      await wa.sendButtons(
        phone,
        "You're not in any crews yet. Join one or create your own!",
        [
          { id: "cmd:create_crew", title: "Create Crew" },
          { id: "cmd:events", title: "Browse Events" },
          { id: "cmd:menu", title: "Menu" },
        ],
      );
      return;
    }

    const sections = crewListSections(crews);
    await wa.sendList(
      phone,
      formatCrewList(crews.length),
      "View Crews",
      sections,
    );
  } catch {
    await wa.sendText(phone, "Couldn't load crews. Try again later.");
  }
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
    const buttons = crewDetailButtons(crewId, crew.is_member);

    await wa.sendButtons(
      phone,
      formatCrewDetail(crew),
      buttons,
    );
  } catch {
    await wa.sendText(phone, "Couldn't load crew details.");
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
    await wa.sendText(phone, "You joined the crew! Type *crews* to see your crews.");
    fireAndForget(core.awardPoints(userId, "whatsapp", "join_crew"), "award points");
  } catch (err: any) {
    await wa.sendText(phone, `Couldn't join crew: ${err.message}`);
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
    await wa.sendText(phone, "You left the crew.");
  } catch (err: any) {
    await wa.sendText(phone, `Couldn't leave crew: ${err.message}`);
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

    await wa.sendText(
      phone,
      `Crew *${name}* created!${shareUrl ? `\n\nShare: ${shareUrl}` : ""}\n\nType *crews* to manage your crews.`,
    );
    fireAndForget(core.awardPoints(userId, "whatsapp", "create_crew"), "award points");
  } catch (err: any) {
    await wa.sendText(phone, `Couldn't create crew: ${err.message}`);
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
    await wa.sendText(phone, formatCheckinConfirm(parsed.venue || code, parsed.points || 5));
    fireAndForget(core.awardPoints(userId, "whatsapp", "checkin"), "award points");
  } catch (err: any) {
    await wa.sendText(phone, `Check-in failed: ${err.message}`);
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

    await wa.sendText(phone, formatShareInvite(link));
  } catch {
    await wa.sendText(phone, `Share FlowB with friends: flowb.me`);
  }
}

async function handleSchedule(
  core: FlowBCore,
  phone: string,
  userId: string,
  session: WaSession,
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

    if (!rsvps.length) {
      await wa.sendButtons(
        phone,
        "No upcoming events on your schedule yet!",
        [
          { id: "cmd:events", title: "Browse Events" },
          { id: "cmd:menu", title: "Menu" },
        ],
      );
      return;
    }

    await wa.sendText(phone, formatSchedule(rsvps));
  } catch {
    await wa.sendText(phone, "Couldn't load your schedule. Try again later.");
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

    if (!friends.length) {
      await wa.sendButtons(
        phone,
        "No friends yet! Share your invite link to connect with people.",
        [
          { id: "cmd:share", title: "Share Invite" },
          { id: "cmd:menu", title: "Menu" },
        ],
      );
      return;
    }

    const list = friends.slice(0, 10).map((f: any, i: number) =>
      `${i + 1}. ${f.display_name || f.friend_id}`
    ).join("\n");

    await wa.sendText(phone, `*Your Friends* (${friends.length})\n\n${list}`);
  } catch {
    await wa.sendText(phone, "Couldn't load friends list.");
  }
}

async function handleWhosGoing(
  core: FlowBCore,
  phone: string,
  userId: string,
  eventId: string,
): Promise<void> {
  try {
    const result = await core.execute("whos_going", {
      action: "whos_going",
      user_id: userId,
      event_id: eventId,
    });

    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    const attendees = parsed.attendees || parsed || [];

    if (!attendees.length) {
      await wa.sendText(phone, "No one you know is going yet. Share the event!");
      return;
    }

    const list = attendees.slice(0, 10).map((a: any) =>
      `- ${a.display_name || a.user_id}`
    ).join("\n");

    await wa.sendText(phone, `*Who's Going*\n\n${list}`);
  } catch {
    await wa.sendText(phone, "Couldn't load attendees.");
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
      // Friend invite
      await core.execute("accept_invite", {
        action: "accept_invite",
        user_id: userId,
        referral_code: code.replace("f_", ""),
      });
      await wa.sendText(phone, "Friend request accepted! You're now connected.");
      fireAndForget(core.awardPoints(userId, "whatsapp", "accept_invite"), "award points");
    } else if (code.startsWith("g_")) {
      // Crew join
      await core.execute("join_group_by_code", {
        action: "join_group_by_code",
        user_id: userId,
        referral_code: code.replace("g_", ""),
      });
      await wa.sendText(phone, "You joined the crew! Type *crews* to see your crews.");
      fireAndForget(core.awardPoints(userId, "whatsapp", "join_crew"), "award points");
    }
  } catch (err: any) {
    await wa.sendText(phone, `Couldn't process invite: ${err.message}`);
  }
}

// ============================================================================
// Todo Handlers
// ============================================================================

async function handleTodos(phone: string, userId: string): Promise<void> {
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_KEY;
  if (!sbUrl || !sbKey) {
    await wa.sendText(phone, "Todos not available.");
    return;
  }

  try {
    const res = await fetch(
      `${sbUrl}/rest/v1/flowb_todos?status=eq.open&order=priority.desc,created_at.desc&limit=15&select=id,title,priority,category`,
      { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } },
    );
    const todos: any[] = res.ok ? await res.json() : [];

    if (!todos.length) {
      await wa.sendText(phone, "No open todos! All clear.");
      return;
    }

    const priorityIcon: Record<string, string> = { critical: "\ud83d\udea8", high: "\ud83d\udd34", medium: "\ud83d\udfe1", low: "\u26aa" };
    const lines = [`*Open Todos* (${todos.length})`, ""];
    for (let i = 0; i < todos.length; i++) {
      const t = todos[i];
      const icon = priorityIcon[t.priority] || "\u26aa";
      const cat = t.category && t.category !== "general" ? ` [${t.category}]` : "";
      lines.push(`${i + 1}. ${icon} ${t.title}${cat}`);
    }
    lines.push("");
    lines.push("Type *todo add <title>* to add a new todo.");

    await wa.sendText(phone, lines.join("\n"));
  } catch {
    await wa.sendText(phone, "Error loading todos.");
  }
}

async function handleTodoAdd(phone: string, userId: string, title: string): Promise<void> {
  if (!title) {
    await wa.sendText(phone, "Usage: *todo add Fix the login bug*");
    return;
  }

  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_KEY;
  if (!sbUrl || !sbKey) {
    await wa.sendText(phone, "Todos not available.");
    return;
  }

  try {
    const res = await fetch(`${sbUrl}/rest/v1/flowb_todos`, {
      method: "POST",
      headers: {
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        title,
        status: "open",
        priority: "medium",
        category: "general",
        created_by: userId,
        source: "bot",
      }),
    });

    if (res.ok) {
      const { alertAdmins: alert } = await import("../services/admin-alerts.js");
      alert(`New TODO from WhatsApp user: ${title}`, "info");
      await wa.sendText(phone, `Todo added: *${title}*`);
    } else {
      await wa.sendText(phone, "Failed to create todo.");
    }
  } catch {
    await wa.sendText(phone, "Error creating todo.");
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
    fetch(`${sbUrl}/rest/v1/flowb_wa_conversations`, {
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
    "track wa conversation",
  );
}
