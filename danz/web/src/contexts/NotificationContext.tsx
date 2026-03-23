'use client'

import {
  type Notification,
  NotificationType,
  useDeleteNotificationMutation,
  useGetMyNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '@/src/generated/graphql'
import { useAuth } from '@/src/contexts/AuthContext'
import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react'

interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
  duration?: number
}

interface NotificationContextType {
  // Notification data
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null

  // Panel state
  isPanelOpen: boolean
  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void

  // Actions
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  refetch: () => Promise<void>

  // Toast system
  toasts: Toast[]
  showToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

const POLL_INTERVAL = 30000 // 30 seconds

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  // Fetch notifications with polling
  const {
    data: notificationsData,
    loading: notificationsLoading,
    error: notificationsError,
    refetch: refetchNotifications,
  } = useGetMyNotificationsQuery({
    variables: { limit: 50, offset: 0 },
    skip: !isAuthenticated || isLoading,
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  // Fetch unread count with faster polling
  const { data: unreadData, refetch: refetchUnread } = useGetUnreadNotificationCountQuery({
    skip: !isAuthenticated || isLoading,
    pollInterval: POLL_INTERVAL / 2, // Poll unread count more frequently
    fetchPolicy: 'cache-and-network',
  })

  // Mutations
  const [markReadMutation] = useMarkNotificationReadMutation()
  const [markAllReadMutation] = useMarkAllNotificationsReadMutation()
  const [deleteMutation] = useDeleteNotificationMutation()

  // Track previous unread count for new notification detection
  const [prevUnreadCount, setPrevUnreadCount] = useState(0)
  const currentUnreadCount = unreadData?.unreadNotificationCount ?? 0

  // Detect new notifications and show toast
  useEffect(() => {
    if (currentUnreadCount > prevUnreadCount && prevUnreadCount > 0) {
      // New notification arrived
      const latestNotification = notificationsData?.myNotifications?.notifications?.[0]
      if (latestNotification && !latestNotification.read) {
        showToast({
          type: 'info',
          title: latestNotification.title,
          message: latestNotification.message ?? undefined,
          duration: 5000,
        })
      }
    }
    setPrevUnreadCount(currentUnreadCount)
  }, [currentUnreadCount, notificationsData])

  // Panel controls
  const openPanel = useCallback(() => setIsPanelOpen(true), [])
  const closePanel = useCallback(() => setIsPanelOpen(false), [])
  const togglePanel = useCallback(() => setIsPanelOpen(prev => !prev), [])

  // Mark single notification as read
  const markAsRead = useCallback(
    async (id: string) => {
      try {
        await markReadMutation({
          variables: { id },
          optimisticResponse: {
            __typename: 'Mutation',
            markNotificationRead: {
              __typename: 'Notification',
              id,
              read: true,
              read_at: new Date().toISOString(),
            },
          },
        })
        await refetchUnread()
      } catch (err) {
        console.error('Failed to mark notification as read:', err)
      }
    },
    [markReadMutation, refetchUnread],
  )

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await markAllReadMutation()
      await refetchNotifications()
      await refetchUnread()
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }, [markAllReadMutation, refetchNotifications, refetchUnread])

  // Delete notification
  const deleteNotification = useCallback(
    async (id: string) => {
      try {
        await deleteMutation({
          variables: { id },
          update: cache => {
            cache.evict({ id: `Notification:${id}` })
            cache.gc()
          },
        })
        await refetchUnread()
      } catch (err) {
        console.error('Failed to delete notification:', err)
      }
    },
    [deleteMutation, refetchUnread],
  )

  // Refetch all notification data
  const refetch = useCallback(async () => {
    await Promise.all([refetchNotifications(), refetchUnread()])
  }, [refetchNotifications, refetchUnread])

  // Toast system
  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToast: Toast = { ...toast, id, duration: toast.duration ?? 4000 }

    setToasts(prev => [...prev, newToast])

    // Auto dismiss
    const duration = newToast.duration ?? 4000
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const notifications = (notificationsData?.myNotifications?.notifications ?? []) as Notification[]
  const loading = notificationsLoading
  const error = notificationsError?.message ?? null

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount: currentUnreadCount,
        loading,
        error,
        isPanelOpen,
        openPanel,
        closePanel,
        togglePanel,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refetch,
        toasts,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

// Helper function to get notification icon based on type
export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case NotificationType.Achievement:
      return '🏆'
    case NotificationType.PostLike:
      return '❤️'
    case NotificationType.PostComment:
      return '💬'
    case NotificationType.EventReminder:
      return '📅'
    case NotificationType.EventUpdate:
      return '📢'
    case NotificationType.Referral:
      return '🎁'
    case NotificationType.DanceBond:
      return '💃'
    case NotificationType.AdminBroadcast:
    case NotificationType.EventManagerBroadcast:
      return '📣'
    case NotificationType.System:
    default:
      return '🔔'
  }
}

// Helper to format notification time
export function formatNotificationTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
