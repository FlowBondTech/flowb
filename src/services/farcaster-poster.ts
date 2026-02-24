/**
 * FlowB Farcaster Poster Service
 * Posts crew-focused content about staying in flow with your people.
 * Rotates through different vibes throughout the day.
 */

const FLOWB_MINIAPP_URL = "https://farcaster.xyz/miniapps/oCHuaUqL5dRT/flowb";
const FLOWB_LINK = "https://flowb.me";
const FLOWB_CREW_IMAGE = "https://flowb.me/crew.png";
const NEYNAR_API = "https://api.neynar.com/v2/farcaster";

// ============================================================================
// Crew-focused post templates
// ============================================================================

interface PostSlot {
  id: string;
  label: string;
  hourStart: number;
  hourEnd: number;
  posts: string[];
}

const POST_SLOTS: PostSlot[] = [
  {
    id: "morning_flow",
    label: "Morning Flow",
    hourStart: 9,
    hourEnd: 9,
    posts: [
      `at an event and want to stay in the flow with your friends?\n\nFlowB keeps your crew connected — before, during, and after.\n\nno more lost group chats or missed meetups.\n\n${FLOWB_LINK}`,
      `your crew is scattered across the venue. who's where? what's next?\n\nFlowB keeps everyone synced so you never miss the move.\n\n${FLOWB_LINK}`,
      `the best events aren't about the talks — they're about the people you're with.\n\nFlowB helps you flow with your crew, not just through the schedule.\n\n${FLOWB_LINK}`,
    ],
  },
  {
    id: "midday_crew",
    label: "Midday Crew",
    hourStart: 13,
    hourEnd: 13,
    posts: [
      `"where is everyone?"\n"which talk are you at?"\n"meet at the food trucks?"\n\nstop scrolling group chats. start flowing.\n\n${FLOWB_LINK}`,
      `you met 20 people today. how many will you actually connect with after?\n\nFlowB makes sure the vibe doesn't end when the event does.\n\n${FLOWB_LINK}`,
      `events are better with your crew.\n\ncoordinate meetups, share discoveries, stay in sync — all in one place.\n\n${FLOWB_LINK}`,
    ],
  },
  {
    id: "afternoon_connect",
    label: "Afternoon Connect",
    hourStart: 16,
    hourEnd: 16,
    posts: [
      `the afterparty is where the real connections happen.\n\nbut only if your crew knows where to go.\n\nFlowB — flow together, not apart.\n\n${FLOWB_LINK}`,
      `conference over. friendships just getting started.\n\nFlowB keeps your crew connected long after the badges come off.\n\n${FLOWB_LINK}`,
      `at every event there's that moment: "we should all hang out after this"\n\nFlowB makes "after this" actually happen.\n\n${FLOWB_LINK}`,
    ],
  },
  {
    id: "evening_vibes",
    label: "Evening Vibes",
    hourStart: 19,
    hourEnd: 19,
    posts: [
      `tonight's plan? ask your crew.\n\nFlowB keeps the squad moving together — no more "wait where did everyone go?"\n\n${FLOWB_LINK}`,
      `the event might end at 6pm but the flow doesn't stop.\n\nkeep your crew connected through the night.\n\n${FLOWB_LINK}`,
      `real talk: the best part of any event is the people.\n\nFlowB helps you find them, flow with them, and stay connected after.\n\n${FLOWB_LINK}`,
    ],
  },
];

// ============================================================================
// Core: Publish Cast
// ============================================================================

async function publishCast(text: string, embeds?: { url: string }[]): Promise<boolean> {
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
        embeds: embeds || [],
      }),
    });
    if (!res.ok) {
      console.error(`[fc-poster] Cast failed: ${res.status} ${await res.text()}`);
      return false;
    }
    console.log(`[fc-poster] Cast published: ${text.slice(0, 60)}...`);
    return true;
  } catch (err) {
    console.error("[fc-poster] Cast error:", err);
    return false;
  }
}

// ============================================================================
// Helpers
// ============================================================================

function getMSTHour(): number {
  const now = new Date();
  return parseInt(
    now.toLocaleString("en-US", { timeZone: "America/Denver", hour12: false, hour: "2-digit" }),
    10,
  );
}

/** Pick a post deterministically based on date so we don't repeat within a day */
function pickPost(posts: string[]): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24),
  );
  return posts[dayOfYear % posts.length];
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Post a crew-focused cast for the current time slot.
 * Called from the scheduler every 5 minutes — only fires at slot hours.
 */
export async function postCrewCast(): Promise<{ posted: boolean; slot?: string }> {
  const mstHour = getMSTHour();
  const slot = POST_SLOTS.find((s) => mstHour >= s.hourStart && mstHour <= s.hourEnd);
  if (!slot) {
    return { posted: false };
  }

  const text = pickPost(slot.posts);
  const posted = await publishCast(text, [
    { url: FLOWB_CREW_IMAGE },
    { url: FLOWB_MINIAPP_URL },
  ]);
  return { posted, slot: slot.id };
}

/**
 * Process the posting queue. Simplified from the event-based version —
 * no longer needs Supabase since posts are template-based.
 */
export async function processEventQueue(_supabaseUrl?: string, _supabaseKey?: string): Promise<void> {
  try {
    const result = await postCrewCast();
    if (result.posted) {
      console.log(`[fc-poster] Posted crew cast: ${result.slot}`);
    }
  } catch (err) {
    console.error("[fc-poster] Queue processing error:", err);
  }
}
