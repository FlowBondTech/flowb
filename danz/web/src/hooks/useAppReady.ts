'use client'

import { useAuth } from '@/src/contexts/AuthContext'
import { useCallback, useEffect, useState } from 'react'

interface UseAppReadyOptions {
  minSplashDuration?: number
}

interface UseAppReadyResult {
  isReady: boolean
  showSplash: boolean
  isAuthenticated: boolean
  isLoading: boolean
  hideSplash: () => void
}

/**
 * Hook to manage app initialization and splash screen timing.
 * Ensures splash shows for minimum duration while checking auth state.
 */
export function useAppReady({
  minSplashDuration = 1500,
}: UseAppReadyOptions = {}): UseAppReadyResult {
  const { isAuthenticated, isLoading } = useAuth()
  const [showSplash, setShowSplash] = useState(true)
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)

  // Minimum splash timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true)
    }, minSplashDuration)

    return () => clearTimeout(timer)
  }, [minSplashDuration])

  // Hide splash when both auth is ready and min time elapsed
  useEffect(() => {
    if (!isLoading && minTimeElapsed) {
      setShowSplash(false)
    }
  }, [isLoading, minTimeElapsed])

  const hideSplash = useCallback(() => {
    setShowSplash(false)
  }, [])

  return {
    isReady: !isLoading && !showSplash,
    showSplash,
    isAuthenticated,
    isLoading,
    hideSplash,
  }
}
