// DANZ Party system types - collective dance groups for bonus rewards

export type PartyTier = 'starter' | 'rising' | 'hot' | 'fire' | 'legendary'

export type PartyRole = 'leader' | 'co-leader' | 'member'

export type PartyStatus = 'active' | 'inactive' | 'disbanded'

// ============================================
// PARTY POOL TYPES
// ============================================

export type PartyPoolType = 'intimate' | 'large' | 'creator'

export interface PartyPoolConfig {
  type: PartyPoolType
  name: string
  description: string
  emoji: string
  minMembers: number
  maxMembers: number
  minStake: number // Minimum DANZ or creator tokens to join
  hasSlashing: boolean
  hasCreatorToken: boolean
  lockPeriodDays: number
  features: string[]
}

// Party pool type configurations
export const PARTY_POOL_CONFIGS: Record<PartyPoolType, PartyPoolConfig> = {
  intimate: {
    type: 'intimate',
    name: 'Intimate Party',
    description: 'Small, tight-knit crew with strict accountability. High risk, high reward!',
    emoji: '💎',
    minMembers: 2,
    maxMembers: 10,
    minStake: 100,
    hasSlashing: true,
    hasCreatorToken: false,
    lockPeriodDays: 7,
    features: [
      'Strict accountability - miss a day, lose DANZ',
      'Highest XP multipliers',
      'Party streak bonuses',
      'Small group = strong bonds',
      'Slashed tokens redistribute to active members',
    ],
  },
  large: {
    type: 'large',
    name: 'Large Party',
    description: 'Relaxed community vibes with lighter penalties. Great for casual dancers!',
    emoji: '🎉',
    minMembers: 5,
    maxMembers: 100,
    minStake: 10,
    hasSlashing: true,
    hasCreatorToken: false,
    lockPeriodDays: 3,
    features: [
      'Lower slash penalties',
      'Easier entry requirements',
      'Community-focused rewards',
      'No party streak requirements',
      'Great for beginners',
    ],
  },
  creator: {
    type: 'creator',
    name: 'Creator Party',
    description: 'Stake creator tokens and earn them as rewards. Support your favorite creators!',
    emoji: '👑',
    minMembers: 3,
    maxMembers: 50,
    minStake: 50, // In creator tokens
    hasSlashing: true,
    hasCreatorToken: true,
    lockPeriodDays: 14,
    features: [
      'Stake any creator token',
      'Earn creator tokens as rewards',
      'Support creators you love',
      'Exclusive creator perks',
      'Higher lock period for stability',
    ],
  },
}

export interface PartyMember {
  id: string
  fid: number
  username: string
  displayName: string
  avatarUrl: string | null
  role: PartyRole
  joinedAt: string
  currentStreak: number
  totalContributions: number // XP contributed to party
  lastCheckinAt: string | null
  isActiveToday: boolean
}

export interface PartyStats {
  totalXp: number
  weeklyXp: number
  averageStreak: number
  activeMembers: number // members who checked in today
  longestCollectiveStreak: number // days where all members checked in
  partyStreak: number // current consecutive days with 100% participation
}

export interface DanzParty {
  id: string
  name: string
  description: string
  avatarEmoji: string
  tier: PartyTier
  createdAt: string
  createdBy: string // user id of leader
  status: PartyStatus

  // Membership
  members: PartyMember[]
  maxMembers: number
  minMembers: number
  isPublic: boolean // can anyone join or invite only
  joinCode?: string // for private parties

  // Stats
  stats: PartyStats

  // Bonuses
  currentMultiplier: number // XP multiplier based on participation
  bonusPool: number // accumulated bonus XP to distribute
}

export interface PartyInvite {
  id: string
  partyId: string
  partyName: string
  partyEmoji: string
  invitedBy: {
    id: string
    username: string
    displayName: string
  }
  invitedAt: string
  expiresAt: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
}

export interface PartyLeaderboard {
  rank: number
  party: {
    id: string
    name: string
    avatarEmoji: string
    tier: PartyTier
    memberCount: number
  }
  weeklyXp: number
  partyStreak: number
}

// Party tier configuration
export const PARTY_TIER_CONFIG: Record<PartyTier, {
  label: string
  emoji: string
  minXp: number
  maxMembers: number
  multiplierBonus: number
  color: string
}> = {
  starter: {
    label: 'Starter',
    emoji: '🌱',
    minXp: 0,
    maxMembers: 5,
    multiplierBonus: 0.05, // 5% bonus
    color: 'text-green-400',
  },
  rising: {
    label: 'Rising',
    emoji: '⭐',
    minXp: 5000,
    maxMembers: 10,
    multiplierBonus: 0.10, // 10% bonus
    color: 'text-yellow-400',
  },
  hot: {
    label: 'Hot',
    emoji: '🔥',
    minXp: 25000,
    maxMembers: 15,
    multiplierBonus: 0.15, // 15% bonus
    color: 'text-orange-400',
  },
  fire: {
    label: 'Fire',
    emoji: '💥',
    minXp: 100000,
    maxMembers: 20,
    multiplierBonus: 0.20, // 20% bonus
    color: 'text-red-400',
  },
  legendary: {
    label: 'Legendary',
    emoji: '👑',
    minXp: 500000,
    maxMembers: 30,
    multiplierBonus: 0.30, // 30% bonus
    color: 'text-purple-400',
  },
}

// Party role permissions
export const PARTY_ROLE_PERMISSIONS: Record<PartyRole, {
  canInvite: boolean
  canKick: boolean
  canEditParty: boolean
  canDisband: boolean
  canPromote: boolean
}> = {
  leader: {
    canInvite: true,
    canKick: true,
    canEditParty: true,
    canDisband: true,
    canPromote: true,
  },
  'co-leader': {
    canInvite: true,
    canKick: true,
    canEditParty: false,
    canDisband: false,
    canPromote: false,
  },
  member: {
    canInvite: false,
    canKick: false,
    canEditParty: false,
    canDisband: false,
    canPromote: false,
  },
}

// Calculate party multiplier based on daily participation
export function calculatePartyMultiplier(
  activeMembers: number,
  totalMembers: number,
  partyStreak: number,
  tierBonus: number
): number {
  // Base multiplier from participation rate
  const participationRate = totalMembers > 0 ? activeMembers / totalMembers : 0
  const participationBonus = participationRate * 0.20 // Up to 20% for 100% participation

  // Streak bonus (caps at 10% for 10+ day party streak)
  const streakBonus = Math.min(partyStreak * 0.01, 0.10)

  // Total multiplier: 1 + tier + participation + streak
  return 1 + tierBonus + participationBonus + streakBonus
}

// Calculate XP distribution for party members
export function calculatePartyXpDistribution(
  baseXp: number,
  multiplier: number,
  activeMembers: PartyMember[]
): { memberId: string; bonusXp: number }[] {
  const totalBonus = baseXp * (multiplier - 1)
  const perMemberBonus = activeMembers.length > 0 ? totalBonus / activeMembers.length : 0

  return activeMembers.map(member => ({
    memberId: member.id,
    bonusXp: Math.floor(perMemberBonus),
  }))
}

// Party emoji options for creation
export const PARTY_EMOJI_OPTIONS = [
  '🎉', '🎊', '🪩', '💃', '🕺', '🎶', '🎵', '🌟',
  '⚡', '🔥', '💎', '🏆', '🎯', '🚀', '💫', '✨',
  '🌈', '🎪', '🎭', '🎨', '🎸', '🥁', '🎺', '🎻',
]
