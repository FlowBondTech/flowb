/** Notification priority levels: P0 = critical, P1 = important, P2 = info */
export type NotificationPriority = "p0" | "p1" | "p2";

export type NotificationType =
  | "crew_checkin"
  | "friend_rsvp"
  | "event_reminder"
  | "crew_message"
  | "meeting"
  | "points"
  | "system";

export interface Notification {
  id: string;
  notification_type: NotificationType;
  title: string;
  body: string;
  priority: NotificationPriority;
  read_at: string | null;
  sent_at: string;
  data?: Record<string, any>;
}

export interface UserProfile {
  id: string;
  platform: "telegram" | "farcaster" | "app" | "web";
  tg_id?: number;
  fid?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  displayName?: string;
  pfpUrl?: string;
  role?: "admin" | "user";
  email?: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
  adminKey?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unread: number;
}

export interface UserPreferences {
  categories?: Record<string, boolean>;
  min_priority?: NotificationPriority;
  push_enabled?: boolean;
}
