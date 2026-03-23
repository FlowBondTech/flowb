'use client'

import {
  NotificationType,
  useGetMyNotificationsQuery,
  useMarkAllNotificationsReadMutation,
} from '@/src/generated/graphql'
import { useRouter } from 'next/navigation'
import type { IconType } from 'react-icons'
import {
  FiAlertCircle,
  FiAward,
  FiBell,
  FiCalendar,
  FiHeart,
  FiMessageCircle,
  FiUserPlus,
  FiUsers,
  FiVolume2,
} from 'react-icons/fi'

const getNotificationConfig = (type: NotificationType): { icon: IconType; color: string } => {
  switch (type) {
    case NotificationType.Achievement:
      return { icon: FiAward, color: 'text-yellow-400' }
    case NotificationType.PostLike:
      return { icon: FiHeart, color: 'text-pink-400' }
    case NotificationType.PostComment:
      return { icon: FiMessageCircle, color: 'text-blue-400' }
    case NotificationType.EventReminder:
    case NotificationType.EventUpdate:
      return { icon: FiCalendar, color: 'text-neon-purple' }
    case NotificationType.DanceBond:
      return { icon: FiUsers, color: 'text-green-400' }
    case NotificationType.Referral:
      return { icon: FiUserPlus, color: 'text-teal-400' }
    case NotificationType.AdminBroadcast:
    case NotificationType.EventManagerBroadcast:
      return { icon: FiVolume2, color: 'text-orange-400' }
    case NotificationType.System:
    default:
      return { icon: FiAlertCircle, color: 'text-gray-400' }
  }
}

export default function NotificationsCenterWidget() {
  const router = useRouter()
  const { data, loading, refetch } = useGetMyNotificationsQuery({
    variables: {
      limit: 5,
    },
  })

  const [markAllRead, { loading: markingAll }] = useMarkAllNotificationsReadMutation({
    onCompleted: () => {
      refetch()
    },
  })

  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const past = new Date(timestamp)
    const diffMs = now.getTime() - past.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) {
      return `${diffMins}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else {
      return `${diffDays}d ago`
    }
  }

  const getNotificationNavigation = (notification: {
    type: NotificationType
    event_id?: string | null
    post_id?: string | null
  }) => {
    if (
      [NotificationType.EventReminder, NotificationType.EventUpdate].includes(notification.type)
    ) {
      return '/dashboard/my-events'
    } else if (
      [NotificationType.PostComment, NotificationType.PostLike].includes(notification.type)
    ) {
      return '/dashboard/feed'
    } else if (notification.type === NotificationType.DanceBond) {
      return '/dashboard/connections'
    }
    return null
  }

  if (loading) {
    return (
      <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-neon-purple/30 border-t-neon-purple rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const notifications = data?.myNotifications?.notifications || []
  const unreadCount = data?.myNotifications?.unread_count || 0

  return (
    <div className="bg-bg-secondary border border-neon-purple/20 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
            <FiBell className="w-5 h-5 text-white" />
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-bg-secondary rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">Notifications</h2>
            <p className="text-sm text-text-secondary">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push('/dashboard/notifications')}
          className="text-sm text-neon-purple hover:text-neon-pink font-medium transition-colors"
        >
          View All
        </button>
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map(notification => {
            const config = getNotificationConfig(notification.type)
            const Icon = config.icon
            const navPath = getNotificationNavigation(notification)

            return (
              <div
                key={notification.id}
                onClick={() => {
                  if (navPath) {
                    router.push(navPath)
                  }
                }}
                className={`flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                  notification.read
                    ? 'bg-bg-primary/20 border border-white/5 hover:border-white/10'
                    : 'bg-neon-purple/10 border border-neon-purple/30 hover:border-neon-purple/50'
                }`}
              >
                {/* Icon */}
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <h3 className="text-sm font-semibold text-text-primary">
                      {notification.title}
                    </h3>
                    <span className="text-xs text-text-muted flex-shrink-0">
                      {getTimeAgo(notification.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary">{notification.message}</p>
                </div>

                {/* Unread Indicator */}
                {!notification.read && (
                  <div className="flex-shrink-0 w-2 h-2 bg-neon-purple rounded-full mt-2" />
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neon-purple/10 flex items-center justify-center">
            <FiBell className="w-8 h-8 text-neon-purple" />
          </div>
          <p className="text-text-secondary mb-2">No notifications</p>
          <p className="text-sm text-text-muted">You're all caught up!</p>
        </div>
      )}

      {/* Mark All as Read */}
      {unreadCount > 0 && (
        <button
          onClick={() => markAllRead()}
          disabled={markingAll}
          className="w-full mt-4 py-2.5 bg-bg-primary/50 hover:bg-bg-primary border border-white/10 hover:border-neon-purple/30 rounded-xl text-text-secondary hover:text-neon-purple text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {markingAll ? 'Marking...' : 'Mark All as Read'}
        </button>
      )}
    </div>
  )
}
