'use client'

import type { SuggestedBond } from '@/src/types/bonds'
import { useCallback, useState } from 'react'
import { CheckInScreen } from './CheckInScreen'
import { PointsBurst } from './PointsBurst'
import { ReflectionScreen } from './ReflectionScreen'
import { RewardsScreen } from './RewardsScreen'
import {
  type CheckInRewards,
  type CheckInStep,
  type DanceReflection,
  calculateCheckInRewards,
} from './types'

// Mock bond suggestions - will be replaced with real API data
const MOCK_BOND_SUGGESTIONS: SuggestedBond[] = [
  {
    id: '1',
    suggestedUser: {
      id: 'user1',
      fid: 12345,
      username: 'dancequeen',
      displayName: 'Dance Queen',
      avatarUrl: null,
      bio: 'Dancing every day since 2023. Hip-hop enthusiast.',
    },
    compatibilityScore: 92,
    bondType: 'streak_partner',
    matchReasons: [
      { type: 'streak_match', score: 95, detail: 'Both on 10+ day streaks' },
      { type: 'same_style', score: 88, detail: 'Both love hip-hop' },
      { type: 'similar_time', score: 85, detail: 'Both dance in the evening' },
    ],
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    suggestedUser: {
      id: 'user2',
      fid: 67890,
      username: 'groovyking',
      displayName: 'Groovy King',
      avatarUrl: null,
      bio: 'Salsa dancer. Building my streak one day at a time.',
    },
    compatibilityScore: 87,
    bondType: 'dance_buddy',
    matchReasons: [
      { type: 'activity_level', score: 90, detail: 'Similar dance frequency' },
      { type: 'mutual_friends', score: 82, detail: '3 mutual connections' },
      { type: 'mood_match', score: 78, detail: 'Similar mood patterns' },
    ],
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  },
]

interface DailyCheckInProps {
  currentStreak?: number
  hasCheckedInToday?: boolean
  onCheckIn?: (
    didDance: boolean,
    reflection?: {
      feeling?: string
      benefits?: string[]
      note?: string
    },
  ) => Promise<{
    success: boolean
    xpEarned?: number
    newStreak?: number
    error?: string
  }>
}

export function DailyCheckIn({
  currentStreak = 0,
  hasCheckedInToday = false,
  onCheckIn,
}: DailyCheckInProps) {
  const [step, setStep] = useState<CheckInStep>('checkin')
  const [showBurst, setShowBurst] = useState(false)
  const [didDance, setDidDance] = useState(false)
  const [reflection, setReflection] = useState<DanceReflection | null>(null)
  const [rewards, setRewards] = useState<CheckInRewards | null>(null)
  const [actualNewStreak, setActualNewStreak] = useState(0)

  // New streak after check-in (local estimate, will be updated from API)
  const newStreak = actualNewStreak || (didDance ? currentStreak + 1 : 0)

  const handleCheckIn = useCallback(
    (danced: boolean) => {
      setDidDance(danced)

      if (danced) {
        // Show points burst animation
        setShowBurst(true)
      } else {
        // Call API for non-dance check-in
        if (onCheckIn) {
          onCheckIn(false).then(result => {
            if (result.success && result.newStreak !== undefined) {
              setActualNewStreak(result.newStreak)
            }
          })
        }
        // Skip to rewards with streak reset message
        const calculatedRewards = calculateCheckInRewards(0, false)
        setRewards(calculatedRewards)
        setStep('rewards')
      }
    },
    [onCheckIn],
  )

  const handleBurstComplete = useCallback(() => {
    setShowBurst(false)
    setStep('reflection')
  }, [])

  const handleReflectionSubmit = useCallback(
    async (reflectionData: DanceReflection | null) => {
      setReflection(reflectionData)
      const hasReflection =
        reflectionData !== null &&
        !!(
          reflectionData.feeling ||
          (reflectionData.benefits && reflectionData.benefits.length > 0)
        )

      // Call API with reflection data
      if (onCheckIn) {
        // Convert DanceReflection to API format (null -> undefined)
        const apiReflection = reflectionData
          ? {
              feeling: reflectionData.feeling ?? undefined,
              benefits: reflectionData.benefits ?? undefined,
              note: reflectionData.notes ?? undefined,
            }
          : undefined
        const result = await onCheckIn(true, apiReflection)
        if (result.success) {
          if (result.newStreak !== undefined) {
            setActualNewStreak(result.newStreak)
          }
          // Use API-provided XP if available, otherwise calculate locally
          if (result.xpEarned !== undefined) {
            const calculatedRewards = calculateCheckInRewards(
              result.newStreak || newStreak,
              hasReflection,
            )
            // Override with actual API values
            calculatedRewards.totalXp = result.xpEarned
            setRewards(calculatedRewards)
          } else {
            const calculatedRewards = calculateCheckInRewards(
              result.newStreak || newStreak,
              hasReflection,
            )
            setRewards(calculatedRewards)
          }
        } else {
          // Fall back to local calculation on error
          const calculatedRewards = calculateCheckInRewards(newStreak, hasReflection)
          setRewards(calculatedRewards)
        }
      } else {
        const calculatedRewards = calculateCheckInRewards(newStreak, hasReflection)
        setRewards(calculatedRewards)
      }
      setStep('rewards')
    },
    [newStreak, onCheckIn],
  )

  const handleSkipReflection = useCallback(async () => {
    // Call API without reflection
    if (onCheckIn) {
      const result = await onCheckIn(true)
      if (result.success) {
        if (result.newStreak !== undefined) {
          setActualNewStreak(result.newStreak)
        }
        if (result.xpEarned !== undefined) {
          const calculatedRewards = calculateCheckInRewards(result.newStreak || newStreak, false)
          calculatedRewards.totalXp = result.xpEarned
          setRewards(calculatedRewards)
        } else {
          const calculatedRewards = calculateCheckInRewards(result.newStreak || newStreak, false)
          setRewards(calculatedRewards)
        }
      } else {
        const calculatedRewards = calculateCheckInRewards(newStreak, false)
        setRewards(calculatedRewards)
      }
    } else {
      const calculatedRewards = calculateCheckInRewards(newStreak, false)
      setRewards(calculatedRewards)
    }
    setStep('rewards')
  }, [newStreak, onCheckIn])

  // Already checked in today
  if (hasCheckedInToday) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] px-6 py-8 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center shadow-glow-pink mb-5">
          <span className="text-4xl">✅</span>
        </div>
        <h1 className="text-xl font-bold text-text-primary mb-2">You&apos;ve checked in today!</h1>
        <p className="text-text-muted text-sm mb-4">Come back tomorrow to continue your streak</p>
        <div className="px-4 py-2 rounded-full bg-bg-card border border-neon-pink/30">
          <span className="text-neon-pink text-sm">🔥 {currentStreak} day streak</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Points burst overlay */}
      {showBurst && (
        <PointsBurst
          points={50}
          streakBonus={Math.min(newStreak * 5, 50)}
          onComplete={handleBurstComplete}
        />
      )}

      {/* Main content */}
      {step === 'checkin' && <CheckInScreen streak={currentStreak} onCheckIn={handleCheckIn} />}

      {step === 'reflection' && (
        <ReflectionScreen onSubmit={handleReflectionSubmit} onSkip={handleSkipReflection} />
      )}

      {step === 'rewards' && rewards && (
        <RewardsScreen
          rewards={rewards}
          hasReflection={reflection !== null}
          bondSuggestions={MOCK_BOND_SUGGESTIONS}
        />
      )}
    </div>
  )
}
