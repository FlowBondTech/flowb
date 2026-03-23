'use client'

import {
  formatNotificationTime,
  getNotificationIcon,
  useNotifications,
} from '@/src/contexts/NotificationContext'
import { type Notification, NotificationType } from '@/src/generated/graphql'
import { motion } from 'motion/react'
import Link from 'next/link'
import { FiCheck, FiTrash2 } from 'react-icons/fi'

interface NotificationItemProps {
  notification: Notification
  onClose?: () => void
}

export default function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const { markAsRead, deleteNotification } = useNotifications()

  const handleClick = async () => {
    if (!notification.read) {
      await markAsRead(notification.id)
    }
    onClose?.()
  }

  const handleMarkRead = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    await markAsRead(notification.id)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    await deleteNotification(notification.id)
  }

  // Get action URL based on notification type
  const getActionUrl = (): string | null => {
    const actionData = notification.action_data as Record<string, string> | null

    switch (notification.type) {
      case NotificationType.EventReminder:
      case NotificationType.EventUpdate:
        return notification.event_id
          ? `/dashboard/my-events/${notification.event_id}`
          : '/dashboard/my-events'
      case NotificationType.PostLike:
      case NotificationType.PostComment:
        return notification.post_id
          ? `/dashboard/feed?post=${notification.post_id}`
          : '/dashboard/feed'
      case NotificationType.Referral:
        return '/dashboard/referrals'
      case NotificationType.Achievement:
        return '/dashboard/profile'
      case NotificationType.DanceBond:
        return '/dashboard/feed'
      default:
        return actionData?.url ?? null
    }
  }

  const actionUrl = getActionUrl()
  const icon = getNotificationIcon(notification.type)
  const timeAgo = formatNotificationTime(notification.created_at)

  const content = (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      whileHover={{ scale: 1.01 }}
      className={`group relative p-4 rounded-lg transition-all cursor-pointer ${
        notification.read
          ? 'bg-bg-card/50 hover:bg-bg-card'
          : 'bg-gradient-to-r from-neon-purple/10 to-neon-pink/10 hover:from-neon-purple/15 hover:to-neon-pink/15'
      }`}
      style={{
        borderLeft: notification.read ? 'none' : '3px solid rgb(var(--color-neon-purple-rgb))',
      }}
    >
      {/* Icon */}
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-bg-hover flex items-center justify-center text-xl">
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={`font-medium text-sm truncate ${notification.read ? 'text-text-secondary' : 'text-text-primary'}`}
            >
              {notification.title}
            </h4>
            <span className="text-xs text-text-muted whitespace-nowrap">{timeAgo}</span>
          </div>

          <p
            className={`text-sm mt-0.5 line-clamp-2 ${notification.read ? 'text-text-muted' : 'text-text-secondary'}`}
          >
            {notification.message}
          </p>

          {/* Sender info */}
          {notification.sender && (
            <div className="flex items-center gap-2 mt-2">
              {notification.sender.avatar_url ? (
                <img
                  src={notification.sender.avatar_url}
                  alt={notification.sender.display_name || notification.sender.username || 'User'}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-neon-purple/30 flex items-center justify-center text-[10px] font-bold text-neon-purple">
                  {notification.sender.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <span className="text-xs text-text-muted">@{notification.sender.username}</span>
            </div>
          )}

          {/* Event badge */}
          {notification.event && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon-blue/20 text-neon-blue text-xs">
                <span>📍</span>
                <span className="truncate max-w-[150px]">{notification.event.title}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons - visible on hover */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.read && (
          <button
            onClick={handleMarkRead}
            className="p-1.5 rounded-lg bg-bg-secondary hover:bg-neon-purple/20 text-text-muted hover:text-neon-purple transition-colors"
            title="Mark as read"
          >
            <FiCheck size={14} />
          </button>
        )}
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-lg bg-bg-secondary hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-colors"
          title="Delete"
        >
          <FiTrash2 size={14} />
        </button>
      </div>

      {/* Unread indicator dot */}
      {!notification.read && (
        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-neon-purple animate-pulse-glow group-hover:opacity-0 transition-opacity" />
      )}
    </motion.div>
  )

  if (actionUrl) {
    return (
      <Link href={actionUrl} onClick={handleClick}>
        {content}
      </Link>
    )
  }

  return <div onClick={handleClick}>{content}</div>
}

// Skeleton loader for notifications
export function NotificationItemSkeleton() {
  return (
    <div className="p-4 rounded-lg bg-bg-card/50 animate-pulse">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-bg-hover" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-bg-hover rounded w-3/4" />
          <div className="h-3 bg-bg-hover rounded w-full" />
          <div className="h-3 bg-bg-hover rounded w-1/2" />
        </div>
      </div>
    </div>
  )
}
