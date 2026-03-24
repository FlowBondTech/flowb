import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Crew } from '@/types/kanban'

const STORAGE_KEY = 'kanban_crew'

interface UseCrewsReturn {
  crews: Crew[]
  currentCrew: Crew | null
  setCurrentCrew: (crew: Crew | null) => void
  loading: boolean
}

export function useCrews(userId: string | null): UseCrewsReturn {
  const [crews, setCrews] = useState<Crew[]>([])
  const [currentCrew, setCurrentCrewState] = useState<Crew | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user's crews
  useEffect(() => {
    if (!userId) {
      setCrews([])
      setCurrentCrewState(null)
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchCrews() {
      setLoading(true)

      // 1. Get group IDs the user belongs to
      const { data: memberships, error: memberError } = await supabase
        .from('flowb_group_members')
        .select('group_id')
        .eq('user_id', userId)

      if (cancelled) return

      if (memberError || !memberships || memberships.length === 0) {
        setCrews([])
        setCurrentCrewState(null)
        setLoading(false)
        return
      }

      const groupIds = memberships.map((m) => m.group_id)

      // 2. Fetch the crews
      const { data: groups, error: groupError } = await supabase
        .from('flowb_groups')
        .select('id, name, emoji, description, biz_enabled')
        .in('id', groupIds)

      if (cancelled) return

      if (groupError) {
        console.error('Failed to fetch crews:', groupError.message)
        setCrews([])
        setLoading(false)
        return
      }

      const crewList = (groups ?? []) as Crew[]
      setCrews(crewList)

      // Restore saved crew from localStorage
      try {
        const savedId = localStorage.getItem(STORAGE_KEY)
        if (savedId) {
          const saved = crewList.find((c) => c.id === savedId)
          if (saved) {
            setCurrentCrewState(saved)
          }
        }
      } catch {
        // Ignore localStorage errors
      }

      setLoading(false)
    }

    fetchCrews()
    return () => {
      cancelled = true
    }
  }, [userId])

  const setCurrentCrew = useCallback(
    (crew: Crew | null) => {
      setCurrentCrewState(crew)
      try {
        if (crew) {
          localStorage.setItem(STORAGE_KEY, crew.id)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      } catch {
        // Ignore localStorage errors
      }
    },
    [],
  )

  return {
    crews,
    currentCrew,
    setCurrentCrew,
    loading,
  }
}
