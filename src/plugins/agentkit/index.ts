/**
 * AgentKit Plugin for FlowB
 *
 * Wraps Coinbase AgentKit with CdpEvmWalletProvider on Base network.
 * Provides wallet balance, native transfer, ERC20 transfer, and swap actions
 * through the standard FlowB plugin interface.
 *
 * Env:
 *   CDP_API_KEY_NAME          - API key name (UUID)
 *   CDP_API_KEY_PRIVATE_KEY   - API key private key (PEM or raw base64)
 *   CDP_WALLET_SECRET         - Wallet secret for signing
 *   CDP_ACCOUNT_ADDRESS       - Default account address on Base
 */

import {
  AgentKit,
  CdpEvmWalletProvider,
  walletActionProvider,
  erc20ActionProvider,
} from "@coinbase/agentkit";
import type {
  FlowBPlugin,
  FlowBContext,
  ToolInput,
  CDPPluginConfig,
} from "../../core/types.js";

// ============================================================================
// Plugin
// ============================================================================

export class AgentKitPlugin implements FlowBPlugin {
  id = "agentkit";
  name = "AgentKit";
  description = "Coinbase AgentKit - onchain wallet actions on Base (balance, transfer, swap)";

  actions: Record<string, { description: string; requiresAuth?: boolean }> = {
    "wallet-balance":   { description: "Get wallet balance (ETH + tokens)" },
    "wallet-address":   { description: "Get the agent wallet address" },
    "send-eth":         { description: "Send ETH to an address", requiresAuth: true },
    "send-token":       { description: "Send ERC20 token to an address", requiresAuth: true },
    "token-balance":    { description: "Get ERC20 token balance" },
  };

  private config: CDPPluginConfig | null = null;
  private kit: AgentKit | null = null;
  private walletProvider: CdpEvmWalletProvider | null = null;
  private initPromise: Promise<void> | null = null;

  configure(config: CDPPluginConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!(
      this.config?.apiKeyName &&
      this.config?.apiKeyPrivateKey &&
      this.config?.walletSecret
    );
  }

  /**
   * Lazily initialize AgentKit + wallet provider on first use.
   * This avoids blocking server startup with async wallet init.
   */
  private async ensureInit(): Promise<void> {
    if (this.kit) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const cfg = this.config!;

      this.walletProvider = await CdpEvmWalletProvider.configureWithWallet({
        apiKeyId: cfg.apiKeyName,
        apiKeySecret: cfg.apiKeyPrivateKey,
        walletSecret: cfg.walletSecret,
        address: cfg.accountAddress as `0x${string}` | undefined,
        networkId: "base",
      });

      this.kit = await AgentKit.from({
        walletProvider: this.walletProvider,
        actionProviders: [
          walletActionProvider(),
          erc20ActionProvider(),
        ],
      });

      console.log(
        `[agentkit] Initialized on Base (address: ${this.walletProvider.getAddress()})`,
      );
    })();

    return this.initPromise;
  }

  async execute(action: string, input: ToolInput, _context: FlowBContext): Promise<string> {
    if (!this.isConfigured()) return "AgentKit not configured.";

    try {
      await this.ensureInit();
    } catch (err: any) {
      console.error("[agentkit] Init error:", err.message);
      return `AgentKit init failed: ${err.message}`;
    }

    const wp = this.walletProvider!;

    switch (action) {
      case "wallet-balance":
        return this.getBalance(wp);
      case "wallet-address":
        return this.getAddress(wp);
      case "send-eth":
        return this.sendEth(wp, input);
      case "send-token":
        return this.sendToken(wp, input);
      case "token-balance":
        return this.getTokenBalance(wp, input);
      default:
        return `Unknown agentkit action: ${action}`;
    }
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  private async getBalance(wp: CdpEvmWalletProvider): Promise<string> {
    const address = wp.getAddress();
    const balanceWei = await wp.getBalance();
    const ethBalance = Number(balanceWei) / 1e18;

    return JSON.stringify({
      address,
      network: "base",
      ethBalance: ethBalance.toFixed(6),
    });
  }

  private async getAddress(wp: CdpEvmWalletProvider): Promise<string> {
    return wp.getAddress();
  }

  private async sendEth(wp: CdpEvmWalletProvider, input: ToolInput): Promise<string> {
    const to = input.wallet_address;
    if (!to) return "Recipient wallet_address required.";

    const amount = input.query;
    if (!amount) return "Amount required in query field (in ETH, e.g. '0.001').";

    const amountWei = BigInt(Math.round(parseFloat(amount) * 1e18)).toString();

    try {
      const txHash = await wp.nativeTransfer(to as `0x${string}`, amountWei);
      console.log(`[agentkit] ETH sent: ${amount} ETH to ${to} tx=${txHash}`);
      return JSON.stringify({
        success: true,
        txHash,
        amount,
        to,
        network: "base",
      });
    } catch (err: any) {
      console.error("[agentkit] sendEth error:", err.message);
      return JSON.stringify({ success: false, error: err.message });
    }
  }

  private async sendToken(wp: CdpEvmWalletProvider, input: ToolInput): Promise<string> {
    const to = input.wallet_address;
    if (!to) return "Recipient wallet_address required.";

    const amount = input.query;
    if (!amount) return "Amount required in query field.";

    // Use the ERC20 action provider to transfer
    const provider = erc20ActionProvider();
    try {
      const result = await provider.transfer(wp, {
        tokenAddress: input.referral_code || USDC_BASE, // reuse referral_code for token address
        destinationAddress: to,
        amount,
      });
      console.log(`[agentkit] Token sent: ${amount} to ${to}`);
      return result;
    } catch (err: any) {
      console.error("[agentkit] sendToken error:", err.message);
      return JSON.stringify({ success: false, error: err.message });
    }
  }

  private async getTokenBalance(wp: CdpEvmWalletProvider, input: ToolInput): Promise<string> {
    const tokenAddress = input.referral_code || input.wallet_address || USDC_BASE;
    const provider = erc20ActionProvider();
    try {
      const result = await provider.getBalance(wp, {
        tokenAddress,
      });
      return result;
    } catch (err: any) {
      console.error("[agentkit] getTokenBalance error:", err.message);
      return JSON.stringify({ success: false, error: err.message });
    }
  }

  // ==========================================================================
  // Public helpers (for use by other plugins / bot)
  // ==========================================================================

  /** Get the underlying AgentKit instance (lazy-init) */
  async getKit(): Promise<AgentKit> {
    await this.ensureInit();
    return this.kit!;
  }

  /** Get the wallet provider directly */
  async getWalletProvider(): Promise<CdpEvmWalletProvider> {
    await this.ensureInit();
    return this.walletProvider!;
  }
}

// Well-known token on Base
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
