'use client'

import { DailyCheckIn } from '@/src/components/checkin'
import DashboardLayout from '@/src/components/dashboard/DashboardLayout'
import { NotificationPrompt, SplashScreen } from '@/src/components/ui'
import {
  useEndQuickSessionMutation,
  useGetCheckinStatusQuery,
  useGetMiniappStreakQuery,
  useStartQuickSessionMutation,
} from '@/src/generated/graphql'
import { useAppReady } from '@/src/hooks/useAppReady'
import { useFarcasterFrame } from '@/src/hooks/useFarcasterFrame'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

type OnboardingStep = 'splash' | 'notifications' | 'ready'

export default function CheckInPage() {
  const { isReady, showSplash, isAuthenticated } = useAppReady({
    minSplashDuration: 1200,
  })
  const { isInFrame, isFrameAdded, addFrame, ready: farcasterReady } = useFarcasterFrame()
  const router = useRouter()

  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('splash')
  const [hasSeenNotificationPrompt, setHasSeenNotificationPrompt] = useState(false)
  const activeSessionId = useRef<string | null>(null)

  // GraphQL queries
  const { data: checkinData, refetch: refetchCheckin } = useGetCheckinStatusQuery({
    skip: !isAuthenticated,
  })
  const { data: streakData, refetch: refetchStreak } = useGetMiniappStreakQuery({
    skip: !isAuthenticated,
  })

  // GraphQL mutations
  const [startSession] = useStartQuickSessionMutation()
  const [endSession] = useEndQuickSessionMutation()

  // Derived state from API
  const currentStreak =
    streakData?.miniappStreak?.current ?? checkinData?.myFreestyleStats?.current_streak ?? 0
  const hasCheckedInToday =
    streakData?.miniappStreak?.streak_maintained_today ??
    checkinData?.completedFreestyleToday ??
    false

  // Check if user has already seen notification prompt
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const seen = localStorage.getItem('danz_notification_prompt_seen')
      if (seen) setHasSeenNotificationPrompt(true)
    }
  }, [])

  // Handle onboarding flow progression
  useEffect(() => {
    if (showSplash) {
      setOnboardingStep('splash')
      return
    }

    if (isReady) {
      // Show notification prompt only in Farcaster frame, first time, not already added
      const shouldShowNotifications = isInFrame && !isFrameAdded && !hasSeenNotificationPrompt

      if (shouldShowNotifications) {
        setOnboardingStep('notifications')
      } else {
        setOnboardingStep('ready')
        farcasterReady()
      }
    }
  }, [showSplash, isReady, isInFrame, isFrameAdded, hasSeenNotificationPrompt, farcasterReady])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.push('/login')
    }
  }, [isReady, isAuthenticated, router])

  const handleEnableNotifications = async () => {
    if (isInFrame) await addFrame()
    finishNotificationStep()
  }

  const handleSkipNotifications = () => {
    finishNotificationStep()
  }

  const finishNotificationStep = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('danz_notification_prompt_seen', 'true')
    }
    setHasSeenNotificationPrompt(true)
    setOnboardingStep('ready')
    farcasterReady()
  }

  const handleCheckIn = useCallback(
    async (
      didDance: boolean,
      reflection?: { feeling?: string; benefits?: string[]; note?: string },
    ) => {
      try {
        if (didDance) {
          // Start a quick session
          const startResult = await startSession({
            variables: {
              input: {
                mode: 'daily_checkin',
                target_duration: 60, // 1 minute minimum for daily check-in
              },
            },
          })

          if (startResult.data?.miniappStartQuickSession?.session_id) {
            activeSessionId.current = startResult.data.miniappStartQuickSession.session_id

            // End the session immediately with check-in stats
            const endResult = await endSession({
              variables: {
                sessionId: activeSessionId.current,
                stats: {
                  feeling: reflection?.feeling,
                  benefits: reflection?.benefits,
                  note: reflection?.note,
                  completed: true,
                  duration_seconds: 60,
                  movement_score: 0.8,
                },
              },
            })

            if (endResult.data?.miniappEndQuickSession?.success) {
              // Refetch data to update UI
              await Promise.all([refetchCheckin(), refetchStreak()])

              return {
                success: true,
                xpEarned: 75,
                newStreak: currentStreak + 1,
              }
            }
          }

          throw new Error('Failed to record check-in')
        } else {
          // User didn't dance - just record no activity
          return {
            success: true,
            xpEarned: 0,
            newStreak: 0,
          }
        }
      } catch (error) {
        console.error('Check-in error:', error)
        return {
          success: false,
          xpEarned: 0,
          newStreak: currentStreak,
        }
      }
    },
    [startSession, endSession, refetchCheckin, refetchStreak, currentStreak],
  )

  // Step 1: Splash
  if (onboardingStep === 'splash') {
    return <SplashScreen title="Daily DANZ" subtitle="Check in. Build streaks. Earn rewards." />
  }

  // Step 2: Notification prompt (Farcaster only)
  if (onboardingStep === 'notifications') {
    return (
      <NotificationPrompt
        onEnable={handleEnableNotifications}
        onSkip={handleSkipNotifications}
        onClose={handleSkipNotifications}
      />
    )
  }

  // Step 3: Main content
  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Daily Check-In</h1>
          <p className="text-text-secondary">Track your dance journey and earn rewards</p>
        </div>
        <div className="bg-bg-secondary rounded-3xl border border-neon-purple/20 overflow-hidden">
          <DailyCheckIn
            currentStreak={currentStreak}
            hasCheckedInToday={hasCheckedInToday}
            onCheckIn={handleCheckIn}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
