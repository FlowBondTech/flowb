/**
 * Farcaster Mini App SDK helpers
 * Uses @farcaster/miniapp-sdk (replaces old @farcaster/frame-sdk)
 */

import { sdk } from "@farcaster/miniapp-sdk";

let sdkReady = false;
let detectedClient: "warpcast" | "base" | "unknown" = "unknown";

/**
 * Detect which Farcaster client we're running inside.
 * Base uses Farcaster internally — links should stay in Base, not bounce to Warpcast.
 */
export function getClientType(): "warpcast" | "base" | "unknown" {
  if (detectedClient !== "unknown") return detectedClient;
  if (typeof window === "undefined") return "unknown";

  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("base")) {
    detectedClient = "base";
  } else if (ua.includes("warpcast")) {
    detectedClient = "warpcast";
  } else {
    // Check referrer / URL hints
    const ref = (document.referrer || "").toLowerCase();
    if (ref.includes("base.org")) detectedClient = "base";
    else if (ref.includes("warpcast.com")) detectedClient = "warpcast";
  }
  return detectedClient;
}

/**
 * Set client type from SDK context (called during init).
 * Warpcast clientFid = 9152, Base clientFid = unknown but we detect via context.
 */
function detectClientFromContext(context: any): void {
  if (detectedClient !== "unknown") return;
  const clientFid = context?.client?.clientFid;
  if (clientFid === 9152) {
    detectedClient = "warpcast";
  } else if (clientFid) {
    // Non-Warpcast Farcaster client — likely Base
    detectedClient = "base";
  }
}

/**
 * Build a cast URL that opens in the correct client.
 * Base: uses farcaster.xyz (protocol-level, opens natively in Base)
 * Warpcast: uses warpcast.com
 */
export function getCastUrl(username: string, hash: string): string {
  const shortHash = hash.startsWith("0x") ? hash.slice(0, 10) : `0x${hash.slice(0, 8)}`;
  const client = getClientType();
  if (client === "base") {
    return `https://farcaster.xyz/${username}/${shortHash}`;
  }
  return `https://warpcast.com/${username}/${shortHash}`;
}

/**
 * Build a profile URL for the correct client.
 */
export function getProfileUrl(username: string): string {
  const client = getClientType();
  if (client === "base") {
    return `https://farcaster.xyz/${username}`;
  }
  return `https://warpcast.com/${username}`;
}

/**
 * Detect whether we're running inside a Farcaster/Base mini app context.
 * Falls back to iframe/UA/URL/referrer/SDK-context detection.
 * Base app often fails sdk.isInMiniApp() so we use multiple fallbacks.
 */
export async function isInMiniApp(): Promise<boolean> {
  try {
    const sdkResult = await sdk.isInMiniApp();
    if (sdkResult) return true;
  } catch {}

  if (typeof window !== "undefined") {
    // Fallback: iframe detection (mini apps run in iframes)
    try {
      if (window.parent !== window || window.self !== window.top) return true;
    } catch {
      // Cross-origin iframe throws — that means we ARE in an iframe
      return true;
    }

    // User agent detection for Base/Warpcast
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("warpcast") || ua.includes("base")) return true;

    // URL param override (for testing / deep links)
    const params = new URLSearchParams(window.location.search);
    if (params.has("miniapp") || params.has("fc_frame")) return true;

    // Referrer detection (Base opens via base.org/farcaster.xyz)
    const ref = (document.referrer || "").toLowerCase();
    if (ref.includes("base.org") || ref.includes("warpcast.com") || ref.includes("farcaster.xyz")) return true;

    // Last resort: try SDK context with short timeout.
    // If context resolves, we ARE in a mini app regardless of other checks.
    try {
      const ctx = await Promise.race([
        sdk.context,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
      ]);
      if (ctx) return true;
    } catch {}
  }

  return false;
}

