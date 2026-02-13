/**
 * Trading Plugin for FlowB
 *
 * Token swaps on Base via CDP Swap API (0x aggregator, 130+ DEXs).
 * Battle pools for DANZ events where dancers stake USDC.
 * Every action awards FlowB points for the engagement loop.
 */

import type {
  FlowBPlugin,
  FlowBContext,
  ToolInput,
  TradingPluginConfig,
} from "../../core/types.js";
import {
  CDPClient,
  USDC_BASE,
  WETH_BASE,
  ETH_ADDRESS,
  DEGEN_BASE,
} from "../../services/cdp.js";
import type { BalanceEntry } from "../../services/cdp.js";
import {
  createBattle,
  joinBattle,
  getBattleStatus,
  getBattleResults,
  resolveBattle,
} from "./battles.js";

// ============================================================================
// Token Alias Map
// ============================================================================

const TOKEN_ALIASES: Record<string, { address: string; decimals: number; symbol: string }> = {
  usdc:  { address: USDC_BASE, decimals: 6,  symbol: "USDC" },
  eth:   { address: ETH_ADDRESS, decimals: 18, symbol: "ETH" },
  weth:  { address: WETH_BASE, decimals: 18, symbol: "WETH" },
  degen: { address: DEGEN_BASE, decimals: 18, symbol: "DEGEN" },
};

export function resolveToken(input: string): { address: string; decimals: number; symbol: string } | null {
  const lower = input.toLowerCase().trim();

  // Check alias map first
  if (TOKEN_ALIASES[lower]) return TOKEN_ALIASES[lower];

  // Check if it's already an address
  if (/^0x[a-fA-F0-9]{40}$/.test(input)) {
    return { address: input, decimals: 18, symbol: input.slice(0, 6) + "..." };
  }

  return null;
}

export function toAtomicAmount(humanAmount: string, decimals: number): string {
  const parts = humanAmount.split(".");
  const whole = parts[0] || "0";
  const frac = (parts[1] || "").padEnd(decimals, "0").slice(0, decimals);
  const raw = whole + frac;
  // Strip leading zeros but keep at least one digit
  return raw.replace(/^0+/, "") || "0";
}

export function fromAtomicAmount(atomic: string, decimals: number): string {
  const padded = atomic.padStart(decimals + 1, "0");
  const whole = padded.slice(0, padded.length - decimals) || "0";
  const frac = padded.slice(padded.length - decimals);
  // Trim trailing zeros from fraction
  const trimmedFrac = frac.replace(/0+$/, "");
  return trimmedFrac ? `${whole}.${trimmedFrac}` : whole;
}

function formatUsd(amount: number): string {
  return amount < 0.01 ? `$${amount.toFixed(6)}` : `$${amount.toFixed(2)}`;
}

// ============================================================================
// Supabase helpers (same pattern as other plugins)
// ============================================================================

interface SbConfig { supabaseUrl: string; supabaseKey: string }

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

// ============================================================================
// Trading Plugin
// ============================================================================

export class TradingPlugin implements FlowBPlugin {
  id = "trading";
  name = "Base Trading";
  description = "Swap tokens on Base chain & join DANZ battle pools";

  actions: Record<string, { description: string; requiresAuth?: boolean }> = {
    swap:            { description: "Swap tokens on Base (e.g. 10 USDC to ETH)", requiresAuth: true },
    price:           { description: "Get a live price quote", requiresAuth: false },
    balance:         { description: "Check wallet token balances", requiresAuth: true },
    portfolio:       { description: "View portfolio summary", requiresAuth: true },
    "create-battle": { description: "Create a battle pool for an event", requiresAuth: true },
    "join-battle":   { description: "Stake USDC in a battle pool", requiresAuth: true },
    "battle-status": { description: "Check battle pool status", requiresAuth: false },
    "battle-results":{ description: "See battle results & payouts", requiresAuth: false },
  };

  private config: TradingPluginConfig | null = null;
  private cdp: CDPClient | null = null;

