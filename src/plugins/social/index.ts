/**
 * Social Plugin for FlowB
 *
 * Multi-platform social media posting via self-hosted Postiz.
 * Manages org provisioning, connected accounts, and post lifecycle.
 * Each business gets an isolated Postiz organization with its own API key.
 */

import type {
  FlowBPlugin,
  FlowBContext,
  ToolInput,
} from "../../core/types.js";
import { sbQuery, sbInsert, sbPatch, type SbConfig } from "../../utils/supabase.js";
import { PostizClient } from "./postiz-client.js";
import { encrypt, decrypt } from "./crypto.js";
import {
  SOCIAL_PROVIDERS,
  type SocialPluginConfig,
  type SocialOrg,
  type SocialOrgMember,
  type SocialPost,
  type SocialAccount,
} from "./types.js";
import { log } from "../../utils/logger.js";

// ============================================================================
// Social Plugin
// ============================================================================

export class SocialPlugin implements FlowBPlugin {
  id = "social";
  name = "Social Post";
  description = "Post to all your social media platforms at once";

  actions: Record<string, { description: string; requiresAuth?: boolean }> = {
    "social-post":        { description: "Post to selected platforms immediately", requiresAuth: true },
    "social-schedule":    { description: "Schedule a post for later", requiresAuth: true },
    "social-cancel":      { description: "Cancel a scheduled post", requiresAuth: true },
    "social-accounts":    { description: "List connected social accounts", requiresAuth: true },
    "social-connect":     { description: "Get URL to connect a new platform", requiresAuth: true },
    "social-disconnect":  { description: "Remove a connected account", requiresAuth: true },
    "social-history":     { description: "View recent post history", requiresAuth: true },
    "social-providers":   { description: "List available platforms" },
  };

  private config: SocialPluginConfig | null = null;

  configure(config: SocialPluginConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return !!(
      this.config?.supabaseUrl &&
      this.config?.supabaseKey &&
      this.config?.postizBaseUrl &&
      this.config?.postizMasterApiKey &&
      this.config?.encryptionKey
    );
  }

  async execute(action: string, input: ToolInput, context: FlowBContext): Promise<string> {
    const cfg = this.config;
    if (!cfg) return "Social plugin not configured.";
    const uid = input.user_id;

    switch (action) {
      case "social-post":       return this.postNow(cfg, uid, input);
      case "social-schedule":   return this.schedulePost(cfg, uid, input);
      case "social-cancel":     return this.cancelPost(cfg, uid, input);
      case "social-accounts":   return this.listAccounts(cfg, uid, input);
      case "social-connect":    return this.getConnectUrl(cfg, uid, input);
      case "social-disconnect": return this.disconnectAccount(cfg, uid, input);
      case "social-history":    return this.postHistory(cfg, uid, input);
      case "social-providers":  return this.listProviders();
      default:
        return `Unknown social action: ${action}`;
    }
  }

  // ==========================================================================
  // Organization Management
  // ==========================================================================

  /**
   * Create a Postiz organization for a business and store encrypted API key.
   */
  async createOrg(
    cfg: SocialPluginConfig,
    userId: string,
    orgName: string,
  ): Promise<{ orgId: string; connectUrl: string } | null> {
    // Create org in Postiz
    const masterClient = new PostizClient(cfg.postizBaseUrl, cfg.postizMasterApiKey);
    const postizOrg = await masterClient.createOrganization(orgName);
    if (!postizOrg) {
      log.error("[social]", "Failed to create Postiz org", { orgName });
      return null;
    }

    // The org creation should return or we generate an API key
    // For now, use master key scoped to org (Postiz returns org-scoped key)
    const orgApiKey = cfg.postizMasterApiKey; // TODO: use per-org key from Postiz response

    // Encrypt the API key
    const encryptedKey = encrypt(orgApiKey, cfg.encryptionKey);

    // Store in Supabase
    const org = await sbInsert<SocialOrg>(cfg, "flowb_social_orgs", {
      user_id: userId,
      org_name: orgName,
      postiz_org_id: postizOrg.id,
      postiz_api_key_enc: encryptedKey,
      is_active: true,
    });

    if (!org) {
      log.error("[social]", "Failed to store social org", { userId, orgName });
      return null;
    }

    // Add creator as owner
    await sbInsert(cfg, "flowb_social_org_members", {
      org_id: org.id,
      user_id: userId,
      role: "owner",
    });

    const connectUrl = `${cfg.postizBaseUrl}/integrations`;

    return { orgId: org.id, connectUrl };
  }

