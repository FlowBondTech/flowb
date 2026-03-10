import { useState, useEffect, useCallback, useRef } from 'react'
import { createId } from '@paralleldrive/cuid2'
import { supabase } from '@/lib/supabase'
import type { TaskActivity } from '@/types/kanban'

export function useTaskActivity(taskId: string | null) {
  const [activities, setActivities] = useState<TaskActivity[]>([])
  const [loading, setLoading] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Fetch existing activities
  useEffect(() => {
    if (!taskId) {
      setActivities([])
      return
    }

    let cancelled = false
    setLoading(true)

    supabase
      .from('kanban_task_activity')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Failed to fetch activity:', error.message)
        } else {
          setActivities((data ?? []) as TaskActivity[])
        }
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [taskId])

  // Realtime subscription for new activity
  useEffect(() => {
    if (!taskId) return

    const channel = supabase
      .channel(`task-activity-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'kanban_task_activity',
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          const newActivity = payload.new as TaskActivity
          setActivities((prev) => {
            if (prev.some((a) => a.id === newActivity.id)) return prev
            return [...prev, newActivity]
          })
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [taskId])

  const addComment = useCallback(
    async (user: string, text: string) => {
      if (!taskId || !text.trim()) return

      const now = new Date().toISOString()
      const activity: TaskActivity = {
        id: createId(),
        task_id: taskId,
        user,
        action: 'commented',
        data: { text },
        created_at: now,
      }

      // Optimistic add
      setActivities((prev) => [...prev, activity])

      const { error } = await supabase
        .from('kanban_task_activity')
        .insert({
          id: activity.id,
          task_id: activity.task_id,
          user: activity.user,
          action: activity.action,
          data: activity.data,
          created_at: activity.created_at,
        })

      if (error) {
        // Roll back
        setActivities((prev) => prev.filter((a) => a.id !== activity.id))
        console.error('Failed to add comment:', error.message)
      }
    },
    [taskId],
  )

  return { activities, loading, addComment }
}
