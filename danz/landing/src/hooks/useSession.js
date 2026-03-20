/**
 * useSession Hook - React integration for SessionManager
 * Provides session state and actions to React components
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import sessionManager from '../utils/SessionManager'
import privyAgent from '../agents/privy-agent'

export function useSession() {
  const { ready, authenticated, user, login, logout } = usePrivy()
  const [session, setSession] = useState(sessionManager.getSession())
  const [isLoading, setIsLoading] = useState(!ready)
  const [sessionInfo, setSessionInfo] = useState(null)

  // Update session info periodically
  useEffect(() => {
    const updateInfo = () => {
      const info = sessionManager.getInfo()
      setSessionInfo(info)
    }

    updateInfo()
    const interval = setInterval(updateInfo, 1000) // Update every second

    return () => clearInterval(interval)
  }, [session])

  // Listen for session changes
  useEffect(() => {
    const unsubscribe = sessionManager.addListener((event, data) => {
      switch (event) {
        case 'session_created':
        case 'session_restored':
        case 'session_refreshed':
        case 'session_synced':
          setSession(data)
          break
          
        case 'session_destroyed':
          setSession(null)
          break
          
        case 'session_inactive':
          // Handle inactivity warning
          console.warn('Session inactive:', data)
          break
      }
    })

    return unsubscribe
  }, [])

  // Handle Privy authentication changes
  useEffect(() => {
    if (!ready) {
      setIsLoading(true)
      return
    }

    setIsLoading(false)

    if (authenticated && user) {
      // Initialize Privy agent
      privyAgent.init(user)
      
      // Create or restore session
      if (!sessionManager.getSession()) {
        sessionManager.createSession(user)
      } else {
        // Refresh existing session with new auth data
        sessionManager.refreshSession()
      }
      
      // Save user profile
      privyAgent.saveUserProfile().catch(console.error)
    } else if (!authenticated && sessionManager.getSession()) {
      // User logged out, destroy session
      sessionManager.destroySession('logout')
    }
  }, [ready, authenticated, user])

  // Login with session creation
  const loginWithSession = useCallback(async () => {
    try {
      setIsLoading(true)
      await login()
      // Session will be created automatically in useEffect
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [login])

  // Logout with session cleanup
  const logoutWithSession = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Destroy session first
      sessionManager.destroySession('logout')
      
      // Then logout from Privy
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [logout])

  // Refresh session manually
  const refreshSession = useCallback(async () => {
    try {
      const refreshed = await sessionManager.refreshSession()
      setSession(refreshed)
      return refreshed
    } catch (error) {
      console.error('Session refresh failed:', error)
      throw error
    }
  }, [])

  // Update session metadata
  const updateSessionMetadata = useCallback((metadata) => {
    sessionManager.updateMetadata(metadata)
    setSession(sessionManager.getSession())
  }, [])

  // Check premium access
  const checkPremiumAccess = useCallback(async () => {
    try {
      const hasPremium = await sessionManager.hasPremiumAccess()
      return hasPremium
    } catch (error) {
      console.error('Premium check failed:', error)
      return false
    }
  }, [])

  // Check device reservation
  const checkDeviceReservation = useCallback(async () => {
    try {
      const hasDevice = await sessionManager.hasDeviceReservation()
      return hasDevice
    } catch (error) {
      console.error('Device check failed:', error)
      return false
    }
  }, [])

  // Get session status
  const sessionStatus = useMemo(() => {
    if (isLoading) return 'loading'
    if (!session) return 'unauthenticated'
    if (!sessionInfo) return 'authenticated'
    
    if (sessionInfo.isExpired) return 'expired'
    if (!sessionInfo.isActive) return 'inactive'
    if (sessionInfo.timeRemaining < 5 * 60 * 1000) return 'expiring_soon'
    
    return 'active'
  }, [isLoading, session, sessionInfo])

  // Session utilities
  const sessionUtils = useMemo(() => ({
    isAuthenticated: !!session && !sessionInfo?.isExpired,
    isExpired: sessionInfo?.isExpired || false,
    isActive: sessionInfo?.isActive || false,
    timeRemaining: sessionInfo?.timeRemaining || 0,
    inactiveTime: sessionInfo?.inactiveTime || 0,
    userId: session?.userId || null,
    email: session?.email || null,
    name: session?.name || null,
    provider: session?.provider || null
  }), [session, sessionInfo])

  return {
    // Session state
    session,
    sessionInfo,
    sessionStatus,
    isLoading,
    
    // Session utilities
    ...sessionUtils,
    
    // Session actions
    login: loginWithSession,
    logout: logoutWithSession,
    refreshSession,
    updateSessionMetadata,
    checkPremiumAccess,
    checkDeviceReservation,
    
    // Privy state (for compatibility)
    user,
    ready,
    authenticated
  }
}

// Export additional utility hooks

/**
 * Hook to require authentication
 */
export function useRequireAuth(redirectTo = '/') {
  const { isAuthenticated, isLoading } = useSession()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Store intended destination
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname)
        
        // Redirect to home or login page
        window.location.href = redirectTo
      } else {
        setIsAuthorized(true)
      }
    }
  }, [isAuthenticated, isLoading, redirectTo])

  return { isAuthorized, isLoading }
}

/**
 * Hook to check premium access
 */
export function usePremiumAccess() {
  const { checkPremiumAccess, isAuthenticated } = useSession()
  const [hasPremium, setHasPremium] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (isAuthenticated) {
      setIsChecking(true)
      checkPremiumAccess()
        .then(setHasPremium)
        .finally(() => setIsChecking(false))
    } else {
      setHasPremium(false)
      setIsChecking(false)
    }
  }, [isAuthenticated, checkPremiumAccess])

  return { hasPremium, isChecking }
}

/**
 * Hook for session countdown
 */
export function useSessionCountdown() {
  const { sessionInfo } = useSession()
  const [countdown, setCountdown] = useState(null)

  useEffect(() => {
    if (!sessionInfo) {
      setCountdown(null)
      return
    }

    const updateCountdown = () => {
      const remaining = sessionInfo.timeRemaining
      
      if (remaining <= 0) {
        setCountdown('Session expired')
      } else {
        const minutes = Math.floor(remaining / 60000)
        const seconds = Math.floor((remaining % 60000) / 1000)
        setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [sessionInfo])

  return countdown
}