  /**
   * Get a PostizClient for a specific org (decrypts the stored API key).
   */
  async getOrgClient(cfg: SocialPluginConfig, orgId: string): Promise<PostizClient | null> {
    const orgs = await sbQuery<SocialOrg[]>(cfg, "flowb_social_orgs", {
      select: "postiz_api_key_enc",
      id: `eq.${orgId}`,
      is_active: "eq.true",
      limit: "1",
    });

    if (!orgs?.length) return null;

    const apiKey = decrypt(orgs[0].postiz_api_key_enc, cfg.encryptionKey);
    return new PostizClient(cfg.postizBaseUrl, apiKey);
  }

  /**
   * Check if a user is a member of an org with at least the given role.
   */
  async checkOrgAccess(
    cfg: SocialPluginConfig,
    userId: string,
    orgId: string,
    minRole: "member" | "admin" | "owner" = "member",
  ): Promise<boolean> {
    const members = await sbQuery<SocialOrgMember[]>(cfg, "flowb_social_org_members", {
      select: "role",
      org_id: `eq.${orgId}`,
      user_id: `eq.${userId}`,
      limit: "1",
    });

    if (!members?.length) return false;

    const roleLevel: Record<string, number> = { member: 1, admin: 2, owner: 3 };
    return (roleLevel[members[0].role] || 0) >= (roleLevel[minRole] || 0);
  }

