/**
 * Activity Simulation Cron
 *
 * Gradually registers sim users, creates a crew, joins members,
 * checks in to Casa DeLuz, and sends coordination messages.
 *
 * Runs every 15 minutes during active hours (8am-10pm MST).
 * Each tick advances the simulation by one step.
 *
 * State is persisted in flowb_sim_state (single row) so it
 * survives server restarts.
 */

import { signJwt } from "../server/auth.js";
import { sbFetch, sbPost, sbUpsert, sbPatchRaw } from "../utils/supabase.js";
import { fireAndForget } from "../utils/logger.js";

// ─── Configuration ──────────────────────────────────────────────────────────

const SIM_PREFIX = "sim_";
const CREW_NAME = "Casa Crew";
const CREW_EMOJI = "\u{1F3E0}"; // 🏠
const VENUE_NAME = "Casa DeLuz";
const VENUE_LAT = 39.7392;   // Denver area placeholder
const VENUE_LNG = -104.9903;

/** Simulated user personas */
const SIM_USERS = [
  { id: "sim_luna",    name: "Luna",    bio: "Community builder & event curator" },
  { id: "sim_kai",     name: "Kai",     bio: "Dev exploring the Denver scene" },
  { id: "sim_mira",    name: "Mira",    bio: "Artist & creative connector" },
  { id: "sim_juno",    name: "Juno",    bio: "Music lover, always out & about" },
  { id: "sim_reef",    name: "Reef",    bio: "Wellness advocate & good vibes" },
  { id: "sim_sage",    name: "Sage",    bio: "Foodie exploring new spots" },
];

/** Crew messages for coordination — picked at random */
const COORD_MESSAGES = [
  "Heading to Casa DeLuz soon, anyone around?",
  "Just got here, it's vibing tonight!",
  "Grabbing a table near the back, come find us",
  "Who's coming through later?",
  "The DJ set starts at 9, don't miss it",
  "Saving seats for the crew!",
  "Running 10 min late but on my way",
  "This place is packed, got here just in time",
  "Meet me by the entrance!",
  "What a night, glad the crew's here",
  "Anyone want anything from the bar?",
  "Great spot tonight, good call Luna",
  "The energy here is amazing",
  "Let's do this again next week!",
  "Just checked in, who else is here?",
];

const CHECKIN_STATUSES = ["here", "heading", "here", "here"] as const;

// ─── State Machine ──────────────────────────────────────────────────────────

/**
 * Simulation phases (advance one step per cron tick):
 *
 *   0: register Luna (seed user)
 *   1: Luna creates the crew
 *   2: register Kai
 *   3: Kai joins the crew
 *   4: register Mira
 *   5: Mira joins the crew
 *   6: Luna checks into Casa DeLuz
 *   7: register Juno
 *   8: Juno joins the crew
 *   9: Kai checks into Casa DeLuz + message
 *  10: register Reef
 *  11: Reef joins the crew
 *  12: Mira checks into Casa DeLuz + message
 *  13: register Sage
 *  14: Sage joins the crew
 *  15: Juno checks into Casa DeLuz
 *  16: Luna sends coordination message
 *  17+: ongoing random checkins + messages (loops)
 */

interface SimState {
  step: number;
  crew_id: string | null;
  join_code: string | null;
  registered_users: string[];   // user IDs already registered
  last_run: string;             // ISO timestamp
}