  configure(config: TradingPluginConfig) {
    this.config = config;
    try {
      this.cdp = new CDPClient(config);
    } catch (err) {
      console.error("[trading] CDP client init failed:", err);
    }
  }

  isConfigured(): boolean {
    return !!(this.config && this.cdp);
  }

  async execute(action: string, input: ToolInput, context: FlowBContext): Promise<string> {
    if (!this.config || !this.cdp) return "Trading not configured.";
    const userId = input.user_id;

    switch (action) {
      case "price":
        return this.getPrice(input);
      case "swap":
        return this.executeSwap(input, userId);
      case "balance":
        return this.getBalance();
      case "portfolio":
        return this.getPortfolio();
      case "create-battle":
        return createBattle(this.config, this.cdp, input, userId);
      case "join-battle":
        return joinBattle(this.config, this.cdp, input, userId);
      case "battle-status":
        return getBattleStatus(this.config, input);
      case "battle-results":
        return getBattleResults(this.config, input);
      default:
        return `Unknown trading action: ${action}`;
    }
  }

  // ==========================================================================
  // Price
  // ==========================================================================

  private async getPrice(input: ToolInput): Promise<string> {
    const fromRaw = input.token_from || "ETH";
    const toRaw = input.token_to || "USDC";
    const amountRaw = input.amount || "1";

    const from = resolveToken(fromRaw);
    const to = resolveToken(toRaw);
    if (!from) return `Unknown token: ${fromRaw}. Supported: ${Object.keys(TOKEN_ALIASES).join(", ")}`;
    if (!to) return `Unknown token: ${toRaw}. Supported: ${Object.keys(TOKEN_ALIASES).join(", ")}`;

    const sellAmount = toAtomicAmount(amountRaw, from.decimals);

    try {
      const result = await this.cdp!.getSwapPrice(from.address, to.address, sellAmount);
      const buyHuman = fromAtomicAmount(result.buyAmount, to.decimals);
      const rate = parseFloat(buyHuman) / parseFloat(amountRaw);

      return [
        `**${amountRaw} ${from.symbol} = ${buyHuman} ${to.symbol}**`,
        "",
        `Rate: 1 ${from.symbol} = ${rate.toFixed(to.decimals === 6 ? 2 : 6)} ${to.symbol}`,
        `Via 0x aggregator (130+ DEXs on Base)`,
      ].join("\n");
    } catch (err: any) {
      console.error("[trading] getPrice error:", err.message);
      return `Failed to get price for ${from.symbol}/${to.symbol}: ${err.message}`;
    }
  }

  // ==========================================================================
  // Swap
  // ==========================================================================

