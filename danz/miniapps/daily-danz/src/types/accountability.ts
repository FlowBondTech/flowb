// DANZ Party Accountability System - Treasury, Slashing, and Encouragement

// ============================================
// TREASURY & STAKING
// ============================================

export interface PartyTreasury {
  id: string
  partyId: string
  totalBalance: number // Total DANZ tokens in treasury
  stakingPool: number // Tokens at risk for slashing
  rewardsPool: number // Accumulated rewards for distribution
  creatorTokenAddress?: string // For creator token parties
  creatorTokenBalance?: number
  lastDistributionAt: string
  nextDistributionAt: string
}

export interface MemberStake {
  id: string
  memberId: string
  partyId: string
  stakedAmount: number // DANZ tokens staked
  lockedUntil: string // Cannot unstake until this date
  slashProtectionActive: boolean // If they have a Danz Dodge active
  slashProtectionExpiresAt?: string
  totalSlashed: number // Historical slashed amount
  totalEarned: number // Historical earnings from party
  createdAt: string
  updatedAt: string
}

// ============================================
// SLASHING MECHANISM
// ============================================

export type SlashReason =
  | 'missed_checkin'      // Didn't check in for the day
  | 'streak_break'        // Broke their personal streak
  | 'party_streak_break'  // Caused party to lose streak
  | 'inactivity'          // Extended period of no activity
  | 'early_leave'         // Left party before lock period

export interface SlashEvent {
  id: string
  partyId: string
  memberId: string
  reason: SlashReason
  amount: number // DANZ tokens slashed
  redistributedTo: 'treasury' | 'active_members' | 'burned'
  protectionUsed?: string // ID of protection item used
  wasProtected: boolean
  createdAt: string
}

export interface SlashConfig {
  // Intimate Party (strict accountability)
  intimate: {
    missedCheckinPenalty: number // % of stake slashed per miss (e.g., 5%)
    streakBreakPenalty: number // % slashed for breaking streak (e.g., 10%)
    partyStreakBreakPenalty: number // % slashed for breaking party streak (e.g., 15%)
    inactivityThresholdDays: number // Days before inactivity slash kicks in
    inactivityPenalty: number // % slashed for inactivity
    earlyLeavePenalty: number // % slashed for leaving early
    minStakeRequired: number // Minimum DANZ to join
    lockPeriodDays: number // Days stake is locked
  }
  // Large Party (more lenient)
  large: {
    missedCheckinPenalty: number // Lower penalty (e.g., 1%)
    streakBreakPenalty: number // (e.g., 2%)
    partyStreakBreakPenalty: number // (e.g., 0% - no party streak for large)
    inactivityThresholdDays: number
    inactivityPenalty: number
    earlyLeavePenalty: number
    minStakeRequired: number // Lower minimum
    lockPeriodDays: number // Shorter lock
  }
  // Creator Party (token-based rewards)
  creator: {
    missedCheckinPenalty: number
    streakBreakPenalty: number
    partyStreakBreakPenalty: number
    inactivityThresholdDays: number
    inactivityPenalty: number
    earlyLeavePenalty: number
    minStakeRequired: number // In creator token
    lockPeriodDays: number
    creatorTokenRewardRate: number // Tokens earned per XP
  }
}

// Default slash configurations
export const DEFAULT_SLASH_CONFIG: SlashConfig = {
  intimate: {
    missedCheckinPenalty: 0.05, // 5%
    streakBreakPenalty: 0.10, // 10%
    partyStreakBreakPenalty: 0.15, // 15%
    inactivityThresholdDays: 3,
    inactivityPenalty: 0.25, // 25%
    earlyLeavePenalty: 0.50, // 50%
    minStakeRequired: 100, // 100 DANZ
    lockPeriodDays: 7,
  },
  large: {
    missedCheckinPenalty: 0.01, // 1%
    streakBreakPenalty: 0.02, // 2%
    partyStreakBreakPenalty: 0, // No party streak penalty
    inactivityThresholdDays: 7,
    inactivityPenalty: 0.10, // 10%
    earlyLeavePenalty: 0.20, // 20%
    minStakeRequired: 10, // 10 DANZ
    lockPeriodDays: 3,
  },
  creator: {
    missedCheckinPenalty: 0.03, // 3%
    streakBreakPenalty: 0.05, // 5%
    partyStreakBreakPenalty: 0.08, // 8%
    inactivityThresholdDays: 5,
    inactivityPenalty: 0.15, // 15%
    earlyLeavePenalty: 0.30, // 30%
    minStakeRequired: 50, // 50 creator tokens
    lockPeriodDays: 14, // Longer lock for creator parties
    creatorTokenRewardRate: 0.01, // 0.01 tokens per XP
  },
}

// ============================================
// ENCOURAGEMENT SYSTEM (Duolingo-style)
// ============================================

export type EncouragementType =
  | 'friendly_reminder'    // "Hey! Don't forget to dance today!"
  | 'streak_at_risk'       // "Your 7-day streak is at risk! Check in now!"
  | 'party_needs_you'      // "Your party is at 80% - they need you!"
  | 'comeback'             // "We miss you! Come back and dance!"
  | 'celebration'          // "You're on fire! 🔥 10 day streak!"
  | 'milestone'            // "You just hit 1000 XP! Keep going!"
  | 'leaderboard_climb'    // "You're #3 in your party! Can you reach #1?"
  | 'custom'               // Custom message from party member

