// Party system types for DANZ
// Adapted from daily-danz

export type PartyTier = 'starter' | 'rising' | 'hot' | 'fire' | 'legendary'
export type PartyRole = 'leader' | 'co-leader' | 'member'
export type PoolType = 'intimate' | 'large' | 'creator'

export interface PartyMember {
  id: string
  walletAddress: string
  displayName: string
  avatar?: string
  role: PartyRole
  joinedAt: Date
  totalXpContributed: number
  weeklyXpContributed: number
  streakDays: number
}

export interface DanzParty {
  id: string
  name: string
  description?: string
  tier: PartyTier
  poolType: PoolType
  leaderId: string
  coLeaderIds: string[]
  members: PartyMember[]
  maxMembers: number
  totalXp: number
  weeklyXp: number
  multiplier: number
  createdAt: Date
  bannerImage?: string
  isPublic: boolean
  inviteCode?: string
  usdcPoolBalance: number
  weeklyPrizePool: number
}

export interface PartyInvite {
  id: string
  partyId: string
  partyName: string
  invitedBy: string
  invitedByName: string
  invitedAt: Date
  expiresAt: Date
  status: 'pending' | 'accepted' | 'declined' | 'expired'
}

// Party tier configuration
export const PARTY_TIER_CONFIG: Record<
  PartyTier,
  {
    name: string
    emoji: string
    minMembers: number
    maxMembers: number
    baseMultiplier: number
    color: string
    bgGradient: string
  }
> = {
  starter: {
    name: 'Starter',
    emoji: '🌱',
    minMembers: 2,
    maxMembers: 5,
    baseMultiplier: 1.1,
    color: 'text-green-400',
    bgGradient: 'from-green-500/20 to-green-600/10',
  },
  rising: {
    name: 'Rising',
    emoji: '⭐',
    minMembers: 5,
    maxMembers: 10,
    baseMultiplier: 1.25,
    color: 'text-yellow-400',
    bgGradient: 'from-yellow-500/20 to-yellow-600/10',
  },
  hot: {
    name: 'Hot',
    emoji: '🔥',
    minMembers: 10,
    maxMembers: 25,
    baseMultiplier: 1.5,
    color: 'text-orange-400',
    bgGradient: 'from-orange-500/20 to-orange-600/10',
  },
  fire: {
    name: 'Fire',
    emoji: '💥',
    minMembers: 25,
    maxMembers: 50,
    baseMultiplier: 1.75,
    color: 'text-red-400',
    bgGradient: 'from-red-500/20 to-red-600/10',
  },
  legendary: {
    name: 'Legendary',
    emoji: '👑',
    minMembers: 50,
    maxMembers: 100,
    baseMultiplier: 2.0,
    color: 'text-purple-400',
    bgGradient: 'from-purple-500/20 to-pink-500/10',
  },
}

// Pool type configuration
export const POOL_TYPE_CONFIG: Record<
  PoolType,
  {
    name: string
    description: string
    minMembers: number
    maxMembers: number
    creationCostUsdc: number
  }
> = {
  intimate: {
    name: 'Intimate',
    description: 'Small, close-knit group',
    minMembers: 2,
    maxMembers: 10,
    creationCostUsdc: 5,
  },
  large: {
    name: 'Large',
    description: 'Community dance crew',
    minMembers: 10,
    maxMembers: 50,
    creationCostUsdc: 15,
  },
  creator: {
    name: 'Creator',
    description: 'For dance influencers',
    minMembers: 25,
    maxMembers: 100,
    creationCostUsdc: 50,
  },
}

// Calculate party multiplier based on tier and activity
export function calculatePartyMultiplier(
  tier: PartyTier,
  activeMembers: number,
  totalMembers: number,
): number {
  const tierConfig = PARTY_TIER_CONFIG[tier]
  const baseMultiplier = tierConfig.baseMultiplier

  // Activity bonus (0-20% based on active percentage)
  const activePercentage = totalMembers > 0 ? activeMembers / totalMembers : 0
  const activityBonus = activePercentage * 0.2

  return Math.round((baseMultiplier + activityBonus) * 100) / 100
}

// Get tier from member count
export function getTierFromMemberCount(memberCount: number): PartyTier {
  if (memberCount >= 50) return 'legendary'
  if (memberCount >= 25) return 'fire'
  if (memberCount >= 10) return 'hot'
  if (memberCount >= 5) return 'rising'
  return 'starter'
}
