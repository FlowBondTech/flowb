'use client'

import type { ToastProps, ToastType } from '@/src/components/ui/Toast'
import { useCallback, useState } from 'react'

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const addToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(7)
    const toast: ToastProps = {
      id,
      type,
      message,
      duration,
      onClose: (toastId: string) => {
        setToasts(prev => prev.filter(t => t.id !== toastId))
      },
    }
    setToasts(prev => [...prev, toast])
    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const success = useCallback(
    (message: string, duration?: number) => addToast('success', message, duration),
    [addToast],
  )
  const error = useCallback(
    (message: string, duration?: number) => addToast('error', message, duration),
    [addToast],
  )
  const warning = useCallback(
    (message: string, duration?: number) => addToast('warning', message, duration),
    [addToast],
  )
  const info = useCallback(
    (message: string, duration?: number) => addToast('info', message, duration),
    [addToast],
  )

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  }
}
