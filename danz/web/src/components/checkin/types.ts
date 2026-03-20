// Daily Check-in Types

export type CheckInStep = 'checkin' | 'reflection' | 'rewards'

export interface DailyCheckIn {
  id: string
  userId: string
  date: string // YYYY-MM-DD
  didDance: boolean
  reflection?: DanceReflection | null
  xpEarned: number
  streakDay: number
  createdAt: Date
}

export interface DanceReflection {
  feeling?: string | null // How was your dance?
  benefits?: string[] | null // What did it bring you?
  notes?: string | null // Optional notes
}

export const FEELING_OPTIONS = [
  { id: 'amazing', emoji: '🤩', label: 'Amazing!' },
  { id: 'great', emoji: '😊', label: 'Great' },
  { id: 'good', emoji: '🙂', label: 'Good' },
  { id: 'okay', emoji: '😐', label: 'Okay' },
  { id: 'tired', emoji: '😅', label: 'Tired but worth it' },
] as const

export const BENEFIT_OPTIONS = [
  { id: 'joy', emoji: '✨', label: 'Joy' },
  { id: 'energy', emoji: '⚡', label: 'Energy' },
  { id: 'stress-relief', emoji: '🧘', label: 'Stress Relief' },
  { id: 'connection', emoji: '💕', label: 'Connection' },
  { id: 'exercise', emoji: '💪', label: 'Exercise' },
  { id: 'creativity', emoji: '🎨', label: 'Creativity' },
  { id: 'confidence', emoji: '👑', label: 'Confidence' },
  { id: 'fun', emoji: '🎉', label: 'Pure Fun' },
] as const

export interface CheckInRewards {
  baseXp: number
  streakBonus: number
  reflectionBonus: number
  totalXp: number
  newStreak: number
  tokensEarned: number
}

export function calculateCheckInRewards(streakDay: number, hasReflection: boolean): CheckInRewards {
  const baseXp = 50 // Base XP for checking in
  const streakBonus = Math.min(streakDay * 5, 50) // +5 XP per streak day, max 50
  const reflectionBonus = hasReflection ? 25 : 0 // Bonus for reflecting
  const totalXp = baseXp + streakBonus + reflectionBonus
  const tokensEarned = totalXp * 0.1

  return {
    baseXp,
    streakBonus,
    reflectionBonus,
    totalXp,
    newStreak: streakDay,
    tokensEarned,
  }
}
