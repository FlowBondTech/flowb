/**
 * Farcaster Mini App SDK helpers
 * Uses @farcaster/miniapp-sdk (replaces old @farcaster/frame-sdk)
 */

import { sdk } from "@farcaster/miniapp-sdk";

let sdkReady = false;

/**
 * Detect whether we're running inside a Farcaster/Base mini app context.
 * Falls back to iframe/UA/URL detection if SDK check fails (Base app issue).
 */
export async function isInMiniApp(): Promise<boolean> {
  try {
    const sdkResult = await sdk.isInMiniApp();
    if (sdkResult) return true;
  } catch {}

  // Fallback: iframe detection (mini apps run in iframes)
  if (typeof window !== "undefined") {
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
    await sdk.actions.openUrl(
      `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}${embeds?.length ? `&embeds[]=${encodeURIComponent(embeds[0])}` : ""}`,
    );
  } catch (err) {
    console.error("[farcaster] composeCast failed:", err);
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
