'use client'

import { useState, useCallback, useEffect } from 'react'
import { useFarcasterSDK } from './useFarcasterSDK'
import { DanzParty, PartyMember, PartyLeaderboard } from '@/types/party'

interface UsePartyReturn {
  // State
  userParty: DanzParty | null
  membership: PartyMemberData | null
  leaderboard: PartyLeaderboard[]
  discoverParties: DanzParty[]
  isLoading: boolean
  error: string | null

  // Actions
  refreshParty: () => Promise<void>
  createParty: (data: CreatePartyData) => Promise<DanzParty | null>
  joinParty: (partyIdOrCode: string) => Promise<boolean>
  leaveParty: () => Promise<boolean>
  refreshLeaderboard: () => Promise<void>
  refreshDiscover: () => Promise<void>
}

interface PartyMemberData {
  id: string
  role: string
  current_streak: number
  total_contributions: number
  is_active_today: boolean
  joined_at: string
}

interface CreatePartyData {
  name: string
  description?: string
  emoji?: string
  isPublic?: boolean
  txHash?: string // Payment transaction hash
}

export function useParty(): UsePartyReturn {
  const { user, isLoaded } = useFarcasterSDK()
  const [userParty, setUserParty] = useState<DanzParty | null>(null)
  const [membership, setMembership] = useState<PartyMemberData | null>(null)
  const [leaderboard, setLeaderboard] = useState<PartyLeaderboard[]>([])
  const [discoverParties, setDiscoverParties] = useState<DanzParty[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fid = user?.fid

  // Transform API party data to frontend types
  const transformParty = (apiParty: Record<string, unknown>): DanzParty => {
    return {
      id: apiParty.id as string,
      name: apiParty.name as string,
      description: (apiParty.description as string) || '',
      avatarEmoji: (apiParty.avatar_emoji as string) || '🎉',
      tier: (apiParty.tier as DanzParty['tier']) || 'starter',
      createdAt: apiParty.created_at as string,
      createdBy: apiParty.created_by as string,
      status: (apiParty.status as DanzParty['status']) || 'active',
      members: ((apiParty.party_members as Array<Record<string, unknown>>) || []).map((m) => ({
        id: m.user_id as string,
        fid: m.fid as number,
        username: (m.username as string) || (m.display_name as string) || `user${m.fid}`,
        displayName: (m.displayName as string) || (m.display_name as string) || `User ${m.fid}`,
        avatarUrl: (m.avatarUrl as string) || (m.avatar_url as string) || null,
        role: ((m.role as string)?.replace('_', '-') as PartyMember['role']) || 'member',
        joinedAt: m.joined_at as string,
        currentStreak: (m.current_streak as number) || 0,
        totalContributions: (m.total_contributions as number) || 0,
        lastCheckinAt: (m.last_checkin_at as string) || null,
        isActiveToday: (m.is_active_today as boolean) || false,
      })),
      maxMembers: (apiParty.max_members as number) || 10,
      minMembers: (apiParty.min_members as number) || 2,
      isPublic: apiParty.is_public !== false,
      joinCode: (apiParty.join_code as string) || undefined,
      stats: {
        totalXp: (apiParty.total_xp as number) || 0,
        weeklyXp: (apiParty.weekly_xp as number) || 0,
        averageStreak: (apiParty.average_streak as number) || 0,
        activeMembers: (apiParty.active_members_today as number) || 0,
        longestCollectiveStreak: 0,
        partyStreak: (apiParty.party_streak as number) || 0,
      },
      currentMultiplier: (apiParty.current_multiplier as number) || 1.0,
      bonusPool: 0,
    }
  }

  // Fetch user's party
  const refreshParty = useCallback(async () => {
    if (!fid) {
      setUserParty(null)
      setMembership(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const res = await fetch(`/api/party?fid=${fid}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch party')
      }

      if (data.party) {
        setUserParty(transformParty(data.party))
        setMembership(data.membership)
      } else {
        setUserParty(null)
        setMembership(null)
      }
    } catch (err) {
      console.error('Fetch party error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch party')
    } finally {
      setIsLoading(false)
    }
  }, [fid])

  // Fetch leaderboard
  const refreshLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/party/leaderboard?limit=10')
      const data = await res.json()

      if (res.ok && data.leaderboard) {
        setLeaderboard(data.leaderboard)
      }
    } catch (err) {
      console.error('Fetch leaderboard error:', err)
    }
  }, [])

  // Fetch discoverable parties
  const refreshDiscover = useCallback(async () => {
    try {
      const res = await fetch('/api/party?discover=true')
      const data = await res.json()

      if (res.ok && data.parties) {
        setDiscoverParties(data.parties.map(transformParty))
      }
    } catch (err) {
      console.error('Fetch discover error:', err)
    }
  }, [])

  // Create party
  const createParty = useCallback(async (data: CreatePartyData): Promise<DanzParty | null> => {
    if (!fid) {
      setError('Not logged in')
      return null
    }

    try {
      setError(null)

      const res = await fetch('/api/party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid,
          name: data.name,
          description: data.description,
          emoji: data.emoji,
          isPublic: data.isPublic,
          txHash: data.txHash,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to create party')
      }

      const party = transformParty(result.party)
      setUserParty(party)
      setMembership({
        id: result.party.party_members?.[0]?.id,
        role: 'leader',
        current_streak: 0,
        total_contributions: 0,
        is_active_today: false,
        joined_at: new Date().toISOString(),
      })

      return party
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create party'
      setError(message)
      throw new Error(message)
    }
  }, [fid])

  // Join party
  const joinParty = useCallback(async (partyIdOrCode: string): Promise<boolean> => {
    if (!fid) {
      setError('Not logged in')
      return false
    }

    try {
      setError(null)

      const res = await fetch(`/api/party/${partyIdOrCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to join party')
      }

      const party = transformParty(result.party)
      setUserParty(party)
      setMembership(result.membership)

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join party'
      setError(message)
      throw new Error(message)
    }
  }, [fid])

  // Leave party
  const leaveParty = useCallback(async (): Promise<boolean> => {
    if (!fid || !userParty) {
      return false
    }

    try {
      setError(null)

      const res = await fetch(`/api/party/${userParty.id}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to leave party')
      }

      setUserParty(null)
      setMembership(null)

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to leave party'
      setError(message)
      throw new Error(message)
    }
  }, [fid, userParty])

  // Initial fetch
  useEffect(() => {
    if (isLoaded) {
      refreshParty()
      refreshLeaderboard()
    }
  }, [isLoaded, refreshParty, refreshLeaderboard])

  // Fetch discover parties when user has no party
  useEffect(() => {
    if (isLoaded && !userParty && !isLoading) {
      refreshDiscover()
    }
  }, [isLoaded, userParty, isLoading, refreshDiscover])

  return {
    userParty,
    membership,
    leaderboard,
    discoverParties,
    isLoading,
    error,
    refreshParty,
    createParty,
    joinParty,
    leaveParty,
    refreshLeaderboard,
    refreshDiscover,
  }
}
