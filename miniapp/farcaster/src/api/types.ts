// Shared API types for FlowB mini apps

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
  imageUrl?: string;
}

export interface UserProfile {
  id: string;
  platform: "telegram" | "farcaster";
  tg_id?: number;
  fid?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  displayName?: string;
  pfpUrl?: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface ScheduleEntry {
  id: string;
  user_id: string;
  event_title: string;
  event_source?: string;
  event_source_id?: string;
  event_url?: string;
  venue_name?: string;
  starts_at: string;
  ends_at?: string;
  rsvp_status: "going" | "maybe";
  checked_in: boolean;
  checked_in_at?: string;
}

export interface CrewInfo {
  id: string;
  name: string;
  emoji: string;
  description?: string;
  join_code: string;
  max_members: number;
  event_context?: string;
  role: string;
  joinedAt: string;
}

export interface CrewMember {
  user_id: string;
  display_name?: string;
  role: string;
  joined_at: string;
}

export interface CrewCheckin {
  user_id: string;
  display_name?: string;
  venue_name: string;
  status: string;
  message?: string;
  created_at: string;
}

export interface CrewMessage {
  id: string;
  crew_id: string;
  user_id: string;
  display_name?: string;
  message: string;
  reply_to?: string;
  created_at: string;
}

export interface PointsInfo {
  points: number;
  streak: number;
  longestStreak: number;
  level: number;
}

export interface LeaderboardEntry {
  user_id: string;
  total_points: number;
  current_streak: number;
}

export interface EventSocial {
  goingCount: number;
  maybeCount: number;
  flowGoing?: number;
  flowMaybe?: number;
}

export interface PreferencesData {
  arrival_date?: string;
  interest_categories?: string[];
  quiet_hours_enabled?: boolean;
  timezone?: string;
  onboarding_complete?: boolean;
}

export interface FeedCast {
  hash: string;
  text: string;
  timestamp: string;
  author: {
    fid: number;
    username: string;
    display_name: string;
    pfp_url?: string;
  };
  reactions: {
    likes_count: number;
    recasts_count: number;
  };
  replies: {
    count: number;
  };
  embeds?: Array<{ url?: string }>;
  channel?: { id: string; name: string };
}

export interface FeedItem {
  type: "checkin" | "rsvp" | "join" | "message";
  user_id: string;
  display_name?: string;
  text: string;
  crew_name?: string;
  event_title?: string;
  venue_name?: string;
  created_at: string;
}
