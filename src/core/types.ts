// ============================================================================
// FlowB Core Types
// ============================================================================

export interface FlowBConfig {
  // Plugin-specific configs
  plugins?: {
    danz?: DANZPluginConfig;
    egator?: EGatorPluginConfig;
    neynar?: NeynarPluginConfig;
    privy?: PrivyPluginConfig;
    points?: PointsPluginConfig;
    cdp?: CDPPluginConfig;
    flow?: FlowPluginConfig;
    [key: string]: any;
  };
}

export interface DANZPluginConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export interface EGatorPluginConfig {
  sources?: {
    luma?: { apiKey: string };
  };
}

/** Adapter that fetches events from a single source */
export interface EventSourceAdapter {
  id: string;
  name: string;
  fetchEvents(params: EventQuery): Promise<EventResult[]>;
}

export interface NeynarPluginConfig {
  apiKey: string;
  agentToken?: string;
}

export interface PrivyPluginConfig {
  appId: string;
  appSecret: string;
}

export interface PointsPluginConfig {
  supabaseUrl: string;
  supabaseKey: string;
}


export interface FlowPluginConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export interface CDPPluginConfig {
  apiKeyName: string;
  apiKeyPrivateKey: string;
  walletSecret: string;
  accountAddress: string;
}

// ============================================================================
// FlowB Plugin Interface
// ============================================================================

export interface FlowBPlugin {
  /** Unique plugin identifier */
  id: string;

  /** Display name */
  name: string;

  /** Short description */
  description: string;

  /** Actions this plugin handles */
  actions: Record<string, {
    description: string;
    requiresAuth?: boolean;
  }>;

  /** Configure the plugin */
  configure(config: any): void;

  /** Check if plugin is configured and ready */
  isConfigured(): boolean;

  /** Execute an action */
  execute(action: string, input: ToolInput, context: FlowBContext): Promise<string>;
}

/** Plugin that can provide events */
export interface EventProvider {
  /** Fetch events for discovery */
  getEvents(params: EventQuery): Promise<EventResult[]>;

  /** Source identifier for attribution */
  eventSource: string;
}

export interface EventQuery {
  city?: string;
  category?: string;
  danceStyle?: string;
  limit?: number;
}

export interface EventResult {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  allDay?: boolean;
  locationName?: string;
  locationCity?: string;
  venueId?: string;
  latitude?: number;
  longitude?: number;
  price?: number;
  isFree?: boolean;
  isVirtual?: boolean;
  virtualUrl?: string;
  ticketUrl?: string;
  danceStyles?: string[];
  skillLevel?: string;
  source: string;
  sourceEventId?: string;
  url?: string;
  imageUrl?: string;
  coverUrl?: string;
  organizerName?: string;
  organizerUrl?: string;
  eventType?: string;
  categories?: string[];
  tags?: string[];
  zoneSlug?: string;
  zoneName?: string;
  rsvpCount?: number;
  featured?: boolean;
  qualityScore?: number;
}

// ============================================================================
// Zone, Venue, Category, Booth, Identity
// ============================================================================

export interface Zone {
  id: string;
  slug: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  zoneType: 'theme' | 'activation' | 'general';
  floor?: string;
  sortOrder: number;
}

export interface Venue {
  id: string;
  slug: string;
  name: string;
  shortName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  venueType: string;
  capacity?: number;
  websiteUrl?: string;
  imageUrl?: string;
  zoneId?: string;
  isMainVenue: boolean;
}

export interface EventCategory {
  id: string;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  parentId?: string;
  sortOrder: number;
}

export interface Booth {
  id: string;
  name: string;
  slug: string;
  description?: string;
  boothNumber?: string;
  zoneId?: string;
  zoneName?: string;
  venueId?: string;
  sponsorTier: 'diamond' | 'gold' | 'silver' | 'bronze' | 'community';
  companyUrl?: string;
  logoUrl?: string;
  bannerUrl?: string;
  twitterUrl?: string;
  farcasterUrl?: string;
  discordUrl?: string;
  telegramUrl?: string;
  floor?: string;
  latitude?: number;
  longitude?: number;
  hasSwag: boolean;
  hasDemo: boolean;
  hasHiring: boolean;
  tags: string[];
  featured: boolean;
}

export interface UserIdentity {
  id: string;
  canonicalId: string;
  platform: 'telegram' | 'farcaster' | 'web';
  platformUserId: string;
  privyId?: string;
  displayName?: string;
  avatarUrl?: string;
  linkedAt: string;
}

// ============================================================================
// Channel Chatter Signal
// ============================================================================

export interface ChatterSignal {
  event_title?: string;
  event_date?: string;
  event_time?: string;
  parsed_datetime?: string;
  venue_name?: string;
  event_url?: string;
  description?: string;
  confidence: number;
}

// ============================================================================
// FlowB Context & Input
// ============================================================================

export interface FlowBContext {
  userId?: string;
  platform: string;
  config: FlowBConfig;
}

export interface ToolInput {
  action: string;
  user_id?: string;
  platform?: "telegram" | "discord" | "farcaster" | "openclaw" | "app";
  platform_username?: string;
  danz_username?: string;
  city?: string;
  category?: string;
  dance_style?: string;
  query?: string;
  wallet_address?: string;
  challenge_id?: string;
  farcaster_username?: string;
  farcaster_channel?: string;
  page?: number;
  event_numbers?: string;
  event_id?: string;
  dance_move?: string;
  photo_file_id?: string;
  referral_code?: string;
  // Flow fields
  group_id?: string;
  friend_id?: string;
  event_status?: "going" | "maybe";
  visibility?: "friends" | "groups" | "public" | "private";
  url?: string;
}
