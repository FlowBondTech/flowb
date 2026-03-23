'use client'

import { useApolloClient } from '@apollo/client'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { useFarcasterSDK } from '@/hooks/useFarcasterSDK'

// User type matching the GraphQL schema
interface User {
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
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean

  // Farcaster state
  isFarcasterFrame: boolean

  // Email subscription (for marketing/updates)
  subscribedEmail: string | null
  subscribeEmail: (email: string) => Promise<boolean>

  // Actions
  logout: () => Promise<void>
  openSignupPage: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const apolloClient = useApolloClient()
  const [subscribedEmail, setSubscribedEmail] = useState<string | null>(null)

  // Farcaster SDK context (the ONLY auth source for miniapps)
  const {
    isLoaded: farcasterLoaded,
    isInFrame,
    user: farcasterUser,
    openUrl
  } = useFarcasterSDK()

  // Build user from Farcaster context
  const user: User | null = farcasterUser ? {
    id: `farcaster:${farcasterUser.fid}`,
    username: farcasterUser.username || null,
    displayName: farcasterUser.displayName || null,
    avatarUrl: farcasterUser.pfpUrl || null,
    fid: farcasterUser.fid,
    walletAddress: null,
    email: subscribedEmail,
  } : null

  // Loading state
  const isLoading = !farcasterLoaded

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

  // Logout handler (clears local state)
  const logout = async () => {
    setSubscribedEmail(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('danz_subscribed_email')
    }
    // Clear Apollo cache
    await apolloClient.clearStore()
  }

  // Load saved email on mount
  if (typeof window !== 'undefined' && !subscribedEmail) {
    const savedEmail = localStorage.getItem('danz_subscribed_email')
    if (savedEmail) {
      setSubscribedEmail(savedEmail)
    }
  }

  const contextValue: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isFarcasterFrame: isInFrame,
    subscribedEmail,
    subscribeEmail,
    logout,
    openSignupPage,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