  private async executeSwap(input: ToolInput, userId?: string): Promise<string> {
    if (!userId) return "User ID required for swaps.";

    const fromRaw = input.token_from;
    const toRaw = input.token_to;
    const amountRaw = input.amount;
    const slippageBps = input.slippage_bps || 100;

    if (!fromRaw || !toRaw || !amountRaw) {
      return "Swap requires: token_from, token_to, amount.\nExample: swap 10 USDC to ETH";
    }

    const from = resolveToken(fromRaw);
    const to = resolveToken(toRaw);
    if (!from) return `Unknown token: ${fromRaw}. Supported: ${Object.keys(TOKEN_ALIASES).join(", ")}`;
    if (!to) return `Unknown token: ${toRaw}. Supported: ${Object.keys(TOKEN_ALIASES).join(", ")}`;

    const sellAmount = toAtomicAmount(amountRaw, from.decimals);

    // Log trade attempt
    const tradeRow = this.config ? await sbInsert(this.config, "trade_history", {
      user_id: userId,
      platform: input.platform || "telegram",
      from_token: from.address,
      from_symbol: from.symbol,
      to_token: to.address,
      to_symbol: to.symbol,
      sell_amount: sellAmount,
      slippage_bps: slippageBps,
      status: "pending",
    }) : null;

    try {
      const result = await this.cdp!.executeSwap(from.address, to.address, sellAmount, slippageBps);

      if (result.success && result.txHash) {
        const buyHuman = result.buyAmount ? fromAtomicAmount(result.buyAmount, to.decimals) : "?";

        // Update trade record
        if (tradeRow?.id && this.config) {
          await fetch(`${this.config.supabaseUrl}/rest/v1/trade_history?id=eq.${tradeRow.id}`, {
            method: "PATCH",
            headers: {
              apikey: this.config.supabaseKey,
              Authorization: `Bearer ${this.config.supabaseKey}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({
              status: "confirmed",
              tx_hash: result.txHash,
              buy_amount: result.buyAmount || null,
              confirmed_at: new Date().toISOString(),
            }),
          });
        }

        return [
          `**Swap Confirmed!**`,
          "",
          `Sold: ${amountRaw} ${from.symbol}`,
          `Got: ${buyHuman} ${to.symbol}`,
          "",
          `[View on BaseScan](https://basescan.org/tx/${result.txHash})`,
        ].join("\n");
      }

      // Failed
      if (tradeRow?.id && this.config) {
        await fetch(`${this.config.supabaseUrl}/rest/v1/trade_history?id=eq.${tradeRow.id}`, {
          method: "PATCH",
          headers: {
            apikey: this.config.supabaseKey,
            Authorization: `Bearer ${this.config.supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            status: "failed",
            error_message: result.error || "Unknown error",
          }),
        });
      }

      return `Swap failed: ${result.error || "Unknown error"}`;
    } catch (err: any) {
      console.error("[trading] executeSwap error:", err.message);
      return `Swap failed: ${err.message}`;
    }
  }

  // ==========================================================================
  // Balance & Portfolio
  // ==========================================================================

  private async getBalance(): Promise<string> {
    try {
      const balances = await this.cdp!.getBalance();
      if (!balances.length) {
        return `**Wallet Balance**\n\nNo tokens found.\nAddress: ${this.cdp!.address}`;
      }

      const lines = ["**Wallet Balance**\n"];
      for (const b of balances) {
        const human = fromAtomicAmount(b.amount, b.decimals);
        if (parseFloat(human) > 0) {
          lines.push(`${b.symbol}: ${human}`);
        }
      }
      lines.push(`\nAddress: ${this.cdp!.address.slice(0, 6)}...${this.cdp!.address.slice(-4)}`);
      return lines.join("\n");
    } catch (err: any) {
      return `Failed to fetch balance: ${err.message}`;
    }
  }

  private async getPortfolio(): Promise<string> {
    try {
      const balances = await this.cdp!.getBalance();
      if (!balances.length) {
        return `**Portfolio**\n\nEmpty wallet. Fund it to start trading!`;
      }

      const nonZero = balances.filter((b) => {
        const human = fromAtomicAmount(b.amount, b.decimals);
        return parseFloat(human) > 0;
      });

      if (!nonZero.length) {
        return `**Portfolio**\n\nNo token balances found.`;
      }

      const lines = ["**Portfolio Summary**\n"];
      for (const b of nonZero) {
        const human = fromAtomicAmount(b.amount, b.decimals);
        lines.push(`**${b.symbol}**: ${human}`);
      }

      // Recent trades
      if (this.config) {
        const trades = await sbQuery<any[]>(this.config, "trade_history", {
          select: "from_symbol,to_symbol,sell_amount,buy_amount,status,created_at",
          order: "created_at.desc",
          limit: "5",
          status: "eq.confirmed",
        });

        if (trades?.length) {
          lines.push("\n**Recent Trades**");
          for (const t of trades) {
            const date = new Date(t.created_at).toLocaleDateString("en-US", {
              month: "short", day: "numeric",
            });
            lines.push(`${date} | ${t.from_symbol} -> ${t.to_symbol}`);
          }
        }
      }

      lines.push(`\nWallet: ${this.cdp!.address.slice(0, 6)}...${this.cdp!.address.slice(-4)}`);
      return lines.join("\n");
    } catch (err: any) {
      return `Failed to load portfolio: ${err.message}`;
    }
  }
}
