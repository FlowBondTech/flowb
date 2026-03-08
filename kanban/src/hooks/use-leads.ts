import { useState, useEffect, useCallback } from 'react'
import { FLOWB_API } from '@/lib/constants'
import type { Lead, LeadStage } from '@/types/kanban'

interface LeadActivity {
  id: string
  lead_id: string
  user_id: string
  activity_type: string
  description: string
  metadata?: Record<string, unknown>
  created_at: string
}

interface MeetingResult {
  meeting_id: string
  title: string
  share_code: string
  share_link: string
  auto_shared: boolean
}

interface UseLeadsReturn {
  leads: Lead[]
  loading: boolean
  error: string | null
  fetchPipeline: () => Promise<void>
  createLead: (data: Partial<Lead> & { name: string }) => Promise<Lead | null>
  updateLead: (id: string, data: Partial<Lead>) => Promise<Lead | null>
  moveLead: (id: string, newStage: LeadStage) => Promise<void>
  deleteLead: (id: string) => Promise<void>
  fetchTimeline: (id: string) => Promise<LeadActivity[]>
  scheduleMeeting: (id: string) => Promise<MeetingResult | null>
}

function getJwt(): string | null {
  return localStorage.getItem('flowb-jwt')
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const jwt = getJwt()
  if (!jwt) throw new Error('Not authenticated')

  const res = await fetch(`${FLOWB_API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error || `API error ${res.status}`)
  }

  return res.json() as Promise<T>
}

export function useLeads(): UseLeadsReturn {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPipeline = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<{ pipeline: Record<string, Lead[]>; total: number }>(
        '/api/v1/leads/pipeline'
      )
      // Flatten pipeline stages into a single array
      const all: Lead[] = []
      for (const stage of Object.keys(data.pipeline)) {
        for (const lead of data.pipeline[stage]) {
          all.push({ ...lead, stage: stage as LeadStage })
        }
      }
      setLeads(all)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pipeline')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPipeline()
  }, [fetchPipeline])

  const createLead = useCallback(
    async (data: Partial<Lead> & { name: string }): Promise<Lead | null> => {
      setError(null)
      try {
        const lead = await apiFetch<Lead>('/api/v1/leads', {
          method: 'POST',
          body: JSON.stringify(data),
        })
        setLeads((prev) => [...prev, lead])
        return lead
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create lead')
        return null
      }
    },
    []
  )

  const updateLead = useCallback(
    async (id: string, data: Partial<Lead>): Promise<Lead | null> => {
      const existing = leads.find((l) => l.id === id)
      if (!existing) return null

      // Optimistic update
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...data } : l)))
      setError(null)

      try {
        const updated = await apiFetch<Lead>(`/api/v1/leads/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        })
        setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)))
        return updated
      } catch (err) {
        // Rollback
        setLeads((prev) => prev.map((l) => (l.id === id ? existing : l)))
        setError(err instanceof Error ? err.message : 'Failed to update lead')
        return null
      }
    },
    [leads]
  )

  const moveLead = useCallback(
    async (id: string, newStage: LeadStage): Promise<void> => {
      const existing = leads.find((l) => l.id === id)
      if (!existing || existing.stage === newStage) return

      // Optimistic update
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, stage: newStage } : l))
      )
      setError(null)

      try {
        await apiFetch(`/api/v1/leads/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ stage: newStage }),
        })
      } catch (err) {
        // Rollback
        setLeads((prev) =>
          prev.map((l) => (l.id === id ? existing : l))
        )
        setError(err instanceof Error ? err.message : 'Failed to move lead')
      }
    },
    [leads]
  )

  const deleteLead = useCallback(
    async (id: string): Promise<void> => {
      const existing = leads.find((l) => l.id === id)
      if (!existing) return

      // Optimistic delete
      setLeads((prev) => prev.filter((l) => l.id !== id))
      setError(null)

      try {
        await apiFetch(`/api/v1/leads/${id}`, { method: 'DELETE' })
      } catch (err) {
        // Rollback
        setLeads((prev) => [...prev, existing])
        setError(err instanceof Error ? err.message : 'Failed to delete lead')
      }
    },
    [leads]
  )

  const fetchTimeline = useCallback(async (id: string): Promise<LeadActivity[]> => {
    try {
      const data = await apiFetch<{ activities: LeadActivity[] }>(
        `/api/v1/leads/${id}/timeline`
      )
      return data.activities
    } catch {
      return []
    }
  }, [])

  const scheduleMeeting = useCallback(async (id: string): Promise<MeetingResult | null> => {
    try {
      return await apiFetch<MeetingResult>(`/api/v1/leads/${id}/schedule-meeting`, {
        method: 'POST',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule meeting')
      return null
    }
  }, [])

  return {
    leads,
    loading,
    error,
    fetchPipeline,
    createLead,
    updateLead,
    moveLead,
    deleteLead,
    fetchTimeline,
    scheduleMeeting,
  }
}