export async function initFarcaster(): Promise<{
  fid?: number;
  username?: string;
  added?: boolean;
}> {
  if (sdkReady) return {};

  try {
    const context = await Promise.race([
      sdk.context,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);

    sdkReady = true;

    // Detect client type from SDK context
    if (context) detectClientFromContext(context);
    // Also try UA-based detection
    getClientType();

    // Tell the client we're ready (hides splash screen)
    try {
      await sdk.actions.ready();
    } catch {}

    if (!context) {
      console.warn("[farcaster] SDK context timed out — proceeding without context");
      return {};
    }

    return {
      fid: context?.user?.fid,
      username: context?.user?.username,
      added: !!(context as any)?.client?.added,
    };
  } catch (err) {
    console.error("[farcaster] SDK init failed:", err);
    sdkReady = true; // Mark ready to prevent re-init loops
    return {};
  }
}

/**
 * Prompt user to add the mini app to their favorites and enable notifications.
 */
export async function promptAddMiniApp(): Promise<{
  added: boolean;
  notificationsEnabled: boolean;
}> {
  try {
    const result = await sdk.actions.addFrame();

    if (result && "added" in result) {
      return {
        added: true,
        notificationsEnabled: !!(result as any).notificationDetails,
      };
    }

    return { added: false, notificationsEnabled: false };
  } catch (err) {
    console.error("[farcaster] addMiniApp failed:", err);
    return { added: false, notificationsEnabled: false };
  }
}

/**
 * Authenticate via Quick Auth — returns a JWT token that can be verified
 * server-side with @farcaster/quick-auth without calling any external APIs.
 */
export async function quickAuth(): Promise<string | null> {
  try {
    const { token } = await sdk.quickAuth.getToken();
    return token;
  } catch (err) {
    console.error("[farcaster] quickAuth failed:", err);
    return null;
  }
}

export async function composeCast(text: string, embeds?: string[]): Promise<void> {
  try {
    await sdk.actions.composeCast({
      text,
      embeds: embeds as [] | [string] | [string, string] | undefined,
    });
  } catch {
    // Fallback: open compose URL in the correct client
    try {
      const client = getClientType();
      const base = client === "base" ? "https://farcaster.xyz" : "https://warpcast.com";
      await sdk.actions.openUrl(
        `${base}/~/compose?text=${encodeURIComponent(text)}${embeds?.length ? `&embeds[]=${encodeURIComponent(embeds[0])}` : ""}`,
      );
    } catch (err) {
      console.error("[farcaster] composeCast failed:", err);
    }
  }
}

/**
 * Reply to a cast — opens the native composer with the parent set.
 */
export async function replyCast(parentHash: string, text?: string): Promise<void> {
  try {
    await sdk.actions.composeCast({
      text: text || "",
      parent: { type: "cast", hash: parentHash },
    });
  } catch {
    // Fallback: open the cast in client (user can reply from there)
    try {
      await sdk.actions.viewCast({ hash: parentHash });
    } catch (err) {
      console.error("[farcaster] replyCast failed:", err);
    }
  }
}

/**
 * Quote-cast — opens the composer with the original cast URL embedded.
 */
export async function quoteCast(castUrl: string, text?: string): Promise<void> {
  try {
    await sdk.actions.composeCast({
      text: text || "",
      embeds: [castUrl],
    });
  } catch {
    try {
      const client = getClientType();
      const base = client === "base" ? "https://farcaster.xyz" : "https://warpcast.com";
      await sdk.actions.openUrl(
        `${base}/~/compose?embeds[]=${encodeURIComponent(castUrl)}`,
      );
    } catch (err) {
      console.error("[farcaster] quoteCast failed:", err);
    }
  }
}

/**
 * Open a cast in the native client (for liking, viewing thread, etc).
 */
export async function viewCast(hash: string, authorUsername?: string): Promise<void> {
  try {
    await sdk.actions.viewCast({ hash, authorUsername });
  } catch {
    const url = authorUsername
      ? getCastUrl(authorUsername, hash)
      : `https://warpcast.com/~/conversations/${hash}`;
    openUrl(url);
  }
}

/**
 * Open a profile in the native client.
 */
export async function viewProfile(fid: number): Promise<void> {
  try {
    await sdk.actions.viewProfile({ fid });
  } catch (err) {
    console.error("[farcaster] viewProfile failed:", err);
  }
}

export function openUrl(url: string): void {
  try {
    sdk.actions.openUrl(url);
  } catch {
    window.open(url, "_blank");
  }
}

export function shareToX(text: string, url?: string): void {
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}${url ? `&url=${encodeURIComponent(url)}` : ""}`;
  openUrl(tweetUrl);
}

export function copyToClipboard(text: string): Promise<boolean> {
  return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
}

// ============================================================================
// Haptics
// ============================================================================

/** Trigger impact haptic feedback. */
export async function hapticImpact(style: "light" | "medium" | "heavy" | "soft" | "rigid" = "medium"): Promise<void> {
  try { await sdk.haptics.impactOccurred(style); } catch {}
}

/** Trigger notification haptic feedback. */
export async function hapticNotification(type: "success" | "warning" | "error" = "success"): Promise<void> {
  try { await sdk.haptics.notificationOccurred(type); } catch {}
}

/** Trigger selection change haptic feedback. */
export async function hapticSelection(): Promise<void> {
  try { await sdk.haptics.selectionChanged(); } catch {}
}

// ============================================================================
// Wallet — Token Actions
// ============================================================================

// CAIP-19 token IDs for Base chain
export const BASE_USDC = "eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const BASE_ETH = "eip155:8453/native";

export type SendTokenResult = { success: true; tx: string } | { success: false; reason: string };
export type SwapTokenResult = { success: true; txs: string[] } | { success: false; reason: string };

/** Prompt user to send tokens to a recipient (by address or FID). */
export async function sendToken(opts: {
  token?: string;
  amount?: string;
  recipientAddress?: string;
  recipientFid?: number;
}): Promise<SendTokenResult> {
  try {
    const result = await sdk.actions.sendToken({
      token: opts.token,
      amount: opts.amount,
      recipientAddress: opts.recipientAddress,
      recipientFid: opts.recipientFid,
    });
    if (result.success) {
      hapticNotification("success");
      return { success: true, tx: result.send.transaction };
    }
    return { success: false, reason: result.reason };
  } catch (err) {
    console.error("[farcaster] sendToken failed:", err);
    return { success: false, reason: "send_failed" };
  }
}

/** Prompt user to swap tokens. */
export async function swapToken(opts: {
  sellToken?: string;
  buyToken?: string;
  sellAmount?: string;
}): Promise<SwapTokenResult> {
  try {
    const result = await sdk.actions.swapToken({
      sellToken: opts.sellToken,
      buyToken: opts.buyToken,
      sellAmount: opts.sellAmount,
    });
    if (result.success) {
      hapticNotification("success");
      return { success: true, txs: result.swap.transactions };
    }
    return { success: false, reason: result.reason };
  } catch (err) {
    console.error("[farcaster] swapToken failed:", err);
    return { success: false, reason: "swap_failed" };
  }
}

/** Open native token viewer. */
export async function viewToken(token: string): Promise<void> {
  try {
    await sdk.actions.viewToken({ token });
  } catch (err) {
    console.error("[farcaster] viewToken failed:", err);
  }
}

/** Get the EIP-1193 Ethereum provider for direct wallet interaction. */
export async function getWalletProvider() {
  try {
    return await sdk.wallet.getEthereumProvider();
  } catch (err) {
    console.error("[farcaster] getWalletProvider failed:", err);
    return undefined;
  }
}
