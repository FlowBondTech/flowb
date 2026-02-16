/**
 * Farcaster Mini App SDK helpers
 * Uses @farcaster/miniapp-sdk (replaces old @farcaster/frame-sdk)
 */

import { sdk } from "@farcaster/miniapp-sdk";

let sdkReady = false;

/**
 * Detect whether we're running inside a Farcaster/Base mini app context.
 */
export async function isInMiniApp(): Promise<boolean> {
  try {
    return await sdk.isInMiniApp();
  } catch {
    return false;
  }
}

export async function initFarcaster(): Promise<{
  fid?: number;
  username?: string;
  added?: boolean;
}> {
  if (sdkReady) return {};

  try {
    const context = await sdk.context;
    sdkReady = true;

    // Tell the client we're ready (hides splash screen)
    await sdk.actions.ready();

    return {
      fid: context?.user?.fid,
      username: context?.user?.username,
      added: !!(context as any)?.client?.added,
    };
  } catch (err) {
    console.error("[farcaster] SDK init failed:", err);
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
