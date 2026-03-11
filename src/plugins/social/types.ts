/**
 * Social Plugin Types
 *
 * Types for the Postiz-powered social media automation plugin.
 */

// ============================================================================
// Plugin Config
// ============================================================================

export interface SocialPluginConfig {
  supabaseUrl: string;
  supabaseKey: string;
  /** Self-hosted Postiz instance URL (internal Fly.io network) */
  postizBaseUrl: string;
  /** Admin API key for creating orgs */
  postizMasterApiKey: string;
  /** AES-256 hex key for encrypting per-org API keys */
  encryptionKey: string;
}

// ============================================================================
// Postiz API Types
// ============================================================================

export interface PostizPost {
  id: string;
  content: string;
  integration: PostizIntegrationRef[];
  state: "DRAFT" | "QUEUE" | "PUBLISHED" | "ERROR";
  publishDate?: string;
  releaseURL?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface PostizIntegrationRef {
  id: string;
  name: string;
  identifier: string;
  type: string;
  picture?: string;
}

export interface PostizIntegration {
  id: string;
  name: string;
  identifier: string;
  type: string;
  picture?: string;
  providerIdentifier: string;
  inBetweenSteps: boolean;
  disabled: boolean;
}

export interface PostizMedia {
  id: string;
  url: string;
  path: string;
  name: string;
}

export interface PostizOrg {
  id: string;
  name: string;
  allowedUsers?: number;
}

// ============================================================================
// FlowB Social Types
// ============================================================================

export interface SocialOrg {
  id: string;
  user_id: string;
  org_name: string;
  postiz_org_id: string;
  postiz_api_key_enc: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SocialOrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
}

export interface SocialPost {
  id: string;
  org_id: string;
  user_id: string;
  postiz_post_id: string | null;
  text: string;
  media_urls: string[];
  platforms: string[];
  status: "pending" | "published" | "scheduled" | "failed" | "cancelled";
  scheduled_at: string | null;
  published_at: string | null;
  points_awarded: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

// ============================================================================
// API Request / Response Types
// ============================================================================

export interface CreateOrgRequest {
  name: string;
}

export interface CreatePostRequest {
  orgId: string;
  text: string;
  platforms: string[];
  mediaUrls?: string[];
}

export interface SchedulePostRequest extends CreatePostRequest {
  scheduledAt: string;
}

export interface ConnectAccountRequest {
  orgId: string;
}

export interface AddMemberRequest {
  userId: string;
  role: "admin" | "member";
}

export interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  profileImage?: string;
}

export interface SocialProvider {
  id: string;
  name: string;
  icon: string;
}

export const SOCIAL_PROVIDERS: SocialProvider[] = [
  { id: "twitter", name: "X / Twitter", icon: "x" },
  { id: "instagram", name: "Instagram", icon: "instagram" },
  { id: "facebook", name: "Facebook", icon: "facebook" },
  { id: "linkedin", name: "LinkedIn", icon: "linkedin" },
  { id: "tiktok", name: "TikTok", icon: "tiktok" },
  { id: "threads", name: "Threads", icon: "threads" },
  { id: "youtube", name: "YouTube", icon: "youtube" },
  { id: "pinterest", name: "Pinterest", icon: "pinterest" },
  { id: "reddit", name: "Reddit", icon: "reddit" },
  { id: "bluesky", name: "Bluesky", icon: "bluesky" },
  { id: "mastodon", name: "Mastodon", icon: "mastodon" },
  { id: "farcaster", name: "Farcaster", icon: "farcaster" },
  { id: "telegram", name: "Telegram", icon: "telegram" },
  { id: "discord", name: "Discord", icon: "discord" },
];
