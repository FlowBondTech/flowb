'use client'

import { useState, useEffect, useCallback } from 'react'
import { useFarcasterSDK } from './useFarcasterSDK'

interface CheckinStats {
  totalXp: number
  currentStreak: number
  longestStreak: number
  level: number
  totalCheckins: number
}

interface CheckinData {
  id: string
  user_id: string
  fid: number
  checked_in_at: string
  did_dance: boolean
  streak_count: number
  xp_earned: number
  streak_bonus: number
  reflection_bonus: number
  reflection_data: {
    feeling?: string
    benefits?: string[]
    note?: string
  } | null
}

interface UseCheckinReturn {
  // State
  isLoading: boolean
  error: string | null
  hasCheckedInToday: boolean
  todayCheckin: CheckinData | null
  stats: CheckinStats | null

  // Actions
  checkIn: (didDance: boolean, reflection?: {
    feeling?: string
    benefits?: string[]
    note?: string
  }) => Promise<{
    success: boolean
    xpEarned?: number
    newStreak?: number
    error?: string
  }>
  refreshStatus: () => Promise<void>
}

export function useCheckin(): UseCheckinReturn {
  const { user, isLoaded } = useFarcasterSDK()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false)
  const [todayCheckin, setTodayCheckin] = useState<CheckinData | null>(null)
  const [stats, setStats] = useState<CheckinStats | null>(null)

  // Fetch check-in status
  const refreshStatus = useCallback(async () => {
    if (!user?.fid) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/checkin?fid=${user.fid}`)

      if (!response.ok) {
        throw new Error('Failed to fetch check-in status')
      }

      const data = await response.json()
      setHasCheckedInToday(data.hasCheckedInToday)
      setTodayCheckin(data.checkin)
      setStats(data.stats)
    } catch (err) {
      console.error('Error fetching check-in status:', err)
      setError(err instanceof Error ? err.message : 'Failed to load check-in status')
    } finally {
      setIsLoading(false)
    }
  }, [user?.fid])

  // Check in
  const checkIn = useCallback(async (
    didDance: boolean,
    reflection?: {
      feeling?: string
      benefits?: string[]
      note?: string
    }
  ): Promise<{
    success: boolean
    xpEarned?: number
    newStreak?: number
    error?: string
  }> => {
    if (!user?.fid) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fid: user.fid,
          didDance,
          userData: {
            username: user.username,
            displayName: user.displayName,
            pfpUrl: user.pfpUrl,
          },
          reflection,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to check in')
      }

      const data = await response.json()

      // Update local state
      setHasCheckedInToday(true)
      setTodayCheckin(data.checkin)
      setStats(data.stats)

      return {
        success: true,
        xpEarned: data.xpEarned,
        newStreak: data.newStreak,
      }
    } catch (err) {
      console.error('Error checking in:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to check in'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [user])

  // Fetch status when user is loaded
  useEffect(() => {
    if (isLoaded && user?.fid) {
      refreshStatus()
    } else if (isLoaded && !user?.fid) {
      setIsLoading(false)
    }
  }, [isLoaded, user?.fid, refreshStatus])

  return {
    isLoading,
    error,
    hasCheckedInToday,
    todayCheckin,
    stats,
    checkIn,
    refreshStatus,
  }
}
