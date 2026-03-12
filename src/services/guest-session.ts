/**
 * Guest session management — allows unauthenticated users to join crews
 * before creating an account, then convert to a full user.
 */
import { sbFetch, sbPost, sbDelete, type SbConfig } from "../utils/supabase.js";
import crypto from "crypto";

/** Create a guest session with optional crew join */
export async function createGuestSession(
  cfg: SbConfig,
  joinCode?: string,
): Promise<{ guestToken: string; expiresAt: string; crew: any | null }> {
  const guestToken = `guest_${crypto.randomBytes(16).toString("hex")}`;
  const expiresAt = new Date(Date.now() + 24 * 3600_000).toISOString();

  let crew: any = null;
  if (joinCode) {
    crew = await joinCrewAsGuest(cfg, guestToken, joinCode);
  }

  return { guestToken, expiresAt, crew };
}

/** Alias for backwards compat */
export function createGuestToken(): string {
  return `guest_${crypto.randomBytes(16).toString("hex")}`;
}

/** Look up a guest session — returns basic info if token looks valid */
export async function getGuestSession(
  _cfg: SbConfig,
  guestToken: string,
): Promise<{ guestToken: string } | null> {
  // Guest tokens are stateless — just validate format
  if (!guestToken || !guestToken.startsWith("guest_")) return null;
  return { guestToken };
}

/** Join a crew as a guest (stores in flowb_guest_memberships) */
export async function joinCrewAsGuest(
  cfg: SbConfig,
  guestToken: string,
  joinCode: string,
): Promise<any | null> {
  const crews = await sbFetch<any[]>(
    cfg,
    `flowb_groups?join_code=eq.${encodeURIComponent(joinCode)}&select=id,name,emoji,join_code,join_mode&limit=1`,
  );
  if (!crews?.length) return null;

  const crew = crews[0];
  if (crew.join_mode === "closed") return null;

  try {
    await sbPost(cfg, "flowb_guest_memberships?on_conflict=guest_token,group_id", {
      guest_token: guestToken,
      group_id: crew.id,
    }, "return=minimal,resolution=merge-duplicates");
  } catch {
    // Table may not exist yet
  }

  return { id: crew.id, name: crew.name, emoji: crew.emoji, join_code: crew.join_code };
}

/** Convert a guest to a real user — transfer any guest crew memberships */
export async function convertGuestToUser(
  cfg: SbConfig,
  guestToken: string,
  userId: string,
  awardPoints: (uid: string, plat: string, action: string) => Promise<void>,
): Promise<{ crewsTransferred: number; crewsJoined: number; pointsAwarded: number }> {
  let crewsTransferred = 0;

  try {
    const memberships = await sbFetch<any[]>(
      cfg,
      `flowb_guest_memberships?guest_token=eq.${encodeURIComponent(guestToken)}&select=group_id`,
    );

    for (const m of memberships || []) {
      try {
        await sbPost(cfg, "flowb_group_members?on_conflict=group_id,user_id", {
          group_id: m.group_id,
          user_id: userId,
          role: "member",
        }, "return=minimal,resolution=merge-duplicates");
        crewsTransferred++;
        await awardPoints(userId, "web", "crew_joined");
      } catch {}
    }

    if (memberships?.length) {
      await sbDelete(cfg, "flowb_guest_memberships", {
        guest_token: `eq.${encodeURIComponent(guestToken)}`,
      });
    }
  } catch {
    // Table may not exist
  }

  return { crewsTransferred, crewsJoined: crewsTransferred, pointsAwarded: crewsTransferred * 10 };
}

/** Get crews a guest has joined */
export async function getGuestCrews(
  cfg: SbConfig,
  guestToken: string,
): Promise<any[]> {
  try {
    const memberships = await sbFetch<any[]>(
      cfg,
      `flowb_guest_memberships?guest_token=eq.${encodeURIComponent(guestToken)}&select=group_id,flowb_groups(id,name,emoji,join_code)`,
    );
    return (memberships || [])
      .filter((m: any) => m.flowb_groups)
      .map((m: any) => m.flowb_groups);
  } catch {
    return [];
  }
}

/** Look up a crew by its join code (public info only) */
export async function getCrewByJoinCode(
  cfg: SbConfig,
  code: string,
): Promise<any | null> {
  const crews = await sbFetch<any[]>(
    cfg,
    `flowb_groups?join_code=eq.${encodeURIComponent(code)}&select=id,name,emoji,description,join_code,join_mode,max_members&limit=1`,
  );
  if (!crews?.length) return null;

  const crew = crews[0];
  const members = await sbFetch<any[]>(
    cfg,
    `flowb_group_members?group_id=eq.${crew.id}&select=user_id`,
  );
  crew.member_count = members?.length || 0;

  return crew;
}
