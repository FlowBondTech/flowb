import { useApolloClient } from '@apollo/client/react'
import { usePrivy } from '@privy-io/expo'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type React from 'react'
import { createContext, type ReactNode, useContext, useMemo } from 'react'
import Toast from 'react-native-toast-message'
import {
  GetMyProfileDocument,
  type UpdateProfileInput,
  type UpdateProfileMutation,
  type User,
  useGetMyProfileQuery,
  useUpdateProfileMutation,
} from '../generated/graphql'

// Re-export User type for convenience
export type { User }

// Auth context type
interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  logout: () => Promise<void>
  updateProfile: (updates: UpdateProfileInput) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Provider Component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const privy = usePrivy()
  const { user: privyUser, logout: privyLogout, isReady } = privy

  // Use GraphQL for user profile
  const client = useApolloClient()
  const {
    data: profileData,
    loading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useGetMyProfileQuery({
    skip: !privyUser || !isReady,
  })

  const [updateProfileMutation] = useUpdateProfileMutation({
    onCompleted: (data: UpdateProfileMutation) => {
      if (data?.updateProfile) {
        client.cache.writeQuery({
          query: GetMyProfileDocument,
          data: { me: data.updateProfile },
        })
      }
      Toast.show({
        type: 'success',
        text1: 'Profile Updated',
        text2: 'Your changes have been saved',
      })
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: error.message || 'Could not update profile',
      })
    },
  })

  // Compute user object from profile data
  const user = useMemo(() => {
    if (!profileData?.me) {
      // If no profile data but we have a Privy user, create fallback
      if (privyUser && !profileLoading) {
        // Return null - user should be created via GraphQL mutation
        return null
      }
      return null
    }

    // Directly use the user from backend without transformation
    return profileData.me
  }, [profileData, privyUser, profileLoading])

  const logout = async () => {
    try {
      await privyLogout()
      await AsyncStorage.multiRemove(['@danz_wallet', '@danz_sessions'])
      // Clear Apollo cache when logging out
      await client.clearStore()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const updateProfile = async (updates: UpdateProfileInput) => {
    if (!user) return

    try {
      // Use the mutation to update profile
      await updateProfileMutation({ variables: { input: updates } })
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }

  const refreshUser = async () => {
    if (!privyUser) return

    // Simply refetch the profile query
    await refetchProfile()
  }

  // Don't stay in loading state if the profile query errored (e.g. backend unreachable)
  const isLoading = !isReady || (profileLoading && !profileError)

  const contextValue: AuthContextType = {
    user,
    isAuthenticated: !!privyUser && isReady,
    isLoading,
    error: profileError ? profileError.message : null,
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
