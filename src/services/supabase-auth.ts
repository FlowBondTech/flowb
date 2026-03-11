/**
 * Supabase Auth Admin Service
 *
 * Server-side utilities for creating and managing Supabase Auth users
 * as part of the FlowB Passport system. Uses the service_role key
 * for admin operations (creating users, linking identities).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { log } from "../utils/logger.js";

// Lazy singleton -- initialized on first call
let adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient | null {
  if (adminClient) return adminClient;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    log.warn("[supabase-auth]", "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return null;
  }

  adminClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return adminClient;
}

// ============================================================================
// Public API
// ============================================================================

export interface SupabaseUserResult {
  uid: string;
  email?: string;
  isNew: boolean;
}

/**
 * Find or create a Supabase Auth user for a given platform identity.
 * Also upserts the flowb_passport mapping table.
 */
export async function getOrCreateSupabaseUser(
  platformUserId: string,
  platform: string,
  opts?: { email?: string; displayName?: string; avatarUrl?: string },
): Promise<SupabaseUserResult | null> {
  const client = getAdminClient();
  if (!client) return null;

  try {
    // 1. Check if this platform user already has a passport mapping
    const { data: existing } = await client
      .from("flowb_passport")
      .select("supabase_uid, email")
      .eq("canonical_id", platformUserId)
      .limit(1)
      .single();

    if (existing) {
      return { uid: existing.supabase_uid, email: existing.email, isNew: false };
    }

    // 2. Also check flowb_identities for an existing supabase_uid
    const { data: identityRow } = await client
      .from("flowb_identities")
      .select("supabase_uid")
      .eq("platform_user_id", platformUserId)
      .not("supabase_uid", "is", null)
      .limit(1)
      .single();

    if (identityRow?.supabase_uid) {
      // Passport row missing but identity has uid -- create passport
      await upsertPassport(client, identityRow.supabase_uid, platformUserId, opts);
      return { uid: identityRow.supabase_uid, email: opts?.email, isNew: false };
    }

    // 3. Create new Supabase Auth user
    const email = opts?.email;
    const userMetadata: Record<string, string> = {
      platform,
      platform_user_id: platformUserId,
    };
    if (opts?.displayName) userMetadata.display_name = opts.displayName;

    const createOpts: any = {
      email: email || `${platformUserId.replace(/[^a-zA-Z0-9_-]/g, "")}@passport.flowb.me`,
      email_confirm: true,
      user_metadata: userMetadata,
      app_metadata: {
        platform,
        platform_user_id: platformUserId,
        provider: "flowb_passport",
      },
    };

    // If no real email, generate a deterministic password so the user
    // isn't left with an unusable account (they can reset later)
    if (!email) {
      createOpts.password = `fp_${platformUserId}_${Date.now()}`;
    }

    const { data: newUser, error } = await client.auth.admin.createUser(createOpts);
    if (error) {
      // If user already exists with this email, try to find them
      if (error.message?.includes("already been registered") && email) {
        const { data: listData } = await client.auth.admin.listUsers({ perPage: 1 });
        // Fall back to searching by email in passport table
        const { data: byEmail } = await client
          .from("flowb_passport")
          .select("supabase_uid")
          .eq("email", email)
          .limit(1)
          .single();

        if (byEmail) {
          await linkPlatformIdentity(byEmail.supabase_uid, platform, platformUserId);
          return { uid: byEmail.supabase_uid, email, isNew: false };
        }
      }
      log.error("[supabase-auth]", "createUser failed", { error: error.message, platformUserId });
      return null;
    }

    const uid = newUser.user.id;

    // 4. Create passport mapping
    await upsertPassport(client, uid, platformUserId, opts);

    // 5. Link in flowb_identities
    await linkPlatformIdentity(uid, platform, platformUserId);

    return { uid, email: opts?.email, isNew: true };
  } catch (err: any) {
    log.error("[supabase-auth]", "getOrCreateSupabaseUser error", {
      error: err.message,
      platformUserId,
    });
    return null;
  }
}

/**
 * Verify a Supabase Auth access token and return the user's UUID.
 */
export async function verifySupabaseToken(
  accessToken: string,
): Promise<{ uid: string; email?: string } | null> {
  const client = getAdminClient();
  if (!client) return null;

  try {
    const { data, error } = await client.auth.getUser(accessToken);
    if (error || !data.user) {
      log.warn("[supabase-auth]", "Token verification failed", { error: error?.message });
      return null;
    }
    return {
      uid: data.user.id,
      email: data.user.email,
    };
  } catch (err: any) {
    log.error("[supabase-auth]", "verifySupabaseToken error", { error: err.message });
    return null;
  }
}

/**
 * Update flowb_identities.supabase_uid for a platform user.
 */
export async function linkPlatformIdentity(
  supabaseUid: string,
  platform: string,
  platformUserId: string,
): Promise<void> {
  const client = getAdminClient();
  if (!client) return;

  try {
    await client
      .from("flowb_identities")
      .update({ supabase_uid: supabaseUid })
      .eq("platform_user_id", platformUserId);
  } catch (err: any) {
    log.warn("[supabase-auth]", "linkPlatformIdentity failed", { error: err.message, platformUserId });
  }
}

// ============================================================================
// Internal helpers
// ============================================================================

async function upsertPassport(
  client: SupabaseClient,
  supabaseUid: string,
  canonicalId: string,
  opts?: { email?: string; displayName?: string; avatarUrl?: string },
): Promise<void> {
  try {
    await client.from("flowb_passport").upsert(
      {
        supabase_uid: supabaseUid,
        canonical_id: canonicalId,
        email: opts?.email || null,
        display_name: opts?.displayName || null,
        avatar_url: opts?.avatarUrl || null,
      },
      { onConflict: "supabase_uid" },
    );
  } catch (err: any) {
    log.warn("[supabase-auth]", "upsertPassport failed", { error: err.message, supabaseUid });
  }
}
