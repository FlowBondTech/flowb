'use client'

import { useApolloClient } from '@apollo/client'
import { useNeynarContext } from '@neynar/react'
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useFarcasterSDK } from '@/hooks/useFarcasterSDK'
import {
  type User as FullUser,
  type AuthProvider as AuthProviderType,
  type LinkingStatus,
  getLinkingStatus,
  LINKING_REWARDS,
} from '@/types/auth'
import { useAccountLinking } from '@/hooks/useAccountLinking'
import { fetchUserProfile } from '@/lib/account-linking'

// =====================================================
// Types
// =====================================================

// Simple user type for Farcaster-only context
interface FarcasterUser {
  id: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  fid: number
  walletAddress: string | null
  email: string | null
}

interface AuthContextType {
  // User state
  user: FarcasterUser | null
  fullUser: FullUser | null  // Full user with linked accounts
  isAuthenticated: boolean
  isLoading: boolean

  // Farcaster state
  isFarcasterFrame: boolean

  // Email subscription (for marketing/updates)
  subscribedEmail: string | null
  subscribeEmail: (email: string) => Promise<boolean>

  // Account linking
  linkingStatus: LinkingStatus | null
  isLinking: boolean
  linkingError: string | null
  linkToWeb: () => Promise<void>
  unlinkProvider: (provider: AuthProviderType) => Promise<void>
  clearLinkingError: () => void
  linkingXpPotential: {
    earned: number
    potential: number
    remaining: number
  } | null
  linkingRewards: typeof LINKING_REWARDS

  // Actions
  logout: () => Promise<void>
  openSignupPage: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// =====================================================
// Provider
// =====================================================

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const apolloClient = useApolloClient()
  const [subscribedEmail, setSubscribedEmail] = useState<string | null>(null)
  const [fullUser, setFullUser] = useState<FullUser | null>(null)
  const [isLoadingFullUser, setIsLoadingFullUser] = useState(false)

  // Farcaster SDK context (for miniapp frame users)
  const {
    isLoaded: farcasterLoaded,
    isInFrame,
    user: farcasterUser,
    openUrl
  } = useFarcasterSDK()

  // Neynar web auth context (for web users signing in with Farcaster)
  let neynarUser: { fid: number; username: string | null; display_name: string | null; pfp_url: string | null } | null = null
  let neynarAuthenticated = false
  let neynarLogout: (() => void) | null = null

  try {
    const neynarContext = useNeynarContext()
    // Map Neynar user to our type (convert undefined to null)
    if (neynarContext.user) {
      neynarUser = {
        fid: neynarContext.user.fid,
        username: neynarContext.user.username ?? null,
        display_name: neynarContext.user.display_name ?? null,
        pfp_url: neynarContext.user.pfp_url ?? null,
      }
    }
    neynarAuthenticated = neynarContext.isAuthenticated
    neynarLogout = neynarContext.logoutUser
  } catch {
    // Neynar context not available (e.g., no client ID configured)
  }

  // Build simple user from Farcaster SDK (frame) or Neynar (web)
  const user: FarcasterUser | null = farcasterUser ? {
    id: `farcaster:${farcasterUser.fid}`,
    username: farcasterUser.username || null,
    displayName: farcasterUser.displayName || null,
    avatarUrl: farcasterUser.pfpUrl || null,
    fid: farcasterUser.fid,
    walletAddress: null,
    email: subscribedEmail,
  } : neynarUser && neynarAuthenticated ? {
    id: `farcaster:${neynarUser.fid}`,
    username: neynarUser.username || null,
    displayName: neynarUser.display_name || null,
    avatarUrl: neynarUser.pfp_url || null,
    fid: neynarUser.fid,
    walletAddress: null,
    email: subscribedEmail,
  } : null

  // Handle full user updates
  const handleUserUpdate = useCallback((updatedUser: FullUser) => {
    setFullUser(updatedUser)
  }, [])

  // Handle linking success
  const handleLinkSuccess = useCallback((provider: AuthProviderType, bonusXp?: number) => {
    console.log(`Account linked: ${provider}${bonusXp ? `, earned ${bonusXp} XP` : ''}`)
    // Could show a toast notification here
  }, [])

  // Handle linking error
  const handleLinkError = useCallback((error: string) => {
    console.error('Linking error:', error)
    // Could show a toast notification here
  }, [])

  // Account linking hook
  const {
    isLinking,
    linkingError,
    linkingStatus,
    linkToWeb,
    unlinkProvider,
    clearError: clearLinkingError,
    xpPotential: linkingXpPotential,
  } = useAccountLinking({
    user: fullUser,
    onUserUpdate: handleUserUpdate,
    onLinkSuccess: handleLinkSuccess,
    onLinkError: handleLinkError,
  })

  // Loading state
  const isLoading = !farcasterLoaded || isLoadingFullUser

  // Get the active FID (from either Farcaster SDK or Neynar)
  const activeFid = farcasterUser?.fid || (neynarAuthenticated ? neynarUser?.fid : null)

  // Fetch full user profile when Farcaster user is available
  const refreshUser = useCallback(async () => {
    if (!activeFid) {
      setFullUser(null)
      return
    }

    setIsLoadingFullUser(true)
    try {
      const profile = await fetchUserProfile()
      if (profile) {
        setFullUser(profile)
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
    } finally {
      setIsLoadingFullUser(false)
    }
  }, [activeFid])

  // Fetch full user on Farcaster auth (either SDK or Neynar)
  useEffect(() => {
    if (activeFid) {
      refreshUser()
    }
  }, [activeFid, refreshUser])

  // Subscribe email for updates (stores locally and could send to backend)
  const subscribeEmail = async (email: string): Promise<boolean> => {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return false
      }

      // TODO: Send to backend API for email collection
      // await fetch('/api/subscribe', {
      //   method: 'POST',
      //   body: JSON.stringify({ email, fid: farcasterUser?.fid })
      // })

      setSubscribedEmail(email)
      // Store in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('danz_subscribed_email', email)
      }
      return true
    } catch (error) {
      console.error('Failed to subscribe email:', error)
      return false
    }
  }

  // Open the main DANZ website for full signup
  const openSignupPage = () => {
    openUrl('https://danz.app/signup')
  }

  // Logout handler (clears local state and Neynar session)
  const logout = async () => {
    setSubscribedEmail(null)
    setFullUser(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('danz_subscribed_email')
    }
    // Logout from Neynar if authenticated via web
    if (neynarLogout) {
      neynarLogout()
    }
    // Clear Apollo cache
    await apolloClient.clearStore()
  }

  // Load saved email on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !subscribedEmail) {
      const savedEmail = localStorage.getItem('danz_subscribed_email')
      if (savedEmail) {
        setSubscribedEmail(savedEmail)
      }
    }
  }, [subscribedEmail])

  const contextValue: AuthContextType = {
    // User state
    user,
    fullUser,
    isAuthenticated: !!user,
    isLoading,

    // Farcaster state
    isFarcasterFrame: isInFrame,

    // Email
    subscribedEmail,
    subscribeEmail,

    // Account linking
    linkingStatus: fullUser ? getLinkingStatus(fullUser) : linkingStatus,
    isLinking,
    linkingError,
    linkToWeb,
    unlinkProvider,
    clearLinkingError,
    linkingXpPotential,
    linkingRewards: LINKING_REWARDS,

    // Actions
    logout,
    openSignupPage,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// =====================================================
// Hook
// =====================================================

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
