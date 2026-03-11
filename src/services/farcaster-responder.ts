/**
 * Farcaster Responder Service
 * Handles mentions of @flowb and replies with relevant info.
 * Rate limit: 1 reply per user per hour.
 *
 * Now routes through handleChat() for tool-augmented responses
 * (same quality as Telegram and web).
 */

import { handleChat, type ChatMessage } from "./ai-chat.js";

const NEYNAR_API = "https://api.neynar.com/v2/farcaster";
const FLOWB_FC_APP_URL = process.env.FLOWB_FC_APP_URL || "https://farcaster.xyz/miniapps/oCHuaUqL5dRT/flowb";

// In-memory rate limit: fid -> last reply timestamp
const replyRateLimit = new Map<number, number>();
const RATE_LIMIT_MS = 60 * 60 * 1000; // 1 hour

interface MentionEvent {
  authorFid: number;
  authorUsername: string;
  text: string;
  castHash: string;
}

interface SbConfig { supabaseUrl: string; supabaseKey: string }

/** Publish a reply cast */
async function replyCast(text: string, parentHash: string): Promise<boolean> {
  const signerUuid = process.env.NEYNAR_AGENT_TOKEN;
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!signerUuid || !apiKey) return false;

  try {
    const res = await fetch(`${NEYNAR_API}/cast`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        signer_uuid: signerUuid,
        text,
        parent: parentHash,
        embeds: [{ url: FLOWB_FC_APP_URL }],
      }),
    });
    if (!res.ok) {
      console.error(`[fc-responder] Reply failed: ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[fc-responder] Reply error:", err);
    return false;
  }
}

/**
 * Route mention through the tool-augmented AI chat service.
 * Falls back to a generic response if xAI key is missing.
 */
async function chatResponse(text: string, fid: number, username: string, cfg: SbConfig): Promise<string> {
  const xaiKey = process.env.XAI_API_KEY;
  if (!xaiKey) {
    return "Hey! I'm FlowB -- helping you stay in the flow. Ask me about events tonight, free events, or the crew leaderboard. Or just open the app!";
  }

  // Strip @flowb mention from the text
  const cleaned = text.replace(/@flowb\b/gi, "").trim() || "hi";

  const messages: ChatMessage[] = [
    { role: "user", content: cleaned },
  ];

  try {
    const result = await handleChat(messages, {
      sb: cfg,
      xaiKey,
      user: {
        userId: `farcaster_${fid}`,
        platform: "farcaster",
        displayName: username,
      },
      platform: "farcaster",
    });

    // Add persona attribution for FiFlow responses
    let reply = result.content || "Check FlowB for the latest!";
    if (result.persona?.id === "fiflow") {
      reply = `[${result.persona.name}] ${reply}`;
    }
    // Truncate to Farcaster's 1024 char limit
    if (reply.length > 1000) {
      reply = reply.slice(0, 997) + "...";
    }
    return reply;
  } catch (err: any) {
    console.error("[fc-responder] Chat error:", err.message);
    return "Hey! I'm FlowB -- helping you stay in the flow. Check the app for events and more!";
  }
}

/** Handle a mention of @flowb */
export async function handleMention(event: MentionEvent, cfg: SbConfig): Promise<void> {
  // Rate limit check
  const lastReply = replyRateLimit.get(event.authorFid);
  if (lastReply && Date.now() - lastReply < RATE_LIMIT_MS) {
    console.log(`[fc-responder] Rate limited: fid=${event.authorFid}`);
    return;
  }

  const replyText = await chatResponse(event.text, event.authorFid, event.authorUsername, cfg);

  const sent = await replyCast(replyText, event.castHash);
  if (sent) {
    replyRateLimit.set(event.authorFid, Date.now());
    console.log(`[fc-responder] Replied to fid=${event.authorFid}`);
  }
}
