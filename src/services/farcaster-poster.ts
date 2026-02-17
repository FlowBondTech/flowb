/**
 * FlowB Farcaster Poster Service
 * Autonomous posting: event cards, daily digests, crew announcements, leaderboard highlights
 */

const FLOWB_FC_APP_URL = process.env.FLOWB_FC_APP_URL || "https://flowb-farcaster.netlify.app";
const NEYNAR_API = "https://api.neynar.com/v2/farcaster";

interface CastQueue {
  events: { title: string; date: string; venue: string; isFree: boolean; url: string; sourceId: string }[];
  lastPosted: number;
}

const castQueue: CastQueue = { events: [], lastPosted: 0 };

/** Publish a cast to Farcaster via Neynar */
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

/** Post a single event card to Farcaster */
export async function postEventCard(event: { title: string; date?: string; venue?: string; isFree?: boolean; url?: string }): Promise<boolean> {
  const lines = [
    `${event.title}`,
    event.date ? `${event.date}` : null,
    event.venue ? `at ${event.venue}` : null,
    event.isFree ? "Free" : null,
    "",
    `RSVP in FlowB`,
  ].filter(Boolean);

  const embeds = [{ url: FLOWB_FC_APP_URL }];
  return publishCast(lines.join("\n"), embeds);
}

/** Post daily morning digest */
export async function postDailyDigest(eventCount: number, topEvents: { title: string; time?: string }[]): Promise<boolean> {
  const lines = [
    `Good morning EthDenver! ${eventCount} events today.`,
    "",
    ...topEvents.slice(0, 5).map((e, i) => `${i + 1}. ${e.title}${e.time ? ` (${e.time})` : ""}`),
    "",
    "Open FlowB to see them all",
  ];
  return publishCast(lines.join("\n"), [{ url: FLOWB_FC_APP_URL }]);
}

/** Post evening highlights */
export async function postEveningHighlight(events: { title: string; venue?: string }[]): Promise<boolean> {
  const lines = [
    "Tonight's picks:",
    "",
    ...events.slice(0, 3).map(e => `- ${e.title}${e.venue ? ` at ${e.venue}` : ""}`),
    "",
    "Who's going?",
  ];
  return publishCast(lines.join("\n"), [{ url: FLOWB_FC_APP_URL }]);
}

/** Announce a new public crew */
export async function announceNewPublicCrew(crewName: string, crewEmoji: string, joinCode: string): Promise<boolean> {
  const text = `${crewEmoji} New crew alert! "${crewName}" is open to join at EthDenver. Jump in on FlowB!`;
  return publishCast(text, [{ url: `${FLOWB_FC_APP_URL}?crew=${joinCode}` }]);
}

/** Post leaderboard highlight */
export async function postLeaderboardHighlight(topCrews: { name: string; emoji: string; points: number }[]): Promise<boolean> {
  const lines = [
    "Top crews this week at EthDenver:",
    "",
    ...topCrews.slice(0, 3).map((c, i) => {
      const medal = i === 0 ? "1st" : i === 1 ? "2nd" : "3rd";
      return `${medal} ${c.emoji} ${c.name} - ${c.points} pts`;
    }),
    "",
    "Join a crew on FlowB!",
  ];
  return publishCast(lines.join("\n"), [{ url: FLOWB_FC_APP_URL }]);
}

/** Post promo cast */
export async function postPromo(): Promise<boolean> {
  const text = "Have you joined the flow with your crew yet? Know where your friends are at EthDenver. Try FlowB!";
  return publishCast(text, [{ url: FLOWB_FC_APP_URL }]);
}

/** Post new event alert */
export async function postNewEventAlert(title: string, date?: string, venue?: string): Promise<boolean> {
  const parts = [`New event just dropped! ${title}`];
  if (date) parts.push(`on ${date}`);
  if (venue) parts.push(`at ${venue}`);
  return publishCast(parts.join(" "), [{ url: FLOWB_FC_APP_URL }]);
}

/** Process the event queue - post next unposted event. Called on interval. */
export async function processEventQueue(supabaseUrl: string, supabaseKey: string): Promise<void> {
  try {
    // Find next unposted event
    const res = await fetch(
      `${supabaseUrl}/rest/v1/flowb_events?posted_to_farcaster=eq.false&order=first_seen.asc&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      },
    );
    if (!res.ok) return;
    const events = await res.json();
    if (!events?.length) return;

    const event = events[0];
    const dateStr = event.starts_at
      ? new Date(event.starts_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
      : undefined;

    const posted = await postEventCard({
      title: event.title,
      date: dateStr,
      venue: event.venue_name,
      isFree: event.is_free,
      url: event.url,
    });

    if (posted) {
      // Mark as posted
      await fetch(
        `${supabaseUrl}/rest/v1/flowb_events?id=eq.${event.id}`,
        {
          method: "PATCH",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ posted_to_farcaster: true, posted_at: new Date().toISOString() }),
        },
      );
    }
  } catch (err) {
    console.error("[fc-poster] Queue processing error:", err);
  }
}
