// API Response Types matching backend responses

// User types (from backend UserService)
export interface BackendUser {
  id: string
  privy_id: string
  role?: 'user' | 'manager' | 'admin'
  email?: string
  wallet_address?: string
  google_id?: string
  username?: string
  display_name?: string
  bio?: string
  avatar_url?: string
  cover_image_url?: string
  location?: string
  city?: string
  website?: string
  instagram?: string
  tiktok?: string
  youtube?: string
  twitter?: string
  dance_styles?: string[]
  skill_level?: string
  age?: number
  pronouns?: string
  created_at: string
  updated_at: string
}

// Auth API responses
export interface LoginResponse {
  message: string
  user: BackendUser
}

export interface VerifyTokenResponse {
  valid: boolean
  user?: BackendUser
  error?: string
}

export interface LogoutResponse {
  message: string
}

// User API responses
export interface GetProfileResponse {
  user: BackendUser
}

export interface UpdateProfileResponse {
  user: BackendUser
}

export interface DeleteAccountResponse {
  message: string
}

export interface CheckUsernameResponse {
  available: boolean
}

export interface GetUserByUsernameResponse {
  user: BackendUser
}

// Profile API responses
export interface ProfileData {
  id: string
  user_id: string
  dance_styles?: string[]
  location?: string
  level?: string
  xp?: number
  metadata?: any
  created_at: string
  updated_at: string
}

export interface ProfileResponse {
  success: boolean
  data?: ProfileData
  error?: string
}

// Wallet API responses
export interface WalletData {
  id: string
  user_id: string
  balance: number
  today_earnings: number
  weekly_earnings: number
  total_earnings: number
  streak: number
  best_streak: number
  last_active_date: string
  last_streak_claim?: string
  created_at: string
  updated_at: string
}

export interface WalletResponse {
  success: boolean
  data?: WalletData
  error?: string
}

export interface DanzTransactionResponse {
  success: boolean
  data?: {
    wallet: WalletData
    transaction: any
  }
  error?: string
}

export interface UpdateStreakResponse {
  success: boolean
  data?: {
    wallet: WalletData
    reward: number
    isNewRecord: boolean
  }
  error?: string
}

// Event API responses
export interface EventData {
  id: string
  title: string
  description?: string
  category?: string
  facilitator_id: string
  date_time: string
  duration_minutes?: number
  location?: string
  venue?: string
  address?: string
  price?: number
  max_participants?: number
  current_participants?: number
  metadata?: any
  created_at: string
  updated_at: string
}

export interface EventResponse {
  success: boolean
  data?: EventData
  error?: string
}

export interface EventListResponse {
  success: boolean
  data?: EventData[]
  error?: string
}

export interface EventParticipant {
  id: string
  event_id: string
  user_id: string
  status: 'registered' | 'checked_in' | 'cancelled'
  payment_method?: string
  registered_at: string
  checked_in_at?: string
  user?: BackendUser
}

export interface EventParticipantsResponse {
  success: boolean
  data?: EventParticipant[]
  error?: string
}

export interface EventRegistrationResponse {
  success: boolean
  data?: EventParticipant
  error?: string
}

// Feed API responses
export interface FeedPost {
  id: string
  user_id: string
  content?: string
  media_url?: string
  media_type?: 'image' | 'video'
  likes_count: number
  comments_count: number
  shares_count: number
  is_pinned: boolean
  metadata?: any
  created_at: string
  updated_at: string
  user?: BackendUser
}

export interface FeedResponse {
  success: boolean
  data?: FeedPost[]
  error?: string
}

export interface PostResponse {
  success: boolean
  data?: FeedPost
  error?: string
}

// Achievement API responses
export interface Achievement {
  id: string
  user_id: string
  type: string
  title: string
  description: string
  progress?: number
  max_progress?: number
  unlocked_at?: string
  metadata?: any
  created_at: string
}

export interface AchievementResponse {
  success: boolean
  data?: Achievement[]
  error?: string
}

// Notification API responses
export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  is_read: boolean
  metadata?: any
  created_at: string
  read_at?: string
}

export interface NotificationResponse {
  success: boolean
  data?: Notification[]
  error?: string
}

export interface NotificationUpdateResponse {
  success: boolean
  data?: Notification
  error?: string
}

// DanceBond API responses
export interface DanceBond {
  id: string
  user1_id: string
  user2_id: string
  bond_level: number
  sessions_count: number
  last_session?: string
  metadata?: any
  created_at: string
  updated_at: string
  partner?: BackendUser
}

export interface DanceBondResponse {
  success: boolean
  data?: DanceBond[]
  error?: string
}

export interface SingleDanceBondResponse {
  success: boolean
  data?: DanceBond
  error?: string
}

// Generic API error response
export interface ApiError {
  error: string
  message?: string
  statusCode?: number
}
