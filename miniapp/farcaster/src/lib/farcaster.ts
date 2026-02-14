/**
 * Farcaster Mini App SDK helpers
 */

import sdk from "@farcaster/frame-sdk";

let sdkReady = false;

export async function initFarcaster(): Promise<{ fid?: number; username?: string }> {
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
    };
  } catch (err) {
    console.error("[farcaster] SDK init failed:", err);
    return {};
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
