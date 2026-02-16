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
