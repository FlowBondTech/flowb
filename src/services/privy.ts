/**
 * Privy API Client (zero-dep)
 *
 * Looks up users by Telegram ID to enable auto-verification.
 * Uses Privy's REST API with Basic Auth.
 */

export interface PrivyLinkedAccount {
  type: string;
  // telegram
  telegram_user_id?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  // wallet
  address?: string;
  chain_type?: string;
  // farcaster
  fid?: number;
  // email
  email?: string;
}

export interface PrivyUser {
  id: string;
  created_at: number;
  linked_accounts: PrivyLinkedAccount[];
}

export interface PrivyConfig {
  appId: string;
  appSecret: string;
}

export class PrivyClient {
  private appId: string;
  private authHeader: string;

  constructor(config: PrivyConfig) {
    this.appId = config.appId;
    const credentials = Buffer.from(`${config.appId}:${config.appSecret}`).toString("base64");
    this.authHeader = `Basic ${credentials}`;
  }

  async lookupByTelegramId(telegramUserId: string): Promise<PrivyUser | null> {
    try {
      const res = await fetch(
        `https://auth.privy.io/api/v2/users/telegram:${telegramUserId}`,
        {
          headers: {
            Authorization: this.authHeader,
            "privy-app-id": this.appId,
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) {
        if (res.status === 404) return null;
        console.error(`[privy] Lookup failed: ${res.status}`);
        return null;
      }

      return (await res.json()) as PrivyUser;
    } catch (err) {
      console.error("[privy] Telegram lookup error:", err);
      return null;
    }
  }

  async lookupByFarcasterFid(fid: number): Promise<PrivyUser | null> {
    try {
      const res = await fetch(
        `https://auth.privy.io/api/v2/users/farcaster:${fid}`,
        {
          headers: {
            Authorization: this.authHeader,
            "privy-app-id": this.appId,
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) {
        if (res.status === 404) return null;
        console.error(`[privy] Farcaster lookup failed: ${res.status}`);
        return null;
      }

      return (await res.json()) as PrivyUser;
    } catch (err) {
      console.error("[privy] Farcaster FID lookup error:", err);
      return null;
    }
  }

  async lookupByPrivyId(privyId: string): Promise<PrivyUser | null> {
    try {
      const res = await fetch(
        `https://auth.privy.io/api/v2/users/${privyId}`,
        {
          headers: {
            Authorization: this.authHeader,
            "privy-app-id": this.appId,
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) return null;
      return (await res.json()) as PrivyUser;
    } catch (err) {
      console.error("[privy] User lookup error:", err);
      return null;
    }
  }

  /** Extract specific linked account type from a Privy user */
  static getLinkedAccount(user: PrivyUser, type: string): PrivyLinkedAccount | undefined {
    return user.linked_accounts.find((a) => a.type === type);
  }

  /** Get all verified social platforms for a user */
  static getVerifiedSocials(user: PrivyUser): string[] {
    return user.linked_accounts
      .filter((a) => ["telegram", "farcaster", "discord", "twitter", "github"].includes(a.type))
      .map((a) => a.type);
  }
}
