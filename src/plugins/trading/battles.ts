/**
 * DANZ Battle Pool System
 *
 * Dancers stake USDC on events. Pool types:
 *  - winner_take_all: 1st place gets entire pot (minus platform fee)
 *  - top_3: 60/25/15 split across top 3
 *  - proportional: payouts based on scoring
 *
 * Virtual balance: single CDP wallet, entries tracked in DB.
 * Per-user CDP wallets as future upgrade.
 */

import type { ToolInput } from "../../core/types.js";
import type { CDPClient } from "../../services/cdp.js";

interface SbConfig { supabaseUrl: string; supabaseKey: string }

const PLATFORM_FEE_PCT = 5; // 5% fee on pool payouts

// ============================================================================
// Supabase Helpers
// ============================================================================

async function sbQuery<T>(cfg: SbConfig, table: string, params: Record<string, string>): Promise<T | null> {
  const url = new URL(`${cfg.supabaseUrl}/rest/v1/${table}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: {
      apikey: cfg.supabaseKey,
      Authorization: `Bearer ${cfg.supabaseKey}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

async function sbInsert(cfg: SbConfig, table: string, data: Record<string, any>): Promise<any> {
  const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: cfg.supabaseKey,
      Authorization: `Bearer ${cfg.supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  const result = await res.json();
  return Array.isArray(result) ? result[0] : result;
}

async function sbPatch(cfg: SbConfig, table: string, filter: Record<string, string>, data: Record<string, any>): Promise<void> {
  const url = new URL(`${cfg.supabaseUrl}/rest/v1/${table}`);
  Object.entries(filter).forEach(([k, v]) => url.searchParams.set(k, v));
  await fetch(url.toString(), {
    method: "PATCH",
    headers: {
      apikey: cfg.supabaseKey,
      Authorization: `Bearer ${cfg.supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(data),
  });
}

// ============================================================================
// Battle Pool Actions
// ============================================================================

export async function createBattle(
  cfg: SbConfig,
  cdp: CDPClient,
  input: ToolInput,
  userId?: string,
): Promise<string> {
  if (!userId) return "User ID required to create a battle.";

  const eventId = input.event_id || null;
  const poolType = input.pool_type || "winner_take_all";
  const entryFee = parseFloat(input.entry_fee || "5");
  const title = input.query || "DANZ Battle";

  if (entryFee < 1 || entryFee > 1000) {
    return "Entry fee must be between $1 and $1000 USDC.";
  }

  const pool = await sbInsert(cfg, "battle_pools", {
    event_id: eventId,
    creator_user_id: userId,
    title,
    pool_type: poolType,
    entry_fee: entryFee,
    total_staked: 0,
    fee_percentage: PLATFORM_FEE_PCT,
    status: "open",
  });

  if (!pool) return "Failed to create battle pool. Try again.";

  const typeLabel = poolType === "winner_take_all" ? "Winner Takes All"
    : poolType === "top_3" ? "Top 3 Split (60/25/15)"
    : "Proportional";

  return [
    `**Battle Pool Created!**`,
    "",
    `**${title}**`,
    `Type: ${typeLabel}`,
    `Entry: $${entryFee.toFixed(2)} USDC`,
    `Fee: ${PLATFORM_FEE_PCT}%`,
    `Status: Open`,
    "",
    `Pool ID: ${pool.id.slice(0, 8)}`,
    `Share this with dancers to join!`,
  ].join("\n");
}

export async function joinBattle(
  cfg: SbConfig,
  cdp: CDPClient,
  input: ToolInput,
  userId?: string,
): Promise<string> {
  if (!userId) return "User ID required to join a battle.";

  const battleId = input.battle_id;
  if (!battleId) return "Battle ID required. Use /battle to see open pools.";

  // Get pool details
  const pools = await sbQuery<any[]>(cfg, "battle_pools", {
    select: "*",
    id: `eq.${battleId}`,
    limit: "1",
  });

  if (!pools?.length) return "Battle pool not found.";
  const pool = pools[0];

  if (pool.status !== "open") {
    return `This pool is ${pool.status}. Can't join anymore.`;
  }

  // Check not already joined
  const existing = await sbQuery<any[]>(cfg, "battle_entries", {
    select: "id",
    pool_id: `eq.${battleId}`,
    user_id: `eq.${userId}`,
    limit: "1",
  });

  if (existing?.length) {
    return "You've already joined this battle! Wait for it to resolve.";
  }

  // Check max participants
  const entries = await sbQuery<any[]>(cfg, "battle_entries", {
    select: "id",
    pool_id: `eq.${battleId}`,
  });

  if (pool.max_participants && (entries?.length || 0) >= pool.max_participants) {
    return "This pool is full!";
  }

  const entryFee = parseFloat(pool.entry_fee);

  // Insert entry (virtual balance -- tracked in DB, single CDP wallet)
  const entry = await sbInsert(cfg, "battle_entries", {
    pool_id: battleId,
    user_id: userId,
    amount_staked: entryFee,
  });

  if (!entry) return "Failed to join battle. Try again.";

  // Update total_staked
  const newTotal = parseFloat(pool.total_staked) + entryFee;
  await sbPatch(cfg, "battle_pools", { id: `eq.${battleId}` }, {
    total_staked: newTotal,
  });

  const participantCount = (entries?.length || 0) + 1;

  return [
    `**You're In!**`,
    "",
    `**${pool.title}**`,
    `Staked: $${entryFee.toFixed(2)} USDC`,
    `Pool: $${newTotal.toFixed(2)} USDC (${participantCount} dancers)`,
    "",
    `May the best dancer win!`,
  ].join("\n");
}

export async function getBattleStatus(
  cfg: SbConfig,
  input: ToolInput,
): Promise<string> {
  const battleId = input.battle_id;

  // If no battleId, list open pools
  if (!battleId) {
    const pools = await sbQuery<any[]>(cfg, "battle_pools", {
      select: "id,title,pool_type,entry_fee,total_staked,status,created_at",
      status: "in.(open,locked)",
      order: "created_at.desc",
      limit: "10",
    });

    if (!pools?.length) {
      return "**Battle Pools**\n\nNo active battles right now. Create one with /battle!";
    }

    const lines = ["**Active Battle Pools**\n"];
    for (const p of pools) {
      const typeEmoji = p.pool_type === "winner_take_all" ? "1st" : p.pool_type === "top_3" ? "Top3" : "Split";
      const statusEmoji = p.status === "open" ? "OPEN" : "LOCKED";
      lines.push(`**${p.title}**`);
      lines.push(`$${parseFloat(p.entry_fee).toFixed(2)} entry | $${parseFloat(p.total_staked).toFixed(2)} pot | ${typeEmoji} | ${statusEmoji}`);
      lines.push(`ID: ${p.id.slice(0, 8)}`);
      lines.push("");
    }
    return lines.join("\n");
  }

  // Specific pool
  const pools = await sbQuery<any[]>(cfg, "battle_pools", {
    select: "*",
    id: `eq.${battleId}`,
    limit: "1",
  });

  if (!pools?.length) return "Battle pool not found.";
  const pool = pools[0];

  const entries = await sbQuery<any[]>(cfg, "battle_entries", {
    select: "user_id,amount_staked,placement,payout_amount",
    pool_id: `eq.${battleId}`,
    order: "created_at.asc",
  });

  const typeLabel = pool.pool_type === "winner_take_all" ? "Winner Takes All"
    : pool.pool_type === "top_3" ? "Top 3 (60/25/15)"
    : "Proportional";

  const lines = [
    `**${pool.title}**`,
    "",
    `Type: ${typeLabel}`,
    `Entry: $${parseFloat(pool.entry_fee).toFixed(2)} USDC`,
    `Pot: $${parseFloat(pool.total_staked).toFixed(2)} USDC`,
    `Dancers: ${entries?.length || 0}${pool.max_participants ? `/${pool.max_participants}` : ""}`,
    `Status: ${pool.status.toUpperCase()}`,
    `Fee: ${pool.fee_percentage}%`,
  ];

  if (pool.status === "resolved" || pool.status === "paid") {
    const winners = (entries || []).filter((e: any) => e.placement && e.placement <= 3);
    if (winners.length) {
      lines.push("\n**Results:**");
      for (const w of winners) {
        const place = w.placement === 1 ? "1st" : w.placement === 2 ? "2nd" : "3rd";
        const payout = w.payout_amount ? `$${parseFloat(w.payout_amount).toFixed(2)}` : "-";
        lines.push(`${place}: ${w.user_id.replace("telegram_", "@")} (${payout})`);
      }
    }
  }

  return lines.join("\n");
}

export async function getBattleResults(
  cfg: SbConfig,
  input: ToolInput,
): Promise<string> {
  const battleId = input.battle_id;
  if (!battleId) return "Battle ID required to see results.";

  const pools = await sbQuery<any[]>(cfg, "battle_pools", {
    select: "*",
    id: `eq.${battleId}`,
    limit: "1",
  });

  if (!pools?.length) return "Battle pool not found.";
  const pool = pools[0];

  if (pool.status === "open" || pool.status === "locked") {
    return `This battle hasn't been resolved yet. Status: ${pool.status}`;
  }

  const entries = await sbQuery<any[]>(cfg, "battle_entries", {
    select: "user_id,amount_staked,placement,payout_amount,payout_tx_hash",
    pool_id: `eq.${battleId}`,
    order: "placement.asc.nullslast",
  });

  if (!entries?.length) return "No entries found for this battle.";

  const lines = [
    `**${pool.title} -- Results**`,
    "",
    `Pot: $${parseFloat(pool.total_staked).toFixed(2)} USDC`,
    "",
  ];

  for (const e of entries) {
    const place = e.placement ? `#${e.placement}` : "-";
    const payout = e.payout_amount ? `$${parseFloat(e.payout_amount).toFixed(2)}` : "$0";
    const txNote = e.payout_tx_hash ? " (paid)" : "";
    const userId = e.user_id.replace("telegram_", "@");
    lines.push(`${place} ${userId} | staked $${parseFloat(e.amount_staked).toFixed(2)} | won ${payout}${txNote}`);
  }

  return lines.join("\n");
}

/**
 * Resolve a battle pool (admin function).
 * Sets winner, calculates payouts by pool_type, optionally sends USDC.
 */
export async function resolveBattle(
  cfg: SbConfig,
  cdp: CDPClient,
  battleId: string,
  placements: { userId: string; place: number }[],
): Promise<string> {
  const pools = await sbQuery<any[]>(cfg, "battle_pools", {
    select: "*",
    id: `eq.${battleId}`,
    limit: "1",
  });

  if (!pools?.length) return "Battle pool not found.";
  const pool = pools[0];

  if (pool.status !== "open" && pool.status !== "locked") {
    return `Pool already ${pool.status}.`;
  }

  const totalStaked = parseFloat(pool.total_staked);
  const feeAmount = totalStaked * (pool.fee_percentage / 100);
  const distributable = totalStaked - feeAmount;

  // Calculate payouts based on pool type
  const payouts: Record<string, number> = {};

  if (pool.pool_type === "winner_take_all") {
    const winner = placements.find((p) => p.place === 1);
    if (winner) payouts[winner.userId] = distributable;
  } else if (pool.pool_type === "top_3") {
    const splits = [0.60, 0.25, 0.15];
    for (const p of placements) {
      if (p.place >= 1 && p.place <= 3) {
        payouts[p.userId] = distributable * splits[p.place - 1];
      }
    }
  } else {
    // Proportional: equal split among all placed participants
    const placed = placements.filter((p) => p.place > 0);
    if (placed.length) {
      const share = distributable / placed.length;
      for (const p of placed) {
        payouts[p.userId] = share;
      }
    }
  }

  // Update placements and payout amounts
  for (const p of placements) {
    const payout = payouts[p.userId] || 0;
    await sbPatch(cfg, "battle_entries", {
      pool_id: `eq.${battleId}`,
      user_id: `eq.${p.userId}`,
    }, {
      placement: p.place,
      payout_amount: payout,
    });
  }

  // Mark pool as resolved
  await sbPatch(cfg, "battle_pools", { id: `eq.${battleId}` }, {
    status: "resolved",
    winner_user_id: placements.find((p) => p.place === 1)?.userId || null,
    resolved_at: new Date().toISOString(),
  });

  const winnerLines = placements
    .filter((p) => payouts[p.userId] > 0)
    .sort((a, b) => a.place - b.place)
    .map((p) => `#${p.place} ${p.userId}: $${payouts[p.userId].toFixed(2)}`);

  return [
    `**Battle Resolved!**`,
    "",
    `**${pool.title}**`,
    `Pot: $${totalStaked.toFixed(2)} | Fee: $${feeAmount.toFixed(2)}`,
    "",
    ...winnerLines,
  ].join("\n");
}
