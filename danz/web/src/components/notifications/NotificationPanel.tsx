'use client'

import { useNotifications } from '@/src/contexts/NotificationContext'
import { NotificationType } from '@/src/generated/graphql'
import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { FiBell, FiCheck, FiRefreshCw, FiSettings, FiX } from 'react-icons/fi'
import NotificationItem, { NotificationItemSkeleton } from './NotificationItem'

type FilterType = 'all' | 'unread' | NotificationType

const filterOptions: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: NotificationType.PostLike, label: 'Likes' },
  { value: NotificationType.PostComment, label: 'Comments' },
  { value: NotificationType.EventReminder, label: 'Events' },
  { value: NotificationType.Referral, label: 'Referrals' },
]

export default function NotificationPanel() {
  const { notifications, unreadCount, loading, isPanelOpen, closePanel, markAllAsRead, refetch } =
    useNotifications()

  const [filter, setFilter] = useState<FilterType>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close panel on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [closePanel])

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Check if click was on the bell button
        const bellButton = document.querySelector('[aria-label*="Notifications"]')
        if (bellButton && bellButton.contains(e.target as Node)) return
        closePanel()
      }
    }
    if (isPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isPanelOpen, closePanel])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead()
  }

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true
    if (filter === 'unread') return !notification.read
    return notification.type === filter
  })

  return (
    <AnimatePresence>
      {isPanelOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={closePanel}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed lg:absolute right-0 top-14 sm:top-16 lg:top-auto lg:right-4 lg:mt-2 w-full lg:w-[420px] h-[calc(100%-3.5rem)] sm:h-[calc(100%-4rem)] lg:h-auto lg:max-h-[calc(100vh-100px)] bg-bg-secondary lg:rounded-xl border-l lg:border border-neon-purple/20 shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FiBell className="text-neon-purple" size={20} />
                  <h2 className="text-lg font-bold text-text-primary">Notifications</h2>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-neon-purple/20 text-neon-purple text-xs font-medium">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                    title="Refresh"
                  >
                    <motion.div
                      animate={isRefreshing ? { rotate: 360 } : {}}
                      transition={{
                        duration: 1,
                        repeat: isRefreshing ? Number.POSITIVE_INFINITY : 0,
                        ease: 'linear',
                      }}
                    >
                      <FiRefreshCw size={18} />
                    </motion.div>
                  </button>
                  <Link
                    href="/dashboard/settings"
                    onClick={closePanel}
                    className="p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors"
                    title="Notification settings"
                  >
                    <FiSettings size={18} />
                  </Link>
                  <button
                    onClick={closePanel}
                    className="p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <FiX size={20} />
                  </button>
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 -mb-1 scrollbar-none">
                {filterOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setFilter(option.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      filter === option.value
                        ? 'bg-neon-purple text-text-primary'
                        : 'bg-bg-card text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mark all read button */}
            {unreadCount > 0 && (
              <div className="flex-shrink-0 px-4 py-2 border-b border-white/5">
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-2 text-sm text-neon-purple hover:text-neon-pink transition-colors"
                >
                  <FiCheck size={16} />
                  <span>Mark all as read</span>
                </button>
              </div>
            )}

            {/* Notifications list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {loading && notifications.length === 0 ? (
                // Loading skeletons
                <>
                  <NotificationItemSkeleton />
                  <NotificationItemSkeleton />
                  <NotificationItemSkeleton />
                </>
              ) : filteredNotifications.length === 0 ? (
                // Empty state
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-bg-card flex items-center justify-center mb-4">
                    <FiBell className="text-text-muted" size={28} />
                  </div>
                  <h3 className="text-text-primary font-medium mb-1">
                    {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
                  </h3>
                  <p className="text-text-muted text-sm">
                    {filter === 'unread'
                      ? "You've read all your notifications"
                      : 'When you get notifications, they will appear here'}
                  </p>
                </div>
              ) : (
                // Notifications
                <AnimatePresence mode="popLayout">
                  {filteredNotifications.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClose={closePanel}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {filteredNotifications.length > 0 && (
              <div className="flex-shrink-0 p-3 border-t border-white/10">
                <Link
                  href="/dashboard/notifications"
                  onClick={closePanel}
                  className="block w-full py-2 px-4 rounded-lg bg-bg-card hover:bg-bg-hover text-center text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  View all notifications
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
