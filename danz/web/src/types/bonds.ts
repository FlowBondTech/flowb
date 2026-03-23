// Bond system types for DANZ

export type BondType =
  | 'dance_buddy' // High activity overlap, similar level
  | 'streak_partner' // Both maintain long streaks
  | 'style_match' // Share dance style preferences
  | 'mentor' // Experienced dancer willing to guide
  | 'mentee' // Newer dancer seeking guidance
  | 'mutual_vibes' // Strong Farcaster connection overlap
  | 'local_dancer' // Geographic proximity

export type BondStatus = 'pending' | 'sent' | 'accepted' | 'declined' | 'expired'

export interface MatchReason {
  type:
    | 'mutual_friends'
    | 'same_style'
    | 'similar_time'
    | 'streak_match'
    | 'location'
    | 'activity_level'
    | 'mood_match'
  score: number
  detail?: string
}

export interface SuggestedBond {
  id: string
  suggestedUser: {
    id: string
    fid: number
    username: string
    displayName: string
    avatarUrl: string | null
    bio?: string
  }
  compatibilityScore: number // 0-100
  bondType: BondType
  matchReasons: MatchReason[]
  status: BondStatus
  createdAt: string
  expiresAt: string
}

export interface DanceBond {
  id: string
  partner: {
    id: string
    fid: number
    username: string
    displayName: string
    avatarUrl: string | null
  }
  bondType: BondType
  formedAt: string
  streakTogether: number // days both checked in
  lastSyncedCheckin: string | null
  status: 'active' | 'paused' | 'ended'
}

// User's dance profile for matching
export interface DanceProfile {
  userId: string
  preferredStyles: string[]
  preferredTimes: ('morning' | 'afternoon' | 'evening' | 'night')[]
  currentStreak: number
  longestStreak: number
  totalCheckins: number
  averageMoodBoost: number // -1 to 1 scale
  lookingForBuddy: boolean
  openToMentor: boolean
  seekingMentor: boolean
  lastActiveAt: string
}

// Bond type display info
export const BOND_TYPE_INFO: Record<
  BondType,
  { label: string; emoji: string; description: string }
> = {
  dance_buddy: {
    label: 'Dance Buddy',
    emoji: '🕺',
    description: 'Similar activity level and vibe',
  },
  streak_partner: {
    label: 'Streak Partner',
    emoji: '🔥',
    description: 'Both committed to daily dancing',
  },
  style_match: {
    label: 'Style Match',
    emoji: '💃',
    description: 'Shares your dance style preferences',
  },
  mentor: {
    label: 'Mentor',
    emoji: '🌟',
    description: 'Experienced dancer ready to guide',
  },
  mentee: {
    label: 'Mentee',
    emoji: '🌱',
    description: 'Eager learner looking for guidance',
  },
  mutual_vibes: {
    label: 'Mutual Vibes',
    emoji: '✨',
    description: 'Strong Farcaster connection',
  },
  local_dancer: {
    label: 'Local Dancer',
    emoji: '📍',
    description: 'Dances in your area',
  },
}

// Match reason display info
export const MATCH_REASON_INFO: Record<MatchReason['type'], { label: string; emoji: string }> = {
  mutual_friends: { label: 'Mutual friends', emoji: '👥' },
  same_style: { label: 'Same style', emoji: '💃' },
  similar_time: { label: 'Similar schedule', emoji: '⏰' },
  streak_match: { label: 'Streak commitment', emoji: '🔥' },
  location: { label: 'Nearby', emoji: '📍' },
  activity_level: { label: 'Activity match', emoji: '⚡' },
  mood_match: { label: 'Mood alignment', emoji: '🎭' },
}
