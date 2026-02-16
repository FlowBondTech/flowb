/**
 * Neynar Plugin for FlowB
 *
 * Farcaster social integration via Neynar REST API.
 * Enables social challenge verification, profile lookup, content discovery,
 * and autonomous posting (event cards, digests, announcements).
 */

import type {
  FlowBPlugin,
  FlowBContext,
  ToolInput,
} from "../../core/types.js";

// ============================================================================
// Types
// ============================================================================

interface NeynarPluginConfig {
  apiKey: string;
  agentToken?: string;
}

interface FarcasterUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url?: string;
  follower_count: number;
  following_count: number;
  verifications: string[];
  verified_addresses?: {
    eth_addresses: string[];
    sol_addresses: string[];
  };
}

interface Cast {
  hash: string;
  author: { fid: number; username: string; display_name: string };
  text: string;
  timestamp: string;
  reactions: { likes_count: number; recasts_count: number };
  replies: { count: number };
  channel?: { id: string; name: string };
}

interface PublishCastResponse {
  success: boolean;
  cast?: { hash: string; author: { fid: number } };
}

// ============================================================================
// Constants
// ============================================================================

const NEYNAR_API = "https://api.neynar.com/v2/farcaster";

// ============================================================================
// Plugin
// ============================================================================

export class NeynarPlugin implements FlowBPlugin {
  id = "neynar";
  name = "Farcaster";
  description = "Farcaster social integration via Neynar";

  actions: Record<string, { description: string; requiresAuth?: boolean }> = {
    "farcaster-profile": {
      description: "Look up a Farcaster profile by wallet address or username",
    },
    "farcaster-verify": {
      description: "Verify a Farcaster cast exists for social challenge proof",
      requiresAuth: true,
    },
    "farcaster-feed": {
      description: "Get trending or channel-specific Farcaster casts",
    },
    "farcaster-post": {
      description: "Publish a cast to Farcaster (requires NEYNAR_AGENT_TOKEN)",
    },
  };

  private config?: NeynarPluginConfig;

  configure(config: NeynarPluginConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!this.config?.apiKey;
  }

  /** Get the API key for external services that need direct Neynar access */
  getApiKey(): string | undefined {
    return this.config?.apiKey;
  }

  /** Get plugin config for external inspection */
  getConfig(): NeynarPluginConfig | undefined {
    return this.config;
  }

  async execute(action: string, input: ToolInput, context: FlowBContext): Promise<string> {
    if (!this.config?.apiKey) {
      return "Farcaster integration is not configured. Set NEYNAR_API_KEY.";
    }

    switch (action) {
      case "farcaster-profile":
        return this.lookupProfile(input);
      case "farcaster-verify":
        return this.verifyCast(input, context);
      case "farcaster-feed":
        return this.getFeed(input);
      case "farcaster-post":
        return this.handlePost(input);
      default:
        return `Unknown Farcaster action: ${action}`;
    }
  }

  // ==========================================================================
  // API Helpers
  // ==========================================================================

