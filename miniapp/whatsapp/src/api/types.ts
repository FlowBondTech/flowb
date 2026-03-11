/**
 * Shared API types for the WhatsApp mini app
 * Mirrors miniapp/telegram/src/api/types.ts
 */

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  platform: string;
  username?: string;
  displayName?: string;
  points?: number;
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
  imageUrl?: string;
  coverUrl?: string;
  categories?: string[];
  tags?: string[];
  rsvpCount?: number;
  url?: string;
}

export interface ScheduleEntry {
  id: string;
  event_id: string;
  title: string;
  start_time: string;
  end_time?: string;
  location_name?: string;
  status: string;
  checked_in: boolean;
}

export interface CrewInfo {
  id: string;
  name: string;
  emoji?: string;
  description?: string;
  member_count: number;
  join_code: string;
  is_member: boolean;
}

export interface PointsInfo {
  total_points: number;
  streak: number;
  rank?: number;
}
