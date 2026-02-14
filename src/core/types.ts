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
    trading?: TradingPluginConfig;
    flow?: FlowPluginConfig;
    [key: string]: any;
  };
}

export interface DANZPluginConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export interface EGatorPluginConfig {
  apiBaseUrl: string;
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

export interface CDPPluginConfig {
  apiKeyName: string;
  apiKeyPrivateKey: string;
  walletSecret: string;
  accountAddress: string;
}

export interface TradingPluginConfig extends CDPPluginConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export interface FlowPluginConfig {
  supabaseUrl: string;
  supabaseKey: string;
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
  locationName?: string;
  locationCity?: string;
  price?: number;
  isFree?: boolean;
  isVirtual?: boolean;
  danceStyles?: string[];
  skillLevel?: string;
  source: string;
  url?: string;
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
  platform?: "telegram" | "discord" | "farcaster" | "openclaw";
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
  // Trading fields
  token_from?: string;
  token_to?: string;
  amount?: string;
  slippage_bps?: number;
  // Battle fields
  battle_id?: string;
  pool_type?: "winner_take_all" | "top_3" | "proportional";
  entry_fee?: string;
  // Flow fields
  group_id?: string;
  friend_id?: string;
  event_status?: "going" | "maybe";
  visibility?: "friends" | "groups" | "public" | "private";
}
