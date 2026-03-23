'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  type User,
  type AuthProvider,
  getLinkingStatus,
} from '@/types/auth'
import {
  initiateLinkToWeb,
  linkAccount,
  unlinkAccount,
  handleLinkingCallback,
  fetchUserProfile,
  storeLinkingState,
  retrieveLinkingState,
  clearLinkingState,
  calculateLinkingXpPotential,
  getLinkingStatusMessage,
} from '@/lib/account-linking'

interface UseAccountLinkingOptions {
  user: User | null
  onUserUpdate?: (user: User) => void
  onLinkSuccess?: (provider: AuthProvider, bonusXp?: number) => void
  onLinkError?: (error: string) => void
}

interface UseAccountLinkingReturn {
  // State
  isLinking: boolean
  linkingProvider: AuthProvider | null
  linkingError: string | null
  linkingStatus: ReturnType<typeof getLinkingStatus> | null

  // Actions
  linkToWeb: () => Promise<void>
  linkProvider: (provider: AuthProvider, providerId: string, metadata: Record<string, unknown>) => Promise<void>
  unlinkProvider: (provider: AuthProvider) => Promise<void>
  checkPendingLink: () => Promise<void>
  clearError: () => void

  // Computed
  xpPotential: ReturnType<typeof calculateLinkingXpPotential> | null
  statusMessage: string
}

export function useAccountLinking({
  user,
  onUserUpdate,
  onLinkSuccess,
  onLinkError,
}: UseAccountLinkingOptions): UseAccountLinkingReturn {
  const [isLinking, setIsLinking] = useState(false)
  const [linkingProvider, setLinkingProvider] = useState<AuthProvider | null>(null)
  const [linkingError, setLinkingError] = useState<string | null>(null)

  // Computed values
  const linkingStatus = user ? getLinkingStatus(user) : null
  const xpPotential = user ? calculateLinkingXpPotential(user) : null
  const statusMessage = user ? getLinkingStatusMessage(user) : 'Sign in to link accounts'

  // Clear error
  const clearError = useCallback(() => {
    setLinkingError(null)
  }, [])

  // Handle error
  const handleError = useCallback((error: string) => {
    setLinkingError(error)
    onLinkError?.(error)
  }, [onLinkError])

  // Initiate link to web app
  const linkToWeb = useCallback(async () => {
    setIsLinking(true)
    setLinkingProvider('privy')
    setLinkingError(null)

    try {
      const result = await initiateLinkToWeb()

      if (result.success && result.linkUrl) {
        // Store state for when user returns
        storeLinkingState({
          token: new URL(result.linkUrl).searchParams.get('token') || '',
          initiatedAt: Date.now(),
          targetProvider: 'privy',
        })

        // Open the web app
        window.open(result.linkUrl, '_blank')
      } else {
        handleError(result.error || 'Failed to initiate linking')
      }
    } catch (error) {
      handleError(error instanceof Error ? error.message : 'Failed to initiate linking')
    } finally {
      setIsLinking(false)
      setLinkingProvider(null)
    }
  }, [handleError])

  // Link a specific provider
  const linkProvider = useCallback(async (
    provider: AuthProvider,
    providerId: string,
    metadata: Record<string, unknown>
  ) => {
    setIsLinking(true)
    setLinkingProvider(provider)
    setLinkingError(null)

    try {
      const result = await linkAccount(provider, providerId, metadata)

      if (result.success && result.user) {
        onUserUpdate?.(result.user)
        onLinkSuccess?.(provider, result.bonusXp)
      } else {
        handleError(result.error || 'Failed to link account')
      }
    } catch (error) {
      handleError(error instanceof Error ? error.message : 'Failed to link account')
    } finally {
      setIsLinking(false)
      setLinkingProvider(null)
    }
  }, [onUserUpdate, onLinkSuccess, handleError])

  // Unlink a provider
  const unlinkProvider = useCallback(async (provider: AuthProvider) => {
    setIsLinking(true)
    setLinkingProvider(provider)
    setLinkingError(null)

    try {
      const result = await unlinkAccount(provider)

      if (result.success) {
        // Fetch updated user
        const updatedUser = await fetchUserProfile()
        if (updatedUser) {
          onUserUpdate?.(updatedUser)
        }
      } else {
        handleError(result.error || 'Failed to unlink account')
      }
    } catch (error) {
      handleError(error instanceof Error ? error.message : 'Failed to unlink account')
    } finally {
      setIsLinking(false)
      setLinkingProvider(null)
    }
  }, [onUserUpdate, handleError])

  // Check for pending link from returning from web app
  const checkPendingLink = useCallback(async () => {
    const state = retrieveLinkingState()
    if (!state) return

    setIsLinking(true)
    setLinkingProvider(state.targetProvider)

    try {
      const result = await handleLinkingCallback(state.token)

      if (result.success && result.user) {
        onUserUpdate?.(result.user)
        onLinkSuccess?.(state.targetProvider, result.bonusXp)
      } else {
        handleError(result.error || 'Failed to complete linking')
      }
    } catch (error) {
      handleError(error instanceof Error ? error.message : 'Failed to complete linking')
    } finally {
      clearLinkingState()
      setIsLinking(false)
      setLinkingProvider(null)
    }
  }, [onUserUpdate, onLinkSuccess, handleError])

  // Check for pending link on mount and when window gains focus
  useEffect(() => {
    checkPendingLink()

    const handleFocus = () => {
      checkPendingLink()
    }

    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [checkPendingLink])

  // Check URL params for link callback
  useEffect(() => {
    if (typeof window === 'undefined') return

    const url = new URL(window.location.href)
    const linkToken = url.searchParams.get('link_token')
    const linkSuccess = url.searchParams.get('link_success')

    if (linkToken || linkSuccess) {
      // Clean URL
      url.searchParams.delete('link_token')
      url.searchParams.delete('link_success')
      url.searchParams.delete('link_error')
      window.history.replaceState({}, '', url.toString())

      if (linkSuccess === 'true') {
        // Fetch updated user
        fetchUserProfile().then(updatedUser => {
          if (updatedUser) {
            onUserUpdate?.(updatedUser)
          }
        })
      }
    }
  }, [onUserUpdate])

  return {
    isLinking,
    linkingProvider,
    linkingError,
    linkingStatus,
    linkToWeb,
    linkProvider,
    unlinkProvider,
    checkPendingLink,
    clearError,
    xpPotential,
    statusMessage,
  }
}

export default useAccountLinking
