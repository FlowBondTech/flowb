/**
 * Farcaster Mini App SDK helpers
 */

import sdk from "@farcaster/frame-sdk";

let sdkReady = false;

export async function initFarcaster(): Promise<{
  fid?: number;
  username?: string;
  added?: boolean;
}> {
  if (sdkReady) return {};

  try {
    // Get context from the Farcaster client
    const context = await sdk.context;
    sdkReady = true;

    // Tell the client we're ready (hides splash screen)
    sdk.actions.ready();

    return {
      fid: context?.user?.fid,
      username: context?.user?.username,
      // Check if user has already added the mini app
      added: !!(context as any)?.client?.added,
    };
  } catch (err) {
    console.error("[farcaster] SDK init failed:", err);
    return {};
  }
}

/**
 * Prompt user to add the mini app to their favorites and enable notifications.
 * Returns true if the user added it (with or without notifications).
 * Only works on the production domain matching the manifest.
 *
 * Uses sdk.actions.addFrame (SDK 0.x) — maps to addMiniApp in the client.
 */
export async function promptAddMiniApp(): Promise<{
  added: boolean;
  notificationsEnabled: boolean;
}> {
  try {
    const result = await sdk.actions.addFrame();

    if (result && "added" in result) {
      // User accepted — notificationDetails present if they enabled notifs
      return {
        added: true,
        notificationsEnabled: !!(result as any).notificationDetails,
      };
    }

    // result has "reason" if rejected
    return { added: false, notificationsEnabled: false };
  } catch (err) {
    console.error("[farcaster] addMiniApp failed:", err);
    return { added: false, notificationsEnabled: false };
  }
}

export async function signIn(): Promise<{ message: string; signature: string } | null> {
  try {
    const nonce = crypto.randomUUID();
    const result = await sdk.actions.signIn({ nonce });

    if (result?.message && result?.signature) {
      return {
        message: result.message,
        signature: result.signature,
      };
    }
    return null;
  } catch (err) {
    console.error("[farcaster] signIn failed:", err);
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