  /**
   * Get the user's default org (first one they own).
   */
  async getDefaultOrg(cfg: SocialPluginConfig, userId: string): Promise<SocialOrg | null> {
    const orgs = await sbQuery<SocialOrg[]>(cfg, "flowb_social_orgs", {
      select: "*",
      user_id: `eq.${userId}`,
      is_active: "eq.true",
      order: "created_at.asc",
      limit: "1",
    });
    return orgs?.[0] || null;
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  private async postNow(cfg: SocialPluginConfig, uid?: string, input?: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";

    const orgId = input?.org_id;
    const text = input?.query;
    const platforms: string[] = input?.platforms || [];
    const mediaUrls: string[] = input?.media_urls || [];

    if (!text) return "Post text is required.";
    if (!platforms.length) return "Select at least one platform.";

    // Resolve org
    let org: SocialOrg | null = null;
    if (orgId) {
      if (!await this.checkOrgAccess(cfg, uid, orgId)) {
        return "You don't have access to this organization.";
      }
      const orgs = await sbQuery<SocialOrg[]>(cfg, "flowb_social_orgs", {
        select: "*", id: `eq.${orgId}`, limit: "1",
      });
      org = orgs?.[0] || null;
    } else {
      org = await this.getDefaultOrg(cfg, uid);
    }

    if (!org) return "No social organization found. Create one first.";

    const client = await this.getOrgClient(cfg, org.id);
    if (!client) return "Failed to connect to posting service.";

    // Get integrations to map platform names to integration IDs
    const integrations = await client.listIntegrations();
    const integrationIds = integrations
      .filter((i) => platforms.includes(i.type.toLowerCase()) || platforms.includes(i.providerIdentifier?.toLowerCase()))
      .map((i) => i.id);

    if (!integrationIds.length) {
      return `No connected accounts found for: ${platforms.join(", ")}. Connect accounts first.`;
    }

    // Upload media if provided
    let mediaIds: string[] | undefined;
    if (mediaUrls.length) {
      const uploaded = await Promise.all(
        mediaUrls.map((url) => client.uploadMediaFromUrl(url)),
      );
      mediaIds = uploaded.filter(Boolean).map((m) => m!.id);
    }

    // Create the post
    const postizPost = await client.createPost(integrationIds, text, mediaIds);
    if (!postizPost) return "Failed to create post. Please try again.";

    // Record in FlowB
    const record = await sbInsert<SocialPost>(cfg, "flowb_social_posts", {
      org_id: org.id,
      user_id: uid,
      postiz_post_id: postizPost.id,
      text,
      media_urls: JSON.stringify(mediaUrls),
      platforms,
      status: "published",
      published_at: new Date().toISOString(),
      metadata: {},
    });

    return JSON.stringify({
      success: true,
      postId: record?.id,
      postizPostId: postizPost.id,
      platforms: integrationIds.length,
      status: "published",
    });
  }

  private async schedulePost(cfg: SocialPluginConfig, uid?: string, input?: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";

    const orgId = input?.org_id;
    const text = input?.query;
    const platforms: string[] = input?.platforms || [];
    const scheduledAt = input?.scheduled_at;
    const mediaUrls: string[] = input?.media_urls || [];

    if (!text) return "Post text is required.";
    if (!platforms.length) return "Select at least one platform.";
    if (!scheduledAt) return "Schedule date is required.";

    // Validate schedule date is in the future
    if (new Date(scheduledAt) <= new Date()) {
      return "Schedule date must be in the future.";
    }

    let org: SocialOrg | null = null;
    if (orgId) {
      if (!await this.checkOrgAccess(cfg, uid, orgId)) {
        return "You don't have access to this organization.";
      }
      const orgs = await sbQuery<SocialOrg[]>(cfg, "flowb_social_orgs", {
        select: "*", id: `eq.${orgId}`, limit: "1",
      });
      org = orgs?.[0] || null;
    } else {
      org = await this.getDefaultOrg(cfg, uid);
    }

    if (!org) return "No social organization found. Create one first.";

    const client = await this.getOrgClient(cfg, org.id);
    if (!client) return "Failed to connect to posting service.";

    const integrations = await client.listIntegrations();
    const integrationIds = integrations
      .filter((i) => platforms.includes(i.type.toLowerCase()) || platforms.includes(i.providerIdentifier?.toLowerCase()))
      .map((i) => i.id);

    if (!integrationIds.length) {
      return `No connected accounts found for: ${platforms.join(", ")}. Connect accounts first.`;
    }

    let mediaIds: string[] | undefined;
    if (mediaUrls.length) {
      const uploaded = await Promise.all(
        mediaUrls.map((url) => client.uploadMediaFromUrl(url)),
      );
      mediaIds = uploaded.filter(Boolean).map((m) => m!.id);
    }

    const postizPost = await client.createPost(integrationIds, text, mediaIds, scheduledAt);
    if (!postizPost) return "Failed to schedule post. Please try again.";

    const record = await sbInsert<SocialPost>(cfg, "flowb_social_posts", {
      org_id: org.id,
      user_id: uid,
      postiz_post_id: postizPost.id,
      text,
      media_urls: JSON.stringify(mediaUrls),
      platforms,
      status: "scheduled",
      scheduled_at: scheduledAt,
      metadata: {},
    });

    return JSON.stringify({
      success: true,
      postId: record?.id,
      postizPostId: postizPost.id,
      platforms: integrationIds.length,
      status: "scheduled",
      scheduledAt,
    });
  }

  private async cancelPost(cfg: SocialPluginConfig, uid?: string, input?: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";

    const postId = input?.post_id;
    if (!postId) return "Post ID required.";

    // Look up the FlowB post record
    const posts = await sbQuery<SocialPost[]>(cfg, "flowb_social_posts", {
      select: "id,org_id,user_id,postiz_post_id,status",
      id: `eq.${postId}`,
      limit: "1",
    });

    if (!posts?.length) return "Post not found.";
    const post = posts[0];

    if (post.user_id !== uid) {
      if (!await this.checkOrgAccess(cfg, uid, post.org_id, "admin")) {
        return "You can only cancel your own posts.";
      }
    }

    if (post.status === "published") return "Cannot cancel a published post.";
    if (post.status === "cancelled") return "Post is already cancelled.";

    // Delete from Postiz
    if (post.postiz_post_id) {
      const client = await this.getOrgClient(cfg, post.org_id);
      if (client) {
        await client.deletePost(post.postiz_post_id);
      }
    }

    // Update FlowB record
    await sbPatch(cfg, "flowb_social_posts", { id: `eq.${postId}` }, {
      status: "cancelled",
    });

    return "Post cancelled.";
  }

  private async listAccounts(cfg: SocialPluginConfig, uid?: string, input?: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";

    const orgId = input?.org_id;
    let org: SocialOrg | null = null;

    if (orgId) {
      if (!await this.checkOrgAccess(cfg, uid, orgId)) {
        return "You don't have access to this organization.";
      }
      const orgs = await sbQuery<SocialOrg[]>(cfg, "flowb_social_orgs", {
        select: "*", id: `eq.${orgId}`, limit: "1",
      });
      org = orgs?.[0] || null;
    } else {
      org = await this.getDefaultOrg(cfg, uid);
    }

    if (!org) return "No social organization found.";

    const client = await this.getOrgClient(cfg, org.id);
    if (!client) return "Failed to connect to posting service.";

    const integrations = await client.listIntegrations();

    const accounts: SocialAccount[] = integrations
      .filter((i) => !i.disabled)
      .map((i) => ({
        id: i.id,
        platform: i.type.toLowerCase(),
        username: i.name || i.identifier,
        profileImage: i.picture,
      }));

    return JSON.stringify({ accounts, orgId: org.id, orgName: org.org_name });
  }

  private async getConnectUrl(cfg: SocialPluginConfig, uid?: string, input?: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";

    const orgId = input?.org_id;
    let org: SocialOrg | null = null;

    if (orgId) {
      if (!await this.checkOrgAccess(cfg, uid, orgId)) {
        return "You don't have access to this organization.";
      }
      const orgs = await sbQuery<SocialOrg[]>(cfg, "flowb_social_orgs", {
        select: "*", id: `eq.${orgId}`, limit: "1",
      });
      org = orgs?.[0] || null;
    } else {
      org = await this.getDefaultOrg(cfg, uid);
    }

    if (!org) return "No social organization found. Create one first.";

    // Return the Postiz integrations page URL for this org
    const connectUrl = `${cfg.postizBaseUrl}/integrations`;

    return JSON.stringify({ connectUrl, orgId: org.id });
  }

  private async disconnectAccount(cfg: SocialPluginConfig, uid?: string, input?: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";

    const integrationId = input?.integration_id;
    const orgId = input?.org_id;

    if (!integrationId) return "Integration ID required.";
    if (!orgId) return "Org ID required.";

    if (!await this.checkOrgAccess(cfg, uid, orgId, "admin")) {
      return "Only org admins can disconnect accounts.";
    }

    // Disconnecting is done via Postiz UI, not API
    const connectUrl = `${cfg.postizBaseUrl}/integrations`;
    return JSON.stringify({
      message: "Visit the integrations page to manage connected accounts.",
      connectUrl,
    });
  }

  private async postHistory(cfg: SocialPluginConfig, uid?: string, input?: ToolInput): Promise<string> {
    if (!uid) return "User ID required.";

    const orgId = input?.org_id;
    const limit = 20;
    const offset = 0;

    let org: SocialOrg | null = null;
    if (orgId) {
      if (!await this.checkOrgAccess(cfg, uid, orgId)) {
        return "You don't have access to this organization.";
      }
      const orgs = await sbQuery<SocialOrg[]>(cfg, "flowb_social_orgs", {
        select: "*", id: `eq.${orgId}`, limit: "1",
      });
      org = orgs?.[0] || null;
    } else {
      org = await this.getDefaultOrg(cfg, uid);
    }

    if (!org) return "No social organization found.";

    const posts = await sbQuery<SocialPost[]>(cfg, "flowb_social_posts", {
      select: "id,text,platforms,status,scheduled_at,published_at,created_at",
      org_id: `eq.${org.id}`,
      order: "created_at.desc",
      limit: String(limit),
      offset: String(offset),
    });

    return JSON.stringify({
      posts: posts || [],
      orgId: org.id,
      orgName: org.org_name,
    });
  }

  private listProviders(): string {
    return JSON.stringify({ providers: SOCIAL_PROVIDERS });
  }
}
