export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalCrews: number;
  totalRsvps: number;
  totalCheckins: number;
  totalPoints: number;
  platforms: { telegram: number; farcaster: number; web: number };
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  uptime: number;
  version?: string;
  plugins?: PluginHealth[];
}

export interface PluginHealth {
  name: string;
  status: 'ok' | 'error' | 'disabled';
  lastRun?: string;
}

export interface PluginInfo {
  id: string;
  name: string;
  enabled: boolean;
  description?: string;
  config?: Record<string, any>;
}

export interface AdminEvent {
  id: string;
  title: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  city?: string;
  source?: string;
  featured?: boolean;
  hidden?: boolean;
  rsvp_count?: number;
  categories?: string[];
  image_url?: string;
}

export interface Festival {
  id: string;
  name: string;
  slug: string;
  city?: string;
  image_url?: string;
  start_date?: string;
  end_date?: string;
  enabled: boolean;
  featured: boolean;
}

export interface Booth {
  id: string;
  name: string;
  slug: string;
  booth_number?: string;
  tier?: string;
  logo_url?: string;
  has_swag?: boolean;
  has_demo?: boolean;
  is_hiring?: boolean;
}

export interface Venue {
  id: string;
  name: string;
  venue_type?: string;
  capacity?: number;
  city?: string;
  is_main_venue?: boolean;
}

export interface AdminUser {
  user_id: string;
  display_name?: string;
  platform: string;
  level: number;
  streak: number;
  total_points: number;
  joined_at?: string;
}

export interface AdminCrew {
  id: string;
  name: string;
  emoji?: string;
  join_code: string;
  member_count: number;
  created_at?: string;
}

export interface AdminEntry {
  user_id: string;
  label?: string;
  permissions?: string[];
  created_at?: string;
}

export interface NotificationStats {
  totalTokens: number;
  telegramTokens: number;
  fcmTokens: number;
  apnsTokens: number;
}

export interface NotificationRecipient {
  user_id: string;
  display_name?: string;
  platform: string;
}

export interface EGatorStats {
  totalEvents: number;
  cities: number;
  lastScan?: string;
}

export interface ScanCity {
  city: string;
  enabled: boolean;
  event_count?: number;
}

export interface SupportTicket {
  id: string;
  subject: string;
  email?: string;
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
  updated_at?: string;
  messages?: SupportMessage[];
}

export interface SupportMessage {
  id: string;
  content: string;
  direction: 'inbound' | 'outbound';
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