  private async neynarFetch<T>(path: string): Promise<T | null> {
    const url = `${NEYNAR_API}${path}`;
    try {
      const res = await fetch(url, {
        headers: {
          "x-api-key": this.config!.apiKey,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        console.error(`[neynar] ${res.status} ${path}: ${await res.text()}`);
        return null;
      }
      return await res.json() as T;
    } catch (err) {
      console.error(`[neynar] fetch error:`, err);
      return null;
    }
  }

  private async neynarPost<T>(path: string, body: any): Promise<T | null> {
    const url = `${NEYNAR_API}${path}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "x-api-key": this.config!.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        console.error(`[neynar] POST ${res.status} ${path}: ${await res.text()}`);
        return null;
      }
      return await res.json() as T;
    } catch (err) {
      console.error(`[neynar] POST error:`, err);
      return null;
    }
  }

  // ==========================================================================
  // Public: Publish Cast
  // ==========================================================================

  /**
   * Publish a cast to Farcaster via Neynar.
   * Requires NEYNAR_AGENT_TOKEN (signer_uuid) to be configured.
   */
  async publishCast(
    text: string,
    embeds?: { url: string }[],
    channelId?: string,
    parentHash?: string,
  ): Promise<PublishCastResponse> {
    const signerUuid = this.config?.agentToken || process.env.NEYNAR_AGENT_TOKEN;
    if (!signerUuid) {
      console.error("[neynar] Cannot publish cast: NEYNAR_AGENT_TOKEN not set");
      return { success: false };
    }

    const payload: Record<string, any> = {
      signer_uuid: signerUuid,
      text,
    };

    if (embeds?.length) {
      payload.embeds = embeds;
    }
    if (channelId) {
      payload.channel_id = channelId;
    }
    if (parentHash) {
      payload.parent = parentHash;
    }

    const result = await this.neynarPost<{ success: boolean; cast?: { hash: string; author: { fid: number } } }>(
      "/cast",
      payload,
    );

    if (!result) {
      return { success: false };
    }

    return {
      success: result.success ?? true,
      cast: result.cast,
    };
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  private async handlePost(input: ToolInput): Promise<string> {
    const text = input.query;
    if (!text) {
      return "Provide text to cast via the query field.";
    }

    const result = await this.publishCast(text);
    if (!result.success) {
      return "Failed to publish cast. Check NEYNAR_AGENT_TOKEN configuration.";
    }

    return `Cast published! Hash: ${result.cast?.hash || "unknown"}`;
  }

  private async lookupProfile(input: ToolInput): Promise<string> {
    const wallet = input.wallet_address;
    const username = input.farcaster_username || input.query;

    if (wallet) {
      return this.lookupByWallet(wallet);
    }
    if (username) {
      return this.lookupByUsername(username);
    }
    return "Provide a wallet_address or farcaster_username to look up a Farcaster profile.";
  }

  private async lookupByWallet(address: string): Promise<string> {
    const data = await this.neynarFetch<{ [addr: string]: FarcasterUser[] }>(
      `/user/bulk-by-address?addresses=${address}`,
    );
    if (!data) return "Could not look up Farcaster profile. Try again later.";

    const users = data[address.toLowerCase()] || [];
    if (users.length === 0) {
      return `No Farcaster account found linked to wallet ${address}.`;
    }

    return users.map((u) => this.formatProfile(u)).join("\n\n---\n\n");
  }

  private async lookupByUsername(username: string): Promise<string> {
    const clean = username.replace(/^@/, "");
    const data = await this.neynarFetch<{ result: { users: FarcasterUser[] } }>(
      `/user/search?q=${encodeURIComponent(clean)}&limit=3`,
    );
    if (!data?.result?.users?.length) {
      return `No Farcaster user found matching "${clean}".`;
    }

    return data.result.users.map((u) => this.formatProfile(u)).join("\n\n---\n\n");
  }

  private formatProfile(u: FarcasterUser): string {
    const lines = [
      `**${u.display_name}** (@${u.username})`,
      `FID: ${u.fid} | Followers: ${u.follower_count} | Following: ${u.following_count}`,
    ];
    if (u.verified_addresses?.eth_addresses?.length) {
      lines.push(`Verified wallets: ${u.verified_addresses.eth_addresses.join(", ")}`);
    }
    return lines.join("\n");
  }

  private async verifyCast(input: ToolInput, context: FlowBContext): Promise<string> {
    // Verify that a user posted a cast matching criteria (for social challenges)
    const wallet = input.wallet_address;
    const searchQuery = input.query;

    if (!wallet && !input.farcaster_username) {
      return "Provide wallet_address or farcaster_username to verify a Farcaster cast.";
    }

    // Step 1: Find the user's FID
    let fid: number | null = null;

    if (wallet) {
      const data = await this.neynarFetch<{ [addr: string]: FarcasterUser[] }>(
        `/user/bulk-by-address?addresses=${wallet}`,
      );
      const users = data?.[wallet.toLowerCase()];
      if (users?.length) {
        fid = users[0].fid;
      }
    }

    if (!fid && input.farcaster_username) {
      const clean = input.farcaster_username.replace(/^@/, "");
      const data = await this.neynarFetch<{ result: { users: FarcasterUser[] } }>(
        `/user/search?q=${encodeURIComponent(clean)}&limit=1`,
      );
      if (data?.result?.users?.length) {
        fid = data.result.users[0].fid;
      }
    }

    if (!fid) {
      return "Could not find a Farcaster account for this user. They may need to link their wallet on Farcaster first.";
    }

    // Step 2: Search for recent casts by this user
    const query = searchQuery || "dance";
    const data = await this.neynarFetch<{ result: { casts: Cast[] } }>(
      `/cast/search?q=${encodeURIComponent(query)}&author_fid=${fid}&limit=5`,
    );

    if (!data?.result?.casts?.length) {
      return `No recent Farcaster casts found from FID ${fid} matching "${query}". The user needs to post about their challenge on Farcaster to complete the social challenge.`;
    }

    const cast = data.result.casts[0];
    const lines = [
      `**Social challenge verified!**`,
      ``,
      `Found matching cast by @${cast.author.username}:`,
      `"${cast.text.slice(0, 150)}${cast.text.length > 150 ? "..." : ""}"`,
      ``,
      `Posted: ${new Date(cast.timestamp).toLocaleDateString()}`,
      `Engagement: ${cast.reactions.likes_count} likes, ${cast.reactions.recasts_count} recasts`,
      `Cast hash: ${cast.hash}`,
    ];

    return lines.join("\n");
  }

  private async getFeed(input: ToolInput): Promise<string> {
    const channel = input.farcaster_channel || input.query;

    if (channel) {
      return this.getChannelFeed(channel);
    }

    // Default: trending feed
    return this.getTrendingFeed();
  }

  private async getChannelFeed(channelId: string): Promise<string> {
    const data = await this.neynarFetch<{ casts: Cast[] }>(
      `/feed/channels?channel_ids=${encodeURIComponent(channelId)}&limit=10`,
    );

    if (!data?.casts?.length) {
      return `No casts found in channel "${channelId}". Check the channel name and try again.`;
    }

    return this.formatCastList(data.casts, `Latest in /${channelId}`);
  }

  private async getTrendingFeed(): Promise<string> {
    const data = await this.neynarFetch<{ casts: Cast[] }>(
      `/feed/trending?limit=10&time_window=24h`,
    );

    if (!data?.casts?.length) {
      return "Could not fetch trending casts. Try again later.";
    }

    return this.formatCastList(data.casts, "Trending on Farcaster (24h)");
  }

  private formatCastList(casts: Cast[], title: string): string {
    const lines = [`**${title}**`, ""];

    for (const cast of casts.slice(0, 10)) {
      const preview = cast.text.slice(0, 120).replace(/\n/g, " ");
      const channel = cast.channel ? ` in /${cast.channel.id}` : "";
      lines.push(
        `- **@${cast.author.username}**${channel}: "${preview}${cast.text.length > 120 ? "..." : ""}"`,
        `  ${cast.reactions.likes_count} likes | ${cast.reactions.recasts_count} recasts`,
      );
    }

    return lines.join("\n");
  }
}
