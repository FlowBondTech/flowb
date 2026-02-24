/**
 * SocialB Types
 *
 * Auto-repost Farcaster casts to all connected platforms.
 */

// ============================================================================
// Config (DB row: flowb_socialb_configs)
// ============================================================================

export interface SocialBConfig {
  id: string;
  user_id: string;
  org_id: string;
  farcaster_fid: number;
  enabled: boolean;
  platforms: string[];
  webhook_id: string | null;
  last_cast_hash: string | null;
  auto_media: boolean;
  include_links: boolean;
  exclude_replies: boolean;
  exclude_recasts: boolean;
  daily_limit: number;
  posts_today: number;
  posts_today_reset: string;
  tier: "free" | "pro";
  chat_queries_today: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Activity (DB row: flowb_socialb_activity)
// ============================================================================

export interface SocialBActivity {
  id: string;
  config_id: string;
  user_id: string;
  cast_hash: string;
  cast_text: string | null;
  platforms_attempted: string[];
  platforms_succeeded: string[];
  platforms_failed: string[];
  social_post_id: string | null;
  error_message: string | null;
  created_at: string;
}

// ============================================================================
// Platform character limits
// ============================================================================

export const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  twitter: 280,
  x: 280,
  threads: 500,
  bluesky: 300,
  instagram: 2200,
  linkedin: 3000,
  facebook: 63000,
  tiktok: 2200,
  mastodon: 500,
};

// ============================================================================
// Tier limits
// ============================================================================

export const TIER_LIMITS = {
  free: { reposts_per_day: 5, chat_queries_per_day: 5 },
  pro: { reposts_per_day: Infinity, chat_queries_per_day: Infinity },
};

// ============================================================================
// Cast from Neynar webhook / feed
// ============================================================================

export interface NeynarCast {
  hash: string;
  author: { fid: number; username: string; display_name: string };
  text: string;
  timestamp: string;
  embeds: Array<{ url?: string; metadata?: { content_type?: string } }>;
  parent_hash: string | null;
  parent_url: string | null;
  reactions: { likes_count: number; recasts_count: number };
  replies: { count: number };
}
