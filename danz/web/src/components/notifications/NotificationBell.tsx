'use client'

import { useNotifications } from '@/src/contexts/NotificationContext'
import { AnimatePresence, motion } from 'motion/react'
import { FiBell } from 'react-icons/fi'

interface NotificationBellProps {
  size?: number
  collapsed?: boolean
}

export default function NotificationBell({ size = 20, collapsed = false }: NotificationBellProps) {
  const { unreadCount, togglePanel, isPanelOpen } = useNotifications()

  return (
    <button
      onClick={togglePanel}
      className={`relative flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        isPanelOpen
          ? 'bg-neon-purple/20 text-neon-purple'
          : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
      }`}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <div className="relative">
        <motion.div
          animate={unreadCount > 0 ? { rotate: [0, -10, 10, -10, 0] } : {}}
          transition={{
            duration: 0.5,
            repeat: unreadCount > 0 ? Number.POSITIVE_INFINITY : 0,
            repeatDelay: 3,
          }}
        >
          <FiBell size={size} />
        </motion.div>

        {/* Unread Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center"
            >
              <span className="relative flex items-center justify-center">
                {/* Glow effect */}
                <span className="absolute inset-0 rounded-full bg-neon-pink animate-pulse-glow opacity-50" />
                {/* Badge */}
                <span className="relative min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-neon-pink to-neon-purple text-[10px] font-bold text-white flex items-center justify-center shadow-glow-pink">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!collapsed && <span>Notifications</span>}
    </button>
  )
}

// Compact version for mobile header
export function NotificationBellCompact({ size = 24 }: { size?: number }) {
  const { unreadCount, togglePanel, isPanelOpen } = useNotifications()

  return (
    <button
      onClick={togglePanel}
      className={`relative p-2 rounded-lg transition-colors ${
        isPanelOpen ? 'bg-neon-purple/20 text-neon-purple' : 'text-text-primary hover:bg-white/5'
      }`}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <motion.div
        animate={unreadCount > 0 ? { rotate: [0, -10, 10, -10, 0] } : {}}
        transition={{
          duration: 0.5,
          repeat: unreadCount > 0 ? Number.POSITIVE_INFINITY : 0,
          repeatDelay: 3,
        }}
      >
        <FiBell size={size} />
      </motion.div>

      {/* Unread Badge */}
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute -top-0.5 -right-0.5"
          >
            <span className="relative flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-neon-pink animate-pulse-glow opacity-50" />
              <span className="relative min-w-[16px] h-[16px] px-0.5 rounded-full bg-gradient-to-r from-neon-pink to-neon-purple text-[9px] font-bold text-white flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}
