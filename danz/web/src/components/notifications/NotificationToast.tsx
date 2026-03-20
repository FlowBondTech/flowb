'use client'

import { useNotifications } from '@/src/contexts/NotificationContext'
import { AnimatePresence, motion } from 'motion/react'
import { FiAlertCircle, FiAlertTriangle, FiCheck, FiInfo, FiX } from 'react-icons/fi'

const toastStyles = {
  success: {
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    icon: FiCheck,
    iconColor: 'text-emerald-400',
    progressColor: 'bg-emerald-400',
  },
  error: {
    bg: 'bg-red-500/10 border-red-500/30',
    icon: FiAlertCircle,
    iconColor: 'text-red-400',
    progressColor: 'bg-red-400',
  },
  warning: {
    bg: 'bg-amber-500/10 border-amber-500/30',
    icon: FiAlertTriangle,
    iconColor: 'text-amber-400',
    progressColor: 'bg-amber-400',
  },
  info: {
    bg: 'bg-neon-purple/10 border-neon-purple/30',
    icon: FiInfo,
    iconColor: 'text-neon-purple',
    progressColor: 'bg-neon-purple',
  },
}

export default function NotificationToast() {
  const { toasts, dismissToast } = useNotifications()

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => {
          const style = toastStyles[toast.type]
          const Icon = style.icon

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`pointer-events-auto relative overflow-hidden rounded-xl border ${style.bg} backdrop-blur-sm shadow-lg`}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center ${style.iconColor}`}
                  >
                    <Icon size={18} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <h4 className="font-medium text-text-primary text-sm leading-tight">
                      {toast.title}
                    </h4>
                    {toast.message && (
                      <p className="text-text-secondary text-sm mt-1 line-clamp-2">
                        {toast.message}
                      </p>
                    )}
                  </div>

                  {/* Close button */}
                  <button
                    onClick={() => dismissToast(toast.id)}
                    className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              {toast.duration && toast.duration > 0 && (
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: toast.duration / 1000, ease: 'linear' }}
                  className={`absolute bottom-0 left-0 h-1 ${style.progressColor}`}
                />
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

// Export a standalone toast component that can be used without the context
export function StandaloneToast({
  type = 'info',
  title,
  message,
  onDismiss,
  duration = 4000,
}: {
  type?: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  onDismiss?: () => void
  duration?: number
}) {
  const style = toastStyles[type]
  const Icon = style.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`relative overflow-hidden rounded-xl border ${style.bg} backdrop-blur-sm shadow-lg max-w-sm`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center ${style.iconColor}`}
          >
            <Icon size={18} />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h4 className="font-medium text-text-primary text-sm leading-tight">{title}</h4>
            {message && <p className="text-text-secondary text-sm mt-1 line-clamp-2">{message}</p>}
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
            >
              <FiX size={16} />
            </button>
          )}
        </div>
      </div>
      {duration > 0 && (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
          className={`absolute bottom-0 left-0 h-1 ${style.progressColor}`}
        />
      )}
    </motion.div>
  )
}