const DEFAULT_STATE: SimState = {
  step: 0,
  crew_id: null,
  join_code: null,
  registered_users: [],
  last_run: "",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

interface SbCfg {
  supabaseUrl: string;
  supabaseKey: string;
}

function tokenFor(userId: string): string {
  return signJwt({ sub: userId, platform: "web" }, 3600);
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function loadState(cfg: SbCfg): Promise<SimState> {
  const rows = await sbFetch<any[]>(cfg, "flowb_sim_state?id=eq.1&limit=1");
  if (rows?.length) {
    return {
      step: rows[0].step ?? 0,
      crew_id: rows[0].crew_id ?? null,
      join_code: rows[0].join_code ?? null,
      registered_users: rows[0].registered_users ?? [],
      last_run: rows[0].last_run ?? "",
    };
  }
  return { ...DEFAULT_STATE };
}

async function saveState(cfg: SbCfg, state: SimState): Promise<void> {
  await sbUpsert(cfg, "flowb_sim_state", {
    id: 1,
    ...state,
    last_run: new Date().toISOString(),
  }, "id");
}

async function registerUser(cfg: SbCfg, user: typeof SIM_USERS[number]): Promise<void> {
  // Upsert session (same as auth passport flow)
  await sbPost(cfg, "flowb_sessions?on_conflict=user_id", {
    user_id: user.id,
    display_name: user.name,
    platform: "web",
    bio: user.bio,
    locale: "en",
    onboarding_complete: true,
  }, "return=minimal");
  console.log(`[activity-sim] Registered user: ${user.name} (${user.id})`);
}

async function callAPI(baseUrl: string, method: string, path: string, token: string, body?: any): Promise<any> {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[activity-sim] API ${method} ${path} failed: ${res.status} ${text}`);
    return null;
  }
  return res.json().catch(() => ({}));
}

// ─── Step Execution ─────────────────────────────────────────────────────────

async function executeStep(cfg: SbCfg, state: SimState, apiBase: string): Promise<SimState> {
  const { step } = state;
  console.log(`[activity-sim] Executing step ${step}`);

  // --- Phase: Register users & build the crew ---

  if (step === 0) {
    // Register Luna (seed user)
    await registerUser(cfg, SIM_USERS[0]);
    state.registered_users.push(SIM_USERS[0].id);
  }

  else if (step === 1) {
    // Luna creates the crew
    const token = tokenFor(SIM_USERS[0].id);
    const result = await callAPI(apiBase, "POST", "/api/v1/flow/crews", token, {
      name: CREW_NAME,
      emoji: CREW_EMOJI,
    });
    if (result?.ok !== false) {
      // Extract crew_id and join_code from response or fetch it
      const crews = await sbFetch<any[]>(cfg,
        `flowb_groups?created_by=eq.${SIM_USERS[0].id}&name=eq.${encodeURIComponent(CREW_NAME)}&order=created_at.desc&limit=1`);
      if (crews?.length) {
        state.crew_id = crews[0].id;
        state.join_code = crews[0].join_code;
        console.log(`[activity-sim] Crew created: ${CREW_NAME} (${state.join_code})`);
      }
    }
  }

  else if (step === 2) {
    await registerUser(cfg, SIM_USERS[1]); // Kai
    state.registered_users.push(SIM_USERS[1].id);
  }

  else if (step === 3) {
    // Kai joins the crew
    if (state.crew_id && state.join_code) {
      const token = tokenFor(SIM_USERS[1].id);
      await callAPI(apiBase, "POST", `/api/v1/flow/crews/${state.crew_id}/join`, token, {
        joinCode: state.join_code,
      });
      console.log(`[activity-sim] Kai joined ${CREW_NAME}`);
    }
  }

  else if (step === 4) {
    await registerUser(cfg, SIM_USERS[2]); // Mira
    state.registered_users.push(SIM_USERS[2].id);
  }

  else if (step === 5) {
    // Mira joins
    if (state.crew_id && state.join_code) {
      const token = tokenFor(SIM_USERS[2].id);
      await callAPI(apiBase, "POST", `/api/v1/flow/crews/${state.crew_id}/join`, token, {
        joinCode: state.join_code,
      });
      console.log(`[activity-sim] Mira joined ${CREW_NAME}`);
    }
  }

  else if (step === 6) {
    // Luna checks into Casa DeLuz
    if (state.crew_id) {
      const token = tokenFor(SIM_USERS[0].id);
      await callAPI(apiBase, "POST", `/api/v1/flow/crews/${state.crew_id}/checkin`, token, {
        venueName: VENUE_NAME,
        status: "here",
        message: "First one here! Setting up for the crew",
        latitude: VENUE_LAT,
        longitude: VENUE_LNG,
      });
      console.log(`[activity-sim] Luna checked into ${VENUE_NAME}`);
    }
  }

  else if (step === 7) {
    await registerUser(cfg, SIM_USERS[3]); // Juno
    state.registered_users.push(SIM_USERS[3].id);
  }

  else if (step === 8) {
    // Juno joins
    if (state.crew_id && state.join_code) {
      const token = tokenFor(SIM_USERS[3].id);
      await callAPI(apiBase, "POST", `/api/v1/flow/crews/${state.crew_id}/join`, token, {
        joinCode: state.join_code,
      });
      console.log(`[activity-sim] Juno joined ${CREW_NAME}`);
    }
  }

  else if (step === 9) {
    // Kai checks in + sends message
    if (state.crew_id) {
      const token = tokenFor(SIM_USERS[1].id);
      await callAPI(apiBase, "POST", `/api/v1/flow/crews/${state.crew_id}/checkin`, token, {
        venueName: VENUE_NAME,
        status: "here",
        latitude: VENUE_LAT,
        longitude: VENUE_LNG,
      });
      await callAPI(apiBase, "POST", `/api/v1/flow/crews/${state.crew_id}/messages`, token, {
        message: "Just walked in, where is everyone?",
      });
      console.log(`[activity-sim] Kai checked in + messaged`);
    }
  }

  else if (step === 10) {
    await registerUser(cfg, SIM_USERS[4]); // Reef
    state.registered_users.push(SIM_USERS[4].id);
  }

  else if (step === 11) {
    // Reef joins
    if (state.crew_id && state.join_code) {
      const token = tokenFor(SIM_USERS[4].id);
      await callAPI(apiBase, "POST", `/api/v1/flow/crews/${state.crew_id}/join`, token, {
        joinCode: state.join_code,
      });
      console.log(`[activity-sim] Reef joined ${CREW_NAME}`);
    }
  }

  else if (step === 12) {
    // Mira checks in + message
    if (state.crew_id) {
      const token = tokenFor(SIM_USERS[2].id);
      await callAPI(apiBase, "POST", `/api/v1/flow/crews/${state.crew_id}/checkin`, token, {
        venueName: VENUE_NAME,
        status: "heading",
        latitude: VENUE_LAT,
        longitude: VENUE_LNG,
      });
      await callAPI(apiBase, "POST", `/api/v1/flow/crews/${state.crew_id}/messages`, token, {
        message: "On my way, save me a spot!",
      });
      console.log(`[activity-sim] Mira heading to ${VENUE_NAME}`);
    }
  }

  else if (step === 13) {
    await registerUser(cfg, SIM_USERS[5]); // Sage
    state.registered_users.push(SIM_USERS[5].id);
  }

  else if (step === 14) {
    // Sage joins
    if (state.crew_id && state.join_code) {
      const token = tokenFor(SIM_USERS[5].id);
      await callAPI(apiBase, "POST", `/api/v1/flow/crews/${state.crew_id}/join`, token, {
        joinCode: state.join_code,
      });
      console.log(`[activity-sim] Sage joined ${CREW_NAME}`);
    }
  }

  else if (step === 15) {
    // Juno checks in
    if (state.crew_id) {
      const token = tokenFor(SIM_USERS[3].id);
      await callAPI(apiBase, "POST", `/api/v1/flow/crews/${state.crew_id}/checkin`, token, {
        venueName: VENUE_NAME,
        status: "here",
        message: "The music is great tonight",
        latitude: VENUE_LAT,
        longitude: VENUE_LNG,
      });
      console.log(`[activity-sim] Juno checked into ${VENUE_NAME}`);
    }
  }

  else if (step === 16) {
    // Luna sends coordination message
    if (state.crew_id) {
      const token = tokenFor(SIM_USERS[0].id);
      await callAPI(apiBase, "POST", `/api/v1/flow/crews/${state.crew_id}/messages`, token, {
        message: "Whole crew's almost here, love this energy!",
      });
      console.log(`[activity-sim] Luna sent crew message`);
    }
  }

  // --- Phase: Ongoing organic activity (step 17+) ---
  else {
    if (!state.crew_id) {
      console.log(`[activity-sim] No crew_id, skipping ongoing activity`);
      state.step = step + 1;
      return state;
    }

    // Pick a random user and action
    const user = pick(SIM_USERS);
    const token = tokenFor(user.id);
    const actionRoll = Math.random();

    if (actionRoll < 0.5) {
      // Check in (50% chance)
      const status = pick(CHECKIN_STATUSES);
      await callAPI(apiBase, "POST", `/api/v1/flow/crews/${state.crew_id}/checkin`, token, {
        venueName: VENUE_NAME,
        status,
        latitude: VENUE_LAT + (Math.random() - 0.5) * 0.002,
        longitude: VENUE_LNG + (Math.random() - 0.5) * 0.002,
      });
      console.log(`[activity-sim] ${user.name} checked in (${status})`);
    } else if (actionRoll < 0.85) {
      // Send crew message (35% chance)
      await callAPI(apiBase, "POST", `/api/v1/flow/crews/${state.crew_id}/messages`, token, {
        message: pick(COORD_MESSAGES),
      });
      console.log(`[activity-sim] ${user.name} sent a message`);
    } else {
      // Check in + message combo (15% chance)
      await callAPI(apiBase, "POST", `/api/v1/flow/crews/${state.crew_id}/checkin`, token, {
        venueName: VENUE_NAME,
        status: "here",
        latitude: VENUE_LAT + (Math.random() - 0.5) * 0.002,
        longitude: VENUE_LNG + (Math.random() - 0.5) * 0.002,
      });
      await callAPI(apiBase, "POST", `/api/v1/flow/crews/${state.crew_id}/messages`, token, {
        message: pick(COORD_MESSAGES),
      });
      console.log(`[activity-sim] ${user.name} checked in + messaged`);
    }
  }

  state.step = step + 1;
  return state;
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

export async function runActivitySim(supabaseUrl: string, supabaseKey: string): Promise<void> {
  const cfg: SbCfg = { supabaseUrl, supabaseKey };

  // API base: call ourselves (localhost in Fly.io, or FLOWB_API_BASE)
  const apiBase = process.env.FLOWB_API_BASE || `http://localhost:${process.env.PORT || 3000}`;

  try {
    let state = await loadState(cfg);

    // Don't run more than once per 10 minutes (guard against double-fire)
    if (state.last_run) {
      const elapsed = Date.now() - new Date(state.last_run).getTime();
      if (elapsed < 10 * 60 * 1000) {
        console.log(`[activity-sim] Skipping, last run ${Math.round(elapsed / 60000)}m ago`);
        return;
      }
    }

    state = await executeStep(cfg, state, apiBase);
    await saveState(cfg, state);

    console.log(`[activity-sim] Done. Next step: ${state.step}, crew: ${state.crew_id || "pending"}`);
  } catch (err) {
    console.error("[activity-sim] Error:", err instanceof Error ? err.message : String(err));
  }
}
