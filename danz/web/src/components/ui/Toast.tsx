'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX, FiXCircle } from 'react-icons/fi'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  id: string
  type: ToastType
  message: string
  duration?: number
  onClose: (id: string) => void
}

export function Toast({ id, type, message, duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [id, duration, onClose])

  const icons = {
    success: FiCheckCircle,
    error: FiXCircle,
    warning: FiAlertCircle,
    info: FiInfo,
  }

  const styles = {
    success: 'bg-green-500/20 border-green-500/50 text-green-400',
    error: 'bg-red-500/20 border-red-500/50 text-red-400',
    warning: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
    info: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
  }

  const Icon = icons[type]

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm shadow-lg ${styles[type]}`}
    >
      <Icon size={20} className="flex-shrink-0" />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
        aria-label="Close notification"
      >
        <FiX size={16} />
      </button>
    </motion.div>
  )
}

export function ToastContainer({
  toasts,
  onClose,
}: { toasts: ToastProps[]; onClose: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast {...toast} onClose={onClose} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
