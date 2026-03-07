import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { KanbanNotification } from '@/types/kanban'

interface UseNotificationsReturn {
  notifications: KanbanNotification[]
  unreadCount: number
  loading: boolean
  markAsRead: (id: string) => void
  markAllRead: () => void
}

export function useNotifications(
  userId: string | null,
): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<KanbanNotification[]>([])
  const [loading, setLoading] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Fetch notifications for user
  useEffect(() => {
    if (!userId) {
      setNotifications([])
      return
    }

    let cancelled = false

    async function fetchNotifications() {
      setLoading(true)

      const { data, error } = await supabase
        .from('kanban_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (cancelled) return

      if (error) {
        console.error('Failed to fetch notifications:', error.message)
        setLoading(false)
        return
      }

      setNotifications((data ?? []) as KanbanNotification[])
      setLoading(false)
    }

    fetchNotifications()
    return () => {
      cancelled = true
    }
  }, [userId])

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!userId) return

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel(`kanban-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'kanban_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as KanbanNotification
          setNotifications((prev) => [newNotification, ...prev])
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'kanban_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as KanbanNotification
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n)),
          )
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [userId])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = useCallback(
    (id: string) => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      )

      supabase
        .from('kanban_notifications')
        .update({ read: true })
        .eq('id', id)
        .then(({ error }) => {
          if (error) {
            // Roll back
            setNotifications((prev) =>
              prev.map((n) => (n.id === id ? { ...n, read: false } : n)),
            )
            console.error('Failed to mark notification as read:', error.message)
          }
        })
    },
    [],
  )

  const markAllRead = useCallback(() => {
    if (!userId) return

    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) return

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))

    supabase
      .from('kanban_notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
      .then(({ error }) => {
        if (error) {
          // Roll back
          setNotifications((prev) =>
            prev.map((n) =>
              unreadIds.includes(n.id) ? { ...n, read: false } : n,
            ),
          )
          console.error(
            'Failed to mark all notifications as read:',
            error.message,
          )
        }
      })
  }, [userId, notifications])

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllRead,
  }
}