export interface EncouragementMessage {
  id: string
  type: EncouragementType
  fromUserId?: string // null for system messages
  toUserId: string
  partyId?: string
  message: string
  emoji?: string
  isRead: boolean
  sentAt: string
  sentVia: 'in_app' | 'farcaster_dm' | 'push_notification'
}

export interface EncouragementTemplate {
  type: EncouragementType
  templates: {
    message: string
    emoji: string
  }[]
  triggerCondition: string // Description of when this triggers
  cooldownHours: number // Minimum hours between same type
}

// Pre-defined encouragement templates
export const ENCOURAGEMENT_TEMPLATES: EncouragementTemplate[] = [
  {
    type: 'friendly_reminder',
    templates: [
      { message: "Hey {name}! Time to move those feet! 💃", emoji: "💃" },
      { message: "{name}, your body wants to dance today!", emoji: "🕺" },
      { message: "Dance break time, {name}! Let's gooo!", emoji: "🎵" },
    ],
    triggerCondition: 'User hasn\'t checked in today and it\'s past noon',
    cooldownHours: 12,
  },
  {
    type: 'streak_at_risk',
    templates: [
      { message: "🚨 {name}! Your {streak}-day streak is about to break!", emoji: "🚨" },
      { message: "{name}, don't let your {streak}-day streak die! Just one dance!", emoji: "😰" },
      { message: "EMERGENCY: {name}'s {streak}-day streak needs saving! 🆘", emoji: "🆘" },
    ],
    triggerCondition: 'User has streak > 3 and hasn\'t checked in with < 2 hours left',
    cooldownHours: 2,
  },
  {
    type: 'party_needs_you',
    templates: [
      { message: "{name}, your party is at {percent}% today. Be the hero! 🦸", emoji: "🦸" },
      { message: "The {partyName} crew needs you, {name}! {remaining} to go!", emoji: "🤝" },
      { message: "{name}! Don't let {partyName} down - check in now!", emoji: "💪" },
    ],
    triggerCondition: 'Party is missing < 20% for full participation bonus',
    cooldownHours: 6,
  },
  {
    type: 'comeback',
    templates: [
      { message: "We miss you, {name}! It's been {days} days. Come back? 🥺", emoji: "🥺" },
      { message: "{name}, the dance floor is lonely without you!", emoji: "😢" },
      { message: "Hey {name}! Ready for a fresh start? We're here for you! 🌟", emoji: "🌟" },
    ],
    triggerCondition: 'User hasn\'t checked in for 3+ days',
    cooldownHours: 24,
  },
  {
    type: 'celebration',
    templates: [
      { message: "🔥 {name} is ON FIRE! {streak} days straight!", emoji: "🔥" },
      { message: "UNSTOPPABLE! {name} just hit {streak} days! 👑", emoji: "👑" },
      { message: "{name} is a dancing machine! {streak} day streak! 🤖💃", emoji: "🤖" },
    ],
    triggerCondition: 'User hits milestone streak (7, 14, 30, 60, 100 days)',
    cooldownHours: 168, // Weekly
  },
  {
    type: 'milestone',
    templates: [
      { message: "🎉 {name} just hit {xp} XP! What a legend!", emoji: "🎉" },
      { message: "Level up! {name} reached {xp} XP milestone! 🚀", emoji: "🚀" },
      { message: "{name} is crushing it! {xp} XP and counting! 💎", emoji: "💎" },
    ],
    triggerCondition: 'User hits XP milestone (1000, 5000, 10000, etc)',
    cooldownHours: 168,
  },
  {
    type: 'leaderboard_climb',
    templates: [
      { message: "{name} just climbed to #{rank} in {partyName}! 📈", emoji: "📈" },
      { message: "Watch out! {name} is coming for the top spot! Now #{rank}!", emoji: "👀" },
      { message: "{name} jumped to #{rank}! Only {toTop} XP to #1! 🎯", emoji: "🎯" },
    ],
    triggerCondition: 'User moves up 2+ spots in party leaderboard',
    cooldownHours: 24,
  },
]

// ============================================
// HELPER FUNCTIONS
// ============================================

export function calculateSlashAmount(
  stakedAmount: number,
  reason: SlashReason,
  partyType: 'intimate' | 'large' | 'creator',
  config: SlashConfig = DEFAULT_SLASH_CONFIG
): number {
  const partyConfig = config[partyType]

  switch (reason) {
    case 'missed_checkin':
      return Math.floor(stakedAmount * partyConfig.missedCheckinPenalty)
    case 'streak_break':
      return Math.floor(stakedAmount * partyConfig.streakBreakPenalty)
    case 'party_streak_break':
      return Math.floor(stakedAmount * partyConfig.partyStreakBreakPenalty)
    case 'inactivity':
      return Math.floor(stakedAmount * partyConfig.inactivityPenalty)
    case 'early_leave':
      return Math.floor(stakedAmount * partyConfig.earlyLeavePenalty)
    default:
      return 0
  }
}

export function formatEncouragementMessage(
  template: string,
  params: Record<string, string | number>
): string {
  let message = template
  for (const [key, value] of Object.entries(params)) {
    message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value))
  }
  return message
}

export function getRandomTemplate(type: EncouragementType): { message: string; emoji: string } {
  const template = ENCOURAGEMENT_TEMPLATES.find(t => t.type === type)
  if (!template || template.templates.length === 0) {
    return { message: 'Keep dancing!', emoji: '💃' }
  }
  return template.templates[Math.floor(Math.random() * template.templates.length)]
}
