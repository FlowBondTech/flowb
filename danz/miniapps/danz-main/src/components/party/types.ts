// Dance Party Types

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

export interface DanceParty {
  id: string
  name: string
  hostId: string
  host: PartyMember
  members: PartyMember[]
  maxMembers: number
  isPublic: boolean
  castHash?: string // Farcaster cast for invites
  status: 'waiting' | 'active' | 'ended'
  startedAt?: Date
  endedAt?: Date
  totalXp: number
  bonusMultiplier: number // Increases with more members
  danceStyle?: string
  createdAt: Date
}

export interface PartyStats {
  totalMoves: number
  totalXp: number
  totalCalories: number
  duration: number
  avgIntensity: number
  memberCount: number
  bonusMultiplier: number
}

export interface PartyRewards {
  baseXp: number
  partyBonus: number // Extra XP from having party members
  hostBonus: number // Extra XP for being host
  streakBonus: number
  totalXp: number
  danzTokens: number
}

// Bonus multiplier calculation
// 1 person = 1x
// 2 people = 1.2x
// 3 people = 1.5x
// 4 people = 1.8x
// 5+ people = 2x
export function calculateBonusMultiplier(memberCount: number): number {
  if (memberCount <= 1) return 1
  if (memberCount === 2) return 1.2
  if (memberCount === 3) return 1.5
  if (memberCount === 4) return 1.8
  return 2.0
}

export function calculatePartyRewards(
  baseXp: number,
  memberCount: number,
  isHost: boolean,
  streak: number = 0
): PartyRewards {
  const multiplier = calculateBonusMultiplier(memberCount)
  const partyBonus = Math.floor(baseXp * (multiplier - 1))
  const hostBonus = isHost ? Math.floor(baseXp * 0.1) : 0
  const streakBonus = streak > 0 ? Math.floor(baseXp * Math.min(streak * 0.05, 0.5)) : 0
  const totalXp = baseXp + partyBonus + hostBonus + streakBonus
  const danzTokens = totalXp * 0.1

  return {
    baseXp,
    partyBonus,
    hostBonus,
    streakBonus,
    totalXp,
    danzTokens,
  }
}
