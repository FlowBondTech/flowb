// Shared type definitions for DANZ ecosystem

// User types
export interface DANZUser {
  id: string
  fid?: number | null
  username: string
  displayName?: string | null
  avatarUrl?: string | null
  walletAddress?: string | null
  xp: number
  level: number
  createdAt: Date
}

// Dance Party types
export interface PartyMember {
  id: string
  fid?: number | null
  username: string
  displayName?: string | null
  avatarUrl?: string | null
  xpEarned: number
  moves: number
  isHost: boolean
  joinedAt: Date
  isActive: boolean
}

export type PartyStatus = 'waiting' | 'active' | 'ended'

export interface DanceParty {
  id: string
  name: string
  hostId: string
  host: PartyMember
  members: PartyMember[]
  maxMembers: number
  isPublic: boolean
  castHash?: string | null
  status: PartyStatus
  bonusMultiplier: number
  danceStyle?: string | null
  startedAt?: Date | null
  endedAt?: Date | null
  totalXp: number
}

export interface PartyRewards {
  baseXp: number
  partyBonus: number
  hostBonus: number
  streakBonus: number
  totalXp: number
  tokensEarned: number
  multiplierUsed: number
}

// Dance types
export interface DanceSession {
  id: string
  userId: string
  partyId?: string | null
  startTime: Date
  endTime?: Date | null
  duration: number
  xpEarned: number
  moveCount: number
  maxCombo: number
  danceStyle?: string | null
}

// Gamification types
export interface Level {
  level: number
  name: string
  minXp: number
  maxXp: number
  badge?: string | null
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlockedAt?: Date | null
  progress: number
  target: number
}

// Leaderboard types
export interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  displayName?: string | null
  avatarUrl?: string | null
  score: number
  change?: number | null
}

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all-time'
export type LeaderboardCategory = 'xp' | 'moves' | 'streak' | 'parties'
