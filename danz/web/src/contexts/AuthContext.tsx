'use client'

import { useSupabaseAuth } from '@/src/providers/SupabaseAuthProvider'
import { useRouter } from 'next/navigation'
import type React from 'react'
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { User } from '../generated/graphql'
import {
  useGetMyProfileQuery,
  useTrackAppOpenMutation,
  useUpdateProfileMutation,
} from '../generated/graphql'

const ONBOARDING_SNOOZED_KEY = 'danz-onboarding-snoozed-until'
const ONBOARDING_DISMISS_COUNT_KEY = 'danz-onboarding-dismiss-count'
const SNOOZE_DURATION_MS = 1 * 24 * 60 * 60 * 1000 // 1 day
const MAX_DISMISSALS = 3 // After 3 dismissals, stop showing banner permanently

// Profile completeness steps
export interface ProfileStep {
  id: string
  label: string
  completed: boolean
}

export interface ProfileCompleteness {
  percentage: number
  steps: ProfileStep[]
  isComplete: boolean
  tier: 'starter' | 'mover' | 'regular' | 'star'
}

function computeProfileCompleteness(user: User | null): ProfileCompleteness {
  if (!user) {
    return {
      percentage: 20, // Endowed progress — signing up counts
      steps: [
        { id: 'account', label: 'Create account', completed: true },
        { id: 'username', label: 'Set username', completed: false },
        { id: 'photo', label: 'Add profile photo', completed: false },
        { id: 'styles', label: 'Choose dance styles', completed: false },
        { id: 'bio', label: 'Write a short bio', completed: false },
      ],
      isComplete: false,
      tier: 'starter',
    }
  }

  const steps: ProfileStep[] = [
    { id: 'account', label: 'Create account', completed: true },
    { id: 'username', label: 'Set username', completed: !!user.username },
    { id: 'photo', label: 'Add profile photo', completed: !!user.avatar_url },
    {
      id: 'styles',
      label: 'Choose dance styles',
      completed: Array.isArray(user.dance_styles) && user.dance_styles.length > 0,
    },
    { id: 'bio', label: 'Write a short bio', completed: !!user.bio },
  ]

  const completedCount = steps.filter(s => s.completed).length
  const percentage = Math.round((completedCount / steps.length) * 100)

  let tier: ProfileCompleteness['tier'] = 'starter'
  if (percentage >= 100) tier = 'star'
  else if (percentage >= 80) tier = 'regular'
  else if (percentage >= 60) tier = 'mover'

  return { percentage, steps, isComplete: percentage >= 100, tier }
}

// Auth context type
interface AuthContextType {
  user: User | null
  email: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  needsOnboarding: boolean
  profileCompleteness: ProfileCompleteness
  onboardingSnoozed: boolean
  onboardingRetired: boolean
  snoozeOnboarding: () => void
  login: () => Promise<void>
  logout: () => Promise<void>
  updateProfile: (updates: any) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function getDismissCount(): number {
  if (typeof window === 'undefined') return 0
  return Number(localStorage.getItem(ONBOARDING_DISMISS_COUNT_KEY) || '0')
}

function isSnoozed(): boolean {
  if (typeof window === 'undefined') return false
  const snoozedUntil = localStorage.getItem(ONBOARDING_SNOOZED_KEY)
  if (!snoozedUntil) return false
  return Date.now() < Number(snoozedUntil)
}

// Provider Component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter()
  const { session, supabaseUser, isLoading: authLoading, signOut } = useSupabaseAuth()

  const authenticated = !!session
  const ready = !authLoading

  const [hasCheckedProfile, setHasCheckedProfile] = useState(false)
  const [onboardingSnoozed, setOnboardingSnoozed] = useState(isSnoozed)
  const [onboardingRetired, setOnboardingRetired] = useState(() => getDismissCount() >= MAX_DISMISSALS)

