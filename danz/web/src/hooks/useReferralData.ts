'use client'

import { type ReferredUser, getReferredUsers } from '@/src/lib/supabase'
import { useCallback, useEffect, useState } from 'react'

interface UserPointsData {
  current_points_balance: number
  total_points_earned: number
  total_points_spent: number
  referral_count: number
  referral_points_earned: number
}

const SUPABASE_URL = 'https://eoajujwpdkfuicnoxetk.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvYWp1andwZGtmdWljbm94ZXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NDQzMzQsImV4cCI6MjA3MDIyMDMzNH0.NpMiRO22b-y-7zHo-RhA0ZX8tHkSZiTk9jlWcF-UZEg'

/**
 * Fetch user points data from Supabase
 */
async function fetchUserPoints(username: string): Promise<UserPointsData | null> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/users?username=eq.${encodeURIComponent(username)}&select=current_points_balance,total_points_earned,total_points_spent,referral_count,referral_points_earned`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    )

    if (!response.ok) return null

    const data = await response.json()
    return data[0] || null
  } catch (error) {
    console.error('Failed to fetch user points:', error)
    return null
  }
}

export interface ReferralWithStatus extends ReferredUser {
  status: 'clicked' | 'signed_up' | 'completed'
  points_awarded: number
}

/**
 * Hook to fetch referral data for a user
 */
export function useReferralData(username: string | null | undefined) {
  const [referrals, setReferrals] = useState<ReferralWithStatus[]>([])
  const [pointsData, setPointsData] = useState<UserPointsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (!username) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch both in parallel
      const [referredUsers, points] = await Promise.all([
        getReferredUsers(username),
        fetchUserPoints(username),
      ])

      // Transform referred users to include status
      // Status logic:
      // - 'completed' if total_sessions > 0 (completed first dance session)
      // - 'signed_up' if user exists (they signed up)
      // Points: 20 for signup + 230 for completion = 250 total
      const referralsWithStatus: ReferralWithStatus[] = referredUsers.map(user => {
        const hasCompletedSession = user.total_sessions > 0
        return {
          ...user,
          status: hasCompletedSession ? 'completed' : 'signed_up',
          // 20 points for signup, 250 total (20+230) for completed
          points_awarded: hasCompletedSession ? 250 : 20,
        }
      })

      setReferrals(referralsWithStatus)
      setPointsData(points)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch referral data'))
    } finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate stats from actual data
  const completedCount = referrals.filter(r => r.status === 'completed').length
  const pendingCount = referrals.filter(r => r.status === 'signed_up').length
  const stats = {
    totalClicks: 0, // We don't track clicks yet
    totalSignups: referrals.length,
    totalCompleted: completedCount,
    // 20 points per signup + 230 per completion = 250 total per completed
    totalPointsEarned:
      pointsData?.referral_points_earned || referrals.length * 20 + completedCount * 230,
    conversionRate:
      referrals.length > 0 ? Math.round((completedCount / referrals.length) * 100) : 0,
    pendingReferrals: pendingCount,
    completedReferrals: completedCount,
  }

  return {
    referrals,
    pointsData,
    stats,
    loading,
    error,
    refetch: fetchData,
  }
}

/**
 * Hook to fetch just user points balance
 */
export function useUserPoints(username: string | null | undefined) {
  const [points, setPoints] = useState<UserPointsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!username) {
      setLoading(false)
      return
    }

    fetchUserPoints(username).then(data => {
      setPoints(data)
      setLoading(false)
    })
  }, [username])

  return { points, loading }
}
