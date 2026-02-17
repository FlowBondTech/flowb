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

export interface UserProfile {
  id: string;
  platform: "telegram" | "farcaster" | "app";
  tg_id?: number;
  fid?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  displayName?: string;
  pfpUrl?: string;
  role?: "admin" | "user";
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
  adminKey?: string;
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
  role: string;
  joined_at: string;
}

export interface CrewCheckin {
  user_id: string;
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

export interface AdminStats {
  totalUsers: number;
  totalCrews: number;
  totalRsvps: number;
  totalCheckins: number;
  topPoints: number;
}

export interface PluginInfo {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  actions: string[];
}

export interface NotificationStats {
  farcasterTokens: { active: number; disabled: number };
  pushTokens: { active: number };
}

export interface CrewMission {
  id: string;
  type: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  reward: number;
  completed: boolean;
}

export interface FeedCast {
  hash: string;
  author: {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl?: string;
  };
  text: string;
  timestamp: string;
  reactions: {
    likes: number;
    recasts: number;
  };
  replies: { count: number };
  embeds?: { url?: string }[];
}

export interface GlobalCrewRanking {
  crew_id: string;
  crew_name: string;
  crew_emoji: string;
  total_points: number;
  member_count: number;
  avg_points: number;
}

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
  venueId?: string;
  sponsorTier: 'diamond' | 'gold' | 'silver' | 'bronze' | 'community';
  companyUrl?: string;
  logoUrl?: string;
  bannerUrl?: string;
  twitterUrl?: string;
  farcasterUrl?: string;
  hasSwag: boolean;
  hasDemo: boolean;
  hasHiring: boolean;
  tags: string[];
  featured: boolean;
}