  // Use GraphQL for user profile - only query when authenticated
  const {
    data: profileData,
    loading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useGetMyProfileQuery({
    skip: !authenticated || !ready,
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  })

  const [updateProfileMutation] = useUpdateProfileMutation({
    onCompleted: data => {
      if (data?.updateProfile) {
        refetchProfile()
      }
    },
    onError: error => {
      console.error('Profile update failed:', error)
    },
  })

  // Track daily app open for points
  const [trackAppOpen] = useTrackAppOpenMutation({
    onError: error => {
      if (!error.message.includes('already awarded')) {
        console.error('Failed to track daily login:', error)
      }
    },
  })

  // Compute user object from profile data
  const user = useMemo(() => {
    if (!profileData?.me) {
      return null
    }
    return profileData.me
  }, [profileData])

  const profileCompleteness = useMemo(() => computeProfileCompleteness(user), [user])

  // Handle authentication and profile checks
  useEffect(() => {
    const checkProfileAndRedirect = async () => {
      if (authenticated && ready && !profileLoading && !hasCheckedProfile) {
        setHasCheckedProfile(true)

        try {
          const result = await refetchProfile()
          const data = result.data

          // Track daily login for points (if user exists)
          if (data?.me?.id) {
            try {
              await trackAppOpen({
                variables: { user_id: data.me.id },
              })
            } catch (error) {
              // Already handled in mutation error callback
            }
          }

          const currentPath = window.location.pathname
          const isDashboardPath = currentPath.startsWith('/dashboard')
          const isPublicPath =
            currentPath === '/' ||
            currentPath.startsWith('/events') ||
            currentPath === '/danz' ||
            currentPath === '/ethdenver' ||
            currentPath.startsWith('/i/')

          // Redirect away from /login after authentication
          if (!isDashboardPath && !isPublicPath && currentPath === '/login') {
            const params = new URLSearchParams(window.location.search)
            const redirectTo = params.get('redirectTo') || '/dashboard'
            router.push(redirectTo)
          }
        } catch (error) {
          console.error('Error checking profile:', error)
          setHasCheckedProfile(false)
        }
      }
    }

    checkProfileAndRedirect()
  }, [
    authenticated,
    ready,
    profileLoading,
    hasCheckedProfile,
    refetchProfile,
    router,
    trackAppOpen,
  ])

  const login = useCallback(async () => {
    router.push('/login')
  }, [router])

  const logout = useCallback(async () => {
    try {
      await signOut()
      setHasCheckedProfile(false)
      localStorage.removeItem(ONBOARDING_SNOOZED_KEY)
      localStorage.removeItem(ONBOARDING_DISMISS_COUNT_KEY)
      setOnboardingSnoozed(false)
      setOnboardingRetired(false)
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }, [signOut, router])

  const snoozeOnboarding = useCallback(() => {
    // Increment dismiss count
    const count = getDismissCount() + 1
    localStorage.setItem(ONBOARDING_DISMISS_COUNT_KEY, String(count))

    if (count >= MAX_DISMISSALS) {
      // Permanently retire the banner
      setOnboardingRetired(true)
    }

    // Set snooze timer
    const snoozedUntil = String(Date.now() + SNOOZE_DURATION_MS)
    localStorage.setItem(ONBOARDING_SNOOZED_KEY, snoozedUntil)
    setOnboardingSnoozed(true)
  }, [])

  const updateProfile = useCallback(
    async (updates: any) => {
      if (!user) return

      try {
        await updateProfileMutation({ variables: { input: updates } })
        await refetchProfile()
      } catch (error) {
        console.error('Error updating profile:', error)
        throw error
      }
    },
    [user, updateProfileMutation, refetchProfile],
  )

  const refreshUser = useCallback(async () => {
    if (!authenticated) return
    await refetchProfile()
  }, [authenticated, refetchProfile])

  const needsOnboarding =
    !!authenticated && ready && !profileLoading && !profileCompleteness.isComplete

  const contextValue: AuthContextType = {
    user,
    email: supabaseUser?.email ?? null,
    isAuthenticated: !!authenticated && ready,
    isLoading: profileLoading || !ready,
    error: profileError ? profileError.message : null,
    needsOnboarding,
    profileCompleteness,
    onboardingSnoozed,
    onboardingRetired,
    snoozeOnboarding,
    login,
    logout,
    updateProfile,
    refreshUser,
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
