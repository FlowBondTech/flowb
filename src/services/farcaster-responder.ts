/**
 * Farcaster Responder Service
 * Handles mentions of @flowb and replies with relevant info.
 * Rate limit: 1 reply per user per hour.
 */

const NEYNAR_API = "https://api.neynar.com/v2/farcaster";
const FLOWB_FC_APP_URL = process.env.FLOWB_FC_APP_URL || "https://flowb-farcaster.netlify.app";

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

/** Detect intent from mention text */
function detectIntent(text: string): "events_tonight" | "free_events" | "leaderboard" | "whos_going" | "generic" {
  const lower = text.toLowerCase();
  if (/tonight|happening\s*(now|tonight)|what.?s\s*(up|on|happening)/.test(lower)) return "events_tonight";
  if (/free\s*event|no\s*cost|free\s*things/.test(lower)) return "free_events";
  if (/leaderboard|top\s*crew|ranking|scoreboard/.test(lower)) return "leaderboard";
  if (/who.?s\s*going|anyone\s*going/.test(lower)) return "whos_going";
  return "generic";
}

/** Get tonight's events from Supabase discovered_events */
async function getTonightEvents(cfg: SbConfig): Promise<{title: string; venue?: string; time?: string}[]> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  try {
    const res = await fetch(
      `${cfg.supabaseUrl}/rest/v1/flowb_events?starts_at=gte.${todayStart.toISOString()}&starts_at=lte.${todayEnd.toISOString()}&order=starts_at.asc&limit=5&select=title,venue_name,starts_at`,
      {
        headers: {
          apikey: cfg.supabaseKey,
          Authorization: `Bearer ${cfg.supabaseKey}`,
        },
      },
    );
    if (!res.ok) return [];
    const events = await res.json();
    return (events || []).map((e: any) => ({
      title: e.title,
      venue: e.venue_name,
      time: e.starts_at ? new Date(e.starts_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : undefined,
    }));
  } catch { return []; }
}

/** Get top crews by points */
async function getTopCrews(cfg: SbConfig): Promise<{name: string; emoji: string; totalPoints: number}[]> {
  try {
    // Get all groups with members and sum their points
    const res = await fetch(
      `${cfg.supabaseUrl}/rest/v1/flowb_groups?is_public=eq.true&select=id,name,emoji&limit=20`,
      {
        headers: {
          apikey: cfg.supabaseKey,
          Authorization: `Bearer ${cfg.supabaseKey}`,
        },
      },
    );
    if (!res.ok) return [];
    const crews = await res.json();

    const ranked: {name: string; emoji: string; totalPoints: number}[] = [];
    for (const crew of (crews || []).slice(0, 10)) {
      const membersRes = await fetch(
        `${cfg.supabaseUrl}/rest/v1/flowb_group_members?group_id=eq.${crew.id}&select=user_id`,
        {
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: `Bearer ${cfg.supabaseKey}`,
          },
        },
      );
      if (!membersRes.ok) continue;
      const members = await membersRes.json();
      if (!members?.length) continue;

      const userIds = members.map((m: any) => m.user_id);
      const pointsRes = await fetch(
        `${cfg.supabaseUrl}/rest/v1/flowb_user_points?user_id=in.(${userIds.join(",")})&select=total_points`,
        {
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: `Bearer ${cfg.supabaseKey}`,
          },
        },
      );
      if (!pointsRes.ok) continue;
      const points = await pointsRes.json();
      const total = (points || []).reduce((sum: number, p: any) => sum + (p.total_points || 0), 0);
      ranked.push({ name: crew.name, emoji: crew.emoji, totalPoints: total });
    }

    return ranked.sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 5);
  } catch { return []; }
}

/** Handle a mention of @flowb */
export async function handleMention(event: MentionEvent, cfg: SbConfig): Promise<void> {
  // Rate limit check
  const lastReply = replyRateLimit.get(event.authorFid);
  if (lastReply && Date.now() - lastReply < RATE_LIMIT_MS) {
    console.log(`[fc-responder] Rate limited: fid=${event.authorFid}`);
    return;
  }

  const intent = detectIntent(event.text);
  let replyText: string;

  switch (intent) {
    case "events_tonight": {
      const events = await getTonightEvents(cfg);
      if (events.length) {
        const list = events.map(e => `- ${e.title}${e.time ? ` (${e.time})` : ""}${e.venue ? ` at ${e.venue}` : ""}`).join("\n");
        replyText = `Here's what's happening tonight:\n\n${list}\n\nSee all events on FlowB!`;
      } else {
        replyText = "I don't have tonight's events loaded yet. Check FlowB for the latest!";
      }
      break;
    }

    case "free_events": {
      // Query free events
      try {
        const res = await fetch(
          `${cfg.supabaseUrl}/rest/v1/flowb_events?is_free=eq.true&order=starts_at.asc&limit=5&select=title,venue_name,starts_at`,
          {
            headers: { apikey: cfg.supabaseKey, Authorization: `Bearer ${cfg.supabaseKey}` },
          },
        );
        const events = res.ok ? await res.json() : [];
        if (events?.length) {
          const list = events.map((e: any) => `- ${e.title}${e.venue_name ? ` at ${e.venue_name}` : ""}`).join("\n");
          replyText = `Free events at EthDenver:\n\n${list}\n\nMore on FlowB!`;
        } else {
          replyText = "Check FlowB for free events at EthDenver!";
        }
      } catch {
        replyText = "Check FlowB for free events at EthDenver!";
      }
      break;
    }

    case "leaderboard": {
      const crews = await getTopCrews(cfg);
      if (crews.length) {
        const list = crews.map((c, i) => `${i + 1}. ${c.emoji} ${c.name} - ${c.totalPoints} pts`).join("\n");
        replyText = `Top crews at EthDenver:\n\n${list}\n\nJoin a crew on FlowB!`;
      } else {
        replyText = "Crews are just getting started! Join one on FlowB and start earning points.";
      }
      break;
    }

    case "whos_going": {
      replyText = "Check who from your crew is going to events on FlowB! Connect with friends and never miss a vibe.";
      break;
    }

    default: {
      replyText = "Hey! I'm FlowB - your EthDenver companion. Ask me about events tonight, free events, or the crew leaderboard. Or just open the app!";
      break;
    }
  }

  const sent = await replyCast(replyText, event.castHash);
  if (sent) {
    replyRateLimit.set(event.authorFid, Date.now());
    console.log(`[fc-responder] Replied to fid=${event.authorFid}: ${intent}`);
  }
}
